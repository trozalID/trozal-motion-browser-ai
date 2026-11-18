/* TROZAL MOTION · Smart Render Preflight (advisory only; export settings are never changed). */
(() => {
  'use strict';
  if (window.TrozalSmartRenderPreflight) return;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const numberFrom = (selectors, fallback) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const raw = String(el.value || el.textContent || '').replace(/,/g, '');
      const match = raw.match(/\d+(?:\.\d+)?/);
      if (match) { const value = Number(match[0]); if (Number.isFinite(value) && value > 0) return value; }
    }
    return fallback;
  };
  function estimate(options = {}) {
    const resolutionValue = String(document.querySelector('#resolution')?.value || '');
    const resolutionMatch = resolutionValue.match(/(\\d{2,5})\\s*[x×]\\s*(\\d{2,5})/i);
    const width = Math.round(Number(options.width) || (resolutionMatch ? Number(resolutionMatch[1]) : numberFrom(['#renderWidth','#outputWidth','#width','#resolutionWidth'], 1920)));
    const height = Math.round(Number(options.height) || (resolutionMatch ? Number(resolutionMatch[2]) : numberFrom(['#renderHeight','#outputHeight','#height','#resolutionHeight'], 1080)));
    const fps = Number(options.fps) || numberFrom(['#fps','#renderFps','#outputFps'], 30);
    const duration = Number(options.duration) || numberFrom(['#duration','#renderDuration','#outputDuration'], 10);
    const speed = String(document.querySelector('#canvasRenderSpeed')?.value || 'balanced');
    const speedBatch = speed === 'stable' ? 1 : speed === 'fast' ? 4 : 2;
    const batchFrames = clamp(Math.round(Number(options.batchFrames) || speedBatch), 1, 8);
    const valid = [width,height,fps,duration].every(Number.isFinite) && width > 0 && height > 0 && fps > 0 && duration > 0 && width <= 16384 && height <= 16384 && fps <= 240 && duration <= 86400;
    if (!valid) throw new Error('Parameter render tidak valid atau di luar batas aman.');
    const pixels = width * height;
    const frameBytes = pixels * 4;
    const estimatedWorkingBytes = frameBytes * (batchFrames + 2);
    const totalFrames = Math.ceil(fps * duration);
    const totalPixels = pixels * totalFrames;
    const reportedRam = Number(navigator.deviceMemory) || null;
    const cores = Number(navigator.hardwareConcurrency) || null;
    const budgetBytes = reportedRam ? reportedRam * 1024 ** 3 * 0.25 : null;
    const risk = budgetBytes && estimatedWorkingBytes > budgetBytes ? 'high' : budgetBytes && estimatedWorkingBytes > budgetBytes * 0.6 ? 'medium' : 'low';
    return {
      width,height,fps,duration,batchFrames,totalFrames,totalPixels,
      frameMiB: frameBytes / 1024 ** 2,
      workingSetMiB: estimatedWorkingBytes / 1024 ** 2,
      deviceMemoryGiB: reportedRam, hardwareConcurrency: cores,
      estimatedBrowserBudgetMiB: budgetBytes ? budgetBytes / 1024 ** 2 : null,
      memoryRisk: risk,
      notes: [
        'Estimasi working set memakai ' + (batchFrames + 2) + ' buffer RGBA; penggunaan nyata bergantung pada layer, filter, encoder, dan cache.',
        'Total frame: ' + totalFrames.toLocaleString() + '. Total pixel diproses: ' + totalPixels.toLocaleString() + '.',
        'Angka RAM browser adalah perkiraan konservatif, bukan pengukuran pemakaian memori aktual.',
        'Resolusi, FPS, durasi, bitrate, dan kualitas ekspor tidak diubah oleh pemeriksaan ini.'
      ]
    };
  }
  const format = n => Number(n).toLocaleString(undefined,{maximumFractionDigits:1});
  function mount() {
    if (document.getElementById('trozalSmartPreflightFab')) return;
    const style = document.createElement('style');
    style.textContent = '#trozalSmartPreflightFab{position:fixed;left:16px;bottom:18px;z-index:99990;border:1px solid #64748b;background:#172033;color:#fff;border-radius:10px;padding:10px 13px;font:600 12px system-ui;box-shadow:0 5px 20px #0005;cursor:pointer}#trozalSmartPreflightPanel{position:fixed;left:16px;bottom:64px;z-index:99991;width:min(360px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#111827;color:#e5e7eb;border:1px solid #475569;border-radius:12px;padding:14px;box-shadow:0 12px 36px #0008;font:13px/1.5 system-ui;display:none}#trozalSmartPreflightPanel h3{margin:0 0 8px;font-size:15px}#trozalSmartPreflightPanel button{background:#334155;color:white;border:1px solid #64748b;border-radius:7px;padding:7px 10px;cursor:pointer}#trozalSmartPreflightPanel .metric{padding:8px;margin:6px 0;background:#1f2937;border-radius:8px}#trozalSmartPreflightPanel .muted{color:#a5b4c5;font-size:11px}';
    document.head.appendChild(style);
    const fab = document.createElement('button');
    fab.id = 'trozalSmartPreflightFab'; fab.type = 'button'; fab.textContent = '◉ Cek Kesiapan Render';
    const panel = document.createElement('section');
    panel.id = 'trozalSmartPreflightPanel';
    panel.setAttribute('aria-label','Smart Render Preflight');
    panel.innerHTML = '<h3>Smart Render Preflight</h3><div class="muted">Estimasi sebelum ekspor. Tidak mengubah setelan proyek.</div><div id="trozalPreflightResult" class="metric">Tekan Jalankan Pemeriksaan.</div><div style="display:flex;gap:8px"><button id="trozalPreflightRun" type="button">Jalankan Pemeriksaan</button><button id="trozalPreflightClose" type="button">Tutup</button></div>';
    document.body.append(fab,panel);
    fab.addEventListener('click',()=>{panel.style.display=panel.style.display==='block'?'none':'block';});
    panel.querySelector('#trozalPreflightClose').addEventListener('click',()=>panel.style.display='none');
    panel.querySelector('#trozalPreflightRun').addEventListener('click',()=>{
      const out=panel.querySelector('#trozalPreflightResult');
      try {
        const r=estimate();
        const riskLabel=r.memoryRisk==='high'?'Risiko memori tinggi':r.memoryRisk==='medium'?'Perlu perhatian':'Risiko estimasi rendah';
        out.innerHTML='<strong>'+riskLabel+'</strong><div class="metric">'+r.width+' × '+r.height+' · '+r.fps+' FPS · '+format(r.duration)+' detik</div><div class="metric">'+format(r.totalFrames)+' frame · '+format(r.frameMiB)+' MiB/frame · '+format(r.workingSetMiB)+' MiB estimasi buffer</div><div class="metric">Perangkat: '+(r.hardwareConcurrency||'—')+' core · '+(r.deviceMemoryGiB?r.deviceMemoryGiB+' GiB RAM terlapor':'RAM tidak dilaporkan')+'</div><ul>'+r.notes.map(n=>'<li>'+n+'</li>').join('')+'</ul>';
        out.querySelectorAll('li').forEach(li=>li.className='muted');
      } catch(e) { out.textContent='Pemeriksaan gagal: '+e.message; }
    });
  }
  window.TrozalSmartRenderPreflight = Object.freeze({ estimate });
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();