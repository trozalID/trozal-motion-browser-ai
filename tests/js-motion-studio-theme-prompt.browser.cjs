const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.stack || e.message));
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#trozalJsMotionBtn').click();
    await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.buildPrompt);
    const themeCount = await page.locator('#trozalJsTheme option').count();
    assert.ok(themeCount >= 300, 'Studio must expose the complete Professional Mode theme catalogue');

    await page.locator('#trozalJsTheme').selectOption({ label: 'Christmas & Holiday' });
    const holidayCategories = await page.locator('#trozalJsCategory option').allTextContents();
    const holidaySubthemes = await page.locator('#trozalJsSpecific option').allTextContents();
    assert.ok(holidayCategories.length >= 7);
    assert.ok(holidaySubthemes.length >= 8);
    assert.ok(holidaySubthemes.some(x => /Christmas|holiday|winter|greeting/i.test(x)));
    assert.ok(!holidaySubthemes.some(x => /employee onboarding|recruitment/i.test(x)));

    const holidayTheme = await page.locator('#trozalJsTheme').inputValue();
    await page.locator('#trozalJsCategory').selectOption({ index: 1 });
    assert.equal(await page.locator('#trozalJsTheme').inputValue(), holidayTheme);
    await page.locator('#trozalJsSpecific').selectOption({ index: 0 });
    await page.locator('#trozalJsDetails').fill('Gunakan warna emerald dan gold, objek lentera, headline Selamat Hari Raya, dan latar malam sinematik. Tambahkan cinematic product reveal with layered depth and precise timing.');
    const prompt = await page.evaluate(() => window.TROZAL_JS_MOTION.buildPrompt());
    for (const phrase of [
      'MAIN THEME: Christmas & Holiday','VISUAL CATEGORY:','SPECIFIC CATEGORY / SUBTHEME:',
      'THEME-SPECIFIC CREATIVE BLUEPRINT','Main-theme intent:','Hero subject and action:',
      'Required domain-specific visual vocabulary:','Narrative and motion sequence:',
      'Mapped theme domain:','Domain motion grammar:','ADDITIONAL USER DETAILS',
      'emerald dan gold','cinematic product reveal','Motion choreography:','TARGET VIDEO:'
    ]) assert.ok(prompt.toLowerCase().includes(phrase.toLowerCase()), 'Full prompt must include: ' + phrase);
    assert.equal(await page.locator('#trozalJsAiFullPrompt').inputValue(), prompt);
    assert.ok(prompt.length > 1800);

    await page.locator('#trozalJsTheme').selectOption({ label: 'Career & Recruitment' });
    const hrSubthemes = await page.locator('#trozalJsSpecific option').allTextContents();
    assert.ok(hrSubthemes.some(x => /Employee onboarding journey/i.test(x)));
    assert.ok(!hrSubthemes.some(x => /Christmas tree ornament|gift box reveal/i.test(x)));
    const hrPrompt = await page.evaluate(() => window.TROZAL_JS_MOTION.buildPrompt());
    assert.ok(hrPrompt.includes('MAIN THEME: Career & Recruitment'));
    assert.ok(hrPrompt.includes('emerald dan gold'));

    await page.locator('#trozalJsThemeSearch').fill('Cybersecurity');
    assert.ok(await page.locator('#trozalJsThemeResults button').count() > 0);
    await page.locator('#trozalJsThemeResults button').first().click();
    assert.match(await page.locator('#trozalJsTheme').inputValue(), /Cybersecurity/i);

    assert.deepEqual(errors, []);
    console.log('JavaScript Studio theme/prompt passed: complete catalogue, theme-aligned categories/subthemes, additive details, full prompt generation and search.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
