const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  console.log('--- TESTING 2-STEP CONNECT WITH PREMIUM POPUP BYPASS ---');
  const ctx = await chromium.launchPersistentContext('.browser_session', {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await ctx.newPage();
  
  await page.goto('https://www.linkedin.com/in/debi-bhattacharjee-28a18161/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  async function clickConnect() {
    const directConnect = page.locator('main button').filter({ hasText: /^Connect$/i }).first();
    if (await directConnect.isVisible().catch(() => false)) {
      console.log('Found direct Connect button');
      await directConnect.click().catch(() => {});
      return true;
    }
    const moreBtn = page.locator('main button').filter({ hasText: /^More$/i }).first();
    if (await moreBtn.isVisible().catch(() => false)) {
      console.log('Found More button, clicking...');
      await moreBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
      const dropdownConnect = page.locator('div[role="button"], span, button, li').filter({ hasText: /^Connect$/i }).first();
      if (await dropdownConnect.isVisible().catch(() => false)) {
        console.log('Found dropdown Connect item, clicking...');
        await dropdownConnect.click({ force: true }).catch(() => {});
        return true;
      }
    }
    return false;
  }

  // Attempt 1: First click Connect
  console.log('Attempt 1: Clicking Connect...');
  await clickConnect();
  await page.waitForTimeout(2500);
  
  // Check for Premium popup
  const dismissBtn = page.locator('button[aria-label="Dismiss"], button[aria-label="Close"], button.artdeco-modal__dismiss').first();
  if (await dismissBtn.isVisible().catch(() => false)) {
    console.log('Premium popup detected! Dismissing...');
    await dismissBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    // Attempt 2: Re-click Connect after dismissing Premium popup
    console.log('Attempt 2: Re-clicking Connect post-dismissal...');
    await clickConnect();
    await page.waitForTimeout(2500);
  }
  
  // Inspect dialog text now
  const modalText = await page.evaluate(() => {
    const d = document.querySelector('dialog, .artdeco-modal');
    return d ? d.innerText : 'No dialog found';
  });
  console.log('Final Dialog Text:\n', modalText.substring(0, 600));

  // Check for Send without a note button
  const sendWithoutNoteBtn = page.locator([
    'button:has-text("Send without a note")',
    'button[aria-label*="Send without a note"]',
    'button:has-text("Send now")',
    'button[aria-label*="Send now"]',
    'button:has-text("Send")'
  ].join(', ')).first();

  if (await sendWithoutNoteBtn.isVisible().catch(() => false)) {
    const btnText = await sendWithoutNoteBtn.innerText().catch(() => '');
    console.log(`FOUND CONFIRMATION SEND BUTTON: "${btnText}"! Clicking now...`);
    await sendWithoutNoteBtn.click().catch(() => {});
    await page.waitForTimeout(3000);
    console.log('🎉 INVITATION DISPATCH CONFIRMED SUCCESSFULLY!');
  } else {
    console.log('Send button still not visible.');
  }
  
  await ctx.close();
})();
