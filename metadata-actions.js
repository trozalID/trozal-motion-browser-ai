/* TROZAL MOTION — Metadata copy and clear actions */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['metadataTitle','metadataDescription','metadataCategory','metadataKeywords'];
  const labels = {metadataTitle:'Judul',metadataDescription:'Deskripsi',metadataCategory:'Kategori',metadataKeywords:'Kata kunci'};
  const status = message => { const el=$('metadataStatus'); if(el) el.textContent=message; };
  async function copyText(value) {
    const valueText=String(value??'').trim();
    if(!valueText) throw new Error('Kolom metadata masih kosong.');
    if(navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(valueText); return; } catch (_) {}
    }
    const area=document.createElement('textarea');
    area.value=valueText; area.setAttribute('readonly','');
    area.style.position='fixed'; area.style.opacity='0'; area.style.pointerEvents='none';
    document.body.appendChild(area); area.focus(); area.select(); area.setSelectionRange(0,area.value.length);
    let ok=false;
    try { ok=document.execCommand('copy'); } finally { area.remove(); }
    if(!ok) throw new Error('Browser menolak akses clipboard. Izinkan clipboard atau salin teks yang dipilih secara manual.');
  }
  function valueOf(id) {
    const el=$(id);
    return el ? (el.tagName==='SELECT' ? el.options[el.selectedIndex]?.textContent||el.value : el.value) : '';
  }
  async function handleCopy(id) {
    const label=labels[id]||'Metadata';
    try { await copyText(valueOf(id)); status(label+' berhasil disalin.'); }
    catch(e) { status('Gagal menyalin '+label.toLowerCase()+': '+e.message); }
  }
  async function handleCopyAll() {
    const content=[['Judul',valueOf('metadataTitle')],['Deskripsi',valueOf('metadataDescription')],['Kategori',valueOf('metadataCategory')],['Kata kunci',valueOf('metadataKeywords')]]
      .map(([k,v])=>k+': '+String(v||'').trim()).join('\n\n');
    try { await copyText(content); status('Semua metadata berhasil disalin.'); }
    catch(e) { status('Gagal menyalin semua metadata: '+e.message); }
  }
  function clearAll() {
    fields.forEach(id=>{const el=$(id);if(!el)return;if(el.tagName==='SELECT')el.selectedIndex=0;else el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
    ['metadataSubject','metadataEvidence'].forEach(id=>{const el=$(id);if(el && 'value' in el){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}});
    document.querySelectorAll('#metadataKeywordReview input[type="checkbox"]').forEach(el=>{el.checked=false;});
    if(typeof window.trozalRefreshMetadataQuality==='function') window.trozalRefreshMetadataQuality();
    status('Metadata dibersihkan. Silakan generate ulang atau isi secara manual.');
  }
  function bind() {
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-copy-meta]');
      if(button){event.preventDefault();handleCopy(button.getAttribute('data-copy-meta'));return;}
      if(event.target.closest('#copyAllMetadataBtn')){event.preventDefault();handleCopyAll();return;}
      if(event.target.closest('#clearMetadataBtn')){event.preventDefault();clearAll();}
    });
    console.info('[TROZAL METADATA ACTIONS] Copy and clear handlers active.');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();