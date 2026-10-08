/**
 * check_portal_inboxes.js — Automated Recruiter Message & InMail Inspector
 * 
 * Inspects Naukri, LinkedIn, and IIMJobs inboxes for recruiter communications,
 * connection requests, chat messages, and interview reachouts.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');
const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('======================================================================');
  console.log('📥 [INBOX INSPECTOR] SCANNING PORTALS FOR INBOUND RECRUITER REACHOUTS');
  console.log('Timestamp:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'IST');
  console.log('======================================================================\n');

  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: true, // headless for fast non-intrusive scan
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const page = await context.newPage();
  const report = {
    timestamp: new Date().toISOString(),
    naukri: { loggedIn: false, unreadMessages: 0, recruiterMessages: [], notifications: [] },
    linkedin: { loggedIn: false, unreadMessages: 0, threads: [] },
    iimjobs: { loggedIn: false, messages: [] }
  };

  try {
    // 1. NAUKRI INBOX & NOTIFICATIONS
    console.log('[1/3] 🔍 Checking Naukri Messages & Notifications...');
    await page.goto('https://www.naukri.com/mnjuser/homepage', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(4000);

    if (page.url().includes('login') || page.url().includes('nlogin')) {
      console.log('  ⚠️ Naukri redirected to login. Attempting automated login...');
      const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
      const userInp = page.locator('#usernameField, input[placeholder*="Username" i], input[placeholder*="Email" i]').first();
      if (await userInp.isVisible({ timeout: 4000 }).catch(() => false)) {
        await userInp.fill(creds.naukri.username);
        const passInp = page.locator('#passwordField, input[type="password"]').first();
        await passInp.fill(creds.naukri.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await SLEEP(4000);
      }
    }

    if (!page.url().includes('login')) {
      report.naukri.loggedIn = true;
      console.log('  ✅ Logged into Naukri successfully.');

      // Check Notification & Inbox count on dashboard
      const notifBadges = await page.locator('.nI-gNb-header__notification-count, .notification-badge, [class*="badge"], [class*="unread"]').allInnerTexts().catch(() => []);
      console.log('  🔔 Badges found on dashboard:', notifBadges.filter(Boolean));

      // Navigate to Naukri Notifications
      console.log('  📂 Navigating to Naukri Notification Hub...');
      await page.goto('https://www.naukri.com/mnjuser/notifications', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await SLEEP(3500);

      const notifCards = await page.locator('.notification-tuple, .tuple, [class*="notif-item"], [class*="notifTuple"]').all();
      console.log(`  Found ${notifCards.length} notification items.`);
      for (const card of notifCards.slice(0, 8)) {
        const text = (await card.innerText().catch(() => '')).trim();
        if (text) {
          report.naukri.notifications.push(text.replace(/\s+/g, ' ').slice(0, 200));
        }
      }

      // Navigate to Naukri Inbox / Chat if present
      console.log('  📂 Checking Naukri Chat / Recruiter Messages...');
      await page.goto('https://www.naukri.com/mnjuser/inbox', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await SLEEP(3500);

      const msgCards = await page.locator('.chat-tuple, .message-tuple, [class*="chat-item"], [class*="conversation-item"], [class*="msg-card"]').all();
      console.log(`  Found ${msgCards.length} chat / message threads on Naukri.`);
      for (const card of msgCards.slice(0, 10)) {
        const text = (await card.innerText().catch(() => '')).trim();
        if (text) {
          report.naukri.recruiterMessages.push(text.replace(/\s+/g, ' ').slice(0, 250));
        }
      }
    } else {
      console.log('  ❌ Could not authenticate to Naukri.');
    }

    // 2. LINKEDIN MESSAGING
    console.log('\n[2/3] 🔍 Checking LinkedIn Messaging...');
    await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(4000);

    if (!page.url().includes('login') && !page.url().includes('checkpoint')) {
      report.linkedin.loggedIn = true;
      console.log('  ✅ Logged into LinkedIn successfully.');

      const threads = await page.locator('.msg-conversation-listitem, .msg-conversation-card, li[class*="msg-conversation"]').all();
      console.log(`  Found ${threads.length} conversation threads in LinkedIn messaging.`);

      for (const th of threads.slice(0, 10)) {
        const sender = (await th.locator('.msg-conversation-listitem__participant-names, [class*="participant-name"]').first().innerText().catch(() => '')).trim();
        const snippet = (await th.locator('.msg-overlay-list-bubble__message-snippet, [class*="message-snippet"]').first().innerText().catch(() => '')).trim();
        const time = (await th.locator('time, [class*="time"]').first().innerText().catch(() => '')).trim();

        if (sender || snippet) {
          report.linkedin.threads.push({
            sender: sender || 'Contact',
            snippet: snippet.slice(0, 180),
            time
          });
        }
      }
    } else {
      console.log('  ℹ️ LinkedIn session requires browser login / checkpoint verification.');
    }

    // 3. IIMJOBS MESSAGES
    console.log('\n[3/3] 🔍 Checking IIMJobs / Hirist Chat...');
    await page.goto('https://www.iimjobs.com/chat', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await SLEEP(3500);

    if (!page.url().includes('login')) {
      report.iimjobs.loggedIn = true;
      console.log('  ✅ Logged into IIMJobs successfully.');

      const iimChats = await page.locator('[class*="chat-tuple"], [class*="conversation"], .chat-user, .chat-list-item').all();
      console.log(`  Found ${iimChats.length} chat threads on IIMJobs.`);
      for (const ch of iimChats.slice(0, 8)) {
        const text = (await ch.innerText().catch(() => '')).trim();
        if (text) {
          report.iimjobs.messages.push(text.replace(/\s+/g, ' ').slice(0, 200));
        }
      }
    } else {
      console.log('  ℹ️ IIMJobs chat requires login.');
    }

  } catch (err) {
    console.error('❌ Inbox check error:', err.message);
  } finally {
    await context.close().catch(() => {});
  }

  // Save report
  const outPath = path.join(__dirname, 'inbox_scan_results.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('\n💾 Saved scan results to inbox_scan_results.json');
  console.log(JSON.stringify(report, null, 2));
}

main();
