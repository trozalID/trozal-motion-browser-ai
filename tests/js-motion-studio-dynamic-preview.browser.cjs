const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#trozalGeminiApiKey');
    await page.locator('#trozalGeminiApiKey').fill('test-gemini-key-persistence');
    await page.locator('#trozalOpenAiKey').fill('test-openai-key-persistence');
    await page.locator('#trozalAiProvider').selectOption('openai');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#trozalGeminiApiKey').inputValue(), 'test-gemini-key-persistence',
      'Gemini key must persist after refresh');
    assert.equal(await page.locator('#trozalOpenAiKey').inputValue(), 'test-openai-key-persistence',
      'Alternative provider key must persist independently after refresh');
    await page.locator('#trozalGeminiClearKeyBtn').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#trozalGeminiApiKey').inputValue(), '',
      'Explicit Gemini key deletion must clear its stored value');

    await page.locator('#trozalJsMotionBtn').click();
    await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.getPlaybackState);
    const duration = page.locator('#trozalJsMotionDuration');
    const range = page.locator('#trozalJsPreviewDurationRange');
    await duration.fill('3600');
    await duration.dispatchEvent('change');
    let state = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState());
    assert.equal(state.duration, 3600, 'Preview duration must support up to one hour');
    assert.equal(await page.locator('#trozalJsMotionTime').getAttribute('max'), '3600');
    assert.equal(await page.locator('#trozalJsTimelineScrub').getAttribute('max'), '3600');
    await range.fill('5');
    state = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState());
    assert.equal(state.duration, 5, 'Duration slider must update preview duration');
    assert.equal(await duration.inputValue(), '5');

    await page.locator('#trozalJsPlaybackSpeed').selectOption('2');
    state = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState());
    assert.equal(state.playbackSpeed, 2, 'Playback speed selector must be reflected in runtime');

    const replacement = "ctx.fillStyle='#ff3366';ctx.fillRect(0,0,w,h);ctx.fillStyle='#ffffff';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.fillText('NEW CODE',w/2,h/2);";
    await page.locator('#trozalJsMotionCode').fill(replacement);
    await page.locator('#trozalJsMotionRun').click();
    await page.waitForFunction(() => {
      const s = window.TROZAL_JS_MOTION?.getPlaybackState();
      return s && s.appliedCodeRevision === s.codeRevision && s.codeRevision > 0;
    }, { timeout: 10000 });
    const prompt = await page.evaluate(() => window.TROZAL_JS_MOTION.buildPrompt());
    assert.match(prompt, /ORIGINALITY & IP GUARDRAILS/,
      'Generated prompt must contain explicit IP/originality guardrails');
    assert.equal(typeof window.trozalBrowserAI?.analyzeImageDataUrl, 'function',
      'Canvas 2D must expose a handoff to the existing Vision metadata generator');
    assert.deepEqual(errors, [], 'No uncaught browser errors are expected');
    console.log('JavaScript Studio dynamic preview passed: provider key persistence, 1-hour duration, slider sync, speed, latest code apply, IP prompt guardrails and metadata handoff.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
