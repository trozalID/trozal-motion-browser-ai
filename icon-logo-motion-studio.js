/* TROZAL MOTION · Icon & Logo Motion Studio — Browser AI
 * Self-contained composition editor. Does not modify the main editor or renderer.
 */
(function(){
'use strict';
if(window.__trozalIconMotionStudioV2)return;
window.__trozalIconMotionStudioV2=true;
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const motifs=[
["Singa","Hewan","🦁"],
["Harimau","Hewan","🐯"],
["Gajah","Hewan","🐘"],
["Jerapah","Hewan","🦒"],
["Zebra","Hewan","🦓"],
["Rubah","Hewan","🦊"],
["Serigala","Hewan","🐺"],
["Beruang","Hewan","🐻"],
["Panda","Hewan","🐼"],
["Koala","Hewan","🐨"],
["Elang","Burung","🦅"],
["Burung Hantu","Burung","🦉"],
["Kakatua","Burung","🦜"],
["Merak","Burung","🦚"],
["Flamingo","Burung","🦩"],
["Merpati","Burung","🕊️"],
["Bebek","Burung","🦆"],
["Ayam","Burung","🐓"],
["Angsa","Burung","🦢"],
["Penguin","Burung","🐧"],
["Lumba-lumba","Hewan Laut","🐬"],
["Paus","Hewan Laut","🐳"],
["Hiu","Hewan Laut","🦈"],
["Gurita","Hewan Laut","🐙"],
["Kepiting","Hewan Laut","🦀"],
["Lobster","Hewan Laut","🦞"],
["Udang","Hewan Laut","🦐"],
["Ikan Tropis","Hewan Laut","🐠"],
["Penyu","Hewan Laut","🐢"],
["Ubur-ubur","Hewan Laut","🪼"],
["Kupu-kupu","Serangga","🦋"],
["Lebah","Serangga","🐝"],
["Kepik","Serangga","🐞"],
["Jangkrik","Serangga","🦗"],
["Kumbang","Serangga","🪲"],
["Lalat","Serangga","🪰"],
["Nyamuk","Serangga","🦟"],
["Semut","Serangga","🐜"],
["Laba-laba","Serangga","🕷️"],
["Kalajengking","Serangga","🦂"],
["Pohon","Tumbuhan","🌳"],
["Cemara","Tumbuhan","🌲"],
["Palem","Tumbuhan","🌴"],
["Semanggi","Tumbuhan","🍀"],
["Daun","Tumbuhan","🍃"],
["Herbal","Tumbuhan","🌿"],
["Kaktus","Tumbuhan","🌵"],
["Bambu","Tumbuhan","🎋"],
["Tanaman Pot","Tumbuhan","🪴"],
["Tunas","Tumbuhan","🌱"],
["Mawar","Bunga","🌹"],
["Bunga Matahari","Bunga","🌻"],
["Tulip","Bunga","🌷"],
["Hibiscus","Bunga","🌺"],
["Sakura","Bunga","🌸"],
["Buket","Bunga","💐"],
["Teratai","Bunga","🪷"],
["Roset","Bunga","🏵️"],
["Bunga Layu","Bunga","🥀"],
["Daisy","Bunga","🌼"],
["Apel","Buah","🍎"],
["Pir","Buah","🍐"],
["Jeruk","Buah","🍊"],
["Lemon","Buah","🍋"],
["Pisang","Buah","🍌"],
["Semangka","Buah","🍉"],
["Anggur","Buah","🍇"],
["Stroberi","Buah","🍓"],
["Nanas","Buah","🍍"],
["Mangga","Buah","🥭"],
["Burger","Makanan","🍔"],
["Pizza","Makanan","🍕"],
["Hotdog","Makanan","🌭"],
["Sandwich","Makanan","🥪"],
["Taco","Makanan","🌮"],
["Sushi","Makanan","🍣"],
["Ramen","Makanan","🍜"],
["Salad","Makanan","🥗"],
["Kentang Goreng","Makanan","🍟"],
["Croissant","Makanan","🥐"],
["Kopi","Minuman","☕"],
["Teh","Minuman","🍵"],
["Bubble Tea","Minuman","🧋"],
["Soda","Minuman","🥤"],
["Jus","Minuman","🧃"],
["Susu","Minuman","🥛"],
["Sake","Minuman","🍶"],
["Mocktail","Minuman","🍹"],
["Teko Teh","Minuman","🫖"],
["Air Minum","Minuman","🚰"],
["Mobil","Kendaraan Darat","🚗"],
["Mobil Balap","Kendaraan Darat","🏎️"],
["Taksi","Kendaraan Darat","🚕"],
["Bus","Kendaraan Darat","🚌"],
["Trolleybus","Kendaraan Darat","🚎"],
["SUV","Kendaraan Darat","🚙"],
["Motor","Kendaraan Darat","🏍️"],
["Sepeda","Kendaraan Darat","🚲"],
["Traktor","Kendaraan Darat","🚜"],
["Mobil Pemadam","Kendaraan Darat","🚒"],
["Pesawat","Transportasi Lain","✈️"],
["Helikopter","Transportasi Lain","🚁"],
["Roket","Transportasi Lain","🚀"],
["UFO","Transportasi Lain","🛸"],
["Lokomotif","Transportasi Lain","🚂"],
["Kereta","Transportasi Lain","🚆"],
["Kapal","Transportasi Lain","🚢"],
["Perahu Layar","Transportasi Lain","⛵"],
["Speedboat","Transportasi Lain","🚤"],
["Kereta Gantung","Transportasi Lain","🚡"],
["Sepak Bola","Olahraga","⚽"],
["Basket","Olahraga","🏀"],
["Tenis","Olahraga","🎾"],
["Voli","Olahraga","🏐"],
["Bulu Tangkis","Olahraga","🏸"],
["Tenis Meja","Olahraga","🏓"],
["Tinju","Olahraga","🥊"],
["Panahan","Olahraga","🏹"],
["Golf","Olahraga","⛳"],
["Selancar","Olahraga","🏄"],
["Gunung","Alam","🏔️"],
["Gunung Api","Alam","🌋"],
["Ombak","Alam","🌊"],
["Matahari","Alam","☀️"],
["Bulan","Alam","🌙"],
["Bintang","Alam","⭐"],
["Pelangi","Alam","🌈"],
["Salju","Alam","❄️"],
["Api","Alam","🔥"],
["Tetes Air","Alam","💧"],
["Dokter","Profesi","🩺"],
["Koki","Profesi","👨‍🍳"],
["Astronaut","Profesi","👩‍🚀"],
["Pekerja","Profesi","👷"],
["Polisi","Profesi","👮"],
["Pemadam","Profesi","🧑‍🚒"],
["Guru","Profesi","👩‍🏫"],
["Seniman","Profesi","🧑‍🎨"],
["Ilmuwan","Profesi","👨‍🔬"],
["Petani","Profesi","🧑‍🌾"],
["Rumah","Bangunan","🏠"],
["Kantor","Bangunan","🏢"],
["Skyline","Bangunan","🏙️"],
["Kastil","Bangunan","🏰"],
["Gereja","Bangunan","⛪"],
["Masjid","Bangunan","🕌"],
["Kuil","Bangunan","🛕"],
["Rumah Sakit","Bangunan","🏥"],
["Sekolah","Bangunan","🏫"],
["Stadion","Bangunan","🏟️"],
["Gitar","Musik","🎸"],
["Piano","Musik","🎹"],
["Drum","Musik","🥁"],
["Terompet","Musik","🎺"],
["Biola","Musik","🎻"],
["Saksofon","Musik","🎷"],
["Mikrofon","Musik","🎤"],
["Headphone","Musik","🎧"],
["Not Musik","Musik","🎼"],
["Marakas","Musik","🪇"],
["Smartphone","Teknologi","📱"],
["Laptop","Teknologi","💻"],
["Desktop","Teknologi","🖥️"],
["Keyboard","Teknologi","⌨️"],
["Mouse","Teknologi","🖱️"],
["Kamera","Teknologi","📷"],
["Video Kamera","Teknologi","📹"],
["Satelit","Teknologi","🛰️"],
["Robot","Teknologi","🤖"],
["Baterai","Teknologi","🔋"],
["Lampu","Objek & Simbol","💡"],
["Jam","Objek & Simbol","⌚"],
["Kunci","Objek & Simbol","🔑"],
["Ransel","Objek & Simbol","🎒"],
["Kompas","Objek & Simbol","🧭"],
["Gunting","Objek & Simbol","✂️"],
["Pensil","Objek & Simbol","✏️"],
["Hati","Objek & Simbol","❤️"],
["Petir","Objek & Simbol","⚡"],
["Lonceng","Objek & Simbol","🔔"]
];
const styles=['Flat Color','Outline','Duotone','Gradient','3D Soft','Glass','Neon','Paper Cut','Geometric'];
const motions=['Pop & Bounce','Float','Spin','Draw On','Elastic','Slide In','Pulse','Orbit','Flip','Reveal'];
const categories=['Semua',...new Set(motifs.map(m=>m[1]))];
let state={layers:[],scenes:[],scene:0,selected:null,playing:false,time:0,duration:12,fps:30,ratio:'16:9',resolution:'1920x1080',bg:'transparent',style:'Flat Color',motion:'Pop & Bounce',primary:'#ffbd45',accent:'#55c7dc',out:'video',title:'ICON MOTION STORY',raf:0,last:0};
const uid=()=>Math.random().toString(36).slice(2,9);
const currentScene=()=>state.scenes[state.scene];
function seed(){state.scenes=[{id:uid(),name:'Intro',duration:4,layers:[]},{id:uid(),name:'Discover',duration:4,layers:[]},{id:uid(),name:'Outro',duration:4,layers:[]}];state.layers=[];addLayer(motifs[0],0);addLayer(motifs[35],1);addLayer(motifs[40],2);state.selected=state.layers[0].id}
function addLayer(motif,scene=state.scene){const l={id:uid(),name:motif[0],category:motif[1],emoji:motif[2],type:'icon',x:50,y:43,size:34,rotation:0,scale:1,start:0,end:currentScene()?.duration||4,motion:state.motion,color:state.primary,accent:state.accent,style:state.style,text:''};state.scenes[scene].layers.push(l);state.layers.push(l);state.selected=l.id;render();return l}
function addText(){const l=addLayer(['Teks','Tipografi','✦']);l.type='text';l.text='YOUR MESSAGE';l.emoji='';l.size=9;l.y=78;render()}
function selected(){return state.layers.find(x=>x.id===state.selected)||null}
function svgFor(l,small=false){
 const symbol=l.type==='text'?esc(l.text):esc(l.emoji);
 const gradient=l.style==='Gradient'||l.style==='3D Soft'||l.style==='Glass'||l.style==='Neon';
 const defs=gradient?'<linearGradient id="g'+l.id+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+l.color+'"/><stop offset="1" stop-color="'+l.accent+'"/></linearGradient>':'';
 const color=gradient?'url(#g'+l.id+')':l.color;
 const filter=l.style==='3D Soft'?'<filter id="depth"><feDropShadow dx="0" dy="5" stdDeviation="2" flood-opacity=".28"/></filter>':l.style==='Neon'?'<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>':'';
 const textStyle=l.type==='text'?'font-family="Arial,sans-serif" font-weight="800" fill="'+color+'"':'font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif"';
 const effect=l.style==='3D Soft'?' filter="url(#depth)"':l.style==='Neon'?' filter="url(#glow)"':'';
 const outline=l.style==='Outline'&&l.type==='text'?' stroke="'+l.color+'" stroke-width="1.5" paint-order="stroke fill"':'';
 const shadow=l.style==='Glass'?' opacity=".82"':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="480" height="480"><defs>'+defs+filter+'</defs><text x="120" y="'+(l.type==='text'?137:158)+'" text-anchor="middle" dominant-baseline="middle" font-size="'+(l.type==='text'?42:154)+'" '+textStyle+outline+effect+shadow+'>'+symbol+'</text></svg>';
}
function motionCSS(m){return {'Pop & Bounce':'0%,100%{transform:translate(-50%,-50%) scale(1)}35%{transform:translate(-50%,-50%) scale(1.18)}60%{transform:translate(-50%,-50%) scale(.94)}','Float':'0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,-62%)}','Spin':'0%{transform:translate(-50%,-50%) rotate(0)}100%{transform:translate(-50%,-50%) rotate(360deg)}','Draw On':'0%{opacity:0;clip-path:inset(0 100% 0 0)}100%{opacity:1;clip-path:inset(0)}','Elastic':'0%{transform:translate(-50%,-50%) scale(.2)}65%{transform:translate(-50%,-50%) scale(1.2)}100%{transform:translate(-50%,-50%) scale(1)}','Slide In':'0%{transform:translate(-100%,-50%);opacity:0}100%{transform:translate(-50%,-50%);opacity:1}','Pulse':'0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}','Orbit':'0%,100%{transform:translate(-50%,-50%) rotate(-12deg)}50%{transform:translate(-50%,-50%) rotate(12deg)}','Flip':'0%{transform:translate(-50%,-50%) rotateY(0)}50%{transform:translate(-50%,-50%) rotateY(180deg)}100%{transform:translate(-50%,-50%) rotateY(360deg)}','Reveal':'0%{opacity:0;transform:translate(-50%,-50%) scale(.65)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}'}[m]||'0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.08)}'}
function total(){return state.scenes.reduce((a,s)=>a+s.duration,0)}
function sceneOffset(i){return state.scenes.slice(0,i).reduce((a,s)=>a+s.duration,0)}
function localTime(){return Math.max(0,state.time-sceneOffset(state.scene))}
function stageHTML(){const s=currentScene();if(!s)return '';return s.layers.map(l=>{const active=localTime()>=l.start&&localTime()<=l.end;return '<div class="tm4-object '+(l.id===state.selected?'picked':'')+'" data-layer="'+l.id+'" style="left:'+l.x+'%;top:'+l.y+'%;width:'+l.size+'%;height:'+l.size+'%;transform:translate(-50%,-50%) rotate('+l.rotation+'deg) scale('+l.scale+');opacity:'+(active?1:0)+'">'+(l.type==='text'?'<span>'+esc(l.text)+'</span>':svgFor(l))+'</div>'}).join('')}
function exportHTML(){
 const ratio=state.ratio.split(':').map(Number),w=ratio[0],h=ratio[1],bg=state.bg==='transparent'?'transparent':state.bg;
 const scenes=state.scenes.map((s,i)=>{
  const items=s.layers.map(l=>{
   const content=l.type==='text'?'<span>'+esc(l.text)+'</span>':svgFor(l);
   return '<div class="obj" style="left:'+l.x+'%;top:'+l.y+'%;width:'+l.size+'%;height:'+l.size+'%;animation:motion '+Math.max(1,l.end-l.start)+'s ease-in-out infinite">'+content+'</div><style>@keyframes motion{'+motionCSS(l.motion)+'}</style>';
  }).join('');
  return '<section class="scene" style="animation-delay:'+sceneOffset(i)+'s;animation-duration:'+total()+'s">'+items+'<h1>'+esc(s.name)+'</h1></section>';
 }).join('');
 return '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(state.title)+'</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:'+bg+';font-family:Arial,sans-serif}.film{position:relative;width:100vw;height:100vh;aspect-ratio:'+w+'/'+h+';overflow:hidden;background:'+bg+'}.scene{position:absolute;inset:0;opacity:0;animation:show '+total()+'s linear infinite}.obj{position:absolute;transform:translate(-50%,-50%);transform-origin:center}.obj svg{width:100%;height:100%}.obj span{font-size:clamp(20px,5vw,90px);font-weight:900;color:#1c2938}@keyframes show{0%,2%{opacity:0}4%,28%{opacity:1}33%,100%{opacity:0}}h1{position:absolute;bottom:6%;left:0;width:100%;text-align:center;font-size:clamp(16px,3vw,48px);letter-spacing:.12em;color:#253345}</style><main class="film">'+scenes+'</main></html>';
}
function output(){const l=selected()||state.layers[0];if(state.out==='svg')return l?svgFor(l):'';if(state.out==='html'){if(!l)return '';return '<!doctype html><html><meta charset="utf-8"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:transparent}.icon{width:min(65vw,480px);animation:move 2.2s ease-in-out infinite}@keyframes move{'+motionCSS(l.motion)+'}</style><div class="icon">'+svgFor(l)+'</div></html>'}return exportHTML()}
function renderCatalog(){const q=($('tm4Search').value||'').toLowerCase(),cat=$('tm4Category').value;const list=motifs.map((m,i)=>({m,i})).filter(x=>(cat==='Semua'||x.m[1]===cat)&&(x.m[0]+' '+x.m[1]).toLowerCase().includes(q));$('tm4Catalog').innerHTML=list.map(x=>'<button class="tm4-item" data-motif="'+x.i+'"><b>'+x.m[2]+'</b><span>'+esc(x.m[0])+'<small>'+esc(x.m[1])+'</small></span></button>').join('');$('tm4MotifCount').textContent=motifs.length+' bentuk dasar unik · '+styles.length+' pilihan gaya terpisah';}
function renderLayers(){const s=currentScene();$('tm4Layers').innerHTML=s.layers.map((l,i)=>'<button class="tm4-layer '+(l.id===state.selected?'active':'')+'" data-select="'+l.id+'"><span>'+(l.type==='text'?'T':l.emoji)+'</span><span>'+esc(l.name)+'</span><small>'+Math.round(l.start*10)/10+'–'+Math.round(l.end*10)/10+'s</small></button>').join('')||'<p class="tm4-muted">Scene ini belum memiliki layer.</p>';const l=selected();$('tm4Inspector').innerHTML=l?'<label>Nama layer<input id="tm4LayerName" value="'+esc(l.name)+'"></label><div class="tm4-two"><label>Posisi X %<input id="tm4X" type="number" min="0" max="100" value="'+l.x+'"></label><label>Posisi Y %<input id="tm4Y" type="number" min="0" max="100" value="'+l.y+'"></label><label>Ukuran %<input id="tm4Size" type="number" min="5" max="100" value="'+l.size+'"></label><label>Rotasi °<input id="tm4Rotation" type="number" value="'+l.rotation+'"></label><label>Mulai (detik)<input id="tm4Start" type="number" min="0" step=".1" value="'+l.start+'"></label><label>Akhir (detik)<input id="tm4End" type="number" min=".1" step=".1" value="'+l.end+'"></label></div>'+(l.type==='text'?'<label>Isi teks<textarea id="tm4Text">'+esc(l.text)+'</textarea></label>':''):'<p class="tm4-muted">Pilih layer untuk mengedit properti.</p>'}
function renderTimeline(){const s=currentScene();$('tm4SceneTabs').innerHTML=state.scenes.map((x,i)=>'<button data-scene="'+i+'" class="'+(i===state.scene?'active':'')+'">'+(i+1)+'. '+esc(x.name)+'</button>').join('')+'<button id="tm4AddScene">＋ Scene</button>';const max=Math.max(.1,total());$('tm4Seek').max=max;$('tm4Seek').value=state.time;$('tm4Time').textContent=state.time.toFixed(1)+' / '+max.toFixed(1)+'s';$('tm4Track').innerHTML=s.layers.map(l=>'<div class="tm4-clip '+(l.id===state.selected?'active':'')+'" data-select="'+l.id+'" style="left:'+(l.start/Math.max(.1,s.duration)*100)+'%;width:'+Math.max(2,(l.end-l.start)/Math.max(.1,s.duration)*100)+'%">'+esc(l.name)+'</div>').join('')||'<span class="tm4-muted">Belum ada klip pada scene ini</span>'}
function render(){renderCatalog();renderLayers();renderTimeline();$('tm4Stage').style.aspectRatio=state.ratio.replace(':','/');$('tm4Stage').style.background=state.bg==='transparent'?'linear-gradient(45deg,#dce1e8 25%,transparent 25%),linear-gradient(-45deg,#dce1e8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dce1e8 75%),linear-gradient(-45deg,transparent 75%,#dce1e8 75%)':state.bg;$('tm4Stage').innerHTML=stageHTML();$('tm4Output').value=output();$('tm4Duration').value=state.duration;$('tm4FPS').value=state.fps;$('tm4Ratio').value=state.ratio;$('tm4Resolution').value=state.resolution;$('tm4Background').value=state.bg;$('tm4Style').value=state.style;$('tm4Motion').value=state.motion;$('tm4Primary').value=state.primary;$('tm4Accent').value=state.accent;$('tm4Title').value=state.title;$('tm4Play').textContent=state.playing?'❚❚ Pause':'▶ Play';$('tm4Status').textContent='Preview · '+state.resolution+' · '+state.fps+' FPS · '+total().toFixed(1)+' detik'}
function updateLayerFromInspector(){const l=selected();if(!l)return;const val=(id,old)=>$(id)?$(id).value:old;l.name=val('tm4LayerName',l.name);l.x=+val('tm4X',l.x);l.y=+val('tm4Y',l.y);l.size=+val('tm4Size',l.size);l.rotation=+val('tm4Rotation',l.rotation);l.start=+val('tm4Start',l.start);l.end=+val('tm4End',l.end);if($('tm4Text'))l.text=$('tm4Text').value}
function tick(now){if(!state.playing)return;if(!state.last)state.last=now;state.time+=(now-state.last)/1000;state.last=now;if(state.time>=total()){state.time=0}let offset=0;for(let i=0;i<state.scenes.length;i++){const end=offset+state.scenes[i].duration;if(state.time<end||i===state.scenes.length-1){if(state.scene!==i){state.scene=i;renderLayers();renderTimeline()}break}offset=end}$('tm4Stage').innerHTML=stageHTML();$('tm4Seek').value=state.time;$('tm4Time').textContent=state.time.toFixed(1)+' / '+total().toFixed(1)+'s';state.raf=requestAnimationFrame(tick)}
function play(){state.playing=!state.playing;state.last=0;if(state.playing)state.raf=requestAnimationFrame(tick);else cancelAnimationFrame(state.raf);$('tm4Play').textContent=state.playing?'❚❚ Pause':'▶ Play'}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function init(){const switcher=document.querySelector('.ui-layout-switcher');if(!switcher||$('tm4ModeBtn'))return false;
const style=document.createElement('style');style.textContent='#tm4Overlay{position:fixed;inset:0;z-index:99999;background:#0b111b;color:#eaf2fb;display:none;grid-template-rows:auto minmax(0,1fr);font:13px/1.4 Inter,Arial,sans-serif}#tm4Overlay.open{display:grid}#tm4Overlay *{box-sizing:border-box}#tm4Head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;background:#14253a;border-bottom:1px solid #35506b}#tm4Head strong{color:#8fe5ff;font-size:15px}#tm4Head .spacer{flex:1}#tm4Work{display:grid;grid-template-columns:minmax(205px,250px) minmax(330px,1fr) minmax(260px,330px);gap:10px;padding:10px;min-height:0;overflow:auto}.tm4-panel{min-width:0;overflow:auto;background:#172638;border:1px solid #344e68;border-radius:10px;padding:11px}.tm4-panel h3{margin:0 0 9px;color:#8fe5ff;font-size:11px;letter-spacing:.5px}.tm4-muted,.tm4-help{font-size:11px;color:#a7bdd2}.tm4-field{display:block;font-size:11px;color:#c9d9e9;margin:7px 0}.tm4-field input,.tm4-field select,.tm4-field textarea,#tm4Overlay input,#tm4Overlay select,#tm4Overlay textarea{width:100%;min-width:0;padding:7px;border:1px solid #405a74;border-radius:6px;background:#0d1724;color:#f2f7fc;margin-top:4px}#tm4Catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:8px}.tm4-item,.tm4-layer{display:flex;gap:7px;align-items:center;text-align:left;padding:7px;background:#1b3045;border:1px solid #3a5873;color:#eaf5ff;border-radius:7px;min-width:0}.tm4-item b{font-size:21px}.tm4-item span,.tm4-layer span:nth-child(2){font-size:11px}.tm4-item small{display:block;color:#9fb4ca;font-size:9px}.tm4-stagewrap{display:grid;place-items:center;min-height:280px;background:#101b29;border-radius:8px;padding:10px}.tm4-stage{position:relative;width:min(100%,900px);max-height:58vh;aspect-ratio:16/9;overflow:hidden;border:1px solid #435b72;background:#f7f5ef;background-size:22px 22px;}.tm4-object{position:absolute;display:grid;place-items:center;transform-origin:center;cursor:pointer}.tm4-object.picked{outline:2px dashed #f5c66a;outline-offset:3px}.tm4-object svg{width:100%;height:100%;overflow:visible}.tm4-object span{font-weight:900;font-size:clamp(16px,4vw,65px);color:#182331;white-space:nowrap}.tm4-transport,.tm4-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0}.tm4-transport button,.tm4-row button,#tm4Head button{padding:7px 9px;border:1px solid #4b6883;border-radius:6px;background:#203b55;color:#fff}.tm4-transport input{flex:1}.tm4-timeline{height:52px;position:relative;background:#0d1724;border:1px solid #344e68;border-radius:6px;overflow:hidden}.tm4-clip{position:absolute;top:10px;height:29px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:#275b79;border:1px solid #6dc7e9;border-radius:5px;padding:5px;font-size:10px;color:#fff;cursor:pointer}.tm4-clip.active{background:#8a6527;border-color:#f8d17b}.tm4-two{display:grid;grid-template-columns:1fr 1fr;gap:5px}.tm4-two label{font-size:10px;color:#bcd0e4}.tm4-two input{width:100%}#tm4Layers{display:grid;gap:5px;margin:8px 0}.tm4-layer small{margin-left:auto;color:#a8c2d9;font-size:9px}.tm4-layer.active{border-color:#f5c66a}.tm4-tabs{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.tm4-tabs button{padding:6px;background:#213a52;color:#eaf5ff;border:1px solid #45627d;border-radius:6px}.tm4-tabs button.active{background:#dcb85f;color:#192536}#tm4Output{height:210px;font:10px/1.45 monospace;resize:vertical}.tm4-primary{background:#dcb85f!important;color:#172536!important;font-weight:800}#tm4Seek{width:100%}@media(max-width:1000px){#tm4Work{grid-template-columns:1fr 1fr}#tm4Center{grid-column:1/-1;grid-row:1}}@media(max-width:620px){#tm4Work{grid-template-columns:1fr}#tm4Center{grid-column:auto}#tm4Stage{max-height:42vh}#tm4Catalog{grid-template-columns:repeat(3,minmax(0,1fr))}}';document.head.appendChild(style);
const btn=document.createElement('button');btn.id='tm4ModeBtn';btn.type='button';btn.className='ui-layout-btn';btn.textContent='ICON & LOGO MOTION';switcher.appendChild(btn);
const ov=document.createElement('section');ov.id='tm4Overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.innerHTML='<header id="tm4Head"><strong>TROZAL MOTION · ICON & LOGO MOTION STUDIO</strong><span>Komposisi ikon, logo, dan motion graphic</span><span class="spacer"></span><button id="tm4Close">Kembali ke Editor ✕</button></header><div id="tm4Work"><section class="tm4-panel"><h3>01 · KATALOG & LAYER</h3><input id="tm4Search" placeholder="Cari motif ikon…"><select id="tm4Category">'+categories.map(c=>'<option>'+c+'</option>').join('')+'</select><p class="tm4-muted" id="tm4MotifCount"></p><div id="tm4Catalog"></div><div class="tm4-row"><button id="tm4AddText">＋ Teks</button><button id="tm4Duplicate">Duplikat</button><button id="tm4Delete">Hapus</button></div><h3>URUTAN LAYER</h3><div id="tm4Layers"></div><div id="tm4Inspector"></div></section><section class="tm4-panel" id="tm4Center"><h3>02 · LIVE PREVIEW & TIMELINE</h3><div class="tm4-stagewrap"><div class="tm4-stage" id="tm4Stage"></div></div><div class="tm4-transport"><button id="tm4Play" class="tm4-primary">▶ Play</button><button id="tm4Restart">↺ Restart</button><span id="tm4Time">0.0 / 12.0s</span></div><input id="tm4Seek" type="range" min="0" max="12" step=".01" value="0"><div class="tm4-row" id="tm4SceneTabs"></div><div class="tm4-timeline" id="tm4Track"></div><div class="tm4-row"><label class="tm4-field">Durasi total (detik)<input id="tm4Duration" type="number" min="1" max="3600" value="12"></label><label class="tm4-field">FPS<select id="tm4FPS"><option>24</option><option selected>30</option><option>50</option><option>60</option></select></label><label class="tm4-field">Rasio<select id="tm4Ratio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option><option>4:3</option></select></label></div><div class="tm4-row"><label class="tm4-field">Resolusi<select id="tm4Resolution"><option>1280x720</option><option>1920x1080</option><option>2560x1440</option><option>3840x2160</option></select></label><label class="tm4-field">Latar<select id="tm4Background"><option value="transparent">Transparan</option><option value="#f5f2ea">Warm Paper</option><option value="#101827">Midnight</option><option value="#ffffff">Putih</option><option value="#000000">Hitam</option></select></label><label class="tm4-field">Gaya<select id="tm4Style">'+styles.map(x=>'<option>'+x+'</option>').join('')+'</select></label></div><div class="tm4-row"><label class="tm4-field">Warna utama<input id="tm4Primary" type="color" value="#ffbd45"></label><label class="tm4-field">Warna aksen<input id="tm4Accent" type="color" value="#55c7dc"></label><label class="tm4-field">Animasi<select id="tm4Motion">'+motions.map(x=>'<option>'+x+'</option>').join('')+'</select></label></div><label class="tm4-field">Judul komposisi<input id="tm4Title" value="ICON MOTION STORY"></label><p id="tm4Status" class="tm4-muted"></p></section><section class="tm4-panel"><h3>03 · KELUARAN & EKSPOR KODE</h3><div class="tm4-tabs"><button data-out="svg">SVG Transparan</button><button data-out="html">Animated HTML</button><button data-out="video" class="active">Video Motion HTML</button></div><textarea id="tm4Output" spellcheck="false"></textarea><div class="tm4-row"><button id="tm4Refresh" class="tm4-primary">Perbarui Kode</button><button id="tm4Copy">Salin</button><button id="tm4Download">Unduh</button></div><p class="tm4-help">Video Motion HTML berisi scene dan layer yang disusun di studio ini. Untuk MP4, ProRes 4444 Alpha, atau PNG Sequence, teruskan HTML melalui Terminal HTML / Canvas utama dan gunakan mesin render BROWSER. Pengaturan FPS/resolusi di sini menjadi metadata komposisi; encoding tetap dilakukan oleh mesin render utama.</p></section></div>';document.body.appendChild(ov);
seed();btn.onclick=()=>{ov.classList.add('open');render()};$('tm4Close').onclick=()=>{state.playing=false;cancelAnimationFrame(state.raf);ov.classList.remove('open')};
ov.addEventListener('click',e=>{if(e.target.closest('#tm4AddScene')){state.scenes.push({id:uid(),name:'Scene '+(state.scenes.length+1),duration:4,layers:[]});state.scene=state.scenes.length-1;render();return}const motif=e.target.closest('[data-motif]');if(motif){const item=[...motifs[+motif.dataset.motif],motif.dataset.style];addLayer(item);return}const sel=e.target.closest('[data-select]');if(sel){state.selected=sel.dataset.select;render();return}const scene=e.target.closest('[data-scene]');if(scene){state.scene=+scene.dataset.scene;state.time=sceneOffset(state.scene);render();return}const out=e.target.closest('[data-out]');if(out){state.out=out.dataset.out;ov.querySelectorAll('[data-out]').forEach(x=>x.classList.toggle('active',x===out));render();return}});
$('tm4Stage').addEventListener('click',e=>{const el=e.target.closest('[data-layer]');if(el){state.selected=el.dataset.layer;renderLayers();renderTimeline();$('tm4Stage').innerHTML=stageHTML()}});
$('tm4Search').oninput=renderCatalog;$('tm4Category').onchange=renderCatalog;
$('tm4AddText').onclick=addText;$('tm4Duplicate').onclick=()=>{const l=selected();if(l){const c={...l,id:uid(),name:l.name+' Copy',x:Math.min(90,l.x+5),y:Math.min(90,l.y+5)};currentScene().layers.push(c);state.layers.push(c);state.selected=c.id;render()}};
$('tm4Delete').onclick=()=>{const l=selected();if(!l)return;currentScene().layers=currentScene().layers.filter(x=>x.id!==l.id);state.layers=state.layers.filter(x=>x.id!==l.id);state.selected=currentScene().layers[0]?.id||null;render()};
$('tm4Inspector').addEventListener('change',()=>{updateLayerFromInspector();render()});$('tm4Inspector').addEventListener('input',()=>{updateLayerFromInspector();$('tm4Stage').innerHTML=stageHTML();$('tm4Output').value=output()});
$('tm4Play').onclick=play;$('tm4Restart').onclick=()=>{state.time=0;state.scene=0;render()};$('tm4Seek').oninput=e=>{state.time=+e.target.value;let t=0;state.scene=0;for(let i=0;i<state.scenes.length;i++){if(state.time<t+state.scenes[i].duration||i===state.scenes.length-1){state.scene=i;break}t+=state.scenes[i].duration}render()};

['tm4Duration','tm4FPS','tm4Ratio','tm4Resolution','tm4Background','tm4Style','tm4Motion','tm4Primary','tm4Accent','tm4Title'].forEach(id=>$(id).addEventListener('change',()=>{state.duration=+$('tm4Duration').value||12;state.fps=+$('tm4FPS').value;state.ratio=$('tm4Ratio').value;state.resolution=$('tm4Resolution').value;state.bg=$('tm4Background').value;state.style=$('tm4Style').value;state.motion=$('tm4Motion').value;state.primary=$('tm4Primary').value;state.accent=$('tm4Accent').value;state.title=$('tm4Title').value;state.scenes.forEach(s=>s.layers.forEach(l=>{l.style=state.style;l.motion=state.motion;l.color=state.primary;l.accent=state.accent}));const sum=state.scenes.reduce((a,s)=>a+s.duration,0);if(state.duration!==sum){const factor=state.duration/Math.max(.1,sum);state.scenes.forEach(s=>{s.duration*=factor;s.layers.forEach(l=>{l.end=Math.min(s.duration,l.end*factor);l.start=Math.min(l.start*factor,l.end)})})}render()}));
$('tm4Refresh').onclick=()=>{$('tm4Output').value=output();$('tm4Status').textContent='Kode diperbarui.'};
$('tm4Copy').onclick=async()=>{try{await navigator.clipboard.writeText($('tm4Output').value);$('tm4Status').textContent='Kode berhasil disalin.'}catch(e){$('tm4Output').select();document.execCommand('copy');$('tm4Status').textContent='Gunakan Ctrl+C untuk menyalin.'}};
$('tm4Download').onclick=()=>{const ext=state.out==='svg'?'svg':'html';download(state.out==='svg'?'trozal-icon.svg':state.out==='html'?'trozal-animated-icon.html':'trozal-icon-motion-video.html',$('tm4Output').value,ext==='svg'?'image/svg+xml':'text/html;charset=utf-8')};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('open')){$('tm4Close').click()}});
render();return true}
function boot(){if(!init())setTimeout(boot,350)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();