'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#trozalCanvas3DOpen').waitFor({ timeout: 15000 });
    await page.locator('#trozalCanvas3DOpen').click();
    await page.locator('#trozalRenderEngineGroups').waitFor({ timeout: 15000 });
    await page.locator('#trozalRenderEngineGroups').evaluate(el => { el.open = true; });

    await page.locator('[data-engine-group="2D / MOTION RENDER"] [data-engine-select="canvas2d"]').click();
    assert.equal(await page.evaluate(() => window.TrozalMotion2DRenderEngines.getSelected()), 'canvas2d');
    const raster = await page.evaluate(async () => {
      const source = document.createElement('canvas'); source.width = 2; source.height = 2;
      const ctx = source.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 2, 2);
      const output = await window.TrozalMotion2DRenderEngines.render(source, 8, 6);
      return { width: output.width, height: output.height, pixel: Array.from(output.getContext('2d').getImageData(0, 0, 1, 1).data) };
    });
    assert.deepEqual([raster.width, raster.height], [8, 6]);
    assert.ok(raster.pixel[0] > 240 && raster.pixel[1] < 10, 'Canvas2D raster adapter must preserve source pixels.');

    await page.locator('[data-engine-group="2D / MOTION RENDER"] [data-engine-select="svg"]').click();
    const svg = await page.evaluate(async () => {
      const source = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#00ff00"/></svg>';
      const output = await window.TrozalMotion2DRenderEngines.render(source, 10, 7);
      return { width: output.width, height: output.height, pixel: Array.from(output.getContext('2d').getImageData(0, 0, 1, 1).data) };
    });
    assert.deepEqual([svg.width, svg.height], [10, 7]);
    assert.ok(svg.pixel[1] > 240 && svg.pixel[0] < 10, 'SVG vector/raster adapter must rasterize SVG pixels.');

    await page.locator('#t3dTerminalOpen').waitFor({ timeout: 10000 });
    await page.locator('#t3dTerminalOpen').click();
    const pasted = '{"version":2,"objects":[]}';
    await page.locator('#t3dTerminalCode').evaluate((editor, text) => {
      editor.focus();
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: type => type === 'text/plain' ? text : '' } });
      editor.dispatchEvent(event);
    }, pasted);
    assert.equal(await page.locator('#t3dTerminalCode').inputValue(), pasted, 'Terminal must accept pasted plain-text JSON.');
    assert.deepEqual(errors, [], 'Canvas 3D engine and terminal interactions must not throw page errors.');
    console.log('PASS: Canvas2D Raster, SVG Raster, and Terminal paste work in Chromium.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
