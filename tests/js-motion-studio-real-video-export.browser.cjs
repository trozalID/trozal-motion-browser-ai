const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    for (const format of ['mp4', 'mov']) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        acceptDownloads: true
      });
      page.setDefaultTimeout(30000);
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      try {
        await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
        await page.locator('#trozalJsMotionBtn').waitFor();
        await page.locator('#trozalJsMotionBtn').click();
        await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.renderFrame);
        await page.locator('#trozalJsMotionRun').click();
        await page.waitForFunction(() =>
          (document.querySelector('#trozalJsMotionStatus')?.textContent || '').includes('Frame siap'),
          null, { timeout: 30000 }
        );

        await page.locator('#trozalJsExportResolution').selectOption('1280x720');
        if (format === 'mov') {
          const bgMode = page.locator('#bgMode');
          if (await bgMode.count()) await bgMode.selectOption('transparent');
          const transparent = page.locator('#transparentBg');
          if (await transparent.count() && !(await transparent.isChecked())) await transparent.check();
        }

        const downloadPromise = page.waitForEvent('download', null, { timeout: 300000 });
        await page.locator('[data-jsm-export-test="' + format + '"]').click();
        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        assert.match(filename, format === 'mp4' ? /\\.mp4$/i : /\\.mov$/i,
          format.toUpperCase() + ' export must produce the expected file extension');

        const filePath = await download.path();
        assert.ok(filePath, format + ' download must be available to inspect');
        const bytes = fs.readFileSync(filePath);
        assert.ok(bytes.length > 1024, format + ' output must contain encoded media data');
        assert.equal(String.fromCharCode(...bytes.subarray(4, 8)), 'ftyp',
          format + ' output must have a valid ISO base media container header');

        const ascii = bytes.toString('latin1');
        if (format === 'mp4') {
          assert.ok(ascii.includes('avc1'), 'MP4 output must contain an H.264 sample entry');
        } else {
          assert.ok(ascii.includes('ap4h') || ascii.includes('ap4x'),
            'MOV output must contain a ProRes 4444 sample entry');
        }

        await page.waitForFunction(() => window.__TROZAL_JS_MOTION_EXPORT_ACTIVE === false,
          { timeout: 300000 });
        assert.deepEqual(pageErrors, [], format + ' export must not raise uncaught browser errors');
        results.push({ format, filename, bytes: bytes.length });
      } catch (error) {
        const status = await page.locator('#trozalJsExportTestStatus').textContent().catch(() => 'status unavailable');
        throw new Error(format.toUpperCase() + ' real export failed: ' + error.message + ' | panel: ' + status);
      } finally {
        await page.close();
      }
    }
    console.log('JavaScript Studio real video export passed: ' + JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
