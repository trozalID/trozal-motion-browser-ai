'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {create,frameName}=require('../render-frame-store.js');
class FakeDirectory{
 constructor(){this.files=new Map()}
 createFile(name){const record={data:new Uint8Array(),async createWritable(){return{async write(blob){record.data=new Uint8Array(await blob.arrayBuffer())},async close(){},async abort(){}}},async getFile(){return new Blob([record.data])}};this.files.set(name,record);return record}
 async getFileHandle(name,options){if(options&&options.create)return this.createFile(name);const value=this.files.get(name);if(!value)throw Object.assign(new Error('missing'),{name:'NotFoundError'});return value}
 async removeEntry(name){if(!this.files.has(name))throw Object.assign(new Error('missing'),{name:'NotFoundError'});this.files.delete(name)}
 async *entries(){for(const [name,value] of this.files)yield[name,value]}
}
test('frameName keeps a stable six-digit sequence',()=>assert.equal(frameName(12),'frame_000012.png'));
test('OPFS frame store writes, reads, deletes and cleans its files',async()=>{
 const directory=new FakeDirectory();
 const root={async getDirectoryHandle(){return directory},async removeEntry(){directory.files.clear()}};
 const store=await create({storage:{async getDirectory(){return root}}});
 await store.writeFrame(0,new Blob([new Uint8Array([1,2,3])]));
 assert.deepEqual([...await store.readFrame(0)],[1,2,3]);
 await store.deleteFrame(0);
 await assert.rejects(()=>store.readFrame(0),{name:'NotFoundError'});
 await store.writeFrame(1,new Blob([new Uint8Array([4,5])]));
 await store.cleanup();
 assert.equal(directory.files.size,0);
});
test('frame store reports unsupported OPFS instead of silently retaining frames in memory',async()=>{
 await assert.rejects(()=>create({storage:{}}),/tidak tersedia/);
});