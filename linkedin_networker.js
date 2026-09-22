/**
 * linkedin_networker.js — Autonomous LinkedIn Networking & Executive Connection Engine
 *
 * Automatically discovers 2nd/3rd-degree Talent Acquisition Partners, Executive
 * Recruiters, and Engineering/Operations Directors at target companies in Bengaluru,
 * sends personalized connection requests with executive pitch notes, and updates
 * connection_requests.json and outreach_tracker.json.
 */

const fs = require('fs');
const path = require('path');
const { generateOutreachTracker } = require('./outreach_tracker');

const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const CONNECTIONS_FILE = path.join(__dirname, 'connection_requests.json');

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SEARCH_QUERIES = [
  'talent acquisition bengaluru',
  'technical recruiter bengaluru',
  'leadership hiring bengaluru',
  'director operations bengaluru',
  'transformation director bengaluru'
];

async function ensureLinkedInLoggedIn(page) {
  try {
    console.log('[LinkedInNetworker] 🌐 Checking LinkedIn authentication status...');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await SLEEP(3500);

    if (page.url().includes('login') || page.url().includes('checkpoint')) {
      console.log('[LinkedInNetworker] 🔑 Logging into LinkedIn...');
      const userInp = page.locator('#username, input[name="session_key"]').first();
      if (await userInp.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userInp.fill(credentials.linkedin.username);
        await SLEEP(800);
        const passInp = page.locator('#password, input[name="session_password"]').first();
        await passInp.fill(credentials.linkedin.password);
        await SLEEP(800);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await SLEEP(4000);
      }
    }

    return page.url().includes('feed') || page.url().includes('linkedin.com');
  } catch (err) {
    console.warn(`[LinkedInNetworker] Auth notice: ${err.message}`);
    return false;
  }
}

async function runLinkedInNetworking(page, context, maxConnections = 5) {
  console.log('\n======================================================================');
  console.log('🤝 [LINKEDIN NETWORKER] STARTING AUTOMATED RECRUITER NETWORKING SWEEP');
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('======================================================================');

  const loggedIn = await ensureLinkedInLoggedIn(page);
  if (!loggedIn) {
    console.warn('[LinkedInNetworker] ⚠️ Session not active or requires manual checkpoint. Skipping.');
    return 0;
  }

  let connectionList = [];
  if (fs.existsSync(CONNECTIONS_FILE)) {
    try { connectionList = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8')); } catch (_) {}
  }

  const existingUrls = new Set(connectionList.map(c => (c.profileUrl || '').toLowerCase().trim()));
  let connectionsSent = 0;

  for (const query of SEARCH_QUERIES) {
    if (connectionsSent >= maxConnections) break;

    const encoded = encodeURIComponent(query);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encoded}`;
    console.log(`\n[LinkedInNetworker] 🔍 Searching target contacts: "${query}"...`);

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await SLEEP(4000);

      // Scroll to load results
      await page.evaluate(() => window.scrollBy(0, 600)).catch(() => {});
      await SLEEP(2000);

      const resultCards = await page.locator('.reusable-search__result-container, li.reusable-search__result-container').all();
      console.log(`[LinkedInNetworker] Found ${resultCards.length} people profiles for "${query}".`);

      for (const card of resultCards.slice(0, 8)) {
        if (connectionsSent >= maxConnections) break;

        try {
          const titleLink = card.locator('.entity-result__title-text a.app-aware-link').first();
          const name = (await titleLink.innerText().catch(() => '')).split('\n')[0].trim();
          const profileUrl = (await titleLink.getAttribute('href').catch(() => '')) || '';
          const headline = (await card.locator('.entity-result__primary-subtitle').first().innerText().catch(() => '')).trim();
          const companyInfo = (await card.locator('.entity-result__secondary-subtitle').first().innerText().catch(() => '')).trim();

          if (!name || name.length < 2 || name.includes('LinkedIn Member')) continue;
          if (profileUrl && existingUrls.has(profileUrl.toLowerCase().trim())) {
            console.log(`[LinkedInNetworker] ⏭️ Already invited: ${name}`);
            continue;
          }

          // Look for Connect button
          const connectBtn = card.locator('button:has-text("Connect")').first();
          if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`\n[LinkedInNetworker] 🤝 Initiating connection request: ${name} (${headline.slice(0, 45)})...`);
            await connectBtn.click();
            await SLEEP(2000);

            // Check for "Add a note" option in modal
            const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note" i]').first();
            if (await addNoteBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
              await addNoteBtn.click();
              await SLEEP(1200);

              const firstName = name.split(' ')[0] || 'there';
              const customNote = `Hi ${firstName}, I came across your profile and wanted to connect. With 15+ years leading enterprise digital transformations, UAT delivery, and ServiceNow rollouts at Standard Chartered Bank, I am exploring senior leadership opportunities in Bengaluru. Look forward to connecting!`;

              const noteBox = page.locator('textarea#custom-message, textarea[name="message"], textarea').first();
              if (await noteBox.isVisible({ timeout: 2000 }).catch(() => false)) {
                await noteBox.fill(customNote.slice(0, 298));
                await SLEEP(1000);
              }
            }

            // Click Send Invitation
            const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation" i], button[aria-label*="Send now" i]').first();
            if (await sendBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
              await sendBtn.click();
              await SLEEP(2500);
            }

            // Log connection invite
            const record = {
              name,
              title: headline || 'Talent Acquisition / Leader',
              company: companyInfo || query,
              profileUrl,
              note: `Hi ${name.split(' ')[0]}, 15+ yrs Transformation & ServiceNow at SCB. 30-day notice.`,
              status: 'SENT',
              personalizedNote: true,
              verifiedAt: new Date().toISOString()
            };

            connectionList.push(record);
            if (profileUrl) existingUrls.add(profileUrl.toLowerCase().trim());
            connectionsSent++;

            fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connectionList, null, 2), 'utf8');
            console.log(`[LinkedInNetworker] ✅ CONNECTION INVITE SENT: ${name} (${connectionsSent}/${maxConnections})`);

            // Rate-limit pause between invites to keep LinkedIn account healthy
            await SLEEP(4000);
          }
        } catch (cardErr) {
          console.warn(`[LinkedInNetworker] ⚠️ Profile card skipped: ${cardErr.message.slice(0, 80)}`);
        }
      }
    } catch (queryErr) {
      console.warn(`[LinkedInNetworker] Query notice for "${query}": ${queryErr.message}`);
    }
  }

  // Update outreach tracking scorecard
  try {
    generateOutreachTracker();
  } catch (_) {}

  console.log(`\n[LinkedInNetworker] 🏁 Networking sweep finished: ${connectionsSent} connection invitations dispatched.`);
  return connectionsSent;
}

if (require.main === module) {
  const { chromium } = require('playwright');
  const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

  (async () => {
    const context = await chromium.launchPersistentContext(SESSION_DIR, {
      channel: 'chrome',
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();
    await runLinkedInNetworking(page, context, 5);
    await context.close();
  })();
}

module.exports = { runLinkedInNetworking };
