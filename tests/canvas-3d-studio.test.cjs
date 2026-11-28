'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'canvas-3d-studio.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(html.includes('./canvas-3d-studio.js'), 'CANVAS 3D script must be loaded by the main application.');
for (const id of [
  'trozalCanvas3DOpen','trozalCanvas3DOverlay','trozal3DCanvas','trozal3DObjectList',
  'trozal3DNewType','trozal3DAdd','trozal3DDuplicate','trozal3DDelete','trozal3DReset',
  'trozal3DX','trozal3DY','trozal3DZ','trozal3DRX','trozal3DRY','trozal3DRZ',
  'trozal3DSX','trozal3DSY','trozal3DSZ','trozal3DMetal','trozal3DRough','trozal3DMaterialPreset','trozal3DEmission',
  'trozal3DAnimation','trozal3DSpeed','trozal3DAmount','trozal3DPlay','trozal3DPause',
  'trozal3DStop','trozal3DTime','trozal3DLoop','trozal3DDuration','trozal3DFps',
  'trozal3DSave','trozal3DExportJson','trozal3DExportPng','trozal3DParent','trozal3DAddKeyframe','trozal3DKeyframeInfo','trozal3DLightingControls',
  'trozal3DSnapEnabled','trozal3DSnapMove','trozal3DSnapRotate','trozal3DSnapScale','trozal3DRenderer','trozal3DCanvas2D','trozal3DCameraTools','trozal3DCameraProjection','trozal3DCameraFocus','trozal3DCameraFront','trozal3DCameraSide','trozal3DCameraTop','trozal3DOrthoScale','trozal3DHdriFile','trozal3DHdriIntensity','trozal3DHdriRemove','trozal3DHdriInfo'
]) assert.ok(source.includes('id=\''+id+'\'') || source.includes('id="'+id+'"') || source.includes(".id='"+id+"'"), 'Missing CANVAS 3D control: '+id);
for (const token of [
  "getContext('webgl2'", 'drawArrays(gl.TRIANGLES', 'drawArrays(gl.LINES',
  'function geometry(type,custom)', "type==='cube'", "type==='sphere'", "type==='torus'",
  "type==='cylinder'", "type==='cone'", "type==='plane'", 'function localModel(o,t)', 'function model(o,t,seen=new Set())',
  "o.animation==='spin'", "o.animation==='orbit'", "o.animation==='bounce'",
  "o.animation==='pulse'", 'function camera(w,h)', 'function orthographic(scale,aspect,n,far)', 'function lookAt(eye,target)',
  'uMetallic','uRoughness','uEmission','emission:1.35','function renderLights()','uLightPos[3]','uLightColor[3]','uLightPower[3]','function renderLights()','data-light-field','function exportPng()', 'function save()', 'function keyedValues(o,t)', 'function model(o,t,seen=new Set())',
  'pointerdown','pointermove','addEventListener(\'wheel\'', 'function drawCanvas2D(time,force)', 'function setRenderer(choice)', 'function projectPoint(matrix,p)', 'function initCanvas2D()'
]) assert.ok(source.includes(token), 'Missing 3D renderer feature: '+token);
assert.ok(source.includes("Object.defineProperty(window,'TROZAL_CANVAS_3D'"), 'CANVAS 3D must expose its public scene API.');
assert.ok(source.includes('function sanitizeMeshData(raw)') && source.includes("type==='mesh'") && (source.includes("if(raw.type==='mesh')item.meshData=sanitizeMeshData(raw.meshData)") || source.includes('meshData:sanitizeMeshData(raw.meshData)')), 'Imported custom mesh geometry must be validated and preserved in Scene JSON.');
assert.ok(source.includes('mesh(gl,o.meshData?') && source.includes('mesh1(gl,o.meshData?') && source.includes('gpuMesh(o.meshData?') && source.includes('geometry(o.type,o.meshData)'), 'Imported custom mesh data must reach all renderer backends.');
assert.ok(source.includes('in vec2 aUv') && source.includes('out vec2 vUv') && source.includes('uniform sampler2D uTexture') && source.includes('texture(uTexture,vUv)'), 'WebGL2 must map image textures through mesh UV coordinates.');
assert.ok(source.includes('attribute vec2 aUv') && source.includes('texture2D(uTexture,vUv)'), 'WebGL1 compatibility renderer must support image textures.');
assert.ok(source.includes('id="trozal3DTextureFile"') && source.includes('id="trozal3DTextureRemove"') && source.includes('2*1024*1024'), 'Object inspector must expose safe image texture upload and removal.');
assert.ok(source.includes('imageTexture(gl,o.textureDataUrl)') && source.includes('textureDataUrl.length<=2800000'), 'Image textures must upload to GPU and persist safely in Scene JSON.');
assert.ok(source.includes('uniform sampler2D uEnvironmentMap') && source.includes('texture(uEnvironmentMap,envUv)') && source.includes('texture2D(uEnvironmentMap,envUv)'), 'WebGL1/WebGL2 must sample an equirectangular HDRI for image-based reflections.');
assert.ok(source.includes('id="trozal3DHdriFile"') && source.includes('hdriDataUrl') && source.includes('hdriIntensity'), 'HDRI upload, intensity and Scene JSON persistence must be wired.');
assert.ok(source.includes('function snapValue(') && source.includes('transformSnap:{...state.transformSnap}'), 'Transform snapping must be implemented and serialized.');
assert.ok(source.includes("$('trozal3DSnapEnabled').addEventListener('change'") && source.includes("$('trozal3DSnap'+label).addEventListener('change'") && source.includes("[['Move','move'],['Rotate','rotate'],['Scale','scale']]"), 'Snap toggle and per-transform increments must be wired through the shared control loop.');
const terminal = fs.readFileSync(path.join(__dirname, '..', 'canvas-3d-terminal.js'), 'utf8');
assert.ok(html.includes('./canvas-3d-terminal.js'), 'Canvas 3D terminal must be loaded by the main application.');
assert.ok(terminal.includes("addEventListener('paste'") && terminal.includes("getData('text/plain')") && terminal.includes('setRangeText'), 'Terminal must explicitly support pasting plain-text JavaScript and JSON into the editor.');
assert.ok(terminal.includes('id="t3dTerminalPaste"') && terminal.includes('navigator.clipboard.readText'), 'Terminal must expose a visible clipboard Paste action for JavaScript and JSON.');
assert.ok(source.includes("document.querySelector('.topbar .topright')"), 'CANVAS 3D launcher must attach to the Browser AI topbar when available.');
assert.ok(source.includes("PNG snapshot exported · ") && source.includes('canvas.width') && source.includes('canvas.height') && source.includes('b.size'), 'PNG export must report actual snapshot dimensions and byte count.');
assert.match(source, /WebGL2 tidak tersedia/);
assert.ok(source.includes('function drawCanvas2D(time,force)') && source.includes('function draw(time,force)'), 'Canvas 2D CPU must render through the shared scene state.');
assert.ok(source.includes("getContext('2d'") && source.includes('value="canvas2d"'), 'Canvas 2D CPU renderer must be a real selectable backend.');
assert.ok(source.includes("state.renderer==='canvas2d'"), 'PNG export must use the active renderer canvas.');
assert.doesNotMatch(source, /three\.min\.js|cdnjs\.cloudflare\.com\/ajax\/libs\/three/i,
  'CANVAS 3D must not depend on an external Three.js CDN.');
assert.ok(source.includes('function easingProgress(u,mode)'), 'Keyframe easing evaluator must be present.');
assert.ok(source.includes('base*(.28+.16*uLight)') && source.includes('base*(0.28+0.16*uLight)'), 'WebGL2 and WebGL1 must retain the brighter ambient baseline with optional image textures.');
const engineGroups = fs.readFileSync(path.join(__dirname, '..', 'browser-render-engine-groups.js'), 'utf8');
assert.ok(engineGroups.includes('window.TrozalMotion2DRenderEngines') && engineGroups.includes('function render2D(source,width,height)'), '2D engine selection must expose a real raster render adapter.');
assert.ok(engineGroups.includes("if(group==='3D RENDER'&&item.integrated&&item.supported)")===false && engineGroups.includes("group==='2D / MOTION RENDER'"), 'Integrated 2D render engines must expose a usable selection action.');
assert.ok(source.includes('let diffuse=.28;') && source.includes('diffuse+state.light*.16'), 'Canvas2D software renderer must retain the brighter ambient baseline.');
assert.ok(source.includes("case 'ease-in'" ) && source.includes("case 'ease-out'") && source.includes("case 'ease-in-out'") && source.includes("case 'smoothstep'") && source.includes("case 'hold'"), 'All supported interpolation modes must be implemented.');
assert.ok(source.includes('trozal3DKeyframeEasing') && source.includes("easing:$(\'trozal3DKeyframeEasing\')?.value||\'ease-in-out\'"), 'Keyframe easing must be selectable and saved per keyframe.');
assert.ok(source.includes("b.easing||a.easing||'linear'"), 'Each keyframe segment must apply its stored easing with a linear fallback for old projects.');
assert.ok(source.includes("const order=['webgpu','webgl2','webgl1','canvas2d']"), 'Auto renderer must prefer WebGPU, then WebGL2, WebGL1 and Canvas 2D.');
assert.ok(source.includes("Auto (WebGPU → WebGL2 → WebGL1 → CPU)"), 'Renderer selector must show the actual automatic fallback order.');
assert.ok(source.includes("function recoverRenderer(excluded,reason)"), 'GPU/device or WebGL context loss must activate the next available backend.');
assert.ok(source.includes("canvas.addEventListener('webglcontextlost'") && source.includes("if(state.renderer==='webgl2')recoverRenderer('webgl2'"), 'WebGL2 context loss must recover to WebGL1 or Canvas 2D.');
assert.ok(source.includes("if(state.renderer==='webgl1')recoverRenderer('webgl1'"), 'WebGL1 context loss must recover to Canvas 2D.');
assert.ok(source.includes("if(state.renderer==='webgpu')recoverRenderer('webgpu'"), 'WebGPU device loss must recover to WebGL2, WebGL1 or Canvas 2D.');
assert.ok(source.includes("function resize(){const viewport=$('trozal3DViewport')") && source.includes("'trozal3DCanvas','trozal3DCanvas2D','trozal3DCanvasGL1','trozal3DCanvasGPU'"), 'All four canvases must share the same viewport pixel dimensions.');
assert.ok(!source.includes("Auto (WebGL2 → WebGL1 → CPU)"), 'Outdated auto renderer label must be removed.');
assert.ok(source.includes("setRenderer('auto').catch"), 'Opening Canvas 3D must invoke the automatic backend selector.');
assert.ok(source.includes("Requested '+requested.toUpperCase()") && source.includes('secure context (HTTPS/localhost)'), 'Failed WebGPU selection must remain visible and report the browser/GPU activation requirements.');
assert.ok(source.includes('state.gl.isContextLost&&state.gl.isContextLost()'), 'WebGL2 backend switching must detect and rebuild a lost context.');
assert.ok(source.includes('state.gl1.isContextLost&&state.gl1.isContextLost()'), 'WebGL1 backend switching must detect and rebuild a lost context.');
const engineGroupsSource=fs.readFileSync(path.join(__dirname,'..','browser-render-engine-groups.js'),'utf8');
assert.ok(engineGroupsSource.includes('const probeCache = Object.create(null)'), 'Renderer capability probes must be cached between panel refreshes.');
assert.ok(engineGroupsSource.includes('lose.loseContext()'), 'Temporary WebGL probe contexts must be explicitly released.');
console.log('PASS: CANVAS 3D WebGL2 scene, geometry, transform, materials, three-point lighting, per-object motion, camera, timeline and exports are wired.');
