'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const rig=await import('../js/character-rig.mjs');
  const rigSource=await fs.promises.readFile(path.join(__dirname,'../js/character-rig.mjs'),'utf8');
  assert.ok(rigSource.includes('underlayMap = null, jointSeamStrength = 0.85'),
    'createPartAsset must receive jointSeamStrength as a scoped parameter with a safe default.');
  assert.ok(rigSource.includes('partUnderlay ? partUnderlay.sourceMap : null,\n        jointSeamStrength\n      );'),
    'createCharacterRig must pass the configured joint seam strength into every part asset.');

  const ui=await fs.promises.readFile(path.join(__dirname,'../trozal-image-to-code-video.js'),'utf8');

  assert.ok(rigSource.includes('const maskPreview = maskReviewCanvas.toDataURL("image/png");') && rigSource.includes('background: background.toDataURL("image/png"), maskPreview,'), 'Character Rig must return a reviewable overlay of assigned and unassigned foreground masks.');
  assert.ok(ui.includes('itcvRigMaskReviewImage'), 'Mode 3 must display the mask review overlay before editing or export.');
  assert.deepEqual(rig.CHARACTER_RIG_MASK_THRESHOLDS,{assetAlpha:0.12,labelAssignment:0.12,backgroundInpaint:0.12,maxPartAssignmentScore:2.2});
  assert.equal(rig.CHARACTER_RIG_MASK_THRESHOLDS.maxPartAssignmentScore,2.2,'Part assignment must include a wider garment/silhouette envelope so valid foreground pixels are not left behind.');
  assert.equal(rig.shouldInpaintMaskPixel(0.20),true,'Faint subject-edge pixels used by part alpha must also be removed from the background');
  assert.equal(rig.shouldInpaintMaskPixel(0.18),true,'Pixels at the part alpha threshold must be inpainted');
  assert.equal(rig.shouldInpaintMaskPixel(0.11),false,'Pixels below the part alpha threshold must remain background');

  const diagnosticMask=new Float32Array(49);
  const diagnosticLabels=new Int16Array(49);diagnosticLabels.fill(-1);
  const put=(x,y,label,confidence=.92)=>{const index=y*7+x;diagnosticLabels[index]=label;diagnosticMask[index]=confidence;};
  for(const [x,y] of [[1,1],[2,1],[1,2],[2,2]])put(x,y,0);
  put(3,0,1,.78);
  for(const [x,y] of [[4,0],[5,0],[4,1],[5,1],[4,2],[5,2],[0,6],[1,6],[2,6],[3,6]])put(x,y,2,.88);
  diagnosticMask[0]=.9; // Foreground confidence that was correctly rejected by pose assignment.
  const diagnosticMaskSnapshot=new Float32Array(diagnosticMask);
  const diagnosticLabelsSnapshot=new Int16Array(diagnosticLabels);
  const diagnostics=rig.analyzeCharacterMaskQuality(
    diagnosticMask,diagnosticLabels,7,7,
    [{id:'torso',name:'Torso'},{id:'head',name:'Kepala'},{id:'handL',name:'Tangan kiri'}],
    [{minX:1,minY:1,maxX:2,maxY:2},{minX:3,minY:0,maxX:3,maxY:0},{minX:0,minY:0,maxX:5,maxY:6}]
  );
  assert.ok(diagnostics,'Valid mask and label arrays must produce a diagnostics report.');
  assert.equal(diagnostics.foregroundPixels,16,'Foreground diagnostics should count model pixels above the assignment threshold.');
  assert.equal(diagnostics.assignedPixels,15,'Assigned count should include only valid body-part labels.');
  assert.equal(diagnostics.unassignedForegroundPixels,1,'Rejected foreground spill must be reported, not assigned silently.');
  assert.equal(diagnostics.unassignedForegroundPercent,6.25);
  assert.equal(diagnostics.parts[2].componentCount,2,'Detached anatomical mask fragments must be counted.');
  assert.equal(diagnostics.parts[2].detachedPixels,4,'Diagnostics should quantify pixels outside the largest connected component.');
  assert.ok(diagnostics.parts[2].warnings.some(message=>message.includes('fragmen terpisah')),'A sufficiently large detached fragment should be flagged for review.');
  assert.deepEqual(diagnosticMask,diagnosticMaskSnapshot,'Diagnostics must not mutate source confidence values.');
  assert.deepEqual(diagnosticLabels,diagnosticLabelsSnapshot,'Diagnostics must not mutate body-part assignments.');
  assert.equal(rig.analyzeCharacterMaskQuality(null,diagnosticLabels,7,7,[]),null,'Missing mask input must return no diagnostics.');

  const matteWidth=7,matteHeight=7,matte=new Float32Array(matteWidth*matteHeight);
  for(let y=1;y<=5;y++)for(let x=1;x<=5;x++)matte[y*matteWidth+x]=0.92;
  matte[3*matteWidth+3]=0.01;
  const originalMatte=new Float32Array(matte);
  const refinedMatte=rig.refineSegmentationMask(matte,matteWidth,matteHeight);
  assert.ok(refinedMatte[3*matteWidth+3]>=rig.CHARACTER_RIG_MASK_THRESHOLDS.labelAssignment,
    'A single-pixel pinhole fully enclosed by confident subject pixels should be repaired.');
  assert.notStrictEqual(refinedMatte,matte,'Refinement must return a separate mask buffer.');
  assert.deepEqual(matte,originalMatte,'Refinement must not mutate the original model mask.');
  const gapMask=new Float32Array(matte);
  gapMask[3*matteWidth+3]=0.01;
  gapMask[3*matteWidth+2]=0.01;
  const originalGapMask=new Float32Array(gapMask);
  const refinedGap=rig.refineSegmentationMask(gapMask,matteWidth,matteHeight);
  assert.equal(refinedGap[3*matteWidth+3],originalGapMask[3*matteWidth+3],
    'An open two-pixel gap must remain transparent so arm and torso are not fused.');
  const invalidMask=rig.refineSegmentationMask(null,matteWidth,matteHeight);
  assert.equal(invalidMask,null,'Missing input must be handled safely.');

  const flatW=32,flatH=24,flatData=new Uint8ClampedArray(flatW*flatH*4);
  for(let y=0;y<flatH;y++)for(let x=0;x<flatW;x++){
    const i=(y*flatW+x)*4;flatData[i]=198;flatData[i+1]=0;flatData[i+2]=0;flatData[i+3]=255;
  }
  // Simulate dark subject pixels in the interior while keeping a solid red frame border.
  for(let y=6;y<19;y++)for(let x=12;x<20;x++){const i=(y*flatW+x)*4;flatData[i]=25;flatData[i+1]=25;flatData[i+2]=25;}
  assert.deepEqual(rig.estimateUniformBackgroundColor({data:flatData},flatW,flatH),[198,0,0],
    'A plain red backdrop must be recovered from clean border samples, not smeared subject-edge pixels.');
  const texturedData=new Uint8ClampedArray(flatData);
  for(let x=0;x<flatW;x++){const i=x*4;texturedData[i]=x*7%255;texturedData[i+1]=x*11%255;}
  assert.equal(rig.estimateUniformBackgroundColor({data:texturedData},flatW,flatH),null,
    'Non-uniform image borders must keep the conservative local inpainting fallback.');
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
  const footSpecs=Object.fromEntries(specs.map(part=>[part.id,part]));
  assert.ok(footSpecs.footL.radiusPx>=20*0.12&&footSpecs.footR.radiusPx>=20*0.12,
    'Foot masks must cover the ankle-to-foot transition instead of leaving a clipped ankle edge.');
  assert.ok(footSpecs.footL.jointOverlap>=footSpecs.footL.radiusPx*1.3&&footSpecs.footR.jointOverlap>=footSpecs.footR.radiusPx*1.3,
    'Ankle joints need enough shared pixels to remain connected while the foot rotates.');
  const shirtCoreSpec=specs.find(part=>part.id==='torso');
  assert.ok(rig.isPartAssetPixelIncluded(-1,0,0.98,shirtCoreSpec,50,52),
    'Central shirt pixels inside the torso envelope must be retained by the torso asset even when a moving limb overlaps their segmentation label.');
  assert.match((await fs.promises.readFile(path.join(__dirname,'../js/character-rig.mjs'),'utf8')),
    /const insideTorso = polygonContains\(px, py, specs\[0\]\.polygon\);[\s\S]*?bestIndex = bestArmIndex >= 0 && bestArm <= 1\.15 \? bestArmIndex : 0;/,
    'The torso envelope must take priority over broad leg capsules, while confident arm pixels remain articulated.');

  const skirtMask=new Float32Array(100*100);
  for(let y=58;y<=74;y++)for(let x=36;x<=64;x++)skirtMask[y*100+x]=.98;
  const skirtSpecs=rig.buildPosePartSpecs(landmarks,100,100,skirtMask,100,100);
  const skirt=skirtSpecs.find(part=>part.id==='lowerGarment');
  assert.ok(skirt,'A connected lower garment must be identified as one shared layer rather than split between the legs.');
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
  const kneeProfile=rig.getJointMotionProfile({id:'lowerLegL',name:'Betis kiri'});
  assert.equal(kneeProfile.joint,'knee','Lower-leg motion must use a knee-specific profile.');
  assert.ok(kneeProfile.max>Math.abs(kneeProfile.min),'Knee motion must allow a controlled bend without equal unrestricted forward/backward rotation.');
  const ankleProfile=rig.getJointMotionProfile({id:'footL',name:'Kaki kiri'});
  assert.equal(ankleProfile.joint,'ankle','Foot motion must be constrained around the ankle.');
  const garmentProfile=rig.getJointMotionProfile({id:'lowerGarment',name:'Rok / pakaian bawah'});
  assert.equal(garmentProfile.joint,'garment','A lower garment must use a subtle hip-following motion profile.');
  for(const part of [{id:'lowerLegL',amp:.5,speed:1.5},{id:'footL',amp:.5,speed:1.5},{id:'torso',amp:.5,speed:1.5}]){
    for(let frame=0;frame<240;frame++){
      const angle=rig.evaluateJointMotion(part,frame/30,{rigAmplitude:2,rigSpeed:1});
      const profile=rig.getJointMotionProfile(part);
      assert.ok(angle>=profile.min-1e-9&&angle<=profile.max+1e-9,'Joint motion must never exceed its anatomical angle limits.');
    }
  }
  const byId=Object.fromEntries(specs.map(p=>[p.id,p]));
  for(const id of ['head','torso','upperArmL','forearmL','handL','upperArmR','forearmR','handR','upperLegL','lowerLegL','footL','upperLegR','lowerLegR','footR']){
    assert.ok(byId[id], 'Missing body part spec: '+id);
    assert.ok(Number.isFinite(byId[id].pivot.x)&&Number.isFinite(byId[id].pivot.y),'Part pivot must be finite: '+id);
  }
  assert.equal(byId.forearmL.parent,'upperArmL');
  assert.equal(byId.handL.parent,'forearmL');
  assert.equal(byId.handL.motion,'swing');
  assert.equal(byId.handR.motion,'swing');
  assert.ok(byId.torso.amp<=0.015,'Torso motion must remain subtle so the full body does not rock unnaturally.');
  assert.ok(byId.upperLegL.amp<=0.06&&byId.upperLegR.amp<=0.06,'Thigh rotation must be limited to preserve the original stance.');
  assert.ok(byId.lowerLegL.amp<=0.08&&byId.lowerLegR.amp<=0.08,'Knee rotation must not accumulate into a split-like leg spread.');
  assert.ok(byId.footL.amp<=0.035&&byId.footR.amp<=0.035,'Ankle motion must stay restrained.');
  assert.ok(byId.upperArmL.amp<=0.08&&byId.forearmL.amp<=0.09&&byId.handL.amp<=0.055,'Arm-chain motion must preserve the original hand position.');
  assert.ok(byId.upperArmR.amp<=0.08&&byId.forearmR.amp<=0.09&&byId.handR.amp<=0.055,'The opposite arm chain must use the same natural-motion limits.');
  assert.ok(byId.upperArmL.amp<=0.045&&byId.forearmL.amp<=0.05&&byId.handL.amp<=0.025,'Mode 3 arm-chain rotations must stay low enough to avoid stacked hand motion.');
  assert.ok(byId.upperLegL.amp<=0.035&&byId.lowerLegL.amp<=0.045&&byId.footL.amp<=0.02,'Mode 3 leg-chain rotations must remain restrained to reduce knee and ankle tearing.');
  assert.ok(byId.torso.jointOverlap>=byId.torso.width*0.15,'Torso underlay must overlap shoulder joints enough to prevent a split seam.');

  assert.ok(skirt.amp<=0.03,'The skirt should move only subtly with the hips.');
  assert.ok(byId.handL.radiusPx>20*0.09&&byId.handR.radiusPx>20*0.09,'Hand capsules must cover the palm using valid wrist and fingertip landmarks.');
  assert.ok(byId.handL.radiusPx<=20*0.22&&byId.handR.radiusPx<=20*0.22,'Outlier pinky/thumb landmarks must not inflate a hand capsule across the torso or garment.');
  assert.equal(byId.lowerLegR.parent,'upperLegR');
  assert.equal(byId.footR.parent,'lowerLegR');
  for(const id of ['torso','head','upperArmL','forearmL','upperLegL','lowerLegL']){assert.ok(byId[id].jointOverlap>=5,'Joint overlap must cover shared pixels for '+id);}
  assert.ok(byId.upperLegL.jointOverlap>=byId.upperLegL.radiusPx,'Thigh-to-knee overlap must cover the full joint radius so trousers do not split during rotation.');
  assert.ok(byId.lowerLegL.jointOverlap>=byId.lowerLegL.radiusPx,'Knee-to-shin overlap must cover the full joint radius so trousers do not split during rotation.');
  assert.equal(byId.torso.polygon.length,6,'Torso underlay must use a garment envelope with side control points instead of a narrow four-landmark quadrilateral.');
  assert.ok(byId.torso.polygon[1].x<(byId.torso.polygon[0].x+byId.torso.polygon[2].x)*0.5,'Left torso contour must extend outward from the shoulder-to-hip centerline.');
  assert.ok(byId.torso.polygon[4].x>(byId.torso.polygon[3].x+byId.torso.polygon[5].x)*0.5,'Right torso contour must extend outward from the shoulder-to-hip centerline.');
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
  for(let y=40;y<45;y++)for(let x=24;x<29;x++)farForeground[y*100+x]=0.20;
  const farAssigned=rig.assignPosePartLabels(farForeground,100,100,landmarks,100,100);
  assert.ok(farAssigned.labels[42*100+26]>0,'Foreground pixels just outside a detected articulated part capsule must still be assigned within the accepted anatomical envelope.');
  const distantSpill=new Float32Array(100*100);
  for(let y=94;y<99;y++)for(let x=1;x<6;x++)distantSpill[y*100+x]=0.98;
  const spillAssigned=rig.assignPosePartLabels(distantSpill,100,100,landmarks,100,100);
  assert.equal(spillAssigned.labels[96*100+3],-1,'Distant segmentation spill must remain background instead of being attached to the nearest foot as a false shadow.');
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
  assert.match(moduleSource,/activeMask = acceptedMask/,'Background inpainting and part extraction must share the same anatomically accepted foreground matte to prevent segmentation spill from becoming colored limb ghosts.');
  assert.match(moduleSource,/best > CHARACTER_RIG_MASK_THRESHOLDS\.maxPartAssignmentScore/,'Foreground pixels too far from every pose part must not be assigned to a limb.');
  assert.match(moduleSource,/const featherStart = Math\.max\(0, CHARACTER_RIG_MASK_THRESHOLDS\.assetAlpha - 0\.045\)/,'The subject alpha feather must not discard pixels already removed from the background.');
  assert.match(moduleSource,/analyzeCharacterMaskQuality/,'Mode 3 must report anatomical mask coverage and connectivity.');
  assert.match(moduleSource,/unassignedForegroundPercent/,'Diagnostics must report foreground pixels rejected by anatomical assignment.');
  assert.match(moduleSource,/outputSegmentationMasks:\s*true/);
  assert.match(moduleSource,/getAsFloat32Array\(\)/);
  assert.match(moduleSource,/canvas\.toDataURL\("image\/png"\)/);
  assert.match(directorSource,/itcvAutoRig/);
  assert.match(directorSource,/itcvRigParts/);
  assert.match(directorSource,/report\.assignedForegroundPercent/,'Mode 3 must surface anatomical mask coverage in the rig review panel.');
  assert.match(directorSource,/report\.warningCount/,'Mode 3 must surface mask-quality warnings before animation review.');
  assert.match(directorSource,/function drawPart\(p(?:,parentWave)?\)/,'JavaScript Studio must recursively draw each articulated rig part, optionally receiving its parent motion signal.');
  assert.match(directorSource,/children\[k\]\.sort\(\(a,b\)=>\(Number\(a\.renderOrder\)\|\|0\)-\(Number\(b\.renderOrder\)\|\|0\)\)/,'JavaScript Studio renderer must respect anatomical depth order so skirts cannot cover foreground hands.');
  assert.match(directorSource,/const parent=part\.parent&&partsById\.has\(part\.parent\)\?part\.parent:''/,'CSS HTML output must rebuild each rig part under its declared parent.');
  assert.match(directorSource,/function renderRigPart\(part\)/,'CSS HTML output must recursively render nested articulated part nodes.');
  assert.match(directorSource,/children\[part\.id\]\|\|\[\]\)\.forEach\(child=>\{html\+=renderRigPart\(child\);\}\)/,'CSS HTML children must inherit parent transforms rather than animate as unrelated siblings.');
  assert.match(directorSource,/rig-node-'\+index/,'CSS HTML output must apply per-part motion to hierarchy wrapper nodes.');
  assert.ok(directorSource.includes('const pivotX=clamp(part.pivotX==null?x+w/2:part.pivotX,0,rw)'), 'Full-canvas hierarchy wrappers must calculate pivots in full-canvas coordinates, not cropped-part coordinates.');
  assert.ok(directorSource.includes('const px=pivotX/rw*100,py=pivotY/rh*100'), 'CSS transform origins must use the source canvas dimensions.');
  assert.ok(directorSource.includes('rotationMin=Math.max(profile.min,-Math.min(amp,limit))*180/Math.PI,rotationMax=Math.min(profile.max,Math.min(amp,limit))*180/Math.PI'), 'CSS output must clamp each joint to its asymmetric anatomical motion range.');
  assert.match(directorSource,/function jointProfile\(p\)/,'JavaScript Studio renderer must use the same joint-specific motion profiles.');
  assert.match(directorSource,/function drawJointMesh\(/,'Mode 3 must deform limb and garment textures as segmented mesh strips, not only rotate rigid cut-outs.');
  assert.match(directorSource,/function drawTriangle\(/,'Mode 3 must rasterize a true triangle mesh with affine texture mapping.');
  assert.match(directorSource,/const density=Math\.max\(4,Math\.min\(24/,'Mode 3 mesh density must be user-configurable within safe bounds.');
  assert.match(directorSource,/itcvMeshEnabled/,'Mode 3 must expose a visible mesh enable control.');
  assert.match(directorSource,/jointInfluence/,'Mode 3 must serialize the joint influence control into the runtime.');
  assert.match(directorSource,/itcvJointAnchors/,'Mode 3 must expose a visible cross-segment shared-joint control.');
  assert.match(directorSource,/axisLengthSq/,'Mode 3 mesh weights must follow the shared proximal-to-distal joint axis.');
  assert.match(directorSource,/distal:child\?\{x:Number\(child\.pivotX\),y:Number\(child\.pivotY\)\}/,'Mode 3 child pivots must anchor the parent segment distal seam.');
  assert.match(directorSource,/ctx\.transform\(A,B,C,D,E,F\)/,'Mode 3 mesh triangles must map source texture coordinates onto deformed destination vertices.');
  assert.match(directorSource,/smoothWeight=value=>/,'Mode 3 vertices must blend proximal/distal joint influences with smooth weights.');
  assert.match(directorSource,/distalWeight:weight/,'Mode 3 must retain normalized joint influence weights per shared mesh vertex.');
  assert.match(directorSource,/drawJointMesh\(im,/,'Mode 3 canvas preview must route articulated parts through the mesh deformation renderer.');
  assert.ok(directorSource.includes('const period=clamp(2*Math.PI/Math.max(.1,speed),.6,duration*3)'), 'CSS output must use the same angular speed as the JavaScript renderer.');
  assert.ok(directorSource.includes('const phase=-phaseOffset/Math.max(.1,speed)'), 'CSS animation delay must convert the phase offset from radians to seconds.');

  assert.match(moduleSource,/renderOrder: Number\.isFinite\(Number\(spec\.renderOrder\)\) \? Number\(spec\.renderOrder\) : 0/,'Exported rig layers must retain their render order metadata.');
  assert.match(moduleSource,/const jointSeams = \[\]/,'Mode 3 must build shared seam descriptors for connected anatomical segments.');
  assert.match(moduleSource,/jointSeamPoints = \(parent\.jointSeamPoints \|\| \[\]\)\.concat\(seam\)/,'Both parent and child layers must receive the same seam anchor.');
  assert.match(moduleSource,/seamFeather = \(1 - t \* t \* \(3 - 2 \* t\)\) \* jointSeamStrength/,'Joint overlap feather must honor the configured seam strength.');
  assert.match(moduleSource,/jointSeamRadiusScale/,'Mode 3 must support a configurable joint seam radius.');
  assert.match(directorSource,/itcvRigSeamControls/,'Mode 3 must render the visible joint seam controls panel in the Character Rig workspace.');
  assert.match(directorSource,/jointSeamEnabled/,'Mode 3 controls must be passed into the rig builder.');
  assert.match(moduleSource,/confidence >= CHARACTER_RIG_MASK_THRESHOLDS\.assetAlpha/,'Joint overlap must use only accepted foreground confidence, never background pixels.');
  assert.match(moduleSource,/diagnostics:\s*\{\s*\.\.\.diagnostics,\s*underlayParts,\s*underlayPixels\s*\},\s*jointSeams/,'Generated Mode 3 rig must retain the base diagnostics, underlay coverage metrics, and shared joint seam descriptors.');

  assert.match(moduleSource,/motion: spec\.motion \|\| "swing"/,'Exported rig assets must retain their explicit motion mode instead of silently falling back to a generic default.');
  assert.match(directorSource,/const runtimeRig=characterRig&&Array\.isArray\(characterRig\.parts\)/,'The JavaScript Studio runtime must normalize and embed the active character rig before rendering.');
  assert.match(directorSource,/characterRig:runtimeRig/,'The generated JavaScript Studio payload must retain the character rig assets.');
  assert.match(directorSource,/createCharacterRig\(uris\[0\]/);

  assert.match(directorSource,/itcvContinuity/,'Mode 3 must expose cross-segment continuity control.');
  assert.match(directorSource,/crossSegmentContinuity/,'Mode 3 must serialize cross-segment continuity.');
  assert.match(directorSource,/drawPart\(p,parentWave\)/,'Mode 3 must propagate parent motion influence.');
    assert.match(ui,/function wouldCreateRigParentCycle\(/,'Mode 3 must validate parent changes in the visible rig editor.');
  assert.match(ui,/!wouldCreateRigParentCycle\(rig\.parts,part\.id,p\.id\)/,'Mode 3 must hide descendant parts from invalid parent choices.');
  assert.match(ui,/Perubahan parent ditolak/,'Mode 3 must give visible feedback when an invalid hierarchy change is rejected.');
  const hierarchy=[
    {id:'torso',parent:null},{id:'upperArmL',parent:'torso'},
    {id:'forearmL',parent:'upperArmL'},{id:'handL',parent:'forearmL'},
    {id:'upperLegL',parent:'torso'},{id:'lowerLegL',parent:'upperLegL'}
  ];
  assert.equal(rig.wouldCreateCharacterRigParentCycle(hierarchy,'upperArmL','handL'),true,
    'A hand cannot become the parent of its own upper-arm ancestor chain.');
  assert.equal(rig.wouldCreateCharacterRigParentCycle(hierarchy,'handL','torso'),false,
    'Reparenting a hand directly to an existing ancestor must remain valid because it does not create a cycle.');
  assert.equal(rig.wouldCreateCharacterRigParentCycle(hierarchy,'torso','handL'),true,
    'The torso cannot be parented to a descendant limb.');
  assert.equal(rig.wouldCreateCharacterRigParentCycle(hierarchy,'handL','upperLegL'),false,
    'A valid parent change between separate branches must remain available.');
  assert.equal(rig.wouldCreateCharacterRigParentCycle(hierarchy,'handL','missing'),true,
    'Unknown parent IDs must be rejected rather than silently flattening a rig.');
  const brokenHierarchy=[{id:'a',parent:'b'},{id:'b',parent:'a'}];
  assert.equal(rig.wouldCreateCharacterRigParentCycle(brokenHierarchy,'torso','a'),true,
    'An already cyclic ancestor graph must be treated as invalid.');
assert.match(ui,/id="itcvBuildCharacterParts"/,'Mode 3 must expose a dedicated Auto Character Parts action.');assert.match(ui,/AUTO CHARACTER PARTS · BUATKAN RIG/,'The human body rig entry point must be clearly named for users.');assert.match(ui,/buildCharacterRig\(false\)/,'Auto Character Parts must invoke the dedicated human character rig builder.');assert.match(directorSource,/itcvMotionAssistControls/,'Mode 3 must expose the visible pose preset, foot contact lock, and follow-through controls.');assert.match(directorSource,/cfg\.motionAssist=/,'Motion assist controls must be serialized into the generated runtime.');assert.match(directorSource,/footStance/,'Generated character runtime must reduce foot rotation during stance.');assert.match(directorSource,/followThrough/,'Generated character runtime must blend secondary follow-through motion.');assert.match(directorSource,/preset==="run"/,'Generated character runtime must adapt cadence for walk/run presets.');

  for(const id of ['itcvGestureAction','itcvGazeDirection','itcvBreathing','itcvBodySway','itcvRootMotion']) assert.ok(ui.includes('id="'+id+'"'),'Mode 3 must expose '+id+'.');
  for(const token of ['gestureAngle','gazeAngle','breathing','bodySway','rootPath']) assert.ok(ui.includes(token),'Generated character runtime must apply '+token+'.');
for(const id of ['itcvMotionTempo','itcvMotionStrength','itcvJointLimit','itcvMirrorMotion','itcvLoopBlend']) assert.ok(ui.includes('id="'+id+'"'),'Mode 3 must expose '+id+'.');
  for(const token of ['motionTempo','motionStrength','jointLimit','mirrorMotion','loopBlend','loopEnvelope','mirrorSign']) assert.ok(ui.includes(token),'Generated character runtime must apply '+token+'.');
console.log('PASS: pose body-part geometry, parent rig hierarchy, segmentation assignments, motion assist and self-contained export wiring');
})().catch(error=>{console.error(error);process.exit(1);});
