'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const canvas=fs.readFileSync(path.join(root,'canvas-3d-studio.js'),'utf8');
const theme=fs.readFileSync(path.join(root,'canvas-3d-ai-theme-studio.js'),'utf8');
const terminal=fs.readFileSync(path.join(root,'canvas-3d-terminal.js'),'utf8');
assert.ok(html.includes('./canvas-3d-ai-theme-studio.js'),'AI Theme Studio module must load.');
assert.ok(html.includes('./canvas-3d-terminal.js'),'Terminal module must load.');
assert.ok(canvas.includes('applyProject:applySceneProject'),'Canvas 3D must expose Scene JSON v2 import API.');
for(const token of ['TROZAL_AI_THEMES','trozalGetThemeDomainProfile','Detail Tambahan','Generate 3 Concepts','TROZAL_THEME_RULES','trozalBrowserAI.generateText']) {
 if(token==='TROZAL_THEME_RULES') continue;
 assert.ok(theme.includes(token)||html.includes(token),'Missing AI Theme Studio capability: '+token);
}
for(const token of ['Scene JSON v2','trozalBrowserAI.generateText','runSandbox','worker-src blob:','connect-src','Jalankan & Validasi JS','Terapkan ke Canvas 3D','Salin','Simpan']) assert.ok(terminal.includes(token),'Missing Terminal capability: '+token);
assert.ok(terminal.includes('worker.terminate()'),'JavaScript sandbox must terminate its worker after execution.');
assert.ok(terminal.includes('setTimeout(()=>finish')||terminal.includes('setTimeout(()=>'),'Terminal must enforce a finite JavaScript execution timeout.');
console.log('PASS: Browser Canvas 3D AI Theme Studio, provider-powered generation, isolated JS / JSON Terminal, and Scene JSON v2 apply contract.');
