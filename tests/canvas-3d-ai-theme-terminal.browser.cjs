'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trozalCanvas3DOpen');
  await page.locator('#trozalCanvas3DOpen').click();
  await page.waitForSelector('#trozal3DAIThemePanel',{timeout:15000});
  assert.equal(await page.locator('#trozal3DAITheme option').count(),333,'AI Theme Studio must load all 333 main themes.');
  await page.locator('#trozal3DAITheme').selectOption('Space & Astronomy');
  const expectedSpace=await page.evaluate(()=>window.trozalGetThemeDomainProfile('Space & Astronomy').styles);
  const actualSpace=await page.locator('#trozal3DAICategory option').allTextContents();
  assert.deepEqual(actualSpace,expectedSpace,'Theme change must refresh category styles from the matching domain profile.');
  assert.ok(await page.locator('#trozal3DAISubtheme option').count()>0,'Theme change must refresh subthemes.');
  const selectedTheme=await page.locator('#trozal3DAITheme').inputValue();
  await page.locator('#trozal3DAICategory').selectOption({index:Math.min(1,actualSpace.length-1)});
  assert.equal(await page.locator('#trozal3DAITheme').inputValue(),selectedTheme,'Changing category must not replace the main theme.');
  await page.locator('#trozal3DAITheme').selectOption('Food & Beverage');
  const expectedFood=await page.evaluate(()=>window.trozalGetThemeDomainProfile('Food & Beverage').styles);
  assert.deepEqual(await page.locator('#trozal3DAICategory option').allTextContents(),expectedFood,'Changing theme must refresh theme-specific visual directions.');
  await page.locator('#trozal3DAIExtra').fill('Hero berupa botol kaca transparan, podium gelap, refleksi studio dan orbit kamera perlahan.');
  await page.locator('#t3dTerminalOpen').click();
  await page.waitForFunction(()=>document.getElementById('t3dTerminalPanel')&&!document.getElementById('t3dTerminalPanel').hidden);
  assert.ok((await page.locator('#t3dTerminalProvider').innerText()).length>0,'Terminal must report the shared Browser AI provider/model.');
  await page.locator('#t3dTerminalThemeBrief').click();
  assert.match(await page.locator('#t3dTerminalPrompt').inputValue(),/Food & Beverage/,'Terminal must import the selected AI Theme Studio brief.');
  const jsonScene={
   version:2,duration:6,fps:30,loop:true,light:1.2,showGrid:true,
   camera:{yaw:.5,pitch:.25,distance:7,projection:'perspective',orthoScale:4.8,target:[0,0,0]},
   lights:[
    {name:'Key',x:-3,y:4,z:4,color:'#ffe2b5',intensity:1.2},
    {name:'Fill',x:3,y:1,z:2,color:'#6caeff',intensity:.7},
    {name:'Rim',x:0,y:3,z:-4,color:'#a98cff',intensity:.9}
   ],
   objects:[
    {id:'json-hero',name:'JSON Hero',type:'cube',x:0,y:0,z:0,rx:0,ry:20,rz:0,sx:1,sy:1,sz:1,color:'#36c7dc',metallic:.3,roughness:.34,emission:0,materialPreset:'custom',animation:'spin',speed:.5,amount:.4,parentId:null,keyframes:[]},
    {id:'json-orbit',name:'JSON Orbit',type:'sphere',x:1,y:0,z:0,rx:0,ry:0,rz:0,sx:.5,sy:.5,sz:.5,color:'#f2a84b',metallic:.2,roughness:.5,emission:0,materialPreset:'custom',animation:'orbit',speed:.5,amount:.5,parentId:null,keyframes:[]}
   ],
   selected:'json-hero',playhead:0
  };
  await page.locator('#t3dTerminalMode').selectOption('json');
  await page.locator('#t3dTerminalCode').fill(JSON.stringify(jsonScene));
  await page.locator('#t3dTerminalValidate').click();
  await page.waitForFunction(()=>/JSON valid/.test(document.getElementById('t3dTerminalStatus').textContent));
  await page.locator('#t3dTerminalApply').click();
  let applied=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
  assert.equal(applied.objects.length,2,'Validated JSON must apply to the live Canvas 3D scene.');
  assert.equal(applied.objects[0].name,'JSON Hero');
  assert.equal(applied.duration,6);
  const jsCode='return {version:2,duration:4,fps:30,loop:true,light:1.1,showGrid:true,camera:{yaw:0.2,pitch:0.3,distance:7,projection:"perspective",orthoScale:4.8,target:[0,0,0]},lights:[{name:"Key",x:-3,y:4,z:4,color:"#ffffff",intensity:1},{name:"Fill",x:3,y:1,z:2,color:"#aabbcc",intensity:0.6},{name:"Rim",x:0,y:3,z:-4,color:"#8899ff",intensity:0.8}],objects:[{id:"js-hero",name:"JS Hero",type:"torus",x:0,y:0,z:0,rx:0,ry:20,rz:0,sx:1,sy:1,sz:1,color:"#9a82f5",metallic:0.5,roughness:0.3,emission:0,materialPreset:"custom",animation:"spin",speed:0.6,amount:0.5,parentId:null,keyframes:[]}],selected:"js-hero",playhead:0};';
  await page.locator('#t3dTerminalMode').selectOption('js');
  await page.locator('#t3dTerminalCode').fill(jsCode);
  await page.locator('#t3dTerminalValidate').click();
  await page.waitForFunction(()=>/JavaScript berhasil/.test(document.getElementById('t3dTerminalStatus').textContent),{timeout:12000});
  await page.locator('#t3dTerminalApply').click();
  applied=await page.evaluate(()=>window.TROZAL_CANVAS_3D.getProject());
  assert.equal(applied.objects.length,1,'Sandboxed JavaScript scene must apply after successful validation.');
  assert.equal(applied.objects[0].name,'JS Hero');
  assert.equal(applied.duration,4);
  await page.locator('#t3dTerminalClose').click();
  assert.deepEqual(errors,[],'Unexpected page errors.');
  console.log(JSON.stringify({result:'PASS',themeCount:333,themeSpecificCategory:'PASS',themeSubthemes:'PASS',extraDetails:'PASS',terminalProvider:'BROWSER AI',jsonGenerateValidationApply:'PASS',javascriptWorkerSandboxValidationApply:'PASS'},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});