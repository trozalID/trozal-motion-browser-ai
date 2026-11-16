/* TROZAL MOTION · Hybrid Canvas Renderer
   Balanced policy: benchmark the static-image GPU assist once per page session.
   Use WebGL2 only when it is measurably faster; otherwise keep the proven Canvas2D path.
   Imported HTML/CSS scenes continue through the existing DOM capture fallback. */
(() => {
  'use strict';
  if (window.TrozalHybridCanvasRenderer) return;
  const state = {
    mode: 'hybrid',
    strategy: 'canvas2d',
    ready: false,
    benchmark: null,
    reason: 'Benchmark belum dijalankan',
    startedAt: 0
  };
  let preparePromise = null;

  function publish() {
    window.__trozalHybridCanvasStatus = Object.freeze({
      mode: state.mode,
      strategy: state.strategy,
      ready: state.ready,
      reason: state.reason,
      benchmark: state.benchmark
    });
    const node = document.getElementById('trozalHybridCanvasStatus');
    if (node) {
      const report = state.benchmark?.results?.map(item =>
        item.resolution + ': Canvas2D ' + item.canvas2dMedianMs + ' ms · GPU ' +
        item.gpuAssistMedianMs + ' ms'
      ).join(' | ');
      node.textContent = 'Hybrid Canvas: ' + (state.strategy === 'gpu-assist'
        ? 'GPU Assist terpilih berdasarkan benchmark'
        : 'Canvas2D aktif · fallback kompatibel') +
        ' — ' + state.reason + (report ? ' · ' + report : '');
    }
    window.dispatchEvent(new CustomEvent('trozal:hybrid-canvas-status', {
      detail: window.__trozalHybridCanvasStatus
    }));
  }

  async function benchmark() {
    const pipeline = window.TrozalGpuFramePipeline;
    if (!pipeline || typeof pipeline.benchmark !== 'function') {
      state.strategy = 'canvas2d';
      state.reason = 'WebGL2 pipeline tidak tersedia';
      state.ready = true;
      publish();
      return window.__trozalHybridCanvasStatus;
    }
    try {
      const report = await pipeline.benchmark({
        sizes: [
          { label: '720p', width: 1280, height: 720 },
          { label: '1080p', width: 1920, height: 1080 }
        ],
        iterations: 3
      });
      state.benchmark = report;
      const results = report.results || [];
      const gpuWins = results.length === 2 && results.every(item =>
        Number.isFinite(item.ratio) && item.ratio <= 0.85
      );
      state.strategy = gpuWins ? 'gpu-assist' : 'canvas2d';
      state.reason = gpuWins
        ? 'GPU Assist setidaknya 15% lebih cepat pada seluruh ukuran uji'
        : 'Canvas2D dipilih karena GPU Assist tidak unggul konsisten pada benchmark';
      window.__trozalGpuFrameAssistEnabled = gpuWins;
      state.ready = true;
    } catch (error) {
      window.__trozalGpuFrameAssistEnabled = false;
      state.strategy = 'canvas2d';
      state.reason = 'Benchmark GPU gagal; fallback aman: ' + (error?.message || String(error));
      state.ready = true;
    }
    publish();
    return window.__trozalHybridCanvasStatus;
  }

  function prepare() {
    if (!preparePromise) {
      state.startedAt = performance.now();
      const node = document.getElementById('trozalHybridCanvasStatus');
      if (node) node.textContent = 'Hybrid Canvas: mengukur Canvas2D vs GPU Assist…';
      preparePromise = benchmark();
    }
    return preparePromise;
  }

  function getStatus() {
    return window.__trozalHybridCanvasStatus || {
      mode: state.mode, strategy: state.strategy, ready: state.ready, reason: state.reason
    };
  }

  window.TrozalHybridCanvasRenderer = Object.freeze({
    prepare,
    benchmark,
    getStatus,
    mode: 'hybrid'
  });
})();
