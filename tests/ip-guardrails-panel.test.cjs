'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const panel=fs.readFileSync('ip-guardrails-panel.js','utf8');
assert.ok(html.includes('./ip-guardrails-panel.js'),'IP guardrails panel script must load');
assert.ok(html.includes('id="visualMotionPrompt"'),'Scene Composer brief field missing');
for(const term of ['ORIGINAL CONTENT & IP GUARDRAILS','logo','merek dagang','watermark','karakter','alternatif orisinal']) assert.ok(panel.toLowerCase().includes(term.toLowerCase()),'Missing visible policy: '+term);
assert.ok(panel.includes('Tidak ada opsi untuk menonaktifkannya'),'Policy must be presented as always-on');
if(fs.existsSync('browser-ai-webgpu-local.js')){
 const local=fs.readFileSync('browser-ai-webgpu-local.js','utf8');
 assert.ok(local.includes('IP_POLICY'),'Local WebGPU must receive the IP policy');
 assert.ok(local.includes("messages.push({role:'system',content:systemInstruction})"),'Local WebGPU must always send a system policy');
 const cloud=fs.readFileSync('browser-ai-gemini-cloud.js','utf8');
 assert.ok(cloud.includes('INTELLECTUAL PROPERTY / ORIGINALITY POLICY'),'Gemini Scene Composer policy missing');
}else{
 assert.ok(html.includes('TROZAL_IP_SAFETY_POLICY'),'Ollama Scene Composer system policy missing');
}
process.stdout.write('PASS: visible IP panel and provider-specific always-on policy enforcement.\\n');
