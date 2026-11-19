const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js-motion-engine.js', 'utf8');

for (const id of [
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
assert.match(source, /new Function\("ctx","t","w","h","anim",d\.code\)/,
  'Canvas user code must receive interpolated anim values');
assert.match(source, /const a=d\.anim\|\|\{\}/,
  'Frame runtime must read interpolated animation values from the message');
assert.match(source, /draw\(ctx,d\.time,c\.width,c\.height,a\)/,
  'Frame runtime must pass interpolated animation values into user code');
assert.match(source, /code\.addEventListener\('input',\(\)=>\{currentScene\(\)\.code=code\.value\}\)/,
  'Scene code must persist as the editor changes');

assert.ok(source.includes('type:\\\"gizmo-start\\\"'), 'Preview canvas must expose direct transform drag');
assert.ok(source.includes("d.type==='gizmo-drag'"), 'Parent must consume canvas transform drag');
assert.ok(source.includes('dragOverride.x+=Number(d.dx)||0'), 'Canvas drag must update X transform');
assert.ok(source.includes('dragOverride.y+=Number(d.dy)||0'), 'Canvas drag must update Y transform');
assert.ok(source.includes("d.type==='gizmo-end'"), 'Dragging must commit a transform keyframe');
console.log('JavaScript Studio timeline, scene manager, and canvas transform gizmo checks passed.');
