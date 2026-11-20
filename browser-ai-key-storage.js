/* TROZAL MOTION · per-provider API key persistence.
 * Keys stay in this browser profile only. Never log or transmit them from this module.
 */
(function () {
  'use strict';
  const STORAGE_KEY = 'trozalBrowserAiProviderKeys.v1';
  const fields = {
    gemini: 'trozalGeminiApiKey',
    openai: 'trozalOpenAiKey',
    anthropic: 'trozalAnthropicKey',
    groq: 'trozalGroqKey',
    mistral: 'trozalMistralKey'
  };

  function readStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }
  function writeStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (_) { return false; }
  }
  function boot() {
    const store = readStore();
    Object.entries(fields).forEach(([provider, id]) => {
      const input = document.getElementById(id);
      if (!input) return;
      if (typeof store[provider] === 'string' && !input.value) input.value = store[provider];
      input.addEventListener('input', () => {
        const next = readStore();
        next[provider] = input.value;
        const ok = writeStore(next);
        const status = document.getElementById('trozalProviderStatus');
        if (status) status.textContent = ok
          ? 'API key ' + provider + ' tersimpan lokal di browser ini.'
          : 'Penyimpanan lokal tidak tersedia. Periksa mode privat atau pengaturan browser.';
      });
    });

    const providerSelect = document.getElementById('trozalAiProvider');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        const status = document.getElementById('trozalProviderStatus');
        if (!status) return;
        if (provider === 'webgpu') status.textContent = 'Local WebGPU tidak memerlukan API key. Key cloud tetap tersimpan lokal.';
        else {
          const id = fields[provider];
          const present = id && document.getElementById(id)?.value;
          status.textContent = present
            ? 'Key ' + provider + ' tersedia dan tetap tersimpan di browser ini.'
            : 'Belum ada key tersimpan untuk ' + provider + '. Masukkan key pada kolom provider tersebut.';
        }
      });
    }

    const geminiClearButton = document.getElementById('trozalGeminiClearKeyBtn');
    if (geminiClearButton) geminiClearButton.addEventListener('click', () => {
      const next = readStore();
      delete next.gemini;
      writeStore(next);
    });

    const clearButton = document.getElementById('trozalProviderClearBtn');
    if (clearButton) clearButton.addEventListener('click', () => {
      const next = readStore();
      ['openai', 'anthropic', 'groq', 'mistral'].forEach(provider => {
        delete next[provider];
        const input = document.getElementById(fields[provider]);
        if (input) input.value = '';
      });
      const ok = writeStore(next);
      const status = document.getElementById('trozalProviderStatus');
      if (status) status.textContent = ok
        ? 'Semua key alternatif telah dihapus dari penyimpanan lokal. Key Gemini tidak diubah.'
        : 'Tidak dapat memperbarui penyimpanan lokal browser.';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
