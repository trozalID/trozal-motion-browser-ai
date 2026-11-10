# Third-party notices

## FFmpeg and FFmpeg.wasm

The ProRes core is built from the FFmpeg.wasm project (tag `v12.15`) and its bundled FFmpeg source (the upstream Dockerfile declares FFmpeg `n5.1.4`). The build enables GPL features and must be redistributed under the applicable FFmpeg GPL terms.

Upstream project: https://github.com/ffmpegwasm/ffmpeg.wasm  
FFmpeg source: https://github.com/FFmpeg/FFmpeg  
FFmpeg.wasm core build instructions: https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/website/docs/contribution/core.md

The GitHub Actions workflow records the configure additions used for ProRes: `--enable-encoder=prores_ks`, `--enable-decoder=png`, `--enable-demuxer=image2`, `--enable-muxer=mov`, and `--enable-protocol=file`.

The `@ffmpeg/ffmpeg` JavaScript wrapper is MIT licensed. The FFmpeg core is subject to FFmpeg's GPL terms because the upstream core is built with GPL-enabled options. Review the source project license files before redistribution.

## JSZip

JSZip 3.10.1 is included for PNG Sequence ZIP packaging. Upstream: https://github.com/Stuk/jszip (MIT license).


## Browser AI runtime
Any WebLLM / Transformers.js runtime and model assets added in this edition must retain their respective license notices and model licenses. No model weights are bundled in this initial migration commit.
