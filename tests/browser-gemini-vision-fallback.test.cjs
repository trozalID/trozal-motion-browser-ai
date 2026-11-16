const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('browser-ai-gemini-cloud.js', 'utf8');

assert.match(source, /function buildVisionFallbackMetadata\\(allowed\\)/);
assert.match(source, /fillMetadata\\(fallback,'Smart Template · fallback tekstual'\\)/);
assert.ok(source.includes('bukan dari analisis piksel'));
assert.match(source, /visible_objects:\\s*\\[\\]/);
assert.ok(source.includes('Jangan menganggap objek, warna, komposisi, atau gerakan telah dikenali dari piksel'));
assert.ok(source.includes("metadataSource==='Gemini Cloud'"));

const start = source.indexOf('function buildVisionFallbackMetadata(allowed){');
const end = source.indexOf('async function analyzeVision(){', start);
assert.ok(start >= 0 && end > start, 'fallback builder must be present before analyzeVision');
const functionSource = source.slice(start, end).trim();
const fields = {
  visualMotionPrompt: { value: 'A red sports car drives through a neon city at night.' },
  svgAiPrompt: { value: 'Cinematic automotive commercial, reflections and light trails.' },
  metadataCategory: { options: [{ text: 'Transportation' }, { text: 'Food' }, { text: 'Nature' }] }
};
const builder = vm.runInNewContext('(' + functionSource.replace(/^function buildVisionFallbackMetadata/, 'function') + ')', {
  $: id => fields[id] || null,
  Set
});
const result = builder(['Transportation', 'Food', 'Nature']);
assert.match(result.title, /red sports car/i);
assert.equal(result.category, 'Transportation');
assert.ok(result.keywords.includes('automotive'));
assert.deepEqual(Array.from(result.visible_objects), []);
assert.match(result.visual_summary, /tidak tersedia/);
assert.match(result.confidence_notes, /Fallback tekstual saja/);

fields.visualMotionPrompt.value = '';
fields.svgAiPrompt.value = '';
assert.throws(() => builder(['Transportation']), /membutuhkan brief/);
console.log('Gemini Vision Smart Template fallback regression checks passed.');
