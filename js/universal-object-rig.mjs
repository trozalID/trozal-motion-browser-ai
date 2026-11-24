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
      motion, amp: item.amp == null ? fallback.amp : clamp(item.amp, 0, motion === "wheel" || motion === "rotate" ? 1 : 0.8),
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
function dilateOwnerMask(owner, best, alpha, width, height, bounds) {
  // SAM's 256px mask grid can leave a thin original-image fringe. Grow the
  // foreground ownership by a few source pixels so the old silhouette is
  // removed from the reconstructed background and stays attached to the part.
  for (let pass = 0; pass < 3; pass++) {
    const expandedOwner = new Int16Array(owner);
    const expandedBest = new Float32Array(best);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (owner[index] >= 0) continue;
        let chosen = -1, chosenScore = -Infinity;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            const neighbor = ny * width + nx;
            if (owner[neighbor] >= 0 && best[neighbor] > chosenScore) {
              chosen = neighbor;
              chosenScore = best[neighbor];
            }
          }
        }
        if (chosen >= 0) {
          expandedOwner[index] = owner[chosen];
          expandedBest[index] = chosenScore;
          alpha[index] = Math.max(224, alpha[chosen] || 0);
        }
      }
    }
    owner.set(expandedOwner);
    best.set(expandedBest);
  }
  bounds.forEach((box, index) => {
    if (!box || typeof box !== "object") bounds[index] = { minX: width, minY: height, maxX: -1, maxY: -1 };
    else { box.minX = width; box.minY = height; box.maxX = -1; box.maxY = -1; }
  });
  for (let index = 0; index < owner.length; index++) {
    const partIndex = owner[index];
    if (partIndex < 0) continue;
    const x = index % width, y = (index / width) | 0, box = bounds[partIndex];
    if (!box) { owner[index] = -1; alpha[index] = 0; continue; }
    if (x < box.minX) box.minX = x;
    if (x > box.maxX) box.maxX = x;
    if (y < box.minY) box.minY = y;
    if (y > box.maxY) box.maxY = y;
  }
}
function reconstructBackground(source, width, height, owner) {
  // Work at a smaller scale to avoid expensive full-resolution inpainting.
  // A nearest-colour fill alone stretches edge pixels into the removed object
  // and often looks like a ghost. Diffusing that fill toward a smooth,
  // boundary-connected interpolation removes the recognizable old silhouette.
  const scale = Math.min(1, 360 / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const sourceCanvas = makeCanvas(width, height);
  sourceCanvas.context.putImageData(new ImageData(new Uint8ClampedArray(source.data), width, height), 0, 0);
  const smallCanvas = makeCanvas(sw, sh);
  smallCanvas.context.imageSmoothingEnabled = true;
  smallCanvas.context.imageSmoothingQuality = "high";
  smallCanvas.context.drawImage(sourceCanvas.canvas, 0, 0, sw, sh);
  const small = smallCanvas.context.getImageData(0, 0, sw, sh);
  const count = sw * sh;
  const hole = new Uint8Array(count);
  const nearest = new Int32Array(count);
  nearest.fill(-1);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;

  // Mark a low-resolution pixel as a hole when any source pixel represented
  // by it belongs to a movable component.
  for (let y = 0; y < sh; y++) {
    const y0 = Math.floor(y * height / sh);
    const y1 = Math.min(height, Math.max(y0 + 1, Math.ceil((y + 1) * height / sh)));
    for (let x = 0; x < sw; x++) {
      const x0 = Math.floor(x * width / sw);
      const x1 = Math.min(width, Math.max(x0 + 1, Math.ceil((x + 1) * width / sw)));
      let masked = false;
      for (let sy = y0; sy < y1 && !masked; sy++) {
        const row = sy * width;
        for (let sx = x0; sx < x1; sx++) {
          if (owner[row + sx] >= 0) { masked = true; break; }
        }
      }
      const index = y * sw + x;
      if (masked) hole[index] = 1;
      else { nearest[index] = index; queue[tail++] = index; }
    }
  }
  if (!tail) throw new Error("Mask menutupi seluruh gambar; latar tidak dapat direkonstruksi.");

  // Multi-source flood fill supplies a stable initial colour for the hole.
  while (head < tail) {
    const index = queue[head++], x = index % sw, y = (index / sw) | 0, src = nearest[index];
    if (x > 0 && nearest[index - 1] < 0) { nearest[index - 1] = src; queue[tail++] = index - 1; }
    if (x + 1 < sw && nearest[index + 1] < 0) { nearest[index + 1] = src; queue[tail++] = index + 1; }
    if (y > 0 && nearest[index - sw] < 0) { nearest[index - sw] = src; queue[tail++] = index - sw; }
    if (y + 1 < sh && nearest[index + sw] < 0) { nearest[index + sw] = src; queue[tail++] = index + sw; }
  }

  let current = new Uint8ClampedArray(small.data);
  for (let index = 0; index < count; index++) {
    if (!hole[index]) continue;
    const from = nearest[index] * 4, to = index * 4;
    current[to] = small.data[from];
    current[to + 1] = small.data[from + 1];
    current[to + 2] = small.data[from + 2];
    current[to + 3] = 255;
  }

  // Harmonic diffusion: non-masked pixels remain fixed, while fill pixels
  // converge toward neighbouring background colours instead of retaining a
  // stretched copy of the foreground edge.
  let next = new Uint8ClampedArray(current);
  const iterations = Math.max(64, Math.min(112, Math.round(Math.min(sw, sh) * 0.42)));
  for (let pass = 0; pass < iterations; pass++) {
    next.set(current);
    for (let y = 0; y < sh; y++) {
      const up = Math.max(0, y - 1) * sw, row = y * sw, down = Math.min(sh - 1, y + 1) * sw;
      for (let x = 0; x < sw; x++) {
        const index = row + x;
        if (!hole[index]) continue;
        const left = row + Math.max(0, x - 1), right = row + Math.min(sw - 1, x + 1);
        const p = index * 4, l = left * 4, r = right * 4, u = (up + x) * 4, d = (down + x) * 4;
        next[p] = (current[l] + current[r] + current[u] + current[d]) * 0.25;
        next[p + 1] = (current[l + 1] + current[r + 1] + current[u + 1] + current[d + 1]) * 0.25;
        next[p + 2] = (current[l + 2] + current[r + 2] + current[u + 2] + current[d + 2]) * 0.25;
        next[p + 3] = 255;
      }
    }
    const swap = current; current = next; next = swap;
  }

  const filledSmall = makeCanvas(sw, sh);
  filledSmall.context.putImageData(new ImageData(current, sw, sh), 0, 0);
  const upscaled = makeCanvas(width, height);
  upscaled.context.imageSmoothingEnabled = true;
  upscaled.context.imageSmoothingQuality = "high";
  upscaled.context.drawImage(filledSmall.canvas, 0, 0, width, height);
  const fillPixels = upscaled.context.getImageData(0, 0, width, height).data;
  const result = new ImageData(new Uint8ClampedArray(source.data), width, height);
  for (let index = 0; index < owner.length; index++) {
    if (owner[index] < 0) continue;
    const p = index * 4;
    result.data[p] = fillPixels[p];
    result.data[p + 1] = fillPixels[p + 1];
    result.data[p + 2] = fillPixels[p + 2];
    result.data[p + 3] = 255;
  }
  const output = makeCanvas(width, height);
  output.context.putImageData(result, 0, 0);
  return output.canvas.toDataURL("image/png");
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
    // Expand the selected object edge slightly before extracting layers and
    // removing it from the background. This prevents a stationary rim/halo.
    dilateOwnerMask(owner, best, alpha, width, height, bounds);
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
    if (worker && typeof worker.dispose === "function") await worker.dispose();
    else if (worker && typeof worker.terminate === "function") worker.terminate();
  }
}
export function canUseUniversalRigWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}
