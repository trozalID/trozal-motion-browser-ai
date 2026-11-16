'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const renderer = fs.readFileSync('hybrid-canvas-renderer.js', 'utf8');
const gpu = fs.readFileSync('browser-gpu-frame-pipeline.js', 'utf8');
assert.match(html, /hybrid-canvas-renderer\.js/);
assert.match(html, /browser-gpu-frame-pipeline\.js/);
assert.match(html, /id=["']trozalHybridCanvasStatus["']/);
assert.match(html, /TrozalHybridCanvasRenderer\.prepare\(\)/);
assert.match(renderer, /mode:\s*'hybrid'/);
assert.match(renderer, /canvas2dMedianMs/);
assert.match(renderer, /gpuAssistMedianMs/);
assert.match(renderer, /item\.ratio\s*<=\s*0\.85/);
assert.match(renderer, /state\.strategy\s*=\s*'canvas2d'/);
assert.match(gpu, /webgl2/);
assert.match(gpu, /Canvas2D/);
assert.match(html, /captureHtmlMotionAt\(elapsed\)/);
assert.match(html, /__trozalGpuFrameAssistEnabled===true/);
assert.match(html, /id=["']stage["']/);
assert.match(html, /class=["'][^"']*timeline[^"']*["']/);
for (const id of ['renderBtn','cancelRenderBtn','format','resolution','proresMode','multiTrackEditor']) {
  assert.equal((html.match(new RegExp("id=[\\\"']" + id + "[\\\"']", 'g')) || []).length, 1,
    'Existing editor/export control must remain exactly once: #' + id);
}
assert.match(html, /value=["']3840x2160["']/);
assert.match(html, /ProRes 4444/);
assert.match(html, /PNG Sequence/);
console.log('Hybrid Canvas static guard passed: benchmark gate, GPU/Canvas2D fallback, HTML capture fallback, workspace and export controls preserved.');
