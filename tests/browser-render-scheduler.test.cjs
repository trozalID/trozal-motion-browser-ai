'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');

function testRenderSyncPerformanceAdvisor() {
  const required = [
    'renderSyncAdvisorPanel', 'renderSyncFps', 'renderSyncInterval',
    'renderSyncCost', 'renderSyncDropped', 'renderSyncQueue',
    'renderSyncDevice', 'renderSyncStatus', 'renderSyncRecommendations',
    'renderSyncReset', 'renderSyncRunPreflight'
  ];
  for (const id of required) {
    assert.ok(html.includes('id="' + id + '"'), 'Render Sync Advisor must include #' + id);
  }
  assert.match(html, /RENDER SYNC AND PERFORMANCE ADVISOR/);
  assert.match(html, /new PerformanceObserver/);
  assert.match(html, /requestAnimationFrame\(tick\)/);
  assert.match(html, /window\.__trozalRenderAtAdvisorWrapped/);
  assert.match(html, /renderAt avg \/ max/);
}
testRenderSyncPerformanceAdvisor();

function testMultiTrackParityAndResponsiveToolbar() {
  assert.match(html, /class="mt-toolbar-actions mt-group-toolbar"/, 'Group and hierarchy controls must be separated from the primary toolbar');
  const requiredControls = [
    'mtUndo', 'mtRedo', 'mtSnapToggle', 'mtBuildTracks', 'mtAddMarker',
    'mtClearMarkers', 'mtGroupName', 'mtCreateGroup', 'mtRenameGroup',
    'mtHierarchyParent', 'mtSetGroupParent', 'mtClearGroupParent',
    'mtGroupKeyframe', 'mtToggleGroupVisibility', 'mtSelectGroupMembers',
    'mtToggleGroupLock', 'mtSoloGroup', 'mtCollapseGroup',
    'mtCollapseAllGroups', 'mtExpandAllGroups', 'mtDissolveGroup',
    'mtRuler', 'mtTrackList', 'mtMarkerShelf'
  ];
  for (const id of requiredControls) {
    assert.ok(html.includes('id="' + id + '"'), 'Multi-Track control #' + id + ' must exist');
  }
  assert.match(html, /\.mt-group-toolbar\{margin:7px 0/, 'Group toolbar must have dedicated layout styling');
  assert.match(html, /\.mt-track-row\[data-mt-depth="1"\]/, 'Nested group rows must show hierarchy indentation');
  assert.match(html, /@media\(max-width:760px\)[\s\S]*?\.mt-group-toolbar/, 'Group controls must have compact mobile styling');
}
testMultiTrackParityAndResponsiveToolbar();
const schedulerMatch = html.match(/\/\* RENDER SCHEDULER:[\s\S]*?\nasync function draw\(\)/);
assert.ok(schedulerMatch, 'Shared render scheduler block must exist');
const schedulerSource = schedulerMatch[0].replace(/\nasync function draw\(\)$/, '');

class FakeMessageChannel {
  constructor() {
    this.port1 = { onmessage: null };
    this.port2 = {
      postMessage: () => queueMicrotask(() => this.port1.onmessage?.())
    };
  }
}

async function waitFor(predicate, message) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  assert.fail(message);
}

async function testMessageChannelFifoAndSerialExecution() {
  const context = vm.createContext({ MessageChannel: FakeMessageChannel, setTimeout });
  vm.runInContext(schedulerSource + String.fromCharCode(10) + 'globalThis.schedule = trozalScheduleRenderTask;', context);
  const order = [];
  let active = 0;
  let maxActive = 0;
  const task = n => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    order.push(n);
    active--;
  };
  context.schedule(task(1));
  context.schedule(task(2));
  context.schedule(task(3));
  await waitFor(() => order.length === 3, 'MessageChannel queue did not drain all tasks');
  assert.deepEqual(order, [1, 2, 3], 'Queued render tasks must preserve FIFO order');
  assert.equal(maxActive, 1, 'Asynchronous render tasks must not overlap');
}

async function testTimerFallbackFifoAndSerialExecution() {
  const timers = [];
  const context = vm.createContext({
    setTimeout: fn => { timers.push(fn); return timers.length; }
  });
  vm.runInContext(schedulerSource + String.fromCharCode(10) + 'globalThis.schedule = trozalScheduleRenderTask;', context);
  const order = [];
  let active = 0;
  let maxActive = 0;
  const task = n => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await Promise.resolve();
    order.push(n);
    active--;
  };
  context.schedule(task(1));
  context.schedule(task(2));
  context.schedule(task(3));
  while (order.length < 3) {
    const next = timers.shift();
    if (next) next();
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.deepEqual(order, [1, 2, 3], 'Timer fallback must preserve FIFO order');
  assert.equal(maxActive, 1, 'Timer fallback tasks must not overlap');
}

async function testTimerFallbackHandlesRejectedTask() {
  const timers = [];
  const errors = [];
  const context = vm.createContext({
    setTimeout: fn => { timers.push(fn); return timers.length; },
    console: { error: (...args) => errors.push(args) }
  });
  vm.runInContext(schedulerSource + String.fromCharCode(10) + 'globalThis.schedule = trozalScheduleRenderTask;', context);
  const order = [];
  context.schedule(async () => { throw new Error('expected test rejection'); });
  context.schedule(async () => { order.push('continued'); });
  for (let i = 0; i < 10 && order.length === 0; i++) {
    const next = timers.shift();
    if (next) next();
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.deepEqual(order, ['continued'], 'A rejected task must not block later fallback tasks');
  assert.equal(errors.length, 1, 'Rejected fallback task must be reported without an unhandled rejection');
}

function testProgressStopAndExportWiring() {
  const drawStart = html.indexOf('async function drawUnsafe()');
  const drawEnd = html.indexOf('/* RENDER SCHEDULER:', drawStart);
  const drawBody = html.slice(drawStart, drawEnd);
  assert.match(drawBody, /setRenderProgress\(renderPercent/, 'Frame drawing must update render progress');
  assert.match(drawBody, /__TROZAL_RENDER_DIAGNOSTICS===true/, 'Frame cadence diagnostics must be opt-in');
  assert.match(drawBody, /__TROZAL_RENDER_DIAG_STATE/, 'Frame cadence diagnostics must retain interval samples');
  assert.match(drawBody, /rata-rata jeda/, 'Diagnostics must report frame cadence for cursor-still versus cursor-moving comparison');
  assert.match(drawBody, /lastProgressPaintAt[\s\S]*?>=120/, 'Progress must be time-based, not mouse-event-based');
  assert.doesNotMatch(drawBody, /pointermove|mousemove|mouseenter|mouseover/, 'Progress update must not depend on mouse activity');
  assert.ok(html.includes('trozalRenderCancelRequested=true;'), 'Stop handler must set cancellation flag');
  assert.match(html, /async function draw\(\)\{\s*if\(trozalRenderCancelRequested\)return/, 'Queued frame callback must stop after cancellation');
  assert.match(html, /if\(stream\)stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/, 'Stop/finalization must release capture stream tracks');
  assert.match(drawBody, /canvas\.toBlob/, 'PNG sequence must encode each frame as PNG');
  assert.match(drawBody, /frame\+\+;setTimeout\(\(\)=>trozalScheduleRenderTask\(draw\),0\)/, 'PNG frame loop must yield to the browser between frames instead of immediately chaining MessageChannel tasks');
  assert.match(html, /encodeMovWithWasm\(pngZip,totalFrames,fps,w,h,'prores'\)/, 'ProRes export path must remain wired');
}

(async () => {
  await testMessageChannelFifoAndSerialExecution();
  await testTimerFallbackFifoAndSerialExecution();
  await testTimerFallbackHandlesRejectedTask();
  testProgressStopAndExportWiring();
  process.stdout.write('PASS: FIFO, serialized async tasks, timer fallback including rejected tasks, mouse-independent progress wiring, Stop and PNG/ProRes export wiring.\n');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
