/* TROZAL MOTION · deterministic scene understanding */
(function(root){
 'use strict';
 function splitBeats(brief){
  const normalized=String(brief||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').trim();
  if(!normalized)return [];
  const lines=normalized.split(/\n+|(?<=[.!?;])\s+/).map(x=>x.trim()).filter(Boolean);
  const beats=[];
  for(const line of lines){if(beats.length>=6){beats[5]+=' '+line;continue;}beats.push(line);}
  return beats;
 }
 function build(brief,duration){
  const beats=splitBeats(brief),seconds=Math.max(3,Math.min(60,Number(duration)||15));
  if(!beats.length)return 'Belum ada brief. Tulis subjek, aksi, lingkungan, dan perubahan adegan untuk melihat rencana.';
  const slot=seconds/beats.length;
  const rows=beats.map((line,index)=>(index+1)+'. '+(index*slot).toFixed(1)+'–'+(index===beats.length-1?seconds:(index+1)*slot).toFixed(1)+'s | '+line);
  return ['RINGKASAN: '+beats.length+' beat naratif · '+seconds+' detik · '+(beats.length>1?'urutan mengikuti kalimat brief':'satu adegan berkesinambungan'),...rows,'KUNCI KONTINUITAS: pertahankan identitas, bentuk, warna, skala, arah gerak, dan posisi relatif subjek utama antar-beat kecuali brief menyebut perubahan.','BAHASA VISUAL: bedakan foreground, midground, background; jelaskan aksi melalui pose dan perubahan posisi; gunakan kamera untuk memperjelas aksi, bukan gerakan acak.','PACING: beri establishing view saat lingkungan penting, fokus pada aksi utama, lalu hold/reveal untuk akhir; jangan menambah peristiwa atau objek cerita yang tidak disebutkan.','TRANSISI: hubungkan beat berurutan dengan arah gerak, komposisi, atau match cut yang konsisten; hindari pergantian lokasi mendadak tanpa petunjuk brief.'].join('\n');
 }
 function mountPreview(){
  const prompt=document.getElementById('visualMotionPrompt'),duration=document.getElementById('visualMotionDuration'),panel=document.getElementById('trozalSceneUnderstandingPanel'),output=document.getElementById('trozalSceneUnderstandingOutput');
  if(!prompt||!duration||!panel||!output)return;
  const update=()=>{output.textContent=build(prompt.value,duration.value);};
  prompt.addEventListener('input',update);duration.addEventListener('change',update);update();
 }
 const api={splitBeats,build,mountPreview};root.TROZAL_SCENE_INTELLIGENCE=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountPreview,{once:true});else mountPreview();}
})(typeof window!=='undefined'?window:globalThis);
