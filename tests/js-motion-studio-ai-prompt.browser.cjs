const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#trozalJsMotionBtn');
  await page.waitForFunction(() => !!window.TROZAL_JS_MOTION);
  await page.evaluate(() => {
    window.trozalBrowserAI = {
      provider: () => 'Test Provider',
      model: () => 'Test Model',
      generateText: async (prompt, options) => {
        if (!prompt.includes('cinematic product reveal')) throw new Error('User brief was not forwarded');
        if (!options.systemInstruction.includes('Canvas 2D')) throw new Error('Canvas-only system instruction missing');
        return JSON.stringify({ concepts: [
          { title: 'Neon Orbit', description: 'A bright neon orbital reveal.', code: 'ctx.fillStyle="#101827";ctx.fillRect(0,0,w,h);ctx.fillStyle="#37d5ff";ctx.beginPath();ctx.arc(w/2+Math.sin(t)*80,h/2,60,0,Math.PI*2);ctx.fill();' },
          { title: 'Glass Pulse', description: 'A soft glass-like pulse.', code: 'ctx.fillStyle="#101827";ctx.fillRect(0,0,w,h);ctx.globalAlpha=.5+.5*Math.sin(t*2);ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(w/2,h/2,90,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;' }
        ] });
      }
    };
  });
  await page.locator('#trozalJsMotionBtn').click();
  await page.locator('#trozalJsDetails').fill('cinematic product reveal');
  await page.locator('#trozalJsAiGenerate').click();
  await page.waitForFunction(() => document.querySelectorAll('#trozalJsAiConcept option').length === 2);
  assert.equal(await page.locator('#trozalJsAiConcept option').nth(0).textContent(), '1. Neon Orbit');
  assert.equal(await page.locator('#trozalJsAiConcept option').nth(1).textContent(), '2. Glass Pulse');
  await page.locator('#trozalJsAiConcept').selectOption('1');
  assert.match(await page.locator('#trozalJsAiDescription').textContent(), /Glass Pulse/);
  await page.locator('#trozalJsAiApply').click();
  await page.waitForFunction(() => window.TROZAL_JS_MOTION.getCode().includes('globalAlpha=.5'));
  assert.match(await page.evaluate(() => window.TROZAL_JS_MOTION.getCode()), /globalAlpha/);
  await page.waitForFunction(() => /diterapkan/.test(document.querySelector('#trozalJsAiStatus').textContent));
  assert.deepEqual(errors, [], 'Unexpected JavaScript Studio browser errors');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
