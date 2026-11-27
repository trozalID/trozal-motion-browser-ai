/* TROZAL MOTION · BROWSER CANVAS 3D AI THEME STUDIO */
(function(){
'use strict';
if(window.__TROZAL_BROWSER_CANVAS3D_THEME__)return;
window.__TROZAL_BROWSER_CANVAS3D_THEME__=true;
const $=id=>document.getElementById(id),types=new Set(['cube','sphere','torus','cylinder','cone','plane']),motions=new Set(['none','spin','orbit','bounce','pulse']);
let themes=[],concepts=[],selected=0,themeShuffleBag=[];
const IP_POLICY="ORIGINAL CONTENT & INTELLECTUAL PROPERTY · ALWAYS ON: create independently original visual designs. Do not recreate or imitate third-party protected characters, fictional universes, celebrity likenesses, signature costumes, artworks, logos, trademarks, watermarks, signatures, or recognizable corporate identities. Do not copy lyrics, screenshots, source artwork, or proprietary text. For brand-like subjects use abstract, non-identifying geometry only. When a request names protected IP, reinterpret it as an original design using only a broad, unprotected mood or genre.";
function profile(theme){
 const p=typeof window.trozalGetThemeDomainProfile==='function'?window.trozalGetThemeDomainProfile(theme):null;
 const styles=Array.isArray(p&&p.styles)?[...new Set(p.styles.filter(x=>typeof x==='string'))]:[];
 const subthemes=Array.isArray(p&&p.subthemes)?[...new Set(p.subthemes.filter(x=>typeof x==='string'))]:[];
 return {p,styles:styles.length?styles:['Topic-Specific Editorial','Cinematic Subject Reveal','3D Layered Composition','Clean Information Design'],subthemes:subthemes.length?subthemes:['Hero subject and context reveal','Topic-specific object showcase','Step-by-step process explanation']};
}
function option(el,value){const o=document.createElement('option');o.value=value;o.textContent=value;el.appendChild(o);}
function status(message,bad){const el=$('trozal3DAIThemeStatus');if(el){el.textContent=message;el.dataset.error=bad?'1':'0';}}
function updateTheme(){
 const data=profile($('trozal3DAITheme').value),p=data.p||{},cat=$('trozal3DAICategory'),sub=$('trozal3DAISubtheme'),oldCat=cat.value,oldSub=sub.value;
 cat.replaceChildren();data.styles.forEach(x=>option(cat,x));cat.value=data.styles.includes(oldCat)?oldCat:data.styles[0];
 sub.replaceChildren();data.subthemes.forEach(x=>option(sub,x));sub.value=data.subthemes.includes(oldSub)?oldSub:data.subthemes[0];
 const rows=[['Tujuan visual',p.purpose||'Bangun satu hero 3D yang relevan dan konsisten dengan tema utama.'],['Objek & aset',p.assets||'Pilih objek 3D yang benar-benar relevan dengan subtema.'],['Palet warna',p.palette||'Gunakan warna dominan, pendukung, dan aksen yang terkontrol.'],['Komposisi',p.composition||'Tetapkan focal object, hierarki, ruang negatif, dan kedalaman kamera.'],['Gerakan',p.motion||'Bangun establishing pose, reveal hero, detail motion, dan end pose.'],['Hindari',p.avoid||'Hindari elemen acak dan klaim visual tanpa dasar.']];
 $('trozal3DAIThemeSpecs').replaceChildren(...rows.map(r=>{const box=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=r[0];span.textContent=r[1];box.append(b,span);return box;}));
}
function render(){
 const host=$('trozal3DAIThemeConcepts');host.replaceChildren();
 concepts.forEach((item,i)=>{const card=document.createElement('article');card.className='t3d-theme-concept';const pick=document.createElement('button');pick.type='button';pick.dataset.concept=String(i);pick.setAttribute('aria-pressed',String(i===selected));pick.textContent=(i+1)+'. '+item.title;const desc=document.createElement('p');desc.textContent=item.pitch||'Konsep 3D dari tema terpilih.';const apply=document.createElement('button');apply.type='button';apply.className='primary';apply.dataset.applyConcept=String(i);apply.textContent='Terapkan konsep';card.append(pick,desc,apply);host.appendChild(card);});
}
function parse(raw){
 let v=String(raw||'').trim(),fence=String.fromCharCode(96).repeat(3);
 if(v.startsWith(fence)){v=v.slice(fence.length);const n=v.indexOf('\n');if(n>=0)v=v.slice(n+1);const e=v.lastIndexOf(fence);if(e>=0)v=v.slice(0,e);}
 const a=v.indexOf('{'),b=v.lastIndexOf('}');if(a<0||b<=a)throw Error('AI tidak mengembalikan JSON konsep yang lengkap.');return JSON.parse(v.slice(a,b+1));
}
function num(v,d,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):d;}
function scene(raw){
 if(!raw||!Array.isArray(raw.objects))throw Error('Konsep tidak memiliki daftar objek.');
 const current=window.TROZAL_CANVAS_3D.getProject();
 const objects=raw.objects.filter(o=>o&&types.has(o.type)).slice(0,60).map((o,i)=>({
  id:String(o.id||('theme-ai-'+Date.now().toString(36)+'-'+i)),name:String(o.name||('AI Object '+(i+1))).slice(0,40),type:o.type,
  x:num(o.x,0,-4,4),y:num(o.y,0,-2.5,4),z:num(o.z,0,-4,4),rx:num(o.rx,0,-180,180),ry:num(o.ry,0,-180,180),rz:num(o.rz,0,-180,180),
  sx:num(o.sx,1,.1,3),sy:num(o.sy,1,.1,3),sz:num(o.sz,1,.1,3),color:/^#[0-9a-f]{6}$/i.test(String(o.color||''))?o.color:'#36c7dc',
  metallic:num(o.metallic,.3,0,1),roughness:num(o.roughness,.34,.04,1),emission:num(o.emission,0,0,3),
  materialPreset:['custom','matte','plastic','ceramic','brushed-metal','polished-metal','neon'].includes(o.materialPreset)?o.materialPreset:'custom',
  animation:motions.has(o.animation)?o.animation:'none',speed:num(o.speed,.5,.1,3),amount:num(o.amount,.5,0,1.5),parentId:o.parentId?String(o.parentId):null,keyframes:Array.isArray(o.keyframes)?o.keyframes.slice(0,200):[]
 }));
 if(!objects.length)throw Error('Tidak ada tipe objek yang didukung.');
 const cam=raw.camera||{},lights=Array.isArray(raw.lights)&&raw.lights.length===3?raw.lights.map((l,i)=>({name:String(l.name||['Key','Fill','Rim'][i]),x:num(l.x,0,-20,20),y:num(l.y,3,-20,20),z:num(l.z,3,-20,20),color:/^#[0-9a-f]{6}$/i.test(String(l.color||''))?l.color:'#ffffff',intensity:num(l.intensity,1,0,3)})):current.lights;
 return {version:2,duration:num(raw.duration,8,1,120),fps:[24,30,60].includes(Number(raw.fps))?Number(raw.fps):30,loop:raw.loop!==false,light:num(raw.light,1.25,0,3),showGrid:raw.showGrid!==false,
 camera:{yaw:num(cam.yaw,.72,-6.28,6.28),pitch:num(cam.pitch,.32,-1.55,1.55),distance:num(cam.distance,7.2,3,13),projection:cam.projection==='orthographic'?'orthographic':'perspective',orthoScale:num(cam.orthoScale,4.8,1,12),target:Array.isArray(cam.target)&&cam.target.length===3?cam.target.map(v=>num(v,0,-10,10)):[0,.2,0]},
 lights,objects,selected:objects[0].id,playhead:0};
}
function prompt(){
 const theme=$('trozal3DAITheme').value,cat=$('trozal3DAICategory').value,sub=$('trozal3DAISubtheme').value,extra=$('trozal3DAIExtra').value.trim(),p=profile(theme).p||{};
 return ['Create exactly three visually distinct 3D motion scene concepts for TROZAL MOTION CANVAS 3D.',
 'MAIN THEME: '+theme,'VISUAL CATEGORY: '+cat,'SPECIFIC SUBTHEME: '+sub,
 'THEME PURPOSE: '+(p.purpose||''),'THEME ASSETS: '+(p.assets||''),'THEME PALETTE: '+(p.palette||''),'THEME COMPOSITION: '+(p.composition||''),'THEME MOTION: '+(p.motion||''),'AVOID: '+(p.avoid||''),
 'DETAIL TAMBAHAN (merge with all automatic theme specifications; never replace or ignore them): '+(extra||'None supplied.'),
 'Category changes visual direction only. Preserve the main theme and subtheme.',
 'Each concept should normally have 4-10 coherent objects, purposeful motion choreography, material definitions, camera framing, and exactly three-point lighting.',
 'Return strict JSON only: {"concepts":[{"title":"...","pitch":"...","scene":{"version":2,"duration":8,"fps":30,"loop":true,"light":1.25,"showGrid":true,"camera":{"yaw":0.72,"pitch":0.32,"distance":7.2,"projection":"perspective","orthoScale":4.8,"target":[0,0.2,0]},"lights":[{"name":"Key","x":-3,"y":4,"z":4,"color":"#ffe2b5","intensity":1.2},{"name":"Fill","x":3,"y":1,"z":2,"color":"#6caeff","intensity":0.7},{"name":"Rim","x":0,"y":3,"z":-4,"color":"#a98cff","intensity":0.95}],"objects":[{"id":"hero","name":"Hero Object","type":"sphere","x":0,"y":0,"z":0,"rx":0,"ry":0,"rz":0,"sx":1,"sy":1,"sz":1,"color":"#36c7dc","metallic":0.3,"roughness":0.34,"emission":0,"materialPreset":"custom","animation":"spin","speed":0.5,"amount":0.5,"parentId":null,"keyframes":[]}]}}]}',
 'Allowed object types: cube, sphere, torus, cylinder, cone, plane. Animations: none, spin, orbit, bounce, pulse. Position -4..4; rotations -180..180; scale .1..3; metallic 0..1; roughness .04..1; emission 0..3; speed .1..3; amount 0..1.5. Colors #RRGGBB. Unique ids, valid acyclic parents. No external URLs, assets, executable scripts, or fabricated product claims. Three concepts must be materially different while retaining theme and user detail.'
 ].join('\n\n');
}
function promptOne(index,attempt){
 const theme=$('trozal3DAITheme').value,cat=$('trozal3DAICategory').value,sub=$('trozal3DAISubtheme').value,extra=$('trozal3DAIExtra').value.trim(),p=profile(theme).p||{};
 const directions=['hero-led cinematic reveal with a strong silhouette and controlled camera movement','layered assembly reveal with parallax depth and coordinated orbital motion','premium macro-detail showcase with dramatic material contrast and a memorable end pose'];
 return ['Create exactly ONE complete, distinct 3D motion scene concept for TROZAL MOTION CANVAS 3D. The application makes three separate requests; never return an array or multiple concepts.',
 'CONCEPT SLOT: '+(index+1)+' of 3. Design direction: '+directions[index%3]+'. Make this concept materially different while retaining the same selected theme. '+(attempt?'Retry: previous output was incomplete; return one compact complete object with at least four supported objects.':'First attempt.'),
 'MAIN THEME: '+theme,'VISUAL CATEGORY: '+cat,'SPECIFIC SUBTHEME: '+sub,
 'THEME PURPOSE: '+(p.purpose||''),'THEME ASSETS: '+(p.assets||''),'THEME PALETTE: '+(p.palette||''),'THEME COMPOSITION: '+(p.composition||''),'THEME MOTION: '+(p.motion||''),'AVOID: '+(p.avoid||''),
 'DETAIL TAMBAHAN (merge with all automatic theme specifications; never replace or ignore them): '+(extra||'None supplied.'),
 'INTELLECTUAL PROPERTY POLICY: '+IP_POLICY,
 'Category changes visual direction only. Preserve the main theme and subtheme. Use 4-10 coherent objects, purposeful motion, material definitions, camera framing, and exactly three-point lighting.',
 'Return strict JSON only as one object: {"title":"...","pitch":"...","scene":{"version":2,"duration":8,"fps":30,"loop":true,"light":1.25,"showGrid":true,"camera":{"yaw":0.72,"pitch":0.32,"distance":7.2,"projection":"perspective","orthoScale":4.8,"target":[0,0.2,0]},"lights":[{"name":"Key","x":-3,"y":4,"z":4,"color":"#ffe2b5","intensity":1.2},{"name":"Fill","x":3,"y":1,"z":2,"color":"#6caeff","intensity":0.7},{"name":"Rim","x":0,"y":3,"z":-4,"color":"#a98cff","intensity":0.95}],"objects":[{"id":"hero","name":"Hero Object","type":"sphere","x":0,"y":0,"z":0,"rx":0,"ry":0,"rz":0,"sx":1,"sy":1,"sz":1,"color":"#36c7dc","metallic":0.3,"roughness":0.34,"emission":0,"materialPreset":"custom","animation":"spin","speed":0.5,"amount":0.5,"parentId":null,"keyframes":[]}]}}',
 'Allowed types: cube, sphere, torus, cylinder, cone, plane. Animations: none, spin, orbit, bounce, pulse. Position -4..4; rotations -180..180; scale .1..3; metallic 0..1; roughness .04..1; emission 0..3; speed .1..3; amount 0..1.5. Colors #RRGGBB. Unique ids, valid acyclic parents. No external URLs, assets, executable scripts, or fabricated product claims.'].join('\n\n');
}
async function generate(){
 const button=$('trozal3DAIThemeGenerate');if(button.disabled)return;
 if(!window.trozalBrowserAI||typeof window.trozalBrowserAI.generateText!=='function'){status('BROWSER AI belum siap. Periksa provider AI.',true);return;}
 if(!$('trozal3DAITheme').value){status('Pilih tema utama dahulu.',true);return;}
 button.disabled=true;concepts=[];selected=0;$('trozal3DAIThemeConcepts').replaceChildren();let failure='';
 try{
  if(!window.TROZAL_CANVAS_3D)throw Error('Canvas 3D belum siap.');
  for(let index=0;index<3;index++){
   let ready=null,lastError=null;
   for(let attempt=0;attempt<2&&!ready;attempt++){
    try{
     status('Membuat konsep '+(index+1)+'/3 dengan '+window.trozalBrowserAI.provider()+'…'+(attempt?' percobaan ulang':''));
     const raw=await window.trozalBrowserAI.generateText(promptOne(index,attempt),{systemInstruction:'Return exactly one complete Scene JSON v2 concept as strict JSON. No array, no Markdown.',generationConfig:{maxOutputTokens:8192,temperature:.5},timeoutMs:150000});
     const data=parse(raw),item=Array.isArray(data.concepts)?data.concepts[0]:data,project=scene(item.scene||item);
     if(project.objects.length<4)throw Error('Konsep hanya memiliki '+project.objects.length+' objek valid; dibutuhkan sedikitnya 4.');
     ready={title:String(item.title||('Concept '+(index+1))).slice(0,100),pitch:String(item.pitch||'').slice(0,500),scene:project};
    }catch(e){lastError=e;if(attempt===0)status('Respons konsep '+(index+1)+' belum lengkap. Mengulang satu kali…',true);}
   }
   if(!ready){failure='Konsep '+(index+1)+' gagal setelah dua percobaan: '+(lastError&&lastError.message||'respons tidak valid');break;}
   concepts.push(ready);render();status('Konsep '+concepts.length+'/3 selesai · konsep sebelumnya tetap tersimpan.');
  }
  if(concepts.length===3)status('Berhasil · 3 konsep siap dipilih. Scene aktif belum berubah.');
  else if(concepts.length)status(concepts.length+'/3 konsep berhasil. '+failure+'. Konsep yang sudah selesai tetap dapat dipilih dan diterapkan.',true);
  else status('Generate gagal: '+failure,true);
 }catch(e){failure=e.message||String(e);status(concepts.length?concepts.length+'/3 konsep tersimpan. '+failure+'.':'Generate gagal: '+failure,true);}
 finally{button.disabled=false;}
}
function apply(index){const item=concepts[index];if(!item)return;try{window.TROZAL_CANVAS_3D.applyProject(item.scene);status('Konsep '+item.title+' diterapkan ke Canvas 3D.');}catch(e){status('Scene tidak dapat diterapkan: '+e.message,true);}}
function mount(){
 const left=$('trozal3DLeft');if(!left||$('trozal3DAIThemePanel'))return;
 const panel=document.createElement('section');panel.id='trozal3DAIThemePanel';panel.className='trozal3d-panel t3d-ai-theme';
 panel.innerHTML='<h3>✦ CANVAS 3D · AI THEME STUDIO</h3><p class="t3d-ai-help">333 tema utama · spesifikasi tema otomatis · 3 konsep dengan BROWSER AI</p><label>Cari tema utama<input id="trozal3DAIThemeSearch" type="search" placeholder="Cari dari 333 tema…"></label><label>Tema utama<select id="trozal3DAITheme"></select></label><div class="t3d-ai-buttons"><button id="trozal3DAIRandom" type="button">Tema acak</button><button id="trozal3DAITerminal" type="button">⌘ Terminal</button></div><label>Kategori visual<select id="trozal3DAICategory"></select></label><label>Subtema spesifik<select id="trozal3DAISubtheme"></select></label><div id="trozal3DAIThemeSpecs"></div><label>Detail Tambahan<textarea id="trozal3DAIExtra" rows="3" placeholder="Objek, suasana, warna, material, lighting, gerakan kamera atau aksi. Digabung dengan spesifikasi tema."></textarea></label><section id="trozal3DAIIPPanel" aria-label="Kekayaan Intelektual"><strong>🛡 KEKAYAAN INTELEKTUAL · AKTIF OTOMATIS</strong><p>Semua konsep dibuat orisinal dan tidak menyalin kekayaan intelektual pihak lain.</p><ul><li>Hindari karakter, semesta fiksi, kostum khas, tokoh, karya seni, logo, merek dagang, watermark, dan identitas perusahaan yang dapat dikenali.</li><li>Jangan menyalin artwork, lirik, screenshot, tanda tangan, atau teks proprietari.</li><li>Untuk tema brand, gunakan geometri abstrak yang tidak mengidentifikasi merek.</li><li>Jika permintaan menyebut IP terlindungi, ubah menjadi desain orisinal dengan mood atau genre umum.</li></ul></section><button id="trozal3DAIThemeGenerate" class="primary" type="button">✦ Generate 3 Concepts</button><div id="trozal3DAIThemeStatus" role="status">Pilih tema dan kategori visual.</div><div id="trozal3DAIThemeConcepts"></div>';
 left.appendChild(panel);
 const style=document.createElement('style');style.textContent='.t3d-ai-theme #trozal3DAIIPPanel{margin:10px 0;padding:9px;border:1px solid #43866d;border-radius:8px;background:linear-gradient(145deg,#102b25,#182c2d);color:#dff7e9;font-size:9px;line-height:1.5}.t3d-ai-theme #trozal3DAIIPPanel strong{display:block;color:#a9edc5;font-size:10px}.t3d-ai-theme #trozal3DAIIPPanel p{margin:5px 0}.t3d-ai-theme #trozal3DAIIPPanel ul{margin:5px 0 0;padding-left:17px}.t3d-ai-theme #trozal3DAIIPPanel li{margin:3px 0}.t3d-ai-theme{margin-top:12px;border-color:#7b62ab!important;background:linear-gradient(155deg,#211735,#101c2d)!important;color:#eee7ff}.t3d-ai-theme h3{color:#e0c5ff!important}.t3d-ai-help{font-size:9px;color:#b9abd5;line-height:1.5}.t3d-ai-theme label{display:block;margin:8px 0;color:#e5d9ff;font-size:10px}.t3d-ai-theme input,.t3d-ai-theme select,.t3d-ai-theme textarea{display:block;width:100%;margin-top:4px;padding:6px;border:1px solid #5a4b7d;border-radius:6px;background:#0c1423;color:#f3edff;font:11px Arial}.t3d-ai-theme textarea{resize:vertical;min-height:62px}.t3d-ai-buttons{display:flex;gap:6px}.t3d-ai-buttons button{flex:1;font-size:9px}.t3d-ai-theme #trozal3DAIThemeSpecs{display:grid;gap:5px;margin:8px 0}.t3d-ai-theme #trozal3DAIThemeSpecs>div{padding:6px;border:1px solid #493965;border-radius:6px;background:#151126}.t3d-ai-theme #trozal3DAIThemeSpecs b,.t3d-ai-theme #trozal3DAIThemeSpecs span{display:block;font-size:9px;line-height:1.45}.t3d-ai-theme #trozal3DAIThemeSpecs b{color:#d8baff;margin-bottom:3px}.t3d-ai-theme #trozal3DAIThemeSpecs span{color:#d6cce8}.t3d-ai-theme #trozal3DAIThemeStatus{padding:7px;margin:8px 0;border:1px solid #493965;border-radius:6px;background:#120d20;color:#d8c7ef;font-size:9px;line-height:1.5}.t3d-ai-theme #trozal3DAIThemeStatus[data-error="1"]{color:#ffb6c2;border-color:#99566c}.t3d-theme-concept{padding:8px;margin:7px 0;border:1px solid #53466f;border-radius:7px;background:#151327}.t3d-theme-concept button[data-concept]{width:100%;text-align:left;border-color:#68528c;background:#231d3a;color:#e9ddff}.t3d-theme-concept button[aria-pressed=true]{border-color:#c5a1ff;background:#35234c}.t3d-theme-concept p{font-size:9px;color:#b8accd;line-height:1.45}.t3d-theme-concept button[data-apply-concept]{font-size:9px;padding:5px 8px}';
 document.head.appendChild(style);
 themes=Array.isArray(window.TROZAL_AI_THEMES)?[...new Set(window.TROZAL_AI_THEMES.filter(x=>typeof x==='string'))]:[];
 const fill=filter=>{const select=$('trozal3DAITheme'),old=select.value,list=themes.filter(x=>x.toLowerCase().includes(String(filter||'').toLowerCase()));select.replaceChildren();list.forEach(x=>option(select,x));select.value=list.includes(old)?old:(list[0]||'');updateTheme();};
 fill('');$('trozal3DAIThemeSearch').addEventListener('input',e=>fill(e.target.value));$('trozal3DAITheme').addEventListener('change',updateTheme);
 $('trozal3DAICategory').addEventListener('change',()=>status('Arah visual diperbarui; tema utama tetap '+$('trozal3DAITheme').value+'.'));
 $('trozal3DAIRandom').addEventListener('click',()=>{if(!themes.length){status('Katalog tema tidak tersedia.',true);return;}const current=$('trozal3DAITheme').value;if(!themeShuffleBag.length){themeShuffleBag=themes.filter(x=>x!==current);for(let i=themeShuffleBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[themeShuffleBag[i],themeShuffleBag[j]]=[themeShuffleBag[j],themeShuffleBag[i]];}}const next=themeShuffleBag.pop()||themes.find(x=>x!==current)||themes[0];$('trozal3DAIThemeSearch').value='';fill('');$('trozal3DAITheme').value=next;updateTheme();status('Tema acak dipilih: '+next);});
 $('trozal3DAIThemeGenerate').addEventListener('click',generate);
 $('trozal3DAITerminal').addEventListener('click',()=>{const b=$('t3dTerminalOpen');if(b)b.click();else status('Terminal belum siap.');});
 $('trozal3DAIThemeConcepts').addEventListener('click',e=>{const p=e.target.closest('[data-concept]');if(p){selected=Number(p.dataset.concept);render();return;}const a=e.target.closest('[data-apply-concept]');if(a)apply(Number(a.dataset.applyConcept));});
 if(themes.length!==333)status('Katalog tema terbaca '+themes.length+' item (target 333).',true);
}
const observer=new MutationObserver(mount);observer.observe(document.documentElement,{childList:true,subtree:true});mount();
})();