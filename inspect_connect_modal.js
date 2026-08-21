const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Inspecting modal text after clicking Connect in Hero More menu...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const url = 'https://www.linkedin.com/in/bs-padmanabh-92145429/';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const heroMoreBtn = page.locator('main button:has-text("More"), main button[aria-label*="More"]').first();
  if (await heroMoreBtn.isVisible()) {
    await heroMoreBtn.click();
    await page.waitForTimeout(2000);

    const dropdownConnect = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
    if (await dropdownConnect.isVisible()) {
      await dropdownConnect.click();
      await page.waitForTimeout(3000);

      const shotPath = path.join(__dirname, 'modal_dom_screen.png');
      await page.screenshot({ path: shotPath });
      console.log(`Saved screenshot to: ${shotPath}`);

      const pageText = await page.evaluate(() => {
        const modal = document.querySelector('div.artdeco-modal, div[role="dialog"]');
        return modal ? modal.innerText : document.body.innerText.slice(0, 600);
      });
      console.log('DOM Text Result:\n', pageText);
    }
  }

  await ctx.close();
})().catch(console.error);
