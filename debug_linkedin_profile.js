const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Inspecting LinkedIn Profile Buttons...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map(b => ({
      text: b.innerText.trim(),
      ariaLabel: b.getAttribute('aria-label') || '',
      className: b.className
    })).filter(b => b.text || b.ariaLabel);
  });

  console.log('All Buttons found on Profile Page:', JSON.stringify(buttons, null, 2));

  // Target button index 11 specifically (the last aria-label="More" button on page near Follow)
  const profileMoreBtn = page.locator('button[aria-label="More"]').last();
  if (await profileMoreBtn.isVisible().catch(() => false)) {
    console.log('Clicking last button[aria-label="More"] near Follow...');
    await profileMoreBtn.click({ force: true });
    await page.waitForTimeout(3000);

    const dropdownText = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log('Body Text after clicking profile More button:', dropdownText.substring(dropdownText.indexOf('Follow'), dropdownText.indexOf('Follow') + 500));
  }

  await ctx.close();
})().catch(console.error);
