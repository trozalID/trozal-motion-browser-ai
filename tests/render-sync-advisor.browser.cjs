'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.bringToFront();
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    const panel = page.locator('#renderSyncAdvisorPanel');
    await panel.waitFor({ state: 'attached' });
    assert.equal(await panel.count(), 1, 'Render Sync Advisor panel must exist exactly once');
    for (const id of ['renderSyncFps','renderSyncInterval','renderSyncCost','renderSyncDropped','renderSyncQueue','renderSyncDevice','renderSyncStatus','renderSyncRecommendations']) {
      assert.equal(await page.locator('#' + id).count(), 1, 'Expected #' + id);
    }
    await page.waitForFunction(() => {
      const value = document.getElementById('renderSyncFps')?.textContent || '';
      return value.includes('FPS');
    }, { timeout: 12000 }).catch(async error => { const values = await Promise.all(['renderSyncFps','renderSyncInterval','renderSyncStatus','renderSyncRecommendations'].map(id => page.locator('#' + id).textContent().catch(() => 'missing'))); throw new Error(error.message + ' | metrics=' + JSON.stringify(values) + ' | pageErrors=' + JSON.stringify(errors)); });
    await page.locator('#renderSyncReset').click();
    await page.waitForFunction(() => document.getElementById('renderSyncStatus')?.textContent.includes('Pengukuran direset'));
    await page.locator('#renderSyncRunPreflight').click();
    await page.waitForFunction(() => document.getElementById('renderPreflightStatus')?.textContent.includes('Pemeriksaan selesai'));
    const gridColumns = await page.locator('#renderSyncMetrics').evaluate(el => getComputedStyle(el).gridTemplateColumns);
    assert.ok(gridColumns.split(' ').length >= 1, 'Metrics grid must render at mobile viewport');
    assert.deepEqual(errors, [], 'Unexpected uncaught JavaScript errors');
    console.log(JSON.stringify({ result: 'PASS', viewport: '390x844', metrics: 'live', reset: 'passed', preflight: 'passed' }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
