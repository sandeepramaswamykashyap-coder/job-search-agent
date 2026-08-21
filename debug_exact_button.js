const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function printExactTopCardButtons() {
  const userDataDir = path.join(__dirname, '.browser_session');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const topCardBtns = await page.evaluate(() => {
    // Top card is the container under header
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map((b, index) => ({
      index,
      text: b.innerText,
      ariaLabel: b.getAttribute('aria-label') || '',
      outerHTML: b.outerHTML.substring(0, 150)
    }));
  });

  console.log('ALL BUTTONS ON PAGE:');
  console.log(JSON.stringify(topCardBtns, null, 2));

  await ctx.close();
}

printExactTopCardButtons();
