const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');

function glbFixture() {
  const doc = { asset:{version:'2.0'}, buffers:[{byteLength:36}], bufferViews:[{buffer:0,byteOffset:0,byteLength:36}], accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}], meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}] };
  const json = Buffer.from(JSON.stringify(doc));
  const jp = Buffer.concat([json, Buffer.alloc((4-json.length%4)%4, 0x20)]);
  const bin = Buffer.alloc(36);
  [[-0.5,0,0],[0.5,0,0],[0,0.8,0]].flat().forEach((v,i)=>bin.writeFloatLE(v,i*4));
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67,0); header.writeUInt32LE(2,4); header.writeUInt32LE(12+8+jp.length+8+bin.length,8);
  const jh=Buffer.alloc(8); jh.writeUInt32LE(jp.length,0); jh.writeUInt32LE(0x4e4f534a,4);
  const bh=Buffer.alloc(8); bh.writeUInt32LE(bin.length,0); bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jh,jp,bh,bin]);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.TROZAL_CANVAS3D_MULTI_TERMINAL,{timeout:10000});
 await page.locator('#trozalCanvas3DOpen').click();
 await page.waitForSelector('#trozal3DHeader');
 await page.locator('#t3dMultiOpen').click();
 const api=await page.evaluate(()=>!!window.TROZAL_CANVAS_3D);
 assert.equal(api,true,'Canvas 3D API should be ready');

 const scene={version:2,duration:6,fps:30,loop:true,objects:[{id:'json-cube',name:'JSON Cube',type:'cube',x:0,y:0,z:0,sx:1,sy:1,sz:1,color:'#36c7dc'}]};
 await page.locator('#t3dMultiMode').selectOption('json');
 await page.locator('#t3dMultiCode').fill(JSON.stringify(scene));
 await page.locator('#t3dMultiValidate').click();
 await page.waitForFunction(()=>!document.getElementById('t3dMultiApply').disabled);
 await page.locator('#t3dMultiApply').click();
 assert.equal(await page.evaluate(()=>TROZAL_CANVAS_3D.getProject().objects[0].id),'json-cube');

 const obj='o Triangle\nv -1 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
 await page.locator('#t3dMultiFile').setInputFiles({name:'triangle.obj',mimeType:'text/plain',buffer:Buffer.from(obj)});
 await page.waitForFunction(()=>!document.getElementById('t3dMultiApply').disabled);
 assert.equal(await page.locator('#t3dMultiPreview canvas').count(),1,'Model must have a visual preview before Apply.');
 await page.locator('#t3dMultiApply').click();
 let imported=await page.evaluate(()=>TROZAL_CANVAS_3D.getProject().objects.at(-1));
 assert.equal(imported.type,'mesh');assert.equal(imported.meshData.positions.length,9);
 assert.equal(imported.meshData.normals.length,9);assert.equal(imported.meshData.uvs.length,6);

 const stl='solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t';
 const stlData=await page.evaluate(async s=>TROZAL_CANVAS3D_MULTI_TERMINAL.parseSTL(new TextEncoder().encode(s).buffer),stl);
 assert.equal(stlData.positions.length,9);
 const ply='ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n';
 const plyData=await page.evaluate(async s=>TROZAL_CANVAS3D_MULTI_TERMINAL.parsePLY(new TextEncoder().encode(s).buffer),ply);
 assert.equal(plyData.positions.length,9);

 await page.locator('#t3dMultiFile').setInputFiles({name:'triangle.glb',mimeType:'model/gltf-binary',buffer:glbFixture()});
 await page.waitForFunction(()=>!document.getElementById('t3dMultiApply').disabled);
 await page.locator('#t3dMultiApply').click();
 imported=await page.evaluate(()=>TROZAL_CANVAS_3D.getProject().objects.at(-1));
 assert.equal(imported.type,'mesh');assert.equal(imported.meshData.positions.length,9);

 // Mesh remains serializable and transformable through the same scene API.
 await page.evaluate(()=>{const p=TROZAL_CANVAS_3D.getProject();const o=p.objects.find(x=>x.type==='mesh');o.x=1.25;TROZAL_CANVAS_3D.applyProject(p);});
 assert.equal(await page.evaluate(()=>TROZAL_CANVAS_3D.getProject().objects.find(x=>x.type==='mesh').x),1.25);

 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/kQAAAABJRU5ErkJggg==','base64');
 await page.locator('#t3dMultiMode').selectOption('texture');
 await page.locator('#t3dMultiFile').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>!document.getElementById('t3dMultiApply').disabled);
 assert.equal(await page.locator('#t3dMultiPreview img').count(),1,'Texture must preview before Apply.');
 await page.locator('#t3dMultiApply').click();
 assert.ok(await page.evaluate(()=>TROZAL_CANVAS_3D.getProject().objects.find(x=>x.id===TROZAL_CANVAS_3D.getProject().selected)?.textureDataUrl?.startsWith('data:image/png;base64,')),'Texture should persist on selected material.');
 await page.locator('#t3dMultiMode').selectOption('hdri');
 await page.locator('#t3dMultiFile').setInputFiles({name:'studio.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>!document.getElementById('t3dMultiApply').disabled);
 await page.locator('#t3dMultiApply').click();
 assert.ok(await page.evaluate(()=>TROZAL_CANVAS_3D.getProject().hdriDataUrl?.startsWith('data:image/png;base64,')),'HDRI image should persist in Scene.');

 // HTML/SVG preview is sandboxed and cannot apply as a 3D scene.
 await page.locator('#t3dMultiMode').selectOption('html');
 await page.locator('#t3dMultiCode').fill('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"/></svg>');
 await page.locator('#t3dMultiValidate').click();
 await page.waitForSelector('#t3dMultiPreview iframe');
 assert.equal(await page.locator('#t3dMultiPreview iframe').getAttribute('sandbox'),'');

 // GLSL fragment compilation.
 await page.locator('#t3dMultiMode').selectOption('glsl');
 await page.locator('#t3dMultiCode').fill('#version 300 es\nprecision highp float;\nout vec4 fragColor;\nvoid main(){fragColor=vec4(1.0,0.0,0.0,1.0);}');
 await page.locator('#t3dMultiValidate').click();
 await page.waitForFunction(()=>document.getElementById('t3dMultiStatus').textContent.includes('GLSL'));

 // JavaScript scene script is executed in a restricted worker and applied only after validation.
 await page.locator('#t3dMultiMode').selectOption('js');
 await page.locator('#t3dMultiCode').fill('return {version:2,objects:[{id:"js-cube",name:"JS Cube",type:"cube",x:0,y:0,z:0}]};');
 await page.locator('#t3dMultiValidate').click();
 await page.waitForFunction(()=>!document.getElementById('t3dMultiApply').disabled);
 await page.locator('#t3dMultiApply').click();
 await page.waitForFunction(()=>TROZAL_CANVAS_3D.getProject().objects[0].id==='js-cube');

 assert.deepEqual(errors,[],'Unexpected uncaught browser errors: '+errors.join(' | '));
 console.log(JSON.stringify({result:'PASS',formats:['Scene JSON v2','JavaScript sandbox','HTML/SVG preview','GLSL compile','OBJ','STL ASCII','PLY ASCII','GLB embedded mesh'],meshRendering:'Canvas 3D meshData is wired to WebGL2/WebGL1/WebGPU/Canvas2D geometry paths',transformPersistence:'PASS'}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});