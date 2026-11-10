/* TROZAL MOTION — Browser AI runtime (Phase 1)
 * Text-to-SVG inference runs locally in the browser with WebLLM + WebGPU.
 * The model weights are fetched from the model registry on first use and
 * cached by the browser. No Ollama, localhost bridge, API key, or AI server.
 */
import { CreateMLCEngine } from "https://esm.sh/@mlc-ai/web-llm@0.2.87";

const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
let enginePromise = null;
let engine = null;

const $ = (id) => document.getElementById(id);
function setStatus(message, isError = false) {
  const node = $("visualMotionAiStatus");
  if (node) {
    node.textContent = message;
    node.style.color = isError ? "#ff9292" : "#a9e9c9";
  }
}
function getGpuSupport() {
  return Boolean(navigator.gpu && window.isSecureContext);
}
async function ensureEngine() {
  if (!getGpuSupport()) {
    throw new Error("WebGPU tidak tersedia. Gunakan Chrome/Edge versi terbaru, aktifkan hardware acceleration, lalu buka ulang browser.");
  }
  if (engine) return engine;
  if (!enginePromise) {
    setStatus("Menyiapkan WebGPU dan mengunduh model AI pertama kali…");
    enginePromise = CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (progress) => {
        const pct = Number.isFinite(progress?.progress)
          ? Math.round(progress.progress * 100) + "%"
          : "";
        setStatus("Memuat model Browser AI " + pct + " · " + (progress?.text || "Menyiapkan GPU"));
      },
    }).then((created) => {
      engine = created;
      setStatus("BROWSER AI SIAP · Model " + MODEL_ID + " berjalan di perangkat.");
      return created;
    }).catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}
function cleanModelCode(raw) {
  let code = String(raw || "").trim();
  code = code.replace(/^\uFEFF/, "");
  code = code.replace(/^\s*```(?:html|svg|xml)?\s*/i, "").replace(/\s*```\s*$/, "");
  const lower = code.toLowerCase();
  const starts = ["<!doctype html", "<html", "<svg"].map((x) => lower.indexOf(x)).filter((x) => x >= 0);
  if (starts.length) code = code.slice(Math.min(...starts));
  const check = code.toLowerCase();
  if (!check.includes("<svg") || !check.includes("</svg>")) {
    throw new Error("Model belum menghasilkan SVG lengkap. Coba brief lebih spesifik atau generate ulang.");
  }
  if (/<script\b|<iframe\b|<object\b|<embed\b/i.test(code)) {
    throw new Error("Output memuat elemen aktif yang diblokir demi keamanan. Coba generate ulang.");
  }
  if (/\b(?:src|href)\s*=\s*["']https?:|@import\s|url\(\s*https?:/i.test(code)) {
    throw new Error("Output mencoba memuat resource eksternal. Hanya SVG/CSS inline yang diizinkan.");
  }
  const doc = new DOMParser().parseFromString(code, "text/html");
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("Struktur SVG tidak valid.");
  const groups = svg.querySelectorAll("g");
  if (groups.length < 3) throw new Error("Adegan perlu minimal 3 grup SVG terpisah. Silakan generate ulang.");
  if (!/<style[\s>]/i.test(code)) {
    throw new Error("Animasi CSS belum ditemukan pada hasil. Generate ulang dengan brief gerakan yang lebih jelas.");
  }
  return code;
}
async function generateScene() {
  const button = $("generateVisualMotionAiBtn");
  const brief = $("visualMotionPrompt")?.value?.trim();
  if (!brief) {
    setStatus("Tulis brief visual terlebih dahulu.", true);
    return;
  }
  if (button?.disabled) return;
  if (button) {
    button.disabled = true;
    button.textContent = "BROWSER AI SEDANG BEKERJA…";
  }
  try {
    const activeEngine = await ensureEngine();
    const ratio = $("visualMotionRatio")?.value || "16:9";
    const duration = Math.max(3, Math.min(60, Number($("visualMotionDuration")?.value) || 15));
    const style = $("visualMotionStyle")?.value || "Cinematic";
    const accent = $("visualMotionAccent")?.value || "Gold";
    const camera = $("visualMotionCamera")?.value || "Slow cinematic";
    const transition = $("visualMotionTransition")?.value || "Smooth";
    setStatus("Menyusun komposisi SVG dan animasi secara lokal pada GPU…");
    const system = [
      "You are an SVG motion-graphics code generator.",
      "Return ONLY one complete <svg>...</svg> element. No HTML wrapper, markdown, comments or explanation.",
      "Use viewBox='0 0 1280 720' and preserve the requested aspect ratio through composition.",
      "Create exactly 4 to 5 concise semantic <g> layers with unique ids: background, environment, main-subject, details, foreground.",
      "Use simple but attractive vector geometry, gradients and inline <style> CSS.",
      "Animate at least 3 groups independently with @keyframes; include animation-duration and transform-origin.",
      "Keep SVG markup compact. Prefer reusable shapes and avoid excessive path coordinates.",
      "All tags and CSS braces MUST be closed. End with </svg>.",
      "No scripts, foreignObject, iframe, canvas, external URLs, remote images, fonts or embedded media."
    ].join(" ");
    const user = [
      "VISUAL BRIEF: " + brief,
      "Aspect ratio: " + ratio + ". Duration: " + duration + " seconds.",
      "Style: " + style + ". Accent: " + accent + ". Camera: " + camera + ". Transition: " + transition + ".",
      "Build one complete motion-graphic scene with distinct SVG layers and visible independent motion."
    ].join("\n");
    let code = "";
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      setStatus(attempt === 1
        ? "AI menyusun SVG ringkas dengan beberapa layer gerak…"
        : "SVG pertama belum valid · AI sedang memperbaiki struktur secara otomatis…");
      const repair = lastError
        ? "REPAIR REQUIRED: The previous output failed validation: " + lastError.message +
          ". Return a fresh complete SVG only. Ensure 4-5 closed <g> layers, a <style> block, 3 independent CSS animations, and the final </svg> tag. Keep it compact."
        : "";
      const result = await activeEngine.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user + (repair ? "\\n\\n" + repair : "") }
        ],
        temperature: attempt === 1 ? 0.25 : 0.15,
        max_tokens: 2800,
      });
      const raw = result?.choices?.[0]?.message?.content || "";
      try {
        code = cleanModelCode(raw);
        lastError = null;
        break;
      } catch (validationError) {
        lastError = validationError;
      }
    }
    if (!code) throw lastError || new Error("Model tidak menghasilkan SVG yang dapat digunakan.");
    $("visualMotionOutput").value = code;
    $("visualMotionPreview").srcdoc = code;
    if (typeof visualMotionPreviewDoc !== "undefined") visualMotionPreviewDoc = null;
    if (typeof visualMotionPreviewAnimations !== "undefined") visualMotionPreviewAnimations = [];
    setStatus("SELESAI · " + code.length.toLocaleString() + " karakter HTML/SVG dibuat oleh Browser AI. Periksa hasil preview sebelum digunakan.");
    const status = $("visualMotionStatus");
    if (status) status.textContent = "TROZAL Browser AI selesai. Hasil dibuat langsung di browser; klik “Kirim ke Preview TROZAL” untuk memuat ke renderer utama.";
  } catch (error) {
    setStatus("GAGAL · " + (error?.message || String(error)), true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "✦ MUAT AI & GENERATE ADEGAN";
    }
  }
}
async function checkBrowserAI() {
  if (!getGpuSupport()) {
    setStatus("WebGPU tidak tersedia pada konteks browser ini. Pastikan situs dibuka melalui HTTPS dan hardware acceleration aktif.", true);
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Browser tidak menemukan GPU adapter yang kompatibel.");
    const info = adapter.info || {};
    const gpuName = [info.vendor, info.architecture, info.device].filter(Boolean).join(" · ");
    setStatus("WEBGPU TERSEDIA" + (gpuName ? " · " + gpuName : "") + ". Klik Generate untuk memuat model AI.");
    return true;
  } catch (error) {
    setStatus("Pemeriksaan GPU gagal · " + (error?.message || String(error)), true);
    return false;
  }
}
window.visualMotionAiCheck = checkBrowserAI;
window.generateVisualMotionWithLocalAi = generateScene;
$("visualMotionAiCheckBtn")?.addEventListener("click", checkBrowserAI);
$("generateVisualMotionAiBtn")?.addEventListener("click", generateScene);


/* Phase 2 — Browser Vision metadata.
 * A compact image-captioning model inspects actual preview frames. The shared
 * WebLLM engine then formats conservative stock metadata from those captions.
 */
let visionCaptionerPromise = null;
async function ensureVisionCaptioner() {
  if (visionCaptionerPromise) return visionCaptionerPromise;
  visionCaptionerPromise = (async () => {
    const { pipeline } = await import("https://esm.sh/@huggingface/transformers@3.8.1");
    setVisionStatus("Mengunduh dan menyiapkan model image-captioning untuk browser…");
    try {
      return await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", {
        device: "webgpu",
        dtype: "q4",
      });
    } catch (gpuError) {
      setVisionStatus("Vision WebGPU tidak tersedia untuk model ini. Beralih ke CPU/WASM…");
      return await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", {
        dtype: "q8",
      });
    }
  })().catch((error) => {
    visionCaptionerPromise = null;
    throw error;
  });
  return visionCaptionerPromise;
}
function setVisionStatus(message, isError = false) {
  const node = $("trozalVisionStatus");
  if (node) {
    node.textContent = message;
    node.style.color = isError ? "#ff9292" : "#a9e9c9";
  }
}
function setMetadataSourceStatus(message, isError = false) {
  const node = $("trozalMetadataSourceStatus");
  if (node) {
    node.textContent = message;
    node.style.color = isError ? "#ff9292" : "#72e6b2";
  }
}
function base64ToImage(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar frame tidak dapat dibaca oleh browser."));
    img.src = "data:image/jpeg;base64," + base64;
  });
}
async function captionImages(base64Images) {
  const captioner = await ensureVisionCaptioner();
  const captions = [];
  for (let i = 0; i < base64Images.length; i++) {
    setVisionStatus("Menganalisis gambar " + (i + 1) + " dari " + base64Images.length + " dengan model vision…");
    const image = await base64ToImage(base64Images[i]);
    const result = await captioner(image, { max_new_tokens: 48 });
    const caption = Array.isArray(result)
      ? String(result[0]?.generated_text || "")
      : String(result?.generated_text || "");
    if (caption.trim()) captions.push(caption.trim());
  }
  if (!captions.length) throw new Error("Model Vision tidak menghasilkan caption. Coba gambar lain atau pastikan objek terlihat jelas.");
  return captions;
}
function parseMetadataJson(raw) {
  let text = String(raw || "").trim().replace(/^\uFEFF/, "");
  text = text.replace(/^\s*```(?:json)?/i, "").replace(/\s*```\s*$/, "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Browser AI tidak mengembalikan JSON metadata yang valid.");
  return JSON.parse(text.slice(first, last + 1));
}
async function composeMetadataFromCaptions(captions) {
  const activeEngine = await ensureEngine();
  const categories = [...($("metadataCategory")?.options || [])].map((option) => option.text);
  const evidence = captions.map((caption, i) => "Frame " + (i + 1) + ": " + caption).join("\n");
  const prompt = [
    "Create conservative stock-motion metadata using ONLY these image-caption observations.",
    "Do not invent brands, exact locations, identities, hidden objects, or motion not evidenced by captions.",
    "If a detail is uncertain, omit it. Return JSON only.",
    'Schema: {"title":"English title max 100 chars","description":"English description 1-2 factual sentences","category":"one allowed category","keywords":["up to 20 specific English keywords"],"visual_summary":"brief evidence summary","confidence_notes":"uncertainty or empty string"}.',
    "Allowed categories: " + categories.join(" | "),
    "VISUAL EVIDENCE:\n" + evidence,
  ].join("\n");
  const result = await activeEngine.chat.completions.create({
    messages: [
      { role: "system", content: "You are a strict visual metadata editor. Never add details absent from evidence. Output valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 650,
  });
  return { parsed: parseMetadataJson(result?.choices?.[0]?.message?.content || ""), evidence };
}
function applyBrowserMetadata(parsed, captions, evidenceLabel) {
  const title = String(parsed.title || "").trim().slice(0, 150);
  const description = String(parsed.description || "").trim();
  if (!title || !description) throw new Error("Judul atau deskripsi metadata kosong. Silakan ulangi analisis.");
  const categories = [...($("metadataCategory")?.options || [])].map((option) => option.text);
  const category = categories.find((value) => value.toLowerCase() === String(parsed.category || "").trim().toLowerCase()) || "Graphic Resources";
  const evidenceText = captions.join(" ").toLowerCase();
  const evidenceTokens = new Set(evidenceText.match(/[a-z0-9]+/g) || []);
  const keywords = [...new Set((Array.isArray(parsed.keywords) ? parsed.keywords : [])
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => {
      const words = item.match(/[a-z0-9]+/g) || [];
      return words.length > 0 && words.length <= 4 && words.every((word) => evidenceTokens.has(word));
    }))].slice(0, 20);
  $("metadataTitle").value = title;
  $("metadataTitle").dataset.baseTitle = title;
  $("metadataDescription").value = description;
  $("metadataCategory").value = category;
  $("metadataKeywords").value = keywords.join(", ");
  if ($("metadataEvidence")) {
    $("metadataEvidence").textContent = "BUKTI BROWSER VISION · " + evidenceLabel + " · " + captions.length + " frame. " + captions.join(" | ") + (parsed.confidence_notes ? " Catatan: " + parsed.confidence_notes : "") + " · Periksa kembali hasil sebelum ekspor.";
  }
  if (typeof updateMetadataCount === "function") updateMetadataCount();
  if (typeof trozalRefreshMetadataQuality === "function") trozalRefreshMetadataQuality();
  if (typeof trozalUpdateMetadataPlatformValidation === "function") trozalUpdateMetadataPlatformValidation();
  if (typeof scheduleAutosave === "function") scheduleAutosave();
  return { title, description, category, keywords };
}
async function analyzeCurrentPreviewWithBrowserVision() {
  const button = $("trozalVisionAnalyzeBtn");
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    let images = [];
    const selected = [...($("trozalVisionImages")?.files || [])].slice(0, 3);
    if (selected.length) {
      for (const file of selected) {
        if (file.size > 12 * 1024 * 1024) throw new Error("Ukuran " + file.name + " melebihi 12 MB.");
        const base64 = await window.trozalVisionReadFile(file);
        const dataUrl = "data:" + (file.type || "image/jpeg") + ";base64," + base64;
        const resized = await window.trozalVisionResizeImage(dataUrl);
        images.push(resized);
      }
    } else {
      if (typeof window.trozalVisionCapturePreviewFrames !== "function") {
        throw new Error("Fungsi capture Preview belum tersedia. Muat ulang halaman dan coba lagi.");
      }
      setVisionStatus("Mengambil 3 frame dari Preview utama TROZAL…");
      images = await window.trozalVisionCapturePreviewFrames();
    }
    if (!images.length) throw new Error("Tidak ada frame yang dapat dianalisis.");
    const captions = await captionImages(images);
    setVisionStatus("Menyusun metadata dari caption visual yang terukur…");
    const { parsed } = await composeMetadataFromCaptions(captions);
    const applied = applyBrowserMetadata(parsed, captions, "Preview utama");
    setVisionStatus("SELESAI · " + captions.length + " frame dianalisis. Metadata diperbarui dari caption visual. Periksa hasilnya.");
    return applied;
  } catch (error) {
    setVisionStatus("ANALISIS GAGAL · " + (error?.message || String(error)), true);
  } finally {
    if (button) button.disabled = false;
  }
}
async function analyzeSourceWithBrowserVision(kind) {
  const button = $(kind === "html" ? "metadataFromHtmlMotionBtn" : "metadataFromSceneAiBtn");
  const other = $(kind === "html" ? "metadataFromSceneAiBtn" : "metadataFromHtmlMotionBtn");
  if (!button || button.disabled) return;
  button.disabled = true;
  if (other) other.disabled = true;
  try {
    const collect = kind === "html" ? window.trozalMetadataCollectHtmlMotion : window.trozalMetadataCollectSceneAi;
    if (typeof collect !== "function") throw new Error("Pengambil sumber metadata belum siap. Muat ulang halaman.");
    const source = collect();
    if (!source?.code || source.code.trim().length < 80) throw new Error("Sumber visual kosong atau terlalu pendek.");
    setMetadataSourceStatus("Memuat " + source.label + " ke Preview utama TROZAL…");
    $("aiCodeTerminal").value = source.code;
    if (typeof window.generateMotionSvgLocally !== "function") throw new Error("Renderer TROZAL belum siap.");
    await window.generateMotionSvgLocally();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const images = await window.trozalVisionCapturePreviewFrames();
    const captions = await captionImages(images);
    setMetadataSourceStatus("Menyusun metadata berdasarkan " + captions.length + " frame hasil render…");
    const { parsed } = await composeMetadataFromCaptions(captions);
    applyBrowserMetadata(parsed, captions, source.label);
    setMetadataSourceStatus("SELESAI · Metadata " + source.label + " dihasilkan dari " + captions.length + " frame Preview aktual.");
  } catch (error) {
    setMetadataSourceStatus("GAGAL · " + (error?.message || String(error)), true);
  } finally {
    button.disabled = false;
    if (other) other.disabled = false;
  }
}
$("trozalVisionCheckBtn")?.addEventListener("click", async () => {
  try {
    const { pipeline } = await import("https://esm.sh/@huggingface/transformers@3.8.1");
    if (!pipeline) throw new Error("Transformers.js tidak dapat dimuat.");
    setVisionStatus("Transformers.js tersedia. Model Vision akan diunduh saat analisis pertama.");
    const connection = $("trozalVisionConnection");
    if (connection) connection.textContent = "Browser Vision runtime tersedia · model Xenova/vit-gpt2-image-captioning";
  } catch (error) {
    setVisionStatus("Runtime Vision gagal dimuat · " + (error?.message || String(error)), true);
  }
});
$("trozalVisionAnalyzeBtn")?.addEventListener("click", analyzeCurrentPreviewWithBrowserVision);
$("metadataFromHtmlMotionBtn")?.addEventListener("click", () => analyzeSourceWithBrowserVision("html"));
$("metadataFromSceneAiBtn")?.addEventListener("click", () => analyzeSourceWithBrowserVision("scene"));
