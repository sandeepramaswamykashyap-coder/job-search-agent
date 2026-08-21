const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function clickParentButton() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[ParentClick] Launching browser...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });

  const page = await ctx.newPage();
  console.log('[ParentClick] Navigating to Vikram Akundy profile...');
  await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Hide bottom chat overlays
  await page.evaluate(() => {
    document.querySelectorAll('.msg-overlay-container, #msg-overlay, .msg-overlay-list-bubble').forEach(el => el.style.display = 'none');
  });

  // Find the exact primary blue button at (y: 500-550, x: 80-200) and click its clickable parent!
  const clickInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const target = all.find(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || '').trim();
      return (text === 'Connect' || text === '+ Connect') && rect.top > 480 && rect.top < 550 && rect.left > 70 && rect.left < 200;
    });

    if (target) {
      // Traverse up to find the closest clickable button/div wrapper
      let clickable = target;
      while (clickable && clickable.tagName !== 'BUTTON' && !clickable.classList.contains('artdeco-button') && clickable.getAttribute('role') !== 'button' && clickable.parentElement) {
        clickable = clickable.parentElement;
      }
      if (clickable) {
        clickable.click();
        return { found: true, clickedTag: clickable.tagName, text: clickable.innerText };
      }
    }
    return { found: false };
  });

  console.log('[ParentClick] Click Result:', clickInfo);
  await page.waitForTimeout(3000);

  // Step 2: Handle modal submit button: "Send without a note" or "Send"
  const modalClickInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"], span'));
    const sendWithout = all.find(b => (b.innerText || '').includes('Send without a note'));
    if (sendWithout) {
      sendWithout.click();
      return 'Clicked Send without a note';
    }
    const sendBtn = all.find(b => (b.innerText || '').trim() === 'Send' || (b.getAttribute('aria-label') || '').includes('Send'));
    if (sendBtn) {
      sendBtn.click();
      return 'Clicked Send';
    }
    return 'No modal submit button found';
  });

  console.log('[ParentClick] Modal Action:', modalClickInfo);
  await page.waitForTimeout(4000);

  // Step 3: Capture screenshot of verified profile
  const screenshotPath = path.join(__dirname, 'vikram_PROFILE_VERIFIED_PENDING_FINAL.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[ParentClick] Screenshot saved to ${screenshotPath}`);

  // Check if profile CTA text is now Pending
  const isPending = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Pending') || text.includes('Pending invitation');
  });

  console.log(`[ParentClick] 🎉 Final Profile Pending Status Verified: ${isPending}`);

  await ctx.close();
  return { isPending, screenshotPath };
}

clickParentButton().then(r => console.log('[ParentClick] Done:', r));
