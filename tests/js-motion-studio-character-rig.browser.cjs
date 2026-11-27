'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const zlib=require('node:zlib');
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
function png(r,g,b){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;const raw=Buffer.from([0,r,g,b,255]);return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/character-rig.mjs*',route=>route.fulfill({contentType:'text/javascript',body:
   'export async function createCharacterRig(){return {width:64,height:64,background:'+JSON.stringify(png(8,12,20))+',diagnostics:{assignedForegroundPercent:91.2,assignedPixels:912,foregroundPixels:1000,warningCount:1,warnings:["Satu fragmen mask perlu diperiksa."],parts:[{id:"torso",name:"Torso",pixels:700,componentCount:1,meanConfidence:.93,warnings:[]},{id:"head",name:"Kepala",pixels:212,componentCount:1,meanConfidence:.87,warnings:[]}]},parts:[{id:"torso",parent:null,x:20,y:20,w:20,h:24,pivotX:30,pivotY:20,amp:.03,speed:1,phase:0,src:'+JSON.stringify(png(40,180,140))+'},{id:"head",parent:"torso",x:25,y:4,w:12,h:12,pivotX:31,pivotY:16,amp:.45,speed:1.4,phase:0,src:'+JSON.stringify(png(240,180,70))+'}]};}'
  }));
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trozalJsMotionBtn');
  await page.locator('#trozalJsMotionBtn').click();
  await page.waitForSelector('#trozalJsRigFile');
  const rigPanelTitle=await page.locator('#trozalJsCharacterRigPanel strong').first().innerText();
  assert.match(rigPanelTitle,/AI CHARACTER MOTION RECONSTRUCTION · MODE 3/,
    'The reconstruction feature must be clearly identified inside Mode 3 JavaScript Motion Studio.');
  const rigPanelDescription=await page.locator('#trozalJsCharacterRigPanel p').first().innerText();
  assert.match(rigPanelDescription,/Tahap 1 aktif/,
    'Mode 3 must describe the currently implemented mask-refinement stage.');
  assert.equal(await page.locator('#trozalJsRigDiagnostics').count(),1,
    'Mode 3 should expose a reconstruction diagnostics panel for the next stage.');
  assert.equal(await page.locator('#trozalJsAdaptiveRigControls input[type=range]').count(),8,
    'Mode 3 must expose all eight adaptive Universal Rig character-motion controls.');
  for(const id of ['trozalJsHipCounter','trozalJsArmLegSync','trozalJsGroundClearance','trozalJsGaitBalance','trozalJsJointDamping','trozalJsFootContactLock','trozalJsAlternatingGait','trozalJsKneeFlexAssist']){
    assert.equal(await page.locator('#'+id).count(),1,'Mode 3 is missing adaptive control '+id+'.');
  }

  await page.locator('#trozalJsRigFile').setInputFiles({name:'character.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>document.querySelector('#trozalJsRigStatus')?.textContent.includes('Foto siap'),null,{timeout:10000});
  await page.locator('#trozalJsRigBuild').click();
  await page.waitForFunction(()=>{const s=document.querySelector('#trozalJsRigStatus')?.textContent||'';return s.includes('BERHASIL')||s.includes('RIG GAGAL');},null,{timeout:20000});
  const rigStatusText=await page.locator('#trozalJsRigStatus').textContent();
  assert.ok(rigStatusText.includes('BERHASIL'),'Character Rig pipeline did not complete: '+rigStatusText);
  assert.match(rigStatusText,/AUTO CHARACTER PARTS \+ UNIVERSAL RIG/,'Mode 3 must confirm the Universal Rig pipeline, not only generic image motion.');
  await page.waitForFunction(()=>!document.getElementById('trozalJsRigDiagnostics')?.hidden);
  const diagnosticsText=await page.locator('#trozalJsRigDiagnostics').innerText();
  assert.match(diagnosticsText,/TAHAP 2 · DIAGNOSTIK CAKUPAN ANATOMI/);
  assert.match(diagnosticsText,/91\.2%/,'Diagnostics should report foreground coverage.');
  assert.match(diagnosticsText,/Torso/);
  assert.match(diagnosticsText,/Kepala/);
  await page.waitForSelector('#trozalJsRigMaskCanvas');
  assert.equal(await page.locator('#trozalJsRigMaskParts input[type="checkbox"]').count(),2,
    'Mask review must expose one manual inclusion control per body part.');
  const maskCanvas=await page.locator('#trozalJsRigMaskCanvas').evaluate(canvas=>({width:canvas.width,height:canvas.height}));
  assert.deepEqual(maskCanvas,{width:64,height:64},'Mask review overlay must preserve the source image dimensions.');
  assert.equal(await page.locator('#trozalJsRigMaskRestoreAll').count(),1,'Mask review must provide a one-click restore action.');
  const maskToggles=page.locator('#trozalJsRigMaskParts input[type="checkbox"]');
  await maskToggles.nth(0).uncheck(); await maskToggles.nth(1).click();
  assert.equal(await maskToggles.nth(1).isChecked(),true,'The last active body part must not be removable.');
  await page.locator('#trozalJsRigMaskRestoreAll').click();
  await page.waitForFunction(()=>document.querySelector('#trozalJsMotionStatus')?.textContent.includes('Frame siap'),null,{timeout:20000});
  assert.equal(await maskToggles.nth(0).isChecked(),true,'Restore action must re-enable all body parts.');
  assert.equal(await maskToggles.nth(1).isChecked(),true,'Restore action must re-enable every body part.');
  const result=await page.evaluate(async()=>{
   const api=window.TROZAL_JS_MOTION;
   const object=api.getObjects()[0];
   const frame0=await api.renderFrame(0);
   const frame1=await api.renderFrame(.8);
   const probe=new OffscreenCanvas(1280,720),ctx=probe.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(frame0,0,0);const pixels0=ctx.getImageData(0,0,1280,720).data;
   ctx.clearRect(0,0,1280,720);ctx.drawImage(frame1,0,0);const pixels1=ctx.getImageData(0,0,1280,720).data;
   let changedPixels=0;for(let i=0;i<pixels0.length;i+=4)if(pixels0[i]!==pixels1[i]||pixels0[i+1]!==pixels1[i+1]||pixels0[i+2]!==pixels1[i+2]||pixels0[i+3]!==pixels1[i+3])changedPixels++;
   return {assetKeys:Object.keys(object.rigAssets||{}),code:api.getCode(),frameType:frame1?.constructor?.name,changedPixels,hasMotionControls:!!document.querySelector('#trozalJsRigMotionPreset')&&!!document.querySelector('#trozalJsRigIntensity')};
  });
  assert.ok(result.assetKeys.includes('background')&&result.assetKeys.includes('head'),'Rig PNG assets must be attached to the JavaScript Studio object');
  const universalState=await page.evaluate(()=>window.TROZAL_JS_MOTION.getObjects()[0]?.rigData?.universalRig);
  assert.ok(universalState?.enabled,'Mode 3 must attach Universal Rig joint metadata to the active character object.');
  assert.equal(universalState.partCount,2,'Universal Rig metadata must track independently segmented body parts.');
  assert.match(result.code,/drawPart/,'Generated Canvas code must articulate the parent-child rig hierarchy');
  assert.match(result.code,/Math\.min\(w\/rig\.width,h\/rig\.height\)/,'Character Rig must preserve source proportions inside the preview ratio');
  assert.match(result.code,/Math\.max\(-0\.42/,'Character Rig joint rotations must be bounded to prevent extreme limb separation');
  assert.match(result.code,/Math\.sin\(t\*p\.speed(?:\*motionTempo)?\+p\.phase\)/,'Body-part motion must be time dependent');
  assert.ok(result.changedPixels>0,'Two different timestamps must produce visibly different rendered pixels; got '+result.changedPixels);
  assert.ok(result.code.includes('motionGain=2.700'),'Walk Cycle must use a strong default motion gain');
  assert.ok(result.code.includes('p.amp*partGain*swing'),'Each body part must receive its own animated joint rotation');
  assert.ok(result.hasMotionControls,'Character Rig must expose motion preset and intensity controls');
  for(const token of ['hipCounterRotation','armLegSync','groundClearance','gaitBalance','jointImpactDamping','footContactLock','alternatingGait','kneeFlexAssist']){
    assert.ok(result.code.includes(token),'Generated character runtime must apply '+token+' to articulated body parts.');
  }
  assert.match(result.code,/Math\.max\(0,Math\.sin\(gaitPhase/,'Ground clearance must create an animated foot-lift arc.');
  assert.match(result.code,/torsoDamp/,'Gait balance must stabilize torso sway.');
  assert.match(result.code,/const stance=Math.max\(0,Math.cos\(gaitPhase/,'Foot contact lock must distinguish stance from swing phase.');
  assert.match(result.code,/const kneeFlex=/,'Knee Flex Assist must add articulated knee bend to lower-leg joints.');
  assert.match(result.code,/sidePhase\*adaptive.alternatingGait/,'Alternating Gait Phase must apply opposite phase to left and right legs.');
  await page.locator('#trozalJsFootContactLock').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>window.TROZAL_JS_MOTION.getCode().includes('"footContactLock":1'),null,{timeout:10000});
  await page.locator('#trozalJsKneeFlexAssist').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>window.TROZAL_JS_MOTION.getCode().includes('"kneeFlexAssist":1'),null,{timeout:10000});
  await page.locator('#trozalJsArmLegSync').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>window.TROZAL_JS_MOTION.getCode().includes('"armLegSync":1'),null,{timeout:10000});
  await page.locator('#trozalJsPreviewRatio').selectOption('9:16');
  await page.waitForTimeout(100);
  const portraitSize=await page.frameLocator('#trozalJsMotionFrame').locator('#c').evaluate(canvas=>({width:canvas.width,height:canvas.height}));
  assert.deepEqual(portraitSize,{width:720,height:1280},'Portrait preview must use a real 9:16 canvas instead of stretching a landscape frame');
  await page.locator('#trozalJsRigMotionPreset').selectOption('wave');
  await page.waitForFunction(()=>window.TROZAL_JS_MOTION.getCode().includes('"wave"'),null,{timeout:10000});
  const waveCode=await page.evaluate(()=>window.TROZAL_JS_MOTION.getCode());
  assert.ok(waveCode.includes('Math.sin(t*5.2)'),'Wave preset must animate the right upper arm');
  await page.locator('#trozalJsRigIntensity').evaluate(el=>{el.value='160';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>window.TROZAL_JS_MOTION.getCode().includes('motionGain=2.640'),null,{timeout:10000});
  assert.equal(errors.length,0,'No browser runtime errors: '+errors.join('; '));

  const firstPartToggle=page.locator('#trozalJsRigMaskParts input[type="checkbox"]').first();
  await firstPartToggle.uncheck();
  await page.waitForFunction(()=>{
    const object=window.TROZAL_JS_MOTION.getObjects()[0],rig=object&&object.rigData;
    return !!rig&&rig.parts.length===1&&rig.parts[0].id==='head'&&rig.parts[0].parent===null;
  },null,{timeout:10000});
  await firstPartToggle.check();
  await page.waitForFunction(()=>{
    const object=window.TROZAL_JS_MOTION.getObjects()[0],rig=object&&object.rigData;
    return !!rig&&rig.parts.length===2&&rig.parts.some(part=>part.id==='torso')&&rig.parts.some(part=>part.id==='head');
  },null,{timeout:10000});

  console.log('PASS: JavaScript Studio imports Character Rig layers, loads PNG assets in its sandbox renderer, and renders articulated parent-child motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
