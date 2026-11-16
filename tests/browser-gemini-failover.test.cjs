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
assert.match(request, /500\*Math\.pow\(2,attempt\)/, 'transient retries must use exponential backoff');
assert.match(request, /signal\.aborted\|\|error\?\.name==='AbortError'/, 'abort and timeout must stop retry flow');
assert.match(request, /HTTP 429[\s\S]*Retry otomatis dihentikan/, 'quota error must explain why retries stop');
assert.match(source, /function showSceneRecovery\(/, 'manual recovery UI must exist');
assert.match(source, /Salin brief lengkap/, 'manual recovery must preserve and expose the complete brief');
assert.match(source, /Buka HTML Terminal/, 'manual recovery must link to HTML Terminal');
console.log('Gemini failover policy and recovery static regression checks passed.');
