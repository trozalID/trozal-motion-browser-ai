/* TROZAL MOTION — Metadata Quality & Delivery
 * Local editorial audit only. It does not claim visual verification or marketplace acceptance.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ids = ['metadataTitle','metadataDescription','metadataCategory','metadataKeywords','metadataSubject','metadataEvidence','metadataPlatform'];
  const state = { approved: new Set(), keywords: [], lastSignature: '' };
  const text = id => String($(id)?.value ?? $(id)?.textContent ?? '').trim();
  const splitKeywords = () => text('metadataKeywords').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const evidenceText = () => [text('metadataSubject'), text('metadataEvidence')].join(' ').toLowerCase();
  const tokens = value => new Set((String(value).toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || []).filter(x => !['the','and','with','from','this','that','into','over','under','for','are','has','its'].includes(x)));
  const platformRules = () => {
    const platform = text('metadataPlatform');
    return platform === 'adobe' ? 'Adobe Stock' : platform === 'shutterstock' ? 'Shutterstock' : platform === 'dreamstime' ? 'Dreamstime' : 'platform umum';
  };
  function audit() {
    const title = text('metadataTitle'), description = text('metadataDescription');
    const category = text('metadataCategory'), evidence = evidenceText();
    const raw = splitKeywords(), seen = new Set(), duplicates = [];
    const keywords = raw.map(k => k.trim()).filter(k => {
      const key = k.toLowerCase();
      if (seen.has(key)) { duplicates.push(k); return false; }
      seen.add(key); return true;
    });
    const evidenceTokens = tokens(evidence);
    const scored = keywords.map(keyword => {
      const kt = [...tokens(keyword)];
      const matches = kt.filter(t => evidenceTokens.has(t)).length;
      return { keyword, relevant: kt.length > 0 && matches > 0, score: kt.length ? matches / kt.length : 0 };
    });
    const relevantCount = scored.filter(x => x.relevant).length;
    const fields = [
      {name:'Judul', ok: title.length >= 8, detail: title ? (title.length >= 8 ? 'Terisi' : 'Terlalu singkat') : 'Kosong', weight:20},
      {name:'Deskripsi', ok: description.length >= 30, detail: description ? (description.length >= 30 ? 'Terisi' : 'Perlu diperjelas') : 'Kosong', weight:25},
      {name:'Keyword', ok: keywords.length > 0, detail: keywords.length+' unik · '+relevantCount+' cocok teks'+(duplicates.length?' · '+duplicates.length+' duplikat':''), weight:25},
      {name:'Bukti sumber', ok: evidence.trim().length >= 12, detail: evidence.trim().length >= 12 ? 'Teks bukti tersedia' : 'Belum ada bukti teks', weight:20},
      {name:'Kategori', ok: !!category, detail: category || 'Belum dipilih', weight:10}
    ];
    let score = fields.reduce((n,f)=>n+(f.ok?f.weight:0),0);
    const summary = $('metadataQualitySummary');
    if (summary) summary.textContent = 'Skor kelengkapan '+score+'/100 · '+platformRules()+'. '+(score===100?'Semua kolom dasar terisi.': 'Lengkapi bagian yang belum terpenuhi. ')+'Relevansi keyword dicocokkan secara lokal dengan teks bukti, bukan pemeriksaan visual.';
    const bar = $('metadataQualityBar'), meter = $('metadataQualityMeter');
    if (bar) bar.style.width = score+'%';
    if (meter) meter.setAttribute('aria-valuenow',String(score));
    const details = $('metadataQualityDetails');
    if (details) details.innerHTML = fields.slice(0,4).map(f=>'<div class="metadata-quality-item"><b>'+escapeHtml(f.name)+'</b><span>'+escapeHtml(f.detail)+'</span></div>').join('');
    const status = $('metadataOptimizerStatus');
    if (status) status.textContent = 'Audit lokal selesai · '+keywords.length+' keyword unik · '+relevantCount+' memiliki kecocokan pada teks bukti · '+duplicates.length+' duplikat. Keyword tidak relevan tidak dihapus otomatis.';
    state.keywords = keywords;
    renderReview(scored);
    return {score,keywords,scored,duplicates};
  }
  function renderReview(scored) {
    const root = $('metadataKeywordReview');
    if (!root) return;
    if (!scored.length) { root.innerHTML='<span class="muted">Buat metadata untuk menampilkan daftar keyword.</span>'; return; }
    root.innerHTML = scored.map(({keyword,relevant}) => {
      const key = keyword.toLowerCase();
      const checked = state.approved.has(key) ? ' checked' : '';
      return '<label class="metadata-keyword-review-item" style="display:flex;align-items:center;gap:7px;padding:5px 2px;border-bottom:1px solid #ffffff18"><input type="checkbox" data-mq-key="'+escapeHtml(key)+'"'+checked+'><span style="flex:1">'+escapeHtml(keyword)+'</span><small style="color:'+(relevant?'#8be0b3':'#e9c47c')+'">'+(relevant?'Cocok teks':'Periksa')+'</small></label>';
    }).join('');
    root.querySelectorAll('input[data-mq-key]').forEach(input => input.addEventListener('change', () => {
      const key=input.dataset.mqKey;
      if(input.checked) state.approved.add(key); else state.approved.delete(key);
    }));
  }
  function optimize() {
    const result=audit();
    const ranked=[...result.scored].sort((a,b)=>Number(b.relevant)-Number(a.relevant)||b.score-a.score);
    const ordered=ranked.map(x=>x.keyword);
    $('metadataKeywords').value=ordered.join(', ');
    $('metadataKeywords').dispatchEvent(new Event('input',{bubbles:true}));
    audit();
    const status=$('metadataOptimizerStatus');
    if(status) status.textContent='Keyword diurutkan berdasarkan kecocokan kata pada bukti teks. Semua keyword dipertahankan; tinjau dan hapus yang tidak relevan secara manual.';
  }
  function applyApproved() {
    const approved=state.keywords.filter(k=>state.approved.has(k.toLowerCase()));
    if(!approved.length) { const s=$('metadataOptimizerStatus'); if(s)s.textContent='Belum ada keyword yang disetujui. Centang keyword terlebih dahulu.'; return; }
    $('metadataKeywords').value=approved.join(', ');
    $('metadataKeywords').dispatchEvent(new Event('input',{bubbles:true}));
    state.approved.clear();
    audit();
    const s=$('metadataOptimizerStatus'); if(s)s.textContent=approved.length+' keyword yang disetujui diterapkan ke metadata.';
  }
  function exportCsv() {
    const result=audit();
    const rows=[['Field','Value'],['Title',text('metadataTitle')],['Description',text('metadataDescription')],['Category',text('metadataCategory')],['Keywords',result.keywords.join(', ')],['Keyword count',String(result.keywords.length)],['Quality score',String(result.score)],['Evidence',text('metadataSubject')],['Platform',platformRules()]];
    const csv=rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const blob=new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='trozal-metadata-quality.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function bind() {
    ids.forEach(id => $(id)?.addEventListener('input', audit));
    ids.forEach(id => $(id)?.addEventListener('change', audit));
    $('optimizeMetadataBtn')?.addEventListener('click', optimize);
    $('exportMetadataCsvBtn')?.addEventListener('click', exportCsv);
    $('metadataApplyApprovedBtn')?.addEventListener('click', applyApproved);
    $('metadataResetReviewBtn')?.addEventListener('click', () => {state.approved.clear();audit();const s=$('metadataOptimizerStatus');if(s)s.textContent='Persetujuan keyword direset.';});
    $('generateMetadataBtn')?.addEventListener('click', () => setTimeout(audit,0));
    $('clearMetadataBtn')?.addEventListener('click', () => {state.approved.clear();setTimeout(audit,0);});
    const observer = new MutationObserver(() => audit());
    ['metadataEvidence'].forEach(id => {if($(id))observer.observe($(id),{childList:true,subtree:true,characterData:true});});
    audit();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
  window.trozalRefreshMetadataQuality = audit;
  console.info('[TROZAL METADATA QUALITY] Audit lokal aktif.');
})();
