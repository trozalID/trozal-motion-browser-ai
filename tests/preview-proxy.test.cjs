const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function load(saved = null, initial = '0.5') {
  const listeners = {};
  const values = {};
  const select = { value: initial, addEventListener(name, fn) { listeners[name] = fn; } };
  const window = {
    localStorage: { getItem() { return saved; }, setItem(key, value) { values[key] = value; } },
    dispatchEvent(event) { window.lastEvent = event; }
  };
  const document = { getElementById(id) { return id === 'previewProxyScale' ? select : null; } };
  const context = { window, document, CustomEvent: function(name, options) { this.type = name; this.detail = options.detail; } };
  vm.runInNewContext(fs.readFileSync('preview-proxy.js', 'utf8'), context);
  return { api: window.TrozalPreviewProxy, select, listeners, values, window };
}

test('defaults to balanced preview backing scale', () => {
  const { api, select } = load();
  assert.equal(api.getScale(), 0.5);
  assert.equal(select.value, '0.5');
  assert.equal(api.getStatus().target, 'preview-effects-canvas-only');
});

test('restores a saved valid scale and updates it on user change', () => {
  const { api, select, listeners, values, window } = load('0.25');
  assert.equal(api.getScale(), 0.25);
  select.value = '1';
  listeners.change();
  assert.equal(api.getScale(), 1);
  assert.equal(values['trozal-preview-proxy-scale'], '1');
  assert.equal(window.lastEvent.type, 'trozal:preview-proxy-change');
});

test('ignores invalid persisted and selected scales', () => {
  const { api, select, listeners } = load('8');
  assert.equal(api.getScale(), 0.5);
  select.value = '0.125';
  listeners.change();
  assert.equal(api.getScale(), 0.5);
});
