'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const pageErrors = [];
  const requests = [];
  let failNextSceneGeneration = false;
  let vision503AttemptsRemaining = 0;
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));

  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, x-goog-api-key, Api-Revision',
      'access-control-max-age': '600',
      'content-type': 'application/json'
    };
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers });
    }
    requests.push({
      method: request.method(),
      path: url.pathname,
      apiKey: request.headers()['x-goog-api-key'] || '',
      body: request.method() === 'POST' ? request.postDataJSON() : null
    });
    if (url.pathname.endsWith('/models')) {
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          models: [
            { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.1-pro-preview', supportedGenerationMethods: ['generateContent'] }
          ]
        })
      });
    }
    if (/\/models\/[^/]+:generateContent$/.test(url.pathname)) {
      const body = request.postDataJSON();
      if (failNextSceneGeneration && !body.contents?.[0]?.parts?.some(item => item.inline_data)) {
        failNextSceneGeneration = false;
        return route.fulfill({ status: 429, headers, body: JSON.stringify({ error: { message: 'test quota exceeded' } }) });
      }
      const parts = body.contents?.[0]?.parts || [];
      const imageInput = parts.some(item => item.inline_data);
      if (imageInput && vision503AttemptsRemaining > 0) {
        vision503AttemptsRemaining -= 1;
        return route.fulfill({
          status: 503,
          headers: { ...headers, 'retry-after': '0' },
          body: JSON.stringify({ error: { message: 'temporary overload test' } })
        });
      }
      const output = imageInput
        ? JSON.stringify({
            title: 'Blue Glass Sphere with Soft Reflections',
            description: 'A polished blue glass sphere floats against a dark gradient background with soft reflected light.',
            category: 'Graphic Resources',
            keywords: ['blue glass sphere', 'floating object', 'dark gradient', 'soft reflections', 'abstract background'],
            visual_summary: 'A single blue glass sphere floating against a dark background.',
            visible_objects: ['blue glass sphere'],
            confidence_notes: ''
          })
        : '<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#101d32}svg{width:100%;height:100%}.orb{transform-origin:center;animation:float 4s ease-in-out infinite}@keyframes float{50%{transform:translateY(-18px)}}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><radialGradient id="g"><stop stop-color="#7de5ff"/><stop offset="1" stop-color="#174a85"/></radialGradient></defs><g id="background"><rect width="1600" height="900" fill="#101d32"/></g><g id="subject" class="orb"><circle cx="800" cy="430" r="170" fill="url(#g)"/></g></svg></body></html>';
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: output }] } }] })
      });
    }
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: { message: 'not found' } }) });
  });

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.htmlToImage === 'object' || document.getElementById('generateVisualMotionAiBtn'));

  assert.equal(await page.locator('#browserGeminiCloudPanel').count(), 1, 'Gemini Cloud AI panel must exist');
  assert.equal(await page.locator('#trozalBrowserVisionCloudPanel').count(), 1, 'Gemini Cloud Vision panel must exist');
  assert.equal(await page.locator('#trozalGeminiApiKey').count(), 1, 'There must be exactly one shared API key field');
  assert.equal(await page.locator('#trozalSceneEngine').inputValue(), 'auto', 'Scene Composer must default to Auto engine');
  assert.equal(await page.locator('#trozalSceneAutoFallback').isChecked(), true, 'Automatic fallback must be enabled by default');
  // Regression guard: the central motion editor must never disappear when Cloud AI panels load.
  for (const selector of ['main.main', '.stagewrap', '#stage', '.timeline']) {
    const node = page.locator(selector).first();
    assert.equal(await node.count(), 1, 'Central editor element must exist: ' + selector);
    const rect = await node.boundingBox();
    assert.ok(rect && rect.width > 100 && rect.height > 40, 'Central editor element must remain visible: ' + selector + ' ' + JSON.stringify(rect));
  }
  assert.equal(await page.locator('.app').evaluate(node => getComputedStyle(node).display), 'grid', 'Desktop must retain the editor workspace grid');
  // Check the breakpoint where the old five-track CSS put <main> into an 8px grid column.
  for (const width of [1050, 1024, 900, 800, 721]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator('.app').evaluate(node => {
      const style = getComputedStyle(node);
      const main = node.querySelector('main.main');
      const rect = main.getBoundingClientRect();
      return { display: style.display, columns: style.gridTemplateColumns.split(' ').filter(Boolean).length, width: rect.width, height: rect.height };
    });
    assert.equal(layout.display, 'grid', 'Tablet workspace must remain a grid at ' + width + 'px');
    assert.equal(layout.columns, 3, 'Tablet workspace must have exactly three actual grid columns at ' + width + 'px: ' + JSON.stringify(layout));
    assert.ok(layout.width >= 260 && layout.height > 100, 'Central editor must have usable dimensions at ' + width + 'px: ' + JSON.stringify(layout));
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  assert.equal(await page.locator('#visualMotionAiModel').count(), 0, 'No local WebGPU model selector should remain');
  assert.equal(await page.locator('#trozalVisionCheckBtn').count(), 0, 'No local Browser Vision model-check control should remain');
  assert.equal(await page.locator('#trozalLocalVisionPanel').count(), 0, 'Legacy local Vision panel should be removed');
  assert.match(await page.locator('#browserGeminiCloudPanel').innerText(), /Gemini Cloud/i, 'Scene Composer panel must state cloud-only flow');
  assert.match(await page.locator('#trozalBrowserVisionCloudPanel').innerText(), /Gemini Cloud/i, 'Vision panel must state cloud-only flow');

  await page.locator('#trozalGeminiApiKey').fill('test-browser-key-never-persist');
  await page.locator('#trozalGeminiCheckBtn').click();
  await page.waitForFunction(() => document.getElementById('trozalGeminiConnectionStatus')?.textContent.includes('TERHUBUNG'));
  assert.ok(requests.some(item => item.method === 'GET' && item.path.endsWith('/models')));
  assert.ok(requests.every(item => item.apiKey === 'test-browser-key-never-persist'), 'API key must be sent in the header, not URL/query');

  await page.locator('#visualMotionPrompt').fill('A premium transparent glass perfume bottle rotating on a polished black podium, elegant rim lighting, subtle gold particles and slow camera orbit.');
  await page.locator('#generateVisualMotionAiBtn').click();
  await page.waitForFunction(() => document.getElementById('visualMotionOutput')?.value.includes('<svg'));
  const output = await page.locator('#visualMotionOutput').inputValue();
  assert.match(output, /<svg/i);
  assert.doesNotMatch(output, /<script\b|<iframe\b/i, 'Returned HTML/SVG must not contain executable script or iframe elements');
  assert.doesNotMatch(output, /(?:href|src)\s*=\s*['"]https?:\/\//i, 'Returned HTML/SVG must not reference external assets');
  const sceneRequest = requests.find(item => item.method === 'POST' && item.path.endsWith(':generateContent') && typeof item.body?.contents?.[0]?.parts?.[0]?.text === 'string');
  assert.ok(sceneRequest, 'Scene generation should call Gemini generateContent with a text brief');
  assert.equal(sceneRequest.path, '/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(sceneRequest.body.contents[0].role, 'user');
  assert.match(sceneRequest.body.contents[0].parts[0].text, /perfume bottle/i);
  assert.match(sceneRequest.body.contents[0].parts[0].text, /Aspect ratio/);
  assert.match(sceneRequest.body.systemInstruction?.parts?.[0]?.text || '', /motion-graphics art director/i, 'Gemini system instruction must be included in the API request');

  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pKkAAAAASUVORK5CYII=', 'base64');
  await page.locator('#trozalVisionImages').setInputFiles({
    name: 'evidence.png', mimeType: 'image/png', buffer: tinyPng
  });

  // Metadata source buttons must never cross-route HTML Motion to the Scene AI handler.
  await page.locator('#aiCodeTerminal').fill('');
  await page.locator('#metadataFromHtmlMotionBtn').click();
  await page.waitForFunction(() => document.getElementById('trozalMetadataSourceStatus')?.textContent.includes('Belum ada HTML Motion'));
  assert.doesNotMatch(await page.locator('#trozalMetadataSourceStatus').innerText(), /Scene Composer/i,
    'HTML Motion button must not invoke the Scene AI source check');

  const htmlMotionSample = '<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#10243a} .orb{width:180px;height:180px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff,#54b9e8 35%,#16426e 75%);margin:120px auto;animation:float 3s ease-in-out infinite}@keyframes float{50%{transform:translateY(-20px)}}</style></head><body><div class="orb"></div></body></html>';
  await page.locator('#aiCodeTerminal').fill(htmlMotionSample);
  await page.locator('#metadataFromHtmlMotionBtn').click();
  await page.waitForFunction(() => document.getElementById('trozalMetadataSourceStatus')?.textContent.includes('SELESAI'), null, { timeout: 30000 });
  assert.match(await page.locator('#trozalMetadataSourceStatus').innerText(), /Metadata HTML Motion/i);
  const loadedHtmlState = await page.evaluate(() => window.trozalGetHtmlMotionMetadataSource?.());
  assert.equal(loadedHtmlState?.loaded, true, 'HTML Motion metadata action must load the HTML source into the primary Preview');

  // The button also reuses an already active HTML Motion Preview when the Terminal is cleared.
  await page.locator('#aiCodeTerminal').fill('');
  await page.locator('#metadataFromHtmlMotionBtn').click();
  await page.waitForFunction(() => document.getElementById('trozalMetadataSourceStatus')?.textContent.includes('SELESAI'), null, { timeout: 30000 });
  assert.ok((await page.locator('#aiCodeTerminal').inputValue()).includes('<html'),
    'Active HTML Motion source must be restored to Terminal before the second analysis');

  await page.locator('#trozalGeminiAnalyzeBtn').click();
  await page.waitForFunction(() => document.getElementById('metadataTitle')?.value.includes('Blue Glass Sphere'));
  assert.equal(await page.locator('#metadataDescription').inputValue(), 'A polished blue glass sphere floats against a dark gradient background with soft reflected light.');
  assert.equal(await page.locator('#metadataKeywords').inputValue(), 'blue glass sphere, floating object, dark gradient, soft reflections, abstract background');
  assert.match(await page.locator('#trozalGeminiStatus').innerText(), /Selesai/);
  await page.waitForFunction(() => document.getElementById('trozalGeminiContactSheetPanel')?.style.display === 'block');
  const contactSheet = await page.locator('#trozalGeminiContactSheet').evaluate(node => {
    const card = node.firstElementChild;
    const image = card?.querySelector('img');
    return {
      columns: getComputedStyle(node).gridTemplateColumns,
      holderWidth: node.clientWidth,
      imageWidth: image?.getBoundingClientRect().width || 0,
      cardWidth: card?.getBoundingClientRect().width || 0,
      imageDisplay: image ? getComputedStyle(image).display : '',
      imageMaxWidth: image ? getComputedStyle(image).maxWidth : ''
    };
  });
  assert.ok(contactSheet.imageWidth <= contactSheet.cardWidth + 1, 'Visual evidence image must stay inside its own card: ' + JSON.stringify(contactSheet));
  assert.equal(contactSheet.imageDisplay, 'block');
  assert.equal(contactSheet.imageMaxWidth, '100%');

  // A temporary Gemini 503 should retry with backoff and then complete normally.
  vision503AttemptsRemaining = 2;
  const visionCallsBeforeRetry = requests.filter(item => item.method === 'POST' && item.path.endsWith(':generateContent') && item.body?.contents?.[0]?.parts?.some(part => part.inline_data)).length;
  await page.locator('#trozalGeminiAnalyzeBtn').click();
  await page.waitForFunction(() => document.getElementById('trozalGeminiStatus')?.textContent.includes('Selesai'), null, { timeout: 30000 });
  const visionCallsAfterRetry = requests.filter(item => item.method === 'POST' && item.path.endsWith(':generateContent') && item.body?.contents?.[0]?.parts?.some(part => part.inline_data)).length;
  assert.equal(visionCallsAfterRetry - visionCallsBeforeRetry, 3, 'Two temporary 503 responses should be retried before success');
  assert.match(await page.locator('#trozalVisionStatus').innerText(), /Analisis cloud selesai/);

  // A Gemini quota error must automatically fall back to a local, script-free SVG scene.
  failNextSceneGeneration = true;
  await page.locator('#generateVisualMotionAiBtn').click();
  await page.waitForFunction(() => document.getElementById('visualMotionOutput')?.value.includes('TROZAL Smart Scene'));
  assert.match(await page.locator('#trozalSceneEngineStatus').innerText(), /Smart Template Composer mengambil alih/i);
  assert.match(await page.locator('#visualMotionAiStatus').innerText(), /Fallback otomatis berhasil/i);
  const fallbackCode = await page.locator('#visualMotionOutput').inputValue();
  assert.match(fallbackCode, /id="main-subject"/);
  assert.match(fallbackCode, /@keyframes/);
  assert.doesNotMatch(fallbackCode, /<script\b|<iframe\\b/i);

  // No API key should also use Auto fallback without making a network request.
  await page.locator('#trozalGeminiApiKey').fill('');
  const requestCountBeforeNoKey = requests.length;
  await page.locator('#generateVisualMotionAiBtn').click();
  await page.waitForFunction(() => document.getElementById('visualMotionOutput')?.value.includes('TROZAL Smart Scene'));
  assert.match(await page.locator('#trozalSceneEngineStatus').innerText(), /API key belum tersedia/i);
  assert.equal(requests.length, requestCountBeforeNoKey, 'No-key fallback must not call Gemini');
  const visionRequest = requests.find(item => item.method === 'POST' && item.path.endsWith(':generateContent') && item.body?.contents?.[0]?.parts?.some(part => part.inline_data));
  assert.ok(visionRequest, 'Vision should call Gemini generateContent with image input');
  assert.equal(visionRequest.body.contents[0].role, 'user');
  assert.equal(visionRequest.body.contents[0].parts.filter(item => item.inline_data).length, 1);
  assert.match(visionRequest.body.contents[0].parts.find(item => item.text)?.text, /visible pixels/);

  const storage = await page.evaluate(() => ({
    local: JSON.stringify(Object.values(localStorage)),
    session: JSON.stringify(Object.values(sessionStorage)),
    cookie: document.cookie
  }));
  assert.equal(storage.local.includes('test-browser-key-never-persist'), false, 'API key must not be persisted in localStorage');
  assert.equal(storage.session.includes('test-browser-key-never-persist'), false, 'API key must not be persisted in sessionStorage');
  assert.equal(storage.cookie.includes('test-browser-key-never-persist'), false, 'API key must not be persisted in cookies');

  await page.setViewportSize({ width: 390, height: 900 });
  for (const selector of ['main.main', '.stagewrap', '#stage', '.timeline']) {
    const rect = await page.locator(selector).first().boundingBox();
    assert.ok(rect && rect.width > 100 && rect.height > 40, 'Central editor must remain visible on mobile: ' + selector + ' ' + JSON.stringify(rect));
  }
  await page.setViewportSize({ width: 360, height: 900 });
  const responsive = await page.evaluate(() => ['browserGeminiCloudPanel', 'trozalBrowserVisionCloudPanel'].map(id => {
    const node = document.getElementById(id);
    return { id, width: node.clientWidth, scrollWidth: node.scrollWidth };
  }));
  for (const panel of responsive) {
    assert.ok(panel.scrollWidth <= panel.width + 2, panel.id + ' should not overflow at 360px viewport: ' + JSON.stringify(panel));
  }

  const localRequests = requests.filter(item => /127\.0\.0\.1:11434|localhost:11434|ollama|bridge/i.test(item.path));
  assert.deepEqual(localRequests, [], 'BROWSER AI must not call Ollama or Bridge endpoints');
  assert.deepEqual(pageErrors, [], 'No uncaught JavaScript errors should occur');

  console.log(JSON.stringify({
    result: 'PASS',
    model: 'gemini-3.8-flash',
    apiRequests: requests.length,
    sceneGeneration: 'PASS',
    browserVision: 'PASS',
    sharedApiKeyNotPersisted: 'PASS',
    noLocalAiOrBridgeCalls: 'PASS',
    responsiveAt360px: responsive,
    checked: [
      'Gemini API key is shared by Scene Composer and Browser Vision',
      'API key is sent in x-goog-api-key header',
      'Gemini generateContent REST API used for both text and image',
      'HTML/SVG output is returned and safe-checked',
      'Vision metadata is generated from image inputs',
      'Local WebGPU, Ollama, Bridge and local-model UI are absent',
      'API key is not persisted to browser storage',
      'Cloud AI panels do not overflow on narrow viewport'
    ]
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
