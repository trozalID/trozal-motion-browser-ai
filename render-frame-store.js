(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TrozalRenderFrameStore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 let sequence=0;
 function frameName(index){return 'frame_'+String(index).padStart(6,'0')+'.png'}
 async function create(options){
  options=options||{};
  const storage=options.storage||(typeof navigator!=='undefined'?navigator.storage:null);
  if(!storage||typeof storage.getDirectory!=='function')throw new Error('Origin Private File System tidak tersedia pada browser ini.');
  const root=await storage.getDirectory();
  const name='trozal-motion-render-'+Date.now()+'-'+(++sequence);
  const directory=await root.getDirectoryHandle(name,{create:true});
  let closed=false;
  return {
   async writeFrame(index,blob){
    if(closed)throw new Error('Penyimpanan frame sudah ditutup.');
    const handle=await directory.getFileHandle(frameName(index),{create:true});
    const writer=await handle.createWritable();
    try{await writer.write(blob);await writer.close()}catch(error){try{await writer.abort()}catch(_){}throw error}
   },
   async readFrame(index){
    if(closed)throw new Error('Penyimpanan frame sudah ditutup.');
    const handle=await directory.getFileHandle(frameName(index));
    const file=await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
   },
   async deleteFrame(index){
    if(closed)return;
    try{await directory.removeEntry(frameName(index))}catch(error){if(error&&error.name!=='NotFoundError')throw error}
   },
   async cleanup(){
    if(closed)return;
    closed=true;
    try{for await(const [entryName] of directory.entries())await directory.removeEntry(entryName)}catch(_){}
    try{await root.removeEntry(name)}catch(_){}
   },
   directoryName:name
  };
 }
 return {create,frameName};
});