/* TROZAL MOTION · CANVAS 3D MULTI PREVIEW GALLERY */
(() => {
  'use strict';
  if (window.__TROZAL_CANVAS3D_MULTI_PREVIEW__) return;
  window.__TROZAL_CANVAS3D_MULTI_PREVIEW__ = true;
  const $ = id => document.getElementById(id);
  let concepts = [];
  function getScene(item) { return item && (item.project || item.scene) || null; }
  function announce(message, bad) {
    const node = $('t3dMultiPreviewStatus');
    if (node) { node.textContent = message; node.dataset.error = bad ? '1' : '0'; }
  }
  function renderCards() {
    const host = $('t3dMultiPreviewCards'); if (!host) return;
    host.replaceChildren();
    if (!concepts.length) {
      const empty = document.createElement('div'); empty.className = 't3d-preview-empty';
      const title = document.createElement('strong'); title.textContent = 'Belum ada preview konsep';
      const copy = document.createElement('p');
      copy.textContent = 'Buka AI Theme Studio, pilih tema, lalu tekan Generate 3 Concepts. Hasilnya muncul di galeri tanpa mengubah Scene aktif.';
      const generate = document.createElement('button'); generate.type = 'button'; generate.textContent = '✦ Buka Generate 3 Concepts';
      generate.addEventListener('click', () => {
        const button = $('trozal3DAIGenerate') || $('trozal3DAIThemeGenerate');
        if (button) button.click(); else announce('AI Theme Studio belum siap.', true);
      });
      empty.append(title, copy, generate); host.appendChild(empty); return;
    }
    concepts.forEach((item, index) => {
      const card = document.createElement('article'); card.className = 't3d-preview-card'; card.dataset.concept = String(index);
      const image = document.createElement('canvas'); image.className = 't3d-preview-thumb'; image.width = 640; image.height = 280;
      const title = document.createElement('h4'); title.textContent = String(item.title || ('Concept ' + (index + 1)));
      const pitch = document.createElement('p'); pitch.textContent = String(item.pitch || 'Original Canvas 3D concept');
      const scene = getScene(item), meta = document.createElement('small');
      meta.textContent = scene && Array.isArray(scene.objects) ? scene.objects.length + ' objek 3D · Scene v2' : 'Preview scene belum tersedia';
      const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'primary';
      apply.dataset.previewApply = String(index); apply.textContent = '▶ Terapkan ke Canvas 3D';
      apply.disabled = !scene || !Array.isArray(scene.objects) || !window.TROZAL_CANVAS_3D;
      const renderer = window.TROZAL_CANVAS3D_PREVIEW_RENDERER;
      const rendered = renderer && scene ? renderer.draw(image, scene, { label: 'Preview ' + title.textContent }) : false;
      if (!rendered) image.dataset.previewReady = 'false';
      card.append(image, title, pitch, meta, apply); host.appendChild(card);
    });
  }
  function sync() {
    const source = window.TROZAL_CANVAS3D_CONCEPTS;
    concepts = Array.isArray(source) ? source.slice(0, 3) : [];
    renderCards();
    if (concepts.length) announce(concepts.length + ' konsep tersedia · Scene aktif tidak berubah sampai tombol Terapkan ditekan.');
  }
  function mount() {
    const header = $('trozal3DHeader'), overlay = $('trozalCanvas3DOverlay');
    if (!header || !overlay || $('t3dMultiPreviewOpen')) return;
    const open = document.createElement('button'); open.id = 't3dMultiPreviewOpen'; open.type = 'button';
    open.textContent = '▦ Multi Preview'; open.title = 'Buka galeri preview beberapa konsep 3D';
    const close = $('trozal3DClose'); if (close) header.insertBefore(open, close); else header.appendChild(open);
    const panel = document.createElement('section'); panel.id = 't3dMultiPreviewPanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'CANVAS 3D Multi Preview Gallery');
    panel.innerHTML = '<header class="t3d-preview-head"><div><strong>▦ CANVAS 3D · MULTI PREVIEW GALLERY</strong><small>Bandingkan konsep sebelum menerapkannya ke Scene aktif</small></div><div><button id="t3dMultiPreviewRefresh" type="button">↻ Refresh</button><button id="t3dMultiPreviewClose" type="button">Tutup ✕</button></div></header><div id="t3dMultiPreviewCards" class="t3d-preview-grid"></div><div id="t3dMultiPreviewStatus" role="status">Generate konsep dari AI Theme Studio untuk mengisi galeri.</div>';
    overlay.appendChild(panel);
    const style = document.createElement('style'); style.id = 't3dMultiPreviewStyles';
    style.textContent = '#t3dMultiPreviewPanel{position:absolute;z-index:190;inset:58px 2% 2%;display:flex;flex-direction:column;gap:12px;padding:14px;border:1px solid #4b9eae;border-radius:13px;background:linear-gradient(145deg,#0b1828,#12283a 65%,#111b30);color:#e5f7ff;box-shadow:0 22px 75px #000d;overflow:auto;font:12px/1.45 Inter,Segoe UI,Arial,sans-serif}#t3dMultiPreviewPanel[hidden]{display:none!important}#t3dMultiPreviewPanel *{box-sizing:border-box}#t3dMultiPreviewPanel .t3d-preview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #315469;padding:0 0 10px}#t3dMultiPreviewPanel .t3d-preview-head strong,#t3dMultiPreviewPanel .t3d-preview-head small{display:block}#t3dMultiPreviewPanel .t3d-preview-head strong{color:#9ce7ed;letter-spacing:.06em}#t3dMultiPreviewPanel .t3d-preview-head small{color:#91b4c6;font-size:10px;margin-top:3px}#t3dMultiPreviewPanel button{padding:8px 11px;border:1px solid #3b7183;border-radius:7px;background:#15394a;color:#e7fbff;cursor:pointer;font:inherit}#t3dMultiPreviewPanel button.primary{background:linear-gradient(135deg,#147b86,#365e9c);border-color:#62c6d5;font-weight:700}#t3dMultiPreviewPanel button:disabled{opacity:.45;cursor:not-allowed}#t3dMultiPreviewPanel .t3d-preview-head>div:last-child{display:flex;gap:7px;flex-wrap:wrap}#t3dMultiPreviewCards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,285px),1fr));gap:12px;align-content:start;overflow:auto;padding:2px}#t3dMultiPreviewCards .t3d-preview-card{min-width:0;padding:9px;border:1px solid #315469;border-radius:10px;background:linear-gradient(150deg,#14283c,#0c1928);box-shadow:0 6px 20px #0005}#t3dMultiPreviewCards .t3d-preview-thumb{display:block;width:100%;height:170px;object-fit:contain;border-radius:7px;background:#0b1421}#t3dMultiPreviewCards h4{margin:9px 0 4px;color:#d7f1ff;font-size:13px}#t3dMultiPreviewCards p{min-height:34px;margin:0 0 7px;color:#abc8d8;font-size:11px}#t3dMultiPreviewCards small{display:block;margin:0 0 9px;color:#88b9c8;font-size:10px}#t3dMultiPreviewCards .t3d-preview-card button{width:100%}#t3dMultiPreviewCards .t3d-preview-empty{grid-column:1/-1;display:grid;gap:8px;justify-items:start;padding:25px;border:1px dashed #426b7a;border-radius:10px;color:#c8e6f2}#t3dMultiPreviewStatus{padding:9px;border:1px solid #315469;border-radius:7px;background:#081522;color:#b8e5eb}#t3dMultiPreviewStatus[data-error="1"]{color:#ffb8b8;border-color:#a64e5b}@media(max-width:650px){#t3dMultiPreviewPanel{inset:48px 5px 5px;padding:8px}#t3dMultiPreviewPanel .t3d-preview-head{align-items:flex-start;flex-direction:column}#t3dMultiPreviewCards{grid-template-columns:1fr}#t3dMultiPreviewCards .t3d-preview-thumb{height:155px}}';
    document.head.appendChild(style);
    open.addEventListener('click', () => { sync(); panel.hidden = false; });
    $('t3dMultiPreviewRefresh').addEventListener('click', sync);
    $('t3dMultiPreviewClose').addEventListener('click', () => { panel.hidden = true; });
    $('t3dMultiPreviewCards').addEventListener('click', event => {
      const button = event.target.closest('[data-preview-apply]'); if (!button) return;
      const item = concepts[Number(button.dataset.previewApply)], scene = getScene(item);
      if (!scene || !window.TROZAL_CANVAS_3D) { announce('Scene belum siap untuk diterapkan.', true); return; }
      try {
        window.TROZAL_CANVAS_3D.applyProject(JSON.parse(JSON.stringify(scene)));
        panel.hidden = true; announce('Konsep ' + String(item.title || '') + ' diterapkan ke Canvas 3D.');
      } catch (error) { announce('Apply gagal: ' + (error && error.message || String(error)), true); }
    });
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) panel.hidden = true; }, true);
    sync();
  }
  window.addEventListener('trozal:canvas3d-concepts-change', sync);
  const observer = new MutationObserver(mount); observer.observe(document.documentElement, { childList: true, subtree: true }); mount();
})();
