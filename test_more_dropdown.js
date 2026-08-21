const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Testing LinkedIn profile More button dropdown click...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  await page.goto('https://www.linkedin.com/in/mohamed-thalhath-14a93811/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Click More button in profile section
  const moreBtn = page.locator('button[aria-label*="More"], button:has-text("More")').nth(1); // second More button in hero
  if (await moreBtn.isVisible()) {
    console.log('Clicking More button...');
    await moreBtn.click();
    await page.waitForTimeout(2000);

    const dropdownText = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[role="button"], span, div.artdeco-dropdown__content'));
      return items.map(i => i.innerText.trim()).filter(t => t.includes('Connect') || t.includes('Message') || t.includes('Share'));
    });
    console.log('Dropdown options found:', dropdownText);
  } else {
    console.log('More button not visible.');
  }

  await ctx.close();
})().catch(console.error);
