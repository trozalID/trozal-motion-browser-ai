'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.bringToFront();
    const panel = page.locator('#renderSyncAdvisorPanel');
    await panel.waitFor({ state: 'attached' });
    assert.equal(await panel.count(), 1, 'Render Sync Advisor panel must exist exactly once');
    for (const id of ['renderSyncFps','renderSyncInterval','renderSyncCost','renderSyncDropped','renderSyncQueue','renderSyncDevice','renderSyncStatus','renderSyncRecommendations']) {
      assert.equal(await page.locator('#' + id).count(), 1, 'Expected #' + id);
    }
    const initState = await page.evaluate(() => ({
      visibility: document.visibilityState,
      wrapped: !!window.__trozalRenderAtAdvisorWrapped,
      device: document.getElementById('renderSyncDevice')?.textContent,
      renderAtHook: typeof window.renderAt,
      preflightHook: typeof window.trozalRunRenderPreflight,
      advisorInitialized: !!window.__trozalRenderSyncAdvisorInitialized
    }));
    console.log('Render Sync init:', JSON.stringify(initState));
    if (initState.renderAtHook !== 'function' || initState.preflightHook !== 'function' || !initState.wrapped) {
      const runtime = await page.evaluate(() => ({
        readyState: document.readyState,
        scriptCount: document.scripts.length,
        mainInlineScripts: [...document.scripts].filter(s => !s.src).length,
        advisorSrc: [...document.scripts].map(s => s.src).filter(Boolean),
        advisorInitialized: !!window.__trozalRenderSyncAdvisorInitialized,
        diagnostics: window.__trozalRenderSyncDiagnostics || null
      }));
      throw new Error('Advisor hook bridge unavailable: ' + JSON.stringify({ initState, runtime, pageErrors: errors, consoleErrors }));
    }
    await page.waitForFunction(() => {
      const value = document.getElementById('renderSyncFps')?.textContent || '';
      return value.includes('FPS') && (window.__trozalRenderSyncDiagnostics?.rafTicks || 0) >= 2;
    }, undefined, { timeout: 12000 }).catch(async error => {
      const snapshot = await page.evaluate(() => ({
        diagnostics: window.__trozalRenderSyncDiagnostics || null,
        initialized: !!window.__trozalRenderSyncAdvisorInitialized,
        advisorScript: [...document.scripts].map(s => s.src).filter(src => src.includes('render-sync-advisor')),
        readyState: document.readyState,
        visibility: document.visibilityState,
        fps: document.getElementById('renderSyncFps')?.textContent || 'missing'
      })).catch(() => null);
      const values = await Promise.all(['renderSyncFps','renderSyncInterval','renderSyncStatus','renderSyncRecommendations'].map(id => page.locator('#' + id).textContent().catch(() => 'missing')));
      throw new Error(error.message + ' | snapshot=' + JSON.stringify(snapshot) + ' | metrics=' + JSON.stringify(values) + ' | pageErrors=' + JSON.stringify(errors));
    });
    await page.locator('#renderSyncReset').click();
    await page.waitForFunction(() => document.getElementById('renderSyncStatus')?.textContent.includes('Pengukuran direset'));
    await page.locator('#renderSyncRunPreflight').click();
    await page.waitForFunction(
      () => document.getElementById('renderPreflightStatus')?.textContent.includes('Pemeriksaan selesai'),
      undefined,
      { timeout: 5000 }
    ).catch(async error => {
      const snapshot = await page.evaluate(() => ({
        preflightHook: typeof window.trozalRunRenderPreflight,
        status: document.getElementById('renderPreflightStatus')?.textContent || 'missing',
        recommendations: document.getElementById('renderSyncRecommendations')?.textContent || 'missing',
        gridCells: document.getElementById('renderPreflightGrid')?.children.length || 0
      })).catch(() => null);
      throw new Error(error.message + ' | preflightSnapshot=' + JSON.stringify(snapshot) + ' | pageErrors=' + JSON.stringify(errors));
    });
    const diagnostics = await page.evaluate(() => window.__trozalRenderSyncDiagnostics || null);
    assert.ok(diagnostics && diagnostics.rafTicks >= 2, 'Advisor requestAnimationFrame loop must remain alive');
    assert.ok(diagnostics.samples >= 1, 'Advisor must collect live cadence samples');
    const gridColumns = await page.locator('#renderSyncMetrics').evaluate(el => getComputedStyle(el).gridTemplateColumns);
    assert.ok(gridColumns.split(' ').length >= 1, 'Metrics grid must render at mobile viewport');
    assert.deepEqual(errors, [], 'Unexpected uncaught JavaScript errors');
    console.log(JSON.stringify({ result: 'PASS', viewport: '390x844', metrics: 'live', reset: 'passed', preflight: 'passed' }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
