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
    await page.waitForFunction(() => {
      const options = [...(document.getElementById('svgAiTheme')?.options || [])].map(o => o.textContent.trim());
      return options.includes('Christmas & Holiday') && options.includes('Career & Recruitment');
    }, undefined, { timeout: 12000 }).catch(async error => {
      const snapshot = await page.evaluate(() => ({
        readyState: document.readyState,
        themes: [...(document.getElementById('svgAiTheme')?.options || [])].map(o => o.textContent.trim()).slice(0, 25),
        globalThemeCount: Array.isArray(window.TROZAL_AI_THEMES) ? window.TROZAL_AI_THEMES.length : null,
        briefHelper: typeof window.trozalBuildThemeCreativeBrief,
        applyThemeHint: document.getElementById('svgAiThemeSearchHint')?.textContent || ''
      }));
      throw new Error(error.message + ' | themeInitSnapshot=' + JSON.stringify(snapshot));
    });

    await page.locator('#svgAiTheme').selectOption({ label: 'Christmas & Holiday' });
    await page.waitForFunction(() => {
      const categories = [...(document.getElementById('svgAiCategory')?.options || [])].map(o => o.textContent);
      const specifics = [...(document.getElementById('svgAiSpecific')?.options || [])].map(o => o.textContent);
      return categories.includes('Festive Editorial Design') &&
        specifics.includes('Christmas tree ornament assembly') &&
        !specifics.includes('Employee onboarding journey');
    });

    const holidayCategoryOptions = await page.locator('#svgAiCategory option').allTextContents();
    const holidaySpecificOptions = await page.locator('#svgAiSpecific option').allTextContents();
    assert.ok(holidayCategoryOptions.includes('Cinematic Winter Lighting'));
    assert.ok(holidaySpecificOptions.includes('Gift box reveal with ribbon and warm lights'));
    assert.ok(!holidaySpecificOptions.includes('Employee onboarding journey'),
      'Christmas must never inherit an HR/onboarding subtheme');

    await page.locator('#svgAiCategory').selectOption({ label: 'Paper Cutout Holiday Illustration' });
    await page.locator('#svgAiSpecific').selectOption({ label: 'Gift box reveal with ribbon and warm lights' });
    const holidayBrief = await page.locator('#svgAiThemeBrief').innerText();
    assert.match(holidayBrief, /Christmas|holiday/i);
    assert.match(holidayBrief, /Gift box/i);

    await page.locator('#generateSvgAiPromptBtn').click();
    const holidayPrompt = await page.locator('#svgAiPrompt').inputValue();
    assert.match(holidayPrompt, /Main theme: Christmas & Holiday/);
    assert.match(holidayPrompt, /Specific concept \/ subtheme: Gift box reveal with ribbon and warm lights/);
    assert.match(holidayPrompt, /THEME-SPECIFIC CREATIVE BLUEPRINT/);
    assert.match(holidayPrompt, /evergreen|snowfall|Christmas/i);
    assert.match(holidayPrompt, /Paper Cutout Holiday Illustration/);
    assert.match(holidayPrompt, /cardstock|cut edges/i);
    assert.match(holidayPrompt, /Never introduce employee onboarding/i);

    await page.locator('#svgAiTheme').selectOption({ label: 'Career & Recruitment' });
    await page.waitForFunction(() =>
      [...(document.getElementById('svgAiSpecific')?.options || [])].some(o => o.textContent === 'Employee onboarding journey')
    );
    const hrSpecifics = await page.locator('#svgAiSpecific option').allTextContents();
    assert.ok(hrSpecifics.includes('Employee onboarding journey'));
    assert.ok(!hrSpecifics.includes('Christmas tree ornament assembly'),
      'Career/Recruitment must not inherit Christmas subthemes');

    await page.locator('#svgAiSpecific').selectOption({ label: 'Employee onboarding journey' });
    await page.locator('#generateSvgAiPromptBtn').click();
    const hrPrompt = await page.locator('#svgAiPrompt').inputValue();
    assert.match(hrPrompt, /Main theme: Career & Recruitment/);
    assert.match(hrPrompt, /employee onboarding journey/i);
    assert.match(hrPrompt, /account\/access setup|account access/i);
    assert.match(hrPrompt, /buddy support|team introduction/i);
    assert.match(hrPrompt, /Do not use Christmas ornaments/i);

    // Priority-domain regressions: prevent broad keywords from selecting unrelated visual profiles.
    const priorityCases = [
      { theme: 'Ramadan', category: 'Islamic Geometric Editorial', specific: 'Ramadan crescent and lantern greeting reveal', domain: 'Holiday & Celebration' },
      { theme: 'Ocean Conservation', category: 'Nature Documentary', specific: 'Ocean current and marine habitat layers', domain: 'Nature & Environment' },
      { theme: 'SaaS Product Launch', category: 'SaaS Product Motion', specific: 'SaaS dashboard feature walkthrough', domain: 'Technology, AI & Software' },
      { theme: 'Cybersecurity', category: 'Cybersecurity Command Center', specific: 'Network perimeter and firewall defense animation', domain: 'Technology, AI & Software' }
    ];
    for (const item of priorityCases) {
      await page.locator('#svgAiTheme').evaluate((select, value) => {
        let option = [...select.options].find(o => o.value === value);
        if (!option) {
          option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        }
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, item.theme);
      const categories = await page.locator('#svgAiCategory option').allTextContents();
      const specifics = await page.locator('#svgAiSpecific option').allTextContents();
      assert.ok(categories.includes(item.category), item.theme + ' must use its dedicated visual profile');
      assert.ok(specifics.includes(item.specific), item.theme + ' must use its dedicated subthemes');
      assert.equal(await page.evaluate(theme => window.trozalGetThemeDomainProfile(theme)?.label, item.theme), item.domain);
      await page.locator('#generateSvgAiPromptBtn').click();
      const prompt = await page.locator('#svgAiPrompt').inputValue();
      assert.ok(prompt.includes('Main theme: ' + item.theme), item.theme + ' must remain the main prompt subject');
      assert.ok(prompt.includes('Visual category: ' + item.category));
      assert.ok(prompt.includes('Specific concept / subtheme: ' + item.specific));
      assert.ok(prompt.includes('Mapped theme domain: ' + item.domain));
    }

    // Detail Tambahan is additive, and changing visual category must not replace the main theme.
    const additionalDetail = 'Electric cyan palette, fine data particles, TROZAL logo as the final frame, and no red background.';
    await page.locator('#svgAiTheme').evaluate((select, value) => {
      let option = [...select.options].find(o => o.value === value);
      if (!option) {
        option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      }
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, 'Technology & Artificial Intelligence');
    await page.locator('#svgAiDetails').fill(additionalDetail);
    await page.locator('#svgAiCategory').selectOption({ index: 1 });
    const selectedTheme = await page.locator('#svgAiTheme').inputValue();
    const selectedCategory = await page.locator('#svgAiCategory').inputValue();
    const autoSpec = await page.locator('#svgAiAutoSpec').innerText();
    assert.equal(selectedTheme, 'Technology & Artificial Intelligence',
      'Changing the visual category must never replace the main theme');
    assert.ok(autoSpec.includes(additionalDetail), 'Auto spec must retain the complete user detail');
    assert.match(autoSpec, /ATURAN PENGGABUNGAN/);
    assert.match(autoSpec, /Detail tambahan adalah batasan atau penekanan tambahan/);
    await page.locator('#generateSvgAiPromptBtn').click();
    const additivePrompt = await page.locator('#svgAiPrompt').inputValue();
    assert.match(additivePrompt, /Main theme: Technology & Artificial Intelligence/);
    assert.ok(additivePrompt.includes('Visual category: ' + selectedCategory));
    assert.ok(additivePrompt.includes(additionalDetail));
    assert.match(additivePrompt, /USER DETAIL INTEGRATION RULE/);
    assert.match(additivePrompt, /Additional art direction is additive/);

    // Transparent icons must inherit the selected main theme without replacing it.
    await page.locator('#svgAiTheme').selectOption({ label: 'Space & Astronomy' });
    await page.locator('#svgAiTransparentIconStyle').selectOption('Glassmorphism translucent');
    await page.locator('#svgAiTransparentIconOpacity').evaluate(el => { el.value = '28'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#svgAiTransparentIconPlacement').selectOption({ label: 'Aksen latar di belakang subjek utama' });
    const spaceIconHint = await page.locator('#svgAiTransparentIconHint').innerText();
    const spaceAutoSpec = await page.locator('#svgAiAutoSpec').innerText();
    assert.match(spaceIconHint, /Space & Astronomy/);
    assert.match(spaceIconHint, /Space & Astronomy/);
    assert.match(spaceIconHint, /28%/);
    assert.match(spaceAutoSpec, /SPESIFIKASI ICON TRANSPARAN/);
    await page.locator('#generateSvgAiPromptBtn').click();
    const spaceIconPrompt = await page.locator('#svgAiPrompt').inputValue();
    assert.match(spaceIconPrompt, /Main theme: Space & Astronomy/);
    assert.match(spaceIconPrompt, /THEME-LINKED TRANSPARENT ICON SYSTEM/);
    assert.match(spaceIconPrompt, /Glassmorphism translucent/);
    assert.match(spaceIconPrompt, /theme-linked subject: Space & Astronomy/);
    assert.match(spaceIconPrompt, /opacity 28%/);
    await page.locator('#svgAiTheme').selectOption({ label: 'Cybersecurity' });
    const cyberIconHint = await page.locator('#svgAiTransparentIconHint').innerText();
    assert.match(cyberIconHint, /Cybersecurity/);
    assert.equal(await page.locator('#svgAiTransparentIconStyle').inputValue(), 'Glassmorphism translucent',
      'Changing the main theme must preserve the selected transparent icon treatment');
    assert.equal(await page.locator('#svgAiTheme').inputValue(), 'Cybersecurity',
      'Transparent icon settings must never replace the main theme');

    assert.deepEqual(errors, [], 'Theme selection and prompt generation must not throw browser errors');
    console.log(JSON.stringify({
      result: 'PASS',
      holidayCategoryOptions: holidayCategoryOptions.length,
      holidaySubthemes: holidaySpecificOptions.length,
      christmasAndHrProfilesSeparated: true,
      promptIncludesThemeSpecificVisualAndMotionBrief: true,
      conceptsTested: ['Christmas & Holiday / Gift box reveal', 'Career & Recruitment / Employee onboarding journey']
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
