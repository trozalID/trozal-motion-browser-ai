/* TROZAL BROWSER AI · GEMINI CLOUD ONLY
   No local model download, WebGPU inference, Ollama, localhost API, or Bridge. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const API='https://generativelanguage.googleapis.com/v1beta';
 let sceneController=null;
 let visionController=null;

 function providerId(){return String($('trozalAiProvider')?.value||'gemini');}
 function providerKey(){const ids={gemini:'trozalGeminiApiKey',openai:'trozalOpenAiKey',anthropic:'trozalAnthropicKey',groq:'trozalGroqKey',mistral:'trozalMistralKey'};return providerId()==='webgpu'?'':String($(ids[providerId()]||ids.gemini)?.value||'').trim();}
 function apiKey(){return providerKey();}
 function modelId(){if(providerId()==='gemini')return String($('trozalBrowserAiModel')?.value||$('trozalAiProviderModel')?.value||'gemini-3.8-flash');return String($('trozalAiProviderModel')?.value||$('trozalBrowserAiModel')?.value||'gemini-3.8-flash');}
 function syncGeminiModelSelectors(value){if(providerId()!=='gemini')return;const cloud=$('trozalBrowserAiModel'),manager=$('trozalAiProviderModel'),chosen=String(value||cloud?.value||manager?.value||'gemini-3.8-flash');const has=(node,model)=>node&&Array.from(node.options||[]).some(option=>option.value===model);if(cloud&&has(cloud,chosen))cloud.value=chosen;if(manager&&has(manager,chosen))manager.value=chosen;}
 function providerName(){return ({gemini:'Gemini',openai:'OpenAI',anthropic:'Claude',groq:'Groq',mistral:'Mistral',webgpu:'Local WebGPU'})[providerId()]||'Gemini';}
 function syncProviderUi(){const p=providerId(),s=$('trozalAiProviderModel'),cloud=$('trozalBrowserAiModel'),previous=p==='gemini'?String(cloud?.value||s?.value||'gemini-3.8-flash'):String(s?.value||'');const m={webgpu:[['Llama-3.2-1B-Instruct-q4f16_1-MLC','Llama 3.2 1B · Q4 · Local']],gemini:[['gemini-3.8-flash','Gemini 3.8 Flash'],['gemini-4-argon','Gemini 4 Argon'],['gemini-3.1-pro-preview','Gemini 3.1 Pro · preview'],['gemini-3.5-flash-lite','Gemini 3.5 Flash-Lite']],openai:[['gpt-4.1','GPT-4.1']],anthropic:[['claude-sonnet-4-5','Claude Sonnet 4.5'],['claude-opus-4-1','Claude Opus 4.1']],groq:[['qwen/qwen3.8-27b','Qwen 3.8 27B Vision']],mistral:[['mistral-large-2512','Mistral Large 3'],['mistral-medium-2508','Mistral Medium 3.1'],['mistral-small-2506','Mistral Small 3.2']]};if(s){s.replaceChildren();(m[p]||m.gemini).forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;s.append(option);});if(Array.from(s.options).some(option=>option.value===previous))s.value=previous;}if(p==='gemini')syncGeminiModelSelectors(s?.value||previous);const keyFields=$('trozalProviderKeyFields');if(keyFields)keyFields.style.display=p==='webgpu'?'none':'grid';status('trozalProviderStatus',p==='webgpu'?'Local WebGPU dipilih · tanpa API key. Muat model lokal terlebih dahulu.':providerName()+' dipilih · masukkan API key lalu periksa koneksi untuk memuat semua model yang tersedia pada akun ini.');}
 async function discoverGeminiModels(key){
  const selected=modelId(),models=[];
  let pageToken='';
  for(let page=0;page<10;page++){
   const query='?pageSize=1000'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):'');
   const data=await requestJson(API+'/models'+query,{method:'GET',mode:'cors',credentials:'omit',headers:{'x-goog-api-key':key}},30000);
   models.push(...(Array.isArray(data.models)?data.models:[]));
   pageToken=String(data.nextPageToken||'');
   if(!pageToken)break;
  }
  const supported=models.filter(item=>Array.isArray(item.supportedGenerationMethods)&&item.supportedGenerationMethods.includes('generateContent')&&String(item.name||'').trim());
  const unique=[...new Map(supported.map(item=>[String(item.name).replace(/^models\//,''),item])).values()];
  if(!unique.length)throw new Error('API key diterima, tetapi Gemini API tidak mengembalikan model yang mendukung generateContent. Periksa izin project dan API key di Google AI Studio.');
  const preferred=['gemini-3.8-flash','gemini-4-argon','gemini-3.1-pro-preview','gemini-3.5-flash-lite'];
  unique.sort((a,b)=>{const an=String(a.name).replace(/^models\//,''),bn=String(b.name).replace(/^models\//,'');const ai=preferred.indexOf(an),bi=preferred.indexOf(bn);return (ai<0?999:ai)-(bi<0?999:bi)||an.localeCompare(bn);});
  const names=unique.map(item=>String(item.name).replace(/^models\//,''));
  const chosen=names.includes(selected)?selected:(preferred.find(name=>names.includes(name))||names[0]);
  [$('trozalBrowserAiModel'),$('trozalAiProviderModel')].filter(Boolean).forEach(node=>{
   node.replaceChildren();
   unique.forEach(item=>{const name=String(item.name).replace(/^models\//,'');const option=document.createElement('option');option.value=name;const display=String(item.displayName||name).trim();option.textContent=display+(/preview|experimental/i.test(name+' '+display)?' · Preview':'')+' ('+name+')';option.title=String(item.description||display);node.append(option);});
   node.value=chosen;
  });
  return {names,selected:chosen};
 }
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
  if(response.status===503)return 'Server Gemini sedang sibuk (HTTP 503). Permintaan akan dicoba ulang secara otomatis: '+detail;
  return 'Gemini Cloud HTTP '+response.status+': '+detail;
 }
 async function requestJson(url,options,timeoutMs,onStatus){
  options=options||{};
  const externalSignal=options.signal||null;
  const totalBudgetMs=Math.max(1000,Math.min(Number(timeoutMs)||90000,90000));
  const modelPath=String(url||''),modelStart=modelPath.indexOf('/models/')+8,modelEnd=modelPath.indexOf(':generateContent',modelStart);
  const requestModel=modelStart>=8&&modelEnd>modelStart?decodeURIComponent(modelPath.slice(modelStart,modelEnd)):'Gemini Cloud';
  const reportStatus=message=>{if(typeof onStatus==='function'){try{onStatus(String(message));}catch(_){}}};
  const totalController=new AbortController();
  let totalTimedOut=false;
  const abortFromCaller=()=>totalController.abort(externalSignal?.reason);
  if(externalSignal?.aborted)abortFromCaller();
  else externalSignal?.addEventListener('abort',abortFromCaller,{once:true});
  const totalTimer=setTimeout(()=>{totalTimedOut=true;totalController.abort(new Error('Gemini total request timeout'));},totalBudgetMs);
  const totalSignal=totalController.signal;
  const startedAt=Date.now();
  let lastError=null;
  const waitForRetry=(delay)=>new Promise((resolve,reject)=>{
   if(totalSignal.aborted){reject(new Error('Permintaan dibatalkan.'));return;}
   const timerId=setTimeout(()=>{totalSignal.removeEventListener('abort',abort);resolve();},Math.min(delay,Math.max(0,totalBudgetMs-(Date.now()-startedAt))));
   const abort=()=>{clearTimeout(timerId);totalSignal.removeEventListener('abort',abort);reject(new Error('Permintaan dibatalkan.'));};
   totalSignal.addEventListener('abort',abort,{once:true});
  });
  try{
   if(totalSignal.aborted)throw new Error('Permintaan dibatalkan.');
   for(let attempt=0;attempt<3;attempt++){
    if(totalSignal.aborted)throw new Error('Permintaan dibatalkan.');
    const remaining=totalBudgetMs-(Date.now()-startedAt);
    if(remaining<=0){totalTimedOut=true;throw new Error('Gemini total request timeout');}
    const attemptController=new AbortController();
    let attemptTimedOut=false;
    const abortAttempt=()=>attemptController.abort(totalSignal.reason);
    totalSignal.addEventListener('abort',abortAttempt,{once:true});
    const attemptTimeout=Math.min(25000,remaining);
    const attemptTimer=setTimeout(()=>{attemptTimedOut=true;attemptController.abort(new Error('Gemini attempt timeout'));},attemptTimeout);
    const requestOptions=Object.assign({},options,{signal:attemptController.signal});
    let retryAfterMs=0;
    try{
     reportStatus('Menghubungi '+requestModel+' · percobaan '+(attempt+1)+'/3…');
     const response=await fetch(url,requestOptions);
     const payload=await response.json().catch(()=>({}));
     if(!response.ok){
      const error=new Error(friendlyApiError(response,payload));
      error.status=response.status;
      error.apiReason=String(payload?.error?.status||payload?.error?.details?.[0]?.reason||'');
      if(response.status===429||response.status===400||response.status===401||response.status===403||response.status===404)throw error;
      if(response.status<500&&response.status!==408&&response.status!==425)throw error;
      const retryHeader=response.headers?.get?.('Retry-After');
      if(retryHeader){
       const seconds=Number(retryHeader);
       const dateDelay=Date.parse(retryHeader)-Date.now();
       retryAfterMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Number.isFinite(dateDelay)?dateDelay:0);
      }
      lastError=error;
     }else return payload;
    }catch(error){
     if(totalSignal.aborted)throw error;
     if(error?.status&&error.status!==408&&error.status!==425&&error.status<500)throw error;
     if(error?.status>=500||error?.status===408||error?.status===425){
      lastError=error;
     }else if(attemptTimedOut){
      lastError=new Error('Percobaan Gemini melewati batas '+Math.round(attemptTimeout/1000)+' detik.');
     }else if(error instanceof TypeError||/Failed to fetch|NetworkError|Load failed|network/i.test(error?.message||'')){
      lastError=error;
     }else throw error;
    }finally{
     clearTimeout(attemptTimer);
     totalSignal.removeEventListener('abort',abortAttempt);
    }
    if(totalSignal.aborted)throw new Error('Permintaan dibatalkan.');
    if(attempt<2){
     const backoff=1600*Math.pow(2,attempt);
     const jitter=Math.floor(Math.random()*Math.min(700,backoff*.15));
     const remainingAfterAttempt=totalBudgetMs-(Date.now()-startedAt);
     if(remainingAfterAttempt<=0){totalTimedOut=true;throw new Error('Gemini total request timeout');}
     const retryDelay=Math.min(remainingAfterAttempt,30000,Math.max(backoff+jitter,retryAfterMs));
     reportStatus('Gemini '+(lastError?.status?'HTTP '+lastError.status:'tidak merespons')+' · mencoba ulang '+(attempt+2)+'/3 dalam '+Math.max(1,Math.ceil(retryDelay/1000))+' dtk…');
     await waitForRetry(retryDelay);
    }
   }
   if(lastError?.status===503)throw new Error('Server Gemini masih sibuk (HTTP 503) setelah 3 percobaan. Ini gangguan sementara di sisi layanan Google, bukan kesalahan kode Canvas atau API key. Coba lagi beberapa saat atau pilih Gemini 3.5 Flash-Lite. Prompt dan kode editor tetap aman. Detail: '+lastError.message);
   if(lastError?.status>=500)throw new Error('Gemini mengalami gangguan server (HTTP '+lastError.status+') setelah 3 percobaan. Prompt dan editor tetap tersedia; coba lagi beberapa saat. Detail: '+lastError.message);
   if(lastError&&/melewati batas/.test(lastError.message))throw new Error('Gemini tidak merespons dalam batas waktu tiap percobaan. Proses dihentikan setelah 3 percobaan atau batas waktu total. Brief dan pekerjaan editor tetap aman.');
   throw new Error('Koneksi Gemini gagal setelah 3 percobaan. Periksa internet lalu coba lagi. Pekerjaan editor tidak dihapus.');
  }catch(error){
   if(externalSignal?.aborted)throw new Error('Permintaan dibatalkan oleh pengguna. Brief dan pekerjaan editor tetap aman.');
   if(totalTimedOut||totalSignal.aborted){reportStatus('Gemini timeout · brief dan kode editor tetap aman.');throw new Error('Permintaan Gemini melewati batas waktu total ('+Math.round(totalBudgetMs/1000)+' detik). Tidak ada perubahan pada kode editor atau preview. Coba lagi atau pilih Gemini 3.5 Flash-Lite.');}
   if(error?.status===429)throw new Error('Kuota / rate limit Gemini tercapai (HTTP 429). Retry otomatis dihentikan agar tidak menghabiskan percobaan. Periksa Google AI Studio / billing, tunggu reset kuota, atau pilih model lain yang API key Anda izinkan. Brief tetap tersedia untuk mode manual.');
   if(/Failed to fetch|NetworkError|Load failed/i.test(error?.message||'')){
    throw new Error('Tidak dapat menghubungi Gemini Cloud setelah retry otomatis. Periksa koneksi internet, izin jaringan browser, dan status layanan Google. Brief tetap tersedia untuk mode manual.');
   }
   throw error;
  }finally{
   clearTimeout(totalTimer);
   externalSignal?.removeEventListener('abort',abortFromCaller);
  }
 }
 function requireKey(){
  const value=apiKey();
  if(!value)throw new Error('Masukkan Gemini API key pada panel AI Scene Composer terlebih dahulu.');
  return value;
 }
 function interactionText(payload){
  const parts=payload?.candidates?.[0]?.content?.parts;
  if(!Array.isArray(parts))return '';
  return parts.filter(part=>typeof part?.text==='string'&&!part.thought).map(part=>part.text).join('\n').trim();
 }
 async function createInteraction(input,options){
  options=options||{};
  const provider=providerId(),key=providerKey(),model=modelId();
  const items=typeof input==='string'?[{type:'text',text:input}]:input;
  if(provider==='webgpu'){
   if(items.some(item=>item.type!=='text'))throw new Error('Local WebGPU saat ini mendukung prompt teks. Untuk analisis gambar/frame, pilih provider Vision cloud atau gunakan Smart Template.');
   if(!window.trozalWebGpuGenerate)throw new Error('Mesin Local WebGPU belum dimuat. Muat ulang halaman lalu periksa dukungan WebGPU browser.');
   return await window.trozalWebGpuGenerate(items.map(item=>item.text).join('\\n'),options);
  }
  if(!key)throw new Error('Masukkan API key untuk '+providerName()+' terlebih dahulu.');
  let url='',headers={'Content-Type':'application/json'},payload={};
  if(provider==='gemini'){const parts=items.map(x=>x.type==='text'?{text:x.text}:{inlineData:{mimeType:x.mime_type,data:x.data}});url=API+'/models/'+encodeURIComponent(model)+':generateContent';headers['x-goog-api-key']=key;const generationConfig=Object.assign({maxOutputTokens:8192},options.generationConfig||{});if(/^gemini-(?:3\.8|4-)/i.test(model)){['temperature','topP','topK','candidateCount','frequencyPenalty','presencePenalty'].forEach(key=>delete generationConfig[key]);if(generationConfig.thinkingConfig?.thinkingLevel==='MINIMAL')generationConfig.thinkingConfig.thinkingLevel='LOW';}payload={contents:[{role:'user',parts}],generationConfig,...(options.systemInstruction?{systemInstruction:{parts:[{text:String(options.systemInstruction)}]}}:{})};}
  else if(provider==='openai'){url='https://api.openai.com/v1/responses';headers.Authorization='Bearer '+key;const content=items.map(x=>x.type==='text'?{type:'input_text',text:x.text}:{type:'input_image',image_url:'data:'+x.mime_type+';base64,'+x.data,detail:'high'});payload={model,input:[{role:'user',content}],max_output_tokens:options.generationConfig?.maxOutputTokens||8192,instructions:options.systemInstruction||undefined};}
  else if(provider==='anthropic'){url='https://api.anthropic.com/v1/messages';headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';const content=items.map(x=>x.type==='text'?{type:'text',text:x.text}:{type:'image',source:{type:'base64',media_type:x.mime_type,data:x.data}});payload={model,max_tokens:options.generationConfig?.maxOutputTokens||8192,system:options.systemInstruction||undefined,messages:[{role:'user',content}]};}
  else{url=provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://api.mistral.ai/v1/chat/completions';headers.Authorization='Bearer '+key;const content=items.map(x=>x.type==='text'?{type:'text',text:x.text}:{type:'image_url',image_url:{url:'data:'+x.mime_type+';base64,'+x.data}});payload={model,messages:[...(options.systemInstruction?[{role:'system',content:options.systemInstruction}]:[]),{role:'user',content}],max_tokens:options.generationConfig?.maxOutputTokens||8192,temperature:options.generationConfig?.temperature??0.3};}
  if(provider==='gemini'){
   const data=await requestJson(url,{method:'POST',mode:'cors',credentials:'omit',headers,body:JSON.stringify(payload),signal:options.signal},options.timeoutMs||90000,options.onStatus);
   const output=interactionText(data);
   if(!output)throw new Error('Gemini menyelesaikan permintaan tetapi tidak mengembalikan teks. Coba ulangi atau pilih model lain.');
   return output;
  }
  const timeoutMs=Math.max(1000,Math.min(Number(options.timeoutMs)||180000,180000));
  const controller=new AbortController();let timedOut=false;
  const abortFromCaller=()=>controller.abort(options.signal?.reason);
  if(options.signal?.aborted)abortFromCaller();else options.signal?.addEventListener('abort',abortFromCaller,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  let response,data={};
  try{response=await fetch(url,{method:'POST',mode:'cors',credentials:'omit',headers,body:JSON.stringify(payload),signal:controller.signal});data=await response.json().catch(()=>({}));}
  catch(error){if(options.signal?.aborted)throw new Error('Permintaan dibatalkan oleh pengguna.');if(timedOut)throw new Error(providerName()+' melewati batas waktu '+Math.round(timeoutMs/1000)+' detik.');throw error;}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abortFromCaller);}
  if(!response.ok)throw new Error(providerName()+' HTTP '+response.status+': '+String(data?.error?.message||data?.message||response.statusText));
  let output='';if(provider==='openai')output=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');else if(provider==='anthropic')output=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\\n');else output=String(data.choices?.[0]?.message?.content||'');
  if(!output)throw new Error(providerName()+' tidak mengembalikan teks.');return output;
 }
 async function checkConnection(){
  const button=$('trozalProviderCheckBtn')||$('trozalGeminiCheckBtn');if(button)button.disabled=true;
  const message='Menguji koneksi '+providerName()+' · '+modelId()+'…';status('trozalGeminiConnectionStatus',message);status('trozalProviderStatus',message);
  try{
   if(providerId()==='webgpu'){
    const ready=await window.trozalWebGpuCheck?.();
    if(!ready)throw new Error('WebGPU belum siap. Periksa dukungan browser dan muat model lokal.');
    const output=await createInteraction('Reply with exactly: TROZAL LOCAL WEBGPU OK',{generationConfig:{maxOutputTokens:24},timeoutMs:120000});
    const msg='TERHUBUNG · Local WebGPU / '+modelId()+' siap tanpa API key. Model diproses di perangkat ini.';
    status('trozalGeminiConnectionStatus',msg);status('trozalProviderStatus',msg);status('trozalVisionConnection','Local WebGPU aktif · mode teks saja');return /TROZAL LOCAL WEBGPU OK/i.test(output);
   }
   if(providerId()==='gemini'){
    const discovered=await discoverGeminiModels(requireKey());
    if(discovered.selected!==modelId())syncGeminiModelSelectors(discovered.selected);
    const names=discovered.names;
    const probe=await createInteraction('Reply with exactly: TROZAL GEMINI GENERATION OK',{generationConfig:{maxOutputTokens:24},timeoutMs:30000});if(!/TROZAL GEMINI GENERATION OK/i.test(probe))throw new Error('Model terdaftar tetapi uji generateContent tidak mengembalikan respons yang diharapkan.');
    const msg='TERHUBUNG · '+names.length+' model Gemini tersedia pada API key ini · Uji generasi berhasil · '+modelId()+'.';
    status('trozalGeminiConnectionStatus',msg);status('trozalProviderStatus',msg);status('trozalVisionConnection','Gemini Cloud aktif · '+modelId());return true;
   }
   const output=await createInteraction('Reply with exactly: TROZAL CONNECTION OK',{generationConfig:{maxOutputTokens:24},timeoutMs:30000});
   const success=/TROZAL CONNECTION OK/i.test(output);const msg=success?'TERHUBUNG · '+providerName()+' / '+modelId()+' siap untuk Scene Composer dan Vision.':'Provider merespons, tetapi hasil uji tidak sesuai.';
   status('trozalGeminiConnectionStatus',msg,!success);status('trozalProviderStatus',msg,!success);status('trozalVisionConnection',providerName()+' Cloud aktif · '+modelId());return success;
  }catch(error){const msg=(error.message||String(error));status('trozalGeminiConnectionStatus',msg,true);status('trozalProviderStatus',msg,true);return false;}finally{if(button)button.disabled=false;}
 }
 function extractHtml(raw){
  let code=String(raw||'').trim();
  const fence=String.fromCharCode(96).repeat(3);
  if(code.startsWith(fence)){   code=code.slice(fence.length);
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
  if(/(?:href|src)\s*=\s*['"]https?:\/\/|url\(\s*['"]?https?:\/\//i.test(code))throw new Error('Hasil memakai referensi aset eksternal. Minta Gemini membuat seluruh visual dengan SVG dan CSS inline.');
  if((lower.includes('<!doctype html')||lower.includes('<html'))&&!lower.includes('</html>'))throw new Error('Dokumen HTML terpotong sebelum tag penutup. Coba generate ulang.');
  if(typeof buildSafeHtmlDocument==='function')code=buildSafeHtmlDocument(code);
  const parsed=new DOMParser().parseFromString(code,'text/html');
  if(!parsed.querySelector('svg'))throw new Error('SVG tidak ditemukan setelah pemeriksaan HTML.');
  return code;
 }
 function showSceneRecovery(message){
  const statusNode=$('visualMotionAiStatus');
  if(!statusNode)return;
  let panel=$('trozalGeminiRecoveryPanel');
  if(!panel){
   panel=document.createElement('div');
   panel.id='trozalGeminiRecoveryPanel';
   panel.style.cssText='margin-top:8px;padding:10px;border:1px solid #9a7437;border-radius:8px;background:#2b2418;color:#f4dfb5;font-size:11px;';
   const title=document.createElement('strong');title.textContent='GEMINI RECOVERY · FALLBACK AKTIF';
   const detail=document.createElement('div');detail.id='trozalGeminiRecoveryDetail';detail.style.margin='5px 0 8px';
   const actions=document.createElement('div');actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
   const copy=document.createElement('button');copy.type='button';copy.textContent='Salin brief lengkap';
   copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(buildScenePrompt());copy.textContent='Brief tersalin';}
    catch(_){const prompt=$('visualMotionPrompt');if(prompt){prompt.focus();prompt.select();copy.textContent='Brief dipilih · Ctrl+C';}}
   });
   const retry=document.createElement('button');retry.type='button';retry.textContent='Coba ulang Gemini';
   retry.addEventListener('click',()=>{if(!sceneController)generateScene();});
   const check=document.createElement('button');check.type='button';check.textContent='Periksa koneksi & model';
   check.addEventListener('click',()=>checkConnection());
   const manual=document.createElement('button');manual.type='button';manual.textContent='Buka HTML Terminal';
   manual.addEventListener('click',()=>{$('aiCodeTerminal')?.focus();$('aiCodeTerminal')?.scrollIntoView({behavior:'smooth',block:'center'});});
   actions.append(copy,retry,check,manual);panel.append(title,detail,actions);statusNode.insertAdjacentElement('afterend',panel);
  }
  $('trozalGeminiRecoveryDetail').textContent=String(message||'Gemini tidak tersedia. Brief tidak dihapus; editor, preview, dan render manual tetap bisa digunakan.');
  panel.style.display='block';
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
  const scenePlan=window.TROZAL_SCENE_INTELLIGENCE?.build(brief,duration)||'Gunakan brief lengkap sebagai satu adegan koheren.';
  return [
   'VISUAL BRIEF:\n'+brief,
   'SCENE INTELLIGENCE / BEAT PLAN:\n'+scenePlan,
   themePrompt?'THEME INTELLIGENCE / DETAIL TEMA:\n'+themePrompt:'',
   'INTELLECTUAL PROPERTY / ORIGINALITY POLICY:',
   'Create only original visual content. Do not depict, name, reproduce, trace, imitate, or closely evoke copyrighted characters, fictional universes, celebrity likenesses, signature costumes, protected artwork, proprietary designs, or recognizable third-party intellectual property.',
   'Do not show real company or product logos, brand marks, trademarks, watermarks, signatures, or recognizable corporate identities. Do not invent a logo or wordmark; for branding/logo themes use abstract non-identifying geometry only, with no logo, brand name, or trademark.',
   'If the brief requests protected IP, transform it into a distinct original alternative using only broad, unprotected mood or genre attributes; never copy distinctive protected elements.',
   'Do not include copyrighted lyrics, quotations, source artwork, screenshots, or copied text.',
   'OUTPUT REQUIREMENTS:',
   'Return only one complete standalone HTML5 document with one polished, detailed SVG motion-graphics composition.',
   'Use at least five semantic SVG groups with unique descriptive IDs: background, environment, main subject, secondary objects, foreground or atmosphere.',
   'Animate at least three appropriate SVG groups independently using inline CSS @keyframes, smooth easing, and deliberate timing.',
   'Represent every planned beat in order. Treat the beat plan as the narrative spine, not optional inspiration.',
   'Keep the main subject recognizably identical across beats: preserve silhouette, costume/material, palette, scale, and screen direction unless the brief explicitly changes them.',
   'For each beat, stage a readable action pose and cause/effect; use foreground, midground, and background to clarify spatial relationships.',
   'Choose shot size and camera movement to serve the action (establish, follow, reveal, hold); do not add random camera motion or unrelated events.',
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
   const button=$('generateVisualMotionAiBtn'),cancel=$('cancelBrowserAiGenerationBtn');
   if(sceneController)return;
   const controller=new AbortController();sceneController=controller;
   const engine=$('trozalSceneEngine')?.value||'auto',fallback=$('trozalSceneAutoFallback')?.checked!==false;
   if(button){button.disabled=true;button.textContent='Scene Composer sedang bekerja…';}
   if(cancel)cancel.style.display='block';
   try{
    if(engine==='template'||(providerId()!=='webgpu'&&!apiKey())){
     if(engine!=='template'&&!fallback)throw new Error('Gemini API key belum diisi dan fallback otomatis dimatikan.');
     if(engine!=='template')status('trozalSceneEngineStatus','Gemini API key belum tersedia · Smart Template mengambil alih.');
     else status('trozalSceneEngineStatus','Smart Template Composer aktif · tanpa API.');
     applySceneCode(buildTemplateScene(),'Smart Template fallback');return;
    }
    status('trozalSceneEngineStatus',providerName()+' menjadi mesin aktif · fallback '+(fallback?'aktif':'nonaktif')+'.');
    status('visualMotionAiStatus','Mengirim brief ke '+providerName()+' ('+modelId()+')…');
    try{
     const output=await createInteraction(buildScenePrompt(),{systemInstruction:'You are an expert motion-graphics art director and SVG animation engineer. Create a visually rich, concept-specific production-ready HTML/SVG animation. Follow all explicit visual requirements and preserve the entire requested concept. Return complete code only.\n\nCreate only original visual content. Do not depict, name, reproduce, trace, imitate, or closely evoke copyrighted characters, fictional universes, celebrity likenesses, signature costumes, protected artwork, proprietary designs, or recognizable third-party intellectual property. Do not show real company or product logos, brand marks, trademarks, watermarks, signatures, or recognizable corporate identities. Do not invent logos or wordmarks; use abstract non-identifying geometry for branding themes. If protected IP is requested, transform it into a distinct original alternative using only broad mood or genre attributes. Do not include copyrighted lyrics, quotations, source artwork, screenshots, or copied text.',generationConfig:{temperature:0.35,maxOutputTokens:8192},signal:controller.signal,timeoutMs:120000});
     if(controller.signal.aborted)throw new Error('Permintaan dibatalkan.');
     applySceneCode(extractHtml(output),'Gemini Cloud');
     status('trozalSceneEngineStatus','Selesai · Gemini Cloud berhasil digunakan sebagai mesin utama.');
    }catch(error){
     if(controller.signal.aborted)throw error;
     if(!fallback)throw error;
     status('trozalSceneEngineStatus','Gemini gagal ('+(error.message||String(error))+') · Smart Template Composer mengambil alih.');
     applySceneCode(buildTemplateScene(),'Smart Template fallback');
     status('visualMotionAiStatus','Fallback otomatis berhasil. Hasil dibuat tanpa API; periksa komposisi sebelum impor.');
     showSceneRecovery('Gemini tidak menyelesaikan permintaan. Smart Template sudah membuat draf lokal; brief tetap tersedia. Anda dapat mencoba Gemini kembali kapan saja.');
    }
   }catch(error){
    const cancelled=controller.signal.aborted;
    status('visualMotionAiStatus',cancelled?'Generasi dibatalkan.':'Gagal membuat adegan: '+(error.message||String(error)),!cancelled);
    if(!cancelled)showSceneRecovery(error.message||String(error));
   }finally{
    sceneController=null;
    if(button){button.disabled=false;button.textContent='✦ GENERATE ADEGAN · AUTO';}
    if(cancel)cancel.style.display='none';
   }
  }
  function escapeSceneText(value){return String(value||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
  function buildTemplateScene(){
   const brief=String($('visualMotionPrompt')?.value||'').trim();
   if(!brief)throw new Error('Tulis brief visual terlebih dahulu.');
   const lower=(brief+' '+String($('svgAiPrompt')?.value||'')).toLowerCase(),accent=$('visualMotionAccent')?.value||'#65d9ff';
   const title=escapeSceneText(brief.replace(/\s+/g,' ').slice(0,76));
   const kind=/space|galaxy|planet|ruang angkasa|kosmos|bintang/.test(lower)?'space':/city|urban|building|kota|gedung|arsitektur/.test(lower)?'city':/product|bottle|phone|watch|produk|kemasan/.test(lower)?'product':/nature|forest|mountain|ocean|hutan|gunung|laut|alam/.test(lower)?'nature':/education|school|science|learning|pendidikan|sekolah|sains/.test(lower)?'education':/sport|football|soccer|basket|esport|olahraga/.test(lower)?'sport':'abstract';
   const shapes={
    space:'<circle cx="640" cy="350" r="112" fill="url(#hero)"/><ellipse cx="640" cy="350" rx="190" ry="58" fill="none" stroke="#d8f4ff" stroke-width="7" transform="rotate(-22 640 350)"/><circle cx="790" cy="280" r="25" fill="'+accent+'"/>',
    city:'<path d="M430 520V300h95v220M550 520V210h125v310M700 520V335h105v185M830 520V260h90v260" fill="url(#hero)" stroke="#d9f7ff" stroke-width="4"/><path d="M450 335h45m55-45h55m-55 90h55m90-45h55" stroke="#fff" stroke-width="8"/>',
    product:'<rect x="535" y="205" width="210" height="300" rx="42" fill="url(#hero)" stroke="#f2fbff" stroke-width="6"/><rect x="580" y="165" width="120" height="48" rx="12" fill="#d9f7ff"/><circle cx="640" cy="390" r="42" fill="'+accent+'"/>',
    nature:'<path d="M300 520L510 230l145 190 105-145 230 245Z" fill="url(#hero)"/><circle cx="900" cy="180" r="72" fill="'+accent+'"/><path d="M470 520q-30-115 55-185 75 80 42 185" fill="#70d6a4"/>',
    education:'<rect x="455" y="225" width="370" height="265" rx="28" fill="url(#hero)" stroke="#e6f8ff" stroke-width="6"/><path d="M520 310h240M520 365h180M520 420h205" stroke="#fff" stroke-width="15" stroke-linecap="round"/>',
    sport:'<circle cx="640" cy="350" r="145" fill="url(#hero)" stroke="#f2fbff" stroke-width="7"/><path d="M640 205l48 72 85 26-52 72 2 88-83-27-83 27 2-88-52-72 85-26Z" fill="none" stroke="#fff" stroke-width="9"/>',
    abstract:'<circle cx="640" cy="350" r="138" fill="url(#hero)"/><rect x="515" y="220" width="250" height="250" rx="42" fill="none" stroke="#f4fbff" stroke-width="8" transform="rotate(35 640 350)"/><path d="M450 350h380M640 160v380" stroke="'+accent+'" stroke-width="5"/>'
   }[kind];
   const dots=$('visualMotionParticles')?.checked!==false?Array.from({length:24},(_,i)=>'<circle cx="'+(90+(i*137)%1100)+'" cy="'+(70+(i*83)%560)+'" r="'+(2+i%4)+'" fill="'+(i%3===0?accent:'#eaf8ff')+'" opacity=".55"/>').join(''):'';
   const orbit=$('visualMotionDepth')?.checked!==false?'<circle cx="640" cy="350" r="255" fill="none" stroke="'+accent+'" stroke-opacity=".22" stroke-width="2" stroke-dasharray="8 18"/>':'';
   return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TROZAL Smart Scene</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#07101d;font-family:Arial,sans-serif}.stage{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,#203b58,#050a13 78%)}svg{width:100%;height:100%;display:block}.float{animation:float 6s ease-in-out infinite}.orbit{transform-origin:640px 350px;animation:orbit 18s linear infinite}.pulse{transform-origin:640px 350px;animation:pulse 4s ease-in-out infinite}.glow{filter:drop-shadow(0 0 24px '+accent+'88)}.caption{font-size:25px;letter-spacing:4px;fill:#d9edff;opacity:.8}@keyframes float{50%{transform:translateY(-18px)}}@keyframes orbit{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.62;transform:scale(1.06)}}</style></head><body><main class="stage"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="'+title+'"><defs><linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+accent+'"/><stop offset="1" stop-color="#6454c8"/></linearGradient><radialGradient id="halo"><stop stop-color="'+accent+'" stop-opacity=".36"/><stop offset="1" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs><g id="background"><rect width="1280" height="720" fill="#07101d"/><ellipse cx="640" cy="350" rx="510" ry="300" fill="url(#halo)"/></g><g id="environment" class="orbit">'+orbit+dots+'</g><g id="main-subject" class="float glow"><g class="pulse">'+shapes+'</g></g><g id="secondary-objects" class="orbit"><path d="M210 560Q640 630 1070 560" fill="none" stroke="'+accent+'" stroke-width="2" opacity=".45"/><circle cx="280" cy="530" r="8" fill="#fff"/><circle cx="1000" cy="525" r="6" fill="'+accent+'"/></g><g id="foreground"><text x="640" y="625" text-anchor="middle" class="caption">'+title+'</text><path d="M470 650h340" stroke="'+accent+'" stroke-width="3"/></g></svg></main></body></html>';
  }
  function applySceneCode(code,source){
   $('visualMotionOutput').value=code;$('visualMotionPreview').srcdoc=code;
   if(typeof visualMotionPreviewSetRatio==='function')visualMotionPreviewSetRatio();
   const recovery=$('trozalGeminiRecoveryPanel');if(recovery)recovery.style.display='none';
   status('visualMotionAiStatus','Selesai · '+source+' menghasilkan HTML/SVG ('+code.length.toLocaleString()+' karakter). Periksa Preview sebelum mengimpor.');
   status('visualMotionStatus',source+' Scene Composer selesai. Klik “Kirim ke Preview TROZAL” untuk memasukkan hasil ke mesin motion utama.');
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
    let canvas;    if(typeof htmlMotionIframe!=='undefined'&&htmlMotionIframe&&htmlMotionIframe.contentDocument&&typeof captureHtmlMotionAt==='function'){
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
  // Batasi seluruh konten ke lebar panel. Gambar hasil capture dapat
  // berukuran 1280px; tanpa aturan ini intrinsic width mendorong grid melebar.
  panel.style.boxSizing='border-box';
  panel.style.width='100%';
  panel.style.maxWidth='100%';
  holder.style.display='grid';
  holder.style.gridTemplateColumns='repeat(auto-fit,minmax(min(100%,150px),1fr))';
  holder.style.gap='8px';
  holder.style.width='100%';
  holder.style.maxWidth='100%';
  holder.style.minWidth='0';
  holder.style.boxSizing='border-box';
  holder.style.alignItems='start';
  holder.replaceChildren();
  images.forEach((item,index)=>{
   const wrapper=document.createElement('div');
   wrapper.style.minWidth='0';
   wrapper.style.maxWidth='100%';
   wrapper.style.overflow='hidden';
   wrapper.style.boxSizing='border-box';
   wrapper.style.border='1px solid rgba(115,225,192,.25)';
   wrapper.style.borderRadius='7px';
   wrapper.style.padding='5px';
   const image=document.createElement('img');
   image.alt='Bukti frame '+(index+1);
   image.src='data:'+item.mime_type+';base64,'+item.data;
   image.style.display='block';
   image.style.width='100%';
   image.style.maxWidth='100%';
   image.style.height='auto';
   image.style.maxHeight='190px';
   image.style.objectFit='contain';
   image.style.objectPosition='center';
   image.style.borderRadius='4px';
   const label=document.createElement('div');
   label.className='help';
   label.style.maxWidth='100%';
   label.style.overflowWrap='anywhere';
   label.style.textAlign='center';
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
 function fillMetadata(data,source){
  const metadataSource=String(source||providerName()+' Vision · '+modelId());
  const title=String(data.title||'').trim();
  const description=String(data.description||'').trim();
  const keywords=Array.isArray(data.keywords)?data.keywords.map(value=>String(value).trim()).filter(Boolean):[];
  if(title)$('metadataTitle').value=title.slice(0,180);
  if(description)$('metadataDescription').value=description;
  const category=$('metadataCategory');
  const match=[...category.options].find(option=>option.text.trim().toLowerCase()===String(data.category||'').trim().toLowerCase());
  if(match)category.value=match.value;
  if(keywords.length){
   const uniqueKeywords=[...new Set(keywords)].slice(0,47);
   $('metadataKeywords').value=uniqueKeywords.join(', ');
   $('metadataKeywords').dispatchEvent(new Event('input',{bubbles:true}));
   const counter=$('metadataKeywordCount');
   if(counter)counter.textContent=uniqueKeywords.length+' / 47 maks.';
  }
  status('trozalGeminiVisualSummary',data.visual_summary?'Ringkasan visual: '+String(data.visual_summary):'');
  const objects=Array.isArray(data.visible_objects)?data.visible_objects.join(', '):'';
  status('trozalGeminiVisibleObjects',objects?'Objek yang terlihat: '+objects:'');
  status('metadataStatus',metadataSource.startsWith('Smart Template')
   ?'Draf metadata sementara dibuat dari brief/teks, bukan pengenalan piksel. Periksa dan koreksi semua kolom sebelum digunakan.'
   :'Draf metadata dibuat dari bukti piksel melalui '+metadataSource+'. Periksa semua kolom sebelum digunakan.');
 }
 function buildVisionFallbackMetadata(allowed){
  const read=id=>String($(id)?.value||'').trim();
  const brief=read('visualMotionPrompt');
  const theme=read('svgAiTheme');
  const visualPrompt=read('svgAiPrompt');
  const category=read('svgAiCategory');
  const specific=read('svgAiSpecific');
  const details=read('svgAiDetails');
  const themeBrief=read('svgAiThemeBrief');
  const subject=read('metadataSubject');
  const parts=[
   brief&&'Visual brief: '+brief,
   theme&&'Main theme: '+theme,
   category&&'Visual category: '+category,
   specific&&'Specific direction: '+specific,
   details&&'Additional details: '+details,
   themeBrief&&'Automatic theme specifications: '+themeBrief,
   subject&&'Metadata subject: '+subject
  ].filter(Boolean);
  // Generated prompt is a last-resort source only; avoid treating boilerplate
  // instructions as visual evidence when structured theme fields are available.
  if(!parts.length&&visualPrompt)parts.push('Theme prompt: '+visualPrompt.slice(0,1800));
  const sourceText=parts.join(' · ').replace(/\s+/g,' ').trim();
  const fallbackSource=sourceText||'Original motion graphic concept';
  const titleSeed=(brief||specific||theme||subject||category||visualPrompt||'Original motion graphic concept').split(/[.!?\n]/)[0].trim();
  const title=(titleSeed||'Original motion graphic concept').slice(0,100);
  const description=fallbackSource.slice(0,360);
  const words=fallbackSource.toLowerCase().match(/[a-z0-9]{3,}\b/g)||[];
  const stop=new Set(['the','and','for','with','from','into','that','this','then','than','when','where','while','your','you','are','was','were','have','has','its','use','using','create','make','show','motion','graphics','visual','scene','style','design','yang','dan','untuk','dengan','dari','pada','dalam','agar','atau','ini','itu','sebuah','buat','membuat','tampilkan','adegan','gerak','main','theme','category','specific','direction','additional','details','automatic','specifications','brief','original','graphic','concept']);
  const keywords=[...new Set(words.filter(word=>!stop.has(word)))].slice(0,47);
  const categoryScores=(allowed||[]).map(label=>{
   const terms=String(label).toLowerCase().match(/[a-z0-9]{3,}\b/g)||[];
   return {label,score:terms.reduce((sum,term)=>sum+(words.includes(term)?1:0),0)};
  }).sort((a,b)=>b.score-a.score);
  const selectedCategory=(allowed||[]).find(label=>String(label).toLowerCase()===category.toLowerCase());
  const bestCategory=categoryScores[0]?.score>0?categoryScores[0].label:'';
  return {
   title,
   description,
   category:selectedCategory||bestCategory||'',
   keywords,
   visual_summary:'Analisis visual cloud tidak tersedia. Metadata sementara disusun dari brief, tema, kategori, subtema, dan detail editor yang tersedia; isi frame belum diverifikasi oleh AI.',
   visible_objects:[],
   confidence_notes:'Fallback tekstual saja. Jangan menganggap objek, warna, komposisi, atau gerakan telah dikenali dari piksel. Bukti visual tetap tersimpan untuk diperiksa.'
  };
 }
 async function analyzeVision(){
  if(providerId()==='webgpu')throw new Error('Local WebGPU saat ini hanya mendukung Scene Composer berbasis teks. Untuk analisis gambar/frame, pilih Gemini, OpenAI, Claude, Groq, atau Mistral.')
  const button=$('trozalGeminiAnalyzeBtn');
  const cancel=$('cancelGeminiVisionBtn');
  if(visionController)return;
  const controller=new AbortController();
  visionController=controller;
  if(button){button.disabled=true;button.textContent=providerName()+' menganalisis…';}
  if(cancel)cancel.style.display='block';
  $('trozalGeminiContactSheetPanel').style.display='none';
  status('trozalGeminiStatus','Menyiapkan bukti visual untuk '+providerName()+' Cloud…');
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
   status('trozalGeminiStatus','Mengirim '+images.length+' gambar ke '+modelId()+' · '+providerName()+' Cloud…');
   const output=await createInteraction(input,{    generationConfig:{temperature:0.15,maxOutputTokens:4096,responseMimeType:'application/json'},
    signal:controller.signal,
    timeoutMs:180000
   });
   const data=parseJson(output);
   if(!String(data.title||'').trim()&&!String(data.description||'').trim()&&!Array.isArray(data.keywords)){
    throw new Error('Gemini mengembalikan metadata kosong.');
   }
   fillMetadata(data);
   status('trozalGeminiStatus','Selesai · metadata dari '+images.length+' gambar berhasil dibuat melalui '+providerName()+' Cloud ('+modelId()+'). Periksa frame bukti dan seluruh kolom sebelum ekspor.');
   status('trozalVisionStatus','Analisis cloud selesai · '+images.length+' frame · '+providerName()+' / '+modelId()+'.');
  }catch(error){
   const cancelled=controller.signal.aborted;
   if(cancelled){
    status('trozalGeminiStatus','Analisis dibatalkan. Bukti visual tetap tersedia.');
    status('trozalVisionStatus','Analisis dibatalkan.');
   }else{
    try{
     const allowed=[...$('metadataCategory').options].map(option=>option.text);
     const fallback=buildVisionFallbackMetadata(allowed);
     fillMetadata(fallback,'Smart Template · fallback tekstual');
     status('trozalGeminiStatus',providerName()+' Cloud gagal pada model '+modelId()+': '+(error.message||String(error))+'. Smart Template fallback aktif · metadata sementara dibuat dari brief, bukan analisis piksel. Bukti visual tetap tersedia.');
     status('trozalVisionStatus','Fallback tekstual aktif · objek dan detail visual tidak diklaim telah dikenali. Pilih provider/model lain dan masukkan API key-nya untuk mencoba analisis visual cloud.');
    }catch(fallbackError){
     status('trozalGeminiStatus',providerName()+' Cloud gagal: '+(error.message||String(error))+' · fallback belum dapat dibuat: '+(fallbackError.message||String(fallbackError)),true);
     status('trozalVisionStatus','Analisis belum selesai. Bukti visual tetap tersedia untuk diperiksa.',true);
    }
   }
  }finally{
   visionController=null;
   if(button){button.disabled=false;button.textContent='✦ ANALISIS VISUAL DENGAN '+providerName().toUpperCase()+' CLOUD';}
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
 function bindMetadataSource(buttonId){
  const button=$(buttonId);
  if(!button)return;
  // Determine source from the concrete button ID, not a caller-supplied flag.
  // This prevents the HTML and Scene AI actions from being accidentally crossed.
  const source=button.id==='metadataFromHtmlMotionBtn'?'html':button.id==='metadataFromSceneAiBtn'?'scene':null;
  if(!source||button.dataset.metadataSourceBound==='true')return;
  button.dataset.metadataSource=source;
  button.dataset.metadataSourceBound='true';
  button.addEventListener('click',async(event)=>{
   event.preventDefault();
   event.stopPropagation();
   if(button.disabled)return;
   const other=$(source==='html'?'metadataFromSceneAiBtn':'metadataFromHtmlMotionBtn');
   button.disabled=true;
   if(other)other.disabled=true;
   button.setAttribute('aria-busy','true');
   const label=source==='html'?'HTML Motion':'Scene AI';
   try{
    status('trozalMetadataSourceStatus','Menyiapkan sumber '+label+'…');
    if(source==='scene'){
     const code=String($('visualMotionOutput')?.value||'').trim();
     if(!code)throw new Error('Belum ada hasil Scene Composer. Generate adegan terlebih dahulu.');
     $('aiCodeTerminal').value=code;
    }else{
     const terminalCode=String($('aiCodeTerminal')?.value||'').trim();
     const active=window.trozalGetHtmlMotionMetadataSource?.()||{};
     const activeCode=active.loaded?String(active.code||'').trim():'';
     const code=terminalCode||activeCode;
     if(!code)throw new Error('Belum ada HTML Motion. Tempel dokumen HTML pada Terminal Kode HTML, atau terapkan HTML ke Preview terlebih dahulu.');
     if(!terminalCode)$('aiCodeTerminal').value=code;
    }
    status('trozalMetadataSourceStatus','Memuat '+label+' ke Preview utama…');
    await generateMotionSvgLocally();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(source==='html'){
     const active=window.trozalGetHtmlMotionMetadataSource?.()||{};
     if(!active.loaded)throw new Error('HTML Motion belum berhasil dimuat ke Preview. Periksa HTML di Terminal, lalu tekan Terapkan HTML ke Preview.');
    }
    status('trozalMetadataSourceStatus','Preview siap · mengambil frame aktual untuk '+label+'…');
    await analyzeVision();
    const visionStatus=String($('trozalGeminiStatus')?.textContent||'');
    if(/Analisis Gemini gagal|Analisis dibatalkan/i.test(visionStatus)){
     status('trozalMetadataSourceStatus','GAGAL · '+visionStatus,true);
    }else if(/Selesai/i.test(visionStatus)){
     status('trozalMetadataSourceStatus','SELESAI · Metadata '+label+' dibuat dari bukti frame Preview melalui Gemini Cloud. Periksa seluruh kolom sebelum digunakan.');
    }else{
     status('trozalMetadataSourceStatus','Analisis '+label+' selesai dipanggil. Periksa status Gemini Cloud dan bukti frame.');
    }
   }catch(error){
    status('trozalMetadataSourceStatus','GAGAL · '+(error.message||String(error)),true);
   }finally{
    button.disabled=false;
    button.removeAttribute('aria-busy');
    if(other)other.disabled=false;
   }
  });
 }
 async function analyzeImageDataUrl(dataUrl){if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/'))throw new Error('Frame Canvas tidak valid.');const input=$('trozalVisionImages');if(!input)throw new Error('Input gambar metadata tidak ditemukan.');const response=await fetch(dataUrl);const blob=await response.blob();const file=new File([blob],'trozal-js-canvas-frame.png',{type:blob.type||'image/png'});const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;await analyzeVision();return true;}window.trozalBrowserAI=Object.freeze({generateText:createInteraction,provider:providerName,model:modelId,analyzeImageDataUrl});
 function init(){
  status('trozalVisionConnection','Vision cloud memakai provider terpilih. Local WebGPU saat ini untuk Scene Composer teks; analisis frame tetap memerlukan provider Vision cloud.');
  $('trozalGeminiCheckBtn')?.addEventListener('click',checkConnection);
  $('trozalProviderCheckBtn')?.addEventListener('click',checkConnection);
  $('trozalAiProvider')?.addEventListener('change',syncProviderUi);
  $('trozalAiProviderModel')?.addEventListener('change',event=>syncGeminiModelSelectors(event.currentTarget.value));
  $('trozalBrowserAiModel')?.addEventListener('change',event=>syncGeminiModelSelectors(event.currentTarget.value));
  $('trozalProviderClearBtn')?.addEventListener('click',()=>{['trozalOpenAiKey','trozalAnthropicKey','trozalGroqKey','trozalMistralKey'].forEach(id=>{if($(id))$(id).value='';});status('trozalProviderStatus','Semua API key alternatif dihapus dari halaman aktif.');});
  syncProviderUi();
  $('generateVisualMotionAiBtn')?.addEventListener('click',generateScene);
  $('cancelBrowserAiGenerationBtn')?.addEventListener('click',cancelScene);
  $('cancelGeminiVisionBtn')?.addEventListener('click',cancelVision);
  $('trozalGeminiAnalyzeBtn')?.addEventListener('click',analyzeVision);
  bindMetadataSource('metadataFromHtmlMotionBtn');
  bindMetadataSource('metadataFromSceneAiBtn');
  $('trozalVisionClearImagesBtn')?.addEventListener('click',()=>{
   $('trozalVisionImages').value='';
   $('trozalGeminiContactSheetPanel').style.display='none';
   status('trozalGeminiStatus','Pilihan gambar dihapus.');
  });
  $('trozalGeminiClearKeyBtn')?.addEventListener('click',clearKey);
  $('copyVisualMotionBtn')?.addEventListener('click',copyOutput);
  $('previewVisualMotionBtn')?.addEventListener('click',previewOutput);
  $('resetVisualMotionBtn')?.addEventListener('click',resetComposer);
  $('trozalVisionImages')?.addEventListener('change',()=>{
   const count=$('trozalVisionImages').files?.length||0;
   if(count>3)status('trozalGeminiStatus','Maksimal tiga gambar. Pilih ulang maksimal tiga file.',true);
   else status('trozalGeminiStatus',count?count+' gambar dipilih. Siap dianalisis melalui Gemini Cloud.':'Tidak ada gambar dipilih. Analisis akan memakai tiga frame Preview.');
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();