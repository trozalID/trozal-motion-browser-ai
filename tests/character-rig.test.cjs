'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const rig=await import('../js/character-rig.mjs');
  assert.deepEqual(rig.CHARACTER_RIG_MASK_THRESHOLDS,{assetAlpha:0.18,labelAssignment:0.18,backgroundInpaint:0.18,maxPartAssignmentScore:2.2});
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
  assert.equal(rig.isPartAssetPixelIncluded(4,2,0.9,overlapSpec,20,20),false,'Overlap duplication must stay narrow and must not copy distant background pixels.');
  assert.equal(rig.isPartAssetPixelIncluded(4,2,0.1,overlapSpec,20,11),false,'Low-confidence background pixels must never be duplicated into a body layer.');
  const torsoOverlap={shape:'polygon',polygon:[{x:10,y:10},{x:30,y:10},{x:28,y:30},{x:12,y:30}],width:20};
  assert.equal(rig.isPartAssetPixelIncluded(7,0,0.9,torsoOverlap,20,20),true,'Torso interior must remain present even when segmentation assigned a pixel to an overlapping limb.');
  assert.equal(rig.isPartAssetPixelIncluded(7,0,0.9,torsoOverlap,20,35),false,'Torso overlap must not extend far beyond its silhouette.');
  const underlayWidth=20,underlayHeight=20,underlayMaskWidth=10,underlayMaskHeight=10;
  const underlaySource={data:new Uint8ClampedArray(underlayWidth*underlayHeight*4)};
  for(let y=0;y<underlayHeight;y++)for(let x=0;x<underlayWidth;x++){
    const i=(y*underlayWidth+x)*4;
    underlaySource.data[i]=x+y*underlayWidth;underlaySource.data[i+1]=80;underlaySource.data[i+2]=120;underlaySource.data[i+3]=255;
  }
  const underlayLabels=new Int16Array(underlayMaskWidth*underlayMaskHeight);underlayLabels.fill(-1);
  underlayLabels[5*underlayMaskWidth+4]=0;
  underlayLabels[5*underlayMaskWidth+5]=1;
  const underlayMask=new Float32Array(underlayMaskWidth*underlayMaskHeight);underlayMask.fill(0.95);
  const underlayMaskAt=(x,y)=>underlayMask[y*underlayMaskWidth+x];
  const underlayPolygon=[{x:4,y:4},{x:16,y:4},{x:16,y:16},{x:4,y:16}];
  const underlay=rig.buildTorsoUnderlay(underlaySource,underlayLabels,underlayMaskWidth,underlayMaskHeight,underlayWidth,underlayHeight,{polygon:underlayPolygon},underlayMaskAt);
  assert.ok(underlay,'A visible torso seed should produce an underlay');
  assert.equal(underlay.labels[5*underlayMaskWidth+5],0,'A foreground limb pixel inside the torso silhouette must also be included in the static torso underlay');
  assert.equal(underlay.source.data[(10*underlayWidth+10)*4],underlaySource.data[(10*underlayWidth+8)*4],'Occluded torso pixels should be reconstructed from the nearest visible torso patch');
  assert.equal(underlaySource.data[(10*underlayWidth+10)*4],210,'Underlay reconstruction must not mutate the original image used by moving limbs');
  assert.ok(underlay.bounds.maxX>=11&&underlay.bounds.maxY>=11,'Torso underlay bounds must include reconstructed overlap pixels');

  const occlusionW=16,occlusionH=12;
  const occlusionLabels=new Int16Array(occlusionW*occlusionH);occlusionLabels.fill(-1);
  const occlusionMask=new Float32Array(occlusionW*occlusionH);
  for(let x=5;x<=9;x++){occlusionMask[6*occlusionW+x]=.95;occlusionLabels[6*occlusionW+x]=2;}
  occlusionLabels[6*occlusionW+6]=1;
  const occlusionMaskAt=(x,y)=>occlusionMask[y*occlusionW+x];
  const limbUnderlay=rig.buildPartOcclusionUnderlayMap(
    occlusionLabels,occlusionW,occlusionH,occlusionW,occlusionH,
    {shape:'capsule',aPoint:{x:6,y:6},bPoint:{x:10,y:6},radiusPx:2},
    1,occlusionMaskAt,{minX:6,minY:6,maxX:6,maxY:6}
  );
  assert.ok(limbUnderlay&&limbUnderlay.filledPixels>0,'An articulated limb should receive a local underlay for foreground pixels occluding its silhouette.');
  assert.equal(limbUnderlay.sourceMap[6*occlusionW+8],6*occlusionW+6,'Occluded limb pixels must be reconstructed from the nearest visible pixel belonging to the same limb.');
  assert.ok(limbUnderlay.bounds.maxX>=8,'Occlusion reconstruction must expand the limb asset bounds to include repaired pixels.');
  const weakVisibilityLandmarks=landmarks.map(p=>({...p}));
  weakVisibilityLandmarks[25]={x:.44,y:.76,z:0,visibility:.04,presence:.14};
  const weakVisibilitySpecs=rig.buildPosePartSpecs(weakVisibilityLandmarks,100,100);
  assert.ok(weakVisibilitySpecs.some(part=>part.id==='upperLegL'),'A partially occluded joint with usable presence confidence must not cause an entire limb to disappear.');
  const specs=rig.buildPosePartSpecs(landmarks,100,100);

  const skirtMask=new Float32Array(100*100);
  for(let y=58;y<=74;y++)for(let x=36;x<=64;x++)skirtMask[y*100+x]=.98;
  const skirtSpecs=rig.buildPosePartSpecs(landmarks,100,100,skirtMask,100,100);
  const skirt=skirtSpecs.find(part=>part.id==='lowerGarment');
  assert.ok(skirt,'A connected lower garment must be identified as one shared layer rather than split between the legs.');
  assert.equal(skirt.motion,'static','A skirt should remain a unified garment layer while the legs move underneath it.');
  assert.equal(skirt.parent,'torso','The skirt must follow the torso/pelvis as one coherent garment.');
  assert.equal(skirt.motion,'swing','The skirt must have its own subtle hip-driven motion instead of remaining frozen.');
  assert.ok(skirt.amp>0&&skirt.speed>0,'Skirt animation must have non-zero amplitude and speed.');
  assert.equal(skirt.renderOrder,20,'The skirt should be painted above thighs but below front-facing arms.');
  assert.equal(skirtSpecs.find(part=>part.id==='upperLegL').renderOrder,10,'Thighs must render behind the skirt.');
  assert.equal(skirtSpecs.find(part=>part.id==='upperArmL').renderOrder,30,'Arms must render in front of the skirt.');
  assert.equal(skirtSpecs.find(part=>part.id==='head').renderOrder,40,'The head must render above torso clothing and limbs.');
  assert.ok(skirtSpecs.indexOf(skirt)>skirtSpecs.findIndex(part=>part.id==='upperLegR'),'The unified skirt layer must be composited above both moving thighs.');
  const skirtAssigned=rig.assignPosePartLabels(skirtMask,100,100,landmarks,100,100);
  const skirtIndex=skirtAssigned.specs.findIndex(part=>part.id==='lowerGarment');
  assert.ok(skirtIndex>=0,'Connected skirt geometry must be present in the segmentation specs.');
  assert.equal(skirtAssigned.labels[66*100+50],skirtIndex,'The center of the skirt must stay assigned to the unified garment layer.');
  assert.equal(rig.isPartAssetPixelIncluded(7,skirtIndex,.98,skirt,50,66),false,'The static skirt layer must not duplicate foreground pixels already owned by an articulated hand or arm.');
  const handsOnSkirt=landmarks.map(p=>({...p}));
  const setHandsOnSkirt=(id,x,y)=>{handsOnSkirt[id]={x,y,z:0,visibility:1,presence:1};};
  setHandsOnSkirt(13,.45,.52);setHandsOnSkirt(15,.48,.62);setHandsOnSkirt(19,.49,.64);
  setHandsOnSkirt(14,.55,.52);setHandsOnSkirt(16,.52,.62);setHandsOnSkirt(20,.51,.64);
  const handsOnSkirtAssigned=rig.assignPosePartLabels(skirtMask,100,100,handsOnSkirt,100,100);
  const handPixelLabel=handsOnSkirtAssigned.labels[63*100+50];
  assert.ok(handPixelLabel>=0&&handsOnSkirtAssigned.specs[handPixelLabel].id!=='lowerGarment','Hands placed in front of a skirt must remain assigned to articulated hand/arm layers.');
  const pantsMask=new Float32Array(100*100);
  for(let y=58;y<=74;y++){for(let x=38;x<=46;x++)pantsMask[y*100+x]=.98;for(let x=54;x<=62;x++)pantsMask[y*100+x]=.98;}
  assert.equal(rig.detectLowerGarmentRegion(pantsMask,100,100,landmarks,100,100),null,'Separated trouser legs with an open center gap must not be incorrectly fused into a skirt layer.');
  const aLineMask=new Float32Array(100*100);
  for(let y=58;y<=74;y++){
    const halfWidth=Math.round(7+(y-58)*0.75);
    for(let x=50-halfWidth;x<=50+halfWidth;x++)aLineMask[y*100+x]=.98;
  }
  const aLine=rig.detectLowerGarmentRegion(aLineMask,100,100,landmarks,100,100);
  assert.ok(aLine,'A connected A-line skirt should be detected from its full scanline profile.');
  const leftContour=aLine.polygon.slice(0,25);
  assert.ok(leftContour[leftContour.length-1].x<leftContour[0].x,'The garment polygon must preserve a widening hem instead of flattening the skirt into a narrow trapezoid.');
  const byId=Object.fromEntries(specs.map(p=>[p.id,p]));
  for(const id of ['head','torso','upperArmL','forearmL','handL','upperArmR','forearmR','handR','upperLegL','lowerLegL','footL','upperLegR','lowerLegR','footR']){
    assert.ok(byId[id], 'Missing body part spec: '+id);
    assert.ok(Number.isFinite(byId[id].pivot.x)&&Number.isFinite(byId[id].pivot.y),'Part pivot must be finite: '+id);
  }
  assert.equal(byId.forearmL.parent,'upperArmL');
  assert.equal(byId.handL.parent,'forearmL');
  assert.equal(byId.handL.motion,'swing');
  assert.equal(byId.handR.motion,'swing');
  assert.ok(byId.handL.radiusPx>20*0.09&&byId.handR.radiusPx>20*0.09,'Hand capsules must cover the palm using wrist, index, pinky and thumb landmarks.');
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
  const componentLabelsLarge=new Int16Array(50*50);componentLabelsLarge.fill(-1);
  for(let y=2;y<22;y++)for(let x=2;x<22;x++)componentLabelsLarge[y*50+x]=0;
  for(let y=2;y<6;y++)for(let x=30;x<33;x++)componentLabelsLarge[y*50+x]=0;
  rig.keepMeaningfulPartComponents(componentLabelsLarge,50,50,1);
  assert.equal(componentLabelsLarge[3*50+31],0,'Meaningful secondary limb/clothing regions must survive component cleanup even when smaller than the main silhouette.');

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
  const farForeground=new Float32Array(100*100);
  for(let y=40;y<45;y++)for(let x=15;x<20;x++)farForeground[y*100+x]=0.20;
  const farAssigned=rig.assignPosePartLabels(farForeground,100,100,landmarks,100,100);
  assert.ok(farAssigned.labels[42*100+17]>0,'Foreground pixels outside the torso and beyond the normal part radius must still be assigned to the nearest articulated body part.');
  assert.equal(rig.CHARACTER_RIG_MASK_THRESHOLDS.labelAssignment,rig.CHARACTER_RIG_MASK_THRESHOLDS.backgroundInpaint,'Every pixel removed from the background must be eligible for part-layer assignment.');

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

  const invalidLabels=new Int16Array(4);invalidLabels.fill(7);
  rig.keepMeaningfulPartComponents(invalidLabels,2,2,1);
  assert.deepEqual(Array.from(invalidLabels),[-1,-1,-1,-1],'Out-of-range segmentation labels must be discarded instead of indexing a missing part bounds object.');

  const moduleSource=fs.readFileSync(path.join(__dirname,'../js/character-rig.mjs'),'utf8');
  const directorSource=fs.readFileSync(path.join(__dirname,'../trozal-image-to-code-video.js'),'utf8');
  assert.match(moduleSource,/Array\.isArray\(bounds\) \? bounds\[partIndex\] : bounds/,'A single explicit bounds object and per-part bounds arrays must both be supported.');
  assert.match(moduleSource,/!box \|\| !Number\.isFinite\(box\.maxX\)/,'Missing or invalid part bounds must be rejected safely.');
  assert.match(moduleSource,/buildPartOcclusionUnderlayMap/,'Moving limbs must reconstruct pixels hidden behind overlapping foreground parts.');
  assert.match(moduleSource,/const featherStart = Math\.max\(0, CHARACTER_RIG_MASK_THRESHOLDS\.assetAlpha - 0\.045\)/,'The subject alpha feather must not discard pixels already removed from the background.');
  assert.match(moduleSource,/outputSegmentationMasks:\s*true/);
  assert.match(moduleSource,/getAsFloat32Array\(\)/);
  assert.match(moduleSource,/canvas\.toDataURL\("image\/png"\)/);
  assert.match(directorSource,/itcvAutoRig/);
  assert.match(directorSource,/itcvRigParts/);
  assert.match(directorSource,/function drawRig\(t,w,h\)/);
  assert.match(directorSource,/children\[k\]\.sort\(\(a,b\)=>\(Number\(a\.renderOrder\)\|\|0\)-\(Number\(b\.renderOrder\)\|\|0\)\)/,'Runtime renderer must respect anatomical depth order so skirts cannot cover foreground hands.');
  assert.match(moduleSource,/renderOrder: Number\.isFinite\(Number\(spec\.renderOrder\)\) \? Number\(spec\.renderOrder\) : 0/,'Exported rig layers must retain their render order metadata.');
  assert.match(directorSource,/characterRigEmbedded:!!DATA\.characterRig/);
  assert.match(directorSource,/createCharacterRig\(uris\[0\]/);

  console.log('PASS: pose body-part geometry, parent rig hierarchy, segmentation assignments and self-contained export wiring');
})().catch(error=>{console.error(error);process.exit(1);});
