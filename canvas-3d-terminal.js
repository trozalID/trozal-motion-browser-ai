/* TROZAL MOTION · BROWSER CANVAS 3D CODE TERMINAL */
(function(){
'use strict';
if(window.__TROZAL_BROWSER_CANVAS3D_TERMINAL__)return;
window.__TROZAL_BROWSER_CANVAS3D_TERMINAL__=true;
const $=id=>document.getElementById(id);
const IP_POLICY="ORIGINAL CONTENT & INTELLECTUAL PROPERTY · ALWAYS ON: create independently original visual designs. Do not recreate or imitate third-party protected characters, fictional universes, celebrity likenesses, signature costumes, artworks, logos, trademarks, watermarks, signatures, or recognizable corporate identities. Do not copy lyrics, screenshots, source artwork, or proprietary text. For brand-like subjects use abstract, non-identifying geometry only. When a request names protected IP, reinterpret it as an original design using only a broad, unprotected mood or genre.";
let candidate=null,busy=false;
function status(message,bad){const e=$('t3dTerminalStatus');if(e){e.textContent=message;e.dataset.error=bad?'1':'0';}}
function reset(){candidate=null;$('t3dTerminalApply').disabled=true;$('t3dTerminalSceneResult').textContent='Belum ada scene tervalidasi.';}
function show(value){const p=$('t3dTerminalPanel');if(!p)return;p.hidden=!value;if(value)$('t3dTerminalPrompt').focus();}
function providerInfo(){try{return window.trozalBrowserAI?window.trozalBrowserAI.provider()+' · '+window.trozalBrowserAI.model():'Provider AI belum dimuat';}catch(_){return 'Provider AI belum siap';}}
function mount(){
 const header=$('trozal3DHeader'),overlay=$('trozalCanvas3DOverlay');if(!header||!overlay||$('t3dTerminalOpen'))return;
 const open=document.createElement('button');open.type='button';open.id='t3dTerminalOpen';open.textContent='⌘ Terminal';open.title='JavaScript / JSON Code Terminal';
 const close=$('trozal3DClose');if(close)header.insertBefore(open,close);else header.appendChild(open);
 const panel=document.createElement('section');panel.id='t3dTerminalPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Canvas 3D JavaScript and JSON Terminal');
 panel.innerHTML='<header class="t3dt-head"><div><strong>⌘ CANVAS 3D TERMINAL</strong><small>BROWSER AI · GENERATE JAVASCRIPT / SCENE JSON</small></div><button id="t3dTerminalClose" type="button">Tutup ✕</button></header><div class="t3dt-toolbar"><label>Output mode<select id="t3dTerminalMode"><option value="json">Scene JSON v2</option><option value="js">JavaScript Scene Script</option></select></label><span id="t3dTerminalProvider"></span><button id="t3dTerminalThemeBrief" type="button">Ambil Brief Tema</button></div><label class="t3dt-prompt">INSTRUKSI / PROMPT<textarea id="t3dTerminalPrompt" rows="3" placeholder="Contoh: Buat product showcase premium: botol kaca transparan, podium gelap, chrome accent, tiga lampu studio, kamera orbit lambat."></textarea></label><div class="t3dt-editor"><div class="t3dt-code"><div><b id="t3dTerminalCodeTitle">SCENE JSON EDITOR</b><span id="t3dTerminalCodeMode">JSON · v2</span></div><textarea id="t3dTerminalCode" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Kode JavaScript atau Scene JSON hasil AI tampil di sini…"></textarea></div><aside><b>WORKFLOW</b><ol><li>Pilih Scene JSON atau JavaScript.</li><li>Tulis brief dan tekan Generate.</li><li>Periksa serta edit kode secara langsung.</li><li>Validasi JSON atau jalankan JS terisolasi.</li><li>Terapkan hanya setelah hasil valid.</li></ol><b>PERLINDUNGAN IP</b><p>Terminal selalu meminta konten orisinal dan menghindari penyalinan karakter, semesta fiksi, karya seni, logo, merek dagang, watermark, atau identitas pihak lain.</p><b>JAVASCRIPT SANDBOX</b><p>JavaScript dijalankan sebagai fungsi scene dalam Web Worker di iframe sandbox terpisah. Worker tidak memiliki DOM, dan kebijakan konten memblokir koneksi jaringan. Batas waktu eksekusi 8 detik.</p></aside></div><div class="t3dt-actions"><button id="t3dTerminalGenerate" class="primary" type="button">✦ Generate Kode</button><button id="t3dTerminalValidate" type="button">✓ Validasi JSON</button><button id="t3dTerminalApply" class="primary" type="button" disabled>▶ Terapkan ke Canvas 3D</button><button id="t3dTerminalCopy" type="button">Salin</button><button id="t3dTerminalSave" type="button">Simpan .JSON</button><button id="t3dTerminalClear" type="button">Bersihkan</button></div><div id="t3dTerminalStatus" role="status">Siap · gunakan provider BROWSER AI yang aktif.</div><div id="t3dTerminalSceneResult" class="t3dt-result">Belum ada scene tervalidasi.</div><div id="t3dTerminalRunHost" hidden></div>';
 overlay.appendChild(panel);
 const css='#t3dTerminalPanel{position:absolute;z-index:140;inset:58px 4% 4%;display:flex;flex-direction:column;gap:9px;padding:12px;border:1px solid #7661a8;border-radius:12px;background:linear-gradient(145deg,#101b2c,#211735);color:#e9e5ff;box-shadow:0 20px 70px #000c;overflow:auto;font:12px/1.4 Arial,sans-serif}#t3dTerminalPanel[hidden]{display:none}#t3dTerminalPanel *{box-sizing:border-box}.t3dt-head,.t3dt-toolbar,.t3dt-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.t3dt-head{justify-content:space-between;padding-bottom:7px;border-bottom:1px solid #48506b}.t3dt-head strong,.t3dt-head small{display:block}.t3dt-head strong{color:#e1caff;font-size:13px;letter-spacing:.07em}.t3dt-head small{color:#9eabc6;font-size:9px}.t3dt-toolbar label{display:flex;align-items:center;gap:5px;color:#c9b9e7;font-size:10px}.t3dt-toolbar select{padding:6px;border:1px solid #565078;border-radius:6px;background:#0c1424;color:#eee}.t3dt-toolbar span{margin-left:auto;color:#9fc6df;font-size:9px}.t3dt-prompt{display:block;color:#c9b5ef;font-size:9px;font-weight:800}.t3dt-prompt textarea{display:block;width:100%;margin-top:4px;min-height:65px;resize:vertical;padding:8px;background:#080f1b;color:#f0edff;border:1px solid #4f4d78;border-radius:7px;font:12px/1.5 Consolas,monospace}.t3dt-editor{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,235px);gap:9px;min-height:260px;flex:1}.t3dt-code{display:flex;flex-direction:column;min-width:0;min-height:260px;border:1px solid #39445c;border-radius:8px;overflow:hidden;background:#070d17}.t3dt-code>div{display:flex;justify-content:space-between;gap:8px;padding:7px;background:#182337;color:#c9baff;font-size:9px}.t3dt-code>div span{color:#91a8c4}#t3dTerminalCode{flex:1;width:100%;min-height:245px;resize:vertical;padding:11px;border:0;outline:0;background:#070d17;color:#d7f2ff;font:12px/1.55 Consolas,monospace;white-space:pre;overflow:auto}.t3dt-editor aside{padding:10px;border:1px solid #3b4260;border-radius:8px;background:#14182a;color:#b8c2d8;font-size:10px;line-height:1.5;overflow:auto}.t3dt-editor aside b{color:#dccbff}.t3dt-editor aside ol{padding-left:18px;line-height:1.7}.t3dt-actions{padding-top:2px}#t3dTerminalPanel button{padding:7px 10px;border:1px solid #70608e;border-radius:6px;background:#25203d;color:#eee;cursor:pointer;font:inherit}#t3dTerminalPanel button.primary{background:linear-gradient(135deg,#7450ae,#237f9c);font-weight:800}#t3dTerminalPanel button:disabled{opacity:.4;cursor:not-allowed}.t3dt-result{padding:8px;background:#0a1422;border:1px solid #414c67;border-radius:7px;color:#a9e3d7;font-size:9px;white-space:pre-wrap}#t3dTerminalStatus{padding:9px;background:#0a1422;border:1px solid #414c67;border-radius:7px;font-size:10px}#t3dTerminalStatus[data-error="1"]{color:#ffb6c2;border-color:#99566c}@media(max-width:760px){#t3dTerminalPanel{inset:50px 6px 6px;padding:8px}.t3dt-editor{grid-template-columns:1fr;min-height:0}.t3dt-editor aside{max-height:115px}.t3dt-code{min-height:230px}.t3dt-toolbar span{margin-left:0}}';
 const style=document.createElement('style');style.id='t3dTerminalStyles';style.textContent=css;document.head.appendChild(style);
 $('t3dTerminalProvider').textContent=providerInfo();
 open.addEventListener('click',()=>{show(true);$('t3dTerminalProvider').textContent=providerInfo();});
 $('t3dTerminalClose').addEventListener('click',()=>show(false));
 $('t3dTerminalMode').addEventListener('change',()=>{
  const js=$('t3dTerminalMode').value==='js';$('t3dTerminalCodeTitle').textContent=js?'JAVASCRIPT SCENE SCRIPT EDITOR':'SCENE JSON EDITOR';
  $('t3dTerminalCodeMode').textContent=js?'JavaScript · return Scene JSON v2':'JSON · schema version 2';
  $('t3dTerminalValidate').textContent=js?'Jalankan & Validasi JS':'Validasi JSON';$('t3dTerminalSave').textContent=js?'Simpan .JS':'Simpan .JSON';reset();
 });
 $('t3dTerminalCode').addEventListener('input',reset);
 $('t3dTerminalThemeBrief').addEventListener('click',themeBrief);
 $('t3dTerminalGenerate').addEventListener('click',generate);
 $('t3dTerminalValidate').addEventListener('click',validateEditor);
 $('t3dTerminalApply').addEventListener('click',applyScene);
 $('t3dTerminalCopy').addEventListener('click',copyCode);
 $('t3dTerminalSave').addEventListener('click',saveCode);
 $('t3dTerminalClear').addEventListener('click',()=>{$('t3dTerminalCode').value='';reset();status('Editor dibersihkan.');});
}
function themeBrief(){
 const ids=['trozal3DAITheme','trozal3DAICategory','trozal3DAISubtheme','trozal3DAIExtra'],labels=['Tema utama','Kategori visual','Subtema spesifik','Detail Tambahan'],parts=[];
 ids.forEach((id,i)=>{const e=$(id);if(e&&e.value.trim())parts.push(labels[i]+': '+e.value.trim());});
 if(!parts.length){status('AI Theme Studio belum memiliki brief.',true);return;}
 $('t3dTerminalPrompt').value=parts.join('\n');status('Brief tema telah dimasukkan ke Terminal.');
}
function makePrompt(){
 const js=$('t3dTerminalMode').value==='js',brief=$('t3dTerminalPrompt').value.trim();let project={};
 try{project=window.TROZAL_CANVAS_3D.getProject();}catch(_){}
 const context={duration:project.duration||8,fps:project.fps||30,objects:(project.objects||[]).map(o=>({name:o.name,type:o.type,position:[o.x,o.y,o.z],animation:o.animation}))};
 const contract='INTELLECTUAL PROPERTY POLICY: '+IP_POLICY+'\\nTROZAL CANVAS 3D Scene JSON schema version 2. Root: version:2,duration,fps,loop,light,showGrid,camera,lights,objects,selected,playhead. Include camera {yaw,pitch,distance,projection,orthoScale,target:[x,y,z]} and exactly three lights [{name,x,y,z,color,intensity}]. Use 4-10 objects when practical. Allowed types cube,sphere,torus,cylinder,cone,plane. Each object: unique id,name,type,x,y,z,rx,ry,rz,sx,sy,sz,color (#RRGGBB),metallic,roughness,emission,materialPreset,animation,speed,amount,parentId,keyframes. Animations none,spin,orbit,bounce,pulse. Positions -4..4, rotations -180..180, scales .1..3, metallic 0..1, roughness .04..1, emission 0..3, speed .1..3, amount 0..1.5. Parent graph must be acyclic. No external assets, URLs, fabricated product claims or unsupported fields.';
 if(js)return 'You are a senior procedural JavaScript 3D scene author. Output executable JavaScript only, no Markdown or prose. The code is executed as the body of a function inside a Web Worker in a sandboxed iframe. JavaScript built-ins and Math are available. DOM, window, document, fetch, network, imports, filesystem and external libraries are unavailable. End the script with a return statement that returns a complete Scene JSON v2 object. Helper functions, const/let, loops and Math are allowed.\n\n'+contract+'\nCURRENT SCENE CONTEXT: '+JSON.stringify(context)+'\nUSER BRIEF: '+brief+'\nReturn only JavaScript.';
 return 'You are a senior procedural 3D scene designer. Output valid JSON only, no Markdown or prose.\n\n'+contract+'\nCURRENT SCENE CONTEXT: '+JSON.stringify(context)+'\nUSER BRIEF: '+brief+'\nReturn one complete Scene JSON v2 object.';
}
function cleanOutput(value){return String(value||'').trim();}
async function generate(){
 if(busy)return;const brief=$('t3dTerminalPrompt').value.trim();if(!brief){status('Masukkan instruksi scene terlebih dahulu.',true);return;}
 if(!window.trozalBrowserAI||typeof window.trozalBrowserAI.generateText!=='function'){status('BROWSER AI belum siap. Periksa panel Provider AI.',true);return;}
 busy=true;const button=$('t3dTerminalGenerate');button.disabled=true;reset();const js=$('t3dTerminalMode').value==='js';
 status('Generate menggunakan '+providerInfo()+'…');
 try{
  const output=await window.trozalBrowserAI.generateText(makePrompt(),{systemInstruction:js?'Return executable JavaScript only.':'Return strict Scene JSON version 2 only.',generationConfig:{maxOutputTokens:8192,temperature:.4},timeoutMs:180000});
  $('t3dTerminalCode').value=cleanOutput(output);status(js?'JavaScript dihasilkan. Jalankan dan validasi sebelum diterapkan.':'Scene JSON dihasilkan. Validasi struktur sebelum diterapkan.');
 }catch(e){status('Generate gagal: '+(e.message||String(e)),true);}finally{busy=false;button.disabled=false;}
}
function validateScene(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==2)throw Error('Root JSON harus berupa Scene v2.');
 if(!Array.isArray(data.objects)||data.objects.length<1||data.objects.length>100)throw Error('Scene harus memiliki 1–100 objek.');
 const types=new Set(['cube','sphere','torus','cylinder','cone','plane']),ids=new Set(),scene=JSON.parse(JSON.stringify(data));
 scene.objects.forEach((o,i)=>{if(!o||typeof o!=='object'||!types.has(o.type))throw Error('Tipe objek tidak didukung pada indeks '+i+'.');if(!o.id)o.id='terminal-object-'+(i+1);o.id=String(o.id);if(ids.has(o.id))throw Error('ID objek duplikat: '+o.id);ids.add(o.id);});
 scene.objects.forEach(o=>{if(o.parentId&&(!ids.has(String(o.parentId))||String(o.parentId)===o.id))throw Error('Referensi parent tidak valid pada '+o.name+'.');});
 scene.objects.forEach(o=>{let p=scene.objects.find(x=>x.id===String(o.parentId||'')),seen=new Set([o.id]);while(p){if(seen.has(p.id))throw Error('Parent cycle pada '+o.name+'.');seen.add(p.id);p=scene.objects.find(x=>x.id===String(p.parentId||''));}});
 if(scene.lights&&(!Array.isArray(scene.lights)||scene.lights.length!==3))throw Error('Scene harus berisi tepat tiga lampu.');
 if(scene.camera&&(typeof scene.camera!=='object'||Array.isArray(scene.camera)))throw Error('Camera harus berupa object.');
 scene.selected=ids.has(String(scene.selected||''))?String(scene.selected):scene.objects[0].id;
 scene.playhead=Number.isFinite(Number(scene.playhead))?Number(scene.playhead):0;return scene;
}
function validateJson(){
 try{candidate=validateScene(JSON.parse($('t3dTerminalCode').value));$('t3dTerminalApply').disabled=false;$('t3dTerminalSceneResult').textContent='VALID · Scene JSON v2 · '+candidate.objects.length+' objek · tiga lampu: '+(candidate.lights&&candidate.lights.length===3?'ya':'gunakan lampu default')+'.';status('JSON valid. Scene aktif belum diubah.');return true;}
 catch(e){reset();status('JSON tidak valid: '+e.message,true);return false;}
}
function token(){return 't3d'+Math.random().toString(36).slice(2)+Date.now().toString(36);}
function runSandbox(code){
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe'),id=token(),nonce=token();let done=false;
  frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('title','Isolated Canvas 3D JavaScript runner');frame.style.display='none';
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',onMessage);frame.remove();if(error)reject(new Error(error));else resolve(value);};
  const onMessage=e=>{if(e.source!==frame.contentWindow||!e.data||e.data.token!==id)return;if(!e.data.ok){finish(e.data.error||'JavaScript gagal.');return;}try{finish(null,JSON.parse(e.data.json));}catch(x){finish('JavaScript mengembalikan hasil yang bukan JSON: '+x.message);}};
  const timer=setTimeout(()=>finish('JavaScript melewati batas 8 detik; worker dihentikan.'),8000);window.addEventListener('message',onMessage);
  const runner='self.onmessage=function(){const send=self.postMessage.bind(self);try{const value=(function(){\n'+code+'\n})();const json=JSON.stringify(value);if(!json)throw Error("Script wajib return Scene JSON object");send({ok:true,json:json});}catch(e){send({ok:false,error:String(e&&e.message||e)});}};';
  const html='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;;script-src &#39;nonce-'+nonce+'&#39;;worker-src blob:;connect-src &#39;none&#39;;img-src &#39;none&#39;;style-src &#39;none&#39;;object-src &#39;none&#39;;base-uri &#39;none&#39;;form-action &#39;none&#39;"><script nonce="'+nonce+'">(function(){const token='+JSON.stringify(id)+',source='+JSON.stringify(runner)+',blob=new Blob([source],{type:"text/javascript"}),url=URL.createObjectURL(blob),worker=new Worker(url);worker.onmessage=function(e){parent.postMessage({token:token,ok:!!e.data.ok,json:e.data.json,error:e.data.error},"*");worker.terminate();URL.revokeObjectURL(url);};worker.onerror=function(e){parent.postMessage({token:token,ok:false,error:e.message||"Worker error"},"*");worker.terminate();URL.revokeObjectURL(url);};worker.postMessage({run:true});})();<\/script>';
  frame.srcdoc=html;$('t3dTerminalRunHost').appendChild(frame);
 });
}
async function validateEditor(){
 if(busy)return;busy=true;const button=$('t3dTerminalValidate');button.disabled=true;reset();
 try{
  if($('t3dTerminalMode').value==='json'){validateJson();return;}
  const code=$('t3dTerminalCode').value.trim();if(!code)throw Error('Editor JavaScript masih kosong.');
  status('Menjalankan JavaScript dalam Web Worker sandbox…');
  candidate=validateScene(await runSandbox(code));$('t3dTerminalApply').disabled=false;
  $('t3dTerminalSceneResult').textContent='VALID · JavaScript berhasil dijalankan · Scene JSON v2 · '+candidate.objects.length+' objek.';
  status('JavaScript berhasil dan scene valid. Scene aktif belum diubah.');
 }catch(e){reset();status('Validasi / eksekusi gagal: '+e.message,true);}finally{busy=false;button.disabled=false;}
}
function applyScene(){if(!candidate)return;try{window.TROZAL_CANVAS_3D.applyProject(candidate);status('Scene diterapkan ke Canvas 3D · '+candidate.objects.length+' objek.');}catch(e){status('Gagal menerapkan scene: '+e.message,true);}}
async function copyCode(){const value=$('t3dTerminalCode').value;if(!value){status('Editor kosong.',true);return;}try{await navigator.clipboard.writeText(value);status('Kode berhasil disalin.');}catch(_){$('t3dTerminalCode').select();status('Kode dipilih. Tekan Ctrl+C untuk menyalin.');}}
function saveCode(){const value=$('t3dTerminalCode').value;if(!value){status('Editor kosong.',true);return;}const js=$('t3dTerminalMode').value==='js',name=js?'trozal-canvas3d-scene.js':'trozal-canvas3d-scene.json',blob=new Blob([value],{type:js?'text/javascript;charset=utf-8':'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('File '+name+' disiapkan.');}
document.addEventListener('keydown',e=>{const p=$('t3dTerminalPanel');if(e.key==='Escape'&&p&&!p.hidden){e.preventDefault();e.stopPropagation();show(false);}},true);
const observer=new MutationObserver(mount);observer.observe(document.documentElement,{childList:true,subtree:true});mount();
})();