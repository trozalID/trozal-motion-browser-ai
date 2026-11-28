'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {Buffer}=require('node:buffer');
function bytesFloat(values){const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));return b;}
function bytesU16(values){const b=Buffer.alloc(values.length*2);values.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b;}
function glbFixture(){
 const chunks=[],views=[];let offset=0;const add=b=>{const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}const start=offset;chunks.push(b);offset+=b.length;views.push({buffer:0,byteOffset:start,byteLength:b.length});return views.length-1;};
 const pv=add(bytesFloat([-.5,0,0,.5,0,0,0,1,0])),jv=add(bytesU16([1,0,0,0,1,0,0,0,1,0,0,0])),wv=add(bytesFloat([1,0,0,0,1,0,0,0,1,0,0,0])),iv=add(bytesU16([0,1,2]));
 const ibm=Array.from({length:16},(_,i)=>i%5===0?1:0).concat(Array.from({length:16},(_,i)=>i%5===0?1:0));ibm[29]=-1;const bv=add(bytesFloat(ibm)),tv=add(bytesFloat([0,1])),ov=add(bytesFloat([0,1,0,0,2,0])),bin=Buffer.concat(chunks);
 const json={asset:{version:'2.0'},buffers:[{byteLength:bin.length}],bufferViews:views,accessors:[{bufferView:pv,componentType:5126,count:3,type:'VEC3'},{bufferView:jv,componentType:5123,count:3,type:'VEC4'},{bufferView:wv,componentType:5126,count:3,type:'VEC4'},{bufferView:iv,componentType:5123,count:3,type:'SCALAR'},{bufferView:bv,componentType:5126,count:2,type:'MAT4'},{bufferView:tv,componentType:5126,count:2,type:'SCALAR'},{bufferView:ov,componentType:5126,count:2,type:'VEC3'}],nodes:[{name:'Dragon Mesh',mesh:0,skin:0},{name:'Root Joint',children:[2]},{name:'Wing Tip',translation:[0,1,0]}],skins:[{name:'Dragon Rig',joints:[1,2],skeleton:1,inverseBindMatrices:4}],meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},indices:3,mode:4}]}],animations:[{name:'Wing Lift',samplers:[{input:5,output:6,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:2,path:'translation'}}]}]};
 const jb=Buffer.from(JSON.stringify(json)),jp=Buffer.concat([jb,Buffer.alloc((4-jb.length%4)%4,0x20)]),bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
 const h=Buffer.alloc(12);h.writeUInt32LE(0x46546c67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(12+8+jp.length+8+bp.length,8);
 const jh=Buffer.alloc(8);jh.writeUInt32LE(jp.length,0);jh.writeUInt32LE(0x4e4f534a,4);const bh=Buffer.alloc(8);bh.writeUInt32LE(bp.length,0);bh.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([h,jh,jp,bh,bp]);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.TROZAL_CANVAS3D_SKELETAL&&!!window.TROZAL_CANVAS_3D,{timeout:15000});
  await page.locator('#trozalCanvas3DOpen').click();
  await page.waitForSelector('#trozal3DHeader');
  const bytes=glbFixture().toString('base64');
  const result=await page.evaluate(async base64=>{
   const binary=atob(base64),data=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);
   const file={name:'dragon-fixture.glb',arrayBuffer:async()=>data.buffer};
   const asset=await TROZAL_CANVAS3D_SKELETAL.parseFiles([file],file);
   const imported=await TROZAL_CANVAS_3D.importSkinnedGLTF(asset);
   const roundTrip=JSON.parse(JSON.stringify(TROZAL_CANVAS_3D.getProject()));
   TROZAL_CANVAS_3D.applyProject(roundTrip);
   const pose0=TROZAL_CANVAS3D_SKELETAL.computePose(asset,0,0),poseMid=TROZAL_CANVAS3D_SKELETAL.computePose(asset,0,.5);
   return {imported,renderer:TROZAL_CANVAS_3D.status.renderer,project:TROZAL_CANVAS_3D.getProject(),pose0:pose0.skinsByNode['0'][29],poseMid:poseMid.skinsByNode['0'][29],clipValue:document.getElementById('trozal3DSkeletalClip').value,clipOptions:document.getElementById('trozal3DSkeletalClip').options.length,skinInfo:document.getElementById('trozal3DSkeletalInfo').textContent};
  },bytes);
  assert.equal(result.renderer,'webgl2','Skinned asset should switch to the WebGL2 GPU skinning path.');
  assert.equal(result.imported.nodes,3);assert.equal(result.imported.joints,2);assert.equal(result.imported.clips.length,1);
  assert.equal(result.project.skeletalAssets.length,1,'Skeletal asset must survive Scene JSON save/load.');
  await page.locator('#t3dMultiOpen').click();
  await page.waitForFunction(()=>document.getElementById('t3dMultiPanel')&&!document.getElementById('t3dMultiPanel').hidden);
  await page.locator('#t3dMultiMode').selectOption('json');
  const savedScene=await page.evaluate(()=>JSON.stringify(TROZAL_CANVAS_3D.getProject()));
  await page.locator('#t3dMultiCode').fill(savedScene);
  await page.locator('#t3dMultiValidate').click();
  await page.waitForFunction(()=>document.getElementById('t3dMultiStatus').textContent.includes('Validasi berhasil · JSON.'));
  await page.locator('#t3dMultiApply').click();
  await page.waitForFunction(()=>TROZAL_CANVAS_3D.getProject().skeletalAssets?.length===1);
  assert.ok(result.project.objects.some(o=>o.skeletal),'Scene objects must retain skeletal primitive references.');
  assert.equal(result.clipValue,'0');assert.equal(result.clipOptions,2);
  assert.ok(result.skinInfo.includes('WebGL2 GPU skinning'));
  assert.ok(Math.abs(result.pose0)<1e-5&&Math.abs(result.poseMid-.5)<1e-4,'Animation must update joint matrices across the clip.');
  const glState=await page.evaluate(()=>{const c=document.getElementById('trozal3DCanvas'),gl=c.getContext('webgl2');gl.finish();return {error:gl.getError(),width:c.width,height:c.height};});
  assert.equal(glState.error,0,'WebGL2 skinning draw should not leave a GL error.');
  assert.deepEqual(errors,[],'Unexpected browser errors.');
  console.log(JSON.stringify({result:'PASS',gpuSkinning:'WebGL2 vertex shader + float joint-matrix texture',glbImport:'PASS',hierarchy:'PASS',inverseBind:'PASS',animationClip:'PASS',sceneJsonRoundTrip:'PASS',glError:glState.error},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
