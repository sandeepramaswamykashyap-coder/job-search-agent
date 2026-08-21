const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function executeExactBlueConnect() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[ExactConnect] Launching browser session...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[ExactConnect] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Hide bottom chat overlays & top header menus
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Find the exact primary blue button under Vikram Akundy's name
  console.log('[ExactConnect] Locating primary blue "+ Connect" button under Vikram Akundy profile card...');
  
  const connectBtnHandle = await page.evaluateHandle(() => {
    // Find all buttons in the main content area (excluding navigation header and sidebar)
    const mainArea = document.querySelector('main');
    if (!mainArea) return null;
    const buttons = Array.from(mainArea.querySelectorAll('button'));
    // The main profile Connect button is inside the top section of main, before any sidebar cards
    return buttons.find(b => {
      const text = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').trim();
      return (text.includes('Connect') || aria.includes('Connect')) && !b.closest('.aside') && !b.closest('aside');
    });
  });

  if (connectBtnHandle && connectBtnHandle.asElement()) {
    console.log('[ExactConnect] Found target blue Connect button! Clicking...');
    await connectBtnHandle.asElement().click();
    await page.waitForTimeout(2500);
  } else {
    console.warn('[ExactConnect] Primary Connect button not found via DOM evaluation.');
  }

  // Handle "Add a note to your invitation?" modal
  const sendWithoutBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
  const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();

  if (await sendWithoutBtn.isVisible().catch(() => false)) {
    console.log('[ExactConnect] 🎯 Modal open! Clicking "Send without a note"...');
    await sendWithoutBtn.click({ force: true });
    await page.waitForTimeout(4000);
  } else if (await addNoteBtn.isVisible().catch(() => false)) {
    console.log('[ExactConnect] 🎯 Modal open! Clicking "Add a note"...');
    await addNoteBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const textarea = page.locator('textarea[name="message"], textarea#custom-message').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill("Hi Vikram, I bring 15+ yrs leading Program Transformation & ServiceNow HRSD. Would love to connect!");
      await page.waitForTimeout(1000);
    }
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("Send invitation")').first();
    if (await sendBtn.isVisible().catch(() => false)) {
      console.log('[ExactConnect] Clicking "Send" invitation button in modal...');
      await sendBtn.click({ force: true });
      await page.waitForTimeout(4000);
    }
  }

  // Step 4: Capture final verification screenshot
  const screenshotPath = path.join(__dirname, 'vikram_PROFILE_VERIFIED_PENDING.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[ExactConnect] Verification screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now Pending
  const isPending = await page.evaluate(() => {
    const mainArea = document.querySelector('main');
    if (!mainArea) return false;
    return (mainArea.innerText || '').includes('Pending');
  });

  console.log(`[ExactConnect] 🎉 Final Profile Pending Status Verified: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

executeExactBlueConnect().then(r => console.log('[ExactConnect] Output:', r));
