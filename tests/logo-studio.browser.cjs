const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#trozalLogoStudio');
  await page.waitForFunction(() => window.trozalLogoStudio?.getTemplates?.().length === 16);

  const initialTemplate = await page.evaluate(() => window.trozalLogoStudio.getActiveTemplate());
  assert.equal(initialTemplate, 'orbit');
  assert.match(await page.locator('#trozalLogoCount').textContent(), /16 logo tersedia/);

  await page.locator('#trozalLogoSearch').fill('shield');
  await page.waitForFunction(() => document.querySelectorAll('#trozalLogoCatalog .logo-choice').length === 1);
  await page.locator('#trozalLogoCatalog .logo-choice').click();
  assert.equal(await page.evaluate(() => window.trozalLogoStudio.getActiveTemplate()), 'shield');

  await page.locator('#trozalLogoName').fill('BRAND TEST');
  await page.locator('#trozalLogoTagline').fill('Independent identity');
  const svg = await page.evaluate(() => window.trozalLogoStudio.getSvg());
  assert.match(svg, /BRAND TEST/);
  assert.match(svg, /Independent identity/);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);

  const themeSelect = page.locator('#svgAiTheme');
  if (await themeSelect.count()) {
    const before = await page.evaluate(() => window.trozalLogoStudio.getActiveTemplate());
    await themeSelect.evaluate(el => {
      if (el.options.length > 1) {
        el.selectedIndex = 1;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    assert.equal(await page.evaluate(() => window.trozalLogoStudio.getActiveTemplate()), before,
      'Changing the main theme must not alter the independent logo selection');
  }

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#trozalLogoDownload').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'trozal-logo.svg');

  await page.locator('#trozalLogoInsertCanvas').click();
  await page.waitForFunction(() => !!document.querySelector('#object svg'));
  assert.match(await page.locator('#object').innerHTML(), /BRAND TEST/,
    'Logo Studio must insert the generated SVG as an editable Canvas asset');

  assert.deepEqual(errors, [], 'Unexpected page errors while using Logo Studio');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
