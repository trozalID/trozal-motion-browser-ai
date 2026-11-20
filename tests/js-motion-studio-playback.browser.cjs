const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#trozalJsMotionBtn').click();
    await page.waitForFunction(() => !!window.TROZAL_JS_MOTION?.renderFrame);
    await page.locator('#trozalJsMotionRun').click();
    await page.waitForFunction(() =>
      (document.querySelector('#trozalJsMotionStatus')?.textContent || '').includes('Frame siap')
    );
    // Wait for both the initial iframe load and the explicit Run action to drain before playback.
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().pendingMessages === 0);

    const play = page.locator('#trozalJsMotionPlay');
    const pause = page.locator('#trozalJsMotionPause');
    await play.click();
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().playing === true);
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().time > 0.35);
    await page.waitForFunction(() => {
      const readout = document.querySelector('#trozalJsTimelineReadout')?.textContent || '';
      const [elapsed, total] = readout.split(' / ');
      return Number.parseFloat(elapsed) >= 0.35 && total === '10.00s';
    }, null, { timeout: 5000 });
    assert.match(await page.locator('#trozalJsAiGenerate').textContent(), /Generate Kode JavaScript dengan AI/);
    const firstTime = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState().time);

    // A second click while playing must not start another animation loop.
    await play.click();
    await page.waitForTimeout(250);
    const stateDuringPlayback = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState());
    assert.equal(stateDuringPlayback.playing, true);
    assert.ok(stateDuringPlayback.pendingMessages <= 1,
      'Playback must not queue overlapping iframe render messages');

    await pause.click();
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().playing === false);
    const pausedTime = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState().time);
    await page.waitForTimeout(250);
    const timeAfterPause = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState().time);
    assert.ok(Math.abs(timeAfterPause - pausedTime) < 0.0001,
      'Pause must stop advancing the preview timeline');

    // Resume after pause must create a fresh, responsive playback loop.
    await play.click();
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().playing === true);
    await page.waitForFunction(
      previous => window.TROZAL_JS_MOTION?.getPlaybackState().time > previous + 0.25,
      pausedTime,
      { timeout: 5000 }
    );
    const resumed = await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState());
    assert.equal(resumed.playing, true);
    assert.ok(resumed.pendingMessages <= 1);
    await pause.click();
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().playing === false);
    assert.deepEqual(errors, [], 'Playback must not raise uncaught browser errors');
    console.log('JavaScript Studio playback passed: play, duplicate-click guard, pause, resume, and single-flight frame rendering.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
