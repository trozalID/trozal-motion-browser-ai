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
      "You are an expert motion graphics designer and SVG animation engineer.",
      "Return only a complete standalone HTML document. No markdown or explanation.",
      "Create a polished, coherent scene that depicts the user's brief accurately.",
      "Use inline SVG with at least five semantic independently addressable <g> layers.",
      "Give each group a unique descriptive id: background, environment, main-subject, secondary-objects, foreground.",
      "Animate at least three groups independently with inline CSS @keyframes and sensible transform-origin.",
      "Use detailed vector shapes, gradients, layered lighting and depth; avoid generic icon placeholders.",
      "Set the SVG viewBox and preserve the requested aspect ratio. Keep all key objects inside the frame.",
      "No JavaScript, scripts, iframe, canvas, external URLs, remote images, external fonts or embedded media.",
      "Use complete valid HTML, SVG and CSS. Keep output concise enough to finish."
    ].join(" ");
    const user = [
      "VISUAL BRIEF: " + brief,
      "Aspect ratio: " + ratio + ". Duration: " + duration + " seconds.",
      "Style: " + style + ". Accent: " + accent + ". Camera: " + camera + ". Transition: " + transition + ".",
      "Build one complete motion-graphic scene with distinct SVG layers and visible independent motion."
    ].join("\n");
    const result = await activeEngine.chat.completions.create({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.45,
      max_tokens: 1800,
    });
    const raw = result?.choices?.[0]?.message?.content || "";
    const code = cleanModelCode(raw);
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
