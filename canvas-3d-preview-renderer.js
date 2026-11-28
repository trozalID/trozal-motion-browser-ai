/* TROZAL MOTION · CANVAS 3D CONCEPT PREVIEW RENDERER
 * Lightweight isolated 2D thumbnail renderer for generated Scene v2 concepts.
 * Illustrative scene preview, not a photoreal model renderer.
 */
(() => {
  'use strict';
  if (window.TROZAL_CANVAS3D_PREVIEW_RENDERER) return;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
  function color(hex) {
    const value = /^#[0-9a-f]{6}$/i.test(String(hex || '')) ? hex.slice(1) : '36c7dc';
    return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16));
  }
  function shade(hex, amount) {
    return 'rgb(' + color(hex).map(v => Math.round(clamp(v + amount, 0, 255))).join(',') + ')';
  }
  function polygon(ctx, points, fill, stroke) {
    if (!points.length) return;
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function drawShape(ctx, object, width, height) {
    const x = clamp(object.x, -5, 5), y = clamp(object.y, -3, 5), z = clamp(object.z, -5, 5);
    const scale = Math.max(.1, Math.min(3, Number(object.sx) || 1, Number(object.sy) || 1, Number(object.sz) || 1));
    const size = clamp(Math.min(width, height) * .105 * scale, 9, Math.min(width, height) * .19);
    const cx = width * .5 + (x - z) * width * .092;
    const cy = height * .67 - y * height * .12 - (x + z) * height * .035;
    const base = object.color || '#36c7dc', top = shade(base, 42), side = shade(base, -36), deep = shade(base, -68);
    ctx.save(); ctx.translate(cx, cy);
    ctx.rotate(clamp(object.ry, -180, 180) * Math.PI / 720 + clamp(object.rz, -180, 180) * Math.PI / 900);
    ctx.globalAlpha = .96; ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath(); ctx.ellipse(0, size * .82, size * 1.15, size * .28, 0, 0, Math.PI * 2); ctx.fill();
    switch (object.type) {
      case 'sphere': {
        const g = ctx.createRadialGradient(-size * .38, -size * .48, size * .05, 0, 0, size * 1.08);
        g.addColorStop(0, '#ffffff'); g.addColorStop(.16, top); g.addColorStop(.62, base); g.addColorStop(1, deep);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, size * 1.02, size * .92, -.12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.lineWidth = 1; ctx.stroke(); break;
      }
      case 'torus': {
        ctx.strokeStyle = 'rgba(0,0,0,.32)'; ctx.lineWidth = size * .34;
        ctx.beginPath(); ctx.ellipse(0, 0, size * 1.05, size * .52, -.12, 0, Math.PI * 2); ctx.stroke();
        const g = ctx.createLinearGradient(-size, -size, size, size);
        g.addColorStop(0, '#ffffff'); g.addColorStop(.24, top); g.addColorStop(.7, base); g.addColorStop(1, deep);
        ctx.strokeStyle = g; ctx.lineWidth = size * .23;
        ctx.beginPath(); ctx.ellipse(0, 0, size * 1.02, size * .5, -.12, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, 0, size * .73, size * .28, -.12, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); break;
      }
      case 'cylinder': {
        const g = ctx.createLinearGradient(-size, 0, size, 0);
        g.addColorStop(0, deep); g.addColorStop(.26, top); g.addColorStop(.55, base); g.addColorStop(1, side);
        ctx.fillStyle = g; ctx.fillRect(-size * .78, -size * .56, size * 1.56, size * 1.12);
        ctx.fillStyle = side; ctx.beginPath(); ctx.ellipse(0, size * .56, size * .78, size * .3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(0, -size * .56, size * .78, size * .3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.36)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, -size * .56, size * .78, size * .3, 0, 0, Math.PI * 2); ctx.stroke(); break;
      }
      case 'cone': {
        polygon(ctx, [[0, -size * 1.18], [-size * .86, size * .54], [size * .86, size * .54]], base, 'rgba(255,255,255,.3)');
        polygon(ctx, [[0, -size * 1.18], [0, size * .54], [size * .86, size * .54]], side);
        ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(0, size * .54, size * .86, size * .28, 0, 0, Math.PI * 2); ctx.fill(); break;
      }
      case 'plane': {
        polygon(ctx, [[0, -size * .48], [size * 1.22, 0], [0, size * .48], [-size * 1.22, 0]], top, 'rgba(255,255,255,.28)');
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size * .38); ctx.lineTo(0, size * .38); ctx.stroke(); break;
      }
      case 'mesh': {
        polygon(ctx, [[0, -size], [size * .78, -size * .35], [size * .66, size * .65], [0, size], [-size * .72, size * .45], [-size * .78, -size * .45]], top, 'rgba(255,255,255,.35)');
        polygon(ctx, [[0, -size], [0, size], [-size * .72, size * .45], [-size * .78, -size * .45]], side); break;
      }
      case 'cube':
      default: {
        const w = size * .82, d = size * .5, h = size * .92;
        polygon(ctx, [[0, -h], [w, -h * .48], [0, d], [-w, -h * .48]], top, 'rgba(255,255,255,.34)');
        polygon(ctx, [[-w, -h * .48], [0, d], [0, h], [-w, h * .1]], side, 'rgba(255,255,255,.2)');
        polygon(ctx, [[w, -h * .48], [0, d], [0, h], [w, h * .1]], deep, 'rgba(255,255,255,.2)'); break;
      }
    }
    if (object.animation && object.animation !== 'none') {
      ctx.strokeStyle = 'rgba(205,238,255,.42)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, size * .12, size * 1.42, size * .62, -.2, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    }
    ctx.restore();
  }
  function draw(canvas, scene, options) {
    if (!canvas || typeof canvas.getContext !== 'function' || !scene || !Array.isArray(scene.objects)) return false;
    const opts = options || {}, width = clamp(opts.width || 640, 320, 960), height = clamp(opts.height || 280, 160, 480);
    canvas.width = width; canvas.height = height; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', opts.label || 'Illustrative 3D scene preview');
    const ctx = canvas.getContext('2d'); if (!ctx) return false;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#17243a'); bg.addColorStop(.54, '#101a2b'); bg.addColorStop(1, '#080f1b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * .5, height * .42, 8, width * .5, height * .42, width * .55);
    glow.addColorStop(0, 'rgba(75,148,190,.24)'); glow.addColorStop(1, 'rgba(35,65,105,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(112,174,205,.11)'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const x = width * .5 + i * width * .095; ctx.beginPath(); ctx.moveTo(x, height * .46); ctx.lineTo(width * .5 + i * width * .16, height * .94); ctx.stroke();
      const y = height * .72 + i * height * .025; ctx.beginPath(); ctx.moveTo(width * .08, y); ctx.lineTo(width * .92, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(74,128,164,.12)'; ctx.beginPath(); ctx.ellipse(width * .5, height * .78, width * .34, height * .105, 0, 0, Math.PI * 2); ctx.fill();
    const objects = scene.objects.filter(o => o && typeof o === 'object').slice(0, 40).slice().sort((a, b) =>
      ((Number(a.x) || 0) + (Number(a.z) || 0) + (Number(a.y) || 0) * .35) -
      ((Number(b.x) || 0) + (Number(b.z) || 0) + (Number(b.y) || 0) * .35));
    objects.forEach(object => drawShape(ctx, object, width, height));
    ctx.fillStyle = 'rgba(207,229,244,.58)'; ctx.font = '10px ui-monospace,Consolas,monospace';
    ctx.fillText('CANVAS 3D · ' + objects.length + ' OBJECTS', 14, height - 12);
    canvas.dataset.previewReady = 'true'; canvas.dataset.previewObjectCount = String(objects.length);
    return true;
  }
  window.TROZAL_CANVAS3D_PREVIEW_RENDERER = Object.freeze({ draw, version: 1 });
})();
