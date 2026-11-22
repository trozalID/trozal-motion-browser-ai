'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const mod=await import('../js/universal-object-rig.mjs');
 const normalized=mod.normalizeUniversalComponents([
  {id:'front-wheel',name:'Roda depan',kind:'wheel',bbox:[0.12,0.42,0.25,0.28],motion:'wheel',pivot:[0.24,0.56]},
  {id:'door',name:'Pintu',kind:'vehicle',bbox:{x:.38,y:.2,w:.28,h:.5},motion:'hinge',parent:'body'},
  {id:'manual',name:'Titik manual',point:{x:.82,y:.65},motion:'float'},
  {id:'invalid',name:'Invalid'}
 ]);
 assert.equal(normalized.length,3,'Invalid entries without a box or point are skipped');
 assert.deepEqual(normalized[0].bbox,{x:.12,y:.42,w:.25,h:.28});
 assert.equal(normalized[0].motion,'wheel');
 assert.equal(normalized[0].amp,1,'Wheel default amplitude is initialized');
 assert.equal(normalized[1].parent,'body');
 assert.deepEqual(normalized[2].point,{x:.82,y:.65});
 assert.equal(mod.normalizeUniversalComponents(Array.from({length:20},(_,i)=>({name:'Part '+i,point:{x:.5,y:.5}}))).length,14,'Rig limits parts to 14');
 assert.deepEqual(mod.universalMotionDefaults('wheel'),{amp:1,speed:4.2});
 assert.deepEqual(mod.universalMotionDefaults('unknown'),{amp:.18,speed:1.2});
 console.log('PASS: Universal Rig component parsing, bounds, motion defaults, and safety cap.');
})().catch(error=>{console.error(error);process.exit(1);});
