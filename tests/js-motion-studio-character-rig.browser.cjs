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
  await page.route('**/js/character-rig.mjs',route=>route.fulfill({contentType:'text/javascript',body:
   'export async function createCharacterRig(){return {width:64,height:64,background:'+JSON.stringify(png(8,12,20))+',parts:[{id:"torso",parent:null,x:20,y:20,w:20,h:24,pivotX:30,pivotY:20,amp:.03,speed:1,phase:0,src:'+JSON.stringify(png(40,180,140))+'},{id:"head",parent:"torso",x:25,y:4,w:12,h:12,pivotX:31,pivotY:16,amp:.45,speed:1.4,phase:0,src:'+JSON.stringify(png(240,180,70))+'}]};}'
  }));
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trozalJsMotionBtn');
  await page.locator('#trozalJsMotionBtn').click();
  await page.waitForSelector('#trozalJsRigFile');
  await page.locator('#trozalJsRigFile').setInputFiles({name:'character.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.locator('#trozalJsRigBuild').click();
  await page.waitForFunction(()=>document.querySelector('#trozalJsRigStatus')?.textContent.includes('BERHASIL'),{timeout:20000});
  const result=await page.evaluate(async()=>{
   const api=window.TROZAL_JS_MOTION;
   const object=api.getObjects()[0];
   await api.renderFrame(0);
   const first=await api.renderFrame(.8);
   return {assetKeys:Object.keys(object.rigAssets||{}),code:api.getCode(),frameType:first?.constructor?.name};
  });
  assert.ok(result.assetKeys.includes('background')&&result.assetKeys.includes('head'),'Rig PNG assets must be attached to the JavaScript Studio object');
  assert.match(result.code,/drawPart/,'Generated Canvas code must articulate the parent-child rig hierarchy');
  assert.match(result.code,/Math\.sin\(t\*p\.speed\+p\.phase\)/,'Body-part motion must be time dependent');
  assert.equal(errors.length,0,'No browser runtime errors: '+errors.join('; '));
  console.log('PASS: JavaScript Studio imports Character Rig layers, loads PNG assets in its sandbox renderer, and renders articulated parent-child motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
