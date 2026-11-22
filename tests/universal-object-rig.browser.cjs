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
  for (const id of ['itcvCameraShake','itcvColorGrade','itcvBackground','itcvVignette','itcvLoop','itcvRigSpeed','itcvRigAmplitude','itcvRigParallax','itcvRigShadow','itcvRigStagger','itcvCameraZoom','itcvFocusX','itcvFocusY','itcvFilmGrain','itcvLensSoftness']) {
   assert.equal(await page.locator('#'+id).count(),1,'New finishing control '+id+' must exist');
  }
  await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#172a3c';ctx.fillRect(0,0,320,180);
   ctx.fillStyle='#d84e32';ctx.fillRect(55,42,95,82);
   ctx.fillStyle='#f4ce55';ctx.beginPath();ctx.arc(230,96,28,0,Math.PI*2);ctx.fill();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([blob],'universal-rig-test.png',{type:'image/png'});
   const transfer=new DataTransfer();transfer.items.add(file);
   const input=document.getElementById('itcvFiles');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>!!document.getElementById('itcvRigSource')?.__trozalMap);
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
  await page.waitForFunction(()=>{const html=document.getElementById('itcvHtml')?.value||'';return html.includes('@keyframes trozal-part-0')&&html.includes('class="part part-0"')&&html.includes('class="rig-canvas"');},{timeout:30000});
  const exported=await page.locator('#itcvHtml').inputValue();
  assert.doesNotMatch(exported,/<script\\b|\\bimport\\s*\\(/i,'Importer-safe HTML must not contain JavaScript or module imports.');
  assert.match(exported,/@keyframes trozal-part-0/,'Each segmented object must receive a CSS keyframe animation.');
  await page.frameLocator('#itcvPreview').locator('.part-0').waitFor({timeout:15000});
  assert.notEqual(await page.frameLocator('#itcvPreview').locator('.part-0').evaluate(el=>getComputedStyle(el).animationName),'none','Segmented object must animate in CSS preview.');
  assert.match(await page.locator('#itcvRigStatus').innerText(),/PNG layer transparan/);
  for (const key of ['speedMultiplier','amplitudeMultiplier','opacity','pivotX','pivotY']) {
   assert.equal(await page.locator('[data-rig-control="'+key+'"]').count(),1,'Per-component control '+key+' must be available');
  }
  await page.locator('[data-rig-control="speedMultiplier"]').evaluate(el=>{el.value='1.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="amplitudeMultiplier"]').evaluate(el=>{el.value='0.6';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="opacity"]').evaluate(el=>{el.value='0.8';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="pivotX"]').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rig-control="pivotY"]').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.match(await page.locator('#itcvJs').inputValue(),/characterPartCount/,'Optional JavaScript source remains available separately.');
  const html=await page.locator('#itcvHtml').inputValue();
  assert.doesNotMatch(html,/<script\\b|\\bimport\\s*\\(/i,'HTML importer output must be CSS-only.');
  for (const key of ['speedMultiplier','amplitudeMultiplier','opacity','pivotX','pivotY']) assert.ok(html.includes(key),'CSS HTML must preserve '+key+' as layer metadata.');
  const preview=page.frameLocator('#itcvPreview');
  await preview.locator('.part-0').waitFor({timeout:10000});
  assert.notEqual(await preview.locator('.part-0').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>{const frame=document.createElement('iframe');frame.id='standalone-export-check';frame.style.cssText='position:fixed;left:-10000px;width:640px;height:360px';frame.srcdoc=document.getElementById('itcvHtml').value;document.body.appendChild(frame);});
  const standalone=page.frameLocator('#standalone-export-check');
  await standalone.locator('.part-0').waitFor({timeout:10000});
  assert.notEqual(await standalone.locator('.part-0').evaluate(el=>getComputedStyle(el).animationName),'none','Standalone HTML must animate segmented objects without JavaScript.');
  assert.deepEqual(errors,[],'Mode 5 Universal Rig must not produce uncaught page errors');
  console.log('PASS: Browser Mode 5 manual point -> mocked SAM mask -> transparent object layer -> self-contained HTML/JS preview.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
