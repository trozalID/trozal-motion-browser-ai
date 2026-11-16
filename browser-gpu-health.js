/* TROZAL MOTION · Browser GPU capability and render health monitor
   This module detects usable browser GPU paths; it never claims the existing
   Canvas2D frame renderer is GPU-backed unless the browser exposes that fact. */
(() => {
  'use strict';
  if (window.__trozalGpuMonitorReady) return;
  window.__trozalGpuMonitorReady = true;

  const state = { webgpu: false, webgl2: false, webgl: false, webcodecs: false, encoder: [], memory: null, renderer: 'Canvas 2D (existing frame renderer)' };
  const safeText = value => String(value || 'Tidak tersedia');
  async function detect() {
    try {
      if (navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        state.webgpu = !!adapter;
        if (adapter && adapter.features) state.webgpuFeatures = [...adapter.features].slice(0, 8);
      }
    } catch (_) { state.webgpu = false; }

    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
      const gl = gl2 || canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
      state.webgl2 = !!gl2;
      state.webgl = !!gl;
      if (gl) {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        if (info) state.gpuName = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    } catch (_) {}

    state.webcodecs = typeof VideoEncoder === 'function' && typeof VideoFrame === 'function';
    if (state.webcodecs) {
      for (const codec of ['avc1.42001E', 'avc1.640028', 'vp09.00.10.08', 'vp8']) {
        try {
          const result = await VideoEncoder.isConfigSupported({ codec, width: 1280, height: 720, bitrate: 4000000, framerate: 30 });
          if (result && result.supported) state.encoder.push(codec);
        } catch (_) {}
      }
    }
    state.memory = Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null;
    state.cores = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null;
    render();
    window.__trozalGpuCapabilities = Object.freeze({ ...state, webglRenderer: state.gpuName || null });
    window.dispatchEvent(new CustomEvent('trozal:gpu-capabilities', { detail: window.__trozalGpuCapabilities }));
    return window.__trozalGpuCapabilities;
  }

  function render() {
    let panel = document.getElementById('trozalGpuHealthPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'trozalGpuHealthPanel';
      panel.className = 'panel';
      panel.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9998;width:min(340px,calc(100vw - 28px));max-height:45vh;overflow:auto;box-shadow:0 12px 38px #0008;border-color:#46627d;';
      panel.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><strong style="color:#9fd0ff">GPU & PERFORMANCE HEALTH</strong><button type="button" id="trozalGpuHealthToggle" style="margin-left:auto;padding:3px 7px">Sembunyikan</button></div><div id="trozalGpuHealthBody" style="margin-top:8px;font-size:11px;line-height:1.65"></div>';
      document.body.appendChild(panel);
      panel.querySelector('#trozalGpuHealthToggle').addEventListener('click', () => {
        const body = panel.querySelector('#trozalGpuHealthBody');
        const hidden = body.hidden = !body.hidden;
        panel.querySelector('#trozalGpuHealthToggle').textContent = hidden ? 'Tampilkan' : 'Sembunyikan';
      });
    }
    const body = panel.querySelector('#trozalGpuHealthBody');
    const yes = v => v ? 'Tersedia' : 'Tidak tersedia';
    const enabled = window.__trozalGpuFrameAssistEnabled === true;
    const stats = window.TrozalGpuFramePipeline?.getStats?.();
    state.renderer = enabled && stats?.available
      ? 'GPU-assisted static image scaling + Canvas2D final composition'
      : 'Canvas2D (default / fallback)';
    body.textContent = [
      'WebGPU: ' + yes(state.webgpu),
      'WebGL 2: ' + yes(state.webgl2) + ' · WebGL: ' + yes(state.webgl),
      'WebCodecs: ' + yes(state.webcodecs),
      'Encoder terdeteksi: ' + (state.encoder.length ? state.encoder.join(', ') : 'Belum terverifikasi'),
      'GPU: ' + safeText(state.gpuName),
      'RAM browser: ' + (state.memory ? state.memory + ' GB (estimasi API)' : 'Tidak dilaporkan'),
      'CPU threads: ' + safeText(state.cores),
      'Renderer frame saat ini: ' + state.renderer,
      enabled && stats?.available ? 'GPU frame: ' + stats.draws + ' draw · ' + stats.uploads + ' upload tekstur · ' + stats.fallbacks + ' fallback' : 'GPU assist belum aktif. Aktifkan hanya untuk menguji layer gambar statis.',
      'Catatan: mask, teks, efek, HTML Motion dan komposisi akhir tetap memakai Canvas2D. ProRes/MP4 encoding tetap melalui FFmpeg.wasm / MediaRecorder.'
    ].join('\n');
    body.style.whiteSpace = 'pre-line';
    let assistButton = body.querySelector('#trozalGpuAssistToggle');
    if (!assistButton) {
      assistButton = document.createElement('button');
      assistButton.id = 'trozalGpuAssistToggle';
      assistButton.type = 'button';
      assistButton.style.cssText = 'display:block;margin-top:8px;width:100%;padding:7px;border:1px solid #5d8bb4;border-radius:6px;background:#1d3850;color:#e5f4ff;cursor:pointer;';
      assistButton.addEventListener('click', () => {
        window.__trozalGpuFrameAssistEnabled = window.__trozalGpuFrameAssistEnabled !== true;
        render();
      });
      body.appendChild(assistButton);
    }
    assistButton.textContent = enabled ? 'Matikan GPU Assist' : 'Aktifkan GPU Assist · Eksperimental';
    assistButton.disabled = !state.webgl2 || !window.TrozalGpuFramePipeline;
    if (!state.webgl2) assistButton.title = 'WebGL2 tidak tersedia; ekspor akan memakai Canvas2D.';
  }

  window.addEventListener('trozal:gpu-frame-assist-used', render);
  window.trozalRefreshGpuHealth = detect;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', detect, { once: true });
  else detect();
})();
