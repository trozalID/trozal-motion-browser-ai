/* TROZAL MOTION · Browser Character Rig
 * Pose landmarks + person foreground mask -> independently animated transparent body-part layers.
 * MediaPipe runs locally in the browser; the generated HTML embeds its resulting PNG layers.
 */
const MEDIAPIPE_BUNDLE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
export const CHARACTER_RIG_MASK_THRESHOLDS = Object.freeze({ assetAlpha: 0.18, labelAssignment: 0.26, backgroundInpaint: 0.18, maxPartAssignmentScore: 2.2 });
export function shouldInpaintMaskPixel(confidence) {
  return Number(confidence) >= CHARACTER_RIG_MASK_THRESHOLDS.backgroundInpaint;
}

const PARTS = [
  { id: "torso", name: "Torso", parent: null, a: 11, b: 24, radius: 0, amp: 0.025, speed: 1.1, phase: 0.0 },
  { id: "upperLegL", name: "Paha kiri", parent: "torso", a: 23, b: 25, radius: "leg", amp: 0.19, speed: 1.55, phase: 0 },
  { id: "lowerLegL", name: "Betis kiri", parent: "upperLegL", a: 25, b: 27, radius: "shin", amp: 0.24, speed: 1.55, phase: 1.0 },
  { id: "footL", name: "Kaki kiri", parent: "lowerLegL", a: 27, b: 31, radius: "foot", amp: 0.11, speed: 1.55, phase: 0.4 },
  { id: "upperLegR", name: "Paha kanan", parent: "torso", a: 24, b: 26, radius: "leg", amp: 0.19, speed: 1.55, phase: Math.PI },
  { id: "lowerLegR", name: "Betis kanan", parent: "upperLegR", a: 26, b: 28, radius: "shin", amp: 0.24, speed: 1.55, phase: 2.0 },
  { id: "footR", name: "Kaki kanan", parent: "lowerLegR", a: 28, b: 32, radius: "foot", amp: 0.11, speed: 1.55, phase: 2.4 },
  { id: "upperArmL", name: "Lengan atas kiri", parent: "torso", a: 11, b: 13, radius: "upperArm", amp: 0.24, speed: 1.35, phase: Math.PI },
  { id: "forearmL", name: "Lengan bawah kiri", parent: "upperArmL", a: 13, b: 15, radius: "forearm", amp: 0.26, speed: 1.35, phase: 0.8 },
  { id: "handL", name: "Tangan kiri", parent: "forearmL", a: 15, b: 19, radius: "hand", amp: 0.13, speed: 1.35, phase: 1.3 },
  { id: "upperArmR", name: "Lengan atas kanan", parent: "torso", a: 12, b: 14, radius: "upperArm", amp: 0.24, speed: 1.35, phase: 0 },
  { id: "forearmR", name: "Lengan bawah kanan", parent: "upperArmR", a: 14, b: 16, radius: "forearm", amp: 0.26, speed: 1.35, phase: 1.8 },
  { id: "handR", name: "Tangan kanan", parent: "forearmR", a: 16, b: 20, radius: "hand", amp: 0.13, speed: 1.35, phase: 2.3 },
  { id: "head", name: "Kepala", parent: "torso", a: 0, b: 7, radius: "head", amp: 0.105, speed: 0.9, phase: 0.3 }
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

function polygonEdgeDistance(x, y, poly) {
  let nearest = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    nearest = Math.min(nearest, segmentDistance(x, y, a, b));
  }
  return nearest;
}

/* Detect a connected lower-body garment (for example a pencil skirt) from
 * the person mask. A skirt remains one rigid visual surface; assigning its
 * visible pixels to left/right leg capsules makes the garment split at the
 * center seam as the legs animate. Pants are excluded when the center gap is
 * open through most of the hip-to-knee interval.
 */
export function detectLowerGarmentRegion(mask, maskWidth, maskHeight, landmarks, width, height) {
  if (!mask || !maskWidth || !maskHeight) return null;
  const get = idx => point(landmarks || [], width, height, idx);
  const leftHip = get(23), rightHip = get(24), leftKnee = get(25), rightKnee = get(26);
  if (!leftHip || !rightHip || !leftKnee || !rightKnee) return null;
  const hipY = (leftHip.y + rightHip.y) * 0.5;
  const kneeY = (leftKnee.y + rightKnee.y) * 0.5;
  const hipCenter = (leftHip.x + rightHip.x) * 0.5;
  const hipWidth = Math.max(8, dist(leftHip, rightHip));
  const span = kneeY - hipY;
  if (span < hipWidth * 0.22) return null;
  const rows = [];
  const startY = hipY + span * 0.12, endY = kneeY - span * 0.10;
  const samples = 11;
  for (let n = 0; n < samples; n++) {
    const py = startY + (endY - startY) * n / (samples - 1);
    const my = Math.max(0, Math.min(maskHeight - 1, Math.floor(py * maskHeight / height)));
    const centerX = Math.max(0, Math.min(maskWidth - 1, Math.floor(hipCenter * maskWidth / width)));
    const centerRadius = Math.max(1, Math.round(hipWidth * 0.075 * maskWidth / width));
    let centerCovered = false;
    for (let dx = -centerRadius; dx <= centerRadius; dx++) {
      const mx = centerX + dx;
      if (mx >= 0 && mx < maskWidth && Number(mask[my * maskWidth + mx]) >= CHARACTER_RIG_MASK_THRESHOLDS.labelAssignment) {
        centerCovered = true; break;
      }
    }
    if (!centerCovered) { rows.push({ covered: false, y: py }); continue; }
    let left = centerX, right = centerX;
    const maxRadius = Math.ceil(hipWidth * 1.15 * maskWidth / width);
    for (let mx = centerX - 1; mx >= Math.max(0, centerX - maxRadius); mx--) {
      if (Number(mask[my * maskWidth + mx]) < CHARACTER_RIG_MASK_THRESHOLDS.labelAssignment) break;
      left = mx;
    }
    for (let mx = centerX + 1; mx < Math.min(maskWidth, centerX + maxRadius + 1); mx++) {
      if (Number(mask[my * maskWidth + mx]) < CHARACTER_RIG_MASK_THRESHOLDS.labelAssignment) break;
      right = mx;
    }
    rows.push({ covered: true, y: py, left: left * width / maskWidth, right: (right + 1) * width / maskWidth });
  }
  const connected = rows.filter(row => row.covered);
  if (connected.length / samples < 0.72) return null;
  const widths = connected.map(row => row.right - row.left).sort((a,b)=>a-b);
  const medianWidth = widths[Math.floor(widths.length / 2)];
  if (medianWidth < hipWidth * 0.58) return null;
  const first = connected[0], last = connected[connected.length - 1];
  const topY = Math.max(hipY, first.y - span * 0.04);
  const hemY = Math.min(kneeY - 2, last.y + span * 0.08);
  if (hemY <= topY + 2) return null;
  const polygon = [
    { x: first.left, y: topY }, { x: first.right, y: topY },
    { x: last.right, y: hemY }, { x: last.left, y: hemY }
  ];
  return {
    id: "lowerGarment", name: "Rok / pakaian bawah", parent: "torso",
    pivot: { x: hipCenter, y: hipY }, shape: "polygon", polygon,
    width: medianWidth, jointPoints: [leftHip, rightHip],
    jointOverlap: Math.max(5, hipWidth * 0.12),
    amp: 0, speed: 0, phase: 0, motion: "static"
  };
}

/* Reconstruct the torso surface hidden by foreground limbs. The nearest
 * visible torso patch is extended only inside the torso polygon and only where
 * the segmentation mask confirms foreground. This gives the static torso an
 * underlay instead of leaving a transparent hole when an arm/leg moves away.
 */
export function buildTorsoUnderlay(source, labels, maskWidth, maskHeight, width, height, torsoSpec, maskAt) {
  if (!source || !source.data || !torsoSpec || !Array.isArray(torsoSpec.polygon)) return null;
  const total = maskWidth * maskHeight;
  if (labels.length < total || !maskWidth || !maskHeight) return null;
  const owner = new Int32Array(total); owner.fill(-1);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  const inside = new Uint8Array(total);
  for (let y = 0; y < maskHeight; y++) {
    const py = (y + 0.5) * height / maskHeight;
    for (let x = 0; x < maskWidth; x++) {
      const i = y * maskWidth + x;
      const px = (x + 0.5) * width / maskWidth;
      if (!polygonContains(px, py, torsoSpec.polygon)) continue;
      inside[i] = 1;
      if (labels[i] === 0) {
        owner[i] = i;
        queue[tail++] = i;
      }
    }
  }
  if (!tail) return null;
  while (head < tail) {
    const i = queue[head++], x = i % maskWidth, y = (i / maskWidth) | 0;
    const visit = next => {
      if (inside[next] && owner[next] === -1) {
        owner[next] = owner[i];
        queue[tail++] = next;
      }
    };
    if (x > 0) visit(i - 1);
    if (x + 1 < maskWidth) visit(i + 1);
    if (y > 0) visit(i - maskWidth);
    if (y + 1 < maskHeight) visit(i + maskWidth);
  }
  const data = new Uint8ClampedArray(source.data);
  const torsoLabels = new Int16Array(labels);
  const bounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
  for (let my = 0; my < maskHeight; my++) {
    const y0 = Math.floor(my * height / maskHeight);
    const y1 = Math.max(y0, Math.floor((my + 1) * height / maskHeight) - 1);
    for (let mx = 0; mx < maskWidth; mx++) {
      const i = my * maskWidth + mx, seed = owner[i];
      if (seed < 0 || labels[i] < 0 || labels[i] === 0 ||
          Number(maskAt(mx, my)) < CHARACTER_RIG_MASK_THRESHOLDS.assetAlpha) continue;
      torsoLabels[i] = 0;
      const sx0 = Math.floor((seed % maskWidth) * width / maskWidth);
      const sy0 = Math.floor(Math.floor(seed / maskWidth) * height / maskHeight);
      const x0 = Math.floor(mx * width / maskWidth);
      const x1 = Math.min(width - 1, Math.floor((mx + 1) * width / maskWidth) - 1);
      const sy1 = Math.min(height - 1, Math.floor((my + 1) * height / maskHeight) - 1);
      for (let y = y0; y <= sy1; y++) {
        const sy = Math.min(height - 1, sy0 + (y - y0));
        for (let x = x0; x <= x1; x++) {
          const sx = Math.min(width - 1, sx0 + (x - x0));
          const from = (sy * width + sx) * 4, to = (y * width + x) * 4;
          data[to] = source.data[from];
          data[to + 1] = source.data[from + 1];
          data[to + 2] = source.data[from + 2];
          data[to + 3] = source.data[from + 3];
        }
      }
      bounds.minX = Math.min(bounds.minX, x0);
      bounds.minY = Math.min(bounds.minY, y0);
      bounds.maxX = Math.max(bounds.maxX, x1);
      bounds.maxY = Math.max(bounds.maxY, sy1);
    }
  }
  return {
    source: { data },
    labels: torsoLabels,
    bounds: { ...bounds, minX: Math.min(bounds.minX, width), minY: Math.min(bounds.minY, height) }
  };
}

/* Keep a narrow duplicate of foreground pixels around each part's silhouette.
 * A pixel may belong to one segmentation label, but must be available to both
 * adjacent layers so a moving limb cannot expose a transparent hole in a still
 * torso/limb underneath it.
 */
export function isPartAssetPixelIncluded(label, partIndex, confidence, spec, x, y) {
  if (label === partIndex) return true;
  if (Number(confidence) < CHARACTER_RIG_MASK_THRESHOLDS.assetAlpha) return false;
  if (spec.shape === "capsule") {
    const overlap = Math.max(2, Number(spec.radiusPx) * 0.38);
    return segmentDistance(x, y, spec.aPoint, spec.bPoint) <= Number(spec.radiusPx) + overlap;
  }
  if (spec.shape === "ellipse") {
    const nx = (x - spec.center.x) / (spec.rx * 1.12);
    const ny = (y - spec.center.y) / (spec.ry * 1.12);
    return nx * nx + ny * ny <= 1;
  }
  if (spec.shape === "polygon") {
    return polygonContains(x, y, spec.polygon) ||
      polygonEdgeDistance(x, y, spec.polygon) <= Math.max(2, Number(spec.width) * 0.075);
  }
  return false;
}

export function buildPosePartSpecs(landmarks, width, height, mask = null, maskWidth = 0, maskHeight = 0) {
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
  specs.push({ ...PARTS[0], pivot: torsoPivot, shape: "polygon", polygon: torsoPoly, width: shoulderWidth, jointPoints: [leftShoulder, rightShoulder, leftHip, rightHip], jointOverlap: Math.max(5, shoulderWidth * 0.11) });
  const lowerGarment = detectLowerGarmentRegion(mask, maskWidth, maskHeight, lm, width, height);
  for (const p of PARTS.slice(1)) {
    if (p.id === "head") {
      specs.push({ ...p, pivot: { x: headCenter.x, y: Math.max(headCenter.y + headRY * 0.72, (leftShoulder.y + rightShoulder.y) / 2 - 2) }, shape: "ellipse", center: headCenter, rx: headRX, ry: headRY, jointPoints: [{ x: headCenter.x, y: headCenter.y + headRY * 0.72 }], jointOverlap: Math.max(5, headRX * 0.22) });
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
    specs.push({ ...p, aPoint: a, bPoint: b, radiusPx: radius, pivot: a, shape: "capsule", jointPoints: [a, b], jointOverlap: Math.max(5, radius * 0.52) });
  }
  // Append the garment after leg parts so it is composited above the moving thighs.
  if (lowerGarment) specs.push(lowerGarment);
  if (!specs.some(x => x.id === "head")) throw new Error("Landmark kepala tidak cukup jelas untuk membuat rig.");
  return specs;
}

/* Pure segmentation assignment, exported for deterministic tests. */
export function keepMeaningfulPartComponents(labels, width, height, partCount, anchors = []) {
  const visited = new Uint8Array(labels.length), queue = new Int32Array(labels.length);
  const components = Array.from({ length: partCount }, () => []);
  const largestSizes = new Int32Array(partCount);
  for (let start = 0; start < labels.length; start++) {
    const label = labels[start];
    if (label < 0 || label >= partCount || visited[start]) continue;
    let head = 0, tail = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    queue[tail++] = start; visited[start] = 1;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = (index / width) | 0;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const next = ny * width + nx;
          if (!visited[next] && labels[next] === label) {
            visited[next] = 1; queue[tail++] = next;
          }
        }
      }
    }
    if (label >= partCount) continue;
    largestSizes[label] = Math.max(largestSizes[label], tail);
    components[label].push({ pixels: queue.slice(0, tail), minX, minY, maxX, maxY });
  }
  labels.fill(-1);
  for (let label = 0; label < partCount; label++) {
    const minimumSize = Math.max(12, Math.ceil(largestSizes[label] * 0.025));
    const partAnchors = anchors[label] || [];
    for (const component of components[label]) {
      const { pixels, minX, minY, maxX, maxY } = component;
      const touchesJoint = partAnchors.some(anchor => {
        const dx = Math.max(minX - anchor.x, 0, anchor.x - maxX);
        const dy = Math.max(minY - anchor.y, 0, anchor.y - maxY);
        return dx * dx + dy * dy <= anchor.radius * anchor.radius;
      });
      // Small regions near a known joint can be valid hands, feet, or narrow
      // limb connections; retain them while continuing to reject remote speckles.
      if (pixels.length < minimumSize && !(touchesJoint && pixels.length >= 3)) continue;
      for (const index of pixels) labels[index] = label;
    }
  }
}
export function assignPosePartLabels(mask, maskWidth, maskHeight, landmarks, width, height) {
  const specs = buildPosePartSpecs(landmarks, width, height, mask, maskWidth, maskHeight);
  const labels = new Int16Array(maskWidth * maskHeight);
  labels.fill(-1);
  const scaleX = width / maskWidth, scaleY = height / maskHeight;
  for (let y = 0; y < maskHeight; y++) {
    const py = (y + 0.5) * scaleY;
    for (let x = 0; x < maskWidth; x++) {
      const idx = y * maskWidth + x;
      if (Number(mask[idx]) < CHARACTER_RIG_MASK_THRESHOLDS.labelAssignment) continue;
      const px = (x + 0.5) * scaleX;
      // Wider garments and loose silhouettes extend beyond the narrow joint capsules.
      // Keep a wider nearest-part envelope so foreground pixels are not erased
      // from the background without being copied into any movable body layer.
      let best = CHARACTER_RIG_MASK_THRESHOLDS.maxPartAssignmentScore, bestIndex = 0;
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
      const garmentIndex = specs.findIndex(spec => spec.id === "lowerGarment");
      if (garmentIndex >= 0 && polygonContains(px, py, specs[garmentIndex].polygon)) bestIndex = garmentIndex;
      if (polygonContains(px, py, specs[0].polygon) && best > 0.72) bestIndex = 0;
      labels[idx] = bestIndex;
    }
  }
  const componentAnchors = specs.map(spec => (spec.jointPoints || []).map(point => ({
    x: point.x / scaleX,
    y: point.y / scaleY,
    radius: Math.max(2, Math.ceil((Number(spec.jointOverlap) || 3) / Math.min(scaleX, scaleY)))
  })));
  keepMeaningfulPartComponents(labels, maskWidth, maskHeight, specs.length, componentAnchors);
  const bounds = specs.map(() => ({ minX: width, minY: height, maxX: -1, maxY: -1 }));
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label < 0) continue;
    const x = i % maskWidth, y = (i / maskWidth) | 0;
    const imageX = Math.max(0, Math.min(width - 1, Math.floor((x + 0.5) * scaleX)));
    const imageY = Math.max(0, Math.min(height - 1, Math.floor((y + 0.5) * scaleY)));
    const box = bounds[label];
    if (!box) { labels[i] = -1; continue; }
    if (imageX < box.minX) box.minX = imageX;
    if (imageY < box.minY) box.minY = imageY;
    if (imageX > box.maxX) box.maxX = imageX;
    if (imageY > box.maxY) box.maxY = imageY;
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
      if (!shouldInpaintMaskPixel(maskAt(mx, my))) { owner[i] = i; queue[tail++] = i; }
    }
  }
  if (!tail) throw new Error("Mask subjek menutupi seluruh gambar; latar tidak dapat direkonstruksi.");
  while (head < tail) {
    const i = queue[head++], x = i % width, y = (i / width) | 0, sourceIndex = owner[i];
    if (x > 0 && owner[i - 1] === -1) { owner[i - 1] = sourceIndex; queue[tail++] = i - 1; }
    if (x + 1 < width && owner[i + 1] === -1) { owner[i + 1] = sourceIndex; queue[tail++] = i + 1; }
    if (y > 0 && owner[i - width] === -1) { owner[i - width] = sourceIndex; queue[tail++] = i - width; }
    if (y + 1 < height && owner[i + width] === -1) { owner[i + width] = sourceIndex; queue[tail++] = i + width; }
  }
  const filled = new ImageData(new Uint8ClampedArray(src), width, height);
  for (let i = 0; i < total; i++) {
    const x = i % width, y = (i / width) | 0;
    if (!shouldInpaintMaskPixel(maskAt(Math.min(maskWidth - 1, Math.floor(x * maskWidth / width)), Math.min(maskHeight - 1, Math.floor(y * maskHeight / height))))) continue;
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
      if (!shouldInpaintMaskPixel(m)) continue;
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
  // Character torso underlay carries one bounds object, while the regular
  // segmentation path carries an array indexed by part. Normalize both shapes.
  const box = Array.isArray(bounds) ? bounds[partIndex] : (partIndex === 0 ? bounds : null);
  if (!box || !Number.isFinite(box.maxX) || !Number.isFinite(box.maxY) ||
      !Number.isFinite(box.minX) || !Number.isFinite(box.minY) ||
      box.maxX < box.minX || box.maxY < box.minY) return null;
  const overlapPad = spec.shape === "capsule" ? Number(spec.radiusPx) * 0.38 :
    spec.shape === "ellipse" ? Math.max(Number(spec.rx), Number(spec.ry)) * 0.12 :
    spec.shape === "polygon" ? Number(spec.width) * 0.075 : 0;
  const pad = Math.max(3, Math.ceil(Number(spec.jointOverlap) || 0), Math.ceil(overlapPad));
  const x0 = Math.max(0, box.minX - pad), y0 = Math.max(0, box.minY - pad);
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
      const confidence = maskAt(mx, my);
      let include = isPartAssetPixelIncluded(label, partIndex, confidence, spec, x + 0.5, y + 0.5);
      if (!include && spec.jointPoints && spec.jointPoints.length) {
        const overlap = Number(spec.jointOverlap) || 3;
        include = confidence >= CHARACTER_RIG_MASK_THRESHOLDS.assetAlpha &&
          spec.jointPoints.some(point => Math.hypot(x + 0.5 - point.x, y + 0.5 - point.y) <= overlap);
      }
      if (!include) continue;
      const alpha = Math.round(255 * Math.max(0, Math.min(1, (confidence - CHARACTER_RIG_MASK_THRESHOLDS.assetAlpha) / (1 - CHARACTER_RIG_MASK_THRESHOLDS.assetAlpha))));
      if (alpha < 8) continue;
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
    maskAt.width = maskWidth; maskAt.height = maskHeight;
    const { specs, labels, bounds } = assignPosePartLabels(rawMask, maskWidth, maskHeight, landmarks, width, height);
    const torsoUnderlay = buildTorsoUnderlay(source, labels, maskWidth, maskHeight, width, height, specs[0], maskAt);
    const background = reconstructBackground(source, rawMask, maskWidth, maskHeight, width, height, maskAt);
    const parts = [];
    for (let i = 0; i < specs.length; i++) {
      const useUnderlay = i === 0 && torsoUnderlay;
      const asset = createPartAsset(
        useUnderlay ? torsoUnderlay.source : source,
        width, height,
        useUnderlay ? torsoUnderlay.labels : labels,
        maskAt, i,
        useUnderlay ? torsoUnderlay.bounds : bounds,
        specs[i]
      );
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
