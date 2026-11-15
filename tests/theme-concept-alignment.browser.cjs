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
    await page.waitForFunction(() => (document.getElementById('svgAiTheme')?.options.length || 0) > 100);

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
