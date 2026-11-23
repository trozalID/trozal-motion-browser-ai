const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#itcvModeBtn');
    await page.locator('#itcvModeBtn').click();
    await page.waitForSelector('#itcvFiles');

    const png = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#102030'; ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = '#ef3f32'; ctx.fillRect(100, 50, 120, 80);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await page.locator('#itcvFiles').setInputFiles({
      name: 'mode5-contract.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png)
    });
    await page.locator('#itcvTemplate').click();
    await page.waitForFunction(() =>
      document.querySelector('#itcvJs')?.value.length > 100 &&
      document.querySelector('#itcvHtml')?.value.length > 100
    );

    const result = await page.evaluate(async () => {
      const js = document.querySelector('#itcvJs').value;
      const html = document.querySelector('#itcvHtml').value;
      const draw = new Function('ctx', 't', 'w', 'h', 'anim', js);
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 360;
      const ctx = canvas.getContext('2d');
      await draw(ctx, 0, 640, 360, {});
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      return {
        jsLength: js.length,
        htmlLength: html.length,
        htmlTitle: parsed.title,
        hasBody: !!parsed.body,
        hasStage: !!parsed.querySelector('.stage'),
        hasKeyframes: /@keyframes\s+trozal-camera/.test(parsed.querySelector('style')?.textContent || ''),
        hasEmbeddedImage: !!parsed.querySelector('img.source'),
        hasExternalScript: !!parsed.querySelector('script[src]'),
        hasModuleImport: /\bimport\s/.test(js),
        hasBrowserGlobalCache: /\bglobalThis\b/.test(js),
        hasCanvasScopedCache: /ctx\.canvas\[CACHE_KEY\]/.test(js),
        hasIndependentBobFloatMotion: /kind==='bob'.*kind==='float'/s.test(js)
      };
    });

    assert.ok(result.jsLength > 100, 'Mode 5 must emit a JavaScript Studio draw function body');
    assert.ok(result.htmlLength > 100, 'Mode 5 must emit standalone HTML');
    assert.ok(result.hasBody && result.hasStage, 'HTML output must contain a valid stage/body');
    assert.ok(result.hasKeyframes, 'HTML output must include CSS keyframe animation');
    assert.ok(result.hasEmbeddedImage, 'HTML output must preserve the uploaded source image');
    assert.equal(result.hasExternalScript, false, 'HTML importer output must not depend on external scripts');
    assert.equal(result.hasModuleImport, false, 'JavaScript Studio output must not use module imports');
    assert.equal(result.hasBrowserGlobalCache, false, 'JavaScript Studio output must not depend on browser-global cache access');
    assert.equal(result.hasCanvasScopedCache, true, 'Image assets must be cached on the persistent Studio canvas');
    assert.equal(result.hasIndependentBobFloatMotion, true, 'Bob and float components must receive translation motion');

    // Exercise the actual JavaScript Studio sandbox, not only new Function in the parent page.
    await page.locator('#itcvBack').click();\n    await page.locator('#trozalJsMotionBtn').waitFor({ state: 'visible', timeout: 10000 });\n    await page.locator('#trozalJsMotionBtn').click();
    await page.waitForSelector('#trozalJsMotionCode');
    await page.locator('#trozalJsMotionCode').fill(await page.locator('#itcvJs').inputValue());
    await page.locator('#trozalJsMotionRun').click();
    await page.waitForFunction(() =>
      /Frame siap/.test(document.querySelector('#trozalJsMotionStatus')?.textContent || ''),
      null, { timeout: 15000 }
    );
    const centerPixel = await page.frameLocator('#trozalJsMotionFrame').locator('#c').evaluate(canvas => {
      const pixel = canvas.getContext('2d').getImageData(640, 360, 1, 1).data;
      return Array.from(pixel);
    });
    assert.ok(centerPixel[0] > 150 && centerPixel[1] < 100 && centerPixel[3] > 0,
      'Mode 5 JavaScript must render the uploaded source image inside the real JavaScript Studio sandbox; pixel=' + JSON.stringify(centerPixel));
    assert.deepEqual(pageErrors, [], 'Mode 5 and JavaScript Studio should not raise browser page errors');
    console.log('Mode 5 output contract and real JavaScript Studio sandbox rendering passed:', JSON.stringify({ ...result, centerPixel }));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
