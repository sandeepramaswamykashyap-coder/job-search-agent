const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Capturing DOM screenshot after clicking Connect in More dropdown...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  await page.goto('https://www.linkedin.com/in/sarath-n-98b902102/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const moreBtn = page.locator('button[aria-label*="More"], button:has-text("More")').nth(1);
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(1500);

    const connectItem = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
    if (await connectItem.isVisible()) {
      console.log('Clicking Connect item in dropdown...');
      await connectItem.click();
      await page.waitForTimeout(3000);

      const shotPath = path.join(__dirname, 'modal_after_dropdown_click.png');
      await page.screenshot({ path: shotPath });
      console.log(`Saved screenshot to: ${shotPath}`);

      const bodySnippet = await page.evaluate(() => {
        const modal = document.querySelector('div.artdeco-modal, div[role="dialog"]');
        return modal ? modal.innerText : document.body.innerText.slice(0, 400);
      });
      console.log('DOM Text Result:\n', bodySnippet);
    }
  }

  await ctx.close();
})().catch(console.error);
