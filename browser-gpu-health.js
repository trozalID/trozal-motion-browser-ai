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
      panel.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9998;width:min(340px,calc(100vw - 28px));max-height:45vh;overflow:auto;box-shadow:0 12px 38px #0008;border:1px solid rgba(105,177,220,.55);border-radius:12px;background:rgba(11,27,39,.72);backdrop-filter:blur(14px) saturate(130%);-webkit-backdrop-filter:blur(14px) saturate(130%);';
      panel.innerHTML = '<div class="trozal-gpu-drag-head" style="display:flex;align-items:center;gap:8px;padding:9px 10px"><strong style="color:#9fd0ff">GPU & PERFORMANCE HEALTH · GESER</strong><button type="button" id="trozalGpuHealthToggle" style="margin-left:auto;padding:3px 7px">Sembunyikan</button></div><div id="trozalGpuHealthBody" style="margin:0 10px 10px;font-size:11px;line-height:1.65"></div>';
      document.body.appendChild(panel);
      // Movable glass panel: drag only its title bar, never its controls.
      const dragHead=panel.querySelector('.trozal-gpu-drag-head');let dragState=null;
      dragHead.addEventListener('pointerdown',e=>{
        if(e.button!==0||e.target.closest('button'))return;
        const rect=panel.getBoundingClientRect();dragState={dx:e.clientX-rect.left,dy:e.clientY-rect.top};
        panel.classList.add('is-dragging');dragHead.setPointerCapture?.(e.pointerId);e.preventDefault();
      });
      dragHead.addEventListener('pointermove',e=>{
        if(!dragState)return;
        const left=Math.max(0,Math.min(window.innerWidth-panel.offsetWidth,e.clientX-dragState.dx));
        const top=Math.max(0,Math.min(window.innerHeight-panel.offsetHeight,e.clientY-dragState.dy));
        panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';panel.style.bottom='auto';
      });
      const stopDrag=()=>{dragState=null;panel.classList.remove('is-dragging');};
      dragHead.addEventListener('pointerup',stopDrag);dragHead.addEventListener('pointercancel',stopDrag);
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

    const benchmarkButton=document.createElement('button');
    benchmarkButton.id='trozalGpuBenchmarkBtn';
    benchmarkButton.type='button';
    benchmarkButton.textContent='Uji benchmark 1080p + 4K';
    benchmarkButton.style.cssText='display:block;margin-top:6px;width:100%;padding:7px;border:1px solid #687b91;border-radius:6px;background:#263342;color:#eef6ff;cursor:pointer;';
    benchmarkButton.disabled=!state.webgl2 || !window.TrozalGpuFramePipeline?.benchmark;
    benchmarkButton.addEventListener('click',async()=>{
      benchmarkButton.disabled=true;benchmarkButton.textContent='Benchmark berjalan…';
      const status=document.getElementById('trozalGpuBenchmarkResult');
      if(status)status.textContent='Mengukur Canvas2D dan GPU Assist. Tunggu hingga selesai.';
      try{
        const report=await window.TrozalGpuFramePipeline.benchmark();
        const lines=report.results.map(item=>item.resolution+': Canvas2D '+item.canvas2dMedianMs+' ms · GPU Assist '+item.gpuAssistMedianMs+' ms · '+(item.ratio<1?'GPU lebih cepat':'Canvas2D lebih cepat')+' ('+item.ratio+'×)');
        const current=document.getElementById('trozalGpuBenchmarkResult');
        if(current)current.textContent=lines.join('\n')+'\nCatatan: uji sintetis scaling gambar statis, bukan durasi ekspor video penuh.';
        window.__trozalGpuBenchmarkLastResult=report;
      }catch(error){
        const current=document.getElementById('trozalGpuBenchmarkResult');
        if(current)current.textContent='Benchmark tidak selesai: '+(error?.message||error);
      }finally{
        const currentButton=document.getElementById('trozalGpuBenchmarkBtn');
        if(currentButton){currentButton.disabled=false;currentButton.textContent='Ulangi benchmark 1080p + 4K';}
      }
    });
    body.appendChild(benchmarkButton);
    const benchmarkResult=document.createElement('div');
    benchmarkResult.id='trozalGpuBenchmarkResult';
    benchmarkResult.style.cssText='margin-top:6px;font-size:10px;white-space:pre-line;color:#c7d7e7;';
    benchmarkResult.textContent='Benchmark lokal belum dijalankan.';
    body.appendChild(benchmarkResult);
    // Browser-only UI: Gemini Cloud stays primary; no Ollama or Bridge dependency.
    if (!body.querySelector('#trozalCanvasControlUi')) {
      const canvasUi=document.createElement('section');
      canvasUi.id='trozalCanvasControlUi';
      canvasUi.style.cssText='margin-top:10px;padding:9px;border:1px solid #397da2;border-radius:9px;background:linear-gradient(145deg,#12344a,#0b2232);color:#e6f5ff;';
      canvasUi.innerHTML='<strong style="display:block;color:#bceaff;font-size:11px;letter-spacing:.05em">◈ CANVAS RENDER CONTROL</strong><div id="trozalCanvasUiMode" style="margin-top:7px;font-weight:700">Memeriksa renderer…</div><div id="trozalCanvasUiReason" style="margin-top:4px;font-size:10px;color:#b9d8e9">Hybrid Canvas otomatis · Balanced</div><div id="trozalCanvasUiBenchmark" style="margin-top:6px;font-size:10px;white-space:pre-line;color:#d5e9f4">Benchmark belum dijalankan.</div><button type="button" id="trozalCanvasUiRefresh" style="display:block;width:100%;margin-top:7px;padding:6px">↻ Perbarui status perangkat</button><button type="button" id="trozalCanvasUiSpeed" style="display:block;width:100%;margin-top:5px;padding:6px">⚡ Buka kecepatan render</button><p style="font-size:9px;color:#a9c9dc;margin:6px 0 0">GPU Assist hanya dipakai bila benchmark memenuhi ambang peningkatan; Canvas2D tetap fallback aman. Kontrol ini tidak mengubah resolusi/FPS.</p>';
      body.appendChild(canvasUi);
      const ipUi=document.createElement('section');
      ipUi.id='trozalIpGuardrailUi';
      ipUi.style.cssText='margin-top:8px;padding:9px;border:1px solid #8061ae;border-radius:9px;background:linear-gradient(145deg,#30234b,#1a1530);color:#f0eaff;';
      ipUi.innerHTML='<strong style="display:block;color:#e4d2ff;font-size:11px;letter-spacing:.04em">◇ ORIGINAL CONTENT & IP GUARDRAILS</strong><div style="margin-top:7px;padding:7px;border:1px solid #7153a2;border-radius:7px;background:#1c1530;color:#d9c8ff;font-size:10px;font-weight:700">● PERLINDUNGAN PROMPT AKTIF · OTOMATIS</div><ul style="padding-left:17px;font-size:10px;line-height:1.5;color:#e0d6f2"><li>Hindari karakter, semesta fiksi, karya, dan desain pihak ketiga yang dilindungi.</li><li>Jangan tampilkan logo, merek dagang, watermark, tanda tangan, atau identitas perusahaan.</li><li>Gunakan subjek fiktif, objek generik tanpa merek, dan komposisi orisinal.</li><li>Jangan menyalin lirik, kutipan, screenshot, atau materi visual berhak cipta.</li></ul><p style="font-size:9px;color:#bdaed5;margin:5px 0 0">Pengaman diterapkan pada instruksi Gemini Cloud dan prompt adegan. Ini bukan jaminan hukum atau filter sempurna pada setiap keluaran.</p>';
      body.appendChild(ipUi);
      body.querySelector('#trozalCanvasUiRefresh').addEventListener('click',async()=>{
        const button=body.querySelector('#trozalCanvasUiRefresh');button.disabled=true;
        try{await detect();}finally{button.disabled=false;}
      });
      body.querySelector('#trozalCanvasUiSpeed').addEventListener('click',()=>{
        const speed=document.getElementById('renderSpeedMode')||document.querySelector('[name="renderSpeedMode"]');
        if(speed){speed.scrollIntoView({behavior:'smooth',block:'center'});speed.focus?.({preventScroll:true});}
        else {const render=document.querySelector('#renderSettingsPanel,#renderPanel,[data-panel*="render"]');render?.scrollIntoView({behavior:'smooth',block:'center'});}
      });
    }
    const hybrid=window.TrozalHybridCanvasRenderer?.getStatus?.()||window.__trozalHybridCanvasStatus||{};
    const mode=body.querySelector('#trozalCanvasUiMode'),reason=body.querySelector('#trozalCanvasUiReason'),bench=body.querySelector('#trozalCanvasUiBenchmark');
    if(mode)mode.textContent=hybrid.ready?(hybrid.strategy==='gpu-assist'?'GPU Assist · benchmark menang':'Canvas2D · fallback aktif'):'Hybrid Canvas · otomatis / menunggu benchmark';
    if(reason)reason.textContent=hybrid.reason||'Strategi Balanced; keputusan berdasarkan benchmark lokal.';
    if(bench){const rows=window.__trozalGpuBenchmarkLastResult?.results||hybrid.benchmark?.results||[];bench.textContent=rows.length?rows.map(item=>item.resolution+': Canvas2D '+item.canvas2dMedianMs+' ms · GPU Assist '+item.gpuAssistMedianMs+' ms · '+item.winner).join('\\n'):'Hasil benchmark 720p/1080p tampil setelah renderer mengukurnya.';}
  }

  window.addEventListener('trozal:gpu-frame-assist-used', render);
  window.trozalRefreshGpuHealth = detect;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', detect, { once: true });
  else detect();
})();
