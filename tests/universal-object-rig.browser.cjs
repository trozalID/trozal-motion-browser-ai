'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#itcvModeBtn',{timeout:20000});
  await page.locator('#itcvModeBtn').click();
  await page.waitForSelector('#itcvRigSource');
  await page.locator('#itcvFiles').setInputFiles({name:'unsupported.heic',mimeType:'image/heic',buffer:Buffer.from([0,1,2])});
  assert.match(await page.locator('#itcvStatus').innerText(),/Format tidak didukung/,'Unsupported image formats must produce a visible explanation instead of silently disappearing.');
  assert.equal(await page.locator('#itcvFiles').inputValue(),'','File input must reset after selection so the same image can be selected again after a failed attempt.');
  for (const id of ['itcvCameraShake','itcvColorGrade','itcvBackground','itcvVignette','itcvLoop','itcvRigSpeed','itcvRigAmplitude','itcvRigParallax','itcvRigShadow','itcvRigStagger','itcvCameraZoom','itcvFocusX','itcvFocusY','itcvFilmGrain','itcvLensSoftness']) {
   assert.equal(await page.locator('#'+id).count(),1,'New finishing control '+id+' must exist');
  }
  const uploadBytes=await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#172a3c';ctx.fillRect(0,0,320,180);
   ctx.fillStyle='#d84e32';ctx.fillRect(55,42,95,82);
   ctx.fillStyle='#f4ce55';ctx.beginPath();ctx.arc(230,96,28,0,Math.PI*2);ctx.fill();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const imageFile={name:'universal-rig-test.png',mimeType:'image/png',buffer:Buffer.from(uploadBytes)};
  await page.locator('#itcvFiles').setInputFiles(imageFile);
  assert.equal(await page.locator('#itcvFiles').inputValue(),'','Supported image input should also reset after its File object is captured.');
  await page.waitForFunction(()=>{const c=document.getElementById('itcvRigSource');return !!c&&c.__trozalImageStatus&&c.__trozalImageStatus!=='loading';},{timeout:12000}).catch(async error=>{const diagnostic=await page.locator('#itcvRigSource').evaluate(c=>({status:c.__trozalImageStatus||null,error:c.__trozalImageError||null,map:!!c.__trozalMap,files:document.getElementById('itcvFiles')?.files?.length||0,statusText:document.getElementById('itcvStatus')?.textContent||''}));throw new Error(error.message+' | imageDiagnostic='+JSON.stringify(diagnostic)+' | pageErrors='+JSON.stringify(errors));});
  const imageDiagnostic=await page.locator('#itcvRigSource').evaluate(c=>({status:c.__trozalImageStatus,error:c.__trozalImageError,map:!!c.__trozalMap}));
  assert.ok(imageDiagnostic.map,'Universal Rig source image must decode and create a coordinate map: '+JSON.stringify(imageDiagnostic));
  await page.locator('#itcvFiles').setInputFiles(imageFile);
  await page.waitForFunction(()=>document.getElementById('itcvRigSource')?.__trozalImageStatus==='ready');
  assert.match(await page.locator('#itcvStatus').innerText(),/1 gambar siap/,'Selecting the exact same image again must trigger a fresh upload and redraw the Rig source preview.');
  await page.evaluate(()=>{
   window.__TROZAL_UNIVERSAL_RIG_TEST_PROVIDER__={
    width:0,height:0,
    async init(){return {backend:'mock-webgpu'};},
    async encode(buffer,width,height){this.width=width;this.height=height;return {width,height};},
    async segment(prompt){
     const mask=new Float32Array(256*256),scale=256/Math.max(this.width,this.height);
     let cx,cy,rx,ry;
     if(prompt.point){cx=prompt.point.x*scale;cy=prompt.point.y*scale;rx=24;ry=24;}
     else{cx=(prompt.box.x+prompt.box.w/2)*scale;cy=(prompt.box.y+prompt.box.h/2)*scale;rx=Math.max(6,prompt.box.w*scale/2);ry=Math.max(6,prompt.box.h*scale/2);}
     for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const dx=(x-cx)/Math.max(1,rx),dy=(y-cy)/Math.max(1,ry);
      if(dx*dx+dy*dy<=1)mask[y*256+x]=8;
     }
     return {mask,score:.96,width:256,height:256};
    },
    async dispose(){this.disposed=true;}
   };
  });
  const box=await page.locator('#itcvRigSource').boundingBox();
  const map=await page.locator('#itcvRigSource').evaluate(el=>el.__trozalMap);
  await page.mouse.click(box.x+box.width*(map.x+map.w*.72)/640,box.y+box.height*(map.y+map.h*.5)/360);
  await page.waitForFunction(()=>document.getElementById('itcvRigParts')?.querySelector('input[type="text"]')?.value.includes('Komponen manual'));
  await page.locator('#itcvBuildRig').click();
  await page.waitForFunction(()=>{const html=document.getElementById('itcvHtml')?.value||'';return html.includes('@keyframes trozal-part-0')&&html.includes('class="part-0"')&&html.includes('class="rig-part-node rig-node-0"')&&html.includes('class="rig-canvas"');},{timeout:30000});
  const exported=await page.locator('#itcvHtml').inputValue();
  assert.doesNotMatch(exported,/<script\b|\bimport\s*\(/i,'Importer-safe HTML must not contain JavaScript or module imports.');
  assert.match(exported,/@keyframes trozal-part-0/,'Each segmented object must receive a CSS keyframe animation.');
  const cssPreviewNode=page.frameLocator('#itcvPreview').locator('.rig-node-0');
  const cssPreviewPart=cssPreviewNode.locator('.part-0');
  await cssPreviewNode.waitFor({state:'attached',timeout:15000});
  await cssPreviewPart.waitFor({state:'attached',timeout:15000});
  const cssPreviewDiagnostics=await cssPreviewNode.evaluate(node=>{
   const image=node.querySelector('.part-0'),style=getComputedStyle(node),imgStyle=image?getComputedStyle(image):null,rect=image?.getBoundingClientRect(),frame=node.ownerDocument.defaultView.frameElement?.getBoundingClientRect();
   return {display:imgStyle?.display,visibility:imgStyle?.visibility,opacity:imgStyle?.opacity,animationName:style.animationName,width:rect?.width,height:rect?.height,frameWidth:frame?.width,frameHeight:frame?.height,complete:image?.complete,naturalWidth:image?.naturalWidth,naturalHeight:image?.naturalHeight,src:image?.currentSrc?.slice(0,40)};
  });
  console.log('Mode 5 CSS preview diagnostics:',JSON.stringify(cssPreviewDiagnostics));
  assert.notEqual(cssPreviewDiagnostics.animationName,'none','Segmented object must animate in CSS preview: '+JSON.stringify(cssPreviewDiagnostics));
  assert.ok(cssPreviewDiagnostics.width>0&&cssPreviewDiagnostics.height>0,'Segmented object must have visible geometry in CSS preview: '+JSON.stringify(cssPreviewDiagnostics));
  assert.match(await page.locator('#itcvRigStatus').innerText(),/PNG layer transparan/);
  for (const key of ['speedMultiplier','amplitudeMultiplier','opacity','pivotX','pivotY']) {
   assert.equal(await page.locator('[data-rig-control="'+key+'"]').count(),1,'Per-component control '+key+' must be available');
  }
  await page.locator('[data-rig-control="speedMultiplier"]').evaluate(el=>{el.value='1.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="amplitudeMultiplier"]').evaluate(el=>{el.value='0.6';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="opacity"]').evaluate(el=>{el.value='0.8';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="pivotX"]').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="pivotY"]').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const runtimeSource=await page.locator('#itcvJs').inputValue();
  assert.match(runtimeSource,/characterPartCount/,'Optional JavaScript source remains available separately.');
  const runtimePayload=runtimeSource.match(/const DATA=(\{[\s\S]*\});\n\/\/ Keep the segmented component count/);
  assert.ok(runtimePayload,'JavaScript export must contain a parseable scene payload.');
  const runtimeData=JSON.parse(runtimePayload[1]);
  assert.ok(Math.abs(runtimeData.characterRig.parts[0].speed-2.1)<0.001,'Per-component speed multiplier must affect exported JavaScript runtime speed.');
  assert.ok(Math.abs(runtimeData.characterRig.parts[0].amp-0.108)<0.001,'Per-component amplitude multiplier must affect exported JavaScript runtime amplitude.');

  // Exercise the segmented JavaScript export in the actual Studio sandbox.
  // Force a visible bob motion so this verifies pixels changing, not only valid syntax.
  runtimeData.characterRig.parts[0].motion='bob';
  runtimeData.characterRig.parts[0].amp=0.8;
  const executableRuntime=runtimeSource.replace(runtimePayload[1],JSON.stringify(runtimeData));
  const assetSummary=await page.evaluate(async sources=>Promise.all(sources.map(src=>new Promise(resolve=>{
    const image=new Image();image.onload=()=>resolve({ok:true,protocol:src.slice(0,32),length:src.length,width:image.naturalWidth,height:image.naturalHeight});
    image.onerror=()=>resolve({ok:false,protocol:src.slice(0,32),length:src.length});
    image.src=src;
  }))),[...(runtimeData.images||[]),runtimeData.characterRig?.background,...(runtimeData.characterRig?.parts||[]).map(p=>p.src)].filter(Boolean));
  console.log('Mode 5 JavaScript asset diagnostics:',JSON.stringify(assetSummary));
  // Studio's launcher can be visually hidden while Mode 5 owns the workspace;
  // invoke its real click handler so this integration test can switch modes.
  await page.locator('#itcvBack').click();
  await page.locator('#trozalJsMotionBtn').waitFor({state:'visible',timeout:10000});
  await page.locator('#trozalJsMotionBtn').click();
  await page.waitForSelector('#trozalJsMotionCode');
  await page.locator('#trozalJsMotionCode').fill(executableRuntime);
  await page.locator('#trozalJsMotionRun').click();
  await page.waitForFunction(() => {
    const s=(document.querySelector('#trozalJsMotionStatus')?.textContent||'').trim();
    return /^Frame siap|^Render frame gagal:|^JavaScript error:|^Preview timeout|^Kode terbaru berhasil diterapkan|^Kode berubah saat proses apply/.test(s);
  },null,{timeout:22000});
  const studioStatus=await page.locator('#trozalJsMotionStatus').innerText();
  assert.match(studioStatus,/Frame siap/, 'JavaScript Studio must compile and render the Mode 5 code. Status: '+studioStatus+' | pageErrors='+JSON.stringify(errors));
  assert.ok(await page.evaluate(()=>!!window.TROZAL_JS_MOTION?.renderFrame),'JavaScript Studio render API must be available.');
  await page.evaluate(async()=>{await window.TROZAL_JS_MOTION.renderFrame(0);});
  await page.frameLocator('#trozalJsMotionFrame').locator('#c').evaluate(canvas=>{
    window.__mode5Before=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  });
  await page.evaluate(async()=>{await window.TROZAL_JS_MOTION.renderFrame(1);});
  const movedPixels=await page.frameLocator('#trozalJsMotionFrame').locator('#c').evaluate(canvas=>{
    const before=window.__mode5Before,after=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let changed=0;for(let i=0;i<after.length;i+=4){if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])changed++;}
    return changed;
  });
  assert.ok(movedPixels>100,'A segmented object with bob motion must visibly move in JavaScript Studio; changed pixels='+movedPixels);
  const html=await page.locator('#itcvHtml').inputValue();
  assert.doesNotMatch(html,/<script\b|\bimport\s*\(/i,'HTML importer output must be CSS-only.');
  for (const key of ['speedMultiplier','amplitudeMultiplier','opacity','pivotX','pivotY']) assert.ok(html.includes(key),'CSS HTML must preserve '+key+' as layer metadata.');
  // Mode 5's workspace is intentionally hidden while JavaScript Studio is open.
  // Verify the already-mounted CSS preview by attachment and computed animation,
  // not Playwright's visibility heuristic for a hidden parent workspace.
  const preview=page.frameLocator('#itcvPreview');
  const previewNode=preview.locator('.rig-node-0');
  await previewNode.waitFor({state:'attached',timeout:10000});
  const previewAnimation=await previewNode.evaluate(el=>getComputedStyle(el).animationName);
  assert.notEqual(previewAnimation,'none','Mode 5 CSS preview hierarchy wrapper must retain its part animation while Studio is open.');
  await page.evaluate(()=>{const frame=document.createElement('iframe');frame.id='standalone-export-check';frame.style.cssText='position:fixed;left:-10000px;width:640px;height:360px';frame.srcdoc=document.getElementById('itcvHtml').value;document.body.appendChild(frame);});
  const standalone=page.frameLocator('#standalone-export-check');
  const standaloneNode=standalone.locator('.rig-node-0');
  const standalonePart=standaloneNode.locator('.part-0');
  await standaloneNode.waitFor({state:'attached',timeout:10000});
  await standalonePart.waitFor({state:'attached',timeout:10000});
  assert.notEqual(await standaloneNode.evaluate(el=>getComputedStyle(el).animationName),'none','Standalone HTML must animate segmented objects through hierarchy wrappers without JavaScript.');
  assert.deepEqual(errors,[],'Mode 5 Universal Rig must not produce uncaught page errors');
  console.log('PASS: Browser Mode 5 manual point -> mocked SAM mask -> transparent object layer -> self-contained HTML/JS preview.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
