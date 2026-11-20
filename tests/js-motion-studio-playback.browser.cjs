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

    // The manual prompt is a separate panel and must not be coupled to the Theme Studio.
    assert.equal(await page.locator('#trozalJsAiComposer #trozalJsManualPromptPanel').count(), 0,
      'Manual prompt must be a standalone panel outside Theme Studio');
    assert.equal(await page.locator('#trozalJsManualPromptPanel').count(), 1);
    const frameBeforeManualGenerate = await page.evaluate(() => window.TROZAL_JS_MOTION.getLastFrame());
    const manualText = 'Buat animasi produk futuristik dengan cincin cahaya dan teks kinetik.';
    await page.locator('#trozalJsAiPrompt').fill(manualText);
    await page.evaluate(() => {
      window.__manualPromptCalls = [];
      window.trozalBuildThemeCreativeBrief = () => { throw new Error('Manual prompt must not call the theme brief builder'); };
      window.trozalBrowserAI = {
        provider: () => 'Gemini test',
        model: () => 'gemini-3.8-flash',
        generateText: async prompt => {
          window.__manualPromptCalls.push(prompt);
          return JSON.stringify({ concepts: [{ title: 'Manual Prompt Test', description: 'Generated code for editor.', code: "ctx.fillStyle='#ffcc33';ctx.fillRect(20,20,120,80);" }] });
        }
      };
    });
    await page.locator('#trozalJsBuildPrompt').click();
    await page.waitForFunction(() => document.querySelector('#trozalJsMotionCode')?.value.includes('ffcc33'));
    const manualCall = await page.evaluate(() => window.__manualPromptCalls?.[0] || '');
    assert.ok(manualCall.includes(manualText), 'Standalone prompt must be sent to the AI provider');
    assert.doesNotMatch(manualCall, /MAIN THEME:|THEME-SPECIFIC CREATIVE BLUEPRINT|VISUAL CATEGORY:/,
      'Standalone prompt must not contain automatic theme instructions');
    assert.match(await page.locator('#trozalJsManualStatus').innerText(), /Kode JavaScript berhasil dibuat/i);
    assert.match(await page.locator('#trozalJsMotionStatus').innerText(), /belum diterapkan ke preview/i);
    assert.equal(await page.evaluate(() => window.TROZAL_JS_MOTION.getLastFrame()), frameBeforeManualGenerate,
      'Generating a manual prompt must not automatically apply code to Preview');

    // The visible Studio timeline must sit directly beneath the Canvas preview and remain reachable in its own scroll area.
    const timelineLayout = await page.evaluate(() => {
      const preview = document.querySelector('#trozalJsMotionPreviewCol');
      const canvas = document.querySelector('#trozalJsMotionCanvasFrame');
      const timeline = document.querySelector('#trozalJsTimelinePreview');
      const controls = [...document.querySelectorAll('#trozalJsMotionControls')].at(-1);
      return {
        overflowY: getComputedStyle(preview).overflowY,
        canvasBeforeTimeline: !!(canvas.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING),
        timelineBeforePlaybackControls: !!(timeline.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING),
        timelineHeight: timeline.getBoundingClientRect().height
      };
    });
    assert.equal(timelineLayout.overflowY, 'auto', 'Preview column must scroll so the timeline is not clipped');
    assert.equal(timelineLayout.canvasBeforeTimeline, true, 'Professional-style timeline must be directly after the Canvas preview');
    assert.equal(timelineLayout.timelineBeforePlaybackControls, true, 'Timeline must appear before secondary playback controls');
    assert.ok(timelineLayout.timelineHeight > 60, 'Timeline must have a visible rendered height');

    // The visible Studio timeline mirrors Professional Mode and offers frame stepping.
    assert.equal(await page.locator('#trozalJsTimelinePreview').count(), 1);
    assert.match(await page.locator('#trozalJsTimelinePreview').innerText(), /Timeline & Preview/);
    assert.match(await page.locator('#trozalJsTimelineResolution').innerText(), /3840×2160|1280×720/);
    assert.equal(await page.locator('#trozalJsTimelineFpsInfo').innerText(), '30');
    assert.equal(await page.locator('#trozalJsTimelineFramesInfo').innerText(), '240');
    await page.locator('#trozalJsTimelineNextFrame').click();
    await page.waitForFunction(() => Number(document.querySelector('#trozalJsMotionTime')?.value) > 0);
    const oneFrame = await page.locator('#trozalJsMotionTime').inputValue();
    assert.ok(Math.abs(Number(oneFrame) - 1 / 30) < 0.001, 'Next Frame must move exactly one selected FPS frame');
    await page.locator('#trozalJsTimelinePrevFrame').click();
    await page.waitForFunction(() => Number(document.querySelector('#trozalJsMotionTime')?.value) === 0);
    await page.locator('#trozalJsTimelineCalibrate').click();
    await page.waitForFunction(() => document.querySelector('#trozalJsTimelineCalibrationState')?.textContent === 'Terkalibrasi');
    await page.locator('#trozalJsTimelineStop').click();
    await page.waitForFunction(() => Number(document.querySelector('#trozalJsMotionTime')?.value) === 0);

    await page.waitForFunction(() => !!document.querySelector('#trozalJsTimelineReadout'));
    const play = page.locator('#trozalJsTimelinePlay');
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

    // Clicking the dedicated Play action again while already playing must not start a duplicate loop.
    // The Professional-style toolbar button is a Play/Pause toggle, so use the dedicated Play action for this guard.
    await page.locator('#trozalJsMotionPlay').click();
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

    // Loop is a first-class timeline control: playback must wrap to zero and keep running.
    await page.locator('#trozalJsMotionDuration').fill('1');
    await page.locator('#trozalJsMotionDuration').dispatchEvent('change');
    assert.equal(await page.locator('#trozalJsTimelinePreview #trozalJsPlaybackLoop').count(), 1,
      'Loop toggle must be visible directly inside Timeline & Preview');
    assert.equal(await page.locator('#trozalJsMotionControls #trozalJsPlaybackLoop').count(), 0,
      'Loop toggle must no longer be hidden among secondary playback controls');
    await page.locator('#trozalJsPlaybackLoop').check();
    await play.click();
    await page.waitForFunction(() => document.querySelector('#trozalJsLoopCycleReadout')?.textContent === 'Siklus 1', null, { timeout: 5000 });
    const firstLoop = await page.evaluate(() => ({
      state: window.TROZAL_JS_MOTION?.getPlaybackState(),
      time: Number(document.querySelector('#trozalJsMotionTime')?.value),
      scrub: Number(document.querySelector('#trozalJsTimelineScrub')?.value),
      clock: document.querySelector('#trozalJsPlaybackReadout')?.textContent,
      fill: Number.parseFloat(document.querySelector('#trozalJsPlaybackFill')?.style.width || '0')
    }));
    assert.equal(firstLoop.state?.playing, true, 'Playback must remain active after the first loop boundary');
    assert.ok(firstLoop.time >= 0 && firstLoop.time < 1, 'Playhead must return to the start of the timeline after one cycle: ' + JSON.stringify(firstLoop));
    assert.ok(firstLoop.scrub < 1 && firstLoop.fill < 100, 'Visible timeline progress must wrap with the playback clock');
    assert.ok(String(firstLoop.clock || '').startsWith('0.'), 'Timeline time display must visibly return close to 0 seconds: ' + JSON.stringify(firstLoop));
    assert.ok(String(firstLoop.clock || '').includes('/ 1.00s'), 'Loop clock must retain the selected duration');
    await page.waitForFunction(() => document.querySelector('#trozalJsLoopCycleReadout')?.textContent === 'Siklus 2', null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.TROZAL_JS_MOTION.getPlaybackState().playing), true,
      'Timeline must keep playing through multiple loop cycles');
    await pause.click();
    await page.waitForFunction(() => window.TROZAL_JS_MOTION?.getPlaybackState().playing === false);
    await page.locator('#trozalJsTimelineStop').click();
    assert.equal(await page.locator('#trozalJsLoopCycleReadout').innerText(), 'Siklus 0',
      'Stop should reset the loop cycle counter to zero');
    assert.deepEqual(errors, [], 'Playback must not raise uncaught browser errors');
    console.log('JavaScript Studio playback passed: play, pause, resume, continuous timeline loop, multi-cycle wrap, and single-flight frame rendering.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
