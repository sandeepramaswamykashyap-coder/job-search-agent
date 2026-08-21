const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Inspecting exact dropdown elements on BS Padmanabh profile...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const url = 'https://www.linkedin.com/in/bs-padmanabh-92145429/';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const moreBtn = page.locator('button[aria-label*="More"], button:has-text("More")').nth(1);
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(1500);

    const menuItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div.artdeco-dropdown__content li, div.artdeco-dropdown__content div[role="button"], div.artdeco-dropdown__content span'));
      return items.map(i => i.innerText.trim()).filter(Boolean);
    });
    console.log('Dropdown Menu Items Found:\n', menuItems);

    const connectItem = page.locator('div.artdeco-dropdown__content li:has-text("Connect"), div.artdeco-dropdown__content div[role="button"]:has-text("Connect")').first();
    if (await connectItem.isVisible()) {
      console.log('Clicking Connect in dropdown...');
      await connectItem.click();
      await page.waitForTimeout(3000);

      const shotPath = path.join(__dirname, 'padmanabh_connect_modal.png');
      await page.screenshot({ path: shotPath });
      console.log(`Saved screenshot: ${shotPath}`);

      const modalText = await page.evaluate(() => {
        const modal = document.querySelector('div.artdeco-modal, div[role="dialog"]');
        return modal ? modal.innerText : 'NO DIALOG MODAL FOUND';
      });
      console.log('\nModal Text Output:\n', modalText);
    }
  }

  await ctx.close();
})().catch(console.error);
