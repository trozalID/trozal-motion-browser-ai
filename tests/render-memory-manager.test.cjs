'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('render-memory-manager.js', 'utf8');
const context = vm.createContext({
  window: {},
  navigator: { deviceMemory: 8 },
  performance: { memory: { usedJSHeapSize: 100, jsHeapSizeLimit: 1000 } },
  document: { getElementById: () => null, createElement: () => ({}) }
});
vm.runInContext(source, context);
const manager = context.window.TrozalRenderMemoryManager;
assert.ok(manager, 'manager API must be exposed');
let plan = manager.getPlan({ width: 3840, height: 2160, requestedBatch: 4 });
assert.ok(plan.effectiveBatch >= 1 && plan.effectiveBatch <= 4);
assert.equal(plan.requestedBatch, 4);
assert.ok(plan.estimatedWorkingMiB > plan.frameMiB);
plan = manager.getPlan({ width: 1920, height: 1080, requestedBatch: 4, memory: { usedJSHeapSize: 950, jsHeapSizeLimit: 1000 } });
assert.equal(plan.effectiveBatch, 1, 'high JS heap pressure must force the smallest batch');
assert.equal(manager.recordAllocationFailure('Canvas out of memory'), true);
assert.equal(manager.getStatus().allocationFailures, 1);
plan = manager.getPlan({ width: 1920, height: 1080, requestedBatch: 4, deviceMemory: 16, memory: { usedJSHeapSize: 100, jsHeapSizeLimit: 1000 } });
assert.ok(plan.effectiveBatch <= 3, 'a prior allocation failure must reduce the next render batch');
assert.equal(manager.recordAllocationFailure('network timeout'), false);
manager.reset();
assert.equal(manager.getStatus().allocationFailures, 0);
console.log('PASS: adaptive batch planning, JS heap pressure, allocation-failure backoff, and reset.');
