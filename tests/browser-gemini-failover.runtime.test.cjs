const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('browser-ai-gemini-cloud.js', 'utf8');
const start = source.indexOf(' async function requestJson(url,options,timeoutMs){');
const end = source.indexOf('\n function requireKey(){', start);
assert.ok(start >= 0 && end > start, 'requestJson implementation must exist');
const fnText = source.slice(start, end).trim().replace(/^async function requestJson/, 'async function');
function buildRequestJson(fetchImpl) {
  return vm.runInNewContext('(' + fnText + ')', {
    fetch: fetchImpl, AbortController, setTimeout, clearTimeout, Math, Date,
    Promise, Error, TypeError, friendlyApiError: (response, payload) =>
      response.status === 429 ? 'Kuota Gemini' : 'HTTP ' + response.status + ': ' + (payload.error?.message || '')
  });
}
const response = (status, payload = {}, headers = {}) => ({
  ok: status >= 200 && status < 300, status, statusText: 'test',
  headers: { get: name => headers[name] || headers[name.toLowerCase()] || null },
  json: async () => payload
});
(async () => {
  let calls = 0;
  const retrySuccess = buildRequestJson(async () => ++calls === 1 ? response(503, { error: { message: 'temporary' } }) : response(200, { ok: true }));
  assert.deepEqual(await retrySuccess('/test', {}, 10000), { ok: true });
  assert.equal(calls, 2, 'transient server error must retry and then succeed');

  calls = 0;
  const quota = buildRequestJson(async () => { calls++; return response(429, { error: { message: 'quota' } }); });
  await assert.rejects(() => quota('/test', {}, 3000), /HTTP 429|Kuota|rate limit/i);
  assert.equal(calls, 1, 'HTTP 429 must not be retried');

  calls = 0;
  const serverFailure = buildRequestJson(async () => { calls++; return response(503, { error: { message: 'offline' } }); });
  await assert.rejects(() => serverFailure('/test', {}, 12000), /setelah 3 percobaan/i);
  assert.equal(calls, 3, 'server failures must stop after three attempts');

  const caller = new AbortController();
  let abortedCalls = 0;
  const abortingFetch = buildRequestJson((_url, options) => new Promise((resolve, reject) => {
    abortedCalls++;
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const pending = abortingFetch('/test', { signal: caller.signal }, 5000);
  setTimeout(() => caller.abort(), 20);
  await assert.rejects(() => pending, /dibatalkan oleh pengguna/i);
  assert.equal(abortedCalls, 1, 'caller cancellation must stop the request immediately');

  let timeoutCalls = 0;
  const timeoutRequest = buildRequestJson((_url, options) => new Promise((resolve, reject) => {
    timeoutCalls++;
    options.signal.addEventListener('abort', () => reject(new Error('timed out')), { once: true });
  }));
  await assert.rejects(() => timeoutRequest('/test', {}, 1000), /melewati batas waktu|belum merespons/i);
  assert.equal(timeoutCalls, 1, 'request timeout must abort without retrying');

  console.log('Gemini failover runtime regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
