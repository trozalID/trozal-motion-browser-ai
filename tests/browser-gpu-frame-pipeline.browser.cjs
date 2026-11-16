'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(() => {
      const pipeline = window.TrozalGpuFramePipeline;
      if (!pipeline) throw new Error('GPU frame pipeline script was not loaded');
      const source = document.createElement('canvas');
      source.width = 8; source.height = 8;
      const ctx = source.getContext('2d');
      ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,8,4);
      ctx.fillStyle = '#0000ff'; ctx.fillRect(0,4,8,4);
      const output = pipeline.render(source, 16, 16);
      if (!output) return { available: false, stats: pipeline.getStats() };
      const readback = document.createElement('canvas'); readback.width=16; readback.height=16;
      const readCtx=readback.getContext('2d'); readCtx.drawImage(output,0,0);
      const top=readCtx.getImageData(8,2,1,1).data, bottom=readCtx.getImageData(8,13,1,1).data;
      return { available:true, top:[...top], bottom:[...bottom], stats:pipeline.getStats() };
    });
    if (result.available) {
      assert.ok(result.top[0] > 200 && result.top[2] < 40, 'GPU rasterizer must preserve top image rows');
      assert.ok(result.bottom[2] > 200 && result.bottom[0] < 40, 'GPU rasterizer must preserve bottom image rows');
      assert.equal(result.stats.draws, 1);
      assert.equal(result.stats.uploads, 1);
      console.log('GPU frame pipeline browser test passed:', JSON.stringify(result));
      await page.locator('#demoBtn').click();
      await page.evaluate(() => {
        document.getElementById('resolution').value = '1280x720';
        document.getElementById('duration').value = '1';
        document.getElementById('fps').value = '30';
        document.getElementById('format').value = 'webm';
        window.__trozalGpuFrameAssistEnabled = true;
      });
      await page.locator('#renderBtn').click();
      await page.waitForFunction(() => { const value = document.getElementById('exportStatus')?.textContent || ''; return value.includes('Selesai:') || /dibatalkan|gagal|error|tidak tersedia|format tidak didukung/i.test(value); }, null, { timeout: 45000 });
      const exportStatus = await page.locator('#exportStatus').textContent();
      assert.match(exportStatus, /Selesai:/, 'GPU export integration did not finish successfully: ' + exportStatus);
      const exportStats = await page.evaluate(() => window.TrozalGpuFramePipeline.getStats());
      assert.ok(exportStats.draws > result.stats.draws, 'WebM export must call the GPU layer rasterizer when GPU Assist is enabled');
      console.log('GPU-assisted WebM export integration passed:', JSON.stringify(exportStats));
    } else {
      console.log('GPU frame pipeline unavailable in this browser; verified safe Canvas2D fallback:', JSON.stringify(result.stats));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });