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
  const stage = page.locator('#stage');
  const canvas = page.locator('#previewFx');
  const before = await stage.boundingBox();
  const exportBefore = await page.evaluate(() => ({
    resolution: document.getElementById('resolution')?.value,
    fps: document.getElementById('fps')?.value
  }));
  await page.locator('#previewProxyScale').selectOption('0.25');
  await page.waitForFunction(() => window.TrozalPreviewProxy.getScale() === 0.25);
  await page.evaluate(() => {
    const stage = document.getElementById('stage');
    const canvas = document.getElementById('previewFx');
    const w = Math.max(1, Math.round(stage.clientWidth));
    const h = Math.max(1, Math.round(stage.clientHeight));
    canvas.width = Math.max(1, Math.round(w * window.TrozalPreviewProxy.getScale()));
    canvas.height = Math.max(1, Math.round(h * window.TrozalPreviewProxy.getScale()));
  });
  const proxy = await canvas.evaluate(el => ({
    width: el.width,
    height: el.height,
    cssWidth: getComputedStyle(el).width
  }));
  const after = await stage.boundingBox();
  assert.ok(Math.abs(proxy.width - Math.round(before.width * 0.25)) <= 1, 'Preview effect canvas backing width should be quarter scale');
  assert.ok(Math.abs(proxy.height - Math.round(before.height * 0.25)) <= 1, 'Preview effect canvas backing height should be quarter scale');
  assert.equal(after.width, before.width, 'Stage layout dimensions must not change');
  assert.equal(after.height, before.height, 'Stage layout dimensions must not change');
  const exportAfter = await page.evaluate(() => ({
    resolution: document.getElementById('resolution')?.value,
    fps: document.getElementById('fps')?.value
  }));
  assert.deepEqual(exportAfter, exportBefore, 'Preview proxy must not alter export resolution or FPS');
  await page.locator('#previewProxyScale').selectOption('1');
  await page.waitForFunction(() => window.TrozalPreviewProxy.getScale() === 1);
  assert.deepEqual(errors, [], 'Unexpected browser page errors');
  await browser.close();
  console.log('PASS: Preview Proxy changes only the preview-effects canvas backing resolution.');
})().catch(error => { console.error(error); process.exit(1); });
