const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function testFullConnectFlow() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[TestFlow] Launching persistent browser session...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[TestFlow] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Dismiss bottom chat overlays
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Check if modal is ALREADY open on screen (from previous user session)
  const sendWithoutModalBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
  const addNoteModalBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();

  if (await sendWithoutModalBtn.isVisible().catch(() => false)) {
    console.log('[TestFlow] 🎯 Found open modal on screen! Clicking "Send without a note"...');
    await sendWithoutModalBtn.click({ force: true });
    await page.waitForTimeout(3000);
  } else if (await addNoteModalBtn.isVisible().catch(() => false)) {
    console.log('[TestFlow] 🎯 Found open modal "Add a note" button! Clicking...');
    await sendWithoutModalBtn.click({ force: true }).catch(() => sendWithoutModalBtn.click());
    await page.waitForTimeout(3000);
  } else {
    // Locate More button next to Follow button in main profile header
    const followBtn = page.locator('main button:has-text("Follow"), main button[aria-label*="Follow Vikram"]').first();
    console.log('[TestFlow] Is Follow button visible?', await followBtn.isVisible().catch(() => false));

    // Find the More button inside main profile card
    const profileMoreBtn = page.locator('main button:has-text("More"), main button[aria-label*="More"]').first();
    console.log('[TestFlow] Clicking profile card More button...');
    await profileMoreBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Look for Connect in dropdown
    const dropdownConnect = page.locator('div[role="dropdown"] button:has-text("Connect"), ul button:has-text("Connect"), button:has-text("Connect")').first();
    if (await dropdownConnect.isVisible().catch(() => false)) {
      console.log('[TestFlow] Found Connect in dropdown. Clicking...');
      await dropdownConnect.click({ force: true });
      await page.waitForTimeout(2000);

      // Handle Send without a note modal
      const modalSendWithout = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
      if (await modalSendWithout.isVisible().catch(() => false)) {
        console.log('[TestFlow] Modal appeared. Clicking "Send without a note"...');
        await modalSendWithout.click({ force: true });
        await page.waitForTimeout(3000);
      }
    }
  }

  // MANDATORY VERIFICATION: Capture final screenshot and check for Pending status
  const screenshotPath = path.join(__dirname, 'vikram_profile_final.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[TestFlow] Final verification screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now "Pending" or "Pending invitation"
  const pendingBtn = page.locator('main button:has-text("Pending"), main button[aria-label*="Pending"]').first();
  const isPending = await pendingBtn.isVisible().catch(() => false);
  console.log(`[TestFlow] ✅ Final Profile Verification - Is Pending: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

testFullConnectFlow().then(r => console.log('[TestFlow] Result:', r));
