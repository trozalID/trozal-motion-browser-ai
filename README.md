# TROZAL MOTION — Browser AI Edition

Browser-based motion graphics editor with local FFmpeg.wasm processing. The intended output path is QuickTime MOV / Apple ProRes 4444 with alpha.

## What the workflow does

On relevant pull requests, GitHub Actions builds the same Pages asset bundle and runs browser-level MP4/ProRes smoke tests without publishing the site. On every push to `main` (or manual workflow dispatch), the same workflow also deploys the verified bundle to GitHub Pages:

1. Copies the editor into a static Pages site.
2. Vendors `@ffmpeg/ffmpeg@0.12.15` worker modules and JSZip into the same origin.
3. Clones the FFmpeg.wasm v12.15 source.
4. Keeps the upstream `libx264` build and adds explicit configure flags for `prores_ks`, PNG decode, image2 demuxing, MOV muxing, and the file protocol.
5. Builds the single-threaded WebAssembly core with Docker using `make prd`.
6. Publishes the site and core to GitHub Pages.

## First-time Pages setup

Open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Then push to `main` or run the workflow manually from **Actions → Build ProRes WASM and Deploy GitHub Pages**.

The authoritative public URL is shown in this repository under **Settings → Pages** after GitHub Pages is enabled. This Browser AI repository must use its own Pages URL; do not use the separate Ollama repository's Pages URL.

## Export formats

- **WebM** — native browser MediaRecorder.
- **MP4 H.264** — FFmpeg.wasm, with locally hosted worker/core files.
- **MOV ProRes 4444 + Alpha** — custom local WASM core using `prores_ks`, profile 4, `yuva444p10le`, and `-alpha_bits 16`.
- **PNG Sequence ZIP** — transparent PNG frames.

The app only reports ProRes as successful after FFmpeg inspects the generated MOV and confirms the ProRes 4444 codec and alpha-capable `yuva444p10le` pixel format. A successful workflow build alone is not proof that export works in every browser. Test first at 1280×720, 10 seconds, 30 FPS.

## Resource notes

The FFmpeg core is downloaded by the browser from this repository's GitHub Pages origin on first use. It runs in the user's browser; frames are not uploaded to a paid rendering service. 4K or long renders can require substantial browser memory.

## Browser AI — Gemini Cloud only

This repository's AI features use the Google Gemini Cloud API. No AI model is downloaded to or inferred on the user's PC. This Browser edition does not use Ollama, TROZAL Bridge, local inference, or WebGPU model inference.

### AI Scene Composer

1. Open TROZAL MOTION and expand **TROZAL AI SCENE COMPOSER · GEMINI CLOUD**.
2. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
3. Paste the key into the shared Gemini API key field and press **Periksa Koneksi**.
4. Choose a Gemini model, enter the visual brief, and press **GENERATE ADEGAN DENGAN GEMINI**.
5. Review the generated HTML/SVG in the composer preview. Use **Kirim ke Preview TROZAL** to load it into the main motion editor.

### Browser Vision metadata

Use the same API key and model. Select up to three PNG/JPG/WebP screenshots, or let TROZAL capture three samples from the main Preview at 0%, 50%, and 85% of the duration. Press **ANALISIS VISUAL DENGAN GEMINI CLOUD**. The result is a draft based on the supplied sample images and must be reviewed before export.

### Privacy and limits

- Provider API keys can be stored per provider in this browser profile using localStorage so they persist after refresh. Switching providers does not delete other providers' keys. This is convenience storage, not a secure secret vault; JavaScript running on the app origin can access the stored values.
- The visual brief and any submitted screenshots are sent to Google Gemini Cloud for inference. Do not submit confidential or sensitive material.
- API quota, availability, and charges depend on the Google AI account and selected model.
- The procedural SVG fallback is template-based and does not call an AI service.

The app does not bundle a local language or vision model. It needs internet connectivity and a valid Gemini API key for generative AI and vision features.

## Licensing

The custom FFmpeg core contains GPL-enabled FFmpeg components. See `THIRD_PARTY_NOTICES.md` for upstream sources and license notes.
