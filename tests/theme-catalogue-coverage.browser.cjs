'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      Array.isArray(window.TROZAL_AI_THEMES) &&
      window.TROZAL_AI_THEMES.length >= 300 &&
      typeof window.trozalGetThemeDomainProfile === 'function' &&
      typeof window.trozalThemeProfile === 'function' &&
      typeof window.trozalBuildThemeCreativeBrief === 'function' &&
      typeof window.generateSvgAiPrompt === 'function',
      undefined,
      { timeout: 15000 }
    );

    const audit = await page.evaluate(() => {
      const names = [...new Set(window.TROZAL_AI_THEMES.map(x => String(x).trim()).filter(Boolean))];
      const familyCounts = {};
      const unclassified = [];
      const thinProfiles = [];
      const promptGaps = [];
      let minimumCategories = Infinity;
      let minimumSubthemes = Infinity;
      const samples = {};

      for (const theme of names) {
        const domain = window.trozalGetThemeDomainProfile(theme);
        const profile = window.trozalThemeProfile(theme);
        const category = profile.styles?.[0] || '';
        const specific = profile.specifics?.[0] || '';
        const brief = window.trozalBuildThemeCreativeBrief(theme, category, specific);
        familyCounts[domain.id] = (familyCounts[domain.id] || 0) + 1;
        minimumCategories = Math.min(minimumCategories, profile.styles?.length || 0);
        minimumSubthemes = Math.min(minimumSubthemes, profile.specifics?.length || 0);
        if (!domain || domain.id === 'general-topic') unclassified.push(theme);
        if ((profile.styles?.length || 0) < 7 || (profile.specifics?.length || 0) < 8) {
          thinProfiles.push({ theme, categories: profile.styles?.length || 0, subthemes: profile.specifics?.length || 0 });
        }
        const required = [
          'Main-theme intent:',
          'Hero subject and action:',
          'Selected subtheme to depict:',
          'Required domain-specific visual vocabulary:',
          'Mapped theme domain:',
          'Domain-specific objects and vocabulary:',
          'Domain motion grammar:',
          'Domain exclusions:'
        ];
        const summaryFields = ['DOMAIN:', 'TEMA UTAMA:', 'TUJUAN:', 'SUBJEK UTAMA:', 'GAYA VISUAL:', 'ASET VISUAL:', 'PALET & MATERIAL:', 'KOMPOSISI:', 'ALUR GERAK:', 'BATASAN:'];
        if (!brief.prompt.includes(theme) || !brief.prompt.includes(specific) ||
            required.some(line => !brief.prompt.includes(line)) ||
            summaryFields.some(line => !brief.summary.includes(line)) ||
            !brief.summary.includes(theme) || !brief.summary.includes(domain.label)) {
          promptGaps.push(theme);
        }
        if (!samples[domain.id]) samples[domain.id] = { theme, category, specific, label: domain.label };
      }
      return {
        themeCount: names.length,
        familyCounts,
        unclassified,
        thinProfiles,
        promptGaps,
        minimumCategories,
        minimumSubthemes,
        samples
      };
    });

    assert.ok(audit.themeCount >= 300, 'The test must cover the full built-in theme catalogue');
    assert.deepEqual(audit.unclassified, [], 'Every built-in theme must map to a named creative domain');
    assert.deepEqual(audit.thinProfiles, [], 'Every built-in theme must have at least 7 categories and 8 subthemes');
    assert.deepEqual(audit.promptGaps, [], 'Every theme brief must include the full domain-specific prompt blueprint');
    assert.ok(Object.keys(audit.familyCounts).length >= 15, 'The catalogue should use a broad set of distinct creative domains');

    const sampleOutput = [];
    for (const [domainId, sample] of Object.entries(audit.samples)) {
      await page.locator('#svgAiTheme').selectOption({ label: sample.theme });
      await page.locator('#generateSvgAiPromptBtn').click();
      const prompt = await page.locator('#svgAiPrompt').inputValue();
      assert.ok(prompt.includes('Main theme: ' + sample.theme), domainId + ' prompt must retain its selected main theme');
      assert.ok(prompt.includes('Mapped theme domain: ' + sample.label + ' (' + domainId + ')'),
        domainId + ' prompt must include the mapped domain label');
      assert.ok(prompt.includes('Visual category: ' + sample.category), domainId + ' prompt must retain the selected visual category');
      assert.ok(prompt.includes('Specific concept / subtheme: ' + sample.specific), domainId + ' prompt must retain the selected subtheme');
      const visibleBrief = await page.locator('#svgAiThemeBrief').innerText();
      assert.ok(visibleBrief.includes(sample.label), domainId + ' concept preview must show its domain');
      assert.ok(visibleBrief.includes('ASET VISUAL:'), domainId + ' concept preview must show the visual assets');
      assert.ok(visibleBrief.includes('ALUR GERAK:'), domainId + ' concept preview must show the motion sequence');
      assert.ok(prompt.includes('THEME-SPECIFIC CREATIVE BLUEPRINT'),
        domainId + ' prompt must include the theme-specific creative blueprint');
      sampleOutput.push({ domain: domainId, theme: sample.theme, categoryCount: await page.locator('#svgAiCategory option').count(), subthemeCount: await page.locator('#svgAiSpecific option').count() });
    }

    // Guard the original cross-domain bug and confirm distinct, appropriate profiles.
    await page.locator('#svgAiTheme').selectOption({ label: 'Christmas & Holiday' });
    const holidayOptions = await page.locator('#svgAiSpecific option').allTextContents();
    assert.ok(holidayOptions.some(x => /Christmas tree|Gift box|holiday greeting|Winter village/i.test(x)));
    assert.ok(!holidayOptions.some(x => /Employee onboarding|Recruitment and hiring/i.test(x)));

    await page.locator('#svgAiTheme').selectOption({ label: 'Career & Recruitment' });
    const hrOptions = await page.locator('#svgAiSpecific option').allTextContents();
    assert.ok(hrOptions.includes('Employee onboarding journey'));
    assert.ok(!hrOptions.some(x => /Christmas tree ornament|Gift box reveal/i.test(x)));

    assert.deepEqual(pageErrors, [], 'No uncaught page errors are expected');
    console.log(JSON.stringify({
      result: 'PASS',
      catalogueThemesChecked: audit.themeCount,
      creativeDomainsCovered: Object.keys(audit.familyCounts).length,
      minimumCategories: audit.minimumCategories,
      minimumSubthemes: audit.minimumSubthemes,
      familyCounts: audit.familyCounts,
      representativePromptTests: sampleOutput,
      holidayAndPeopleThemesSeparated: true
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
