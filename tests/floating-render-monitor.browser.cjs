'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('dialog', dialog => dialog.accept());

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    const monitor = page.locator('#trozalFloatingRender');
    await monitor.waitFor({ state: 'attached' });
    assert.equal(await monitor.count(), 1, 'Floating render monitor must be created exactly once');

    const initial = await page.evaluate(() => {
      window.__trozalRenderMetrics = {
        active: true, width: 1280, height: 720, fps: 30, duration: 4,
        totalFrames: 120, format: 'MP4', startedAt: performance.now(),
        lastUpdateAt: performance.now(), lastPercent: 0, speed: 0
      };
      setRenderProgress(25, 'Chromium monitor smoke test', 'running');
      return {
        topbarDisplay: getComputedStyle(document.getElementById('renderProgress')).display,
        oldCancelDisplay: getComputedStyle(document.getElementById('cancelRenderBtn')).display
      };
    });
    await page.locator('#trozalFloatingRender.is-visible').waitFor({ state: 'visible' });
    assert.equal(initial.topbarDisplay, 'none', 'Legacy topbar progress must remain hidden');
    assert.equal(initial.oldCancelDisplay, 'none', 'Legacy cancel button must remain hidden');

    const stats = await page.evaluate(() => ({
      percent: document.getElementById('tfrPct')?.textContent,
      stage: document.getElementById('tfrStage')?.textContent,
      resolution: document.getElementById('tfrResolution')?.textContent,
      targetFps: document.getElementById('tfrTargetFps')?.textContent,
      frames: document.getElementById('tfrFrames')?.textContent,
      duration: document.getElementById('tfrDuration')?.textContent,
      format: document.getElementById('tfrFormat')?.textContent,
      cancelDisabled: document.getElementById('tfrCancel')?.disabled
    }));
    assert.equal(stats.percent, '25.0%');
    assert.match(stats.stage, /Chromium monitor smoke test/);
    assert.equal(stats.resolution, '1280 × 720');
    assert.equal(stats.targetFps, '30 FPS');
    assert.match(stats.frames, /30\s*\/\s*120/);
    assert.equal(stats.duration, '4.0 dtk');
    assert.equal(stats.format, 'MP4');
    assert.equal(stats.cancelDisabled, false, 'Cancel must be enabled during rendering');

    // The whole header is a drag handle; dragging the title area must reposition the panel.
    let head = await page.locator('#trozalFloatingRender .tfr-head').boundingBox();
    await page.mouse.move(head.x + 65, head.y + head.height / 2);
    await page.mouse.down();
    await page.mouse.move(85, 75, { steps: 8 });
    await page.mouse.up();
    const moved = await monitor.evaluate(el => ({
      left: el.getBoundingClientRect().left,
      top: el.getBoundingClientRect().top,
      saved: localStorage.getItem('trozalRenderMonitorPosition')
    }));
    assert.ok(moved.left < 200 && moved.top < 200, 'Monitor must be draggable to a free viewport position');
    assert.ok(moved.saved && JSON.parse(moved.saved).left, 'Monitor position must be saved');

    // Drag far outside the viewport and verify the panel is clamped fully on-screen.
    head = await page.locator('#trozalFloatingRender .tfr-head').boundingBox();
    await page.mouse.move(head.x + 60, head.y + head.height / 2);
    await page.mouse.down();
    await page.mouse.move(3000, 2000, { steps: 8 });
    await page.mouse.up();
    const clamped = await monitor.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: innerWidth, height: innerHeight };
    });
    assert.ok(clamped.left >= 0 && clamped.top >= 0, 'Monitor must not move beyond top/left viewport edges');
    assert.ok(clamped.right <= clamped.width + 1 && clamped.bottom <= clamped.height + 1,
      'Monitor must be clamped inside right/bottom viewport edges');

    await page.locator('#tfrMin').click();
    assert.ok(await monitor.evaluate(el => el.classList.contains('is-minimized')), 'Monitor minimize button must work');
    await page.locator('#tfrMin').click();
    assert.ok(!(await monitor.evaluate(el => el.classList.contains('is-minimized'))), 'Monitor restore button must work');

    await page.evaluate(() => {
      window.__tfrCancelCalls = 0;
      window.confirm = () => true;
      trozalRenderCancelHandler = () => {
        window.__tfrCancelCalls++;
        window.__trozalRenderMetrics.active = false;
        setRenderProgress(0, 'Render dibatalkan', 'error');
      };
    });
    await page.locator('#tfrCancel').click();
    const cancel = await page.evaluate(() => ({
      calls: window.__tfrCancelCalls,
      disabled: document.getElementById('tfrCancel')?.disabled,
      state: document.getElementById('tfrState')?.textContent,
      stage: document.getElementById('tfrStage')?.textContent
    }));
    assert.equal(cancel.calls, 1, 'Cancel button must call the active render cancellation handler');
    assert.equal(cancel.disabled, true, 'Cancel must disable after rendering stops');
    assert.equal(cancel.state, 'STOPPED');
    assert.match(cancel.stage, /Render dibatalkan/);

    // Exercise the application's real PNG Sequence render cancellation path.
    const livePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const liveErrors = [];
    livePage.on('pageerror', error => liveErrors.push(error.stack || error.message));
    livePage.on('dialog', dialog => dialog.accept());
    await livePage.addInitScript(() => {
      window.confirm = () => true;
      window.JSZip = class {
        file() { return this; }
        async generateAsync() { return new Blob(['cancel-test'], { type: 'application/zip' }); }
      };
    });
    await livePage.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await livePage.locator('#demoBtn').click();
    await livePage.locator('#resolution').selectOption('1280x720');
    await livePage.locator('#fps').selectOption('24');
    await livePage.locator('#format').selectOption('pngseq');
    await livePage.locator('#renderSpeedMode').selectOption('turbo');
    await livePage.locator('#duration').evaluate(el => {
      el.value = '4';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await livePage.locator('#renderBtn').click();
    await livePage.locator('#trozalFloatingRender.is-visible').waitFor({ state: 'visible', timeout: 10000 });
    await livePage.waitForFunction(() => window.__trozalRenderMetrics?.active === true, undefined, { timeout: 10000 });
    await livePage.locator('#tfrCancel').click();
    await livePage.waitForFunction(() =>
      document.getElementById('renderBtn')?.disabled === false &&
      document.getElementById('tfrState')?.textContent === 'STOPPED',
      undefined,
      { timeout: 10000 }
    );
    const liveCancel = await livePage.evaluate(() => ({
      metricsActive: window.__trozalRenderMetrics?.active,
      cancelDisabled: document.getElementById('tfrCancel')?.disabled,
      renderButtonDisabled: document.getElementById('renderBtn')?.disabled,
      stage: document.getElementById('tfrStage')?.textContent,
      status: document.getElementById('exportStatus')?.textContent || ''
    }));
    assert.equal(liveCancel.metricsActive, false, 'Real render metrics must stop after cancellation');
    assert.equal(liveCancel.cancelDisabled, true, 'Monitor Cancel must disable after real render cancellation');
    assert.equal(liveCancel.renderButtonDisabled, false, 'Render button must recover after cancellation');
    assert.match(liveCancel.stage, /Render dibatalkan/);
    assert.match(liveCancel.status, /dibatalkan/i);
    assert.deepEqual(liveErrors, [], 'Real PNG Sequence cancellation must not throw browser errors');
    await livePage.close();

    assert.deepEqual(pageErrors, [], 'Floating render monitor interactions must not throw browser errors');
    console.log(JSON.stringify({
      result: 'PASS',
      metrics: 'resolution/FPS/frames/duration/format',
      drag: 'free-position + viewport-clamped',
      persistence: 'localStorage position saved',
      minimizeRestore: 'passed',
      cancelHandler: 'synthetic callback and real PNG Sequence render cancellation passed',
      legacyProgressUi: 'hidden'
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
