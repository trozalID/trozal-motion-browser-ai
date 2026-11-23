const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#itcvModeBtn');
    await page.locator('#itcvModeBtn').click();
    await page.waitForSelector('#itcvFiles');

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=',
      'base64'
    );
    await page.locator('#itcvFiles').setInputFiles({
      name: 'mode5-contract.png',
      mimeType: 'image/png',
      buffer: png
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
      canvas.width = 640;
      canvas.height = 360;
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
        hasModuleImport: /\bimport\s/.test(js)
      };
    });

    assert.ok(result.jsLength > 100, 'Mode 5 must emit a JavaScript Studio draw function body');
    assert.ok(result.htmlLength > 100, 'Mode 5 must emit standalone HTML');
    assert.ok(result.hasBody && result.hasStage, 'HTML output must contain a valid stage/body');
    assert.ok(result.hasKeyframes, 'HTML output must include CSS keyframe animation');
    assert.ok(result.hasEmbeddedImage, 'HTML output must preserve the uploaded source image');
    assert.equal(result.hasExternalScript, false, 'HTML importer output must not depend on external scripts');
    assert.equal(result.hasModuleImport, false, 'JavaScript Studio output must not use module imports');
    assert.deepEqual(pageErrors, [], 'Mode 5 should not raise browser page errors');
    console.log('Mode 5 output contract passed:', JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
