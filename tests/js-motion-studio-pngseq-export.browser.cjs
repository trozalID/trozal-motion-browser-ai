const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const JSZip = require('jszip');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#trozalJsMotionBtn');
    await page.locator('#trozalJsMotionBtn').click();
    await page.waitForSelector('#trozalJsMotionFrame');
    await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.renderFrame);
    // contentWindow exists before srcdoc has finished booting. Wait for a real
    // round-trip frame from the sandbox before asking the main renderer to export.
    await page.locator('#trozalJsMotionRun').click();
    await page.waitForFunction(() => {
      const status = document.querySelector('#trozalJsMotionStatus')?.textContent || '';
      return status.includes('Frame siap');
    }, { timeout: 15000 });

    await page.locator('#duration').evaluate(el => {
      el.value = '1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#fps').selectOption('24');
    await page.locator('#resolution').selectOption('1280x720');
    await page.locator('#format').selectOption('pngseq');

    const downloadPromise = page.waitForEvent('download', { timeout: 90000 }).catch(error => ({ downloadError: error.message }));
    await page.locator('#trozalJsMotionExport').click();
    // Fail promptly with useful state if the export button did not reach the
    // shared renderer, rather than waiting two minutes for a download event.
    await page.waitForFunction(() => window.__trozalRenderMetrics?.active === true, { timeout: 20000 });
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.zip$/i, 'PNG Sequence export must produce a ZIP archive');
    const filePath = await download.path();
    assert.ok(filePath, 'Browser must provide the downloaded ZIP file');
    const bytes = fs.readFileSync(filePath);
    assert.ok(bytes.length > 1000, 'Export archive must contain rendered image data');
    const zip = await JSZip.loadAsync(bytes);
    const pngFiles = Object.keys(zip.files).filter(name => /\.png$/i.test(name) && !zip.files[name].dir);
    assert.equal(pngFiles.length, 24, 'A 1-second, 24-FPS export must contain exactly 24 PNG frames');
    for (const name of pngFiles) {
      const frame = await zip.file(name).async('nodebuffer');
      assert.deepEqual([...frame.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], name + ' must be a valid PNG');
      assert.ok(frame.length > 100, name + ' must contain image data');
    }
    await page.waitForFunction(() => window.__TROZAL_JS_MOTION_EXPORT_ACTIVE === false);
    assert.deepEqual(pageErrors, [], 'JavaScript Studio export must not raise uncaught browser errors');
    console.log('JavaScript Studio PNG Sequence export passed: 24 valid PNG frames in ZIP.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
