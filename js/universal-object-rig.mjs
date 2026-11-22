/* TROZAL MOTION · Universal Object & Character Rig
 * SAM 2.1 Tiny ONNX inference runs locally in a module worker through WebGPU.
 * Vision metadata proposes semantic boxes; SAM produces the actual pixel masks.
 */
const MOTION_DEFAULTS = Object.freeze({
  swing: { amp: 0.18, speed: 1.2 },
  hinge: { amp: 0.34, speed: 0.8 },
  wheel: { amp: 1, speed: 4.2 },
  rotate: { amp: 1, speed: 1.4 },
  bob: { amp: 0.035, speed: 1.1 },
  float: { amp: 0.045, speed: 0.7 },
  pulse: { amp: 0.075, speed: 1.1 },
  static: { amp: 0, speed: 0 }
});
const VALID_MOTIONS = new Set(Object.keys(MOTION_DEFAULTS));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
}
function slug(value, fallback) {
  const text = String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 38);
  return text || fallback;
}
function readBox(component) {
  let raw = component && (component.bbox || component.box || component.bounds);
  if (Array.isArray(raw) && raw.length >= 4) raw = { x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
  if (!raw || typeof raw !== "object") return null;
  let x = Number(raw.x), y = Number(raw.y), w = Number(raw.w), h = Number(raw.h);
  if (raw.x1 != null && raw.y1 != null && raw.x2 != null && raw.y2 != null) {
    x = Number(raw.x1); y = Number(raw.y1); w = Number(raw.x2) - x; h = Number(raw.y2) - y;
  }
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  if (Math.max(Math.abs(x), Math.abs(y), Math.abs(w), Math.abs(h)) > 1.001) {
    const imageWidth = Number(component.imageWidth) || 1, imageHeight = Number(component.imageHeight) || 1;
    x /= imageWidth; w /= imageWidth; y /= imageHeight; h /= imageHeight;
  }
  x = clamp(x, 0, 1); y = clamp(y, 0, 1);
  w = clamp(w, 0.001, 1 - x); h = clamp(h, 0.001, 1 - y);
  if (w < 0.008 || h < 0.008) return null;
  return { x, y, w, h };
}
export function normalizeUniversalComponents(input) {
  if (!Array.isArray(input)) return [];
  const result = [], ids = new Set();
  for (let index = 0; index < input.length && result.length < 14; index++) {
    const item = input[index] || {};
    const bbox = readBox(item);
    const point = item.point && Number.isFinite(Number(item.point.x)) && Number.isFinite(Number(item.point.y))
      ? { x: clamp(item.point.x, 0, 1), y: clamp(item.point.y, 0, 1) } : null;
    if (!bbox && !point) continue;
    let id = slug(item.id || item.name, "component-" + (index + 1));
    if (ids.has(id)) id += "-" + (index + 1);
    ids.add(id);
    const motion = VALID_MOTIONS.has(String(item.motion || "").toLowerCase()) ? String(item.motion).toLowerCase() : "swing";
    const fallback = MOTION_DEFAULTS[motion];
    let pivot = null;
    if (Array.isArray(item.pivot) && item.pivot.length >= 2) {
      pivot = { x: clamp(item.pivot[0], 0, 1), y: clamp(item.pivot[1], 0, 1) };
    } else if (item.pivot && Number.isFinite(Number(item.pivot.x)) && Number.isFinite(Number(item.pivot.y))) {
      pivot = { x: clamp(item.pivot.x, 0, 1), y: clamp(item.pivot.y, 0, 1) };
    }
    result.push({
      id, name: String(item.name || "Komponen " + (index + 1)).slice(0, 72),
      kind: String(item.kind || "object").slice(0, 48), bbox, point, pivot,
      parent: item.parent ? slug(item.parent, "") : null,
      motion, amp: clamp(item.amp, 0, motion === "wheel" || motion === "rotate" ? 1 : 0.8),
      speed: clamp(item.speed == null ? fallback.speed : item.speed, 0, 12),
      phase: Number.isFinite(Number(item.phase)) ? Number(item.phase) : index * 1.17
    });
  }
  return result;
}
export function universalMotionDefaults(motion) {
  return { ...(MOTION_DEFAULTS[VALID_MOTIONS.has(String(motion)) ? String(motion) : "swing"]) };
}
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar sumber tidak dapat dibaca untuk Universal Rig."));
    image.src = dataUrl;
  });
}
function makeWorkerAdapter(worker, onProgress) {
  let nextId = 0;
  const pending = new Map();
  worker.onmessage = event => {
    const message = event.data || {}, entry = pending.get(message.id);
    if (message.type === "progress") {
      if (typeof onProgress === "function") onProgress(message.message, message.ratio);
      return;
    }
    if (!entry) return;
    pending.delete(message.id);
    if (message.ok) entry.resolve(message.result);
    else entry.reject(new Error(message.error || "SAM WebGPU worker gagal."));
  };
  worker.onerror = event => {
    const error = new Error(event.message || "Worker segmentasi browser gagal dimuat.");
    for (const item of pending.values()) item.reject(error);
    pending.clear();
  };
  const request = (method, payload, transfer) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    try { worker.postMessage({ id, method, payload }, transfer || []); }
    catch (error) { pending.delete(id); reject(error); }
  });
  return {
    init: () => request("init", {}),
    encode: (data, width, height) => request("encode", { data, width, height }, [data]),
    segment: prompt => request("segment", prompt),
    dispose: async () => {
      try { await request("dispose", {}); } catch (_) {}
      worker.terminate();
    }
  };
}
function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D tidak tersedia untuk membuat PNG rig.");
  return { canvas, context };
}
function reconstructBackground(source, width, height, owner) {
  const total = width * height;
  const nearest = new Int32Array(total);
  nearest.fill(-1);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  for (let i = 0; i < total; i++) {
    if (owner[i] < 0) { nearest[i] = i; queue[tail++] = i; }
  }
  if (!tail) throw new Error("Mask menutupi seluruh gambar; latar tidak dapat direkonstruksi.");
  while (head < tail) {
    const i = queue[head++], x = i % width, y = (i / width) | 0, src = nearest[i];
    if (x > 0 && nearest[i - 1] < 0) { nearest[i - 1] = src; queue[tail++] = i - 1; }
    if (x + 1 < width && nearest[i + 1] < 0) { nearest[i + 1] = src; queue[tail++] = i + 1; }
    if (y > 0 && nearest[i - width] < 0) { nearest[i - width] = src; queue[tail++] = i - width; }
    if (y + 1 < height && nearest[i + width] < 0) { nearest[i + width] = src; queue[tail++] = i + width; }
  }
  const filled = new ImageData(new Uint8ClampedArray(source.data), width, height);
  for (let i = 0; i < total; i++) {
    if (owner[i] < 0) continue;
    const from = nearest[i] * 4, to = i * 4;
    filled.data[to] = source.data[from];
    filled.data[to + 1] = source.data[from + 1];
    filled.data[to + 2] = source.data[from + 2];
    filled.data[to + 3] = 255;
  }
  const raw = makeCanvas(width, height);
  raw.context.putImageData(filled, 0, 0);
  const blur = makeCanvas(width, height);
  blur.context.filter = "blur(" + Math.max(3, Math.round(Math.min(width, height) * 0.006)) + "px)";
  blur.context.drawImage(raw.canvas, 0, 0);
  const softened = blur.context.getImageData(0, 0, width, height).data;
  for (let i = 0; i < total; i++) {
    if (owner[i] < 0) continue;
    const p = i * 4;
    filled.data[p] = softened[p];
    filled.data[p + 1] = softened[p + 1];
    filled.data[p + 2] = softened[p + 2];
  }
  const result = makeCanvas(width, height);
  result.context.putImageData(filled, 0, 0);
  return result.canvas.toDataURL("image/png");
}
function cropPart(source, width, height, owner, alpha, partIndex, bounds, spec) {
  const box = bounds[partIndex];
  if (!box || box.maxX < box.minX || box.maxY < box.minY) return null;
  const pad = 3, x0 = Math.max(0, box.minX - pad), y0 = Math.max(0, box.minY - pad);
  const x1 = Math.min(width - 1, box.maxX + pad), y1 = Math.min(height - 1, box.maxY + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const layer = makeCanvas(w, h);
  const image = layer.context.createImageData(w, h);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const sourceIndex = y * width + x;
      if (owner[sourceIndex] !== partIndex) continue;
      const si = sourceIndex * 4, di = ((y - y0) * w + x - x0) * 4;
      image.data[di] = source.data[si];
      image.data[di + 1] = source.data[si + 1];
      image.data[di + 2] = source.data[si + 2];
      image.data[di + 3] = alpha[sourceIndex];
    }
  }
  layer.context.putImageData(image, 0, 0);
  const fallback = MOTION_DEFAULTS[spec.motion] || MOTION_DEFAULTS.swing;
  const pivot = spec.pivot
    ? { x: spec.pivot.x * width, y: spec.pivot.y * height }
    : { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  return {
    id: spec.id, name: spec.name, kind: spec.kind, parent: spec.parent,
    motion: spec.motion, src: layer.canvas.toDataURL("image/png"),
    x: x0, y: y0, w, h, pivotX: clamp(pivot.x, x0, x1),
    pivotY: clamp(pivot.y, y0, y1), amp: spec.amp == null ? fallback.amp : spec.amp,
    speed: spec.speed, phase: spec.phase, enabled: true
  };
}
function sanitizeParents(parts) {
  const ids = new Set(parts.map(part => part.id));
  for (const part of parts) {
    if (!part.parent || !ids.has(part.parent) || part.parent === part.id) { part.parent = null; continue; }
    const visited = new Set([part.id]);
    let cursor = part.parent, safe = true;
    while (cursor) {
      if (visited.has(cursor)) { safe = false; break; }
      visited.add(cursor);
      const node = parts.find(x => x.id === cursor);
      cursor = node ? node.parent : null;
    }
    if (!safe) part.parent = null;
  }
}
export async function createUniversalObjectRig(dataUrl, components, options = {}) {
  const specs = normalizeUniversalComponents(components);
  if (!specs.length) throw new Error("Belum ada komponen. Jalankan AI Vision atau klik objek pada gambar untuk menambah komponen manual.");
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
  const image = await loadImage(dataUrl);
  const maxDimension = clamp(options.maxDimension || 1280, 640, 1600);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const sourceCanvas = makeCanvas(width, height);
  sourceCanvas.context.imageSmoothingEnabled = true;
  sourceCanvas.context.imageSmoothingQuality = "high";
  sourceCanvas.context.drawImage(image, 0, 0, width, height);
  const source = sourceCanvas.context.getImageData(0, 0, width, height);
  const worker = options.segmenter || makeWorkerAdapter(
    new Worker(new URL("./universal-object-rig.worker.mjs", import.meta.url), { type: "module" }),
    onProgress
  );
  let workerReady = false;
  try {
    onProgress("Memeriksa WebGPU dan memuat SAM 2.1 Tiny…");
    const ready = await worker.init();
    workerReady = true;
    onProgress("Menyiapkan gambar dan membuat embedding GPU…");
    const pixels = new Uint8ClampedArray(source.data);
    await worker.encode(pixels.buffer, width, height);
    const maskResults = [];
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const prompt = spec.bbox
        ? { box: { x: spec.bbox.x * width, y: spec.bbox.y * height, w: spec.bbox.w * width, h: spec.bbox.h * height } }
        : { point: { x: spec.point.x * width, y: spec.point.y * height } };
      onProgress("Segmentasi " + (i + 1) + "/" + specs.length + ": " + spec.name + "…");
      const result = await worker.segment(prompt);
      if (!result || !result.mask || result.mask.length < 256 * 256) continue;
      maskResults.push({ spec, mask: result.mask, score: Number(result.score) || 0 });
    }
    if (!maskResults.length) throw new Error("SAM tidak berhasil memisahkan komponen. Coba kotak/titik yang lebih tepat.");
    const total = width * height;
    const owner = new Int16Array(total);
    owner.fill(-1);
    const best = new Float32Array(total);
    best.fill(-Infinity);
    const alpha = new Uint8ClampedArray(total);
    const bounds = maskResults.map(() => ({ minX: width, minY: height, maxX: -1, maxY: -1 }));
    const maskScale = 256 / Math.max(width, height);
    for (let y = 0; y < height; y++) {
      const my = Math.min(255, Math.floor((y + 0.5) * maskScale));
      for (let x = 0; x < width; x++) {
        const mx = Math.min(255, Math.floor((x + 0.5) * maskScale));
        const imageIndex = y * width + x;
        for (let k = 0; k < maskResults.length; k++) {
          const logit = maskResults[k].mask[my * 256 + mx];
          if (logit <= 0 || logit <= best[imageIndex]) continue;
          best[imageIndex] = logit;
          owner[imageIndex] = k;
          alpha[imageIndex] = Math.round(255 * clamp((logit + 1) / 3, 0, 1));
        }
        const partIndex = owner[imageIndex];
        if (partIndex >= 0) {
          const box = bounds[partIndex];
          if (x < box.minX) box.minX = x;
          if (y < box.minY) box.minY = y;
          if (x > box.maxX) box.maxX = x;
          if (y > box.maxY) box.maxY = y;
        }
      }
    }
    const parts = [];
    for (let i = 0; i < maskResults.length; i++) {
      const layer = cropPart(source, width, height, owner, alpha, i, bounds, maskResults[i].spec);
      if (layer) parts.push(layer);
    }
    if (!parts.length) throw new Error("Mask SAM kosong pada resolusi gambar. Pilih bagian objek yang lebih jelas.");
    sanitizeParents(parts);
    onProgress("Merekonstruksi latar dan mengemas " + parts.length + " layer transparan…");
    const background = reconstructBackground(source, width, height, owner);
    onProgress("Universal Rig berhasil dibuat: " + parts.length + " komponen independen.");
    return {
      version: 2, kind: "sam2.1-tiny-browser-universal-rig", backend: ready && ready.backend || "webgpu",
      width, height, background, parts,
      sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight,
      model: "SAM 2.1 Tiny ONNX FP16 / WebGPU",
      notes: "SAM membuat mask piksel dari kotak/titik prompt yang disediakan AI Vision atau pengguna. Nama dan gerakan adalah saran semantik yang dapat diedit. Background reconstruction bersifat perkiraan; periksa tepi objek sebelum ekspor."
    };
  } finally {
    if (workerReady) await worker.dispose();
    else if (worker && typeof worker.terminate === "function") worker.terminate();
  }
}
export function canUseUniversalRigWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}
