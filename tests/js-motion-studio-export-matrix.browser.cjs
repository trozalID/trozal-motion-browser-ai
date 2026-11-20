const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Serial execution and a fresh page per case keep FFmpeg WASM memory bounded.
const scenarios = [
  { format: 'mp4', resolution: '1280x720', fps: '24', duration: '1' },
  { format: 'mp4', resolution: '1280x720', fps: '25', duration: '1' },
  { format: 'mp4', resolution: '1280x720', fps: '30', duration: '1' },
  { format: 'mp4', resolution: '1280x720', fps: '50', duration: '1' },
  { format: 'mp4', resolution: '1280x720', fps: '60', duration: '1' },
  { format: 'mov', resolution: '1280x720', fps: '24', duration: '1' },
  { format: 'mp4', resolution: '1920x1080', fps: '24', duration: '1' },
  { format: 'mp4', resolution: '2560x1440', fps: '24', duration: '1' },
  { format: 'mp4', resolution: '3840x2160', fps: '24', duration: '1' }
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    for (const scenario of scenarios) {
      const { format, resolution, fps, duration } = scenario;
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

        await page.locator('#trozalJsExportResolution').selectOption(resolution);
        await page.locator('#trozalJsExportFps').selectOption(fps);
        // This control is a number input, not a select element.
        await page.locator('#trozalJsExportDuration').fill(duration);
        assert.equal(await page.locator('#trozalJsExportDuration').inputValue(), duration);

        if (format === 'mov') {
          const bgMode = page.locator('#bgMode');
          if (await bgMode.count()) await bgMode.selectOption('transparent');
          const transparent = page.locator('#transparentBg');
          if (await transparent.count() && !(await transparent.isChecked())) await transparent.check();
        }

        const downloadPromise = page.waitForEvent('download', { timeout: 300000 });
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
          null, { timeout: 300000 });
        const metrics = await page.evaluate(() => window.__trozalRenderMetrics || null);
        assert.ok(metrics, 'Renderer must expose export metrics');
        assert.equal(metrics.width, Number(resolution.split('x')[0]), 'Renderer width must match selected preset');
        assert.equal(metrics.height, Number(resolution.split('x')[1]), 'Renderer height must match selected preset');
        assert.equal(metrics.fps, Number(fps), 'Renderer FPS must match selected preset');
        assert.equal(metrics.duration, Number(duration), 'Renderer duration must match selected preset');
        assert.deepEqual(pageErrors, [],
          format + ' ' + resolution + ' ' + fps + ' FPS export must not raise uncaught browser errors');

        results.push({
          format, resolution, fps: Number(fps), duration: Number(duration),
          filename, bytes: bytes.length
        });
      } catch (error) {
        const status = await page.locator('#trozalJsExportTestStatus').textContent().catch(() => 'status unavailable');
        throw new Error(
          format.toUpperCase() + ' ' + resolution + ' ' + fps + ' FPS ' + duration +
          's real export failed: ' + error.message + ' | panel: ' + status
        );
      } finally {
        await page.close();
      }
    }
    console.log('Canvas 2D export FPS/resolution matrix passed: ' + JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
