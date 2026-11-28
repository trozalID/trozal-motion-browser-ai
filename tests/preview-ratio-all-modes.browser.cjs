'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    const dock=page.locator('#trozalGlobalRatioDock');
    await dock.waitFor({state:'visible'});
    const ratio=page.locator('#trozalGlobalPreviewRatio');
    await ratio.selectOption('9:16');
    await page.waitForFunction(()=>document.getElementById('stage')?.style.aspectRatio==='9/16');
    assert.equal(await page.locator('#stage').evaluate(el=>el.style.aspectRatio),'9/16','Main preview must adopt portrait ratio.');

    // Full-screen Canvas 3D must not cover the global aspect-ratio dock.
    await page.waitForSelector('#trozalCanvas3DOpen',{timeout:15000});
    await page.locator('#trozalCanvas3DOpen').click();
    await page.waitForSelector('#trozal3DViewport',{timeout:10000});
    await page.waitForFunction(()=>{
      const dock=document.getElementById('trozalGlobalRatioDock'),overlay=document.getElementById('trozalCanvas3DOverlay');
      return dock&&overlay&&Number(getComputedStyle(dock).zIndex)>Number(getComputedStyle(overlay).zIndex);
    });
    assert.ok(await dock.isVisible(),'Global ratio control must remain visible above Canvas 3D full-screen overlay.');
    await ratio.selectOption('9:16');
    await page.waitForFunction(()=>{
      const v=document.getElementById('trozal3DViewport');if(!v)return false;
      const r=v.getBoundingClientRect();return r.width>0&&r.height>0&&Math.abs(r.width/r.height-9/16)<0.03;
    });
    const portrait=await page.locator('#trozal3DViewport').evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height;});
    assert.ok(Math.abs(portrait-9/16)<0.03,'Canvas 3D viewport must honor portrait aspect ratio.');
    await ratio.selectOption('21:9');
    await page.waitForFunction(()=>{
      const r=document.getElementById('trozal3DViewport')?.getBoundingClientRect();
      return r&&r.width>0&&r.height>0&&Math.abs(r.width/r.height-21/9)<0.04;
    });
    await ratio.selectOption('custom');
    await page.locator('#trozalGlobalRatioWidth').fill('1000');
    await page.locator('#trozalGlobalRatioHeight').fill('1000');
    await page.waitForFunction(()=>{const r=document.getElementById('trozal3DViewport').getBoundingClientRect();return Math.abs(r.width/r.height-1)<0.03;});
    assert.deepEqual(errors,[],'Aspect ratio switching must not introduce browser runtime errors.');
    console.log('PASS: global preview ratios remain visible and apply to main + Canvas 3D modes.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
