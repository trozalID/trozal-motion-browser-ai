/* TROZAL MOTION · Preview Proxy
   Reduces only the backing resolution of the decorative preview-effects canvas.
   The DOM/SVG stage and every export path remain untouched. */
(() => {
  'use strict';
  if (window.TrozalPreviewProxy) return;
  const select = document.getElementById('previewProxyScale');
  const allowed = new Set(['1', '0.5', '0.25']);
  let scale = '0.5';
  try {
    const saved = window.localStorage?.getItem('trozal-preview-proxy-scale');
    if (allowed.has(saved)) scale = saved;
  } catch (_) {}
  if (select) {
    if (allowed.has(select.value)) scale = select.value;
    select.value = scale;
    select.addEventListener('change', () => {
      const next = String(select.value);
      if (!allowed.has(next)) return;
      scale = next;
      try { window.localStorage?.setItem('trozal-preview-proxy-scale', scale); } catch (_) {}
      window.dispatchEvent(new CustomEvent('trozal:preview-proxy-change', { detail: { scale: Number(scale) } }));
    });
  }
  window.TrozalPreviewProxy = Object.freeze({
    getScale: () => Number(scale),
    getStatus: () => Object.freeze({ scale: Number(scale), target: 'preview-effects-canvas-only' })
  });
})();
