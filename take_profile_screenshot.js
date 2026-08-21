const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Capturing LinkedIn profile screenshot...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Take initial screenshot
  await page.screenshot({ path: path.join(__dirname, 'profile_before_more.png') });
  console.log('Saved profile_before_more.png');

  // Find all buttons inside main or top card
  const ctaButtons = page.locator('main section button, div[class*="top-card"] button, div[class*="actions"] button');
  const count = await ctaButtons.count();
  console.log(`Found ${count} CTA buttons in profile card.`);
  for (let i = 0; i < count; i++) {
    const txt = await ctaButtons.nth(i).innerText().catch(() => '');
    const aria = await ctaButtons.nth(i).getAttribute('aria-label').catch(() => '');
    console.log(`CTA Button ${i}: Text="${txt.trim()}", Aria="${aria}"`);
  }

  // Click CTA Button 1 specifically (aria-label="More" near Follow)
  const profileCardMoreBtn = ctaButtons.nth(1);
  console.log('Clicking CTA Button 1 (aria-label="More")...');
  await profileCardMoreBtn.click({ force: true });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, 'profile_after_more.png') });
  console.log('Saved profile_after_more.png');

  const visibleText = await page.evaluate(() => document.body.innerText);
  console.log('Page innerText after clicking More:', visibleText.substring(visibleText.indexOf('Follow Vikram Akundy'), visibleText.indexOf('Follow Vikram Akundy') + 800));

  await ctx.close();
})().catch(console.error);
