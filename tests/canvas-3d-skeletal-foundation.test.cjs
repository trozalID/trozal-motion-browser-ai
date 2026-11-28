'use strict';
const assert=require('node:assert/strict');
const Skeletal=require('../canvas-3d-skeletal.js');

function bytesFloat(values){const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));return b;}
function bytesU16(values){const b=Buffer.alloc(values.length*2);values.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b;}
function fixture(){
 const chunks=[],views=[];let offset=0;
 const add=(buffer)=>{const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}const start=offset;chunks.push(buffer);offset+=buffer.length;views.push({buffer:0,byteOffset:start,byteLength:buffer.length});return views.length-1;};
 const positionView=add(bytesFloat([-.5,0,0,.5,0,0,0,1,0]));
 const jointsView=add(bytesU16([1,0,0,0,1,0,0,0,1,0,0,0]));
 const weightsView=add(bytesFloat([1,0,0,0,1,0,0,0,1,0,0,0]));
 const indexView=add(bytesU16([0,1,2]));
 const ibm=Array.from({length:16},(_,i)=>i%5===0?1:0).concat(Array.from({length:16},(_,i)=>i%5===0?1:0));ibm[16+13]=-1;
 const ibmView=add(bytesFloat(ibm));
 const timeView=add(bytesFloat([0,1]));
 const outputView=add(bytesFloat([0,1,0,0,2,0]));
 const bin=Buffer.concat(chunks);
 const json={
  asset:{version:'2.0',generator:'TROZAL skeletal test fixture'},
  buffers:[{byteLength:bin.length}],
  bufferViews:views,
  accessors:[
   {bufferView:positionView,componentType:5126,count:3,type:'VEC3'},
   {bufferView:jointsView,componentType:5123,count:3,type:'VEC4'},
   {bufferView:weightsView,componentType:5126,count:3,type:'VEC4'},
   {bufferView:indexView,componentType:5123,count:3,type:'SCALAR'},
   {bufferView:ibmView,componentType:5126,count:2,type:'MAT4'},
   {bufferView:timeView,componentType:5126,count:2,type:'SCALAR'},
   {bufferView:outputView,componentType:5126,count:2,type:'VEC3'}
  ],
  nodes:[
   {name:'Dragon Mesh',mesh:0,skin:0},
   {name:'Root Joint',children:[2]},
   {name:'Wing Tip',translation:[0,1,0]}
  ],
  skins:[{name:'Dragon Rig',joints:[1,2],skeleton:1,inverseBindMatrices:4}],
  meshes:[{name:'Dragon Wing',primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},indices:3,mode:4}]}],
  animations:[{name:'Wing Lift',samplers:[{input:5,output:6,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:2,path:'translation'}}]}],
  scenes:[{nodes:[0,1]}],scene:0
 };
 return {json,bin};
}
function glb({json,bin}){
 const jb=Buffer.from(JSON.stringify(json)),jp=Buffer.concat([jb,Buffer.alloc((4-jb.length%4)%4,0x20)]);
 const bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
 const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jp.length+8+bp.length,8);
 const jh=Buffer.alloc(8);jh.writeUInt32LE(jp.length,0);jh.writeUInt32LE(0x4e4f534a,4);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(bp.length,0);bh.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,jh,jp,bh,bp]);
}
const {json,bin}=fixture();
(async()=>{
 const data=glb({json,bin});
 const root={name:'dragon-test.glb',arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
 const asset=await Skeletal.parseFiles([root],root);
 assert.ok(asset,'A skinned GLB should return a skeletal asset.');
 assert.equal(asset.nodes.length,3);
 assert.equal(asset.skins.length,1);
 assert.deepEqual(asset.skins[0].joints,[1,2]);
 assert.equal(asset.primitives.length,1);
 assert.equal(asset.primitives[0].positions.length,9);
 assert.equal(asset.primitives[0].joints.length,12);
 assert.equal(asset.primitives[0].weights.length,12);
 assert.equal(asset.animations.length,1);
 assert.equal(asset.animations[0].name,'Wing Lift');
 const rest=Skeletal.computePose(asset,0,0);
 const lifted=Skeletal.computePose(asset,0,.5);
 const restSkin=rest.skinsByNode['0'],liftedSkin=lifted.skinsByNode['0'];
 assert.ok(restSkin&&liftedSkin,'Skin matrices must be generated for the mesh node.');
 assert.ok(Math.abs(restSkin[16+13])<1e-5,'Inverse bind matrix should cancel the bind-pose joint translation.');
 assert.ok(Math.abs(liftedSkin[16+13]-.5)<1e-4,'Animation sampling should move the joint and update its skin matrix.');
 const saved=Skeletal.sanitizeAsset(JSON.parse(JSON.stringify(asset)));
 assert.equal(saved.activeClip,0);
 assert.equal(Skeletal.computePose(saved,0,.5).skinsByNode['0'][16+13],liftedSkin[16+13]);

 const gltfJson=JSON.parse(JSON.stringify(json));gltfJson.buffers[0].uri='dragon.bin';
 const gltfRoot={name:'dragon.gltf',arrayBuffer:async()=>Buffer.from(JSON.stringify(gltfJson))};
 const binFile={name:'dragon.bin',arrayBuffer:async()=>bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength)};
 const external=await Skeletal.parseFiles([gltfRoot,binFile],gltfRoot);
 assert.equal(external.primitives.length,1,'External .bin dependencies should resolve when uploaded with .gltf.');

 const ordinary=JSON.parse(JSON.stringify(json));ordinary.skins=[];ordinary.nodes[0].skin=undefined;
 const ordinaryRoot={name:'static.gltf',arrayBuffer:async()=>Buffer.from(JSON.stringify(ordinary))};
 assert.equal(await Skeletal.parseFiles([ordinaryRoot],ordinaryRoot),null,'Static glTF should remain on the legacy mesh import path.');

 const malformed=JSON.parse(JSON.stringify(json));malformed.nodes[0].skin=4;
 const malformedRoot={name:'bad.gltf',arrayBuffer:async()=>Buffer.from(JSON.stringify(malformed))};
 await assert.rejects(()=>Skeletal.parseFiles([malformedRoot,binFile],malformedRoot),/references a missing skin/i);

 console.log('PASS: GLB + external-buffer glTF skeletal parsing, node hierarchy, inverse bind matrices, vertex influences, animation clips, animated skin matrices, serialization, and safe static-mesh fallback.');
})().catch(error=>{console.error(error);process.exit(1);});
