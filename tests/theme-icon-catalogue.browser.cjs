'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      Array.isArray(window.TROZAL_AI_THEMES) &&
      Array.isArray(window.TROZAL_THEME_ICON_CATALOG) &&
      window.TROZAL_THEME_ICON_CATALOG.length === window.TROZAL_AI_THEMES.length &&
      typeof window.trozalGetThemeIconPack === 'function',
      undefined,
      { timeout: 15000 }
    );

    const audit = await page.evaluate(() => ({
      mainThemeCount: window.TROZAL_AI_THEMES.length,
      iconCollectionCount: window.TROZAL_THEME_ICON_CATALOG.length,
      uniquePackThemes: new Set(window.TROZAL_THEME_ICON_CATALOG.map(pack => pack.theme)).size,
      emptyPacks: window.TROZAL_THEME_ICON_CATALOG.filter(pack => !pack.icons || pack.icons.length < 7).map(pack => pack.theme),
      mismatchedPackNames: window.TROZAL_THEME_ICON_CATALOG.filter((pack, index) => pack.theme !== window.TROZAL_AI_THEMES[index]).map(pack => pack.theme)
    }));
    assert.equal(audit.mainThemeCount, 333, 'The main catalogue must retain all 333 themes');
    assert.equal(audit.iconCollectionCount, 333, 'Every main theme must have its own icon collection');
    assert.equal(audit.uniquePackThemes, 333, 'Icon collections must be uniquely keyed by main theme');
    assert.deepEqual(audit.emptyPacks, [], 'Every theme icon collection must contain at least seven relevant choices');
    assert.deepEqual(audit.mismatchedPackNames, [], 'Icon collection order and keys must stay synchronized with the main theme catalogue');

    await page.locator('#svgAiTheme').selectOption({ label: 'Space & Astronomy' });
    await page.waitForFunction(() => document.querySelectorAll('#svgAiIconCatalog .trozal-icon-choice').length >= 7);
    const activeCollection = await page.locator('#svgAiIconCatalogCount').innerText();
    assert.match(activeCollection, /Space & Astronomy/);
    assert.match(activeCollection, /8 ikon tersedia/);

    await page.locator('#svgAiTransparentIconStyle').selectOption('Glassmorphism translucent');
    await page.locator('#svgAiIconCatalog .trozal-icon-choice').first().click();
    await page.waitForFunction(() => window.__trozalSelectedIcons?.length === 1);
    const spaceIcon = await page.evaluate(() => window.__trozalSelectedIcons[0]);
    assert.equal(spaceIcon.theme, 'Space & Astronomy');
    assert.ok(spaceIcon.name.length > 5);

    await page.locator('#generateSvgAiPromptBtn').click();
    let prompt = await page.locator('#svgAiPrompt').inputValue();
    assert.match(prompt, /THEME-LINKED TRANSPARENT ICON SYSTEM/);
    assert.ok(prompt.includes(spaceIcon.name), 'Prompt must include the exact selected icon asset');

    await page.locator('#svgAiIconSearch').fill('Cybersecurity');
    await page.waitForFunction(() => [...document.querySelectorAll('#svgAiIconCatalog .trozal-icon-choice')].length > 0);
    const globalSearchCount = await page.locator('#svgAiIconCatalogCount').innerText();
    assert.match(globalSearchCount, /pencarian global/);
    await page.locator('#svgAiIconCatalog .trozal-icon-choice').first().click();
    await page.waitForFunction(() => document.getElementById('svgAiTheme')?.value === 'Cybersecurity');
    const cyberState = await page.evaluate(() => ({
      theme: document.getElementById('svgAiTheme').value,
      style: document.getElementById('svgAiTransparentIconStyle').value,
      selected: window.__trozalSelectedIcons || []
    }));
    assert.equal(cyberState.theme, 'Cybersecurity', 'Global icon search must synchronize the main theme');
    assert.equal(cyberState.style, 'Glassmorphism translucent', 'Theme changes must preserve icon treatment');
    assert.equal(cyberState.selected.length, 1, 'Selecting a global search result must select one matching icon');
    assert.equal(cyberState.selected[0].theme, 'Cybersecurity', 'Selected icon must belong to the synchronized theme');

    await page.locator('#generateSvgAiPromptBtn').click();
    prompt = await page.locator('#svgAiPrompt').inputValue();
    assert.match(prompt, /Main theme: Cybersecurity/);
    assert.ok(prompt.includes(cyberState.selected[0].name));
    const autoSpec = await page.locator('#svgAiAutoSpec').innerText();
    assert.match(autoSpec, /KATALOG IKON TEMA/);
    assert.match(autoSpec, /IKON DIPILIH/);
    assert.match(await page.locator('#svgAiIconSelected').innerText(), /Ikon terpilih/);
    assert.deepEqual(errors, [], 'Icon catalogue interactions must not throw browser errors');

    const iconCounts = await page.evaluate(() => window.TROZAL_THEME_ICON_CATALOG.map(pack => pack.icons.length));
    console.log(JSON.stringify({
      result: 'PASS',
      mainThemes: audit.mainThemeCount,
      dedicatedIconCollections: audit.iconCollectionCount,
      minimumIconsPerCollection: Math.min(...iconCounts),
      globalSearchAndThemeSync: 'PASS',
      selectedIconsIncludedInPrompt: 'PASS',
      iconStylePreservedOnThemeChange: 'PASS'
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
