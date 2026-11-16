const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(600000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:4173/__ffmpeg_smoke__.html', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const logs = [];
      const packageRoot = new URL('/vendor/ffmpeg/', location.origin).href;
      const { FFmpeg } = await import(packageRoot + 'index.js');
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }) => {
        if (message) logs.push(String(message));
      });

      const fetchObjectUrl = async (url, type) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(String(url) + ' returned HTTP ' + response.status);
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength) throw new Error(String(url) + ' is empty');
        return URL.createObjectURL(new Blob([bytes], { type }));
      };

      const inspect = async file => {
        logs.length = 0;
        const exitCode = await ffmpeg.exec(['-hide_banner', '-i', file], 30000);
        return { exitCode, text: logs.join('\n') };
      };

      let coreUrl = '';
      let wasmUrl = '';
      try {
        coreUrl = await fetchObjectUrl('/vendor/prores-core/ffmpeg-core.js', 'text/javascript');
        wasmUrl = await fetchObjectUrl('/vendor/prores-core/ffmpeg-core.wasm', 'application/wasm');
        await ffmpeg.load({
          classWorkerURL: '/vendor/ffmpeg/worker.js',
          coreURL: coreUrl,
          wasmURL: wasmUrl
        });

        logs.length = 0;
        const encoderExitCode = await ffmpeg.exec(['-hide_banner', '-encoders'], 30000);
        const encoderList = logs.join('\n');
        if (encoderExitCode !== 0) throw new Error('FFmpeg -encoders exited ' + encoderExitCode);
        if (!/libx264/.test(encoderList)) throw new Error('Custom core does not expose libx264');
        if (!/prores_ks/.test(encoderList)) throw new Error('Custom core does not expose prores_ks');

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = 'rgba(255, 40, 20, 0.65)';
        ctx.fillRect(4, 4, 56, 56);
        ctx.fillStyle = 'rgba(20, 90, 255, 0.35)';
        ctx.fillRect(20, 20, 28, 28);
        const pngBlob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas PNG creation failed')), 'image/png');
        });
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        for (let i = 0; i < 30; i++) {
          const name = 'frame_' + String(i).padStart(6, '0') + '.png';
          await ffmpeg.writeFile(name, new Uint8Array(pngBytes));
        }

        logs.length = 0;
        const mp4ExitCode = await ffmpeg.exec([
          '-hide_banner', '-y', '-filter_threads', '1', '-filter_complex_threads', '1',
          '-framerate', '30', '-start_number', '0', '-i', 'frame_%06d.png',
          '-frames:v', '30', '-r', '30', '-an',
          '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'high',
          '-pix_fmt', 'yuv420p', '-b:v', '3000000', '-minrate', '2700000',
          '-maxrate', '3300000', '-bufsize', '6000000', '-threads', '1',
          '-movflags', '+faststart', 'smoke.mp4'
        ], 120000);
        if (mp4ExitCode !== 0) throw new Error('MP4 H.264 encode exited ' + mp4ExitCode + ': ' + logs.slice(-15).join('\n'));
        const mp4Bytes = await ffmpeg.readFile('smoke.mp4');
        if (mp4Bytes.length < 1024 || String.fromCharCode(...mp4Bytes.slice(4, 8)) !== 'ftyp') {
          throw new Error('MP4 output is invalid or too small (' + mp4Bytes.length + ' bytes)');
        }
        const mp4Metadata = await inspect('smoke.mp4');
        if (!/Video:\s*h264/i.test(mp4Metadata.text)) throw new Error('MP4 metadata did not identify H.264: ' + mp4Metadata.text.slice(-1000));

        logs.length = 0;
        const movExitCode = await ffmpeg.exec([
          '-hide_banner', '-y', '-filter_threads', '1', '-filter_complex_threads', '1',
          '-framerate', '30', '-start_number', '0', '-i', 'frame_%06d.png',
          '-frames:v', '30', '-r', '30', '-an',
          '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le',
          '-alpha_bits', '16', '-vendor', 'apl0', '-threads', '1', 'smoke.mov'
        ], 120000);
        if (movExitCode !== 0) throw new Error('ProRes encode exited ' + movExitCode + ': ' + logs.slice(-15).join('\n'));
        const movBytes = await ffmpeg.readFile('smoke.mov');
        if (movBytes.length < 1024 || String.fromCharCode(...movBytes.slice(4, 8)) !== 'ftyp') {
          throw new Error('MOV output is invalid or too small (' + movBytes.length + ' bytes)');
        }
        const movMetadata = await inspect('smoke.mov');
        const isProRes4444 = /Video:\s*prores\s*\(4444\)/i.test(movMetadata.text)
          || /Video:\s*prores\s*\([^)]*4444/i.test(movMetadata.text);
        const hasAlphaFormat = /yuva444p(?:10|12)le/i.test(movMetadata.text);
        if (!isProRes4444 || !hasAlphaFormat) {
          throw new Error('MOV metadata did not confirm ProRes 4444 + alpha: ' + movMetadata.text.slice(-1200));
        }

        return {
          encoders: ['libx264', 'prores_ks'],
          mp4Bytes: mp4Bytes.length,
          mp4Metadata: mp4Metadata.text.slice(-1200),
          movBytes: movBytes.length,
          movMetadata: movMetadata.text.slice(-1200)
        };
      } finally {
        try { ffmpeg.terminate(); } catch (_) {}
        if (coreUrl) URL.revokeObjectURL(coreUrl);
        if (wasmUrl) URL.revokeObjectURL(wasmUrl);
      }
    }, { timeout: 600000 });

    assert.deepEqual(pageErrors, [], 'Browser page errors: ' + pageErrors.join('; '));
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
