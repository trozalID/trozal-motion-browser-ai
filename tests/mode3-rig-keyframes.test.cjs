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
assert.match(source, /CHARACTER MOTION RECONSTRUCTION · MODE 3/, 'Mode 3 must expose a visible Character Motion Reconstruction panel');
assert.match(source, /itcvReconEnabled/, 'Character reconstruction must be user-toggleable');
assert.match(source, /itcvReconCoupling/, 'Character reconstruction must expose parent-child joint coupling');
assert.match(source, /itcvReconAngle/, 'Character reconstruction must expose a joint rotation limit');
assert.match(source, /cfg\.motionReconstruction/, 'Motion reconstruction settings must be serialized into the generated runtime');
assert.match(source, /jointLimits=\{shoulder:65,elbow:115,wrist:70,hip:55,knee:115,ankle:40/, 'Runtime must apply conservative per-joint anatomical rotation limits');
assert.match(source, /jointCoupling/, 'Runtime must blend child motion with parent motion');
const rigSource = fs.readFileSync('js/universal-object-rig.mjs', 'utf8');
assert.match(rigSource, /export function inferParentJointPivots\(specs, width, height\)/, 'Universal Rig must infer child pivots at parent-facing joints');
assert.match(rigSource, /inferParentJointPivots\(specs, width, height\)/, 'Pivot reconstruction must run before SAM segmentation and layer cropping');
new Function(source);
(async () => {
  const { inferParentJointPivots } = await import('../js/universal-object-rig.mjs');
  const specs = [
    { id: 'torso', parent: null, bbox: { x: .4, y: .3, w: .2, h: .4 }, pivot: null },
    { id: 'left-forearm', parent: 'torso', bbox: { x: .2, y: .32, w: .2, h: .1 }, pivot: null },
    { id: 'hand', parent: 'left-forearm', bbox: { x: .1, y: .32, w: .1, h: .1 }, pivot: { x: .18, y: .37 } }
  ];
  const inferred = inferParentJointPivots(specs, 100, 100);
  assert.equal(inferred, 1, 'Only missing child pivots should be inferred');
  assert.deepEqual(specs[1].pivot, { x: .4, y: .42 }, 'Forearm pivot should be placed at its parent-facing elbow edge');
  assert.deepEqual(specs[2].pivot, { x: .18, y: .37 }, 'Explicit AI/user pivots must be preserved');
  console.log('Mode 3 Character Motion Reconstruction joint-pivot checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
console.log('Mode 3 per-part keyframe timeline static regression checks passed.');
