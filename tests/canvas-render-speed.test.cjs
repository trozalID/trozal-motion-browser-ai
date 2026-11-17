'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.includes('id="canvasRenderSpeed"'), 'Render settings must expose Canvas Render Speed');
assert.match(html, /value="stable">Stabil/);
assert.match(html, /value="balanced" selected>Seimbang/);
assert.match(html, /value="fast">⚡ Cepat/);
assert.match(html, /const canvasRenderSpeedMode=\$\('canvasRenderSpeed'\)\?\.value\|\|'balanced'/);
assert.match(html, /canvasRenderSpeedMode==='fast'\?4:canvasRenderSpeedMode==='stable'\?1:2/);
assert.match(html, /function scheduleCanvasRenderFrame\(callback\)/);
assert.match(html, /scheduleCanvasRenderFrame\(\(\)=>trozalScheduleRenderTask\(draw\)\)/);
assert.match(html, /const nextFrameAt=renderClockStart\+frame\*step/, 'Realtime MediaRecorder cadence must remain tied to selected FPS');
assert.match(html, /'renderSpeedMode','canvasRenderSpeed'/, 'Canvas speed preference must persist in project settings');
assert.match(html, /Tidak mengubah resolusi, FPS, durasi, atau kualitas frame/);
process.stdout.write('PASS: Canvas render speed profiles, offline frame batching, project persistence, and unchanged FPS cadence.\n');
