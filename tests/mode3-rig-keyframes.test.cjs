const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('trozal-image-to-code-video.js', 'utf8');
assert.match(source, /MODE 3 · PER-PART KEYFRAME TIMELINE/, 'Mode 3 must expose a visible per-part keyframe timeline');
assert.match(source, /itcvRigTimelineTime/, 'Timeline must expose an editable playhead');
assert.match(source, /Add keyframe|＋ Add keyframe/, 'Each rig part must allow adding a keyframe');
assert.match(source, /part\.keyframes\.sort\(\(a,b\)=>a\.time-b\.time\)/, 'Keyframes must be kept in chronological order');
assert.match(source, /function sampleRigKeyframe\(keyframes,time,duration\)/, 'Runtime must interpolate per-part keyframes');
assert.match(source, /Number\(keyframe\.rotation\)/, 'Runtime must apply keyframed rotation');
assert.match(source, /Number\(keyframe\.x\)/, 'Runtime must apply keyframed horizontal offset');
assert.match(source, /Number\(keyframe\.y\)/, 'Runtime must apply keyframed vertical offset');
new Function(source);
console.log('Mode 3 per-part keyframe timeline static regression checks passed.');
