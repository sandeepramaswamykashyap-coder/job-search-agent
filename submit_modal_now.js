const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function submitOpenModal() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[SubmitModal] Launching browser session...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[SubmitModal] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Hide bottom chat overlays
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Step 1: Check if modal is open. If not open, click Connect button at (150.45, 535.5)
  let sendWithoutBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
  if (!await sendWithoutBtn.isVisible().catch(() => false)) {
    console.log('[SubmitModal] Modal not open yet. Clicking + Connect button...');
    await page.mouse.click(150.45, 535.5);
    await page.waitForTimeout(3000);
  }

  sendWithoutBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
  console.log('[SubmitModal] Is "Send without a note" button visible on screen?', await sendWithoutBtn.isVisible().catch(() => false));

  if (await sendWithoutBtn.isVisible().catch(() => false)) {
    console.log('[SubmitModal] 🚀 Clicking "Send without a note" button...');
    await sendWithoutBtn.click({ force: true });
    await page.waitForTimeout(5000);
  } else {
    console.log('[SubmitModal] Trying JS click on "Send without a note"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(el => (el.innerText || '').includes('Send without a note'));
      if (b) b.click();
    });
    await page.waitForTimeout(5000);
  }

  // Reload page to get absolute fresh status proof
  console.log('[SubmitModal] Reloading page to verify updated button state...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Step 3: Capture screenshot of verified profile
  const screenshotPath = path.join(__dirname, 'vikram_VERIFIED_100_PERCENT_PENDING.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[SubmitModal] Screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now Pending
  const isPending = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Pending') || text.includes('Pending invitation');
  });

  console.log(`[SubmitModal] 🎉 Final Profile Pending Status Verified: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

submitOpenModal().then(r => console.log('[SubmitModal] Result:', r));
