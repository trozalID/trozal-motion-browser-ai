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
  'trozal3DSX','trozal3DSY','trozal3DSZ','trozal3DMetal','trozal3DRough',
  'trozal3DAnimation','trozal3DSpeed','trozal3DAmount','trozal3DPlay','trozal3DPause',
  'trozal3DStop','trozal3DTime','trozal3DLoop','trozal3DDuration','trozal3DFps',
  'trozal3DSave','trozal3DExportJson','trozal3DExportPng'
]) assert.ok(source.includes('id=\''+id+'\'') || source.includes('id="'+id+'"') || source.includes(".id='"+id+"'"), 'Missing CANVAS 3D control: '+id);
for (const token of [
  "getContext('webgl2'", 'drawArrays(gl.TRIANGLES', 'drawArrays(gl.LINES',
  'function geometry(type)', "type==='cube'", "type==='sphere'", "type==='torus'",
  "type==='cylinder'", "type==='cone'", "type==='plane'", 'function model(o,t)',
  "o.animation==='spin'", "o.animation==='orbit'", "o.animation==='bounce'",
  "o.animation==='pulse'", 'function camera(w,h)', 'function lookAt(eye,target)',
  'uMetallic','uRoughness','function exportPng()', 'function save()',
  'pointerdown','pointermove','addEventListener(\'wheel\''
]) assert.ok(source.includes(token), 'Missing 3D renderer feature: '+token);
assert.match(source, /window\.TROZAL_CANVAS_3D/);
assert.match(source, /WebGL2 tidak tersedia/);
assert.doesNotMatch(source, /three\.min\.js|cdnjs\.cloudflare\.com\/ajax\/libs\/three/i,
  'CANVAS 3D must not depend on an external Three.js CDN.');
console.log('PASS: CANVAS 3D WebGL2 scene, geometry, transform, materials, per-object motion, camera, timeline and exports are wired.');
