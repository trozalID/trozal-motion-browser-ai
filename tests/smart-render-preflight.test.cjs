const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function load(deviceMemory = 16, hardwareConcurrency = 12) {
  const window = {};
  const document = {
    readyState: 'loading',
    addEventListener() {},
    querySelector() { return null; }
  };
  const navigator = { deviceMemory, hardwareConcurrency };
  vm.runInNewContext(fs.readFileSync('smart-render-preflight.js', 'utf8'), {
    window, document, navigator, Math, Number, Object, String, Array
  });
  return window.TrozalSmartRenderPreflight;
}

test('estimates 4K render frames and RGBA working set without changing output settings', () => {
  const api = load();
  const result = api.estimate({ width: 3840, height: 2160, fps: 30, duration: 3, batchFrames: 2 });
  assert.equal(result.totalFrames, 90);
  assert.equal(result.width, 3840);
  assert.equal(result.height, 2160);
  assert.ok(result.frameMiB > 31 && result.frameMiB < 32);
  assert.ok(result.workingSetMiB > 126 && result.workingSetMiB < 127);
  assert.equal(result.memoryRisk, 'low');
});

test('flags a conservative high-memory estimate for large batches', () => {
  const api = load(2, 4);
  const result = api.estimate({ width: 7680, height: 4320, fps: 60, duration: 10, batchFrames: 8 });
  assert.equal(result.memoryRisk, 'high');
});

test('rejects invalid or excessive render dimensions', () => {
  const api = load();
  assert.throws(() => api.estimate({ width: 20000, height: 1080 }), /tidak valid/);
  assert.throws(() => api.estimate({ width: 0, height: 1080 }), /tidak valid/);
});
