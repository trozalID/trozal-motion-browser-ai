const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');

for (const id of ['mp4Bitrate', 'mp4BitrateEstimate']) {
  assert.ok(html.includes('id="' + id + '"'), 'Missing MP4 bitrate UI: ' + id);
}
for (const value of ['12','20','35','45','60','80']) {
  assert.ok(html.includes('<option value="' + value + '"'), 'Missing bitrate preset ' + value + ' Mbps');
}
assert.ok(html.includes("'-b:v',String(targetBitrate)"), 'Manual bitrate must reach FFmpeg -b:v');
assert.ok(html.includes("'-minrate',String(Math.round(targetBitrate*.9))"), 'Manual bitrate must set minimum rate');
assert.ok(html.includes("'-maxrate',String(Math.round(targetBitrate*1.1))"), 'Manual bitrate must set maximum rate');
assert.ok(html.includes("'mp4Crf','mp4Bitrate'"), 'Bitrate selection must persist in project settings');
assert.ok(html.includes('function updateMp4BitrateEstimate()'), 'Missing bitrate size estimate');

const policy = [
  'INTELLECTUAL PROPERTY & ORIGINALITY POLICY',
  'copyrighted characters',
  'logos',
  'trademarks',
  'original visual content'
];
for (const phrase of policy) {
  assert.ok(html.toLowerCase().includes(phrase.toLowerCase()), 'Missing IP policy phrase: ' + phrase);
}
if (fs.existsSync('browser-ai.js')) {
  const ai = fs.readFileSync('browser-ai.js', 'utf8');
  assert.ok(ai.includes('TROZAL_IP_SAFETY_POLICY'), 'Browser AI scene engine must include IP policy');
  assert.ok((ai.match(/TROZAL_IP_SAFETY_POLICY/g) || []).length >= 3, 'Policy must be attached to both storyboard and scene-generation system prompts');
}

console.log('MP4 bitrate and IP prompt guardrail regression checks passed.');
