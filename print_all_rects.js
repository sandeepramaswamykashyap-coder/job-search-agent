const { chromium } = require('playwright');
const path = require('path');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function printAllButtonRects() {
  const userDataDir = path.join(__dirname, '.browser_session');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const rects = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map((b, i) => {
      const r = b.getBoundingClientRect();
      return {
        i,
        text: (b.innerText || '').trim(),
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height)
      };
    });
  });

  console.log('ALL BUTTON BOUNDING RECTS:');
  console.log(JSON.stringify(rects.filter(r => r.text), null, 2));

  await ctx.close();
}

printAllButtonRects();
