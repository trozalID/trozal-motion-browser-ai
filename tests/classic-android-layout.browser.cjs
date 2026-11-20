const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 393, height: 817 },
      deviceScaleFactor: 2.75,
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
        devicePixelRatio: window.devicePixelRatio,
        directChildren: [...app.children].map((el,index)=>({index,tag:el.tagName,className:el.className,id:el.id,display:getComputedStyle(el).display,gridColumn:getComputedStyle(el).gridColumn,rect:{x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width}})),
        stage: rect(preview.querySelector('.stage')),
        rightPanels: [...dock.querySelectorAll('.panel')].filter(panel => getComputedStyle(panel).display !== 'none').length
      };
    });
    console.log('Classic Android layout diagnostics:', JSON.stringify(layout));
    assert.ok(layout.preview.display !== 'none' && layout.preview.height > 0, 'Preview must remain visible on Android');
    assert.ok(layout.left.display !== 'none' && layout.left.height > 0, 'Left editor panels must remain visible');
    assert.ok(layout.dock.display !== 'none' && layout.dock.height > 0, 'Right/dock panels must remain visible');
    assert.ok(layout.rightPanels > 0, 'Classic right-side panels must not disappear on mobile');
    assert.ok(layout.left.left < layout.preview.left && layout.preview.left < layout.dock.left,
      'Classic Android must keep left dock, center preview dock, and right dock side-by-side like desktop');
    assert.ok(layout.left.width > 0 && layout.preview.width > 0 && layout.dock.width > 0,
      'All three docks must have usable visible widths');
    assert.ok(layout.preview.width > layout.left.width && layout.preview.width > layout.dock.width,
      'Center preview dock should receive the largest share of the narrow phone viewport');
    assert.ok(layout.stage.width <= layout.preview.width, 'Canvas must fit inside the center dock');
    assert.ok(layout.scrollWidth <= layout.viewport + 1, 'Three docks must fit without horizontal page overflow');
    assert.ok(layout.devicePixelRatio >= 2.5, 'Test must emulate Pocophone F1 high-density screen scaling');
    assert.deepEqual(errors, [], 'Classic mobile layout must not throw browser errors');
    console.log('Classic Android/mobile layout passed:', JSON.stringify(layout));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
