'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const rig=await import('../js/character-rig.mjs');
  assert.deepEqual(rig.CHARACTER_RIG_MASK_THRESHOLDS,{assetAlpha:0.18,labelAssignment:0.26,backgroundInpaint:0.18,maxPartAssignmentScore:2.2});
  assert.equal(rig.CHARACTER_RIG_MASK_THRESHOLDS.maxPartAssignmentScore,2.2,'Part assignment must include a wider garment/silhouette envelope so valid foreground pixels are not left behind.');
  assert.equal(rig.shouldInpaintMaskPixel(0.20),true,'Faint subject-edge pixels used by part alpha must also be removed from the background');
  assert.equal(rig.shouldInpaintMaskPixel(0.18),true,'Pixels at the part alpha threshold must be inpainted');
  assert.equal(rig.shouldInpaintMaskPixel(0.17),false,'Pixels below the part alpha threshold must remain background');
  const landmarks=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1,presence:1}));
  const set=(id,x,y)=>{landmarks[id]={x,y,z:0,visibility:1,presence:1};};
  set(0,.50,.19);set(7,.45,.20);set(8,.55,.20);
  set(11,.40,.32);set(12,.60,.32);
  set(13,.30,.43);set(15,.25,.53);set(19,.23,.55);
  set(14,.70,.43);set(16,.75,.53);set(20,.77,.55);
  set(23,.45,.58);set(24,.55,.58);
  set(25,.44,.76);set(27,.43,.92);set(31,.40,.94);
  set(26,.56,.76);set(28,.57,.92);set(32,.60,.94);

  const overlapSpec={shape:'capsule',aPoint:{x:10,y:10},bPoint:{x:30,y:10},radiusPx:5};
  assert.equal(rig.isPartAssetPixelIncluded(4,2,0.9,overlapSpec,20,15),true,'Foreground pixels just outside a limb label must be duplicated into its layer to prevent holes when another part moves over it.');
  assert.equal(rig.isPartAssetPixelIncluded(4,2,0.9,overlapSpec,20,18),false,'Overlap duplication must stay narrow and must not copy distant background pixels.');
  assert.equal(rig.isPartAssetPixelIncluded(4,2,0.1,overlapSpec,20,11),false,'Low-confidence background pixels must never be duplicated into a body layer.');
  const torsoOverlap={shape:'polygon',polygon:[{x:10,y:10},{x:30,y:10},{x:28,y:30},{x:12,y:30}],width:20};
  assert.equal(rig.isPartAssetPixelIncluded(7,0,0.9,torsoOverlap,20,20),true,'Torso interior must remain present even when segmentation assigned a pixel to an overlapping limb.');
  assert.equal(rig.isPartAssetPixelIncluded(7,0,0.9,torsoOverlap,20,32),false,'Torso overlap must not extend far beyond its silhouette.');
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
  for(const id of ['torso','head','upperArmL','forearmL','upperLegL','lowerLegL']){assert.ok(byId[id].jointOverlap>=5,'Joint overlap must cover shared pixels for '+id);}
  assert.ok(byId.upperArmL.jointOverlap>=byId.upperArmL.radiusPx*.5,'Limb joints need enough overlap to avoid visible gaps');

  const componentLabels=new Int16Array(300);componentLabels.fill(-1);
  for(let y=1;y<6;y++)for(let x=1;x<6;x++)componentLabels[y*30+x]=0;
  for(let y=1;y<4;y++)for(let x=12;x<15;x++)componentLabels[y*30+x]=0;
  for(let y=1;y<5;y++)for(let x=20;x<24;x++)componentLabels[y*30+x]=0;
  rig.keepMeaningfulPartComponents(componentLabels,30,10,1);
  assert.equal(componentLabels[2*30+2],0,'Largest body component must remain');
  assert.equal(componentLabels[2*30+13],-1,'Small isolated speckles must be removed');
  assert.equal(componentLabels[2*30+21],0,'Meaningful secondary body regions must not be discarded');
  const anchoredLabels=new Int16Array(300);anchoredLabels.fill(-1);
  for(let y=1;y<6;y++)for(let x=1;x<6;x++)anchoredLabels[y*30+x]=0;
  for(let y=1;y<3;y++)for(let x=12;x<14;x++)anchoredLabels[y*30+x]=0;
  for(let y=8;y<10;y++)for(let x=24;x<26;x++)anchoredLabels[y*30+x]=0;
  rig.keepMeaningfulPartComponents(anchoredLabels,30,10,1,[[{x:12.5,y:1.5,radius:2}]]);
  assert.equal(anchoredLabels[1*30+12],0,'Small component touching a detected joint must be retained');
  assert.equal(anchoredLabels[8*30+24],-1,'Small component far from every joint must be rejected');
  const mask=new Float32Array(100*100);mask.fill(1);
  const assigned=rig.assignPosePartLabels(mask,100,100,landmarks,100,100);
  assert.equal(assigned.labels.length,10000);
  const noisyMask=new Float32Array(100*100);
  for(let y=10;y<96;y++)for(let x=20;x<81;x++)noisyMask[y*100+x]=1;
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)noisyMask[y*100+x]=1;
  const cleaned=rig.assignPosePartLabels(noisyMask,100,100,landmarks,100,100);
  assert.equal(cleaned.labels[0],-1,'Detached foreground speckles must be removed without dropping connected clothing/body pixels');
  assert.ok(assigned.labels.some(x=>x===0),'Torso region should have assigned pixels');
  const found=new Set(assigned.labels.filter(x=>x>=0));
  assert.ok(found.size>=10,'Segmentation should assign multiple independent body regions; got '+found.size);
  const lowResolutionMask=new Float32Array(25*25);lowResolutionMask.fill(1);
  const scaled=rig.assignPosePartLabels(lowResolutionMask,25,25,landmarks,100,100);
  assert.ok(scaled.bounds.some(box=>box.minX<box.maxX&&box.minY<box.maxY&&box.minX>=0&&box.maxX<100&&box.maxY<100&&box.maxX>25&&box.maxY>25),'Part crop bounds must be expressed in original-image pixels, not low-resolution mask coordinates.');

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
