const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const JSZip = require('jszip');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#trozalJsMotionBtn');
    await page.locator('#trozalJsMotionBtn').click();
    await page.waitForSelector('#trozalJsMotionFrame');
    await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.renderFrame);
    await page.waitForFunction(() => document.querySelector('#trozalJsMotionFrame')?.contentWindow);
    await page.locator('#duration').evaluate(el => {
      el.value = '1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#fps').selectOption('24');
    await page.locator('#resolution').selectOption('1280x720');
    await page.locator('#format').selectOption('pngseq');

    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await page.locator('#trozalJsMotionExport').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\\.zip$/i, 'PNG Sequence export must produce a ZIP archive');
    const filePath = await download.path();
    assert.ok(filePath, 'Browser must provide the downloaded ZIP file');
    const bytes = fs.readFileSync(filePath);
    assert.ok(bytes.length > 1000, 'Export archive must contain rendered image data');
    const zip = await JSZip.loadAsync(bytes);
    const pngFiles = Object.keys(zip.files).filter(name => /\\.png$/i.test(name) && !zip.files[name].dir);
    assert.equal(pngFiles.length, 24, 'A 1-second, 24-FPS export must contain exactly 24 PNG frames');
    const firstFrame = await zip.file(pngFiles.sort()[0]).async('nodebuffer');
    assert.deepEqual([...firstFrame.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'Exported frame must be a valid PNG');
    await page.waitForFunction(() => window.__TROZAL_JS_MOTION_EXPORT_ACTIVE === false);
    assert.deepEqual(pageErrors, [], 'JavaScript Studio export must not raise uncaught browser errors');
    console.log('JavaScript Studio PNG Sequence export passed: 24 valid PNG frames in ZIP.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
