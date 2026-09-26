/**
 * check_naukri_inbox.js
 * 
 * Inspects Naukri notifications and recruiter messages
 * to see if any hiring managers or recruiters have reached out.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Clear session locks
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkNaukriInbox() {
  console.log('======================================================================');
  console.log('📬 [NaukriInbox] CHECKING RECRUITER NOTIFICATIONS & INBOX MESSAGES');
  console.log('======================================================================');

  const browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 850 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browserContext.pages()[0] || await browserContext.newPage();

  try {
    // 1. Check Notifications
    console.log('[NaukriInbox] 🌐 Checking Notifications page...');
    await page.goto('https://www.naukri.com/notifications', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    const notificationItems = await page.locator('.notification-tuple, .tuple, .nTuple, [class*="notification"]').all();
    console.log(`[NaukriInbox] Found ${notificationItems.length} notification items.`);

    for (let i = 0; i < Math.min(notificationItems.length, 10); i++) {
      const text = await notificationItems[i].innerText().catch(() => '');
      if (text.trim()) {
        console.log(`\n--- Notification #${i + 1} ---`);
        console.log(text.trim().replace(/\n+/g, ' | '));
      }
    }

    // 2. Check Recruiter Messages / Chat
    console.log('\n[NaukriInbox] 💬 Checking Recruiter Messages...');
    await page.goto('https://www.naukri.com/mnjuser/inbox', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    const messageItems = await page.locator('.msg-tuple, .chat-tuple, [class*="message"], [class*="inbox"]').all();
    console.log(`[NaukriInbox] Found ${messageItems.length} inbox items.`);
    for (let i = 0; i < Math.min(messageItems.length, 10); i++) {
      const text = await messageItems[i].innerText().catch(() => '');
      if (text.trim()) {
        console.log(`\n--- Message #${i + 1} ---`);
        console.log(text.trim().replace(/\n+/g, ' | '));
      }
    }

    await page.screenshot({ path: path.join(__dirname, 'naukri_inbox_snapshot.png'), fullPage: false });
    console.log('[NaukriInbox] 📸 Snapshot saved to naukri_inbox_snapshot.png');

  } catch (err) {
    console.error(`[NaukriInbox] ❌ Error: ${err.message}`);
  } finally {
    await browserContext.close().catch(() => {});
  }
}

checkNaukriInbox();
