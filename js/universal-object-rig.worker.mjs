/* TROZAL MOTION · SAM 2.1 Tiny WebGPU worker
 * Browser-local, promptable image segmentation. Model weights are cached with CacheStorage.
 */
const MODEL_REV = "35d3b0491040aa135a84f8b7b3093ac532ff8e2c";
const MODEL_BASE = "https://huggingface.co/Geo-IA/evo-sam2.1-onnx/resolve/" + MODEL_REV + "/sam2.1_hiera_tiny/";
const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
const ENCODER_URL = MODEL_BASE + "vision_encoder_fp16.onnx";
const DECODER_URL = MODEL_BASE + "prompt_encoder_mask_decoder_fp16.onnx";
const CACHE_NAME = "trozal-sam21-tiny-v1";
const MODEL_SIDE = 1024;
let ort = null, encoder = null, decoder = null, embedding = null, sourceWidth = 0, sourceHeight = 0;

function postProgress(id, message, ratio) {
  self.postMessage({ id, type: "progress", message: String(message || ""), ratio: Number.isFinite(ratio) ? ratio : null });
}
async function fetchModel(url, id, label, baseRatio) {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        const buf = await cached.arrayBuffer();
        postProgress(id, label + " ditemukan di cache browser (" + Math.round(buf.byteLength / 1048576) + " MB).", baseRatio + 0.42);
        return buf;
      }
    } catch (_) {}
  }
  postProgress(id, "Mengunduh " + label + " untuk pertama kali…", baseRatio);
  const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
  if (!response.ok) throw new Error("Unduhan " + label + " gagal: HTTP " + response.status);
  const length = Number(response.headers.get("content-length")) || 0;
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;
  let buffer;
  if (!reader) {
    buffer = await response.arrayBuffer();
  } else {
    const chunks = [];
    let received = 0;
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      chunks.push(item.value);
      received += item.value.byteLength;
      const ratio = length > 0 ? Math.min(0.4, received / length * 0.4) : 0.12;
      postProgress(id, "Mengunduh " + label + ": " + Math.round(received / 1048576) + " MB", baseRatio + ratio);
    }
    const joined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    buffer = joined.buffer;
  }
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, new Response(buffer.slice(0), { headers: { "Content-Type": "application/octet-stream" } }));
    } catch (_) {}
  }
  return buffer;
}
async function init(id) {
  if (encoder && decoder) return { backend: "webgpu", cached: true };
  if (!("gpu" in navigator) || !navigator.gpu) throw new Error("WebGPU tidak tersedia di browser ini. Gunakan Chrome/Edge terbaru dengan akselerasi hardware aktif.");
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("Browser tidak menemukan adapter WebGPU. Periksa driver GPU dan Hardware Acceleration.");
  postProgress(id, "Memuat ONNX Runtime WebGPU…", 0.03);
  ort = await import(ORT_BASE + "ort.webgpu.min.mjs");
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = "warning";
  const encBuffer = await fetchModel(ENCODER_URL, id, "SAM 2.1 Tiny vision encoder", 0.08);
  const decBuffer = await fetchModel(DECODER_URL, id, "SAM 2.1 Tiny prompt decoder", 0.54);
  postProgress(id, "Menyiapkan sesi GPU encoder…", 0.91);
  encoder = await ort.InferenceSession.create(new Uint8Array(encBuffer), {
    executionProviders: ["webgpu"],
    graphOptimizationLevel: "all",
    enableMemPattern: false
  });
  postProgress(id, "Menyiapkan sesi GPU mask decoder…", 0.96);
  decoder = await ort.InferenceSession.create(new Uint8Array(decBuffer), {
    executionProviders: ["webgpu"],
    graphOptimizationLevel: "all",
    enableMemPattern: false
  });
  const required = ["input_points", "input_labels", "image_embeddings.0", "image_embeddings.1", "image_embeddings.2", "input_masks", "has_mask_input"];
  const missing = required.filter(name => !decoder.inputNames.includes(name));
  if (missing.length) throw new Error("Kontrak SAM decoder tidak cocok. Input hilang: " + missing.join(", "));
  postProgress(id, "SAM 2.1 Tiny siap di WebGPU.", 1);
  return { backend: "webgpu", encoderInputs: encoder.inputNames, encoderOutputs: encoder.outputNames, decoderInputs: decoder.inputNames };
}
function makeImageTensor(id, payload) {
  const w = Number(payload.width), h = Number(payload.height), data = new Uint8ClampedArray(payload.data);
  if (!w || !h || data.length < w * h * 4) throw new Error("Data gambar untuk SAM tidak valid.");
  sourceWidth = w; sourceHeight = h;
  const scale = MODEL_SIDE / Math.max(w, h);
  const rw = Math.max(1, Math.round(w * scale)), rh = Math.max(1, Math.round(h * scale));
  const canvas = new OffscreenCanvas(MODEL_SIDE, MODEL_SIDE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas tidak tersedia.");
  const inputCanvas = new OffscreenCanvas(w, h);
  const inputCtx = inputCanvas.getContext("2d");
  inputCtx.putImageData(new ImageData(data, w, h), 0, 0);
  ctx.drawImage(inputCanvas, 0, 0, rw, rh);
  const rgba = ctx.getImageData(0, 0, MODEL_SIDE, MODEL_SIDE).data;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const plane = MODEL_SIDE * MODEL_SIDE, tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const p = i * 4;
    tensor[i] = (rgba[p] / 255 - mean[0]) / std[0];
    tensor[plane + i] = (rgba[p + 1] / 255 - mean[1]) / std[1];
    tensor[plane * 2 + i] = (rgba[p + 2] / 255 - mean[2]) / std[2];
  }
  return { tensor, resizedWidth: rw, resizedHeight: rh };
}
async function encode(id, payload) {
  if (!encoder) throw new Error("SAM belum diinisialisasi.");
  const prepared = makeImageTensor(id, payload);
  postProgress(id, "Membuat embedding gambar di GPU…", 0.2);
  const inputName = encoder.inputNames[0];
  const input = new ort.Tensor("float32", prepared.tensor, [1, 3, MODEL_SIDE, MODEL_SIDE]);
  const output = await encoder.run({ [inputName]: input });
  const features = encoder.outputNames.map(name => ({ name, tensor: output[name] })).filter(x => x.tensor && x.tensor.dims && x.tensor.dims.length === 4);
  if (features.length < 3) throw new Error("Encoder SAM tidak menghasilkan tiga feature map yang dibutuhkan decoder.");
  features.sort((a, b) => (b.tensor.dims[2] * b.tensor.dims[3]) - (a.tensor.dims[2] * a.tensor.dims[3]));
  embedding = {};
  for (let i = 0; i < 3; i++) {
    const expected = [[1, 32, 256, 256], [1, 64, 128, 128], [1, 256, 64, 64]][i];
    const dims = features[i].tensor.dims;
    if (dims.some((v, k) => Number(v) !== expected[k])) {
      throw new Error("Ukuran feature encoder SAM tidak sesuai: " + features[i].name + " " + dims.join("×"));
    }
    embedding["image_embeddings." + i] = features[i].tensor;
  }
  postProgress(id, "Embedding gambar tersimpan; komponen dapat dipisahkan satu per satu.", 1);
  return { width: sourceWidth, height: sourceHeight, modelSide: MODEL_SIDE };
}
async function segment(id, prompt) {
  if (!decoder || !embedding) throw new Error("Encoder gambar belum siap.");
  let coords = [], labels = [];
  if (prompt.box) {
    const box = prompt.box;
    const sx = MODEL_SIDE / Math.max(sourceWidth, sourceHeight);
    coords = [[box.x * sx, box.y * sx], [(box.x + box.w) * sx, (box.y + box.h) * sx]];
    labels = [2, 3];
  } else if (prompt.point) {
    const sx = MODEL_SIDE / Math.max(sourceWidth, sourceHeight);
    coords = [[prompt.point.x * sx, prompt.point.y * sx]];
    labels = [1];
  } else {
    throw new Error("Segmentasi memerlukan kotak komponen atau titik pilihan.");
  }
  const points = new Float32Array(coords.length * 2);
  const labelData = new BigInt64Array(labels.length);
  coords.forEach((p, i) => { points[i * 2] = Math.max(0, Math.min(MODEL_SIDE, p[0])); points[i * 2 + 1] = Math.max(0, Math.min(MODEL_SIDE, p[1])); labelData[i] = BigInt(labels[i]); });
  const feeds = {
    input_points: new ort.Tensor("float32", points, [1, 1, coords.length, 2]),
    input_labels: new ort.Tensor("int64", labelData, [1, 1, labels.length]),
    "image_embeddings.0": embedding["image_embeddings.0"],
    "image_embeddings.1": embedding["image_embeddings.1"],
    "image_embeddings.2": embedding["image_embeddings.2"],
    input_masks: new ort.Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256]),
    has_mask_input: new ort.Tensor("float32", new Float32Array([0]), [1])
  };
  const result = await decoder.run(feeds);
  const logits = result.pred_masks && result.pred_masks.data;
  const scores = result.iou_scores && result.iou_scores.data;
  if (!logits || logits.length < 256 * 256) throw new Error("Decoder SAM tidak mengembalikan mask valid.");
  // Output slot 0 is the official single-mask path; slots 1-3 are alternate hypotheses.
  const mask = new Float32Array(logits.slice(0, 256 * 256));
  const score = scores && scores.length ? Number(scores[0]) : 0;
  return { mask, score, width: 256, height: 256 };
}
self.onmessage = async event => {
  const message = event.data || {}, id = message.id;
  try {
    let result;
    if (message.method === "init") result = await init(id);
    else if (message.method === "encode") result = await encode(id, message.payload || {});
    else if (message.method === "segment") result = await segment(id, message.payload || {});
    else if (message.method === "dispose") {
      if (encoder) await encoder.release();
      if (decoder) await decoder.release();
      encoder = decoder = ort = embedding = null;
      result = { disposed: true };
    } else throw new Error("Perintah worker tidak dikenal: " + message.method);
    const transfer = result && result.mask ? [result.mask.buffer] : [];
    self.postMessage({ id, ok: true, result }, transfer);
  } catch (error) {
    self.postMessage({ id, ok: false, error: error && error.message ? error.message : String(error) });
  }
};
