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
  await page.waitForFunction(()=>document.getElementById('itcvHtml')?.value.includes('sam2.1-tiny-browser-universal-rig'),{timeout:30000});
  await page.waitForFunction(()=>document.getElementById('itcvPreview')?.contentWindow?.TROZAL_VIDEO?.characterRigEmbedded===true,{timeout:15000});
  assert.match(await page.locator('#itcvRigStatus').innerText(),/PNG layer transparan/);
  assert.match(await page.locator('#itcvJs').inputValue(),/characterPartCount/);
  const html=await page.locator('#itcvHtml').inputValue();
  assert.doesNotMatch(html,/trozal-export-fallback/,'Standalone HTML must not leave a static source image behind the animated canvas');
  assert.match(html,/cameraShake/,'HTML export must serialize camera shake');
  assert.match(html,/colorGrade/,'HTML export must serialize color grading');
  assert.match(html,/vignette/,'HTML export must serialize vignette setting');
  for (const key of ['cameraZoom','focusX','focusY','filmGrain','lensSoftness']) {
   assert.ok(html.includes(key), 'HTML export must serialize '+key);
   assert.ok((await page.locator('#itcvJs').inputValue()).includes(key), 'JavaScript export must serialize '+key);
  }
  for (const key of ['rigSpeed','rigAmplitude','rigParallax','rigShadow','rigStagger']) {
   assert.ok(html.includes(key), 'HTML export must serialize '+key);
   assert.ok((await page.locator('#itcvJs').inputValue()).includes(key), 'JavaScript export must serialize '+key);
  }
  const preview=page.frameLocator('#itcvPreview');
  await preview.locator('#trozal-video-canvas').waitFor({timeout:10000});
  const rendered=await preview.locator('#trozal-video-canvas').evaluate(async c=>{const until=Date.now()+10000;let lit=0;while(Date.now()<until){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;lit=0;for(let i=0;i<d.length;i+=4)if(d[i]>50||d[i+1]>50||d[i+2]>50)lit++;if(lit>100)return lit;await new Promise(resolve=>setTimeout(resolve,100));}return lit;});
  assert.ok(rendered>100,'HTML preview must paint visible pixels instead of a blank/black frame');
  await preview.locator('body').evaluate(()=>{const frame=document.createElement('iframe');frame.id='standalone-export-check';frame.style.cssText='position:fixed;left:-10000px;width:640px;height:360px';frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.srcdoc=document.getElementById('itcvHtml').value;document.body.appendChild(frame);});
  const standalone=page.frameLocator('#itcvPreview').frameLocator('#standalone-export-check');
  await standalone.locator('#trozal-video-canvas').waitFor({timeout:10000});
  await standalone.locator('body').evaluate(async()=>{const until=Date.now()+10000;while(Date.now()<until){const f=document.getElementById('standalone-export-check');if(f?.contentWindow?.TROZAL_VIDEO?.frameCount>3)return;await new Promise(r=>setTimeout(r,80));}throw new Error('Standalone HTML export did not advance animation frames');});
  assert.ok(await standalone.locator('#trozal-video-canvas').evaluate(c=>c.width>0&&c.height>0),'Standalone HTML must create a running canvas');
  assert.deepEqual(errors,[],'Mode 5 Universal Rig must not produce uncaught page errors');
  console.log('PASS: Browser Mode 5 manual point -> mocked SAM mask -> transparent object layer -> self-contained HTML/JS preview.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
