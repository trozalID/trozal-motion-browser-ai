/* TROZAL MOTION · CANVAS 3D SKELETAL FOUNDATION
 * glTF 2.0 skin/animation parser and deterministic pose evaluator.
 * No network access, third-party runtime, or renderer side effects.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.TROZAL_CANVAS3D_SKELETAL=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
'use strict';
const MAX_FILE_BYTES=40*1024*1024,MAX_NODES=512,MAX_SKINS=64,MAX_JOINTS=256,MAX_PRIMITIVES=128,MAX_VERTICES=450000,MAX_ANIMATIONS=64;
const TYPES={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const COMPONENTS={
  5120:{bytes:1,get:'getInt8',signed:true,max:127},
  5121:{bytes:1,get:'getUint8',max:255},
  5122:{bytes:2,get:'getInt16',signed:true,max:32767},
  5123:{bytes:2,get:'getUint16',max:65535},
  5125:{bytes:4,get:'getUint32',max:4294967295},
  5126:{bytes:4,get:'getFloat32'}
};
function fail(message){throw new Error('GLTF skeletal import: '+message);}
function finiteArray(values,name,limit){if(!Array.isArray(values)||values.length>limit||values.some(v=>!Number.isFinite(Number(v))))fail(name+' array invalid or exceeds limit.');}
function identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function multiply(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function invert(a){
 const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
 const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
 let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!Number.isFinite(det)||Math.abs(det)<1e-12)fail('node transform is singular and cannot be inverted.');det=1/det;
 return [(a11*b11-a12*b10+a13*b09)*det,(a02*b10-a01*b11-a03*b09)*det,(a31*b05-a32*b04+a33*b03)*det,(a22*b04-a21*b05-a23*b03)*det,(a12*b08-a10*b11-a13*b07)*det,(a00*b11-a02*b08+a03*b07)*det,(a32*b02-a30*b05-a33*b01)*det,(a20*b05-a22*b02+a23*b01)*det,(a10*b10-a11*b08+a13*b06)*det,(a01*b08-a00*b10-a03*b06)*det,(a30*b04-a31*b02+a33*b00)*det,(a21*b02-a20*b04-a23*b00)*det,(a11*b07-a10*b09-a12*b06)*det,(a00*b09-a01*b07+a02*b06)*det,(a31*b01-a30*b03-a32*b00)*det,(a20*b03-a21*b01+a22*b00)*det];
}
function normalizeQuat(q){const l=Math.hypot(q[0],q[1],q[2],q[3])||1;return q.map(v=>v/l);}
function quatSlerp(a,b,t){let dot=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],bb=b;if(dot<0){dot=-dot;bb=b.map(v=>-v);}if(dot>.9995)return normalizeQuat(a.map((v,i)=>v+(bb[i]-v)*t));const theta=Math.acos(Math.max(-1,Math.min(1,dot))),sin=Math.sin(theta);if(Math.abs(sin)<1e-7)return a.slice();const x=Math.sin((1-t)*theta)/sin,y=Math.sin(t*theta)/sin;return normalizeQuat(a.map((v,i)=>v*x+bb[i]*y));}
function composeTRS(translation,rotation,scale){
 const q=normalizeQuat(rotation),x=q[0],y=q[1],z=q[2],w=q[3],x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2,sx=scale[0],sy=scale[1],sz=scale[2];
 return [(1-(yy+zz))*sx,(xy+wz)*sx,(xz-wy)*sx,0,(xy-wz)*sy,(1-(xx+zz))*sy,(yz+wx)*sy,0,(xz+wy)*sz,(yz-wx)*sz,(1-(xx+yy))*sz,0,translation[0],translation[1],translation[2],1];
}
function localNodeMatrix(node,trs){
 if(node.matrix&&!trs)return node.matrix.slice();
 return composeTRS(trs?.translation||node.translation,trs?.rotation||node.rotation,trs?.scale||node.scale);
}
function worldMatrices(nodes,locals){
 const worlds=new Array(nodes.length),visiting=new Uint8Array(nodes.length);
 function visit(index){
  if(worlds[index])return worlds[index];
  if(visiting[index])fail('node hierarchy contains a cycle.');
  visiting[index]=1;const parent=nodes[index].parent;
  worlds[index]=parent==null?locals[index]:multiply(visit(parent),locals[index]);
  visiting[index]=0;return worlds[index];
 }
 for(let i=0;i<nodes.length;i++)visit(i);
 return worlds;
}
function decodeBase64(value){
 const raw=value.replace(/\s/g,'');
 if(typeof atob==='function'){const binary=atob(raw),out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out.buffer;}
 if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(raw,'base64')).buffer;
 fail('base64 decoder is not available.');
}
function dataUri(uri){
 const comma=uri.indexOf(',');if(comma<0)fail('malformed embedded buffer URI.');
 const meta=uri.slice(0,comma),body=uri.slice(comma+1);
 if(/;base64/i.test(meta))return decodeBase64(body);
 const decoded=decodeURIComponent(body);return new TextEncoder().encode(decoded).buffer;
}
async async function readContainer(files,rootFile){
 if(!rootFile)fail('select a .glb or .gltf file.');
 const list=Array.from(files||[]),totalBytes=list.reduce((sum,file)=>sum+(Number(file.size)||0),0);if(totalBytes>MAX_FILE_BYTES)fail('combined GLB/glTF and external buffer files exceed 40 MB.');
 const map=new Map(list.map(f=>[String(f.name).toLowerCase(),f]));
 let json=null,binaryChunks=[];
 const rootBytes=await rootFile.arrayBuffer();if(rootBytes.byteLength>MAX_FILE_BYTES)fail('file exceeds 40 MB limit.');
 const ext=String(rootFile.name).split('.').pop().toLowerCase();
 if(ext==='glb'){
  if(rootBytes.byteLength<20)fail('GLB header is truncated.');
  const view=new DataView(rootBytes);if(view.getUint32(0,true)!==0x46546c67)fail('invalid GLB magic.');
  if(view.getUint32(4,true)!==2)fail('only glTF 2.0 GLB is supported.');
  const declared=view.getUint32(8,true);if(declared>rootBytes.byteLength||declared<20)fail('GLB declared length is invalid.');
  let offset=12;while(offset+8<=declared){const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true),start=offset+8,end=start+length;if(end>declared)fail('GLB chunk exceeds file length.');
   const chunk=rootBytes.slice(start,end);if(type===0x4e4f534a){json=JSON.parse(new TextDecoder().decode(chunk).replace(/\0+$/,'').trim());}
   else if(type===0x004e4942)binaryChunks.push(chunk);
   offset=end;
  }
  if(!json)fail('GLB JSON chunk is missing.');
 }else if(ext==='gltf'){json=JSON.parse(new TextDecoder().decode(rootBytes));}
 else fail('supported skeletal files: GLB and glTF 2.0.');
 if(!json.asset||String(json.asset.version)!=='2.0')fail('asset.version must be 2.0.');
 const buffers=[];
 for(let i=0;i<(json.buffers||[]).length;i++){
  const def=json.buffers[i];let bytes;
  if(def.uri&&def.uri.startsWith('data:'))bytes=dataUri(def.uri);
  else if(def.uri){const decoded=decodeURIComponent(def.uri.split(/[?#]/)[0]),name=decoded.split('/').pop().toLowerCase(),file=map.get(name);if(!file)fail('external buffer "'+name+'" is missing. Select the .gltf and its .bin file together.');if(Number(file.size)>MAX_FILE_BYTES)fail('external buffer exceeds 40 MB.');bytes=await file.arrayBuffer();}
  else if(binaryChunks[i])bytes=binaryChunks[i];
  else if(binaryChunks.length===1)bytes=binaryChunks[0];
  else fail('buffer '+i+' has no embedded data.');
  if(bytes.byteLength<Number(def.byteLength||0))fail('buffer '+i+' is shorter than byteLength.');
  buffers.push(bytes);
 }
 return {json,buffers};
}
function accessorReader(json,buffers){
 return function(index){
  const a=json.accessors?.[index];if(!a)fail('accessor '+index+' is missing.');
  if(a.sparse)fail('sparse accessors are not supported in this first release.');
  const size=TYPES[a.type],component=COMPONENTS[a.componentType],viewDef=json.bufferViews?.[a.bufferView],buffer=buffers[viewDef?.buffer];
  if(!size||!component||!viewDef||!buffer)fail('accessor '+index+' has unsupported type or bufferView.');
  const count=Number(a.count),offset=Number(viewDef.byteOffset||0)+Number(a.byteOffset||0),stride=Number(viewDef.byteStride||size*component.bytes);
  if(!Number.isInteger(count)||count<1||count>MAX_VERTICES*4)fail('accessor '+index+' count is invalid or too large.');
  if(stride<size*component.bytes||stride%component.bytes!==0)fail('accessor '+index+' byteStride is invalid.');
  const end=offset+(count-1)*stride+size*component.bytes;if(offset<0||end>buffer.byteLength||end>Number(viewDef.byteOffset||0)+Number(viewDef.byteLength||buffer.byteLength))fail('accessor '+index+' exceeds its bufferView.');
  const data=new DataView(buffer),out=new Array(count*size);let p=0;
  for(let i=0;i<count;i++)for(let j=0;j<size;j++){
   let v=data[component.get](offset+i*stride+j*component.bytes,component.bytes>1);
   if(a.normalized&&a.componentType!==5126){if(component.signed)v=Math.max(v/component.max,-1);else v=v/component.max;}
   out[p++]=v;
  }
  return {data:out,count,size,componentType:a.componentType,normalized:!!a.normalized,type:a.type};
 };
}
function triangleIndices(indices,mode){
 const out=[];
 if(mode===4){if(indices.length%3!==0)fail('TRIANGLES index count must be divisible by 3.');for(let i=0;i<indices.length;i+=3)out.push(indices[i],indices[i+1],indices[i+2]);}
 else if(mode===5){for(let i=0;i+2<indices.length;i++){if(i%2===0)out.push(indices[i],indices[i+1],indices[i+2]);else out.push(indices[i+1],indices[i],indices[i+2]);}}
 else if(mode===6){for(let i=1;i+1<indices.length;i++)out.push(indices[0],indices[i],indices[i+1]);}
 else fail('mesh primitive mode '+mode+' is unsupported; use triangle meshes.');
 return out;
}
function crossNormal(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;return n.map(v=>v/l);}
function buildNodes(json){
 const raw=json.nodes||[];if(!raw.length||raw.length>MAX_NODES)fail('node count must be 1–'+MAX_NODES+'.');
 const parents=new Array(raw.length).fill(null);
 raw.forEach((node,i)=>{for(const child of node.children||[]){if(!Number.isInteger(child)||child<0||child>=raw.length)fail('node '+i+' references an invalid child.');if(parents[child]!=null)fail('node '+child+' has more than one parent.');parents[child]=i;}});
 const nodes=raw.map((node,i)=>{
  const n={name:String(node.name||('Node '+(i+1))).slice(0,72),parent:parents[i],children:(node.children||[]).slice(),mesh:node.mesh==null?null:Number(node.mesh),skin:node.skin==null?null:Number(node.skin),
   translation:(node.translation||[0,0,0]).map(Number),rotation:normalizeQuat((node.rotation||[0,0,0,1]).map(Number)),scale:(node.scale||[1,1,1]).map(Number),matrix:node.matrix?node.matrix.map(Number):null};
  if(n.matrix&&n.matrix.length!==16)fail('node '+i+' matrix must contain 16 values.');
  if(!n.matrix&&([...n.translation,...n.rotation,...n.scale].some(v=>!Number.isFinite(v))))fail('node '+i+' transform contains invalid values.');
  if(n.mesh!=null&&(!json.meshes||!json.meshes[n.mesh]))fail('node '+i+' references a missing mesh.');
  if(n.skin!=null&&(!json.skins||!json.skins[n.skin]))fail('node '+i+' references a missing skin.');
  return n;
 });
 worldMatrices(nodes,nodes.map(n=>n.matrix?n.matrix:composeTRS(n.translation,n.rotation,n.scale)));
 return nodes;
}
function buildSkins(json,read){
 const raw=json.skins||[];if(!raw.length||raw.length>MAX_SKINS)fail('skin count must be 1–'+MAX_SKINS+'.');
 return raw.map((skin,index)=>{
  const joints=(skin.joints||[]).map(Number);if(!joints.length||joints.length>MAX_JOINTS)fail('skin '+index+' must have 1–'+MAX_JOINTS+' joints.');
  if(new Set(joints).size!==joints.length)fail('skin '+index+' has duplicate joint indices.');
  let inverseBindMatrices=[];
  if(skin.inverseBindMatrices!=null){const a=read(skin.inverseBindMatrices);if(a.size!==16||a.count!==joints.length)fail('skin '+index+' inverseBindMatrices must contain one MAT4 per joint.');inverseBindMatrices=a.data;}
  else for(let i=0;i<joints.length;i++)inverseBindMatrices.push(...identity());
  return {name:String(skin.name||('Skin '+(index+1))).slice(0,72),joints,skeleton:skin.skeleton==null?null:Number(skin.skeleton),inverseBindMatrices};
 });
}
function buildPrimitives(json,read,nodes,skins){
 const result=[];let totalVertices=0;const meshes=json.meshes||[];
 nodes.forEach((node,nodeIndex)=>{
  if(node.mesh==null)return;
  const meshDef=meshes[node.mesh];
  (meshDef.primitives||[]).forEach((primitive,primitiveIndex)=>{
   if(result.length>=MAX_PRIMITIVES)fail('model exceeds '+MAX_PRIMITIVES+' mesh primitives.');
   const attrs=primitive.attributes||{};if(attrs.POSITION==null)fail('mesh '+node.mesh+' primitive '+primitiveIndex+' is missing POSITION.');
   const pos=read(attrs.POSITION);if(pos.size!==3)fail('POSITION must be VEC3.');
   const normal=attrs.NORMAL==null?null:read(attrs.NORMAL);if(normal&&normal.size!==3)fail('NORMAL must be VEC3.');
   const uv=attrs.TEXCOORD_0==null?null:read(attrs.TEXCOORD_0);if(uv&&uv.size!==2)fail('TEXCOORD_0 must be VEC2.');
   const hasJoints=attrs.JOINTS_0!=null,hasWeights=attrs.WEIGHTS_0!=null;if(hasJoints!==hasWeights)fail('JOINTS_0 and WEIGHTS_0 must be supplied together.');
   if(node.skin!=null&&!hasJoints)fail('node '+nodeIndex+' uses a skin but its primitive has no JOINTS_0 / WEIGHTS_0.');
   if(hasJoints&&node.skin==null)fail('primitive has joint attributes but node '+nodeIndex+' does not reference a skin.');
   const joints=hasJoints?read(attrs.JOINTS_0):null,weights=hasWeights?read(attrs.WEIGHTS_0):null;
   if(joints&&(joints.size!==4||weights.size!==4||![5121,5123].includes(joints.componentType)))fail('JOINTS_0 must be VEC4 unsigned byte/short and WEIGHTS_0 must be VEC4.');
   if(joints&&joints.count!==pos.count||weights&&weights.count!==pos.count)fail('skin attribute counts must match POSITION.');
   const indices=primitive.indices==null?Array.from({length:pos.count},(_,i)=>i):read(primitive.indices).data.map(Number);
   const tris=triangleIndices(indices,primitive.mode==null?4:Number(primitive.mode));
   const p=[],n=[],uvs=[],jointData=[],weightData=[];
   for(let t=0;t<tris.length;t+=3){
    const ids=tris.slice(t,t+3);if(ids.some(i=>!Number.isInteger(i)||i<0||i>=pos.count))fail('triangle index is outside POSITION accessor.');
    const a=ids.map(i=>pos.data.slice(i*3,i*3+3));
    const face=normal?null:crossNormal(a[0],a[1],a[2]);
    for(let k=0;k<3;k++){
     const vi=ids[k];p.push(...a[k]);n.push(...(normal?normal.data.slice(vi*3,vi*3+3):face));uvs.push(...(uv?uv.data.slice(vi*2,vi*2+2):[0,0]));
     if(joints){
      const ji=joints.data.slice(vi*4,vi*4+4).map(Number),ww=weights.data.slice(vi*4,vi*4+4).map(Number);
      if(ji.some(v=>!Number.isInteger(v)||v<0||v>=skins[node.skin].joints.length))fail('vertex joint index exceeds the node skin joint list.');
      const sum=ww.reduce((a,b)=>a+b,0);if(ww.some(v=>!Number.isFinite(v)||v<0)||sum<=1e-8)fail('vertex skin weights must be finite, non-negative and non-zero.');
      jointData.push(...ji);weightData.push(...ww.map(v=>v/sum));
     }else{jointData.push(0,0,0,0);weightData.push(1,0,0,0);}
    }
   }
   totalVertices+=p.length/3;if(totalVertices>MAX_VERTICES)fail('model exceeds '+MAX_VERTICES+' expanded vertices.');
   result.push({name:String(meshDef.name||node.name||('Mesh '+(result.length+1))).slice(0,72),nodeIndex,skinIndex:node.skin,sourceMesh:node.mesh,sourcePrimitive:primitiveIndex,material:primitive.material==null?null:Number(primitive.material),positions:p,normals:n,uvs,joints:jointData,weights:weightData,vertexCount:p.length/3});
  });
 });
 if(!result.length)fail('scene has no mesh primitives.');
 return result;
}
function buildAnimations(json,read,nodes){
 const raw=json.animations||[];if(raw.length>MAX_ANIMATIONS)fail('animation count exceeds '+MAX_ANIMATIONS+'.');
 return raw.map((animation,index)=>{
  const samplers=(animation.samplers||[]).map((sampler,si)=>{
   const input=read(sampler.input),output=read(sampler.output),times=input.data;
   if(input.size!==1||input.componentType!==5126)fail('animation sampler '+si+' input must be FLOAT SCALAR.');
   for(let i=0;i<times.length;i++)if(!Number.isFinite(times[i])||times[i]<0||(i&&times[i]<times[i-1]))fail('animation sampler '+si+' timestamps must be ascending and non-negative.');
   return {times,output:output.data,outputSize:output.size,interpolation:['STEP','CUBICSPLINE'].includes(sampler.interpolation)?sampler.interpolation:'LINEAR'};
  });
  const channels=[];
  (animation.channels||[]).forEach((channel,ci)=>{
   const node=Number(channel.target?.node),path=String(channel.target?.path||'');
   if(!Number.isInteger(node)||node<0||node>=nodes.length)fail('animation '+index+' channel '+ci+' has an invalid target node.');
   if(path==='weights')return;
   if(!['translation','rotation','scale'].includes(path))fail('animation '+index+' has unsupported target path '+path+'.');
   if(nodes[node].matrix)fail('animated node '+node+' must use TRS properties, not a fixed matrix.');
   const sampler=samplers[channel.sampler];if(!sampler)fail('animation '+index+' channel '+ci+' has a missing sampler.');
   const expected=path==='rotation'?4:3,expectedCount=sampler.times.length*(sampler.interpolation==='CUBICSPLINE'?3:1);
   if(sampler.outputSize!==expected||sampler.output.length!==expectedCount*expected)fail('animation '+index+' channel '+ci+' output size does not match '+path+'.');
   channels.push({node,path,sampler:channel.sampler});
  });
  // Clips containing only morph-target weights are intentionally skipped in this first skeletal release.
  if(!channels.length)return null;
  if(!samplers.length)fail('animation '+index+' contains channels but no samplers.');
  const start=Math.min(...samplers.map(s=>s.times[0]||0)),end=Math.max(...samplers.map(s=>s.times[s.times.length-1]||0));
  return {name:String(animation.name||('Animation '+(index+1))).slice(0,72),samplers,channels,start,duration:Math.max(.001,end-start)};
 }).filter(Boolean);
}
function quatLerp(a,b,t){return quatSlerp(a,b,t);}
function sampleSampler(sampler,time,path){
 const times=sampler.times,last=times.length-1;if(time<=times[0]){const k=0;return sampler.interpolation==='CUBICSPLINE'?sampler.output.slice((k*3+1)*sampler.outputSize,(k*3+2)*sampler.outputSize):sampler.output.slice(k*sampler.outputSize,(k+1)*sampler.outputSize);}
 if(time>=times[last]){const k=last;return sampler.interpolation==='CUBICSPLINE'?sampler.output.slice((k*3+1)*sampler.outputSize,(k*3+2)*sampler.outputSize):sampler.output.slice(k*sampler.outputSize,(k+1)*sampler.outputSize);}
 let i=0;while(i<last-1&&time>times[i+1])i++;
 const dt=Math.max(1e-8,times[i+1]-times[i]),u=Math.max(0,Math.min(1,(time-times[i])/dt));
 if(sampler.interpolation==='STEP')return sampler.output.slice(i*sampler.outputSize,(i+1)*sampler.outputSize);
 if(sampler.interpolation==='CUBICSPLINE'){
  const sz=sampler.outputSize,o=sampler.output,p0=o.slice((i*3+1)*sz,(i*3+2)*sz),m0=o.slice((i*3+2)*sz,(i*3+3)*sz),p1=o.slice(((i+1)*3+1)*sz,((i+1)*3+2)*sz),m1=o.slice(((i+1)*3)*sz,((i+1)*3+1)*sz);
  const t2=u*u,t3=t2*u,h00=2*t3-3*t2+1,h10=t3-2*t2+u,h01=-2*t3+3*t2,h11=t3-t2;
  const value=p0.map((v,k)=>h00*v+h10*dt*m0[k]+h01*p1[k]+h11*dt*m1[k]);return path==='rotation'?normalizeQuat(value):value;
 }
 const sz=sampler.outputSize,a=sampler.output.slice(i*sz,(i+1)*sz),b=sampler.output.slice((i+1)*sz,(i+2)*sz);
 return path==='rotation'?quatLerp(a,b,u):a.map((v,k)=>v+(b[k]-v)*u);
}
function computePose(asset,clipIndex,time){
 const clip=asset.animations?.[clipIndex]||null,trs=asset.nodes.map(n=>({translation:n.translation.slice(),rotation:n.rotation.slice(),scale:n.scale.slice()}));
 if(clip){
  const t=clip.start+Math.max(0,Math.min(clip.duration,Number(time)||0));
  for(const channel of clip.channels){const value=sampleSampler(clip.samplers[channel.sampler],t,channel.path);trs[channel.node][channel.path]=channel.path==='rotation'?normalizeQuat(value):value;}
 }
 const locals=asset.nodes.map((n,i)=>n.matrix?n.matrix.slice():localNodeMatrix(n,trs[i])),worlds=worldMatrices(asset.nodes,locals),skinsByNode={};
 asset.nodes.forEach((node,nodeIndex)=>{
  if(node.skin==null)return;const skin=asset.skins[node.skin],inverseMesh=invert(worlds[nodeIndex]),matrices=[];
  skin.joints.forEach((jointIndex,j)=>{const m=multiply(multiply(inverseMesh,worlds[jointIndex]),skin.inverseBindMatrices.slice(j*16,(j+1)*16));matrices.push(...m);});
  skinsByNode[nodeIndex]=matrices;
 });
 return {nodeWorld:worlds,skinsByNode};
}
function boundsAndRoot(asset){
 let low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity],count=0;
 const worlds=worldMatrices(asset.nodes,asset.nodes.map(n=>n.matrix||composeTRS(n.translation,n.rotation,n.scale)));
 for(const primitive of asset.primitives){const m=worlds[primitive.nodeIndex],p=primitive.positions;for(let i=0;i<p.length;i+=3){const x=p[i],y=p[i+1],z=p[i+2],q=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];for(let a=0;a<3;a++){low[a]=Math.min(low[a],q[a]);high[a]=Math.max(high[a],q[a]);}if(++count>MAX_VERTICES)break;}}
 if(!Number.isFinite(low[0])){low=[-.5,-.5,-.5];high=[.5,.5,.5];}
 const center=low.map((v,i)=>(v+high[i])*.5),max=Math.max(.001,...high.map((v,i)=>v-low[i])),scale=1.8/max;
 return {bounds:{min:low,max:high,center},rootTransform:[scale,0,0,0,0,scale,0,0,0,0,scale,0,-center[0]*scale,-center[1]*scale,-center[2]*scale,1]};
}
function sanitizeAsset(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.nodes)||!Array.isArray(raw.skins)||!Array.isArray(raw.primitives)||!Array.isArray(raw.animations))fail('skeletal asset structure/version is invalid.');
 if(raw.nodes.length<1||raw.nodes.length>MAX_NODES||raw.skins.length<1||raw.skins.length>MAX_SKINS||raw.primitives.length<1||raw.primitives.length>MAX_PRIMITIVES||raw.animations.length>MAX_ANIMATIONS)fail('skeletal asset count exceeds supported limits.');
 const nodes=raw.nodes.map((n,i)=>{
  if(!n||!Number.isInteger(n.parent===null?null:n.parent)&&n.parent!==null)fail('node '+i+' parent index invalid.');
  if(n.parent!==null&&(n.parent<0||n.parent>=raw.nodes.length||n.parent===i))fail('node '+i+' parent is out of range.');
  const node={name:String(n.name||('Node '+(i+1))),parent:n.parent,children:Array.isArray(n.children)?n.children.slice():[],mesh:n.mesh==null?null:Number(n.mesh),skin:n.skin==null?null:Number(n.skin),translation:(n.translation||[0,0,0]).map(Number),rotation:normalizeQuat((n.rotation||[0,0,0,1]).map(Number)),scale:(n.scale||[1,1,1]).map(Number),matrix:n.matrix?n.matrix.map(Number):null};
  if(node.children.some(child=>!Number.isInteger(child)||child<0||child>=raw.nodes.length))fail('node '+i+' children array contains an invalid node index.');
  return node;
 });
 nodes.forEach((n,i)=>{if([...n.translation,...n.rotation,...n.scale].some(v=>!Number.isFinite(v))||(n.matrix&&(n.matrix.length!==16||n.matrix.some(v=>!Number.isFinite(v)))))fail('node '+i+' transform invalid.');});
 const skins=raw.skins.map((s,i)=>{
  if(!Array.isArray(s.joints)||s.joints.length<1||s.joints.length>MAX_JOINTS||!Array.isArray(s.inverseBindMatrices)||s.inverseBindMatrices.length!==s.joints.length*16)fail('skin '+i+' data invalid.');
  if(s.joints.some(j=>!Number.isInteger(j)||j<0||j>=nodes.length))fail('skin '+i+' joint node out of range.');
  if(s.skeleton!=null&&(!Number.isInteger(Number(s.skeleton))||Number(s.skeleton)<0||Number(s.skeleton)>=nodes.length))fail('skin '+i+' skeleton node out of range.');
  finiteArray(s.inverseBindMatrices,'inverse bind matrices',MAX_JOINTS*16);
  return {name:String(s.name||('Skin '+(i+1))),joints:s.joints.slice(),skeleton:s.skeleton==null?null:Number(s.skeleton),inverseBindMatrices:s.inverseBindMatrices.map(Number)};
 });
 nodes.forEach((node,i)=>{if(node.skin!==null&&(!Number.isInteger(node.skin)||node.skin<0||node.skin>=skins.length))fail('node '+i+' references a missing skin.');});
 // Resolve every node once to reject cycles before any GPU resources are created.
 const restLocals=nodes.map(n=>n.matrix?n.matrix.slice():composeTRS(n.translation,n.rotation,n.scale));
 worldMatrices(nodes,restLocals);
 let vertexCount=0;
 const primitives=raw.primitives.map((p,i)=>{
  if(!Number.isInteger(p.nodeIndex)||p.nodeIndex<0||p.nodeIndex>=nodes.length||!Number.isInteger(p.skinIndex===null?null:p.skinIndex)&&p.skinIndex!==null)fail('primitive '+i+' node/skin reference invalid.');
  if(p.skinIndex!==null&&(p.skinIndex<0||p.skinIndex>=skins.length||nodes[p.nodeIndex].skin!==p.skinIndex))fail('primitive '+i+' skin binding invalid.');
  const n=p.positions?.length/3;
  if(!Number.isInteger(n)||n<3||!Array.isArray(p.normals)||p.normals.length!==n*3||!Array.isArray(p.uvs)||p.uvs.length!==n*2||!Array.isArray(p.joints)||p.joints.length!==n*4||!Array.isArray(p.weights)||p.weights.length!==n*4)fail('primitive '+i+' vertex attribute lengths invalid.');
  vertexCount+=n;if(vertexCount>MAX_VERTICES)fail('asset vertex count exceeds limit.');
  for(const [a,name] of [[p.positions,'positions'],[p.normals,'normals'],[p.uvs,'UV'],[p.joints,'joint indices'],[p.weights,'weights']])finiteArray(a,'primitive '+i+' '+name,MAX_VERTICES*4);
  if(p.skinIndex!==null){
   for(let k=0;k<p.joints.length;k++)if(!Number.isInteger(p.joints[k])||p.joints[k]<0||p.joints[k]>=skins[p.skinIndex].joints.length)fail('primitive '+i+' joint index invalid.');
   for(let k=0;k<p.weights.length;k+=4){const w=p.weights.slice(k,k+4);if(w.some(v=>v<0)||w.reduce((sum,v)=>sum+v,0)<=1e-8)fail('primitive '+i+' contains invalid skin weights.');}
  }
  return {name:String(p.name||('Primitive '+(i+1))),nodeIndex:p.nodeIndex,skinIndex:p.skinIndex,sourceMesh:Number(p.sourceMesh||0),sourcePrimitive:Number(p.sourcePrimitive||0),material:p.material==null?null:Number(p.material),positions:p.positions.map(Number),normals:p.normals.map(Number),uvs:p.uvs.map(Number),joints:p.joints.map(Number),weights:p.weights.map(Number),vertexCount:n};
 });
 const animations=raw.animations.map((a,i)=>{
  const samplers=a.samplers||[],channels=a.channels||[];if(channels.length>4096)fail('animation '+i+' channel count exceeds limit.');
  const normalizedSamplers=samplers.map((sampler,si)=>{
   if(!Array.isArray(sampler.times)||!Array.isArray(sampler.output)||!Number.isInteger(sampler.outputSize)||![3,4].includes(sampler.outputSize))fail('animation '+i+' sampler '+si+' is invalid.');
   finiteArray(sampler.times,'animation '+i+' sampler timestamps',MAX_VERTICES);
   finiteArray(sampler.output,'animation '+i+' sampler outputs',MAX_VERTICES*12);
   if(!sampler.times.length||sampler.times.some((v,k)=>v<0||(k&&v<sampler.times[k-1])))fail('animation '+i+' sampler timestamps must be ascending and non-negative.');
   const interpolation=['STEP','LINEAR','CUBICSPLINE'].includes(sampler.interpolation)?sampler.interpolation:'LINEAR';
   const factor=interpolation==='CUBICSPLINE'?3:1;if(sampler.output.length!==sampler.times.length*sampler.outputSize*factor)fail('animation '+i+' sampler output length is invalid.');
   return {times:sampler.times.map(Number),output:sampler.output.map(Number),outputSize:sampler.outputSize,interpolation};
  });
  const normalizedChannels=channels.map(c=>({node:Number(c.node),path:String(c.path),sampler:Number(c.sampler)}));
  for(const c of normalizedChannels){if(!Number.isInteger(c.node)||c.node<0||c.node>=nodes.length||!['translation','rotation','scale'].includes(c.path)||!Number.isInteger(c.sampler)||c.sampler<0||c.sampler>=normalizedSamplers.length)fail('animation '+i+' channel reference invalid.');if(nodes[c.node].matrix)fail('animated node '+c.node+' must use TRS properties.');const expected=c.path==='rotation'?4:3;if(normalizedSamplers[c.sampler].outputSize!==expected)fail('animation '+i+' channel output size invalid.');}
  const start=Number(a.start)||0,duration=Number(a.duration);if(!Number.isFinite(start)||!Number.isFinite(duration)||duration<=0)fail('animation '+i+' duration is invalid.');
  return {name:String(a.name||('Animation '+(i+1))),start,duration,samplers:normalizedSamplers,channels:normalizedChannels};
 });
 const rootTransform=Array.isArray(raw.rootTransform)&&raw.rootTransform.length===16?raw.rootTransform.map(Number):identity();finiteArray(rootTransform,'root transform',16);
 return {version:1,id:String(raw.id||('skeletal-'+Math.random().toString(36).slice(2,10))),name:String(raw.name||'Imported Skeletal Model').slice(0,96),nodes,skins,primitives,animations,activeClip:Number.isInteger(raw.activeClip)&&raw.activeClip>=0&&raw.activeClip<animations.length?raw.activeClip:0,rootTransform,bounds:raw.bounds||null,warnings:Array.isArray(raw.warnings)?raw.warnings.map(String):[]};
}
async function parseFiles(files,rootFile){
 const {json,buffers}=await readContainer(files,rootFile);if(!Array.isArray(json.skins)||!json.skins.length)return null;const read=accessorReader(json,buffers),nodes=buildNodes(json),skins=buildSkins(json,read);
 skins.forEach((skin,index)=>skin.joints.forEach(joint=>{if(joint<0||joint>=nodes.length)fail('skin '+index+' references a joint node outside the node list.');}));
 const primitives=buildPrimitives(json,read,nodes,skins),animations=buildAnimations(json,read,nodes);
 if(!primitives.some(p=>p.skinIndex!==null))return null;
 const asset={version:1,id:'skeletal-'+Math.random().toString(36).slice(2,10),name:String(json.asset?.generator||rootFile.name||'GLTF Skeletal Asset').slice(0,96),nodes,skins,primitives,animations,warnings:[]};
 if((json.animations||[]).length&&animations.length<(json.animations||[]).length)asset.warnings.push('Some morph-weight animation channels were skipped; TRS animation is supported.');
 Object.assign(asset,boundsAndRoot(asset));
 return sanitizeAsset(asset);
}
return {parseFiles,computePose,sanitizeAsset,limits:{maxFileBytes:MAX_FILE_BYTES,maxNodes:MAX_NODES,maxJoints:MAX_JOINTS,maxVertices:MAX_VERTICES}};
});