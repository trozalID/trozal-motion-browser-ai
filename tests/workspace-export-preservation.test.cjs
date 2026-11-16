const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');

function countId(id) {
  return (html.match(new RegExp('\\\\bid=["\\\\\\']' + id + '["\\\\\\']', 'g')) || []).length;
}
for (const id of ['stage', 'timelineTabs', 'multiTrackEditor', 'svgTerminalPanel', 'renderBtn', 'cancelRenderBtn', 'format', 'resolution', 'proresMode']) {
  assert.equal(countId(id), 1, 'Core workspace/export control must exist exactly once: #' + id);
}
assert.match(html, /id=["']format["'][^>]*>[\\s\\S]*?value=["']webm["'][\\s\\S]*?value=["']mp4["'][\\s\\S]*?value=["']mov["'][\\s\\S]*?value=["']pngseq["']/i,
  'WebM, MP4/H.264, MOV/ProRes 4444 Alpha and PNG Sequence exports must remain available');
assert.match(html, /id=["']resolution["'][^>]*>[\\s\\S]*?value=["']3840x2160["']/i,
  '4K UHD 3840x2160 output option must remain available');
assert.match(html, /id=["']proresMode["'][^>]*>[\\s\\S]*?ProRes 4444/i,
  'Transparent ProRes 4444 mode must remain available');
assert.match(html, /id=["']proresMode["'][^>]*>[\\s\\S]*?PNG Sequence ZIP/i,
  'Transparent PNG Sequence mode must remain available');
assert.match(html, /id=["']stage["']/, 'Central preview stage must remain in the document');
assert.match(html, /class=["'][^"']*timeline[^"']*["']/, 'Timeline must remain in the document');
assert.match(html, /id=["']multiTrackEditor["']/, 'MultiTrack editor must remain in the document');
assert.match(html, /id=["']svgTerminalPanel["']/, 'HTML terminal must remain in the document');
assert.match(html, /id=["'](?:renderSyncAdvisorPanel|ollamaRenderAdvisor)["']/, 'Render performance advisor must remain in the document');
console.log('Workspace and export preservation guard passed: center preview, timeline, MultiTrack, HTML terminal, performance advisor, 4K, MP4, ProRes 4444 Alpha and PNG Sequence.');
