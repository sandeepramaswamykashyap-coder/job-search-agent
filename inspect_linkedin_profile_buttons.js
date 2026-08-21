const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Inspecting LinkedIn profile action buttons...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  await page.goto('https://www.linkedin.com/in/mohamed-thalhath-14a93811/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a.artdeco-button'));
    return btns.map(b => ({
      text: b.innerText.trim().replace(/\n/g, ' '),
      aria: b.getAttribute('aria-label') || '',
      class: b.className
    })).filter(x => x.text || x.aria);
  });

  console.log('Profile Action Buttons Found:', buttons.slice(0, 15));
  await ctx.close();
})().catch(console.error);
