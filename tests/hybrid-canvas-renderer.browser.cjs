'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', error => errors.push({ name: error.name, message: error.message, stack: error.stack || '' }));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), location: message.location() });
  });
  await page.addInitScript(() => {
    window.__trozalWindowErrors = [];
    window.addEventListener('error', event => window.__trozalWindowErrors.push({ message: event.message, filename: event.filename, line: event.lineno, column: event.colno }));
  });
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: require.resolve('jszip/dist/jszip.min.js') });
    await page.waitForFunction(() => !!window.TrozalHybridCanvasRenderer && !!window.TrozalGpuFramePipeline);
    const report = await page.evaluate(() => window.TrozalHybridCanvasRenderer.prepare());
    assert.equal(report.mode, 'hybrid');
    assert.equal(report.ready, true);
    assert.ok(['gpu-assist','canvas2d'].includes(report.strategy));
    if (report.benchmark) {
      assert.equal(report.benchmark.results.length, 2);
      for (const result of report.benchmark.results) {
        assert.ok(Number.isFinite(result.canvas2dMedianMs));
        assert.ok(Number.isFinite(result.gpuAssistMedianMs));
        assert.ok(Number.isFinite(result.ratio));
      }
    } else {
      assert.match(report.reason, /tidak tersedia|gagal/i);
    }
    assert.equal(await page.locator('#stage').count(), 1);
    assert.equal(await page.locator('#timelineTabs').count(), 1);
    assert.equal(await page.locator('#renderBtn').count(), 1);
    assert.equal(await page.locator('#format option[value="mov"]').count(), 1);
    assert.equal(await page.locator('#format option[value="pngseq"]').count(), 1);
    assert.match(await page.locator('#trozalHybridCanvasStatus').innerText(), /Hybrid Canvas/);
    await page.locator('#fileInput').setInputFiles({
      name: 'hybrid-canvas-smoke.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64')
    });
    await page.waitForFunction(() => {
      const image = document.querySelector('#object img');
      return !!image && image.complete && image.naturalWidth > 0;
    });
    await page.evaluate(() => {
      document.getElementById('resolution').value = '1280x720';
      document.getElementById('duration').value = '1';
      const fps = document.getElementById('fps');
      if (![...fps.options].some(option => option.value === '1')) {
        const option = document.createElement('option'); option.value = '1'; option.textContent = '1'; fps.appendChild(option);
      }
      fps.value = '1';
      document.getElementById('format').value = 'pngseq';
    });
    await page.locator('#renderBtn').click();
    await page.waitForFunction(() => /PNG Sequence selesai|Render gagal|dibatalkan/i.test(document.getElementById('exportStatus')?.textContent || ''), null, { timeout: 30000 });
    const status = await page.locator('#exportStatus').innerText();
    assert.match(status, /PNG Sequence selesai/, 'Hybrid renderer must preserve PNG sequence export: ' + status);
    assert.deepEqual(errors, [], 'Unexpected uncaught browser errors:\n' + JSON.stringify(errors, null, 2));
    console.log('Hybrid Canvas Chromium benchmark + PNG export smoke passed:', JSON.stringify({ strategy: report.strategy, reason: report.reason, benchmark: report.benchmark?.results || null, status }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
