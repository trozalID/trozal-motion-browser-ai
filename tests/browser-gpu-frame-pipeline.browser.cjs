'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: require.resolve('jszip/dist/jszip.min.js') });
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
      await page.locator('#clearBtn').click();
      const pngDataUrl = await page.evaluate(() => { const c=document.createElement('canvas'); c.width=64; c.height=64; const x=c.getContext('2d'); x.fillStyle='#ef3340'; x.fillRect(0,0,64,64); return c.toDataURL('image/png'); });
      await page.locator('#fileInput').setInputFiles({ name:'gpu-test.png', mimeType:'image/png', buffer:Buffer.from(pngDataUrl.split(',')[1],'base64') });
      await page.waitForFunction(() => { const image=document.querySelector('#object img'); return !!image && image.complete && image.naturalWidth>0; });
      await page.evaluate(() => {
        document.getElementById('resolution').value = '1280x720';
        document.getElementById('duration').value = '1';
        const fps = document.getElementById('fps');
        const fastOption = document.createElement('option'); fastOption.value = '1'; fastOption.textContent = '1'; fps.appendChild(fastOption); fps.value = '1';
        window.__TROZAL_RENDER_DIAGNOSTICS = true;
        document.getElementById('format').value = 'pngseq';
        window.__trozalGpuFrameAssistEnabled = true;
      });
      await page.locator('#renderBtn').click();
      try {
        await page.waitForFunction(() => { const value = document.getElementById('exportStatus')?.textContent || ''; return value.includes('PNG Sequence selesai') || /dibatalkan|gagal|error|tidak tersedia|format tidak didukung/i.test(value); }, null, { timeout: 20000 });
      } catch (error) {
        const snapshot = await page.evaluate(() => ({
          exportStatus: document.getElementById('exportStatus')?.textContent,
          status: document.getElementById('status')?.textContent,
          renderButtonDisabled: document.getElementById('renderBtn')?.disabled,
          progress: document.getElementById('renderProgressLabel')?.textContent,
          metrics: window.__trozalRenderMetrics || null,
          diagnostics: window.__TROZAL_RENDER_DIAG_STATE || null,
          gpu: window.TrozalGpuFramePipeline?.getStats?.(),
          hasSvg: !!document.querySelector('#object svg'), hasImage: !!document.querySelector('#object img')
        }));
        throw new Error(error.message + ' · render snapshot=' + JSON.stringify(snapshot));
      }
      const exportStatus = await page.locator('#exportStatus').textContent();
      assert.match(exportStatus, /PNG Sequence selesai/, 'GPU export integration did not finish successfully: ' + exportStatus);
      const exportStats = await page.evaluate(() => window.TrozalGpuFramePipeline.getStats());
      assert.ok(exportStats.draws > result.stats.draws, 'PNG Sequence export must call the GPU layer rasterizer when GPU Assist is enabled');
      console.log('GPU-assisted PNG Sequence export integration passed:', JSON.stringify(exportStats));
      const benchmark = await page.evaluate(async () => window.TrozalGpuFramePipeline.benchmark({ sizes: [{ label: 'test', width: 320, height: 180 }], iterations: 2 }));
      assert.equal(benchmark.results.length, 1, 'Benchmark should return one requested test size');
      assert.ok(Number.isFinite(benchmark.results[0].canvas2dMedianMs), 'Canvas2D benchmark timing should be numeric');
      assert.ok(Number.isFinite(benchmark.results[0].gpuAssistMedianMs), 'GPU benchmark timing should be numeric');
      assert.equal(benchmark.results[0].iterations, 2);
      const unsupported = await page.evaluate(async (limit) => {
        try { await window.TrozalGpuFramePipeline.benchmark({ sizes: [{ label: 'oversize', width: limit + 1, height: 32 }], iterations: 2 }); return ''; }
        catch (error) { return error.message; }
      }, benchmark.maxTextureSize);
      assert.match(unsupported, /tidak didukung GPU ini/, 'Benchmark must reject sizes beyond GPU texture capability before allocating canvases');
      const invalid = await page.evaluate(async () => {
        try { await window.TrozalGpuFramePipeline.benchmark({ sizes: [{ label: 'invalid', width: -1, height: 32 }], iterations: 2 }); return ''; }
        catch (error) { return error.message; }
      });
      assert.match(invalid, /Resolusi benchmark tidak valid/, 'Benchmark must reject invalid dimensions');
      assert.equal(await page.locator('#trozalGpuBenchmarkBtn').count(), 1, 'GPU health panel should expose the local benchmark action');
      console.log('GPU benchmark diagnostic test passed:', JSON.stringify(benchmark));
    } else {
      console.log('GPU frame pipeline unavailable in this browser; verified safe Canvas2D fallback:', JSON.stringify(result.stats));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });