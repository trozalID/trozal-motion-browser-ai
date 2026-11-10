# TROZAL MOTION — Browser AI Edition

Browser-based motion graphics editor with local FFmpeg.wasm processing. The intended output path is QuickTime MOV / Apple ProRes 4444 with alpha.

## What the workflow does

On every push to `main` (or manual workflow dispatch), GitHub Actions:

1. Copies the editor into a static Pages site.
2. Vendors `@ffmpeg/ffmpeg@0.12.15` worker modules and JSZip into the same origin.
3. Clones the FFmpeg.wasm v12.15 source.
4. Adds explicit configure flags for `prores_ks`, PNG decode, image2 demuxing, MOV muxing, and the file protocol.
5. Builds the single-threaded WebAssembly core with Docker using `make prd`.
6. Publishes the site and core to GitHub Pages.

## First-time Pages setup

Open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Then push to `main` or run the workflow manually from **Actions → Build ProRes WASM and Deploy GitHub Pages**.

Expected public site URL:

`https://irzalbudiman2-cell.github.io/trozal-motion-web-prores/`

## Export formats

- **WebM** — native browser MediaRecorder.
- **MP4 H.264** — FFmpeg.wasm, with locally hosted worker/core files.
- **MOV ProRes 4444 + Alpha** — custom local WASM core using `prores_ks`, profile 4, `yuva444p10le`, and `-alpha_bits 16`.
- **PNG Sequence ZIP** — transparent PNG frames.

The app only reports ProRes as successful after FFprobe verifies the codec, profile 4444, and alpha-capable pixel format. A successful workflow build alone is not proof that export works in every browser. Test first at 1280×720, 10 seconds, 30 FPS.

## Resource notes

The FFmpeg core is downloaded by the browser from this repository's GitHub Pages origin on first use. It runs in the user's browser; frames are not uploaded to a paid rendering service. 4K or long renders can require substantial browser memory.

## Local AI Vision metadata (no paid API)

TROZAL MOTION can analyze actual preview frames using a local Ollama model. The recommended starting model for a 16 GB RAM / GTX 1660 Super PC is `qwen3-vl:2b`. No OpenAI API key is required and image analysis runs on the user's computer.

1. Install Ollama for Windows: https://ollama.com/download/windows
2. Run `TROZAL_LOCAL_VISION_SETUP.bat` from this repository. It configures the GitHub Pages origin and downloads `qwen3-vl:2b`.
3. Quit Ollama from the system tray and restart it.
4. Open the site, expand the TROZAL LOCAL VISION panel, and click **Cek Ollama**.
5. Click **Analisis Visual Sebenarnya** to analyze three preview frames, or select up to four screenshots.

See [TROZAL_LOCAL_VISION.md](TROZAL_LOCAL_VISION.md) for setup, privacy, and troubleshooting details. Metadata is an AI draft and should be reviewed before export.

## Licensing

The custom FFmpeg core contains GPL-enabled FFmpeg components. See `THIRD_PARTY_NOTICES.md` for upstream sources and license notes.


## Browser AI edition
This repository is the separate browser-first edition. The legacy Ollama/Bridge setup files are intentionally not included. Browser AI integration is being migrated and validated in stages; do not assume AI inference is active until the WebGPU runtime is added and tested.
