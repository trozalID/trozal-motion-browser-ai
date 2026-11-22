'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const rig=await import('../js/character-rig.mjs');
  const landmarks=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1,presence:1}));
  const set=(id,x,y)=>{landmarks[id]={x,y,z:0,visibility:1,presence:1};};
  set(0,.50,.19);set(7,.45,.20);set(8,.55,.20);
  set(11,.40,.32);set(12,.60,.32);
  set(13,.30,.43);set(15,.25,.53);set(19,.23,.55);
  set(14,.70,.43);set(16,.75,.53);set(20,.77,.55);
  set(23,.45,.58);set(24,.55,.58);
  set(25,.44,.76);set(27,.43,.92);set(31,.40,.94);
  set(26,.56,.76);set(28,.57,.92);set(32,.60,.94);

  const specs=rig.buildPosePartSpecs(landmarks,100,100);
  const byId=Object.fromEntries(specs.map(p=>[p.id,p]));
  for(const id of ['head','torso','upperArmL','forearmL','handL','upperArmR','forearmR','handR','upperLegL','lowerLegL','footL','upperLegR','lowerLegR','footR']){
    assert.ok(byId[id], 'Missing body part spec: '+id);
    assert.ok(Number.isFinite(byId[id].pivot.x)&&Number.isFinite(byId[id].pivot.y),'Part pivot must be finite: '+id);
  }
  assert.equal(byId.forearmL.parent,'upperArmL');
  assert.equal(byId.handL.parent,'forearmL');
  assert.equal(byId.lowerLegR.parent,'upperLegR');
  assert.equal(byId.footR.parent,'lowerLegR');

  const mask=new Float32Array(100*100);mask.fill(1);
  const assigned=rig.assignPosePartLabels(mask,100,100,landmarks,100,100);
  assert.equal(assigned.labels.length,10000);
  assert.ok(assigned.labels.some(x=>x===0),'Torso region should have assigned pixels');
  const found=new Set(assigned.labels.filter(x=>x>=0));
  assert.ok(found.size>=10,'Segmentation should assign multiple independent body regions; got '+found.size);
  const lowResolutionMask=new Float32Array(25*25);lowResolutionMask.fill(1);
  const scaled=rig.assignPosePartLabels(lowResolutionMask,25,25,landmarks,100,100);
  assert.ok(scaled.bounds.some(box=>box.maxX>25&&box.maxY>25),'Part crop bounds must be expressed in original-image pixels, not low-resolution mask coordinates.');

  const moduleSource=fs.readFileSync(path.join(__dirname,'../js/character-rig.mjs'),'utf8');
  const directorSource=fs.readFileSync(path.join(__dirname,'../trozal-image-to-code-video.js'),'utf8');
  assert.match(moduleSource,/outputSegmentationMasks:\s*true/);
  assert.match(moduleSource,/getAsFloat32Array\(\)/);
  assert.match(moduleSource,/canvas\.toDataURL\("image\/png"\)/);
  assert.match(directorSource,/itcvAutoRig/);
  assert.match(directorSource,/itcvRigParts/);
  assert.match(directorSource,/function drawRig\(t,w,h\)/);
  assert.match(directorSource,/characterRigEmbedded:!!DATA\.characterRig/);
  assert.match(directorSource,/createCharacterRig\(uris\[0\]/);

  console.log('PASS: pose body-part geometry, parent rig hierarchy, segmentation assignments and self-contained export wiring');
})().catch(error=>{console.error(error);process.exit(1);});
