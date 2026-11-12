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
  if (match) { try { plan = JSON.parse(match[0]); } catch (_) { plan = {}; } }
  const text = String(brief || "").toLowerCase();
  const has = (pattern) => pattern.test(text);
  const ring = has(/ring|cincin|jewelry|jewellery|diamond|berlian/);
  const watch = has(/watch|jam tangan|timepiece/);
  const planet = has(/planet|saturn|saturnus|earth|bumi|mars|jupiter|astronomy|astronomi|orbit|galaxy|galaksi/);
  const car = has(/car|mobil|automotive|otomotif|vehicle|kendaraan|supercar|sports car/);
  const flower = has(/flower|bunga|rose|mawar|tulip|flora|petal/);
  const building = has(/building|gedung|architecture|arsitektur|house|rumah|skyscraper|pencakar langit|bridge|jembatan/);
  const bottle = has(/bottle|botol|perfume|parfum|cosmetic|kosmetik|skincare|product packaging/);
  const phone = has(/phone|smartphone|mobile phone|ponsel|handphone|tablet|device|gadget/);
  const motif = ring ? "ring" : watch ? "watch" : planet ? "planet" : car ? "car" : flower ? "flower" : building ? "building" : bottle ? "bottle" : phone ? "phone" : "orb";
  const palette = has(/silver|perak|chrome|metallic grey/) ? ["#dce7f2","#8797aa","#f7fbff"]
    : has(/blue|biru|ocean|laut/) ? ["#8bd5ff","#2864b8","#e9f8ff"]
    : has(/red|merah|crimson/) ? ["#ff9a8b","#a8293c","#ffe5dc"]
    : has(/green|hijau|emerald/) ? ["#8ce0ad","#18794e","#eaffef"]
    : has(/purple|ungu|violet/) ? ["#d2a5ff","#65349a","#f5e9ff"]
    : ["#ffe6a0","#a96b18","#fff7d8"];
  const userAccent = /^#[0-9a-f]{6}$/i.test(String(accent || "")) ? accent : palette[0];
  return {
    subject: safeText(plan.subject, ring ? "Luxury diamond ring" : watch ? "Luxury wristwatch" : planet ? "Cinematic planet" : car ? "Premium sports car" : flower ? "Elegant flower" : building ? "Modern architecture" : bottle ? "Premium product bottle" : phone ? "Modern smartphone" : "Cinematic hero object"),
    environment: safeText(plan.environment, "Dark premium studio with soft atmospheric glow"),
    motion: safeText(plan.motion, "slow floating rotation with gentle light sweep"),
    accent: userAccent, metal: palette[1], highlight: palette[2], motif,
    duration: Math.max(3, Math.min(60, Number(plan.duration) || 12))
  };
}
function renderProceduralScene(plan, ratio, duration, brief, options = {}) {
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const motif = plan.motif || "orb", subject = esc(plan.subject);
  const safeDuration = Math.max(3, Math.min(60, Number(duration) || plan.duration || 12));
  const metal = plan.metal || "#a96b18", accent = plan.accent || "#ffe6a0", highlight = plan.highlight || "#fff7d8";
  const camera = options.camera || "parallax";
  const visualStyle = options.style || "cinematic";
  const transition = options.transition || "crossfade";
  const particles = options.particles !== false;
  const depth = options.depth !== false;
  const heroMotion = camera === "locked" ? "none" : camera === "orbit" ? "heroOrbit" : camera === "pan" || camera === "follow" ? "heroPan" : "heroFloat";
  const revealMotion = transition === "slide" ? "sceneSlide" : transition === "zoom" ? "sceneZoom" : transition === "glitch" ? "sceneGlitch" : "sceneFade";
  const backgroundStart = visualStyle === "neon" ? "#10102b" : visualStyle === "papercut" ? "#25313a" : visualStyle === "illustration" ? "#263b42" : "#26313c";
  let hero = "";
  if (motif === "ring") {
    hero = '<ellipse cx="640" cy="405" rx="176" ry="68" fill="none" stroke="url(#metal)" stroke-width="42" transform="rotate(-18 640 405)"/><ellipse cx="640" cy="405" rx="176" ry="68" fill="none" stroke="#fff2c6" stroke-opacity=".7" stroke-width="4" transform="rotate(-18 640 405)"/><path d="M640 250 L680 310 L640 352 L600 310 Z" fill="url(#shine)" stroke="#fff" stroke-width="3"/><path d="M640 250 L640 352 M600 310 L680 310" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>';
  } else if (motif === "watch") {
    hero = '<path d="M575 190 L705 190 L730 285 L550 285Z M550 495 L730 495 L705 590 L575 590Z" fill="url(#metal)" stroke="#fff2cf" stroke-width="7"/><circle cx="640" cy="390" r="155" fill="url(#metal)" stroke="#fff2cf" stroke-width="8"/><circle cx="640" cy="390" r="126" fill="#101923" stroke="#f5d88b" stroke-width="5"/><path d="M640 390 L640 292 M640 390 L715 430" stroke="#fff2cf" stroke-width="9" stroke-linecap="round"/><circle cx="640" cy="390" r="12" fill="#fff"/>';
  } else if (motif === "planet") {
    hero = '<ellipse cx="640" cy="390" rx="285" ry="82" fill="none" stroke="url(#shine)" stroke-width="22" transform="rotate(-17 640 390)" opacity=".9"/><ellipse cx="640" cy="390" rx="285" ry="82" fill="none" stroke="#fff" stroke-width="2" transform="rotate(-17 640 390)" opacity=".7"/><circle cx="640" cy="390" r="150" fill="url(#planetSurface)" stroke="#fff" stroke-opacity=".55" stroke-width="4"/><path d="M520 330 Q610 290 745 340 M500 405 Q630 455 770 390 M550 485 Q650 510 735 460" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="17"/>';
  } else if (motif === "car") {
    hero = '<path d="M365 455 L410 365 Q430 335 485 325 L745 325 Q795 335 835 390 L895 430 L915 500 L365 500Z" fill="url(#metal)" stroke="#fff0c8" stroke-width="8" stroke-linejoin="round"/><path d="M475 350 L725 350 Q765 355 800 415 L435 415Z" fill="#101b2a" stroke="#d9eaff" stroke-width="5"/><path d="M390 455 L890 455" stroke="#fff" stroke-opacity=".7" stroke-width="5"/><circle cx="485" cy="500" r="55" fill="#090d13" stroke="#c5d1df" stroke-width="12"/><circle cx="485" cy="500" r="19" fill="url(#shine)"/><circle cx="790" cy="500" r="55" fill="#090d13" stroke="#c5d1df" stroke-width="12"/><circle cx="790" cy="500" r="19" fill="url(#shine)"/><path d="M370 445 L425 445 M850 445 L905 445" stroke="#fff4ce" stroke-width="12" stroke-linecap="round"/>';
  } else if (motif === "flower") {
    hero = '<g fill="url(#shine)" stroke="#fff7df" stroke-opacity=".8" stroke-width="3">'+Array.from({length:8},(_,i)=>'<ellipse cx="640" cy="285" rx="48" ry="112" transform="rotate('+(i*45)+' 640 390)"/>').join("")+'</g><circle cx="640" cy="390" r="65" fill="url(#metal)" stroke="#fff2cf" stroke-width="5"/><path d="M640 455 Q620 545 650 600 M645 520 Q560 490 530 540 M645 545 Q720 485 760 530" fill="none" stroke="#54b77a" stroke-width="18" stroke-linecap="round"/>';
  } else if (motif === "building") {
    hero = '<path d="M475 590 L475 330 L640 205 L805 330 L805 590Z" fill="url(#metal)" stroke="#fff1ca" stroke-width="7"/><path d="M520 350 L760 350 M520 425 L760 425 M520 500 L760 500" stroke="#fff" stroke-opacity=".35" stroke-width="5"/>'+Array.from({length:3},(_,row)=>Array.from({length:4},(_,col)=>'<rect x="'+(535+col*58)+'" y="'+(370+row*72)+'" width="28" height="38" rx="3" fill="#142334" stroke="#fff0c8" stroke-opacity=".65"/>').join("")).join("")+'<path d="M615 590 L615 520 Q640 480 665 520 L665 590" fill="#17202c" stroke="#fff0c8" stroke-width="4"/>';
  } else if (motif === "bottle") {
    hero = '<path d="M600 210 L680 210 L680 285 L720 330 L745 565 Q745 595 710 600 L570 600 Q535 595 535 565 L560 330 L600 285Z" fill="url(#metal)" stroke="#fff4d5" stroke-width="7"/><rect x="605" y="155" width="70" height="62" rx="9" fill="url(#metal)" stroke="#fff" stroke-width="4"/><path d="M565 410 Q640 390 715 410 L725 525 Q640 545 555 525Z" fill="#14202b" stroke="#fff" stroke-opacity=".65" stroke-width="3"/><path d="M590 455 L690 455" stroke="#fff2cf" stroke-width="5" opacity=".8"/>';
  } else if (motif === "phone") {
    hero = '<rect x="525" y="185" width="230" height="420" rx="34" fill="url(#metal)" stroke="#fff2cf" stroke-width="8"/><rect x="542" y="210" width="196" height="370" rx="23" fill="#101923" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><rect x="605" y="222" width="90" height="12" rx="6" fill="#7e8998"/><circle cx="640" cy="550" r="9" fill="#dce7f2"/><path d="M565 300 Q640 255 715 300 L715 470 Q640 520 565 470Z" fill="url(#shine)" opacity=".75"/>';
  } else {
    hero = '<circle cx="640" cy="380" r="150" fill="url(#metal)" stroke="#fff" stroke-opacity=".7" stroke-width="5"/><ellipse cx="590" cy="325" rx="58" ry="30" fill="#fff" opacity=".38" transform="rotate(-30 590 325)"/>';
  }
  const frame = ratio === "9:16" ? { viewBox: "0 0 720 1280", transform: "translate(-184 310) scale(.85)" }
    : ratio === "4:5" ? { viewBox: "0 0 576 720", transform: "translate(-281 50) scale(.9)" }
    : ratio === "1:1" ? { viewBox: "0 0 720 720", transform: "translate(-280 0)" }
    : ratio === "21:9" ? { viewBox: "0 0 1680 720", transform: "translate(200 0)" }
    : { viewBox: "0 0 1280 720", transform: "" };
  const viewBox = frame.viewBox;
  const sceneTransform = frame.transform ? ' transform="'+frame.transform+'"' : "";
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+viewBox+'" role="img" aria-label="'+subject+'"><defs>',
    '<radialGradient id="bg"><stop stop-color="'+backgroundStart+'"/><stop offset="1" stop-color="#05070b"/></radialGradient>',
    '<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+highlight+'"/><stop offset=".28" stop-color="'+accent+'"/><stop offset=".62" stop-color="'+metal+'"/><stop offset="1" stop-color="#fff0c2"/></linearGradient>',
    '<linearGradient id="shine"><stop stop-color="#fff"/><stop offset=".5" stop-color="'+highlight+'"/><stop offset="1" stop-color="'+accent+'"/></linearGradient>',
    '<radialGradient id="planetSurface"><stop stop-color="'+highlight+'"/><stop offset=".55" stop-color="'+accent+'"/><stop offset="1" stop-color="'+metal+'"/></radialGradient>',
    '<filter id="glow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    '<style>@keyframes heroFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-18px) rotate(2deg)}}@keyframes heroOrbit{0%{transform:rotate(-5deg) translateX(-18px)}50%{transform:rotate(5deg) translateX(18px)}100%{transform:rotate(-5deg) translateX(-18px)}}@keyframes heroPan{0%,100%{transform:translateX(-16px)}50%{transform:translateX(16px)}}@keyframes haloPulse{0%,100%{opacity:.25;transform:scale(.92)}50%{opacity:.7;transform:scale(1.08)}}@keyframes lightSweep{0%{transform:translateX(-260px);opacity:0}25%{opacity:.8}75%{opacity:.5}100%{transform:translateX(520px);opacity:0}}@keyframes sparkle{0%,100%{opacity:.2;transform:scale(.65)}50%{opacity:1;transform:scale(1.3)}}@keyframes sceneFade{from{opacity:0}to{opacity:1}}@keyframes sceneSlide{from{opacity:0;transform:translateX(70px)}to{opacity:1;transform:translateX(0)}}@keyframes sceneZoom{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}@keyframes sceneGlitch{0%{opacity:0;transform:translateX(-10px)}35%{opacity:.8;transform:translateX(7px)}70%{opacity:1;transform:translateX(-3px)}100%{opacity:1;transform:translateX(0)}}#main-subject{animation:'+(camera==="locked"?"none":heroMotion+" "+safeDuration+"s ease-in-out infinite")+';transform-origin:640px 390px}#environment{animation:haloPulse '+Math.max(4,safeDuration*.8)+'s ease-in-out infinite;transform-origin:640px 360px}#foreground{animation:lightSweep '+Math.max(5,safeDuration*.7)+'s ease-in-out infinite}#details .spark{animation:sparkle 2.4s ease-in-out infinite;transform-origin:center}#scene-content{animation:'+revealMotion+' .9s ease-out both}'+(depth?'#background{opacity:1}':'#environment{opacity:.35}')+(particles?'':'#details .spark{display:none}')+'</style></defs>',
    '<g id="scene-content"'+sceneTransform+'><g id="background"><rect x="-1500" y="-1500" width="4500" height="4500" fill="url(#bg)"/><path d="M0 570 Q640 500 1280 570 V720 H0Z" fill="#080b10"/><ellipse cx="640" cy="600" rx="390" ry="42" fill="#000" opacity=".55"/></g>',
    '<g id="environment"><ellipse cx="640" cy="365" rx="300" ry="250" fill="none" stroke="'+accent+'" stroke-opacity=".35" stroke-width="2" filter="url(#glow)"/><ellipse cx="640" cy="365" rx="235" ry="190" fill="'+accent+'" opacity=".06"/></g>',
    '<g id="main-subject">'+hero+'</g>',
    '<g id="details"><path class="spark" d="M850 245 l8 24 24 8 -24 8 -8 24 -8 -24 -24 -8 24 -8Z" fill="#fff" filter="url(#glow)"/><path class="spark" d="M420 300 l5 15 15 5 -15 5 -5 15 -5 -15 -15 -5 15 -5Z" fill="'+highlight+'"/><circle cx="790" cy="470" r="5" fill="#fff"/><circle cx="500" cy="475" r="4" fill="#fff"/></g>',
    '<g id="foreground"><path d="M180 610 Q640 560 1100 610" fill="none" stroke="'+accent+'" stroke-opacity=".35" stroke-width="2"/></g>',
    '<g id="caption"><text x="640" y="665" text-anchor="middle" fill="#f8e8c1" font-family="Arial,sans-serif" font-size="22" letter-spacing="5">'+subject.toUpperCase()+'</text></g></g></svg>'
  ];
  return svg.join("");
}
async function planVisualScenesWithBrowserAI(brief, preferredCount = 4) {
  const text = String(brief || "").trim();
  if (!text) throw new Error("Prompt cerita masih kosong.");
  const activeEngine = await ensureEngine();
  const result = await activeEngine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: 'Kamu adalah sutradara storyboard dan continuity supervisor animasi. Ubah brief menjadi 3-6 momen visual yang kronologis dan saling menyambung, bukan variasi prompt yang berulang. Kunci kontinuitas: pertahankan identitas dan ciri subjek utama, jumlah objek, kostum/bentuk, lokasi, properti, palet warna, arah cahaya, dan gaya visual pada semua scene; jangan mengganti karakter atau memindahkan lokasi tanpa alasan cerita. Susun alur establishing → perkembangan aksi → momen puncak → resolusi (sesuaikan jumlah scene). Setiap scene harus menyebut aksi yang terlihat, posisi/perubahan subjek, dan petunjuk lingkungan yang konsisten. Variasikan kamera hanya jika mendukung aksi; hindari orbit/pan yang tidak masuk akal. Balas HANYA JSON valid: {"scenes":[{"text":"deskripsi visual konkret 12-24 kata; sebut subjek dan aksi yang terlihat","duration":3,"camera":"parallax","transition":"crossfade","style":"cinematic"}]}. Enum camera: parallax, pan, orbit, follow, locked. Enum transition: crossfade, slide, zoom, glitch, cut. Enum style: cinematic, illustration, neon, papercut. Gunakan style yang sama di semua scene kecuali brief meminta perubahan. Jangan sertakan markdown.'
      },
      {
        role: "user",
        content: "Buat storyboard untuk brief berikut. Target " + Math.max(3, Math.min(6, Number(preferredCount) || 4)) + " scene. Pastikan kontinuitas subjek, lokasi, dan urutan aksi. Brief: " + text
      }
    ],
    temperature: 0.35,
    max_tokens: 1000
  });
  const raw = String(result?.choices?.[0]?.message?.content || "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Browser AI tidak mengembalikan JSON storyboard.");
  let parsed;
  try { parsed = JSON.parse(match[0]); }
  catch (_) { throw new Error("Format storyboard dari Browser AI tidak valid."); }
  const allowedCamera = new Set(["parallax","pan","orbit","follow","locked"]);
  const allowedTransition = new Set(["crossfade","slide","zoom","glitch","cut"]);
  const allowedStyle = new Set(["cinematic","illustration","neon","papercut"]);
  const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
  const cleaned = scenes.slice(0, 8).map((scene) => ({
    text: String(scene?.text || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 420),
    duration: Math.max(0.5, Math.min(60, Number(scene?.duration) || 3)),
    camera: allowedCamera.has(scene?.camera) ? scene.camera : "parallax",
    transition: allowedTransition.has(scene?.transition) ? scene.transition : "crossfade",
    style: allowedStyle.has(scene?.style) ? scene.style : "cinematic"
  })).filter(scene => scene.text);
  if (cleaned.length < 2) throw new Error("Storyboard terlalu sedikit. Coba prompt yang lebih jelas.");
  return cleaned;
}
window.trozalBrowserAiPlanScenes = planVisualScenesWithBrowserAI;

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
    const code = renderProceduralScene(plan, ratio, duration, brief, {
      style, camera, transition,
      particles: $("visualMotionParticles")?.checked !== false,
      depth: $("visualMotionDepth")?.checked !== false
    });
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
let objectDetectorPromise = null;
async function ensureVisionCaptioner() {
  if (visionCaptionerPromise) return visionCaptionerPromise;
  visionCaptionerPromise = (async () => {
    const { pipeline } = await import("https://esm.sh/@huggingface/transformers@3.8.1");
    setVisionStatus("Menyiapkan model caption visual…");
    try { return await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", { device: "webgpu", dtype: "q4" }); }
    catch (_) { setVisionStatus("Captioner memakai CPU/WASM…"); return await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", { dtype: "q8" }); }
  })().catch(error => { visionCaptionerPromise = null; throw error; });
  return visionCaptionerPromise;
}
async function ensureObjectDetector() {
  if (objectDetectorPromise) return objectDetectorPromise;
  objectDetectorPromise = (async () => {
    const { pipeline } = await import("https://esm.sh/@huggingface/transformers@3.8.1");
    setVisionStatus("Memuat detektor objek DETR terkuantisasi…");
    try { return await pipeline("object-detection", "Xenova/detr-resnet-50", { device: "webgpu", dtype: "q4f16" }); }
    catch (_) { setVisionStatus("DETR beralih ke CPU/WASM…"); return await pipeline("object-detection", "Xenova/detr-resnet-50", { dtype: "q8" }); }
  })().catch(error => { objectDetectorPromise = null; throw error; });
  return objectDetectorPromise;
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
function toVisionDataUrl(value) {
  const raw = String(value || "");
  return raw.startsWith("data:image/") ? raw : "data:image/jpeg;base64," + raw.replace(/^data:[^,]*,/, "");
}
async function analyzeObjectEvidence(images) {
  const detector = await ensureObjectDetector(), totals = new Map(), perFrame = [];
  const sampleIndexes = [...new Set([0, Math.floor((images.length - 1) / 2), images.length - 1])];
  for (let sample=0; sample<sampleIndexes.length; sample++) {
    const i = sampleIndexes[sample];
    setVisionStatus("Mendeteksi objek pada frame terpilih "+(sample+1)+" dari "+sampleIndexes.length+"…");
    const result = await detector(toVisionDataUrl(images[i]), { threshold: 0.35 });
    const detections = (Array.isArray(result)?result:[]).filter(x=>x?.label&&Number(x.score)>=0.35).slice(0,12)
      .map(x=>({label:String(x.label).toLowerCase(),score:Math.round(Number(x.score)*100)/100}));
    perFrame.push(detections);
    for (const item of detections) {
      const old=totals.get(item.label)||{label:item.label,maxScore:0,frameCount:0};
      old.maxScore=Math.max(old.maxScore,item.score);old.frameCount++;totals.set(item.label,old);
    }
  }
  return {perFrame,objects:[...totals.values()].sort((x,y)=>y.maxScore-x.maxScore).slice(0,18)};
}
async function measureFrameChanges(images) {
  if(images.length<2)return {averageChange:0,pairChanges:[]};
  const samples=[];
  for(const value of images){
    const img=new Image(); img.src=toVisionDataUrl(value); await img.decode();
    const canvas=document.createElement("canvas");canvas.width=64;canvas.height=36;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,64,36);
    samples.push(ctx.getImageData(0,0,64,36).data);
  }
  const pairChanges=[];
  for(let i=1;i<samples.length;i++){
    let changed=0;
    for(let p=0;p<samples[i].length;p+=4){
      const d=(Math.abs(samples[i][p]-samples[i-1][p])+Math.abs(samples[i][p+1]-samples[i-1][p+1])+Math.abs(samples[i][p+2]-samples[i-1][p+2]))/3;
      if(d>18)changed++;
    }
    pairChanges.push(Math.round(changed/(64*36)*100));
  }
  return {averageChange:Math.round(pairChanges.reduce((x,y)=>x+y,0)/pairChanges.length),pairChanges};
}
function renderBrowserFrameBreakdown(images,captions,objectEvidence,frameChanges){
 const panel=$("trozalBrowserFrameBreakdown"),host=$("trozalBrowserFrameBreakdownList");
 if(!panel||!host)return;
 host.replaceChildren();
 const perFrame=Array.isArray(objectEvidence?.perFrame)?objectEvidence.perFrame:[];
 images.forEach((image,index)=>{
  const card=document.createElement("article");card.className="trozal-frame-evidence-card";
  const img=document.createElement("img");img.alt="Sampel frame "+(index+1);img.loading="lazy";img.src=toVisionDataUrl(image);
  const body=document.createElement("div");
  const heading=document.createElement("strong");heading.textContent="FRAME "+(index+1);
  const caption=document.createElement("p");caption.textContent=captions[index]||"Caption tidak tersedia.";
  const detected=(perFrame[index]||[]).map(item=>item.label+" ("+Math.round(item.score*100)+"%)");
  const objects=document.createElement("small");objects.textContent="Objek terdeteksi: "+(detected.join(", ")||"Tidak ada deteksi dengan confidence ≥35%.");
  const change=document.createElement("small");
  const changeValue=index===0?null:Number(frameChanges?.pairChanges?.[index-1]??0);
  change.textContent=index===0?"Perubahan: frame awal.":"Perubahan piksel dari frame sebelumnya: "+changeValue+"%.";
  const sceneCue=document.createElement("small");
  sceneCue.className="trozal-scene-change-cue";
  sceneCue.textContent=index===0?"Status: baseline visual.":changeValue>=22?"Kandidat perubahan adegan kuat — perlu verifikasi visual.":changeValue>=10?"Perubahan visual sedang — mungkin gerakan atau transisi.":"Perubahan visual rendah — kemungkinan adegan berlanjut.";
  body.append(heading,caption,objects,change,sceneCue);card.append(img,body);host.append(card);
 });
 panel.hidden=!images.length;
}
function buildGroundedVisionEvidence(captions,objectEvidence,frameChanges){
  const labels=(objectEvidence?.objects||[]).map(x=>x.label+" ("+Math.round(x.maxScore*100)+"%; "+x.frameCount+" frame)");
  return "Captions: "+captions.map((x,i)=>"F"+(i+1)+": "+x).join(" | ")+
    "\nDETR object detections: "+(labels.join(", ")||"none")+
    "\nFrame pixel change: "+(frameChanges?.averageChange??0)+"% average changed area."+
    "\nSampled scene-change cues: "+(frameChanges?.pairChanges||[]).map((value,index)=>"F"+(index+1)+" to F"+(index+2)+": "+value+"% pixel change ("+(value>=22?"strong candidate transition":value>=10?"moderate visual change":"low visual change")+")").join("; ")+
    ". These are sparse-sample visual cues only; do not claim exact scene boundaries or infer a specific action.";
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
  const clean = captions.map((caption) => String(caption || "").replace(/\s+/g, " ").trim()).filter(Boolean);
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
async function composeMetadataFromCaptions(captions, groundedEvidence = "") {
  const categories = [...($("metadataCategory")?.options || [])].map((option) => option.text);
  const evidence = captions.map((caption, i) => "Frame " + (i + 1) + ": " + caption).join("\n");
  const fallback = () => buildMetadataFallback(captions, categories);
  try {
    const activeEngine = await ensureEngine();
    const prompt = [
      "Return one compact valid JSON object only. No markdown or explanation.",
      "Use ONLY these image-caption and object-detection observations. Do not invent details.",
      'Keys: title, description, category, keywords, visual_summary, confidence_notes.',
      "title: English, max 100 characters. description: one factual sentence. keywords: array, max 15.",
      "category must exactly match one of: " + categories.join(" | "),
      "Evidence: " + evidence,
      "Structured visual evidence: " + groundedEvidence,
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
      const parsed = parseMetadataJson(raw);
      const title = String(parsed.title || "").trim();
      const description = String(parsed.description || "").trim();
      if (!title || !description) throw new Error("Model bahasa mengembalikan JSON tanpa judul/deskripsi.");
      return { parsed: { ...parsed, title, description }, evidence, source: "browser-ai" };
    } catch (parseError) {
      setVisionStatus("Output AI kosong/tidak valid. Membuat metadata cadangan dari caption visual…");
      return { parsed: fallback(), evidence, source: "caption-fallback", parseWarning: parseError.message };
    }
  } catch (error) {
    setVisionStatus("Model bahasa tidak siap. Menyusun metadata langsung dari caption visual…");
    return { parsed: fallback(), evidence, source: "caption-fallback", modelWarning: error?.message || String(error) };
  }
}
function applyBrowserMetadata(parsed, captions, evidenceLabel, visualEvidence = {}) {
  const title = String(parsed.title || "").trim().slice(0, 150);
  const description = String(parsed.description || "").trim();
  if (!title || !description) throw new Error("Judul atau deskripsi metadata kosong. Silakan ulangi analisis.");
  const categories = [...($("metadataCategory")?.options || [])].map((option) => option.text);
  const category = categories.find((value) => value.toLowerCase() === String(parsed.category || "").trim().toLowerCase()) || "Graphic Resources";
  const detectedLabels = (visualEvidence.objects || []).map(item => item.label);
  // Ground keywords ONLY in independent visual observations. Do not let AI-written
  // title/description/summary validate their own unsupported claims.
  const visualText = captions.concat(detectedLabels).join(" ").toLowerCase();
  const evidenceTokens = new Set(visualText.match(/[a-z0-9]+/g) || []);
  const stopWords = new Set(["the","a","an","and","or","with","on","in","at","of","to","is","are","this","that","from","image","picture","photo","frame","showing","shows","there","its","for","into","over","under","near","very","some","many","scene","video"]);
  const cleanKeyword = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim();
  const modelKeywords = (Array.isArray(parsed.keywords) ? parsed.keywords : [])
    .map(cleanKeyword)
    .filter(item => {
      const words = item.match(/[a-z0-9]+/g) || [];
      return words.length > 0 && words.length <= 5 && words.every(word => evidenceTokens.has(word) || stopWords.has(word));
    });
  const evidenceWords = (visualText.match(/[a-z][a-z-]{2,}/g) || []).filter(word => !stopWords.has(word));
  const phraseKeywords = [];
  for (let n = 3; n >= 2; n--) {
    for (let i = 0; i <= evidenceWords.length - n; i++) {
      const phrase = evidenceWords.slice(i, i + n).join(" ");
      if (phrase.length <= 48 && phrase.split(" ").every(word => evidenceTokens.has(word))) phraseKeywords.push(phrase);
    }
  }
  const fallbackKeywords = [...phraseKeywords, ...evidenceWords];
  const keywords = [...new Set([...modelKeywords, ...fallbackKeywords])].slice(0, 25);
  $("metadataTitle").value = title;
  $("metadataTitle").dataset.baseTitle = title;
  $("metadataDescription").value = description;
  $("metadataCategory").value = category;
  $("metadataKeywords").value = keywords.join(", ");
  if ($("metadataEvidence")) {
    const objectSummary = detectedLabels.length ? " Deteksi objek: " + detectedLabels.join(", ") + "." : " Tidak ada objek terdeteksi pada ambang keyakinan.";
    const changeSummary = typeof visualEvidence.averageChange === "number" ? " Perubahan piksel antar-frame rata-rata " + visualEvidence.averageChange + "% (bukan label aksi)." : "";
    $("metadataEvidence").textContent = "BUKTI BROWSER VISION · " + evidenceLabel + " · " + captions.length + " frame. " + captions.join(" | ") + objectSummary + changeSummary + (parsed.confidence_notes ? " Catatan: " + parsed.confidence_notes : "") + " · Periksa kembali hasil sebelum ekspor.";
  }
  if (typeof updateMetadataCount === "function") updateMetadataCount();
  if (typeof trozalRefreshMetadataQuality === "function") trozalRefreshMetadataQuality();
  if (typeof trozalUpdateMetadataPlatformValidation === "function") trozalUpdateMetadataPlatformValidation();
  if (typeof scheduleAutosave === "function") scheduleAutosave();
  return { title, description, category, keywords };
}
async function analyzeCurrentPreviewWithBrowserVision(options = {}) {
  const button = $("trozalVisionAnalyzeBtn");
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    let images = [];
    const selected = options.forcePreview ? [] : [...($("trozalVisionImages")?.files || [])].slice(0, 3);
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
    let objectEvidence={objects:[],perFrame:[]};
    try{objectEvidence=await analyzeObjectEvidence(images);}catch(e){setVisionStatus("Deteksi objek dilewati; caption tetap digunakan. "+(e?.message||String(e)));}
    let frameChanges={averageChange:0,pairChanges:[]};
    try{frameChanges=await measureFrameChanges(images);}catch(_){}
    const groundedEvidence=buildGroundedVisionEvidence(captions,objectEvidence,frameChanges);
    setVisionStatus("Menyusun metadata dari caption, deteksi objek, dan perubahan frame…");
    const {parsed}=await composeMetadataFromCaptions(captions,groundedEvidence);
    const applied=applyBrowserMetadata(parsed,captions,"Preview utama",{objects:objectEvidence.objects,averageChange:frameChanges.averageChange});
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
    const captions=await captionImages(images);
    let objectEvidence={objects:[],perFrame:[]};
    try{objectEvidence=await analyzeObjectEvidence(images);}catch(e){setMetadataSourceStatus("Deteksi objek dilewati; caption tetap digunakan. "+(e?.message||String(e)));}
    let frameChanges={averageChange:0,pairChanges:[]};
    try{frameChanges=await measureFrameChanges(images);}catch(_){}
    const groundedEvidence=buildGroundedVisionEvidence(captions,objectEvidence,frameChanges);
    renderBrowserFrameBreakdown(images,captions,objectEvidence,frameChanges);
    setMetadataSourceStatus("Menyusun metadata berdasarkan caption dan deteksi objek…");
    const {parsed,source:metadataEngine}=await composeMetadataFromCaptions(captions,groundedEvidence);
    const applied=applyBrowserMetadata(parsed,captions,source.label,{objects:objectEvidence.objects,averageChange:frameChanges.averageChange});
    setMetadataSourceStatus("SELESAI · Metadata " + source.label + " dihasilkan dari " + captions.length + " frame Preview aktual" + (metadataEngine==="caption-fallback" ? " menggunakan fallback caption karena model bahasa tidak menghasilkan metadata lengkap." : "."));
    window.trozalMetadataSceneLastAnalysis={createdAt:new Date().toISOString(),source:source.label,metadataEngine,...applied,captions,objects:objectEvidence.objects,averageChange:frameChanges.averageChange};
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
    setVisionStatus("Transformers.js tersedia. Captioner dan detektor objek DETR diunduh saat analisis pertama.");
    const connection = $("trozalVisionConnection");
    if (connection) connection.textContent = "Browser Vision runtime tersedia · captioner ViT-GPT2 + detektor objek DETR";
  } catch (error) {
    setVisionStatus("Runtime Vision gagal dimuat · " + (error?.message || String(error)), true);
  }
});

function renderGeminiContactSheet(images, analysis = {}) {
  const panel = $("trozalGeminiContactSheetPanel");
  const host = $("trozalGeminiContactSheet");
  if (!panel || !host) return;
  host.replaceChildren();
  (Array.isArray(images) ? images : []).forEach((image, index) => {
    const card = document.createElement("div");
    card.style.cssText = "min-width:0;border:1px solid rgba(240,195,108,.35);border-radius:7px;overflow:hidden;background:rgba(0,0,0,.2)";
    const img = document.createElement("img");
    const value = String(image || "");
    img.src = value.startsWith("data:") ? value : "data:image/jpeg;base64," + value;
    img.alt = "Gemini Preview frame " + (index + 1);
    img.loading = "lazy";
    img.style.cssText = "display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#101010";
    const label = document.createElement("div");
    label.textContent = "FRAME " + (index + 1);
    label.style.cssText = "padding:5px 7px;font-size:11px;font-weight:800;color:#f0c36c";
    card.append(img, label);
    host.appendChild(card);
  });
  const summary = $("trozalGeminiVisualSummary");
  if (summary) summary.textContent = analysis.visualSummary ? "RINGKASAN VISUAL · " + analysis.visualSummary : "";
  const objects = $("trozalGeminiVisibleObjects");
  if (objects) {
    const list = Array.isArray(analysis.visibleObjects) ? analysis.visibleObjects.filter(Boolean) : [];
    objects.textContent = list.length ? "OBJEK TERLIHAT · " + list.join(" · ") : "";
  }
  panel.style.display = images.length ? "block" : "none";
}
async function analyzeWithGeminiCloud() {
  const button = $("trozalGeminiAnalyzeBtn");
  const status = $("trozalGeminiStatus");
  const apiKey = String($("trozalGeminiApiKey")?.value || "").trim();
  const setCloudStatus = (message, isError = false) => {
    if (status) { status.textContent = message; status.style.color = isError ? "#ff9292" : "#a9e9c9"; }
  };
  if (!apiKey) { setCloudStatus("Masukkan Gemini API key terlebih dahulu.", true); $("trozalGeminiApiKey")?.focus(); return; }
  if (button?.disabled) return;
  if (button) button.disabled = true;
  let images = [];
  try {
    const selected = [...($("trozalVisionImages")?.files || [])].slice(0, 3);
    if (selected.length) {
      for (const file of selected) {
        if (file.size > 12 * 1024 * 1024) throw new Error("Ukuran " + file.name + " melebihi 12 MB.");
        const dataUrl = "data:" + (file.type || "image/jpeg") + ";base64," + await window.trozalVisionReadFile(file);
        images.push(await window.trozalVisionResizeImage(dataUrl));
      }
    } else {
      setCloudStatus("Mengambil tiga frame Preview…");
      images = await window.trozalVisionCapturePreviewFrames();
    }
    if (!images.length) throw new Error("Tidak ada frame yang bisa dianalisis.");
    const categories = [...($("metadataCategory")?.options || [])].map(option => option.text);
    const prompt = [
      "You are a senior stock-video metadata analyst. Inspect all supplied frames as consecutive samples from one motion graphic/video.",
      "Describe only visible, well-supported content. Distinguish the main subject, visible action/motion across frames, environment, composition, colors, and visual style. Do not infer hidden story, brands, exact materials, identities, or locations. Do not use filenames, prompts, source code, or previous metadata.",
      "Return ONLY valid JSON with keys title, description, category, keywords, visual_summary, visible_objects, motion_evidence, confidence_notes.",
      "title: specific natural English title, maximum 100 characters. description: accurate English stock description in 1-2 sentences, maximum 350 characters.",
      "category must exactly equal one of: " + categories.join(" | "),
      "keywords: 15 to 25 distinct, specific English search terms or short phrases. Put the most important subject and action first. Avoid duplicates, unsupported concepts, and generic filler. Include relevant subject, action, style, composition, background, and use-case terms only when visibly supported.",
      "visible_objects: array of clearly visible objects. motion_evidence: short description of changes that can actually be observed between the supplied frames. confidence_notes: uncertainties, or empty string."
    ].join("\n");
    setCloudStatus("Mengirim " + images.length + " frame ke Gemini Cloud Accurate…");
    const parts = [{ text: prompt }, ...images.map(data => ({ inlineData: { mimeType: "image/jpeg", data } }))];
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 2200, responseMimeType: "application/json" }
    });
    // Stable multimodal model fallbacks: keys/projects can expose different model availability.
    const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
    let response = null, payload = {}, activeModel = models[0], lastFailure = "";
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      activeModel = models[modelIndex];
      const attempts = modelIndex < 2 ? 2 : 1;
      let moveToNextModel = false;
      for (let attempt = 0; attempt < attempts; attempt++) {
        setCloudStatus("Menghubungi " + activeModel + " · percobaan " + (attempt + 1) + "/" + attempts + "…");
        const requestController = new AbortController();
        const requestTimeout = setTimeout(() => requestController.abort(), 90000);
        try {
          response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + activeModel + ":generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: requestBody,
            signal: requestController.signal
          });
        } catch (networkError) {
          lastFailure = networkError?.message || String(networkError);
          if (attempt + 1 < attempts) { setCloudStatus("Koneksi Gemini terputus. Mencoba ulang…"); await wait(1500); continue; }
          moveToNextModel = true;
          break;
        } finally {
          clearTimeout(requestTimeout);
        }
        payload = await response.json().catch(() => ({}));
        if (response.ok) break;
        const detail = payload?.error?.message || ("HTTP " + response.status);
        lastFailure = "HTTP " + response.status + ": " + detail;
        const transient = [408, 429, 500, 502, 503, 504].includes(response.status);
        const modelUnavailable = response.status === 404 || (response.status === 400 && /model|not supported|not found|not available/i.test(detail));
        if (modelUnavailable) { moveToNextModel = true; break; }
        if (!transient) {
          if (response.status === 401 || response.status === 403) throw new Error(detail + " · API key ditolak atau Gemini API belum diaktifkan untuk project ini.");
          throw new Error(detail + " · Periksa kuota, batas penggunaan, dan konfigurasi Gemini API.");
        }
        if (attempt + 1 < attempts) {
          const retryHeader = Number(response.headers.get("Retry-After"));
          const waitMs = Number.isFinite(retryHeader) && retryHeader > 0 ? Math.min(12000, retryHeader * 1000) : 1800 * Math.pow(2, attempt);
          setCloudStatus("Gemini sedang padat / terkena rate limit. Mencoba ulang dalam " + Math.ceil(waitMs / 1000) + " detik…");
          await wait(waitMs);
        } else moveToNextModel = true;
      }
      if (response?.ok) break;
      if (modelIndex + 1 < models.length && moveToNextModel) {
        setCloudStatus(activeModel + " tidak tersedia saat ini. Mencoba model Gemini cadangan " + models[modelIndex + 1] + "…");
        continue;
      }
    }
    if (!response?.ok) throw new Error("Semua model Gemini cadangan gagal. " + lastFailure + " · Periksa kuota/API key atau coba beberapa menit lagi.");
    const raw = (payload?.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("");
    const parsed = parseMetadataJson(raw);
    const title = String(parsed.title || "").trim();
    const description = String(parsed.description || "").trim();
    if (!title || !description) throw new Error("Gemini tidak menghasilkan judul dan deskripsi yang valid.");
    const evidenceText = [title, description, String(parsed.visual_summary || ""), ...(Array.isArray(parsed.visible_objects) ? parsed.visible_objects : []), String(parsed.motion_evidence || "")].join(" ").toLowerCase();
    const evidenceTokens = new Set(evidenceText.match(/[a-z0-9]+/g) || []);
    const stop = new Set(["the","a","an","and","or","with","on","in","at","of","to","is","are","this","that","from","its","for","video","motion","graphic"]);
    const modelKeywords = (Array.isArray(parsed.keywords) ? parsed.keywords : []).map(x => String(x).trim().toLowerCase().replace(/\s+/g, " "))
      .filter(x => { const words = x.match(/[a-z0-9]+/g) || []; return words.length > 0 && words.length <= 5 && words.some(word => evidenceTokens.has(word)); });
    const fallbackWords = evidenceText.match(/[a-z][a-z-]{2,}/g) || [];
    const keywords = [...new Set([...modelKeywords, ...fallbackWords.filter(word => !stop.has(word))])].slice(0, 25);
    const categoryOptions = [...($("metadataCategory")?.options || [])].map(option => option.text);
    const category = categoryOptions.find(value => value.toLowerCase() === String(parsed.category || "").trim().toLowerCase()) || "Graphic Resources";
    const applied = applyBrowserMetadata({ ...parsed, title, description, category, keywords }, [String(parsed.visual_summary || ""), ...(Array.isArray(parsed.visible_objects) ? parsed.visible_objects : [])].filter(Boolean), "Gemini Cloud Accurate", { objects: (Array.isArray(parsed.visible_objects) ? parsed.visible_objects : []).map(label => ({ label: String(label) })), averageChange: null });
    if ($("metadataEvidence")) $("metadataEvidence").textContent = "GEMINI CLOUD ACCURATE · " + images.length + " frame dianalisis. " + String(parsed.visual_summary || "") + (parsed.motion_evidence ? " Bukti gerak: " + parsed.motion_evidence : "") + (parsed.confidence_notes ? " Catatan: " + parsed.confidence_notes : "") + " · Periksa hasil sebelum ekspor.";
    window.trozalGeminiLastAnalysis = { model: activeModel, createdAt: new Date().toISOString(), imageCount: images.length, ...applied, visualSummary: parsed.visual_summary || "", visibleObjects: parsed.visible_objects || [], motionEvidence: parsed.motion_evidence || "", confidenceNotes: parsed.confidence_notes || "" };
    renderGeminiContactSheet(images, window.trozalGeminiLastAnalysis);
    if (typeof trozalRefreshMetadataQuality === "function") trozalRefreshMetadataQuality();
    if (typeof trozalUpdateMetadataPlatformValidation === "function") trozalUpdateMetadataPlatformValidation();
    if (typeof trozalMetadataRenderReview === "function") { if (window.trozalMetadataApproved && typeof window.trozalMetadataApproved.clear === "function") window.trozalMetadataApproved.clear(); trozalMetadataRenderReview(); }
    if (typeof scheduleAutosave === "function") scheduleAutosave();
    setCloudStatus("SELESAI · Judul, deskripsi, kategori, dan " + keywords.length + " keyword berhasil dibuat. Periksa sebelum ekspor.");
  } catch (error) {
    const message = error?.message || String(error);
    if (images.length && /Gemini sedang tidak tersedia setelah percobaan ulang|Semua model Gemini cadangan gagal|signal is aborted|AbortError|Failed to fetch|NetworkError|timeout/i.test(message)) {
      try {
        setCloudStatus("Gemini sedang padat. Menjalankan fallback Browser Vision lokal dari frame yang sama…");
        const captions = await captionImages(images);
        const fallback = buildMetadataFallback(captions, [...($("metadataCategory")?.options || [])].map(option => option.text));
        const applied = applyBrowserMetadata(fallback, captions, "Gemini Cloud fallback · Browser Vision", { objects: [], averageChange: null });
        window.trozalGeminiLastAnalysis = { model: "browser-vision-caption-fallback", createdAt: new Date().toISOString(), imageCount: images.length, ...applied, captions, cloudFallback: true };
        renderGeminiContactSheet(images, { visualSummary: captions.join(" · "), visibleObjects: [] });
        if (typeof trozalRefreshMetadataQuality === "function") trozalRefreshMetadataQuality();
        if (typeof trozalUpdateMetadataPlatformValidation === "function") trozalUpdateMetadataPlatformValidation();
        if (typeof trozalMetadataRenderReview === "function") { if (window.trozalMetadataApproved && typeof window.trozalMetadataApproved.clear === "function") window.trozalMetadataApproved.clear(); trozalMetadataRenderReview(); }
        if (typeof scheduleAutosave === "function") scheduleAutosave();
        setCloudStatus("GEMINI SEDANG PADAT · Metadata cadangan berhasil dibuat dari caption Browser Vision lokal. Periksa hasil sebelum ekspor.");
      } catch (fallbackError) {
        setCloudStatus("Gemini gagal dan fallback Browser Vision juga gagal: " + (fallbackError?.message || String(fallbackError)), true);
      }
    } else {
      setCloudStatus((error?.name === "AbortError" ? "Waktu analisis habis (300 detik)." : message), true);
    }
  } finally {
    if (button) button.disabled = false;
  }
}
$("trozalGeminiAnalyzeBtn")?.addEventListener("click", analyzeWithGeminiCloud);

$("trozalVisionAnalyzeBtn")?.addEventListener("click", analyzeCurrentPreviewWithBrowserVision);
$("metadataFromHtmlMotionBtn")?.addEventListener("click", () => analyzeSourceWithBrowserVision("html"));
$("metadataFromSceneAiBtn")?.addEventListener("click", () => analyzeSourceWithBrowserVision("scene"));
