'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#itcvModeBtn',{timeout:20000});
  await page.locator('#itcvModeBtn').click();
  await page.waitForSelector('#itcvAutoRig');
  await page.waitForSelector('#itcvBuildRig');
  await page.waitForSelector('#itcvRigPanel');
  const moduleCheck=await page.evaluate(async()=>{
   const mod=await import('./js/character-rig.mjs');
   return {create:typeof mod.createCharacterRig,geometry:typeof mod.buildPosePartSpecs,assignment:typeof mod.assignPosePartLabels};
  });
  assert.deepEqual(moduleCheck,{create:'function',geometry:'function',assignment:'function'});
  assert.equal(await page.locator('#itcvAutoRig').isChecked(),true,'Auto Character Rig should default on');
  assert.match(await page.locator('#itcvBuildRig').innerText(),/UNIVERSAL RIG/);
  const version=await page.locator('script[src*="trozal-image-to-code-video.js"]').getAttribute('src');
  assert.match(version,/\?v=20261124-1(?:&|$)/,'Mode 5 asset URL must use the current cache-busting version');
  assert.match(version,/rig=20261124-1/,'Universal Rig asset URL must use the current cache-busting version');
  console.log('PASS: Mode 5 Character Rig controls and browser ES module load.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
