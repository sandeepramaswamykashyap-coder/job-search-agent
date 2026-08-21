const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function clickExactBlueConnectButton() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[ExactClick] Launching persistent browser session...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[ExactClick] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Hide bottom chat overlays & top header menus
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Find the exact blue + Connect button by searching for button with "+ Connect" or "Connect" near Vikram's name
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const connectBtn = btns.find(b => {
      const rect = b.getBoundingClientRect();
      const text = (b.innerText || '').trim();
      // Must be near left side of profile card (x: 50-300, y: 500-750) and contain Connect
      return (text.includes('Connect') || text === '+ Connect') && rect.left > 50 && rect.left < 300 && rect.top > 400 && rect.top < 800;
    });

    if (connectBtn) {
      connectBtn.click();
      return true;
    }
    return false;
  });

  console.log('[ExactClick] Button Found & Clicked:', clicked);
  await page.waitForTimeout(2500);

  // Step 2: Click "Send without a note" or "Send" in modal
  const modalClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sendWithout = btns.find(b => (b.innerText || '').includes('Send without a note'));
    if (sendWithout) {
      sendWithout.click();
      return 'Send Without Note Clicked';
    }
    const sendBtn = btns.find(b => (b.innerText || '').trim() === 'Send' || (b.getAttribute('aria-label') || '').includes('Send'));
    if (sendBtn) {
      sendBtn.click();
      return 'Send Clicked';
    }
    return 'Modal button not found';
  });

  console.log('[ExactClick] Modal Click Result:', modalClicked);
  await page.waitForTimeout(4000);

  // Step 3: Capture screenshot of verified profile
  const screenshotPath = path.join(__dirname, 'vikram_PROFILE_VERIFIED_PENDING_PROOF.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[ExactClick] Screenshot saved to ${screenshotPath}`);

  // Check if button text is now Pending
  const isPending = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Pending') || text.includes('Pending invitation');
  });

  console.log(`[ExactClick] 🎉 Final Profile Pending Status Verified: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

clickExactBlueConnectButton().then(r => console.log('[ExactClick] Done:', r));
