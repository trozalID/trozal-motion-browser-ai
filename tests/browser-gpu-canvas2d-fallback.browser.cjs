'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (type === 'webgl2') return null;
        return original.call(this, type, ...args);
      };
    });
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    const unavailable = await page.evaluate(() => {
      const pipeline = window.TrozalGpuFramePipeline;
      if (!pipeline) throw new Error('GPU frame pipeline script was not loaded');
      const source = document.createElement('canvas');
      source.width = source.height = 8;
      source.getContext('2d').fillRect(0, 0, 8, 8);
      const result = pipeline.render(source, 64, 64);
      return { returnedNull: result === null, stats: pipeline.getStats() };
    });
    assert.equal(unavailable.returnedNull, true, 'Unavailable WebGL2 must return control to the Canvas2D renderer');
    assert.equal(unavailable.stats.failed, true, 'Unavailable WebGL2 must latch the safe fallback state');
    assert.equal(unavailable.stats.available, false);

    await page.locator('#fileInput').setInputFiles({
      name: 'canvas2d-fallback.png',
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
      const option = document.createElement('option');
      option.value = '1'; option.textContent = '1'; fps.appendChild(option); fps.value = '1';
      document.getElementById('format').value = 'pngseq';
      window.__trozalGpuFrameAssistEnabled = true;
    });
    await page.locator('#renderBtn').click();
    await page.waitForFunction(() => {
      const status = document.getElementById('exportStatus')?.textContent || '';
      return status.includes('PNG Sequence selesai') || /gagal|error|dibatalkan/i.test(status);
    }, null, { timeout: 20000 });
    const status = await page.locator('#exportStatus').textContent();
    assert.match(status, /PNG Sequence selesai/, 'Canvas2D fallback must still complete export when WebGL2 is unavailable: ' + status);
    const finalStats = await page.evaluate(() => window.TrozalGpuFramePipeline.getStats());
    assert.equal(finalStats.failed, true);
    assert.equal(finalStats.available, false);
    console.log('GPU-unavailable Canvas2D export fallback passed:', JSON.stringify({ status, stats: finalStats }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
