const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function testExactPrimaryConnect() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[ExactConnect] Launching browser...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[ExactConnect] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Hide bottom chat overlay
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Find the exact blue + Connect button on top profile card
  const primaryConnectBtn = page.locator('button:has-text("Connect")').filter({ hasText: 'Connect' }).first();

  console.log('[ExactConnect] Finding blue + Connect button on profile card...');
  // Click using force or page.evaluate
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const connectBtn = btns.find(b => {
      const text = b.innerText.trim();
      return (text === 'Connect' || text === '+ Connect' || text.includes('Connect')) && !b.closest('.aside') && !b.closest('.mn-sub-nav');
    });
    if (connectBtn) {
      connectBtn.click();
      return true;
    }
    return false;
  });

  console.log('[ExactConnect] JavaScript Click Result:', clicked);
  await page.waitForTimeout(2000);

  // Look for modal
  const sendWithoutBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
  const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();

  console.log('[ExactConnect] Is "Send without a note" modal button visible?', await sendWithoutBtn.isVisible().catch(() => false));

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

  // Take final screenshot
  const screenshotPath = path.join(__dirname, 'vikram_profile_FINAL_PENDING_PROOF.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[ExactConnect] Verification screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now Pending
  const pendingText = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.some(b => b.innerText.includes('Pending'));
  });

  console.log(`[ExactConnect] 🎉 Profile Pending Status Verified via DOM: ${pendingText}`);

  await ctx.close();
  return { pendingText, screenshotPath };
}

testExactPrimaryConnect().then(r => console.log('[ExactConnect] Result:', r));
