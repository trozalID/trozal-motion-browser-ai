(function () {
'use strict';
if (window.__trozalIndependentLogoStudio) return;
window.__trozalIndependentLogoStudio = true;
const templates = [
{id:'orbit',name:'Orbit',category:'Geometris',keywords:'planet space ring orbit circular',path:'<circle cx="60" cy="60" r="25" fill="none" stroke="{c}" stroke-width="8"/><ellipse cx="60" cy="60" rx="48" ry="17" fill="none" stroke="{c}" stroke-width="5" transform="rotate(-28 60 60)"/><circle cx="94" cy="35" r="6" fill="{c}"/>'},
{id:'shield',name:'Aegis',category:'Emblem',keywords:'security protection shield badge',path:'<path d="M60 10 101 26 96 68 60 108 24 68 19 26Z" fill="none" stroke="{c}" stroke-width="8" stroke-linejoin="round"/><path d="m39 59 14 14 29-31" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'},
{id:'monogram',name:'Monogram',category:'Monogram',keywords:'letter initials typographic premium',path:'<rect x="13" y="13" width="94" height="94" rx="24" fill="none" stroke="{c}" stroke-width="7"/><path d="M38 83V37h18c25 0 25 32 0 32H38m27-32 25 46" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'},
{id:'petal',name:'Bloom',category:'Organik',keywords:'flower botanical wellness petal',path:'<g fill="none" stroke="{c}" stroke-width="7"><ellipse cx="60" cy="34" rx="13" ry="24"/><ellipse cx="60" cy="86" rx="13" ry="24"/><ellipse cx="34" cy="60" rx="13" ry="24" transform="rotate(90 34 60)"/><ellipse cx="86" cy="60" rx="13" ry="24" transform="rotate(90 86 60)"/><circle cx="60" cy="60" r="8" fill="{c}"/></g>'},
{id:'mountain',name:'Summit',category:'Geometris',keywords:'mountain outdoor travel peak landscape',path:'<path d="m12 94 34-53 17 25 13-18 32 46H12Z" fill="none" stroke="{c}" stroke-width="8" stroke-linejoin="round"/><path d="m38 94 23-35 17 25" fill="none" stroke="{c}" stroke-width="5" stroke-linejoin="round"/>'},
{id:'hex',name:'Hexa',category:'Geometris',keywords:'hexagon technology network digital',path:'<path d="m60 9 43 25v52l-43 25-43-25V34Z" fill="none" stroke="{c}" stroke-width="8"/><circle cx="60" cy="60" r="17" fill="{c}"/>'},
{id:'wave',name:'Current',category:'Abstrak',keywords:'wave water ocean flow sound',path:'<path d="M10 45c17-22 33-22 50 0s33 22 50 0M10 75c17-22 33-22 50 0s33 22 50 0" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round"/>'},
{id:'star',name:'Northstar',category:'Abstrak',keywords:'star sparkle celestial luxury',path:'<path d="m60 7 12 39 39 14-39 12-12 39-12-39L9 60l39-14Z" fill="none" stroke="{c}" stroke-width="8" stroke-linejoin="round"/><circle cx="60" cy="60" r="7" fill="{c}"/>'},
{id:'leaf',name:'Verdant',category:'Organik',keywords:'leaf eco nature green sustainability',path:'<path d="M100 16C49 13 17 39 21 75c3 27 34 35 55 16 20-18 23-46 24-75Z" fill="none" stroke="{c}" stroke-width="8"/><path d="M22 100c19-31 39-48 70-68" fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round"/>'},
{id:'crown',name:'Sovereign',category:'Emblem',keywords:'crown royal premium fashion',path:'<path d="m15 36 25 22 20-35 20 35 25-22-9 55H24Z" fill="none" stroke="{c}" stroke-width="8" stroke-linejoin="round"/><path d="M27 104h66" stroke="{c}" stroke-width="8" stroke-linecap="round"/>'},
{id:'prism',name:'Prism',category:'Geometris',keywords:'triangle prism crystal 3d creative',path:'<path d="m60 12 48 82H12Z" fill="none" stroke="{c}" stroke-width="8" stroke-linejoin="round"/><path d="m60 12 1 82M36 53h48" stroke="{c}" stroke-width="5" opacity=".8"/>'},
{id:'compass',name:'Waypoint',category:'Emblem',keywords:'compass navigation location direction',path:'<circle cx="60" cy="60" r="47" fill="none" stroke="{c}" stroke-width="7"/><path d="m77 27-12 38-38 28 12-38Z" fill="none" stroke="{c}" stroke-width="7" stroke-linejoin="round"/><circle cx="60" cy="60" r="5" fill="{c}"/>'},
{id:'bolt',name:'Volt',category:'Teknologi',keywords:'energy lightning power electric',path:'<path d="M68 8 25 66h29l-6 46 47-65H65Z" fill="none" stroke="{c}" stroke-width="8" stroke-linejoin="round"/>'},
{id:'loop',name:'Infinity',category:'Abstrak',keywords:'infinity loop connection continuous',path:'<path d="M60 60C38 27 13 36 13 60s25 33 47 0 47-33 47 0-25 33-47 0Z" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round"/>'},
{id:'mascot',name:'Mascot',category:'Maskot',keywords:'mascot face friendly character',path:'<circle cx="60" cy="60" r="43" fill="none" stroke="{c}" stroke-width="8"/><path d="M42 51h2m32 0h2M42 77q18 16 36 0" stroke="{c}" stroke-width="8" stroke-linecap="round"/>'},
{id:'wordmark',name:'Wordmark',category:'Wordmark',keywords:'typography text lettering brand',path:'<path d="M17 34h86M17 60h65M17 86h86" stroke="{c}" stroke-width="9" stroke-linecap="round"/>'}
];
const $ = id => document.getElementById(id);
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
let active = templates[0];
function buildSvg() {
const color = $('trozalLogoColor')?.value || '#e5b85c';
const name = ($('trozalLogoName')?.value || 'TROZAL').trim().slice(0,32);
const tagline = ($('trozalLogoTagline')?.value || '').trim().slice(0,48);
const mark = active.path.replace(/\{c\}/g,color);
const word = active.id === 'wordmark'
? '<text x="120" y="70" fill="'+color+'" font-family="Arial,sans-serif" font-size="28" font-weight="800" letter-spacing="2">'+esc(name || 'BRAND')+'</text>'
: '<text x="120" y="57" fill="'+color+'" font-family="Arial,sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">'+esc(name || 'BRAND')+'</text>'+(tagline?'<text x="121" y="78" fill="'+color+'" opacity=".68" font-family="Arial,sans-serif" font-size="9" letter-spacing="2">'+esc(tagline)+'</text>':'');
return '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><g transform="translate(0 30)">'+mark+'</g>'+word+'</svg>';
}
function render() {
const preview=$('trozalLogoPreview'); if(!preview)return;
preview.innerHTML=buildSvg();
preview.className='logo-preview logo-anim-'+($('trozalLogoAnimation')?.value||'none');
$('trozalLogoActiveName').textContent=active.name+' · '+active.category;
}
function renderCatalog() {
const host=$('trozalLogoCatalog'); if(!host)return;
const q=($('trozalLogoSearch')?.value||'').trim().toLowerCase();
const category=$('trozalLogoCategory')?.value||'Semua';
const matches=templates.filter(item=>(category==='Semua'||item.category===category)&&(!q||(item.name+' '+item.category+' '+item.keywords).toLowerCase().includes(q)));
host.replaceChildren();
matches.forEach(item=>{
const button=document.createElement('button');button.type='button';button.className='logo-choice'+(item.id===active.id?' active':'');button.setAttribute('aria-pressed',String(item.id===active.id));
const glyph=document.createElement('span');glyph.className='logo-choice-mark';glyph.innerHTML='<svg viewBox="0 0 120 120" aria-hidden="true">'+item.path.replace(/\{c\}/g,'#d8bd83')+'</svg>';
const label=document.createElement('span');label.textContent=item.name;const type=document.createElement('small');type.textContent=item.category;
button.append(glyph,label,type);button.addEventListener('click',()=>{active=item;renderCatalog();render();});host.appendChild(button);
});
$('trozalLogoCount').textContent=matches.length+' logo tersedia · katalog independen';
}
function download(name,type,data) {
const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function bind() {
['trozalLogoName','trozalLogoTagline','trozalLogoColor','trozalLogoAnimation'].forEach(id=>$(id)?.addEventListener('input',render));
$('trozalLogoSearch')?.addEventListener('input',renderCatalog);$('trozalLogoCategory')?.addEventListener('change',renderCatalog);
$('trozalLogoRandom')?.addEventListener('click',()=>{const options=templates.filter(item=>item.id!==active.id);active=options[Math.floor(Math.random()*options.length)]||templates[0];renderCatalog();render();});
$('trozalLogoCopy')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(buildSvg());$('trozalLogoStatus').textContent='SVG logo berhasil disalin.';}catch(_){$('trozalLogoStatus').textContent='Clipboard tidak tersedia. Gunakan Unduh SVG.';}});
$('trozalLogoDownload')?.addEventListener('click',()=>{download('trozal-logo.svg','image/svg+xml;charset=utf-8',buildSvg());$('trozalLogoStatus').textContent='File SVG disiapkan.';});
$('trozalLogoPng')?.addEventListener('click',()=>{
const url=URL.createObjectURL(new Blob([buildSvg()],{type:'image/svg+xml;charset=utf-8'}));const img=new Image();
img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=360;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1280,360);ctx.drawImage(img,0,0,1280,360);URL.revokeObjectURL(url);canvas.toBlob(png=>{if(!png)return;const pngUrl=URL.createObjectURL(png);const a=document.createElement('a');a.href=pngUrl;a.download='trozal-logo.png';a.click();setTimeout(()=>URL.revokeObjectURL(pngUrl),1000);},'image/png');$('trozalLogoStatus').textContent='PNG transparan 1280 × 360 disiapkan.';};
img.onerror=()=>{URL.revokeObjectURL(url);$('trozalLogoStatus').textContent='Gagal membuat PNG. Unduh SVG sebagai alternatif.';};img.src=url;
});
}
function init() {
if(!$('trozalLogoStudio'))return;bind();renderCatalog();render();
window.trozalLogoStudio={getSvg:buildSvg,getActiveTemplate:()=>active.id,getTemplates:()=>templates.map(({id,name,category})=>({id,name,category}))};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();