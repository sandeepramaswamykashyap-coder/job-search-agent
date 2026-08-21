const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function debugTopCard() {
  const userDataDir = path.join(__dirname, '.browser_session');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Print all elements containing text "Connect"
  const connectElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => el.children.length === 0 && (el.innerText || '').includes('Connect'))
      .map(el => ({
        tagName: el.tagName,
        text: el.innerText,
        parentTag: el.parentElement ? el.parentElement.tagName : '',
        parentClass: el.parentElement ? el.parentElement.className : '',
        outerHTML: el.outerHTML
      }));
  });

  console.log('[TopCard] Elements containing Connect text:');
  console.log(JSON.stringify(connectElements, null, 2));

  await ctx.close();
}

debugTopCard();
