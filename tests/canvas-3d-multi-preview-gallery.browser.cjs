'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

function scene(label) {
  const kinds = ['cube', 'sphere', 'torus', 'cylinder'];
  const colors = ['#36c7dc', '#f2a84b', '#9a82f5', '#66c58c'];
  return {
    version: 2, duration: 8, fps: 30, loop: true,
    camera: { yaw: .6, pitch: .3, distance: 7, projection: 'perspective', orthoScale: 4.8, target: [0, 0, 0] },
    lights: [
      { name: 'Key', x: -3, y: 4, z: 4, color: '#ffffff', intensity: 1.2 },
      { name: 'Fill', x: 3, y: 1, z: 2, color: '#aabbcc', intensity: .7 },
      { name: 'Rim', x: 0, y: 3, z: -4, color: '#8899ff', intensity: .9 }
    ],
    objects: kinds.map((type, i) => ({
      id: label + '-' + i, name: label + ' ' + type, type,
      x: (i - 1.5) * .65, y: i % 2 ? .35 : 0, z: (i % 3 - 1) * .25,
      rx: 0, ry: i * 15, rz: 0, sx: .75, sy: .75, sz: .75,
      color: colors[i], metallic: .3, roughness: .34, emission: 0,
      materialPreset: 'custom', animation: i === 1 ? 'orbit' : 'none',
      speed: .5, amount: .4, parentId: null, keyframes: []
    })),
    selected: label + '-0', playhead: 0
  };
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors = []; page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#trozalCanvas3DOpen', { timeout: 15000 });
    await page.locator('#trozalCanvas3DOpen').click();
    await page.waitForSelector('#t3dMultiPreviewOpen', { timeout: 15000 });
    assert.equal(await page.locator('#t3dMultiPreviewPanel').count(), 1, 'Multi Preview overlay should mount.');
    assert.equal(await page.locator('#t3dMultiPreviewCards .t3d-preview-empty').count(), 1, 'Empty gallery should explain how to generate concepts.');
    const before = await page.evaluate(() => JSON.stringify(window.TROZAL_CANVAS_3D.getProject()));
    const fixture = { concepts: [
      { title: 'Golden Geometry', pitch: 'Gold hero object with orbit accents.', scene: scene('golden') },
      { title: 'Fire Stage', pitch: 'Warm red and orange stage composition.', scene: scene('fire') },
      { title: 'Lotus Product', pitch: 'Premium product scene with layered objects.', scene: scene('lotus') }
    ] };
    await page.evaluate(data => {
      window.TROZAL_CANVAS3D_CONCEPTS = data.concepts;
      window.dispatchEvent(new CustomEvent('trozal:canvas3d-concepts-change'));
    }, fixture);
    await page.locator('#t3dMultiPreviewOpen').click();
    assert.equal(await page.locator('#t3dMultiPreviewCards .t3d-preview-card').count(), 3, 'Gallery should show all three independent concepts.');
    assert.equal(await page.locator('#t3dMultiPreviewCards canvas[data-preview-ready="true"]').count(), 3, 'Each concept must have a rendered visual thumbnail.');
    assert.equal(await page.locator('#t3dMultiPreviewCards [data-preview-apply]').count(), 3, 'Each concept should have its own Apply action.');
    const pixels = await page.locator('#t3dMultiPreviewCards canvas').first().evaluate(canvas => {
      const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let varied = 0; for (let i = 0; i < data.length; i += 32) if (data[i] || data[i + 1] || data[i + 2]) varied++;
      return { width: canvas.width, height: canvas.height, varied };
    });
    assert.ok(pixels.width >= 320 && pixels.height >= 160 && pixels.varied > 100, 'Preview canvas should contain rendered scene pixels.');
    const afterPreview = await page.evaluate(() => JSON.stringify(window.TROZAL_CANVAS_3D.getProject()));
    assert.equal(afterPreview, before, 'Browsing multiple previews must not mutate the active scene.');
    await page.locator('#t3dMultiPreviewCards [data-preview-apply="1"]').click();
    const applied = await page.evaluate(() => window.TROZAL_CANVAS_3D.getProject());
    assert.equal(applied.objects[0].id, 'fire-0', 'Apply should update active Canvas 3D only when requested.');
    assert.equal(applied.objects.length, 4);
    assert.deepEqual(errors, [], 'Unexpected browser page errors: ' + errors.join(' | '));
    console.log(JSON.stringify({ result: 'PASS', concepts: 3, renderedThumbnails: 3, activeSceneUnchangedDuringPreview: true, explicitApply: 'PASS' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
