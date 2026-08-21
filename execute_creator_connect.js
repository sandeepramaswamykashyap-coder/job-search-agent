const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function executeCreatorConnect() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[CreatorConnect] Launching browser...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[CreatorConnect] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Hide bottom chat overlays
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Step 1: Click the exact More button on the profile card (next to Follow)
  console.log('[CreatorConnect] Clicking profile card More dropdown button...');
  const moreClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    // Find the More button near the Follow Vikram Akundy button
    const followBtn = btns.find(b => (b.getAttribute('aria-label') || '').includes('Follow Vikram'));
    if (followBtn) {
      // Look for sibling / nearby More button
      const parentContainer = followBtn.parentElement || followBtn.closest('div');
      if (parentContainer) {
        const moreBtn = Array.from(parentContainer.querySelectorAll('button')).find(b => (b.innerText || '').includes('More') || b.getAttribute('aria-label') === 'More');
        if (moreBtn) {
          moreBtn.click();
          return true;
        }
      }
    }
    // Fallback: click button with text 'More' near top
    const anyMore = btns.find(b => b.innerText.trim() === 'More');
    if (anyMore) {
      anyMore.click();
      return true;
    }
    return false;
  });

  console.log('[CreatorConnect] Profile More Clicked:', moreClicked);
  await page.waitForTimeout(2000);

  // Step 2: Click "Connect" inside the opened dropdown menu
  console.log('[CreatorConnect] Clicking "Connect" inside dropdown...');
  const connectClicked = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div[role="dropdown"] *, div[role="menu"] *, div *, ul *'));
    const connectItem = allElements.find(el => {
      const text = (el.innerText || '').trim();
      return text === 'Connect' || text.includes('Connect');
    });

    if (connectItem) {
      connectItem.click();
      return true;
    }
    return false;
  });

  console.log('[CreatorConnect] Dropdown Connect Clicked:', connectClicked);
  await page.waitForTimeout(2500);

  // Step 3: Handle "Add a note to your invitation?" modal
  console.log('[CreatorConnect] Submitting invitation modal...');
  const modalSubmitted = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sendWithoutBtn = btns.find(b => (b.innerText || '').includes('Send without a note'));
    if (sendWithoutBtn) {
      sendWithoutBtn.click();
      return 'Send Without Note Clicked';
    }
    const sendBtn = btns.find(b => (b.innerText || '').trim() === 'Send' || (b.getAttribute('aria-label') || '').includes('Send'));
    if (sendBtn) {
      sendBtn.click();
      return 'Send Clicked';
    }
    return 'Modal button not found';
  });

  console.log('[CreatorConnect] Modal Submission Result:', modalSubmitted);
  await page.waitForTimeout(4000);

  // Step 4: Capture final verification screenshot
  const screenshotPath = path.join(__dirname, 'vikram_PROOFOFCONNECT.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[CreatorConnect] Verification screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now Pending
  const isPending = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Pending') || text.includes('Pending invitation');
  });

  console.log(`[CreatorConnect] 🎉 Final Profile Verification - Is Pending: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

executeCreatorConnect().then(r => console.log('[CreatorConnect] Done:', r));
