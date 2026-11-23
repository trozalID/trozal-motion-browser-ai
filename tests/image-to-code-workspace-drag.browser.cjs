const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#itcvModeBtn').click();
  const workspace = page.locator('#trozalImageCodeVideoWorkspace');
  await workspace.waitFor({ state: 'visible' });

  const output = workspace.locator('[data-itcv-zone="output"]');
  const cards = output.locator(':scope > .out');
  const outputSplitter = output.locator('.itcv-output-splitter');
  const rowSplitter = workspace.locator('.itcv-row-splitter');
  assert.equal(await cards.count(), 2, 'HTML and JavaScript output panels must both be present');
  assert.equal(await outputSplitter.count(), 1, 'Output panels need a draggable width splitter');
  assert.equal(await rowSplitter.count(), 1, 'Output dock needs a draggable height splitter');

  await page.evaluate(() => {
    window.__splitDebug = [];
    const out = document.querySelector('[data-itcv-zone="output"]');
    const split = out.querySelector('.itcv-output-splitter');
    for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
      document.addEventListener(type, e => {
        if (e.target === split || split.contains(e.target) || e.composedPath().includes(split)) {
          window.__splitDebug.push({
            type,
            x: e.clientX,
            target: e.target.className,
            captured: split.hasPointerCapture?.(e.pointerId),
            active: window.__trozalITCV2
          });
        }
      }, true);
    }
  });

  const leftBefore = await cards.nth(0).evaluate(el => el.getBoundingClientRect().width);
  // The output dock is intentionally below the first workspace row. Scroll its
  // splitter into the viewport before using page.mouse, whose coordinates are
  // viewport-relative (a bounding box below the viewport cannot receive input).
  await outputSplitter.scrollIntoViewIfNeeded();
  const splitBox = await outputSplitter.boundingBox();
  await page.mouse.move(splitBox.x + splitBox.width / 2, splitBox.y + splitBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(splitBox.x + 75, splitBox.y + splitBox.height / 2, { steps: 8 });
  await page.mouse.up();
  const leftAfter = await cards.nth(0).evaluate(el => el.getBoundingClientRect().width);
  const diag = await output.evaluate(el => ({
    width: el.getBoundingClientRect().width,
    columns: getComputedStyle(el).gridTemplateColumns,
    variable: el.style.getPropertyValue('--itcv-output-left'),
    inline: el.style.gridTemplateColumns,
    cards: [...el.querySelectorAll(':scope > .out')].map(x => x.getBoundingClientRect().width)
  }));
  console.log('OUTPUT_SPLITTER_DIAGNOSTICS', JSON.stringify({
    leftBefore,
    leftAfter,
    splitBox,
    diag,
    events: await page.evaluate(() => window.__splitDebug)
  }));
  assert.ok(leftAfter > leftBefore + 35, 'Dragging output splitter must resize the HTML/JS columns');

  const dockBefore = await output.evaluate(el => el.getBoundingClientRect().height);
  await rowSplitter.scrollIntoViewIfNeeded();
  const rowBox = await rowSplitter.boundingBox();
  await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y - 65, { steps: 8 });
  await page.mouse.up();
  const dockAfter = await output.evaluate(el => el.getBoundingClientRect().height);
  assert.ok(dockAfter > dockBefore + 35, 'Dragging horizontal splitter must enlarge output dock');

  const controls = workspace.locator('[data-itcv-zone="controls"]');
  const preview = workspace.locator('[data-itcv-zone="preview"]');
  await page.evaluate(() => {
    window.__panelDragEvents = [];
    for (const type of ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend']) {
      document.addEventListener(type, e => {
        window.__panelDragEvents.push({ type, target: e.target.id || e.target.className || e.target.tagName });
      }, true);
    }
  });
  const before = await controls.evaluate(el => getComputedStyle(el).gridArea);
  await controls.locator('.itcv-panel-grip').dragTo(preview);
  const after = await controls.evaluate(el => getComputedStyle(el).gridArea);
  const panelState = await page.evaluate(() => ({ sourceInline: document.querySelector('[data-itcv-zone="controls"]').style.gridArea, targetInline: document.querySelector('[data-itcv-zone="preview"]').style.gridArea }));
  const panelDrag = await page.evaluate(() => window.__panelDragEvents);
  console.log('PANEL_DRAG_DIAGNOSTICS', JSON.stringify({
    before,
    after,
    ...panelState,
    events: panelDrag
  }));
  assert.notEqual(after, before, 'Dragging a panel grip onto another panel must move/swap its workspace position');

  assert.deepEqual(errors, [], 'Image to Code workspace must not emit browser runtime errors');
  await browser.close();
  console.log('Image to Code workspace drag/resize checks passed.');
})().catch(error => { console.error(error); process.exit(1); });
