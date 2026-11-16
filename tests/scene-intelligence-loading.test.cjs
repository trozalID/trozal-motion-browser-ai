const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync('index.html', 'utf8');
const refs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
assert.ok(refs.includes('./js/scene-intelligence.js'), 'index.html must load Scene Intelligence from the workspace');
for (const src of refs) {
  if (/^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data:|blob:)/i.test(src)) continue;
  const clean = decodeURIComponent(src.split(/[?#]/, 1)[0]);
  const target = path.resolve(clean.replace(/^\.\//, ''));
  assert.ok(target.startsWith(process.cwd() + path.sep), 'local script must stay within repository: ' + src);
  assert.ok(fs.existsSync(target), 'local script referenced by index.html must exist: ' + src);
}
const api = require('../js/scene-intelligence.js');
assert.equal(globalThis.TROZAL_SCENE_INTELLIGENCE, api, 'Scene Intelligence API must be exposed on the global object');
for (const name of ['splitBeats','classify','inferInteraction','inferMotion','build','mountPreview']) {
  assert.equal(typeof api[name], 'function', 'Scene Intelligence API missing ' + name);
}
console.log('Scene Intelligence source asset and runtime API checks passed.');
