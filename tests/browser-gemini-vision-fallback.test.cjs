const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('browser-ai-gemini-cloud.js', 'utf8');

assert.ok(source.includes('function buildVisionFallbackMetadata(allowed){'));
assert.ok(source.includes("fillMetadata(fallback,'Smart Template · fallback tekstual')"));
assert.ok(source.includes('bukan analisis piksel'));
assert.ok(source.includes('visible_objects:[]'));
assert.ok(source.includes('Jangan menganggap objek, warna, komposisi, atau gerakan telah dikenali dari piksel'));
assert.ok(source.includes("metadataSource.startsWith('Smart Template')"));
assert.ok(source.includes("providerName()+' Cloud gagal pada model '+modelId()"));
assert.ok(source.includes('Pilih provider/model lain dan masukkan API key-nya'));
assert.ok(source.includes("providerName().toUpperCase()+' CLOUD'"));

const start = source.indexOf('function buildVisionFallbackMetadata(allowed){');
const end = source.indexOf('async function analyzeVision(){', start);
assert.ok(start >= 0 && end > start, 'fallback builder must be present before analyzeVision');
const functionSource = source.slice(start, end).trim();
const fields = {
  visualMotionPrompt: { value: 'A red sports car drives through a neon city at night.' },
  svgAiPrompt: { value: 'Cinematic automotive commercial, reflections and light trails.' },
  svgAiTheme: { value: 'Automotive' },
  svgAiCategory: { value: 'Automotive' },
  svgAiSpecific: { value: 'Neon city car commercial' },
  svgAiDetails: { value: 'Red paint, reflective wet asphalt' },
  svgAiThemeBrief: { value: 'Hero car reveal, dynamic tracking camera' },
  metadataSubject: { value: 'Sports car advertisement' }
};
const builder = vm.runInNewContext('(' + functionSource.replace(/^function buildVisionFallbackMetadata/, 'function') + ')', {
  $: id => fields[id] || null,
  Set
});
const result = builder(['Automotive', 'Food', 'Nature']);
assert.match(result.title, /red sports car/i);
assert.equal(result.category, 'Automotive');
assert.ok(result.keywords.includes('automotive'));
assert.match(result.description, /Main theme: Automotive/);
assert.match(result.description, /Additional details: Red paint/);
assert.match(result.description, /Automatic theme specifications: Hero car reveal/);
assert.deepEqual(Array.from(result.visible_objects), []);
assert.match(result.visual_summary, /tidak tersedia/);
assert.match(result.confidence_notes, /Fallback tekstual saja/);

fields.visualMotionPrompt.value = '';
fields.svgAiPrompt.value = '';
fields.svgAiTheme.value = '';
fields.svgAiCategory.value = '';
fields.svgAiSpecific.value = '';
fields.svgAiDetails.value = '';
fields.svgAiThemeBrief.value = '';
fields.metadataSubject.value = '';
const emptyFallback = builder(['Automotive']);
assert.match(emptyFallback.title, /Original motion graphic concept/);
assert.equal(emptyFallback.category, '');
assert.deepEqual(Array.from(emptyFallback.keywords), []);
console.log('Browser Vision metadata fallback regression checks passed.');
