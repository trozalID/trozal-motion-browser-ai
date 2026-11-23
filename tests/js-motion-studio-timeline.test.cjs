const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js-motion-engine.js', 'utf8');

for (const id of [
  'trozalJsObjectManager','trozalJsObjectSelect','trozalJsObjectAdd',
  'trozalJsObjectDuplicate','trozalJsObjectDelete','trozalJsObjectVisible',
  'trozalJsSceneManager','trozalJsSceneSelect','trozalJsSceneAdd',
  'trozalJsSceneDelete','trozalJsTimeline','trozalJsTimelineScrub',
  'trozalJsKeyAdd','trozalJsKeyRemove','trozalJsKeyTracks'
]) {
  assert.ok(source.includes(id), 'Missing JavaScript Studio control: ' + id);
}

for (const token of [
  'function valueAt(t)', 'getScenes:', 'setScenes:',
  'x:0,y:0,scale:1,rotation:0,opacity:1',
  'Number(a.x)', 'Number(a.y)', 'a.scale', 'a.rotation', 'a.opacity'
]) {
  assert.ok(source.includes(token), 'Missing timeline/keyframe capability: ' + token);
}
assert.ok(source.includes('new Function("ctx","t","w","h","anim",o.code)'),
  'Each Canvas object must receive interpolated anim values');
assert.match(source, /const a=d\.anim\|\|\{\}/,
  'Frame runtime must read interpolated animation values from the message');
assert.ok(source.includes('await item.draw(ctx,d.time,c.width,c.height,a)'),
  'Frame runtime must await asynchronous object drawing and pass interpolated animation values');
assert.ok(source.includes('addEventListener("message",async e=>'),
  'Frame message handler must await asynchronous drawing before capturing PNG data');
assert.ok(source.includes("code.addEventListener('input',()=>{currentScene().code=code.value;currentObject().code=code.value;"),
  'Active object code must persist as the editor changes');
assert.ok(source.includes("calibration.textContent='Belum dikalibrasi'"),
  'Editing JavaScript must invalidate the preview calibration state');

assert.ok(source.includes('gizmo-start'), 'Preview canvas must expose direct transform drag');
assert.ok(source.includes("d.type==='gizmo-drag'"), 'Parent must consume canvas transform drag');
assert.ok(source.includes('dragOverride.x+=Number(d.dx)||0'), 'Canvas drag must update X transform');
assert.ok(source.includes('dragOverride.y+=Number(d.dy)||0'), 'Canvas drag must update Y transform');
assert.ok(source.includes("d.type==='gizmo-end'"), 'Dragging must commit a transform keyframe');
assert.ok(source.includes('const ensureObjects=s=>'), 'Scenes must own independent object layers');
assert.ok(source.includes('getObjects:'), 'Object layers must be exposed through the Studio API');
assert.ok(source.includes("d.objects||[{code:d.code,visible:true}]"), 'Sandbox runtime must compile multiple object layers');
assert.ok(source.includes("$('trozalJsObjectDuplicate').addEventListener('click'"), 'Object duplication control must work');
assert.ok(source.includes("$('trozalJsObjectVisible').addEventListener('change'"), 'Object visibility control must work');

const imageToCodeSource = fs.readFileSync('trozal-image-to-code-video.js', 'utf8');
assert.ok(imageToCodeSource.includes('return Promise.all(ASSETS.map(preloadImage)).then(()=>{'),
  'Image to Code JavaScript must wait for all source and rig assets before drawing');
assert.ok(imageToCodeSource.includes("else{const fallback=imageFor((DATA.images||[])[0])"),
  'Universal Rig must fall back to the original source image when its segmented background is unavailable');
const runtimeStart = imageToCodeSource.indexOf('return `const DATA=${payload};');
const runtimeEnd = imageToCodeSource.indexOf('`;\n}\nfunction makeCssHtml', runtimeStart);
assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart, 'Image to Code runtime template must remain extractable');
const generatedRuntime = imageToCodeSource.slice(runtimeStart + 'return `'.length, runtimeEnd)
  .replace('${payload}', JSON.stringify({images:['data:image/png;base64,AA=='],config:{duration:8},scene:{layers:[]},characterRig:null}));
assert.doesNotThrow(() => new Function('ctx','t','w','h','anim',generatedRuntime),
  'Generated asynchronous Image to Code JavaScript must compile in Canvas Studio');

console.log('JavaScript Studio timeline, scene manager, and canvas transform gizmo and object manager and async Image to Code asset rendering checks passed.');
