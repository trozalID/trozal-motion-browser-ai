/* TROZAL MOTION · Local Browser AI via WebLLM / WebGPU
 * Text-only local inference. No API key, Ollama, localhost bridge, or server proxy.
 * Model weights download from the public model CDN on first use.
 */
(function(){
 'use strict';
 const MODEL='Llama-3.2-1B-Instruct-q4f16_1-MLC';
 const IP_POLICY=[
  'Create only original visual content.',
  'Do not depict, name, reproduce, trace, imitate, or closely evoke copyrighted characters, fictional universes, celebrity likenesses, signature costumes, protected artwork, proprietary designs, or recognizable third-party intellectual property.',
  'Do not show real company or product logos, brand marks, trademarks, watermarks, signatures, or recognizable corporate identities. For branding/logo themes use abstract non-identifying geometry only, with no logo, brand name, or trademark.',
  'Use original fictional subjects, generic non-branded objects, fresh compositions, and independently created visual language. If the brief requests protected IP, transform it into a distinct original alternative using only broad, unprotected mood or genre attributes.',
  'Do not include copyrighted lyrics, quotations, source artwork, screenshots, or copied text.'
 ].join('\n');
 const CDN='https://esm.run/@mlc-ai/web-llm';
 let engine=null,loading=null,webllm=null;
 const $=id=>document.getElementById(id);
 function status(message,error){const node=$('trozalWebGpuStatus');if(node){node.textContent=String(message||'');node.style.color=error?'#ff9b9b':'';}}
 function supported(){return Boolean(navigator.gpu&&window.isSecureContext);}
 async function ensureEngine(){
  if(engine)return engine;
  if(loading)return loading;
  if(!supported())throw new Error('WebGPU tidak tersedia. Gunakan Chrome/Edge terbaru melalui HTTPS dan pastikan GPU acceleration aktif.');
  loading=(async()=>{
   status('Memuat pustaka WebLLM dari CDN…');
   webllm=webllm||await import(CDN);
   const adapter=await navigator.gpu.requestAdapter();
   if(!adapter)throw new Error('Browser tidak menemukan GPU adapter WebGPU yang kompatibel.');
   status('Mengunduh dan menyiapkan '+MODEL+' · proses pertama dapat memerlukan waktu dan ruang penyimpanan cukup besar…');
   const initProgressCallback=progress=>status(String(progress?.text||progress?.progress||'Menyiapkan model lokal…'));
   engine=await webllm.CreateMLCEngine(MODEL,{initProgressCallback});
   status('Model siap · '+MODEL+' · inferensi teks berjalan lokal di browser.');
   return engine;
  })();
  try{return await loading;}catch(error){engine=null;throw error;}finally{loading=null;}
 }
 async function generate(prompt,options){
  options=options||{};
  const text=String(prompt||'').trim();
  if(!text)throw new Error('Brief kosong. Isi brief visual sebelum menjalankan Local WebGPU.');
  if(options.signal?.aborted)throw new Error('Permintaan dibatalkan.');
  const active=await ensureEngine();
  if(options.signal?.aborted)throw new Error('Permintaan dibatalkan.');
  const messages=[];
  const systemInstruction=[String(options.systemInstruction||'').trim(),IP_POLICY].filter(Boolean).join('\n\n');
  messages.push({role:'system',content:systemInstruction});
  messages.push({role:'user',content:text});
  status('Local WebGPU sedang menyusun adegan…');
  const response=await active.chat.completions.create({messages,temperature:Number(options.generationConfig?.temperature??0.35),max_tokens:Math.min(4096,Number(options.generationConfig?.maxOutputTokens||4096))});
  if(options.signal?.aborted)throw new Error('Permintaan dibatalkan setelah inferensi selesai.');
  const output=String(response?.choices?.[0]?.message?.content||'').trim();
  if(!output)throw new Error('Model lokal tidak mengembalikan teks. Coba ulangi dengan brief lebih singkat.');
  status('Selesai · output dibuat oleh '+MODEL+' di perangkat lokal.');
  return output;
 }
 async function check(){if(!supported())throw new Error('WebGPU tidak didukung atau halaman tidak berjalan melalui HTTPS.');await ensureEngine();return true;}
 function unload(){if(engine&&typeof engine.unload==='function')engine.unload();engine=null;status('Model dilepaskan dari memori GPU. Cache unduhan browser dapat tetap tersimpan.');}
 window.trozalWebGpuGenerate=generate;window.trozalWebGpuCheck=check;window.trozalWebGpuUnload=unload;
 function init(){
  const load=$('trozalWebGpuLoadBtn'),release=$('trozalWebGpuUnloadBtn');
  if(load)load.addEventListener('click',async()=>{load.disabled=true;try{await ensureEngine();}catch(error){status(error.message||String(error),true);}finally{load.disabled=false;}});
  if(release)release.addEventListener('click',unload);
  if(!supported())status('WebGPU belum terdeteksi. Gunakan Chrome/Edge terbaru, HTTPS, dan aktifkan hardware acceleration.',true);
  else status('WebGPU tersedia · model belum diunduh. Muat model untuk mulai.');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
