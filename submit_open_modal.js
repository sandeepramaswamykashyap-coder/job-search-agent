const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function completeModalAndVerify() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[SubmitModal] Launching Playwright persistent browser session...');
  
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await ctx.newPage();
  console.log('[SubmitModal] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Step 1: Click + Connect on main profile card
  const connectBtn = page.locator('main button:has-text("Connect"), main button[aria-label*="Connect"]').first();
  if (await connectBtn.isVisible().catch(() => false)) {
    console.log('[SubmitModal] Found profile "+ Connect" button. Clicking...');
    await connectBtn.click({ force: true });
    await page.waitForTimeout(2000);
  } else {
    // Try More dropdown
    const moreBtn = page.locator('main button[aria-label="More"], main button:has-text("More")').first();
    if (await moreBtn.isVisible().catch(() => false)) {
      console.log('[SubmitModal] Direct Connect not visible. Clicking More dropdown...');
      await moreBtn.click({ force: true });
      await page.waitForTimeout(1000);
      const dropdownConnect = page.locator('div[role="dropdown"] button:has-text("Connect"), ul button:has-text("Connect")').first();
      if (await dropdownConnect.isVisible().catch(() => false)) {
        await dropdownConnect.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }
  }

  // Step 2: Handle "Add a note to your invitation?" modal
  const sendWithoutNoteBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
  const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();

  if (await sendWithoutNoteBtn.isVisible().catch(() => false)) {
    console.log('[SubmitModal] Modal visible! Clicking "Send without a note"...');
    await sendWithoutNoteBtn.click({ force: true });
    await page.waitForTimeout(4000);
  } else if (await addNoteBtn.isVisible().catch(() => false)) {
    console.log('[SubmitModal] Modal visible! Clicking "Add a note"...');
    await addNoteBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const textarea = page.locator('textarea[name="message"], textarea#custom-message').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill("Hi Vikram, would love to connect and explore synergies in Transformation!");
      await page.waitForTimeout(1000);
    }
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("Send invitation")').first();
    if (await sendBtn.isVisible().catch(() => false)) {
      console.log('[SubmitModal] Clicking "Send" invitation button in modal...');
      await sendBtn.click({ force: true });
      await page.waitForTimeout(4000);
    }
  }

  // Step 3: Take verification screenshot
  const screenshotPath = path.join(__dirname, 'vikram_profile_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[SubmitModal] Screenshot saved to ${screenshotPath}`);

  // Check if button is now "Pending"
  const pendingBtn = page.locator('main button:has-text("Pending"), main button[aria-label*="Pending"]').first();
  const isPending = await pendingBtn.isVisible().catch(() => false);
  console.log(`[SubmitModal] Profile Pending Status Verified: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

completeModalAndVerify().then(r => console.log('[SubmitModal] Final Result:', r));
