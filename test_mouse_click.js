const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function testTopProfileConnect() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[TopProfile] Launching browser session...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[TopProfile] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Hide bottom chat overlays
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Get exact bounding box of Connect button in top profile card
  const buttonCenter = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, div[role="button"], span, a'));
    const connectEl = all.find(el => {
      const text = (el.innerText || '').trim();
      const rect = el.getBoundingClientRect();
      // Left side of profile card (x: 50-300, y: 150-500)
      return (text === 'Connect' || text === '+ Connect') && rect.left > 50 && rect.left < 300 && rect.top > 150 && rect.top < 600;
    });

    if (connectEl) {
      const rect = connectEl.getBoundingClientRect();
      return { text: connectEl.innerText, tag: connectEl.tagName, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  });

  console.log('[TopProfile] Target Button Found:', buttonCenter);

  if (buttonCenter) {
    console.log(`[TopProfile] Clicking mouse at (${buttonCenter.x}, ${buttonCenter.y})...`);
    await page.mouse.click(buttonCenter.x, buttonCenter.y);
    await page.waitForTimeout(3000);

    // Click "Send without a note" or "Send" in modal
    const modalAction = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      const sendWithout = all.find(b => (b.innerText || '').includes('Send without a note'));
      if (sendWithout) {
        sendWithout.click();
        return 'Clicked Send Without Note';
      }
      const sendBtn = all.find(b => (b.innerText || '').trim() === 'Send' || (b.getAttribute('aria-label') || '').includes('Send'));
      if (sendBtn) {
        sendBtn.click();
        return 'Clicked Send';
      }
      return 'Modal button not found';
    });

    console.log('[TopProfile] Modal Action:', modalAction);
    await page.waitForTimeout(4000);
  }

  // Step 3: Capture screenshot of verified profile
  const screenshotPath = path.join(__dirname, 'vikram_PROFILE_VERIFIED_PENDING_CONFIRMED.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[TopProfile] Screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now Pending
  const isPending = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Pending') || text.includes('Pending invitation');
  });

  console.log(`[TopProfile] 🎉 Final Profile Pending Status Verified: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

testTopProfileConnect().then(r => console.log('[TopProfile] Result:', r));
