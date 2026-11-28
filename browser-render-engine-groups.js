/* TROZAL MOTION · Render Engine Groups
 * Separates 3D viewport backends from 2D/motion composition backends.
 * Reports capability and integration independently; never advertises an unimplemented backend as selectable.
 */
(() => {
  'use strict';
  if (window.TrozalRenderEngineGroups) return;
  const probeCache = Object.create(null);
  const probe = (kind) => {
    if (Object.prototype.hasOwnProperty.call(probeCache, kind)) return probeCache[kind];
    let supported = false, gl = null;
    try {
      const c = document.createElement('canvas');
      if (kind === 'webgl2') { gl = c.getContext('webgl2'); supported = !!gl; }
      else if (kind === 'webgl1') { gl = c.getContext('webgl') || c.getContext('experimental-webgl'); supported = !!gl; }
      else if (kind === 'canvas2d') supported = !!c.getContext('2d');
      else if (kind === 'webgpu') supported = !!navigator.gpu;
      else if (kind === 'svg') supported = document.createElementNS('http://www.w3.org/2000/svg','svg').namespaceURI === 'http://www.w3.org/2000/svg';
      else if (kind === 'domcss') supported = !!(window.CSS && CSS.supports('transform','translate3d(1px,1px,1px)'));
    } catch (_) { supported = false; }
    // Capability probes must not keep GPU contexts alive or consume Chromium's
    // limited WebGL context slots. Probe once, explicitly release the test context,
    // and reuse the cached boolean for every subsequent panel refresh.
    if (gl) {
      try { const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (_) {}
    }
    probeCache[kind] = supported;
    return supported;
  };
  const definitions = [
    {group:'3D RENDER',id:'webgpu',name:'WebGPU',supported:()=>probe('webgpu'),integrated:true,detail:'Backend WebGPU native dengan WGSL, depth buffer, material, tiga lampu, dan scene state bersama; membutuhkan adapter WebGPU.'},
    {group:'3D RENDER',id:'webgl2',name:'WebGL2',supported:()=>probe('webgl2'),integrated:true,detail:'Backend 3D aktif pada viewport CANVAS 3D.'},
    {group:'3D RENDER',id:'webgl1',name:'WebGL1',supported:()=>probe('webgl1'),integrated:true,detail:'Backend WebGL1 native untuk browser/GPU kompatibilitas lama.'},
    {group:'3D RENDER',id:'cpu3d',name:'Canvas 2D CPU · Software 3D',supported:()=>probe('canvas2d'),integrated:true,detail:'Fallback software 3D; bukan akselerasi GPU.'},
    {group:'2D / MOTION RENDER',id:'canvas2d',name:'Canvas 2D Raster',supported:()=>probe('canvas2d'),integrated:true,detail:'Komposisi frame 2D dan jalur raster legacy.'},
    {group:'2D / MOTION RENDER',id:'svg',name:'SVG Vector / Raster',supported:()=>probe('svg'),integrated:true,detail:'SVG dirasterisasi untuk alur motion 2D.'},
    {group:'2D / MOTION RENDER',id:'domcss',name:'DOM / CSS Capture',supported:()=>probe('domcss'),integrated:()=>typeof window.htmlToImage!=='undefined',detail:'Capture HTML/CSS; sumber HTML tetap memakai jalur DOM capture.'},
    {group:'2D / MOTION RENDER',id:'hybrid',name:'Hybrid · Canvas2D + GPU Assist',supported:()=>!!window.TrozalHybridCanvasRenderer,integrated:()=>!!window.TrozalHybridCanvasRenderer,detail:'Benchmark GPU Assist; fallback Canvas2D dipilih otomatis.'}
  ];
  let selected2D='canvas2d';
  function makeCanvas(source,width,height){
    const w=Math.max(1,Math.min(8192,Math.round(Number(width)||1))),h=Math.max(1,Math.min(8192,Math.round(Number(height)||1)));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('Canvas2D tidak tersedia.');
    ctx.clearRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);return canvas;
  }
  async function svgCanvas(source,width,height){
    const text=typeof source==='string'?source:new XMLSerializer().serializeToString(source);
    if(!/<svg[\s>]/i.test(text))throw new Error('Sumber SVG tidak valid.');
    const blob=new Blob([text],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),image=new Image();
    try{image.src=url;if(image.decode)await image.decode();else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('SVG gagal dimuat.'));});return makeCanvas(image,width,height);}
    finally{URL.revokeObjectURL(url);}
  }
  async function select2D(id){
    if(!['canvas2d','svg','domcss','hybrid'].includes(id))throw new Error('Mesin 2D tidak dikenal: '+id);
    if(id==='domcss'&&typeof window.htmlToImage==='undefined')throw new Error('DOM/CSS Capture belum tersedia: adapter htmlToImage belum dimuat.');
    if(id==='hybrid'){if(!window.TrozalHybridCanvasRenderer)throw new Error('Hybrid Canvas belum dimuat.');await window.TrozalHybridCanvasRenderer.prepare();}
    selected2D=id;window.dispatchEvent(new CustomEvent('trozal:2d-renderer-changed',{detail:{engine:id}}));return {engine:id,ready:true};
  }
  async function render2D(source,width,height){
    if(selected2D==='svg')return svgCanvas(source,width,height);
    if(selected2D==='domcss'){if(!window.htmlToImage||typeof window.htmlToImage.toCanvas!=='function')throw new Error('Adapter DOM/CSS Capture tidak menyediakan toCanvas().');return window.htmlToImage.toCanvas(source,{canvasWidth:width,canvasHeight:height});}
    if(selected2D==='hybrid'){
      const input=typeof source==='string'||(source&&source.namespaceURI==='http://www.w3.org/2000/svg')?await svgCanvas(source,width,height):source;
      const gpu=window.TrozalGpuFramePipeline&&window.TrozalGpuFramePipeline.render(input,width,height);if(gpu)return gpu;
    }
    return makeCanvas(source,width,height);
  }
  function snapshot(){
    return definitions.map(item=>{
      const supported=!!item.supported();
      const integrated=!!(typeof item.integrated==='function'?item.integrated():item.integrated);
      return {...item,supported,integrated,status:!supported?'Tidak didukung':integrated?'Terintegrasi':'Belum terintegrasi'};
    });
  }
  function mount(){
    const header=document.getElementById('trozal3DHeader');
    if(!header||document.getElementById('trozalRenderEngineGroups'))return;
    const details=document.createElement('details');
    details.id='trozalRenderEngineGroups';
    details.innerHTML='<summary>RENDER ENGINES · 2 GROUPS</summary><div class="trozal-engine-groups"><section><h4>3D RENDER</h4><div data-engine-group="3D RENDER"></div></section><section><h4>2D / MOTION RENDER</h4><div data-engine-group="2D / MOTION RENDER"></div></section><p>Catatan: status “Belum terintegrasi” berarti mesin belum bisa dipilih untuk merender proyek. Tidak ada opsi palsu atau fallback diam-diam.</p></div>';
    header.insertBefore(details,header.querySelector('#trozal3DSave'));
    const style=document.createElement('style');
    style.textContent='#trozalRenderEngineGroups{position:relative;font-size:10px}#trozalRenderEngineGroups summary{cursor:pointer;color:#a9e6ff;font-weight:800;white-space:nowrap;padding:7px;border:1px solid #34546c;border-radius:6px;background:#0b2030}#trozalRenderEngineGroups[open] .trozal-engine-groups{position:absolute;z-index:1000;right:0;top:100%;width:min(570px,90vw);padding:10px;background:#0a1926;border:1px solid #3e718c;border-radius:9px;box-shadow:0 10px 28px #000b;display:grid;grid-template-columns:1fr 1fr;gap:10px}.trozal-engine-groups h4{margin:0 0 6px;color:#a9e6ff;font-size:10px}.trozal-engine-row{padding:6px;margin:4px 0;border:1px solid #2d4658;border-radius:6px;background:#102536}.trozal-engine-row b{display:block;color:#e5f5ff}.trozal-engine-row small{display:block;color:#a9bfd0;line-height:1.35}.trozal-engine-row .state{font-weight:800;color:#8de5b2}.trozal-engine-row .state.pending{color:#ffd17b}.trozal-engine-row .state.off{color:#ff9b9b}.trozal-engine-groups>p{grid-column:1/-1;margin:0;color:#a9bfd0;font-size:9px}.trozal-engine-use{margin-top:6px;padding:5px 9px;border:1px solid #4b8ba7;border-radius:5px;background:#12384a;color:#bcefff;font-size:9px;font-weight:800;cursor:pointer}.trozal-engine-use:hover{background:#1a5269}@media(max-width:700px){#trozalRenderEngineGroups[open] .trozal-engine-groups{right:-8px;grid-template-columns:1fr;max-height:70vh;overflow:auto}}';
    document.head.appendChild(style);
    function refresh(){
      const rows=snapshot();
      for(const group of ['3D RENDER','2D / MOTION RENDER']){
        const host=details.querySelector('[data-engine-group="'+group+'"]');
        host.replaceChildren();
        rows.filter(x=>x.group===group).forEach(item=>{
          const row=document.createElement('div');row.className='trozal-engine-row';
          const name=document.createElement('b');name.textContent=item.name;
          const status=document.createElement('span');status.className='state '+(!item.supported?'off':!item.integrated?'pending':'');status.textContent=item.status;
          const detail=document.createElement('small');detail.textContent=item.detail;
          row.append(name,status,detail);
          if(item.integrated&&item.supported&&(group==='3D RENDER'||group==='2D / MOTION RENDER')){
            const is2D=group==='2D / MOTION RENDER';const choice=is2D?item.id:(item.id==='cpu3d'?'canvas2d':item.id);
            const select=is2D?null:document.getElementById('trozal3DRenderer');
            const action=document.createElement('button');
            action.type='button';
            action.className='trozal-engine-use';
            action.dataset.engineSelect=choice;
            action.textContent=(is2D?selected2D===choice:select&&select.value===choice)?'Aktif':'Gunakan';
            action.addEventListener('click',async()=>{
              const control=document.getElementById('trozal3DRenderer');
              if(!is2D&&!control)return;
              action.disabled=true;
              try{
                if(is2D)await select2D(choice);
                else if(window.TROZAL_CANVAS_3D&&typeof window.TROZAL_CANVAS_3D.setRenderer==='function')await window.TROZAL_CANVAS_3D.setRenderer(choice);
                else{control.value=choice;control.dispatchEvent(new Event('change',{bubbles:true}));}
                refresh();
              }catch(error){
                const status=document.getElementById('trozal3DStatus');
                if(status)status.textContent='Gagal mengaktifkan '+choice+': '+(error&&error.message||error);
              }finally{action.disabled=false;}
            });
            row.appendChild(action);
          }
          host.appendChild(row);
        });
      }
    }
    refresh();
    details.addEventListener('toggle',()=>{if(details.open)refresh();});
    const rendererControl=document.getElementById('trozal3DRenderer');
    if(rendererControl)rendererControl.addEventListener('change',refresh);
    window.addEventListener('trozal:hybrid-canvas-status',refresh);
    window.addEventListener('trozal:renderer-changed',refresh);
  }
  const observer=new MutationObserver(mount);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  mount();
  window.TrozalMotion2DRenderEngines=Object.freeze({select:select2D,render:render2D,getSelected:()=>selected2D});
  window.TrozalRenderEngineGroups=Object.freeze({getStatus:snapshot,refresh:mount});
})();
