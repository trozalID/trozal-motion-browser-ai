/* TROZAL MOTION · GPU-assisted static layer rasterizer.
   WebGL2 scales immutable image/SVG layers on the GPU. Canvas2D still performs
   scene transforms, masks, text, effects and final export composition. */
(() => {
  'use strict';
  if (window.TrozalGpuFramePipeline) return;
  let canvas = null, gl = null, program = null, buffer = null, textureLocation = null;
  let failed = false, draws = 0, uploads = 0, fallbacks = 0, activationReported = false;
  const cache = new WeakMap();
  const vertexSource = `#version 300 es
    in vec2 a_position; in vec2 a_texCoord; out vec2 v_texCoord;
    void main(){ gl_Position=vec4(a_position,0.0,1.0); v_texCoord=a_texCoord; }`;
  const fragmentSource = `#version 300 es
    precision highp float; uniform sampler2D u_image; in vec2 v_texCoord; out vec4 outColor;
    void main(){ outColor=texture(u_image,v_texCoord); }`;
  function compile(type, source) {
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader)||'Shader compile failed';gl.deleteShader(shader);throw new Error(message);}
    return shader;
  }
  function init() {
    if(gl)return true;
    if(failed)return false;
    try {
      canvas=document.createElement('canvas');
      gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,premultipliedAlpha:true,desynchronized:true});
      if(!gl)throw new Error('WebGL2 tidak tersedia');
      const vs=compile(gl.VERTEX_SHADER,vertexSource),fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
        -1,-1,0,0, 1,-1,1,0, -1,1,0,1, 1,1,1,1
      ]),gl.STATIC_DRAW);
      gl.useProgram(program);
      const pos=gl.getAttribLocation(program,'a_position'),uv=gl.getAttribLocation(program,'a_texCoord');
      gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,16,0);
      gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
      textureLocation=gl.getUniformLocation(program,'u_image');
      gl.activeTexture(gl.TEXTURE0);gl.uniform1i(textureLocation,0);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;gl=null;});
      return true;
    } catch(error) { failed=true;gl=null;console.warn('TROZAL GPU frame assist unavailable; Canvas2D fallback active.',error);return false; }
  }
  function render(source,width,height) {
    if(!source||!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||!init())return null;
    try {
      const w=Math.max(1,Math.min(8192,Math.round(width))),h=Math.max(1,Math.min(8192,Math.round(height)));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      let record=cache.get(source);
      const isCanvas=typeof HTMLCanvasElement!=='undefined'&&source instanceof HTMLCanvasElement;
      const signature=String(source.currentSrc||source.src||'')+'|'+(source.naturalWidth||source.width||0)+'x'+(source.naturalHeight||source.height||0);
      if(!record){record={texture:gl.createTexture(),signature:''};cache.set(source,record);}
      gl.bindTexture(gl.TEXTURE_2D,record.texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      if(isCanvas||record.signature!==signature){
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
        record.signature=signature;uploads++;
      }
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if(gl.getError()!==gl.NO_ERROR)throw new Error('WebGL2 gagal menggambar tekstur');
      draws++;
      if(!activationReported){activationReported=true;window.dispatchEvent(new CustomEvent('trozal:gpu-frame-assist-used',{detail:{draws,uploads}}));}
      return canvas;
    } catch(error) {
      fallbacks++;
      if(gl){for(let i=0;i<4;i++){if(gl.getError()===gl.NO_ERROR)break;}}
      console.warn('TROZAL GPU layer fallback to Canvas2D for this frame.',error);return null;
    }
  }
  async function benchmark(options={}) {
    if (!init()) throw new Error('WebGL2 tidak siap untuk benchmark');
    const sourceCanvas=document.createElement('canvas');
    sourceCanvas.width=512;sourceCanvas.height=512;
    const sourceContext=sourceCanvas.getContext('2d');
    const gradient=sourceContext.createLinearGradient(0,0,512,512);
    gradient.addColorStop(0,'#e94b65');gradient.addColorStop(.5,'#37a6d9');gradient.addColorStop(1,'#f2c14e');
    sourceContext.fillStyle=gradient;sourceContext.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=32)for(let x=0;x<512;x+=32){sourceContext.fillStyle=((x+y)/32)%2?'rgba(255,255,255,.12)':'rgba(0,0,0,.10)';sourceContext.fillRect(x,y,32,32);}
    const source=new Image();source.src=sourceCanvas.toDataURL('image/png');
    await new Promise((resolve,reject)=>{source.onload=resolve;source.onerror=()=>reject(new Error('Gagal membuat aset benchmark'));});
    const results=[];
    const sizes=Array.isArray(options.sizes)&&options.sizes.length?options.sizes:[{label:'1080p',width:1920,height:1080},{label:'4K',width:3840,height:2160}];
    const iterations=Math.max(2,Math.min(8,Number(options.iterations)||5));
    const maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE)||0;
    const maxViewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS)||[0,0];
    for(const size of sizes){
      const width=Math.floor(Number(size.width)),height=Math.floor(Number(size.height));
      if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw new Error('Resolusi benchmark tidak valid.');
      if(width>maxTextureSize||height>maxTextureSize||width>maxViewport[0]||height>maxViewport[1])throw new Error((size.label||'Resolusi')+' tidak didukung GPU ini. Batas tekstur WebGL '+maxTextureSize+' px; batas viewport '+maxViewport[0]+'×'+maxViewport[1]+' px.');
      const baseline=document.createElement('canvas');baseline.width=width;baseline.height=height;
      const baselineContext=baseline.getContext('2d',{alpha:true});
      const composite=document.createElement('canvas');composite.width=width;composite.height=height;
      const compositeContext=composite.getContext('2d',{alpha:true});
      const canvasTimes=[],gpuTimes=[];
      for(let warm=0;warm<2;warm++){
        baselineContext.clearRect(0,0,size.width,size.height);baselineContext.drawImage(source,0,0,size.width,size.height);baselineContext.getImageData(0,0,1,1);
        const warmGpu=render(source,size.width,size.height);if(!warmGpu)throw new Error('GPU Assist gagal saat warm-up');
        compositeContext.clearRect(0,0,size.width,size.height);compositeContext.drawImage(warmGpu,0,0);gl.finish();compositeContext.getImageData(0,0,1,1);
      }
      for(let i=0;i<iterations;i++){
        let start=performance.now();
        baselineContext.clearRect(0,0,size.width,size.height);baselineContext.drawImage(source,0,0,size.width,size.height);baselineContext.getImageData(0,0,1,1);
        canvasTimes.push(performance.now()-start);
        start=performance.now();
        const gpuOutput=render(source,size.width,size.height);if(!gpuOutput)throw new Error('GPU Assist fallback terjadi saat benchmark');
        compositeContext.clearRect(0,0,size.width,size.height);compositeContext.drawImage(gpuOutput,0,0);gl.finish();compositeContext.getImageData(0,0,1,1);
        gpuTimes.push(performance.now()-start);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
      const canvasMedian=median(canvasTimes),gpuMedian=median(gpuTimes);
      results.push({resolution:size.label,width,height,iterations,canvas2dMedianMs:Number(canvasMedian.toFixed(2)),gpuAssistMedianMs:Number(gpuMedian.toFixed(2)),ratio:Number((gpuMedian/canvasMedian).toFixed(2)),winner:gpuMedian<canvasMedian?'GPU Assist':'Canvas2D'});
      baseline.width=baseline.height=1;composite.width=composite.height=1;
    }
    sourceCanvas.width=sourceCanvas.height=1;
    return {benchmark:'synthetic static image scaling + final Canvas2D composite; median timing after 2 warm-ups; synchronous readback included',maxTextureSize,results};
  }
  window.TrozalGpuFramePipeline=Object.freeze({
    render,
    benchmark,
    getStats:()=>({available:!!gl&&!failed,failed,draws,uploads,fallbacks,mode:'GPU image texture scaling + Canvas2D scene composition'})
  });
})();