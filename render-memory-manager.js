/* TROZAL MOTION · Adaptive Render Memory Manager
   Conservative batch planning only. It does not read GPU VRAM, change export quality,
   or claim to measure total browser memory. */
(() => {
  'use strict';
  if (window.TrozalRenderMemoryManager) return;
  const state = { allocationFailures: 0, lastPlan: null };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mib = 1024 * 1024;

  function getPlan(options = {}) {
    const width = Math.max(1, Math.floor(Number(options.width) || 1920));
    const height = Math.max(1, Math.floor(Number(options.height) || 1080));
    const requestedBatch = clamp(Math.floor(Number(options.requestedBatch) || 2), 1, 4);
    const frameBytes = width * height * 4;
    const reportedRam = Number(options.deviceMemory ?? navigator.deviceMemory) || 0;
    const browserBudget = reportedRam > 0 ? reportedRam * 1024 ** 3 * 0.25 : 0;
    const heap = options.memory || (performance && performance.memory) || null;
    const heapRatio = heap && Number(heap.jsHeapSizeLimit) > 0
      ? Number(heap.usedJSHeapSize) / Number(heap.jsHeapSizeLimit) : null;
    let effectiveBatch = requestedBatch;
    let reason = 'Mengikuti profil Canvas Render Speed';
    if (browserBudget > 0) {
      while (effectiveBatch > 1 && frameBytes * (effectiveBatch + 2) > browserBudget * 0.6) effectiveBatch--;
      if (effectiveBatch < requestedBatch) reason = 'Batch diturunkan berdasarkan estimasi RAM browser';
    }
    if (heapRatio !== null && Number.isFinite(heapRatio)) {
      if (heapRatio >= 0.92) { effectiveBatch = 1; reason = 'Tekanan JavaScript heap tinggi'; }
      else if (heapRatio >= 0.8) {
        effectiveBatch = Math.max(1, effectiveBatch - 1);
        reason = 'JavaScript heap mendekati batas';
      }
    }
    if (state.allocationFailures > 0) {
      effectiveBatch = Math.max(1, effectiveBatch - Math.min(2, state.allocationFailures));
      reason = 'Batch dikurangi setelah kegagalan alokasi render sebelumnya';
    }
    const plan = Object.freeze({
      width, height, requestedBatch, effectiveBatch,
      frameMiB: frameBytes / mib,
      estimatedWorkingMiB: frameBytes * (effectiveBatch + 2) / mib,
      reportedRamGiB: reportedRam || null,
      heapRatio: heapRatio === null || !Number.isFinite(heapRatio) ? null : heapRatio,
      allocationFailures: state.allocationFailures,
      reason
    });
    state.lastPlan = plan;
    return plan;
  }

  function recordAllocationFailure(message = '') {
    const text = String(message);
    if (!/(out.?of.?memory|memory allocation|allocation failed|quota exceeded|NS_ERROR_OUT_OF_MEMORY)/i.test(text)) return false;
    state.allocationFailures = Math.min(3, state.allocationFailures + 1);
    return true;
  }
  function reset() { state.allocationFailures = 0; state.lastPlan = null; }
  function getStatus() { return Object.freeze({ allocationFailures: state.allocationFailures, lastPlan: state.lastPlan }); }

  function mount() {
    if (document.getElementById('trozalMemoryManagerFab')) return;
    const style = document.createElement('style');
    style.textContent = '#trozalMemoryManagerFab{position:fixed;left:16px;bottom:62px;z-index:99989;background:#172033;color:#e5e7eb;border:1px solid #64748b;border-radius:10px;padding:9px 12px;font:600 11px system-ui;cursor:pointer;box-shadow:0 5px 20px #0005}#trozalMemoryManagerPanel{position:fixed;left:16px;bottom:108px;z-index:99990;width:min(340px,calc(100vw - 32px));background:#111827;color:#e5e7eb;border:1px solid #475569;border-radius:12px;padding:13px;font:12px/1.5 system-ui;box-shadow:0 12px 36px #0008;display:none}#trozalMemoryManagerPanel button{background:#334155;color:white;border:1px solid #64748b;border-radius:7px;padding:6px 9px;cursor:pointer}#trozalMemoryManagerPanel .muted{color:#a5b4c5;font-size:11px}';
    document.head.appendChild(style);
    const fab = document.createElement('button');
    fab.id = 'trozalMemoryManagerFab'; fab.type = 'button'; fab.textContent = '◈ Render Memory';
    const panel = document.createElement('section');
    panel.id = 'trozalMemoryManagerPanel';
    panel.setAttribute('aria-label', 'Adaptive Render Memory Manager');
    panel.innerHTML = '<strong>Adaptive Render Memory Manager</strong><p class="muted">Mengatur batch frame secara konservatif berdasarkan estimasi dimensi render dan sinyal heap yang tersedia. Tidak membaca VRAM GPU dan tidak menurunkan kualitas ekspor.</p><div id="trozalMemoryManagerResult">Belum ada rencana render.</div><div style="display:flex;gap:7px;margin-top:9px"><button id="trozalMemoryManagerRefresh" type="button">Perbarui</button><button id="trozalMemoryManagerReset" type="button">Reset adaptasi</button><button id="trozalMemoryManagerClose" type="button">Tutup</button></div>';
    document.body.append(fab, panel);
    const result = panel.querySelector('#trozalMemoryManagerResult');
    function refresh() {
      try {
        const [width, height] = String(document.querySelector('#resolution')?.value || '1920x1080').split(/[x×]/).map(Number);
        const mode = document.querySelector('#canvasRenderSpeed')?.value || 'balanced';
        const requestedBatch = mode === 'fast' ? 4 : mode === 'stable' ? 1 : 2;
        const plan = getPlan({ width, height, requestedBatch });
        result.textContent = 'Batch efektif: ' + plan.effectiveBatch + '/' + plan.requestedBatch +
          ' · ' + plan.width + '×' + plan.height + ' · estimasi buffer ' +
          plan.estimatedWorkingMiB.toFixed(1) + ' MiB. ' + plan.reason +
          (plan.heapRatio === null ? ' · Heap tidak dilaporkan browser.' : ' · JS heap terpakai ' + Math.round(plan.heapRatio * 100) + '%.');
      } catch (error) { result.textContent = 'Estimasi belum tersedia: ' + (error.message || error); }
    }
    fab.addEventListener('click', () => { panel.style.display = panel.style.display === 'block' ? 'none' : 'block'; refresh(); });
    panel.querySelector('#trozalMemoryManagerRefresh').addEventListener('click', refresh);
    panel.querySelector('#trozalMemoryManagerReset').addEventListener('click', () => { reset(); refresh(); });
    panel.querySelector('#trozalMemoryManagerClose').addEventListener('click', () => { panel.style.display = 'none'; });
  }

  window.TrozalRenderMemoryManager = Object.freeze({ getPlan, recordAllocationFailure, reset, getStatus });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
