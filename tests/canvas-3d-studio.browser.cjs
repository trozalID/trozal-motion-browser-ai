'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'
  ]});
  try {
    const studioSource=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','canvas-3d-studio.js'),'utf8');
    assert.match(studioSource,/function initGL1\(/,'WebGL1 must have a dedicated backend initializer.');
    assert.match(studioSource,/function drawWebGL1\(/,'WebGL1 must render the shared scene.');
    assert.match(studioSource,/async function initGPU\(/,'WebGPU must initialize a real device and pipeline.');
    assert.match(studioSource,/createRenderPipelineAsync/,'WebGPU must compile native render pipelines.');
    assert.match(studioSource,/const GPU_WGSL=/,'WebGPU must use native WGSL shaders.');
    const page = await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#trozalCanvas3DOpen',{timeout:15000});
    await page.locator('#trozalCanvas3DOpen').click();
    await page.waitForSelector('#trozal3DCanvas',{timeout:10000});
    await page.waitForSelector('#trozalRenderEngineGroups',{timeout:10000});
    const engineGroups=await page.evaluate(()=>window.TrozalRenderEngineGroups?.getStatus?.()||[]);
    assert.ok(engineGroups.some(item=>item.group==='3D RENDER'&&item.id==='webgl2'&&item.integrated),'3D group must identify the integrated WebGL2 backend.');
    assert.ok(engineGroups.some(item=>item.group==='3D RENDER'&&item.id==='cpu3d'&&item.integrated),'3D group must identify the integrated Canvas 2D software fallback.');
    assert.ok(engineGroups.some(item=>item.group==='2D / MOTION RENDER'&&item.id==='hybrid'),'2D/motion group must expose the separate Hybrid pipeline.');
    assert.ok(engineGroups.some(item=>item.group==='3D RENDER'&&item.id==='webgpu'&&item.integrated),'WebGPU must be identified as an integrated native backend.');
    assert.ok(engineGroups.some(item=>item.group==='3D RENDER'&&item.id==='webgl1'&&item.integrated),'WebGL1 must be identified as an integrated compatibility backend.');
    await page.locator('#trozalRenderEngineGroups summary').click();
    assert.equal(await page.locator('#trozalRenderEngineGroups [data-engine-group="3D RENDER"] .trozal-engine-row').count(),4);
    assert.equal(await page.locator('#trozalRenderEngineGroups [data-engine-group="2D / MOTION RENDER"] .trozal-engine-row').count(),4);
    assert.ok(await page.locator('#trozalRenderEngineGroups [data-engine-select]').count()>=2,'Integrated 3D backends should expose quick-switch controls.');
    await page.locator('#trozalRenderEngineGroups [data-engine-select="canvas2d"]').click();
    await page.waitForFunction(()=>document.getElementById('trozal3DCanvas2D')?.style.display==='block');
    await page.locator('#trozalRenderEngineGroups [data-engine-select="webgl2"]').click();
    await page.waitForFunction(()=>document.getElementById('trozal3DCanvas')?.style.display==='block');
    const gl1Available=engineGroups.find(item=>item.id==='webgl1')?.supported;
    if(gl1Available){
      await page.locator('#trozalRenderEngineGroups [data-engine-select="webgl1"]').click();
      await page.waitForFunction(()=>document.getElementById('trozal3DCanvasGL1')?.style.display==='block');
      const gl1Project=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
      assert.equal(gl1Project.objects.length,3,'WebGL1 must retain and render the same scene.');
      await page.locator('#trozalRenderEngineGroups [data-engine-select="webgl2"]').click();
      await page.waitForFunction(()=>document.getElementById('trozal3DCanvas')?.style.display==='block');
    }
    const gpuAdapterAvailable=await page.evaluate(async()=>Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
    if(gpuAdapterAvailable){
      await page.locator('#trozalRenderEngineGroups [data-engine-select="webgpu"]').click();
      await page.waitForFunction(()=>document.getElementById('trozal3DCanvasGPU')?.style.display==='block',{timeout:20000});
      const gpuProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
      assert.equal(gpuProject.objects.length,3,'WebGPU must retain and render the same scene.');
      await page.locator('#trozalRenderEngineGroups [data-engine-select="webgl2"]').click();
      await page.waitForFunction(()=>document.getElementById('trozal3DCanvas')?.style.display==='block');
    }

    await page.waitForFunction(()=>window.TROZAL_CANVAS_3D?.status?.webgl===true,null,{timeout:15000});
    const initial=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(initial.objects.length,3,'The starter 3D scene should contain three independently editable meshes.');
    assert.ok(initial.objects.some(o=>o.type==='cube'));
    assert.ok(initial.objects.some(o=>o.type==='sphere'));
    assert.ok(initial.objects.some(o=>o.type==='torus'));
    // Exercise the CPU software renderer without discarding the shared scene state.
    await page.locator('#trozal3DRenderer').selectOption('canvas2d');
    await page.waitForFunction(()=>document.getElementById('trozal3DCanvas2D')?.style.display==='block');
    const cpuFrame=await page.locator('#trozal3DCanvas2D').evaluate(canvas=>{
      const ctx=canvas.getContext('2d');
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let colored=0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i]!==6||pixels[i+1]!==12||pixels[i+2]!==22) colored++;
      return {width:canvas.width,height:canvas.height,colored};
    });
    assert.ok(cpuFrame.width>100&&cpuFrame.height>100,'Canvas 2D backend must allocate a real preview surface.');
    assert.ok(cpuFrame.colored>100,'Canvas 2D CPU renderer must rasterize scene geometry and the floor grid.');
    const cpuScene=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(cpuScene.objects.length,initial.objects.length,'Switching renderers must preserve the shared scene.');
    const cpuPngDownload=page.waitForEvent('download');
    await page.locator('#trozal3DExportPng').click();
    const cpuPng=await cpuPngDownload;
    assert.match(cpuPng.suggestedFilename(),/\.png$/,'Canvas 2D backend must export PNG.');
    assert.ok(require('node:fs').statSync(await cpuPng.path()).size>100,'Canvas 2D PNG export must contain image data.');
    await page.locator('#trozal3DRenderer').selectOption('webgl2');
    await page.waitForFunction(()=>document.getElementById('trozal3DCanvas')?.style.display==='block');

    assert.equal(await page.locator('#trozal3DObjectList button').count(),3);
    assert.equal(initial.camera.projection,'perspective','Perspective should be the default camera projection.');
    await page.locator('#trozal3DCameraProjection').selectOption('orthographic');
    let cameraProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(cameraProject.camera.projection,'orthographic','Orthographic mode should update persisted scene camera state.');
    await page.locator('#trozal3DOrthoScale').evaluate(el=>{el.value='6.2';el.dispatchEvent(new Event('input',{bubbles:true}));});
    cameraProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(cameraProject.camera.orthoScale,6.2,'Orthographic scale should persist in Scene JSON.');
    await page.locator('#trozal3DCameraSide').click();
    cameraProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.ok(Math.abs(cameraProject.camera.yaw-Math.PI/2)<.001,'Side view should rotate the camera by 90 degrees.');
    await page.locator('#trozal3DCameraTop').click();
    cameraProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.ok(cameraProject.camera.pitch>1.4,'Top view should set a near-vertical camera angle.');
    await page.locator('#trozal3DCameraFront').click();
    await page.locator('#trozal3DCameraFocus').click();
    cameraProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(cameraProject.camera.target.length,3,'Focus Selected should set a three-axis camera target.');
    await page.locator('#trozal3DCameraProjection').selectOption('perspective');
    cameraProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(cameraProject.camera.projection,'perspective','Perspective projection should be switchable back on.');
    assert.equal(await page.locator('#trozal3DLightingControls .trozal3d-light-card').count(),3,'Studio lighting rig should expose three independently editable lights.');
    // Surface presets must change real material parameters and persist to Scene JSON.
    await page.locator('#trozal3DMaterialPreset').selectOption('neon');
    let materialProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(materialProject.objects[0].materialPreset,'neon','Selected surface preset should persist.');
    assert.equal(materialProject.objects[0].emission,1.35,'Neon preset should enable emissive output.');
    assert.equal(materialProject.objects[0].metallic,.12,'Neon preset should set metallic response.');
    await page.locator('#trozal3DEmission').evaluate(el=>{el.value='0.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
    materialProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(materialProject.objects[0].emission,.75,'Emission control should update the selected object.');
    assert.equal(materialProject.objects[0].materialPreset,'custom','Manual material edits should switch preset to Custom.');
    await page.locator('#trozal3DMaterialPreset').selectOption('polished-metal');
    materialProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(materialProject.objects[0].metallic,.96,'Polished Metal preset should set a high metallic value.');
    assert.equal(materialProject.objects[0].roughness,.1,'Polished Metal preset should set low roughness.');
    assert.equal(materialProject.objects[0].emission,0,'Non-emissive preset should disable emission.');

    const keyLightIntensity=page.locator('[data-light-index="0"][data-light-field="intensity"]');
    await keyLightIntensity.evaluate(el=>{el.value='1.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
    let lightProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(lightProject.lights.length,3,'Scene JSON should retain all three lights.');
    assert.equal(lightProject.lights[0].intensity,1.75,'Changing one light intensity should update scene data.');
    const fillLightColor=page.locator('[data-light-index="1"][data-light-field="color"]');
    await fillLightColor.evaluate(el=>{el.value='#22cc88';el.dispatchEvent(new Event('input',{bubbles:true}));});
    lightProject=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(lightProject.lights[1].color,'#22cc88','Each light should support independent color editing.');
    // Verify viewport gizmo controls are interactive, not decorative.
    assert.equal(await page.locator('#trozal3DGizmoMove').getAttribute('aria-pressed'),'true');
    await page.locator('#trozal3DGizmoAxis').selectOption('x');
    const beforeGizmo=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject().objects[0].x);
    const viewport=await page.locator('#trozal3DViewport').boundingBox();
    assert.ok(viewport&&viewport.width>100&&viewport.height>100,'3D viewport must have a measurable interaction surface.');
    // Dispatch a deterministic pointer sequence on the viewport itself. This tests
    // the actual pointer handlers without depending on Chromium's mouse hit-testing
    // across the overlapping WebGL/Canvas2D layers or GPU compositor timing.
    await page.locator('#trozal3DViewport').evaluate((el,box)=>{
      const x=box.x+box.width*.5,y=box.y+box.height*.5;
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'mouse',clientX:x,clientY:y,button:0,buttons:1}));
      el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:7,pointerType:'mouse',clientX:x+55,clientY:y,button:0,buttons:1}));
      el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'mouse',clientX:x+55,clientY:y,button:0,buttons:0}));
    },viewport);
    const afterGizmo=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject().objects[0].x);
    assert.ok(afterGizmo>beforeGizmo+.3,'Move gizmo pointer drag on X axis should update the selected object transform. before='+beforeGizmo+' after='+afterGizmo);
    await page.locator('#trozal3DGizmoRotate').click();
    assert.equal(await page.locator('#trozal3DGizmoRotate').getAttribute('aria-pressed'),'true');
    await page.locator('#trozal3DGizmoCamera').click();
    assert.equal(await page.locator('#trozal3DGizmoCamera').getAttribute('aria-pressed'),'true');
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
    // Build a parent-child relationship and verify cycle prevention.
    let project;
    const objectButtons=page.locator('#trozal3DObjectList button');
    await objectButtons.nth(0).click();
    const parentId=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject().objects[0].id);
    await objectButtons.nth(1).click();
    await page.locator('#trozal3DParent').selectOption(parentId);
    project=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.equal(project.objects[1].parentId,parentId,'Child should retain its selected parent.');
    await objectButtons.nth(0).click();
    await page.locator('#trozal3DParent').selectOption(project.objects[1].id);
    project=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.notEqual(project.objects[0].parentId,project.objects[1].id,'Hierarchy must reject cyclic parent assignments.');
    await page.locator('#trozal3DTime').evaluate(el=>{el.value='1.5';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#trozal3DX').evaluate(el=>{el.value='1.8';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#trozal3DAddKeyframe').click();
    project=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
    assert.ok(project.objects[0].keyframes.some(k=>Math.abs(k.time-1.5)<.01),'Keyframe should be stored at the playhead.');
    assert.equal(project.objects[0].keyframes.find(k=>Math.abs(k.time-1.5)<.01).values.x,1.8,'Keyframe should capture transform values.');
    
    project=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
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
    const png=await pngDownload;
    assert.match(png.suggestedFilename(),/\.png$/);
    await page.waitForFunction(()=>/PNG snapshot exported · \d+×\d+ · \d+ bytes/.test(document.getElementById('trozal3DStatus')?.textContent||''),null,{timeout:10000});
    const pngStatus=await page.locator('#trozal3DStatus').innerText();
    const pngPath=await png.path();
    const pngBytes=require('node:fs').statSync(pngPath).size;
    assert.ok(pngBytes>100,'PNG download must contain actual image bytes.');
    assert.match(pngStatus,/PNG snapshot exported · \d+×\d+ · \d+ bytes/,'PNG export must report actual snapshot dimensions and byte count.');
    assert.equal(Number(pngStatus.match(/· (\d+) bytes/)[1]),pngBytes,'Reported PNG byte count must match the downloaded file.');
    assert.deepEqual(errors,[],'Unexpected uncaught browser errors.');
    await page.locator('#trozal3DClose').click();
    assert.equal(await page.locator('#trozalCanvas3DOverlay').evaluate(el=>getComputedStyle(el).display),'none');
    console.log(JSON.stringify({result:'PASS',renderer:'WebGL2',initialMeshes:3,addedMesh:'cylinder',duplicateDelete:'PASS',transform:'PASS',viewportGizmo:['move','rotate','camera'],perObjectAnimation:'PASS',timeline:'PASS',loop:'PASS',lighting:['three independent lights','intensity','color'],exports:['JSON','PNG']},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
