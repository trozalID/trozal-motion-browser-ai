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

    await page.waitForFunction(() => !!document.querySelector('#trozalJsTimelineReadout'));
    const play = page.locator('#trozalJsMotionPlay');
    const pause = page.locator('#trozalJsMotionPause');
    await play.click();
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().playing === true);
    await page.waitForTimeout(1000);
    const playbackDebug = await page.evaluate(() => ({
      state: window.TROZAL_JS_MOTION?.getPlaybackState(),
      timeInput: document.querySelector('#trozalJsMotionTime')?.value,
      timeline: document.querySelector('#trozalJsTimelineScrub')?.value,
      readout: document.querySelector('#trozalJsTimelineReadout')?.textContent,
      visibleClock: document.querySelector('#trozalJsPlaybackReadout')?.textContent,
      playheadFill: document.querySelector('#trozalJsPlaybackFill')?.style.width,
      status: document.querySelector('#trozalJsMotionStatus')?.textContent
    }));
    assert.ok(playbackDebug.state?.time > 0.35,
      'Playback clock did not advance: ' + JSON.stringify(playbackDebug));
    assert.match(playbackDebug.visibleClock || '', /[0-9]+\.[0-9]{2}s \/ [0-9]+\.[0-9]{2}s/);
    assert.ok(Number.parseFloat(playbackDebug.playheadFill) > 0, 'Visible playhead progress must advance');
    console.log('Playback diagnostics', JSON.stringify(playbackDebug));
    await page.waitForFunction(() => {
      const readout = document.querySelector('#trozalJsTimelineReadout')?.textContent || '';
      const [elapsed, total] = readout.split('/');
      const elapsedSeconds = Number.parseFloat(elapsed);
      const totalSeconds = Number.parseFloat(total);
      return Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0.35 &&
        Number.isFinite(totalSeconds) && totalSeconds >= 1;
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
