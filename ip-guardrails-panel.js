/* TROZAL MOTION · Visible, always-on original-content safeguards */
(function(){
 'use strict';
 const POLICY=[
  'Konten visual harus orisinal dan dibuat secara independen.',
  'Jangan menampilkan atau meniru karakter, semesta fiksi, selebritas, kostum khas, karya seni, atau desain pihak ketiga yang dilindungi.',
  'Jangan menampilkan logo perusahaan/produk, merek dagang, watermark, tanda tangan, atau identitas korporat yang dapat dikenali.',
  'Untuk tema brand/logo, gunakan geometri abstrak non-identifying tanpa nama merek atau wordmark.',
  'Jika brief meminta IP terlindungi, ubah menjadi alternatif orisinal dengan hanya mengambil mood atau genre umum yang tidak dilindungi.',
  'Jangan menyalin lirik, kutipan, screenshot, artwork sumber, atau teks milik pihak lain.'
 ];
 function mount(){
  const anchor=document.getElementById('visualMotionPrompt');
  if(!anchor||document.getElementById('trozalIpGuardrailsPanel'))return;
  const panel=document.createElement('section');
  panel.id='trozalIpGuardrailsPanel';
  panel.setAttribute('role','note');
  panel.setAttribute('aria-label','Perlindungan konten orisinal dan kekayaan intelektual');
  panel.style.cssText='margin:8px 0 12px;padding:10px 12px;border:1px solid #43866d;border-radius:9px;background:linear-gradient(145deg,#102b25,#182c2d);color:#dff7e9;font-size:11px;line-height:1.55';
  const heading=document.createElement('div');
  heading.textContent='🛡 ORIGINAL CONTENT & IP GUARDRAILS · SELALU AKTIF';
  heading.style.cssText='font-weight:900;color:#a9edc5;letter-spacing:.04em;margin-bottom:6px';
  const note=document.createElement('p');
  note.textContent='Aturan berikut otomatis disertakan dalam instruksi AI Scene Composer. Tidak ada opsi untuk menonaktifkannya.';
  note.style.cssText='margin:0 0 6px;color:#d2e9dc';
  const list=document.createElement('ul');
  list.style.cssText='margin:0;padding-left:18px';
  POLICY.forEach(item=>{const li=document.createElement('li');li.textContent=item;li.style.margin='3px 0';list.appendChild(li);});
  const foot=document.createElement('p');
  foot.textContent='Catatan: kebijakan ini mengarahkan konten yang dibuat AI; file HTML atau aset yang ditempel/impor secara manual tetap perlu diperiksa.';
  foot.style.cssText='margin:7px 0 0;color:#b6d2c1;font-size:10px';
  panel.append(heading,note,list,foot);
  anchor.insertAdjacentElement('afterend',panel);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();