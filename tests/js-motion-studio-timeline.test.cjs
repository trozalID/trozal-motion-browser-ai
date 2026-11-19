const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js-motion-engine.js', 'utf8');
for (const id of ['trozalJsSceneManager','trozalJsSceneSelect','trozalJsSceneAdd','trozalJsSceneDelete','trozalJsTimeline','trozalJsTimelineScrub','trozalJsKeyAdd','trozalJsKeyRemove','trozalJsKeyTracks']) {
  assert.ok(source.includes(id), 'Missing JavaScript Studio control: ' + id);
}
for (const token of ['function valueAt(t)','getScenes:','setScenes:','anim.x','anim.y','anim.scale','anim.rotation','anim.opacity']) {
  assert.ok(source.includes(token), 'Missing timeline/keyframe capability: ' + token);
}
assert.match(source, /new Function\("ctx","t","w","h","anim",d\.code\)/, 'Canvas user code must receive interpolated anim values');
assert.match(source, /draw\(ctx,d\.time,c\.width,c\.height,d\.anim\|\|\{\}\)/, 'Frame runtime must pass interpolated animation values');
assert.match(source, /code\.addEventListener\('input',\(\)=>\{currentScene\(\)\.code=code\.value\}\)/, 'Scene code must persist as the editor changes');
console.log('JavaScript Studio timeline, scene manager, and keyframe wiring checks passed.');
