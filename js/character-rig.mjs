/* TROZAL MOTION · Browser Character Rig
 * Pose landmarks + person foreground mask -> independently animated transparent body-part layers.
 * MediaPipe runs locally in the browser; the generated HTML embeds its resulting PNG layers.
 */
const MEDIAPIPE_BUNDLE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const PARTS = [
  { id: "torso", name: "Torso", parent: null, a: 11, b: 24, radius: 0, amp: 0.012, speed: 1.1, phase: 0.0 },
  { id: "upperLegL", name: "Paha kiri", parent: "torso", a: 23, b: 25, radius: "leg", amp: 0.105, speed: 1.55, phase: 0 },
  { id: "lowerLegL", name: "Betis kiri", parent: "upperLegL", a: 25, b: 27, radius: "shin", amp: 0.13, speed: 1.55, phase: 1.0 },
  { id: "footL", name: "Kaki kiri", parent: "lowerLegL", a: 27, b: 31, radius: "foot", amp: 0.055, speed: 1.55, phase: 0.4 },
  { id: "upperLegR", name: "Paha kanan", parent: "torso", a: 24, b: 26, radius: "leg", amp: 0.105, speed: 1.55, phase: Math.PI },
  { id: "lowerLegR", name: "Betis kanan", parent: "upperLegR", a: 26, b: 28, radius: "shin", amp: 0.13, speed: 1.55, phase: 2.0 },
  { id: "footR", name: "Kaki kanan", parent: "lowerLegR", a: 28, b: 32, radius: "foot", amp: 0.055, speed: 1.55, phase: 2.4 },
  { id: "upperArmL", name: "Lengan atas kiri", parent: "torso", a: 11, b: 13, radius: "upperArm", amp: 0.13, speed: 1.35, phase: Math.PI },
  { id: "forearmL", name: "Lengan bawah kiri", parent: "upperArmL", a: 13, b: 15, radius: "forearm", amp: 0.16, speed: 1.35, phase: 0.8 },
  { id: "handL", name: "Tangan kiri", parent: "forearmL", a: 15, b: 19, radius: "hand", amp: 0.07, speed: 1.35, phase: 1.3 },
  { id: "upperArmR", name: "Lengan atas kanan", parent: "torso", a: 12, b: 14, radius: "upperArm", amp: 0.13, speed: 1.35, phase: 0 },
  { id: "forearmR", name: "Lengan bawah kanan", parent: "upperArmR", a: 14, b: 16, radius: "forearm", amp: 0.16, speed: 1.35, phase: 1.8 },
  { id: "handR", name: "Tangan kanan", parent: "forearmR", a: 16, b: 20, radius: "hand", amp: 0.07, speed: 1.35, phase: 2.3 },
  { id: "head", name: "Kepala", parent: "torso", a: 0, b: 7, radius: "head", amp: 0.045, speed: 0.9, phase: 0.3 }
];

function point(lm, w, h, idx) {
  const p = lm[idx];
  if (!p || (p.visibility != null && p.visibility < 0.18)) return null;
  return { x: Math.max(0, Math.min(w - 1, Number(p.x) * w)), y: Math.max(0, Math.min(h - 1, Number(p.y) * h)) };
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function segmentDistance(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, den = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / den));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
function polygonContains(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a.y > y) !== (b.y > y)) && x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-9) + a.x) inside = !inside;
  }
  return inside;
}

export function buildPosePartSpecs(landmarks, width, height) {
  const lm = landmarks || [];
  const get = idx => point(lm, width, height, idx);
  const leftShoulder = get(11), rightShoulder = get(12), leftHip = get(23), rightHip = get(24);
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) throw new Error("Tubuh tidak terdeteksi utuh. Pastikan bahu dan pinggul terlihat di foto.");
  const shoulderWidth = Math.max(18, dist(leftShoulder, rightShoulder));
  const hipWidth = Math.max(10, dist(leftHip, rightHip));
  const torsoPoly = [leftShoulder, rightShoulder, rightHip, leftHip];
  const nose = get(0), leftEar = get(7), rightEar = get(8);
  const earMid = leftEar && rightEar ? { x: (leftEar.x + rightEar.x) / 2, y: (leftEar.y + rightEar.y) / 2 } : nose;
  const headCenter = earMid || nose || { x: (leftShoulder.x + rightShoulder.x) / 2, y: leftShoulder.y - shoulderWidth * 0.48 };
  const headRX = Math.max(shoulderWidth * 0.19, leftEar && rightEar ? dist(leftEar, rightEar) * 0.72 : shoulderWidth * 0.2);
  const headRY = Math.max(headRX * 1.12, shoulderWidth * 0.24);
  const specs = [];
  const torsoPivot = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
  specs.push({ ...PARTS[0], pivot: torsoPivot, shape: "polygon", polygon: torsoPoly, width: shoulderWidth });
  for (const p of PARTS.slice(1)) {
    if (p.id === "head") {
      specs.push({ ...p, pivot: { x: headCenter.x, y: Math.max(headCenter.y + headRY * 0.72, (leftShoulder.y + rightShoulder.y) / 2 - 2) }, shape: "ellipse", center: headCenter, rx: headRX, ry: headRY });
      continue;
    }
    const a = get(p.a), b = get(p.b);
    if (!a || !b) continue;
    let radius = shoulderWidth * 0.09;
    if (p.radius === "upperArm") radius = shoulderWidth * 0.105;
    else if (p.radius === "forearm") radius = shoulderWidth * 0.085;
    else if (p.radius === "leg") radius = Math.max(shoulderWidth * 0.105, hipWidth * 0.31);
    else if (p.radius === "shin") radius = shoulderWidth * 0.082;
    else if (p.radius === "hand") radius = shoulderWidth * 0.092;
    else if (p.radius === "foot") radius = shoulderWidth * 0.105;
    specs.push({ ...p, aPoint: a, bPoint: b, radiusPx: radius, pivot: a, shape: "capsule" });
  }
  if (!specs.some(x => x.id === "head")) throw new Error("Landmark kepala tidak cukup jelas untuk membuat rig.");
  return specs;
}

/* Pure segmentation assignment, exported for deterministic tests. */
export function assignPosePartLabels(mask, maskWidth, maskHeight, landmarks, width, height) {
  const specs = buildPosePartSpecs(landmarks, width, height);
  const labels = new Int16Array(maskWidth * maskHeight);
  labels.fill(-1);
  const bounds = specs.map(() => ({ minX: maskWidth, minY: maskHeight, maxX: -1, maxY: -1 }));
  const scaleX = width / maskWidth, scaleY = height / maskHeight;
  for (let y = 0; y < maskHeight; y++) {
    const py = (y + 0.5) * scaleY;
    for (let x = 0; x < maskWidth; x++) {
      const idx = y * maskWidth + x;
      if (Number(mask[idx]) < 0.26) continue;
      const px = (x + 0.5) * scaleX;
      let best = 1.28, bestIndex = 0;
      for (let k = 1; k < specs.length; k++) {
        const s = specs[k];
        let score = Infinity;
        if (s.shape === "ellipse") {
          const nx = (px - s.center.x) / s.rx, ny = (py - s.center.y) / s.ry;
          score = Math.sqrt(nx * nx + ny * ny);
        } else if (s.shape === "capsule") {
          score = segmentDistance(px, py, s.aPoint, s.bPoint) / s.radiusPx;
        }
        if (score < best) { best = score; bestIndex = k; }
      }
      const torso = specs[0];
      if (polygonContains(px, py, torso.polygon) && best > 0.72) bestIndex = 0;
      labels[idx] = bestIndex;
      const box = bounds[bestIndex];
      if (x < box.minX) box.minX = x;
      if (y < box.minY) box.minY = y;
      if (x > box.maxX) box.maxX = x;
      if (y > box.maxY) box.maxY = y;
    }
  }
  return { specs, labels, bounds };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak dapat dibaca untuk analisis karakter."));
    img.src = src;
  });
}
async function makePoseLandmarker(onProgress) {
  onProgress("Memuat MediaPipe Pose Landmarker…");
  const mp = await import(MEDIAPIPE_BUNDLE);
  const vision = await mp.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  const options = {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
    runningMode: "IMAGE",
    numPoses: 1,
    minPoseDetectionConfidence: 0.48,
    minPosePresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
    outputSegmentationMasks: true
  };
  try { return await mp.PoseLandmarker.createFromOptions(vision, options); }
  catch (gpuError) {
    options.baseOptions.delegate = "CPU";
    try { return await mp.PoseLandmarker.createFromOptions(vision, options); }
    catch (cpuError) { throw new Error("Model Pose Landmarker gagal dijalankan dengan GPU maupun CPU. " + (cpuError.message || gpuError.message)); }
  }
}

function reconstructBackground(source, maskData, maskWidth, maskHeight, width, height, maskAt) {
  const src = source.data, total = width * height;
  const owner = new Int32Array(total); owner.fill(-1);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  for (let y = 0; y < height; y++) {
    const my = Math.min(maskHeight - 1, Math.floor(y * maskHeight / height));
    for (let x = 0; x < width; x++) {
      const mx = Math.min(maskWidth - 1, Math.floor(x * maskWidth / width));
      const i = y * width + x;
      if (maskAt(mx, my) < 0.25) { owner[i] = i; queue[tail++] = i; }
    }
  }
  if (!tail) throw new Error("Mask subjek menutupi seluruh gambar; latar tidak dapat direkonstruksi.");
  while (head < tail) {
    const i = queue[head++], x = i % width, y = (i / width) | 0;
    const visit = n => { if (owner[n] === -1) { owner[n] = owner[i]; queue[tail++] = n; } };
    if (x > 0) visit(i - 1);
    if (x + 1 < width) visit(i + 1);
    if (y > 0) visit(i - width);
    if (y + 1 < height) visit(i + width);
  }
  const filled = new ImageData(new Uint8ClampedArray(src), width, height);
  for (let i = 0; i < total; i++) {
    const x = i % width, y = (i / width) | 0;
    if (maskAt(Math.min(maskWidth - 1, Math.floor(x * maskWidth / width)), Math.min(maskHeight - 1, Math.floor(y * maskHeight / height))) < 0.25) continue;
    const oi = owner[i] * 4, di = i * 4;
    filled.data[di] = src[oi]; filled.data[di + 1] = src[oi + 1]; filled.data[di + 2] = src[oi + 2]; filled.data[di + 3] = 255;
  }
  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = width; rawCanvas.height = height;
  rawCanvas.getContext("2d").putImageData(filled, 0, 0);
  const softCanvas = document.createElement("canvas");
  softCanvas.width = width; softCanvas.height = height;
  const softCtx = softCanvas.getContext("2d");
  softCtx.filter = "blur(" + Math.max(3, Math.round(Math.min(width, height) * 0.008)) + "px)";
  softCtx.drawImage(rawCanvas, 0, 0);
  const softened = softCtx.getImageData(0, 0, width, height).data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const m = maskAt(Math.min(maskWidth - 1, Math.floor(x * maskWidth / width)), Math.min(maskHeight - 1, Math.floor(y * maskHeight / height)));
      if (m < 0.25) continue;
      const i = (y * width + x) * 4;
      filled.data[i] = softened[i]; filled.data[i + 1] = softened[i + 1]; filled.data[i + 2] = softened[i + 2]; filled.data[i + 3] = 255;
    }
  }
  return rawCanvasFromImageData(filled);
}
function rawCanvasFromImageData(data) {
  const canvas = document.createElement("canvas");
  canvas.width = data.width; canvas.height = data.height;
  canvas.getContext("2d").putImageData(data, 0, 0);
  return canvas;
}
function createPartAsset(source, width, height, labelMap, maskAt, partIndex, bounds, spec) {
  const box = bounds[partIndex];
  if (box.maxX < box.minX || box.maxY < box.minY) return null;
  const pad = 3, x0 = Math.max(0, box.minX - pad), y0 = Math.max(0, box.minY - pad);
  const x1 = Math.min(width - 1, box.maxX + pad), y1 = Math.min(height - 1, box.maxY + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(w, h), src = source.data;
  for (let y = y0; y <= y1; y++) {
    const my = Math.min(maskAt.height - 1, Math.floor(y * maskAt.height / height));
    for (let x = x0; x <= x1; x++) {
      const mx = Math.min(maskAt.width - 1, Math.floor(x * maskAt.width / width));
      const label = labelMap[my * maskAt.width + mx];
      if (label !== partIndex) continue;
      const alpha = Math.round(255 * Math.max(0, Math.min(1, maskAt(mx, my))));
      const si = (y * width + x) * 4, di = ((y - y0) * w + (x - x0)) * 4;
      image.data[di] = src[si]; image.data[di + 1] = src[si + 1]; image.data[di + 2] = src[si + 2]; image.data[di + 3] = alpha;
    }
  }
  ctx.putImageData(image, 0, 0);
  return {
    id: spec.id, name: spec.name, parent: spec.parent,
    src: canvas.toDataURL("image/png"),
    x: x0, y: y0, w, h,
    pivotX: spec.pivot.x, pivotY: spec.pivot.y,
    amp: spec.amp, speed: spec.speed, phase: spec.phase,
    enabled: true
  };
}

export async function createCharacterRig(dataUrl, options = {}) {
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
  onProgress("Menyiapkan gambar…");
  const original = await loadImage(dataUrl);
  const maxDimension = Math.max(640, Math.min(1600, Number(options.maxDimension) || 1280));
  const scale = Math.min(1, maxDimension / Math.max(original.naturalWidth, original.naturalHeight));
  const width = Math.max(1, Math.round(original.naturalWidth * scale));
  const height = Math.max(1, Math.round(original.naturalHeight * scale));
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width; sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(original, 0, 0, width, height);
  const source = sourceCtx.getImageData(0, 0, width, height);

  let landmarker;
  try {
    landmarker = await makePoseLandmarker(onProgress);
    onProgress("Mendeteksi pose, sendi, dan mask siluet…");
    const result = landmarker.detect(sourceCanvas);
    const landmarks = result && result.landmarks && result.landmarks[0];
    const segmentation = result && result.segmentationMasks && result.segmentationMasks[0];
    if (!landmarks || landmarks.length < 29) throw new Error("Tidak menemukan satu karakter manusia yang cukup terlihat. Mode gerak gambar utuh tetap dapat digunakan.");
    if (!segmentation || typeof segmentation.getAsFloat32Array !== "function") throw new Error("Model tidak mengembalikan mask siluet. Coba gambar lain atau gunakan gerak gambar utuh.");
    const maskWidth = segmentation.width, maskHeight = segmentation.height;
    const rawMask = segmentation.getAsFloat32Array();
    if (!maskWidth || !maskHeight || rawMask.length < maskWidth * maskHeight) throw new Error("Mask siluet dari model tidak valid.");
    const maskAt = (x, y) => Number(rawMask[y * maskWidth + x]) || 0;
    const { specs, labels, bounds } = assignPosePartLabels(rawMask, maskWidth, maskHeight, landmarks, width, height);
    const background = reconstructBackground(source, rawMask, maskWidth, maskHeight, width, height, maskAt);
    const parts = [];
    for (let i = 0; i < specs.length; i++) {
      const asset = createPartAsset(source, width, height, labels, maskAt, i, bounds, specs[i]);
      if (asset) parts.push(asset);
    }
    if (!parts.some(p => p.id === "torso") || !parts.some(p => p.id === "head") || parts.length < 5) {
      throw new Error("Pemisahan bagian tubuh belum cukup baik. Gunakan foto dengan kepala, bahu, dan sebagian besar tubuh terlihat.");
    }
    onProgress("Rig karakter berhasil dibuat: " + parts.length + " bagian tubuh.");
    return {
      version: 1, kind: "mediapipe-pose-character-rig",
      width, height, background: background.toDataURL("image/png"),
      parts, detectedLandmarks: landmarks.length,
      notes: "Bagian tubuh dihasilkan dari mask siluet manusia dan estimasi sendi. Rekonstruksi latar berupa inpainting lokal dan dapat kurang akurat pada latar kompleks."
    };
  } finally {
    if (landmarker && typeof landmarker.close === "function") landmarker.close();
  }
}

export const CHARACTER_RIG_PARTS = PARTS.map(part => ({ id: part.id, name: part.name, parent: part.parent }));
