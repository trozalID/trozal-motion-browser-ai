const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-ui-layout-choice="classic"]').evaluate(button => button.click());
    await page.waitForFunction(() => document.body.dataset.uiLayout === 'classic');

    const layout = await page.evaluate(() => {
      const app = document.querySelector('.app');
      const preview = app?.querySelector(':scope > .main');
      const left = app?.querySelector(':scope > .sidebar:not(.right)');
      const dock = app?.querySelector(':scope > .sidebar.right');
      const rect = element => {
        const box = element.getBoundingClientRect();
        return { top: box.top, left: box.left, right: box.right, width: box.width, height: box.height,
          display: getComputedStyle(element).display };
      };
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        gridTemplateColumns: getComputedStyle(app).gridTemplateColumns,
        preview: rect(preview), left: rect(left), dock: rect(dock),
        stage: rect(preview.querySelector('.stage')),
        rightPanels: [...dock.querySelectorAll('.panel')].filter(panel => getComputedStyle(panel).display !== 'none').length
      };
    });
    assert.ok(layout.preview.display !== 'none' && layout.preview.height > 0, 'Preview must remain visible on Android');
    assert.ok(layout.left.display !== 'none' && layout.left.height > 0, 'Left editor panels must remain visible');
    assert.ok(layout.dock.display !== 'none' && layout.dock.height > 0, 'Right/dock panels must remain visible');
    assert.ok(layout.rightPanels > 0, 'Classic right-side panels must not disappear on mobile');
    assert.ok(layout.preview.top < layout.left.top && layout.left.top < layout.dock.top,
      'Mobile Classic should stack preview, left editor, then right dock in a predictable order');
    assert.ok(layout.stage.width <= layout.viewport, 'Canvas must fit the phone viewport');
    assert.ok(layout.scrollWidth <= layout.viewport + 1, 'Classic layout must not create horizontal page overflow');
    assert.deepEqual(errors, [], 'Classic mobile layout must not throw browser errors');
    console.log('Classic Android/mobile layout passed:', JSON.stringify(layout));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
