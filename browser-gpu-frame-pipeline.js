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
  window.TrozalGpuFramePipeline=Object.freeze({
    render,
    getStats:()=>({available:!!gl&&!failed,failed,draws,uploads,fallbacks,mode:'GPU image texture scaling + Canvas2D scene composition'})
  });
})();