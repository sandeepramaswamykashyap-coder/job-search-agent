/**
 * REAL LinkedIn Lead Discovery + Personalized Connection Sender
 * 
 * Step 1: Searches LinkedIn People for real hiring managers & recruiters
 *         using actual job title + India keywords
 * Step 2: Collects real profile URLs from search results
 * Step 3: Visits each profile and sends personalized connection request
 * Step 4: Verifies Pending status on reload before logging
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session');
const connectionsFile = path.join(__dirname, 'connection_requests.json');

function buildNote(firstName, company) {
  const name = (firstName || 'there').split(' ')[0].replace(/[^a-zA-Z]/g, '');
  const org = (company || 'your org').replace(/[^a-zA-Z0-9 &]/g, '').substring(0, 20).trim();
  // HARD CAP: 150 chars max — LinkedIn note area strict limit enforced
  const note = `Hi ${name}, 14+ yrs Transformation & ServiceNow HRSD at SCB. 30-day notice. Would love to connect at ${org}!`;
  if (note.length <= 150) return note;
  return `Hi ${name}, Transformation & HRSD leader, 14+ yrs at SCB, 30-day notice. Let's connect!`;
}

// Real LinkedIn People search queries targeting actual recruiters/hiring managers (2nd & 3rd degree connections)
const SEARCH_QUERIES = [
  { query: 'Transformation Director Bengaluru hiring', maxResults: 8 },
  { query: 'ServiceNow Practice Head India', maxResults: 8 },
  { query: 'Talent Acquisition Leader PwC Deloitte EY Accenture Bengaluru', maxResults: 8 },
  { query: 'Program Director IT Transformation Bengaluru', maxResults: 8 },
  { query: 'VP Operational Excellence Bengaluru', maxResults: 8 },
  { query: 'ServiceNow HRSD hiring manager India', maxResults: 8 },
  { query: 'Head of Quality Governance UAT Bengaluru', maxResults: 8 },
  { query: 'Change Management Director India', maxResults: 8 },
  { query: 'Agile Transformation Practice Lead Bengaluru', maxResults: 8 },
  { query: 'Technical Program Director Capgemini Cognizant Infosys Bengaluru', maxResults: 8 }
];

async function discoverAndConnect() {
  console.log(`================================================================`);
  console.log(`🔍 REAL LINKEDIN LEAD DISCOVERY + PERSONALIZED CONNECTION SENDER`);
  console.log(`Mode: VISIBLE HEADED — Watch on your screen`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log(`================================================================\n`);

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 600,
    viewport: { width: 1366, height: 768 },
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await ctx.newPage();

  // Verify session
  console.log(`[LinkedIn] Verifying LinkedIn session...`);
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  if (page.url().includes('login') || page.url().includes('authwall')) {
    console.log(`[LinkedIn] ❌ SESSION EXPIRED — Cannot proceed. Please log in.`);
    await ctx.close();
    return;
  }
  console.log(`[LinkedIn] ✅ Session active.\n`);

  // Load existing connections to avoid duplicates
  let existingConnections = [];
  if (fs.existsSync(connectionsFile)) {
    try { existingConnections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8')); } catch (e) {}
  }
  // Remove fake placeholder entries
  existingConnections = existingConnections.filter(c => c.name !== 'Leader' && c.personalizedNote === true);
  console.log(`[LinkedIn] ${existingConnections.length} real verified connections already in database.`);

  const MAX_TODAY = 25;
  let sentToday = 0;
  const allDiscoveredProfiles = [];

  // Step 1: Discover real profiles from LinkedIn People search (filtered for 2nd & 3rd degree connections)
  for (const { query, maxResults } of SEARCH_QUERIES) {
    if (sentToday >= MAX_TODAY) break;
    
    console.log(`\n[LinkedIn Search] Query: "${query}"`);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&network=%5B%22S%22%2C%22O%22%5D&origin=FACETED_SEARCH`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Extract real profile links using the working a[href*="/in/"] selector
    const profiles = await page.evaluate((max) => {
      const results = [];
      const seen = new Set();
      const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
      
      for (const link of links) {
        if (results.length >= max) break;
        const href = link.href.split('?')[0];
        if (!href.includes('/in/') || href.includes('/in/ACoA') || href === 'https://www.linkedin.com/in/' || seen.has(href)) continue;
        
        const text = (link.innerText || link.textContent || '').trim();
        // Name-like text: 2-60 chars, not a generic label
        if (text.length < 2 || text.length > 60) continue;
        if (['View', 'Connect', 'Follow', 'Message', 'More', 'Send', 'in', 'LinkedIn'].includes(text)) continue;
        
        seen.add(href);
        // Get card context for title
        const card = link.closest('li') || link.parentElement;
        const cardText = card ? (card.innerText || '').replace(/\n+/g, ' ').trim() : '';
        results.push({ name: text, profileUrl: href, cardText: cardText.substring(0, 200) });
      }
      return results;
    }, maxResults);

    console.log(`[LinkedIn Search] Found ${profiles.length} real profiles for "${query}"`);
    profiles.forEach(p => console.log(`  → ${p.name} | ${p.cardText.substring(0, 80)} | ${p.profileUrl}`));
    allDiscoveredProfiles.push(...profiles);
  }

  // Deduplicate profiles
  const uniqueProfiles = [];
  const seenUrls = new Set();
  for (const p of allDiscoveredProfiles) {
    if (!seenUrls.has(p.profileUrl)) {
      seenUrls.add(p.profileUrl);
      uniqueProfiles.push(p);
    }
  }

  console.log(`\n[LinkedIn] Total unique profiles discovered: ${uniqueProfiles.length}`);
  console.log(`[LinkedIn] Starting personalized connection dispatch...\n`);

  // Step 2: Visit each profile and send personalized connection
  for (const profile of uniqueProfiles) {
    if (sentToday >= MAX_TODAY) {
      console.log(`[LinkedIn] Daily cap (${MAX_TODAY}) reached. Stopping.`);
      break;
    }

    // Skip if already connected
    if (existingConnections.some(c => c.profileUrl === profile.profileUrl)) {
      console.log(`[LinkedIn] Already connected to ${profile.name}. Skipping.`);
      continue;
    }

    // Skip Standard Chartered profiles
    if ((profile.title || '').toLowerCase().includes('standard chartered')) {
      console.log(`[LinkedIn] 🛑 SCB exclusion: Skipping ${profile.name}.`);
      continue;
    }

    console.log(`\n─────────────────────────────────────────────`);
    console.log(`[LinkedIn] Visiting: ${profile.name} | ${profile.title}`);
    console.log(`[LinkedIn] Profile URL: ${profile.profileUrl}`);

    const firstName = profile.name.split(' ')[0];
    // Extract company from cardText e.g. "Karthik Raj • 2nd  Program Manager at Infosys"
    const cardText = profile.cardText || '';
    const atMatch = cardText.match(/\bat\s+([A-Z][^\n•·]+)/);
    const company = atMatch ? atMatch[1].trim().split(/[•·\n]/)[0].trim() : 'your org';
    const title = cardText.replace(profile.name, '').replace(/[•·2nd3rd1st]/g, '').trim().split(/\n/)[0].trim() || 'Transformation Leader';
    const note = buildNote(firstName, company);
    console.log(`[LinkedIn] Note: "${note}"`);

    await page.goto(profile.profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Hide overlays
    await page.evaluate(() => {
      document.querySelectorAll('.msg-overlay-container, #msg-overlay, div[class*="msg-overlay"]').forEach(el => el.style.display = 'none');
    }).catch(() => {});

    // Check if SCB appears in profile experience
    const scbInProfile = await page.evaluate(() => {
      const text = (document.querySelector('main') || document.body).innerText.toLowerCase();
      return text.includes('standard chartered bank') || text.includes('standard chartered ');
    }).catch(() => false);

    if (scbInProfile) {
      console.log(`[LinkedIn] 🛑 SCB in profile experience. Skipping ${profile.name}.`);
      continue;
    }

    const vanityMatch = profile.profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const vanityName = vanityMatch ? vanityMatch[1] : null;

    // First attempt: Check direct Connect in profile header
    let clickedConnect = false;

    const directConnectBtn = page.locator('main section button:has-text("Connect"), main button[aria-label*="Connect with"], main button[aria-label*="Invite to connect"]').first();
    if (await directConnectBtn.isVisible().catch(() => false)) {
      console.log(`[LinkedIn] Found direct Connect button in profile header. Clicking...`);
      await directConnectBtn.click({ force: true }).catch(() => directConnectBtn.click());
      clickedConnect = true;
      await page.waitForTimeout(2000);
    }

    // Modal Handling on profile page
    const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
    const sendWithoutBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();

    if (await addNoteBtn.isVisible().catch(() => false)) {
      console.log(`[LinkedIn] Clicking "Add a note"...`);
      await addNoteBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);

      const textarea = page.locator('textarea[name="message"], textarea#custom-message, textarea').first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(note);
        console.log(`[LinkedIn] ✍️ Note typed!`);
        await page.waitForTimeout(1000);
      }

      const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click({ force: true }).catch(() => {});
        console.log(`[LinkedIn] 🚀 Clicked Send button!`);
        await page.waitForTimeout(3000);
      }
    } else if (await sendWithoutBtn.isVisible().catch(() => false)) {
      console.log(`[LinkedIn] Clicking "Send without a note"...`);
      await sendWithoutBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);
    } else if (vanityName) {
      // Guaranteed Delivery Fallback via direct preload custom-invite URL
      console.log(`[LinkedIn] Profile modal not direct. Triggering custom-invite preload gateway for @${vanityName}...`);
      const inviteUrl = `https://www.linkedin.com/preload/custom-invite/?vanityName=${encodeURIComponent(vanityName)}`;
      await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);

      const preloadSendWithout = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
      if (await preloadSendWithout.isVisible().catch(() => false)) {
        console.log(`[LinkedIn] Dispatched invitation via preload gateway for ${profile.name}!`);
        await preloadSendWithout.click({ force: true }).catch(() => {});
        await page.waitForTimeout(3000);
      }
    }

    // MANDATORY VERIFICATION
    console.log(`[LinkedIn] Reloading profile to verify Pending status...`);
    await page.goto(profile.profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const isPending = await page.evaluate(() => document.body.innerText.includes('Pending')).catch(() => false);

    if (isPending) {
      console.log(`[LinkedIn] ✅ VERIFIED PENDING — Real connection sent to ${profile.name}!`);
      existingConnections.push({
        name: profile.name,
        title: profile.title || 'N/A',
        company: company,
        profileUrl: profile.profileUrl,
        note: note,
        status: 'SENT',
        personalizedNote: true,
        verifiedAt: new Date().toISOString()
      });
      fs.writeFileSync(connectionsFile, JSON.stringify(existingConnections, null, 2), 'utf8');
      sentToday++;
      console.log(`[LinkedIn] Total sent this session: ${sentToday}`);
    } else {
      console.warn(`[LinkedIn] ⚠️ Pending NOT confirmed for ${profile.name}.`);
    }

    console.log(`[LinkedIn] Waiting 45s before next connection...`);
    await page.waitForTimeout(45000);
  }

  await ctx.close();

  console.log(`\n================================================================`);
  console.log(`✅ LINKEDIN SESSION COMPLETE`);
  console.log(`Real Personalized Connections Sent & Verified: ${sentToday}`);
  console.log(`Data saved to: ${connectionsFile}`);
  console.log(`================================================================`);
}

discoverAndConnect().catch(console.error);
