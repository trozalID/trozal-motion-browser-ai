'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4173/index.html';
const FRAME_COUNT = 60;

async function measureScenario(pointerLocation) {
  const browser = measureScenario.browser;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  await page.addInitScript(() => {
    window.__TROZAL_RENDER_DIAGNOSTICS = true;
    window.__TROZAL_RENDER_DIAG_STATE = null;
    // Keep this test focused on frame drawing/capture; ZIP packing is stubbed.
    window.JSZip = class {
      constructor() { this.entries = 0; }
      file() { this.entries++; return this; }
      async generateAsync(options, onUpdate) {
        if (typeof onUpdate === 'function') onUpdate({ percent: 100 });
        return new Blob(['test zip'], { type: 'application/zip' });
      }
    };
  });

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#demoBtn').click();
    await page.locator('#resolution').selectOption('1280x720');
    await page.locator('#fps').selectOption('24');
    await page.locator('#format').selectOption('pngseq');
    await page.locator('#renderSpeedMode').selectOption('turbo');
    await page.locator('#duration').evaluate(el => {
      el.value = '2.5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.evaluate(() => { window.__TROZAL_RENDER_DIAG_STATE = null; });

    const progressBox = await page.locator('#renderProgress').boundingBox();
    assert.ok(progressBox && progressBox.width > 80, 'Top progress monitor must be visible');
    const viewport = page.viewportSize();
    const startedAt = Date.now();
    let moving = true;
    let pointerTicks = 0;

    await page.locator('#renderBtn').click();
    const pointerDriver = (async () => {
      while (moving && Date.now() - startedAt < 40000) {
        let x, y;
        if (pointerLocation === 'panel') {
          const inset = Math.min(8, progressBox.width / 5);
          x = progressBox.x + inset + (pointerTicks % 4) * Math.max(1, (progressBox.width - 2 * inset) / 4);
          y = progressBox.y + Math.max(2, progressBox.height / 2) + (pointerTicks % 2);
        } else {
          x = 24 + (pointerTicks % 5) * 7;
          y = viewport.height - 28 - (pointerTicks % 3) * 4;
        }
        await page.mouse.move(x, y);
        pointerTicks++;
        await page.waitForTimeout(16);
      }
    })();

    await page.waitForFunction(
      count => (window.__TROZAL_RENDER_DIAG_STATE?.count || 0) >= count,
      FRAME_COUNT,
      { timeout: 30000 }
    );
    await page.waitForFunction(
      () => document.getElementById('renderBtn')?.disabled === false,
      undefined,
      { timeout: 10000 }
    );
    moving = false;
    await pointerDriver;

    const metrics = await page.evaluate(() => {
      const d = window.__TROZAL_RENDER_DIAG_STATE || {};
      return {
        frames: d.count || 0,
        meanFrameIntervalMs: d.count > 1 ? d.totalInterval / (d.count - 1) : 0,
        minFrameIntervalMs: Number.isFinite(d.minInterval) ? d.minInterval : 0,
        maxFrameIntervalMs: d.maxInterval || 0,
        frameSpanMs: d.firstAt && d.lastAt ? d.lastAt - d.firstAt : 0,
        progressLabel: document.getElementById('renderProgressLabel')?.textContent || '',
        renderStatus: document.getElementById('exportStatus')?.textContent || ''
      };
    });

    assert.ok(metrics.frames >= FRAME_COUNT, 'All PNG frames must be drawn');
    assert.ok(metrics.meanFrameIntervalMs > 0, 'Frame timing diagnostics must be populated');
    assert.ok(pointerTicks >= 5, 'Pointer movement must be exercised during rendering');
    assert.deepEqual(pageErrors, [], 'No uncaught browser errors are expected');
    return { pointerLocation, pointerTicks, ...metrics };
  } finally {
    moving = false;
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  measureScenario.browser = browser;
  try {
    const panel = await measureScenario('panel');
    const away = await measureScenario('away');
    const slower = Math.max(panel.meanFrameIntervalMs, away.meanFrameIntervalMs);
    const faster = Math.max(0.1, Math.min(panel.meanFrameIntervalMs, away.meanFrameIntervalMs));
    const ratio = slower / faster;
    console.log(JSON.stringify({
      result: ratio <= 1.7 ? 'PASS' : 'FAIL',
      comparison: 'pointer moving over progress panel vs pointer moving away',
      panel,
      away,
      slowerToFasterRatio: Number(ratio.toFixed(3))
    }, null, 2));
    assert.ok(ratio <= 1.7,
      'Frame throughput changed too much with pointer location (slower/faster ratio ' + ratio.toFixed(2) + ')');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
