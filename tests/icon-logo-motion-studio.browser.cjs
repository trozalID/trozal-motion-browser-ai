'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
  const source = fs.readFileSync('site/icon-logo-motion-studio.js', 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent('<div class="ui-layout-switcher"><button class="ui-layout-btn">Professional</button><button class="ui-layout-btn">Classic</button></div>');
    await page.addScriptTag({ content: source });
    await page.waitForSelector('#tm4ModeBtn');
    await page.click('#tm4ModeBtn');
    await page.waitForSelector('#tm4Overlay.open');
    assert.equal(await page.locator('#tm4Catalog .tm4-item').count(), 37, '37 searchable motif entries');
    assert.match(await page.locator('#tm4MotifCount').innerText(), /333 kombinasi gaya/);
    await page.locator('#tm4Search').fill('kamera');
    assert.equal(await page.locator('#tm4Catalog .tm4-item').count(), 1, 'catalog search filters motifs');
    await page.locator('#tm4Catalog .tm4-item').click();
    assert.equal(await page.locator('#tm4Layers .tm4-layer').count(), 4, 'adding an icon creates a layer');
    await page.locator('#tm4AddText').click();
    assert.equal(await page.locator('#tm4Layers .tm4-layer').count(), 5, 'text layer can be added');
    await page.locator('#tm4AddScene').click();
    assert.equal(await page.locator('#tm4SceneTabs button').count(), 4, 'new scene can be added');
    await page.locator('[data-out="svg"]').click();
    assert.match(await page.locator('#tm4Output').inputValue(), /<svg/);
    await page.locator('[data-out="html"]').click();
    assert.match(await page.locator('#tm4Output').inputValue(), /@keyframes move/);
    await page.locator('[data-out="video"]').click();
    assert.match(await page.locator('#tm4Output').inputValue(), /<section class="scene"/);
    await page.locator('#tm4Play').click();
    assert.match(await page.locator('#tm4Play').innerText(), /Pause/);
    await page.locator('#tm4Play').click();
    assert.match(await page.locator('#tm4Play').innerText(), /Play/);
    console.log('Icon & Logo Motion Studio browser interaction test passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
