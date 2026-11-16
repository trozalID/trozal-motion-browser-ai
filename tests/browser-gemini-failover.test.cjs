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
assert.match(request, /Math\.min\(remainingAfterAttempt,30000,Math\.max\(backoff\+jitter,retryAfterMs\)\)/, 'retry delay must honor Retry-After within the remaining total budget');
assert.match(request, /externalSignal\?\.aborted/, 'caller cancellation must be propagated');
assert.match(request, /Math\.min\(Number\(timeoutMs\)\|\|90000,120000\)/, 'total request deadline must be capped at two minutes');
assert.match(request, /Math\.min\(30000,remaining\)/, 'each network attempt must have its own 30-second timeout');
assert.match(request, /attemptTimedOut/, 'a stalled attempt must be distinguished from caller cancellation');
assert.match(request, /totalTimedOut\|\|totalSignal\.aborted/, 'total timeout must stop retry flow');
assert.match(request, /Retry-After/, 'server retry hints must be honored');
assert.match(request, /HTTP 429[\s\S]*Retry otomatis dihentikan/, 'quota error must explain why retries stop');
assert.match(source, /function showSceneRecovery\(/, 'manual recovery UI must exist');
assert.match(source, /Salin brief lengkap/, 'manual recovery must preserve and expose the complete brief');
assert.match(source, /Buka HTML Terminal/, 'manual recovery must link to HTML Terminal');
assert.match(source, /Coba ulang Gemini/, 'manual recovery must allow a user-triggered retry');
assert.match(source, /Periksa koneksi & model/, 'manual recovery must expose model connectivity check');
console.log('Gemini failover policy and recovery static regression checks passed.');
