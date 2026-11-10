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
function safeText(value, fallback, max = 80) {
  const text = String(value || fallback).replace(/[<>\u0000-\u001f]/g, "").trim();
  return text.slice(0, max) || fallback;
}
function extractPlan(raw, brief, accent) {
  const source = String(raw || "").trim();
  const match = source.match(/\{[\s\S]*\}/);
  let plan = {};
  if (match) {
    try { plan = JSON.parse(match[0]); } catch (_) { plan = {}; }
  }
  const ring = /ring|cincin|jewelry|jewellery|diamond|berlian/i.test(brief);
  const watch = /watch|jam tangan|timepiece/i.test(brief);
  const palette = /silver|perak|chrome/i.test(brief) ? ["#dce7f2","#8797aa","#f7fbff"]
    : /blue|biru/i.test(brief) ? ["#8bd5ff","#2864b8","#e9f8ff"]
    : /red|merah/i.test(brief) ? ["#ff9a8b","#a8293c","#ffe5dc"]
    : ["#ffe6a0","#a96b18","#fff7d8"];
  return {
    subject: safeText(plan.subject, ring ? "Luxury diamond ring" : watch ? "Luxury wristwatch" : "Cinematic hero object"),
    environment: safeText(plan.environment, "Dark premium studio with soft atmospheric glow"),
    motion: safeText(plan.motion, "slow floating rotation with gentle light sweep"),
    accent: palette[0],
    metal: palette[1],
    highlight: palette[2],
    motif: ring ? "ring" : watch ? "watch" : "orb",
    duration: Math.max(3, Math.min(60, Number(plan.duration) || 12))
  };
}
function renderProceduralScene(plan, ratio, duration, brief) {
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const ring = plan.motif === "ring";
  const watch = plan.motif === "watch";
  const subject = esc(plan.subject);
  const safeDuration = Math.max(3, Math.min(60, Number(duration) || plan.duration || 12));
  const hero = ring
    ? '<ellipse cx="640" cy="405" rx="176" ry="68" fill="none" stroke="url(#metal)" stroke-width="42" transform="rotate(-18 640 405)"/><ellipse cx="640" cy="405" rx="176" ry="68" fill="none" stroke="#fff2c6" stroke-opacity=".7" stroke-width="4" transform="rotate(-18 640 405)"/><path d="M640 250 L680 310 L640 352 L600 310 Z" fill="url(#shine)" stroke="#fff" stroke-width="3"/><path d="M640 250 L640 352 M600 310 L680 310" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>'
    : watch
    ? '<circle cx="640" cy="390" r="155" fill="url(#metal)" stroke="#fff2cf" stroke-width="8"/><circle cx="640" cy="390" r="126" fill="#101923" stroke="#f5d88b" stroke-width="5"/><path d="M640 390 L640 292 M640 390 L715 430" stroke="#fff2cf" stroke-width="9" stroke-linecap="round"/><circle cx="640" cy="390" r="12" fill="#fff"/>'
    : '<circle cx="640" cy="380" r="150" fill="url(#metal)" stroke="#fff" stroke-opacity=".7" stroke-width="5"/><ellipse cx="590" cy="325" rx="58" ry="30" fill="#fff" opacity=".38" transform="rotate(-30 590 325)"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="${subject}">
  <defs>
    <radialGradient id="bg"><stop stop-color="#26313c"/><stop offset="1" stop-color="#05070b"/></radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${plan.highlight}"/><stop offset=".28" stop-color="${plan.accent}"/><stop offset=".62" stop-color="${plan.metal}"/><stop offset="1" stop-color="#fff0c2"/></linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".5" stop-color="${plan.highlight}"/><stop offset="1" stop-color="${plan.accent}"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      @keyframes heroFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-18px) rotate(2deg)}}
      @keyframes haloPulse{0%,100%{opacity:.25;transform:scale(.92)}50%{opacity:.7;transform:scale(1.08)}}
      @keyframes lightSweep{0%{transform:translateX(-260px);opacity:0}25%{opacity:.8}75%{opacity:.5}100%{transform:translateX(520px);opacity:0}}
      @keyframes sparkle{0%,100%{opacity:.2;transform:scale(.65)}50%{opacity:1;transform:scale(1.3)}}
      #main-subject{animation:heroFloat ${safeDuration}s ease-in-out infinite;transform-origin:640px 370px}
      #environment{animation:haloPulse ${Math.max(4,safeDuration*.8)}s ease-in-out infinite;transform-origin:640px 360px}
      #foreground{animation:lightSweep ${Math.max(5,safeDuration*.7)}s ease-in-out infinite}
      #details .spark{animation:sparkle 2.4s ease-in-out infinite;transform-origin:center}
    </style>
  </defs>
  <g id="background"><rect width="1280" height="720" fill="url(#bg)"/><path d="M0 570 Q640 500 1280 570 V720 H0Z" fill="#080b10"/><ellipse cx="640" cy="600" rx="390" ry="42" fill="#000" opacity=".55"/></g>
  <g id="environment"><ellipse cx="640" cy="365" rx="300" ry="250" fill="none" stroke="${plan.accent}" stroke-opacity=".35" stroke-width="2" filter="url(#glow)"/><ellipse cx="640" cy="365" rx="235" ry="190" fill="${plan.accent}" opacity=".06"/></g>
  <g id="main-subject">${hero}</g>
  <g id="details"><path class="spark" d="M850 245 l8 24 24 8 -24 8 -8 24 -8 -24 -24 -8 24 -8Z" fill="#fff" filter="url(#glow)"/><path class="spark" d="M420 300 l5 15 15 5 -15 5 -5 15 -5 -15 -15 -5 15 -5Z" fill="${plan.highlight}"/><circle cx="790" cy="470" r="5" fill="#fff"/><circle cx="500" cy="475" r="4" fill="#fff"/></g>
  <g id="foreground"><path d="M180 610 Q640 560 1100 610" fill="none" stroke="${plan.accent}" stroke-opacity=".35" stroke-width="2"/><rect x="0" y="0" width="1280" height="720" fill="url(#bg)" opacity="0"/></g>
  <g id="caption"><text x="640" y="665" text-anchor="middle" fill="#f8e8c1" font-family="Arial,sans-serif" font-size="22" letter-spacing="5">${subject.toUpperCase()}</text></g>
</svg>`;
}
async function generateScene() {
  const button = $("generateVisualMotionAiBtn");
  const brief = $("visualMotionPrompt")?.value?.trim();
  if (!brief) { setStatus("Tulis brief visual terlebih dahulu.", true); return; }
  if (button?.disabled) return;
  if (button) { button.disabled = true; button.textContent = "BROWSER AI SEDANG BEKERJA…"; }
  try {
    const activeEngine = await ensureEngine();
    const ratio = $("visualMotionRatio")?.value || "16:9";
    const duration = Math.max(3, Math.min(60, Number($("visualMotionDuration")?.value) || 15));
    const style = $("visualMotionStyle")?.value || "Cinematic";
    const accent = $("visualMotionAccent")?.value || "Gold";
    const camera = $("visualMotionCamera")?.value || "Slow cinematic";
    const transition = $("visualMotionTransition")?.value || "Smooth";
    setStatus("Browser AI menyusun arahan adegan ringkas…");
    const result = await activeEngine.chat.completions.create({
      messages: [
        { role: "system", content: 'Return ONLY compact JSON: {"subject":"...","environment":"...","motion":"...","duration":12}. No markdown. Keep each text field under 12 words.' },
        { role: "user", content: "Brief: " + brief + ". Style: " + style + ". Accent: " + accent + ". Camera: " + camera + ". Transition: " + transition + ". Duration: " + duration + " seconds. Describe the subject and environment faithfully." }
      ],
      temperature: 0.2,
      max_tokens: 220
    });
    const plan = extractPlan(result?.choices?.[0]?.message?.content || "", brief, accent);
    setStatus("AI menyusun arahan gerak · mesin SVG TROZAL membangun layer dan animasi…");
    const code = renderProceduralScene(plan, ratio, duration, brief);
    if (!code.includes("</svg>")) throw new Error("Mesin SVG internal gagal menyelesaikan dokumen.");
    $("visualMotionOutput").value = code;
    $("visualMotionPreview").srcdoc = code;
    if (typeof visualMotionPreviewDoc !== "undefined") visualMotionPreviewDoc = null;
    if (typeof visualMotionPreviewAnimations !== "undefined") visualMotionPreviewAnimations = [];
    setStatus("SELESAI · Scene SVG dibuat oleh mesin internal TROZAL dengan arahan Browser AI. " + code.length.toLocaleString() + " karakter.");
    const status = $("visualMotionStatus");
    if (status) status.textContent = "TROZAL Browser AI selesai. Scene SVG ber-layer dan animasi CSS siap diperiksa; klik “Kirim ke Preview TROZAL” untuk memuat ke renderer utama.";
  } catch (error) {
    setStatus("GAGAL · " + (error?.message || String(error)), true);
  } finally {
    if (button) { button.disabled = false; button.textContent = "✦ MUAT AI & GENERATE ADEGAN"; }
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
    // Transformers.js image-to-text accepts an image URL/string input. Passing
    // an HTMLImageElement can throw: "Unsupported input type: object".
    // Keep the frame in-memory as a data URL; no upload or remote image request.
    const raw = String(base64Images[i] || "");
    const imageInput = raw.startsWith("data:image/")
      ? raw
      : "data:image/jpeg;base64," + raw.replace(/^data:[^,]*,/, "");
    const result = await captioner(imageInput, { max_new_tokens: 48 });
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
function buildMetadataFallback(captions, categories) {
  const clean = captions.map((caption) => String(caption || "").replace(/\\s+/g, " ").trim()).filter(Boolean);
  if (!clean.length) throw new Error("Tidak ada caption visual untuk membentuk metadata cadangan.");
  const combined = clean.join(". ");
  const first = clean[0].replace(/[.!?]+$/, "");
  const title = first.charAt(0).toUpperCase() + first.slice(1);
  const stop = new Set(["the","a","an","and","or","with","on","in","at","of","to","is","are","there","this","that","it","image","picture","photo","frame","showing","shows"]);
  const words = (combined.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []);
  const keywords = [...new Set(words.filter((word) => !stop.has(word)))].slice(0, 20);
  const lower = combined.toLowerCase();
  const categoryHints = [
    [/person|people|man |woman |child|human|face/, "People"],
    [/plant|flower|tree|leaf|garden/, "Plants and Flowers"],
    [/food|fruit|vegetable|dish|meal/, "Food"],
    [/car|vehicle|truck|train|airplane|motorcycle/, "Transportation"],
    [/building|house|architecture|bridge/, "Buildings and Architecture"],
    [/mountain|ocean|sea|forest|river|animal|nature/, "Nature"],
    [/computer|phone|screen|technology|electronic/, "Technology"],
    [/sport|ball|football|basketball|athlete/, "Sports"],
  ];
  let category = "Graphic Resources";
  for (const [pattern, candidate] of categoryHints) {
    if (pattern.test(lower) && categories.includes(candidate)) { category = candidate; break; }
  }
  return {
    title: title.slice(0, 100),
    description: clean.slice(0, 3).join(". ").replace(/[.!?]*$/, ".").slice(0, 500),
    category,
    keywords,
    visual_summary: clean.slice(0, 3).join("; "),
    confidence_notes: "Fallback metadata generated directly from image captions because the language model did not return valid JSON. Review before export."
  };
}
async function composeMetadataFromCaptions(captions) {
  const categories = [...($("metadataCategory")?.options || [])].map((option) => option.text);
  const evidence = captions.map((caption, i) => "Frame " + (i + 1) + ": " + caption).join("\n");
  const fallback = () => buildMetadataFallback(captions, categories);
  try {
    const activeEngine = await ensureEngine();
    const prompt = [
      "Return one compact valid JSON object only. No markdown or explanation.",
      "Use ONLY these image-caption observations. Do not invent details.",
      'Keys: title, description, category, keywords, visual_summary, confidence_notes.',
      "title: English, max 100 characters. description: one factual sentence. keywords: array, max 15.",
      "category must exactly match one of: " + categories.join(" | "),
      "Evidence: " + evidence,
    ].join("\n");
    const result = await activeEngine.chat.completions.create({
      messages: [
        { role: "system", content: "Output a single valid JSON object. No prose, no markdown, no trailing commas." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 420,
    });
    const raw = result?.choices?.[0]?.message?.content || "";
    try {
      return { parsed: parseMetadataJson(raw), evidence, source: "browser-ai" };
    } catch (parseError) {
      setVisionStatus("Format JSON AI tidak valid. Menggunakan metadata cadangan dari caption visual…");
      return { parsed: fallback(), evidence, source: "caption-fallback", parseWarning: parseError.message };
    }
  } catch (error) {
    setVisionStatus("Model bahasa tidak siap. Menyusun metadata langsung dari caption visual…");
    return { parsed: fallback(), evidence, source: "caption-fallback", modelWarning: error?.message || String(error) };
  }
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
