/* TROZAL Render Sync & Performance Advisor — isolated bootstrap */
(() => {
  'use strict';
  if (window.__trozalRenderSyncAdvisorInitialized) return;
  window.__trozalRenderSyncAdvisorInitialized = true;

  const $ = id => document.getElementById(id);
  const required = [
    'renderSyncFps','renderSyncInterval','renderSyncCost','renderSyncDropped',
    'renderSyncQueue','renderSyncDevice','renderSyncStatus','renderSyncRecommendations',
    'renderSyncReset','renderSyncRunPreflight'
  ];
  const missing = required.filter(id => !$(id));
  if (missing.length) {
    console.error('[TROZAL Render Sync] Panel belum lengkap:', missing);
    window.__trozalRenderSyncAdvisorInitialized = false;
    return;
  }

  const m = { frames: [], costs: [], lastFrame: 0, lastReport: 0, dropped: 0, longTasks: 0, observer: null, raf: 0, rafTicks: 0 };
  const avg = a => a.length ? a.reduce((x,y) => x+y, 0) / a.length : 0;
  const push = (a,v,max=90) => { a.push(v); if (a.length > max) a.shift(); };

  $('renderSyncDevice').textContent =
    (navigator.hardwareConcurrency || '?') + ' cores · ' +
    (navigator.deviceMemory ? navigator.deviceMemory + ' GB RAM' : 'RAM tidak dilaporkan');

  if ('PerformanceObserver' in window) {
    try {
      m.observer = new PerformanceObserver(list => { m.longTasks += list.getEntries().length; });
      m.observer.observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  }

  const wrapRenderAt = () => {
    if (window.__trozalRenderAtAdvisorWrapped || typeof window.renderAt !== 'function') return;
    const original = window.renderAt;
    window.renderAt = function(...args) {
      const start = performance.now();
      try { return original.apply(this, args); }
      finally { push(m.costs, performance.now() - start); }
    };
    window.__trozalRenderAtAdvisorWrapped = true;
  };

  const report = now => {
    if (now - m.lastReport < 900) return;
    m.lastReport = now;
    const cadence = avg(m.frames);
    const costAvg = avg(m.costs);
    const costMax = m.costs.length ? Math.max(...m.costs) : 0;
    $('renderSyncFps').textContent = m.frames.length ? (1000 / cadence).toFixed(1) + ' FPS' : '0.0 FPS · menunggu frame';
    $('renderSyncInterval').textContent = m.frames.length ? cadence.toFixed(1) + ' ms' : '—';
    $('renderSyncCost').textContent = m.costs.length ? costAvg.toFixed(2) + ' / ' + costMax.toFixed(2) + ' ms' : 'Menunggu renderAt';
    $('renderSyncDropped').textContent = m.dropped + ' (>50 ms)';
    const queue = typeof window.trozalRenderTaskQueue !== 'undefined' ? window.trozalRenderTaskQueue : null;
    $('renderSyncQueue').textContent = queue ? String(queue.length + (window.trozalRenderTaskRunning ? 1 : 0)) : 'Tidak tersedia';

    const target = Math.max(1, Number($('fps')?.value) || 30);
    const notes = [];
    if (cadence > 50) notes.push('Cadence tampilan rendah: kurangi tab berat, ekstensi, filter, atau jumlah layer.');
    else if (cadence > 0 && cadence > 1000 / target * 1.5) notes.push('Cadence preview di bawah target FPS proyek. FPS preview tidak sama dengan FPS ekspor.');
    if (costMax > 16.7) notes.push('renderAt pernah melebihi 16,7 ms. Periksa SVG kompleks, filter, dan jumlah layer.');
    if (m.longTasks) notes.push('Browser mencatat ' + m.longTasks + ' long task (>50 ms).');
    if (!notes.length) notes.push('Belum terdeteksi bottleneck besar. Jalankan preview dan render singkat untuk mengukur beban aktual.');
    $('renderSyncStatus').textContent = 'Sinkronisasi: ' + (cadence && cadence < 35 ? 'Stabil' : cadence && cadence < 55 ? 'Perlu dipantau' : 'Cadence sedang diukur') + ' · Target ' + target + ' FPS · Long task ' + m.longTasks;
    $('renderSyncRecommendations').textContent = notes.join('\n');
    window.__trozalRenderSyncDiagnostics = { rafTicks: m.rafTicks, samples: m.frames.length, lastReport: m.lastReport, visibility: document.visibilityState };
  };

  const tick = now => {
    m.rafTicks++;
    if (m.lastFrame) {
      const delta = now - m.lastFrame;
      if (delta > 0 && delta < 1000) {
        push(m.frames, delta);
        if (delta > 50) m.dropped++;
      }
    }
    m.lastFrame = now;
    // Publish a heartbeat every animation frame so stalled RAF is diagnosable,
    // even when the slower UI report cadence has not fired yet.
    window.__trozalRenderSyncDiagnostics = {
      rafTicks: m.rafTicks,
      samples: m.frames.length,
      lastFrame: now,
      lastReport: m.lastReport,
      visibility: document.visibilityState
    };
    wrapRenderAt();
    report(now);
    m.raf = requestAnimationFrame(tick);
  };

  const reset = () => {
    m.frames = []; m.costs = []; m.lastFrame = 0; m.lastReport = 0; m.dropped = 0; m.longTasks = 0; m.rafTicks = 0;
    $('renderSyncStatus').textContent = 'Pengukuran direset. Kumpulkan sampel baru…';
  };
  $('renderSyncReset').addEventListener('click', reset);
  $('renderSyncRunPreflight').addEventListener('click', () => {
    if (typeof window.trozalRunRenderPreflight === 'function') window.trozalRunRenderPreflight();
    else $('renderSyncRecommendations').textContent = 'Preflight belum tersedia pada build ini.';
  });

  window.addEventListener('pagehide', () => {
    if (m.raf) cancelAnimationFrame(m.raf);
    m.observer?.disconnect();
  }, { once: true });
  m.raf = requestAnimationFrame(tick);
  console.info('[TROZAL Render Sync] Advisor aktif.');
})();
