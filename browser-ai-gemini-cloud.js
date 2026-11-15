/* TROZAL BROWSER AI · GEMINI CLOUD ONLY
   No local model download, WebGPU inference, Ollama, localhost API, or Bridge. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const API='https://generativelanguage.googleapis.com/v1beta';
 let sceneController=null;
 let visionController=null;

 function apiKey(){return String($('trozalGeminiApiKey')?.value||'').trim();}
 function modelId(){return String($('trozalBrowserAiModel')?.value||'gemini-3.8-flash');}
 function status(id,message,isError){
  const node=$(id);
  if(!node)return;
  node.textContent=String(message||'');
  node.style.color=isError?'#ff9999':'';
 }
 function friendlyApiError(response,payload){
  const detail=String(payload?.error?.message||payload?.message||response.statusText||'Permintaan gagal');
  if(response.status===400)return 'Permintaan Gemini tidak valid: '+detail;
  if(response.status===401||response.status===403)return 'API key ditolak atau tidak memiliki izin: '+detail;
  if(response.status===404)return 'Model atau endpoint Gemini tidak tersedia: '+detail;
  if(response.status===429)return 'Kuota / batas permintaan Gemini tercapai. Periksa limit akun Google AI: '+detail;
  return 'Gemini Cloud HTTP '+response.status+': '+detail;
 }
 async function requestJson(url,options,timeoutMs){
  const controller=options.signal?null:new AbortController();
  const signal=options.signal||controller.signal;
  const timer=controller?setTimeout(()=>controller.abort(),timeoutMs||90000):null;
  try{
   const response=await fetch(url,Object.assign({},options,{signal}));
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(friendlyApiError(response,payload));
   return payload;
  }catch(error){
   if(error?.name==='AbortError')throw new Error('Permintaan dibatalkan atau melewati batas waktu.');
   if(/Failed to fetch|NetworkError|Load failed/i.test(error?.message||'')){
    throw new Error('Tidak dapat menghubungi Gemini Cloud. Periksa koneksi internet, izin jaringan browser, dan ketersediaan API Google.');
   }
   throw error;
  }finally{if(timer)clearTimeout(timer);}
 }
 function requireKey(){
  const value=apiKey();
  if(!value)throw new Error('Masukkan Gemini API key pada panel AI Scene Composer terlebih dahulu.');
  return value;
 }
 function interactionText(payload){
  if(typeof payload?.output_text==='string'&&payload.output_text.trim())return payload.output_text.trim();
  const chunks=[];
  (Array.isArray(payload?.steps)?payload.steps:[]).forEach(step=>{
   if(step?.type!=='model_output'||!Array.isArray(step.content))return;
   step.content.forEach(part=>{
    if(part?.type==='text'&&typeof part.text==='string')chunks.push(part.text);
   });
  });
  return chunks.join('\n').trim();
 }
 async function createInteraction(input,options){
  options=options||{};
  const body={model:modelId(),input:input,store:false,stream:false};
  if(options.systemInstruction)body.system_instruction=options.systemInstruction;
  if(options.generationConfig)body.generation_config=options.generationConfig;
  const payload=await requestJson(API+'/interactions',{
   method:'POST',
   mode:'cors',
   credentials:'omit',
   headers:{
    'Content-Type':'application/json',
    'x-goog-api-key':requireKey(),
    'Api-Revision':'2026-05-20'
   },
   body:JSON.stringify(body),
   signal:options.signal
  },options.timeoutMs||180000);
  if(payload.status==='failed')throw new Error(payload.error?.message||'Gemini melaporkan interaksi gagal.');
  const output=interactionText(payload);
  if(!output)throw new Error('Gemini menyelesaikan permintaan tetapi tidak mengembalikan teks. Coba ulangi atau pilih model lain.');
  return output;
 }
 async function checkConnection(){
  const button=$('trozalGeminiCheckBtn');
  if(button)button.disabled=true;
  status('trozalGeminiConnectionStatus','Memeriksa daftar model Gemini yang dapat diakses…');
  try{
   const data=await requestJson(API+'/models',{
    method:'GET',
    mode:'cors',
    credentials:'omit',
    headers:{'x-goog-api-key':requireKey(),'Api-Revision':'2026-05-20'}
   },30000);
   const available=Array.isArray(data.models)?data.models.map(item=>String(item.name||'').replace(/^models\//,'')):[];
   const selected=modelId();
   if(available.length&&!available.includes(selected)){
    status('trozalGeminiConnectionStatus','API key terhubung, tetapi model '+selected+' tidak tercantum pada daftar model yang tersedia untuk key ini. Pilih model lain.',true);
    return false;
   }
   status('trozalGeminiConnectionStatus','TERHUBUNG · '+available.length+' model terdaftar · Pilihan: '+selected+' · Semua inferensi menggunakan Gemini Cloud.');
   status('trozalVisionConnection','Gemini Cloud aktif. Browser Vision memakai API key dan model yang sama.');
   return true;
  }catch(error){
   status('trozalGeminiConnectionStatus',error.message||String(error),true);
   return false;
  }finally{if(button)button.disabled=false;}
 }
 function extractHtml(raw){
  let code=String(raw||'').trim();
  const fence=String.fromCharCode(96).repeat(3);
  if(code.startsWith(fence)){
   code=code.slice(fence.length);
   const newline=code.indexOf('\n');
   if(newline>=0)code=code.slice(newline+1);
   const last=code.lastIndexOf(fence);
   if(last>=0)code=code.slice(0,last);
  }
  code=code.replace(/^\uFEFF/,'').trim();
  const lower=code.toLowerCase();
  const starts=[lower.indexOf('<!doctype html'),lower.indexOf('<html'),lower.indexOf('<svg')].filter(n=>n>=0);
  if(starts.length)code=code.slice(Math.min.apply(null,starts));
  if(!/<svg[\s>]/i.test(code)||!/<\/svg>/i.test(code))throw new Error('Gemini belum menghasilkan SVG lengkap. Ubah brief lalu coba lagi.');
  if(/<script\b|<iframe\b|<object\b|<embed\b|<foreignObject\b/i.test(code))throw new Error('Hasil memuat script atau elemen tertanam yang tidak diizinkan. Generate ulang dengan SVG dan CSS saja.');
  if(/https?:\/\/|url\(\s*['"]?\/\//i.test(code))throw new Error('Hasil memakai referensi eksternal. Minta Gemini membuat seluruh visual dengan SVG dan CSS inline.');
  if((lower.includes('<!doctype html')||lower.includes('<html'))&&!lower.includes('</html>'))throw new Error('Dokumen HTML terpotong sebelum tag penutup. Coba generate ulang.');
  if(typeof buildSafeHtmlDocument==='function')code=buildSafeHtmlDocument(code);
  const parsed=new DOMParser().parseFromString(code,'text/html');
  if(!parsed.querySelector('svg'))throw new Error('SVG tidak ditemukan setelah pemeriksaan HTML.');
  return code;
 }
 function buildScenePrompt(){
  const brief=String($('visualMotionPrompt')?.value||'').trim();
  if(!brief)throw new Error('Tulis brief visual terlebih dahulu.');
  const ratio=$('visualMotionRatio')?.value||'16:9';
  const duration=Math.max(3,Math.min(60,Number($('visualMotionDuration')?.value)||15));
  const style=$('visualMotionStyle')?.value||'cinematic';
  const camera=$('visualMotionCamera')?.value||'parallax';
  const transition=$('visualMotionTransition')?.value||'crossfade';
  const accent=$('visualMotionAccent')?.value||'#65d9ff';
  const includeParticles=$('visualMotionParticles')?.checked!==false;
  const includeDepth=$('visualMotionDepth')?.checked!==false;
  const themePrompt=String($('svgAiPrompt')?.value||'').trim();
  return [
   'VISUAL BRIEF:\n'+brief,
   themePrompt?'THEME INTELLIGENCE / DETAIL TEMA:\n'+themePrompt:'',
   'OUTPUT REQUIREMENTS:',
   'Return only one complete standalone HTML5 document with one polished, detailed SVG motion-graphics composition.',
   'Use at least five semantic SVG groups with unique descriptive IDs: background, environment, main subject, secondary objects, foreground or atmosphere.',
   'Animate at least three appropriate SVG groups independently using inline CSS @keyframes, smooth easing, and deliberate timing.',
   'Represent the requested subject faithfully. Do not substitute generic placeholder icons. Use layered vector forms, gradients, highlights, shadows, light and depth.',
   'Keep every important subject within the viewBox and create a coherent balanced composition.',
   'No JavaScript, script elements, event-handler attributes, iframe, canvas, external image, external font, external CSS, remote URL or external dependency.',
   'Use inline SVG and CSS only. Close every HTML and SVG element. Do not include Markdown fences or explanatory prose.',
   'Aspect ratio: '+ratio,
   'Target duration: '+duration+' seconds',
   'Visual style: '+style,
   'Camera direction: '+camera,
   'Scene transition preference: '+transition,
   'Accent color: '+accent,
   'Atmospheric particles: '+(includeParticles?'Use only when relevant to the brief.':'Do not add decorative particles.'),
   'Depth layers: '+(includeDepth?'Use visible foreground, middle ground and background depth.':'Prefer a flatter composition.')
  ].filter(Boolean).join('\n\n');
 }
 async function generateScene(){
  const button=$('generateVisualMotionAiBtn');
  const cancel=$('cancelBrowserAiGenerationBtn');
  if(sceneController)return;
  const controller=new AbortController();
  sceneController=controller;
  if(button){button.disabled=true;button.textContent='Gemini sedang membuat adegan…';}
  if(cancel)cancel.style.display='block';
  status('visualMotionAiStatus','Mengirim brief ke Gemini Cloud ('+modelId()+')…');
  try{
   const output=await createInteraction(buildScenePrompt(),{
    systemInstruction:'You are an expert motion-graphics art director and SVG animation engineer. Create a visually rich, concept-specific production-ready HTML/SVG animation. Follow all explicit visual requirements and preserve the entire requested concept. Return complete code only.',
    generationConfig:{temperature:0.35,max_output_tokens:8192},
    signal:controller.signal,
    timeoutMs:240000
   });
   const code=extractHtml(output);
   $('visualMotionOutput').value=code;
   $('visualMotionPreview').srcdoc=code;
   if(typeof visualMotionPreviewSetRatio==='function')visualMotionPreviewSetRatio();
   status('visualMotionAiStatus','Selesai · HTML/SVG dibuat melalui Gemini Cloud ('+code.length.toLocaleString()+' karakter). Periksa Preview sebelum mengimpor.');
   status('visualMotionStatus','Gemini Cloud Scene Composer selesai. Klik “Kirim ke Preview TROZAL” untuk memasukkan hasil ke mesin motion utama.');
  }catch(error){
   const cancelled=controller.signal.aborted;
   status('visualMotionAiStatus',cancelled?'Generasi dibatalkan.':'Gagal membuat adegan: '+(error.message||String(error)),!cancelled);
  }finally{
   sceneController=null;
   if(button){button.disabled=false;button.textContent='✦ GENERATE ADEGAN DENGAN GEMINI';}
   if(cancel)cancel.style.display='none';
  }
 }
 function splitDataUrl(value){
  const match=String(value||'').match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i);
  if(!match)throw new Error('Format gambar tidak didukung. Gunakan PNG, JPG, atau WebP.');
  return {mime_type:match[1].toLowerCase(),data:match[2]};
 }
 function fileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result||''));
   reader.onerror=()=>reject(new Error('Gagal membaca file '+file.name));
   reader.readAsDataURL(file);
  });
 }
 async function resizeDataUrl(dataUrl,maxSide){
  const image=new Image();
  image.src=dataUrl;
  await image.decode();
  const scale=Math.min(1,(maxSide||1280)/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Canvas gambar tidak tersedia.');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',0.86);
 }
 async function capturePreviewFrames(){
  if(typeof renderAt!=='function'||typeof ensureHtmlToImage!=='function')throw new Error('Renderer Preview belum siap.');
  const wasPlaying=playing;
  const oldTime=playhead;
  if(wasPlaying){
   playing=false;
   cancelAnimationFrame(raf);
   $('playBtn').textContent='▶ Putar';
  }
  const duration=Math.max(0.1,Number($('duration').value)||10);
  const sampleTimes=[0,duration*0.5,duration*0.85];
  const frames=[];
  try{
   for(let index=0;index<sampleTimes.length;index++){
    const time=sampleTimes[index];
    renderAt(time);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    let canvas;
    if(typeof htmlMotionIframe!=='undefined'&&htmlMotionIframe&&htmlMotionIframe.contentDocument&&typeof captureHtmlMotionAt==='function'){
     canvas=await captureHtmlMotionAt(time);
    }else{
     const renderer=await ensureHtmlToImage();
     canvas=await renderer.toCanvas($('stage'),{pixelRatio:1,cacheBust:true,skipFonts:false});
    }
    const jpeg=await resizeDataUrl(canvas.toDataURL('image/jpeg',0.86),1280);
    const image=splitDataUrl(jpeg);
    image.time=time;
    frames.push(image);
   }
   return frames;
  }finally{
   renderAt(oldTime);
   if(wasPlaying){
    $('playBtn').textContent='▶ Putar';
    $('playBtn').click();
   }
  }
 }
 function renderContactSheet(images){
  const panel=$('trozalGeminiContactSheetPanel');
  const holder=$('trozalGeminiContactSheet');
  if(!panel||!holder)return;
  holder.replaceChildren();
  images.forEach((item,index)=>{
   const wrapper=document.createElement('div');
   const image=document.createElement('img');
   image.alt='Bukti frame '+(index+1);
   image.src='data:'+item.mime_type+';base64,'+item.data;
   const label=document.createElement('div');
   label.className='help';
   label.textContent=Number.isFinite(item.time)?'Frame '+(index+1)+' · '+item.time.toFixed(2)+'s':'Gambar '+(index+1);
   wrapper.append(image,label);
   holder.append(wrapper);
  });
  panel.style.display='block';
 }
 function parseJson(raw){
  let text=String(raw||'').trim();
  const fence=String.fromCharCode(96).repeat(3);
  if(text.startsWith(fence)){
   text=text.slice(fence.length);
   const newline=text.indexOf('\n');
   if(newline>=0)text=text.slice(newline+1);
   const last=text.lastIndexOf(fence);
   if(last>=0)text=text.slice(0,last);
  }
  const start=text.indexOf('{'),end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('Gemini tidak mengembalikan JSON metadata yang bisa dibaca.');
  try{return JSON.parse(text.slice(start,end+1));}
  catch(error){throw new Error('Format JSON dari Gemini tidak valid: '+error.message);}
 }
 function fillMetadata(data){
  const title=String(data.title||'').trim();
  const description=String(data.description||'').trim();
  const keywords=Array.isArray(data.keywords)?data.keywords.map(value=>String(value).trim()).filter(Boolean):[];
  if(title)$('metadataTitle').value=title.slice(0,180);
  if(description)$('metadataDescription').value=description;
  const category=$('metadataCategory');
  const match=[...category.options].find(option=>option.text.trim().toLowerCase()===String(data.category||'').trim().toLowerCase());
  if(match)category.value=match.value;
  if(keywords.length){
   $('metadataKeywords').value=[...new Set(keywords)].slice(0,47).join(', ');
   $('metadataKeywords').dispatchEvent(new Event('input',{bubbles:true}));
  }
  status('trozalGeminiVisualSummary',data.visual_summary?'Ringkasan visual: '+String(data.visual_summary):'');
  const objects=Array.isArray(data.visible_objects)?data.visible_objects.join(', '):'';
  status('trozalGeminiVisibleObjects',objects?'Objek yang terlihat: '+objects:'');
  status('metadataStatus','Draf metadata dibuat dari piksel frame melalui Gemini Cloud. Periksa semua kolom sebelum digunakan.');
 }
 async function analyzeVision(){
  const button=$('trozalGeminiAnalyzeBtn');
  const cancel=$('cancelGeminiVisionBtn');
  if(visionController)return;
  const controller=new AbortController();
  visionController=controller;
  if(button){button.disabled=true;button.textContent='Gemini menganalisis…';}
  if(cancel)cancel.style.display='block';
  $('trozalGeminiContactSheetPanel').style.display='none';
  status('trozalGeminiStatus','Menyiapkan bukti visual untuk Gemini Cloud…');
  try{
   requireKey();
   const selected=[...($('trozalVisionImages')?.files||[])];
   if(selected.length>3)throw new Error('Maksimal tiga gambar bukti. Hapus pilihan berlebih lalu coba lagi.');
   const images=[];
   if(selected.length){
    for(const file of selected){
     if(file.size>12*1024*1024)throw new Error('File '+file.name+' melebihi 12 MB. Kecilkan file terlebih dahulu.');
     const dataUrl=await resizeDataUrl(await fileAsDataUrl(file),1280);
     images.push(splitDataUrl(dataUrl));
    }
   }else{
    status('trozalGeminiStatus','Mengambil frame Preview aktual pada 0%, 50%, dan 85%…');
    images.push(...await capturePreviewFrames());
   }
   if(!images.length)throw new Error('Tidak ada gambar untuk dianalisis.');
   renderContactSheet(images);
   const allowed=[...$('metadataCategory').options].map(option=>option.text);
   const prompt=[
    'Analyze only the visible pixels in the attached TROZAL MOTION preview frames.',
    'Do not infer details from filenames, prompts, source code, metadata or user intent.',
    'Return one valid JSON object only with keys: title, description, category, keywords, visual_summary, visible_objects, confidence_notes.',
    'title: precise English title, maximum 100 characters.',
    'description: accurate English description in one or two sentences.',
    'category: exactly one of these allowed choices: '+allowed.join(' | ')+'.',
    'keywords: up to 47 specific English stock-search terms grounded in visible evidence. Prefer visible subjects, actions, materials, colors, composition, visual style and setting. Avoid vague fillers and duplicates.',
    'visual_summary: concise summary of what can actually be seen.',
    'visible_objects: array of clearly visible objects only.',
    'confidence_notes: note uncertainty or return an empty string.',
    'Do not invent objects or motion that the supplied frames do not prove.'
   ].join('\n');
   const input=[{type:'text',text:prompt}];
   images.forEach(image=>input.push({type:'image',data:image.data,mime_type:image.mime_type}));
   status('trozalGeminiStatus','Mengirim '+images.length+' gambar ke '+modelId()+' · Gemini Cloud…');
   const output=await createInteraction(input,{
    generationConfig:{temperature:0.15,max_output_tokens:4096},
    signal:controller.signal,
    timeoutMs:180000
   });
   const data=parseJson(output);
   if(!String(data.title||'').trim()&&!String(data.description||'').trim()&&!Array.isArray(data.keywords)){
    throw new Error('Gemini mengembalikan metadata kosong.');
   }
   fillMetadata(data);
   status('trozalGeminiStatus','Selesai · metadata dari '+images.length+' gambar berhasil dibuat melalui Gemini Cloud. Periksa frame bukti dan seluruh kolom sebelum ekspor.');
   status('trozalVisionStatus','Analisis cloud selesai · '+images.length+' frame · model '+modelId()+'.');
  }catch(error){
   const cancelled=controller.signal.aborted;
   status('trozalGeminiStatus',cancelled?'Analisis dibatalkan.':'Analisis Gemini gagal: '+(error.message||String(error)),!cancelled);
   status('trozalVisionStatus',cancelled?'Analisis dibatalkan.':(error.message||String(error)),!cancelled);
  }finally{
   visionController=null;
   if(button){button.disabled=false;button.textContent='✦ ANALISIS VISUAL DENGAN GEMINI CLOUD';}
   if(cancel)cancel.style.display='none';
  }
 }
 function clearKey(){
  const input=$('trozalGeminiApiKey');
  if(input)input.value='';
  status('trozalGeminiConnectionStatus','API key dihapus dari halaman ini.');
 }
 function cancelScene(){if(sceneController)sceneController.abort();}
 function cancelVision(){if(visionController)visionController.abort();}
 async function copyOutput(){
  const code=String($('visualMotionOutput')?.value||'');
  if(!code){status('visualMotionAiStatus','Belum ada kode HTML/SVG untuk disalin.');return;}
  try{
   await navigator.clipboard.writeText(code);
   status('visualMotionAiStatus','HTML/SVG berhasil disalin.');
  }catch(_){
   $('visualMotionOutput').focus();
   $('visualMotionOutput').select();
   status('visualMotionAiStatus','Pilih kode pada kolom output, lalu salin dengan Ctrl+C.');
  }
 }
 async function previewOutput(){
  const code=String($('visualMotionOutput')?.value||'').trim();
  if(!code){status('visualMotionAiStatus','Belum ada HTML/SVG. Generate adegan terlebih dahulu.',true);return;}
  try{
   $('aiCodeTerminal').value=code;
   await generateMotionSvgLocally();
   status('visualMotionAiStatus','HTML/SVG Gemini berhasil dikirim ke Preview utama.');
  }catch(error){
   status('visualMotionAiStatus','Gagal mengirim ke Preview: '+(error.message||String(error)),true);
  }
 }
 function resetComposer(){
  cancelScene();
  $('visualMotionPrompt').value='';
  $('visualMotionOutput').value='';
  $('visualMotionPreview').srcdoc='';
  status('visualMotionAiStatus','Siap menggunakan Gemini Cloud.');
  status('visualMotionStatus','Brief dan hasil Scene Composer telah dibersihkan.');
 }
 function bindMetadataSource(buttonId,source){
  const button=$(buttonId);
  if(!button)return;
  button.addEventListener('click',async()=>{
   try{
    if(source==='scene'){
     const code=String($('visualMotionOutput')?.value||'').trim();
     if(!code)throw new Error('Belum ada hasil Scene Composer. Generate adegan terlebih dahulu.');
     $('aiCodeTerminal').value=code;
    }else if(!$('aiCodeTerminal')?.value?.trim()){
     throw new Error('Belum ada HTML Motion pada Terminal.');
    }
    await generateMotionSvgLocally();
    await analyzeVision();
   }catch(error){
    status('trozalMetadataSourceStatus','Tidak dapat menyiapkan sumber metadata: '+(error.message||String(error)),true);
   }
  });
 }
 function init(){
  status('trozalVisionConnection','Browser Vision menggunakan Gemini Cloud API dan API key bersama. Tidak ada model gambar lokal.');
  $('trozalGeminiCheckBtn')?.addEventListener('click',checkConnection);
  $('generateVisualMotionAiBtn')?.addEventListener('click',generateScene);
  $('cancelBrowserAiGenerationBtn')?.addEventListener('click',cancelScene);
  $('trozalGeminiAnalyzeBtn')?.addEventListener('click',analyzeVision);
  $('cancelGeminiVisionBtn')?.addEventListener('click',cancelVision);
  $('trozalVisionClearImagesBtn')?.addEventListener('click',()=>{
   $('trozalVisionImages').value='';
   $('trozalGeminiContactSheetPanel').style.display='none';
   status('trozalGeminiStatus','Pilihan gambar dihapus.');
  });
  $('trozalGeminiClearKeyBtn')?.addEventListener('click',clearKey);
  $('copyVisualMotionBtn')?.addEventListener('click',copyOutput);
  $('previewVisualMotionBtn')?.addEventListener('click',previewOutput);
  $('resetVisualMotionBtn')?.addEventListener('click',resetComposer);
  bindMetadataSource('metadataFromHtmlMotionBtn','html');
  bindMetadataSource('metadataFromSceneAiBtn','scene');
  $('trozalVisionImages')?.addEventListener('change',()=>{
   const count=$('trozalVisionImages').files?.length||0;
   if(count>3)status('trozalGeminiStatus','Maksimal tiga gambar. Pilih ulang maksimal tiga file.',true);
   else status('trozalGeminiStatus',count?count+' gambar dipilih. Siap dianalisis melalui Gemini Cloud.':'Tidak ada gambar dipilih. Analisis akan memakai tiga frame Preview.');
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
