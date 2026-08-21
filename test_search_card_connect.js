const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Testing LinkedIn Search Results Card Connect buttons...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const searchQuery = 'Transformation Lead Deloitte Bangalore';
  console.log(`Navigating to Search Results: "${searchQuery}"`);
  await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const searchButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map(b => ({
      text: b.innerText.trim().replace(/\n/g, ' '),
      aria: b.getAttribute('aria-label') || '',
      class: b.className
    })).filter(b => b.text === 'Connect' || b.aria.includes('Invite') || b.aria.includes('connect'));
  });

  console.log('Search Card Connect Buttons Found:', searchButtons);

  if (searchButtons.length > 0) {
    console.log('\nFound active Connect button on search result card! Clicking first Connect button...');
    const connectBtn = page.locator('button:has-text("Connect"), button[aria-label*="Invite"]').first();
    await connectBtn.click();
    await page.waitForTimeout(2500);

    const modalPresent = await page.evaluate(() => {
      const modal = document.querySelector('div.artdeco-modal, div[role="dialog"]');
      if (!modal) return { found: false, text: document.body.innerText.slice(0, 300) };
      return {
        found: true,
        text: modal.innerText,
        buttons: Array.from(modal.querySelectorAll('button')).map(b => ({ text: b.innerText.trim(), aria: b.getAttribute('aria-label') || '' }))
      };
    });

    console.log('Search Card Click Modal Result:', JSON.stringify(modalPresent, null, 2));

    // Take screenshot of opened modal
    await page.screenshot({ path: path.join(__dirname, 'search_card_connect_modal.png') });
  }

  await ctx.close();
})().catch(console.error);
