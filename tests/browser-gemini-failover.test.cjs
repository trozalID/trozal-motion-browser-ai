const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('browser-ai-gemini-cloud.js', 'utf8');
const requestStart = source.indexOf('async function requestJson(');
const requestEnd = source.indexOf('\n function requireKey()', requestStart);
assert.ok(requestStart >= 0 && requestEnd > requestStart, 'requestJson function must exist');
const request = source.slice(requestStart, requestEnd);

assert.match(request, /for\s*\(let attempt=0;attempt<3;attempt\+\+\)/, 'retry count must be bounded to three attempts');
assert.match(request, /response\.status===429[^\n]*\|\|response\.status===400[^\n]*\|\|response\.status===401[^\n]*\|\|response\.status===403[^\n]*\|\|response\.status===404/, 'quota/auth/model errors must stop retries');
assert.match(request, /response\.status<500&&response\.status!==408&&response\.status!==425/, 'ordinary client errors must not be retried');
assert.match(request, /2200\*Math\.pow\(2,attempt\)/, 'transient retries must use a sufficiently long exponential backoff');
assert.match(request, /Math\.min\(30000,Math\.max\(backoff\+jitter,retryAfterMs\)\)/, 'retry delay must honor Retry-After with a safe upper bound');
assert.match(request, /externalSignal\?\.aborted/, 'caller cancellation must be propagated');
assert.match(request, /timedOut\|\|signal\.aborted/, 'timeout must stop retry flow');
assert.match(request, /Retry-After/, 'server retry hints must be honored');
assert.match(request, /HTTP 429[\s\S]*Retry otomatis dihentikan/, 'quota error must explain why retries stop');
assert.match(source, /function showSceneRecovery\(/, 'manual recovery UI must exist');
assert.match(source, /Salin brief lengkap/, 'manual recovery must preserve and expose the complete brief');
assert.match(source, /Buka HTML Terminal/, 'manual recovery must link to HTML Terminal');
assert.match(source, /Coba ulang Gemini/, 'manual recovery must allow a user-triggered retry');
assert.match(source, /Periksa koneksi & model/, 'manual recovery must expose model connectivity check');
console.log('Gemini failover policy and recovery static regression checks passed.');

assert.match(source,/resizeDataUrl\(dataUrl,maxSide,quality\)/,'Vision resize must support an explicit JPEG quality');
assert.match(source,/resizeDataUrl\(await fileAsDataUrl\(file\),960,0\.74\)/,'Uploaded evidence must be resized to 960px at balanced JPEG quality');
assert.match(source,/resizeDataUrl\(canvas\.toDataURL\('image\/jpeg',0\.82\),960,0\.74\)/,'Preview evidence must use the balanced 960px profile');
assert.match(source,/payloadBytes\(\)>3\.5\*1024\*1024/,'Large combined evidence payload must trigger compact fallback');
assert.match(source,/resizeDataUrl\('data:'\+image\.mime_type\+';base64,'\+image\.data,768,0\.68\)/,'Large evidence must be recompressed to compact 768px images');
assert.match(source,/Gemini belum merespons dalam/,'Timeout message must explain slow model/network and safe retry');
