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
  await page.waitForFunction(()=>document.getElementById('itcvRigParts')?.textContent.includes('Komponen manual'));
  await page.locator('#itcvBuildRig').click();
  await page.waitForFunction(()=>document.getElementById('itcvHtml')?.value.includes('sam2.1-tiny-browser-universal-rig'),{timeout:30000});
  await page.waitForFunction(()=>document.getElementById('itcvPreview')?.contentWindow?.TROZAL_VIDEO?.characterRigEmbedded===true,{timeout:15000});
  assert.match(await page.locator('#itcvRigStatus').innerText(),/PNG layer transparan/);
  assert.match(await page.locator('#itcvJs').inputValue(),/characterPartCount/);
  assert.deepEqual(errors,[],'Mode 5 Universal Rig must not produce uncaught page errors');
  console.log('PASS: Browser Mode 5 manual point -> mocked SAM mask -> transparent object layer -> self-contained HTML/JS preview.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
