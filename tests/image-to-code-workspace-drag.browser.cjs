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

  // Splitters also support keyboard resizing, not only pointer dragging.
  const keyboardWidthBefore = await cards.nth(0).evaluate(el => el.getBoundingClientRect().width);
  await outputSplitter.focus();
  await page.keyboard.press('ArrowRight');
  const keyboardWidthAfter = await cards.nth(0).evaluate(el => el.getBoundingClientRect().width);
  assert.ok(keyboardWidthAfter > keyboardWidthBefore + 10, 'ArrowRight on output separator must widen HTML output');
  await rowSplitter.focus();
  await page.keyboard.press('ArrowUp');
  const keyboardDockAfter = await output.evaluate(el => el.getBoundingClientRect().height);
  const keyboardRowDiag = await page.evaluate(() => ({
    focused: document.activeElement?.className,
    rowValue: document.getElementById('trozalImageCodeVideoWorkspace')?.querySelector('.shell')?.style.getPropertyValue('--itcv-output-height'),
    gridRows: getComputedStyle(document.querySelector('#trozalImageCodeVideoWorkspace .shell')).gridTemplateRows,
    ariaNow: document.querySelector('.itcv-row-splitter')?.getAttribute('aria-valuenow')
  }));
  console.log('KEYBOARD_ROW_DIAGNOSTICS', JSON.stringify({ dockAfter, keyboardDockAfter, keyboardRowDiag }));
  assert.ok(keyboardDockAfter > dockAfter + 10, 'ArrowUp on row separator must enlarge output dock');

  const controls = workspace.locator('[data-itcv-zone="controls"]');
  const preview = workspace.locator('[data-itcv-zone="preview"]');
  const panelEvents = [];
  await page.evaluate(() => {
    window.__panelDragEvents = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
      document.addEventListener(type, e => {
        if (e.target.closest?.('.itcv-panel-grip')) {
          window.__panelDragEvents.push({ type, x: e.clientX, y: e.clientY });
        }
      }, true);
    }
  });
  await controls.scrollIntoViewIfNeeded();
  await preview.scrollIntoViewIfNeeded();
  const sourceGrip = controls.locator('.itcv-panel-grip');
  await sourceGrip.scrollIntoViewIfNeeded();
  const sourceBox = await sourceGrip.boundingBox();
  const targetBox = await preview.boundingBox();
  const before = await controls.evaluate(el => getComputedStyle(el).gridArea);
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();
  const after = await controls.evaluate(el => getComputedStyle(el).gridArea);
  const panelState = await page.evaluate(() => ({
    sourceInline: document.querySelector('[data-itcv-zone="controls"]').style.gridArea,
    targetInline: document.querySelector('[data-itcv-zone="preview"]').style.gridArea
  }));
  const panelDrag = await page.evaluate(() => window.__panelDragEvents);
  console.log('PANEL_DRAG_DIAGNOSTICS', JSON.stringify({ before, after, ...panelState, events: panelDrag }));
  assert.ok(panelDrag.some(e => e.type === 'pointerdown') && panelDrag.some(e => e.type === 'pointerup'), 'Panel grip must receive pointer drag input');
  assert.notEqual(after, before, 'Dragging a panel grip onto another panel must move/swap its workspace position');

  // Output panels are draggable too: move the JavaScript card before HTML.
  const htmlCard = cards.nth(0);
  const jsCard = cards.nth(1);
  const jsGrip = jsCard.locator('.itcv-panel-grip');
  await jsGrip.scrollIntoViewIfNeeded();
  const jsGripBox = await jsGrip.boundingBox();
  const htmlBox = await htmlCard.boundingBox();
  await page.mouse.move(jsGripBox.x + jsGripBox.width / 2, jsGripBox.y + jsGripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(htmlBox.x + htmlBox.width / 2, htmlBox.y + htmlBox.height / 2, { steps: 10 });
  await page.mouse.up();
  const outputOrder = await cards.evaluateAll(els => els.map(el => el.querySelector(':scope > label')?.textContent || ''));
  assert.match(outputOrder[0], /JAVASCRIPT/, 'Dragging the JavaScript output panel onto HTML must reorder the output dock');

  // Layout, output ordering, and sizes must survive a full reload.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('trozal.itcv.workspace.layout.v2') || 'null'));
  assert.ok(saved, 'Workspace layout should be automatically saved');
  assert.equal(saved.panelAreas.controls, 'preview', 'Saved workspace positions must record panel swaps');
  assert.equal(saved.panelAreas.preview, 'controls', 'Saved workspace positions must record the target swap');
  assert.deepEqual(saved.outputOrder, ['javascript', 'html'], 'Saved output order must keep JavaScript before HTML');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#itcvModeBtn').click();
  await workspace.waitFor({ state: 'visible' });
  const reloadedControls = workspace.locator('[data-itcv-zone="controls"]');
  const reloadedCards = workspace.locator('[data-itcv-zone="output"] > .out');
  assert.equal(await reloadedControls.evaluate(el => el.style.gridArea), 'preview', 'Panel positions must be restored after reload');
  const reloadedOrder = await reloadedCards.evaluateAll(els => els.map(el => el.dataset.itcvPanelId));
  assert.deepEqual(reloadedOrder, ['javascript', 'html'], 'Output panel order must be restored after reload');
  const persistedOutputLeft = await workspace.locator('[data-itcv-zone="output"]').evaluate(el => parseFloat(el.style.getPropertyValue('--itcv-output-left')));
  assert.ok(persistedOutputLeft > 0, 'Output width must persist after reload');

  // Reset restores original panel slots, HTML-first output order, and clears saved layout.
  await workspace.locator('#itcvResetWorkspace').click();
  assert.equal(await reloadedControls.evaluate(el => el.style.gridArea), '', 'Reset must restore the default controls position');
  const resetOrder = await reloadedCards.evaluateAll(els => els.map(el => el.dataset.itcvPanelId));
  assert.deepEqual(resetOrder, ['html', 'javascript'], 'Reset must restore HTML-first output order');
  const cleared = await page.evaluate(() => localStorage.getItem('trozal.itcv.workspace.layout.v2'));
  assert.equal(cleared, null, 'Reset must clear the persisted workspace layout');

  assert.deepEqual(errors, [], 'Image to Code workspace must not emit browser runtime errors');
  await browser.close();
  console.log('Image to Code workspace drag/resize checks passed.');
})().catch(error => { console.error(error); process.exit(1); });
