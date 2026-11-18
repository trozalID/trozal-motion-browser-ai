const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#previewProxyScale');
  await page.waitForFunction(() => !!window.TrozalPreviewProxy);
  const before = await page.locator('#stage').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, clientWidth: el.clientWidth, clientHeight: el.clientHeight }));
  const exportBefore = await page.evaluate(() => ({
    resolution: document.getElementById('resolution')?.value,
    fps: document.getElementById('fps')?.value
  }));
  await page.locator('#previewProxyScale').selectOption('0.25');
  await page.evaluate(() => { if (typeof renderAt === 'function') renderAt(0); });
  await page.waitForFunction(() => {
    const stage = document.getElementById('stage');
    const canvas = document.getElementById('previewFx');
    return !!stage && !!canvas && canvas.width === Math.max(1, Math.round(stage.clientWidth * 0.25));
  });
  const proxy = await page.locator('#previewFx').evaluate(el => ({
    width: el.width,
    height: el.height,
    cssWidth: getComputedStyle(el).width
  }));
  const after = await page.locator('#stage').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  assert.ok(Math.abs(proxy.width - Math.round(before.clientWidth * 0.25)) <= 1, 'Preview effect canvas backing width should be quarter scale');
  assert.ok(Math.abs(proxy.height - Math.round(before.clientHeight * 0.25)) <= 1, 'Preview effect canvas backing height should be quarter scale');
  assert.equal(after.width, before.width, 'Stage layout dimensions must not change');
  assert.equal(after.height, before.height, 'Stage layout dimensions must not change');
  const exportAfter = await page.evaluate(() => ({
    resolution: document.getElementById('resolution')?.value,
    fps: document.getElementById('fps')?.value
  }));
  assert.deepEqual(exportAfter, exportBefore, 'Preview proxy must not alter export resolution or FPS');
  await page.locator('#previewProxyScale').selectOption('1');
  await page.evaluate(() => { if (typeof renderAt === 'function') renderAt(0); });
  await page.waitForFunction(() => {
    const stage = document.getElementById('stage');
    const canvas = document.getElementById('previewFx');
    return !!stage && !!canvas && canvas.width === Math.max(1, Math.round(stage.clientWidth));
  });
  assert.deepEqual(errors, [], 'Unexpected browser page errors');
  await browser.close();
  console.log('PASS: Preview Proxy changes only the preview-effects canvas backing resolution.');
})().catch(error => { console.error(error); process.exit(1); });
