const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    const formats = [
      ['pngseq', 'pngUnlimited', 'PNG Sequence ZIP'],
      ['mp4', 'unlimited', 'MP4 / H.264'],
      ['mov', 'unlimited', 'MOV / ProRes 4444 Alpha']
    ];
    const resolutions = [
      ['1280x720', '720p'],
      ['1920x1080', '1080p'],
      ['2560x1440', '2K'],
      ['3840x2160', '4K']
    ];
    const fpsValues = ['24', '25', '30', '50', '60'];
    const durations = ['1', '3', '5', '10', '60', '3600'];
    let fpsIndex = 0;
    let durationIndex = 0;
    for (const [kind, proresMode, label] of formats) {
      for (const [size, sizeLabel] of resolutions) {
        // Use a fresh document for each format/resolution pair to isolate renderer state.
        await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
        await page.locator('#trozalJsMotionBtn').click();
        await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.renderFrame);
        await page.locator('#trozalJsMotionRun').click();
        await page.waitForFunction(() => (document.querySelector('#trozalJsMotionStatus')?.textContent || '').includes('Frame siap'));
        assert.equal(await page.locator('#trozalJsExportTestPanel').count(), 1);
        assert.equal(await page.locator('#trozalJsExportResolution option').count(), 4);
        assert.equal(await page.locator('#trozalJsExportFps option').count(), 5);
        assert.equal(await page.locator('#trozalJsExportDuration option').count(), 11);
        assert.deepEqual(await page.locator('#trozalJsExportDuration option').evaluateAll(options => options.map(option => option.value)),
          ['1','3','5','10','30','60','120','300','600','1800','3600'],
          'Export duration choices must extend from 1 second through exactly 1 hour');
        const selectedFps = fpsValues[fpsIndex++ % fpsValues.length];
        const selectedDuration = durations[durationIndex++ % durations.length];
        await page.locator('#trozalJsExportFps').selectOption(selectedFps);
        await page.locator('#trozalJsExportDuration').selectOption(selectedDuration);
        await page.locator('#trozalJsExportResolution').selectOption(size);
        const testButton = page.locator('[data-jsm-export-test="' + kind + '"]');
        assert.equal(await testButton.getAttribute('data-jsm-export-test'), kind);
        await page.locator('#renderBtn').evaluate(el => { el.click = () => { window.__jsmTestRenderClicked = true; }; });
        await page.evaluate(() => { window.__jsmTestRenderClicked = false; });
        await testButton.click();
        await page.waitForFunction(() => window.__jsmTestRenderClicked === true);
        assert.equal(await page.locator('#format').inputValue(), kind, 'format selection for ' + label);
        assert.equal(await page.locator('#resolution').inputValue(), size, sizeLabel + ' resolution for ' + label);
        assert.equal(await page.locator('#fps').inputValue(), selectedFps, 'selected FPS for ' + label);
        assert.ok((await page.locator('#trozalJsExportTestStatus').textContent()).includes(selectedFps + ' FPS'));
        assert.equal(await page.locator('#duration').inputValue(), selectedDuration, 'selected duration for ' + label);
        assert.equal(await page.locator('#duration').getAttribute('max'), '3600',
          'Main export duration control must accept up to 3600 seconds');
        assert.ok((await page.locator('#trozalJsExportTestStatus').textContent()).includes(selectedDuration + ' detik'));
        assert.equal(await page.locator('#proresMode').inputValue(), proresMode);
        assert.ok((await page.locator('#trozalJsExportTestStatus').textContent()).includes(size.replace('x','×')));
        assert.ok((await page.locator('#trozalJsExportTestStatus').textContent()).includes(label));
      }
    }
    assert.deepEqual(errors, []);
    console.log('JavaScript Studio export panel passed: 3 formats × 4 resolutions × 5 FPS choices and durations up to 3600 seconds (1 hour).');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
