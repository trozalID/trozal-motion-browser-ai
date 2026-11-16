const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const failed = [];
    page.on('requestfailed', request => {
      if (request.url().includes('/js/scene-intelligence.js')) failed.push(request.url());
    });
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.TROZAL_SCENE_INTELLIGENCE);
    const api = await page.evaluate(() => ({
      exists: !!window.TROZAL_SCENE_INTELLIGENCE,
      build: typeof window.TROZAL_SCENE_INTELLIGENCE?.build,
      inferMotion: typeof window.TROZAL_SCENE_INTELLIGENCE?.inferMotion
    }));
    assert.deepEqual(api, { exists: true, build: 'function', inferMotion: 'function' });
    assert.deepEqual(failed, [], 'Scene Intelligence script request must not fail');
    console.log('Scene Intelligence loaded in Chromium workspace.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
