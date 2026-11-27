'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'
  ]});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#trozalCanvas3DOpen',{timeout:15000});
    await page.locator('#trozalCanvas3DOpen').click();
    await page.waitForSelector('#trozal3DCanvas',{timeout:10000});
    await page.waitForFunction(()=>window.TROZAL_CANVAS_3D?.status?.webgl===true,{timeout:15000});
    const initial=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(initial.objects.length,3,'The starter 3D scene should contain three independently editable meshes.');
    assert.ok(initial.objects.some(o=>o.type==='cube'));
    assert.ok(initial.objects.some(o=>o.type==='sphere'));
    assert.ok(initial.objects.some(o=>o.type==='torus'));
    assert.equal(await page.locator('#trozal3DObjectList button').count(),3);
    const ids=await page.evaluate(()=>[...document.querySelectorAll('#trozalCanvas3DOverlay [id]')].map(e=>e.id));
    assert.equal(ids.length,new Set(ids).size,'CANVAS 3D overlay must not contain duplicate element IDs.');
    await page.locator('#trozal3DNewType').selectOption('cylinder');
    await page.locator('#trozal3DAdd').click();
    assert.equal(await page.locator('#trozal3DObjectList button').count(),4,'Add should create a cylinder mesh.');
    await page.locator('#trozal3DDuplicate').click();
    assert.equal(await page.locator('#trozal3DObjectList button').count(),5,'Duplicate should add a second independent object.');
    await page.locator('#trozal3DDelete').click();
    assert.equal(await page.locator('#trozal3DObjectList button').count(),4,'Delete should remove only the selected object.');
    await page.locator('#trozal3DRX').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#trozal3DAnimation').selectOption('bounce');
    let project=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    const active=project.objects.find(o=>o.id===project.objects[project.objects.length-1].id);
    assert.ok(project.objects.some(o=>o.rx===35),'The inspector must update the selected object rotation.');
    assert.ok(project.objects.some(o=>o.animation==='bounce'),'Animation selection must persist in project data.');
    await page.locator('#trozal3DLoop').click();
    assert.equal(await page.locator('#trozal3DLoop').getAttribute('aria-pressed'),'false');
    await page.locator('#trozal3DPlay').click();
    await page.waitForTimeout(180);
    assert.match(await page.locator('#trozal3DPlay').innerText(),/Playing/);
    await page.locator('#trozal3DPause').click();
    assert.match(await page.locator('#trozal3DPlay').innerText(),/Play/);
    await page.locator('#trozal3DStop').click();
    const jsonDownload=page.waitForEvent('download');
    await page.locator('#trozal3DExportJson').click();
    assert.match((await jsonDownload).suggestedFilename(),/\.json$/);
    const pngDownload=page.waitForEvent('download');
    await page.locator('#trozal3DExportPng').click();
    assert.match((await pngDownload).suggestedFilename(),/\.png$/);
    assert.deepEqual(errors,[],'Unexpected uncaught browser errors.');
    await page.locator('#trozal3DClose').click();
    assert.equal(await page.locator('#trozalCanvas3DOverlay').evaluate(el=>getComputedStyle(el).display),'none');
    console.log(JSON.stringify({result:'PASS',renderer:'WebGL2',initialMeshes:3,addedMesh:'cylinder',duplicateDelete:'PASS',transform:'PASS',perObjectAnimation:'PASS',timeline:'PASS',loop:'PASS',exports:['JSON','PNG']},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
