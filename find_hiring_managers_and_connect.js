const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session');
const connectionsFile = path.join(__dirname, 'connection_requests.json');

const HIRING_INTENT_KEYWORDS = [
  'hiring', '#hiring', 'we are hiring', 'hiring for', 'looking for',
  'talent acquisition', 'recruiter', 'headhunter', 'talent partner',
  'people & culture', 'hiring manager', 'building team', 'join my team'
];

function hasHiringIntent(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  return HIRING_INTENT_KEYWORDS.some(k => t.includes(k));
}

function buildCustomizedNote(name, company, title) {
  const firstName = (name || 'Leader').split(' ')[0];
  let note = `Hi ${firstName}, I noticed your active hiring initiatives for ${title || 'leadership roles'} at ${company || 'your team'}. I bring 15+ yrs leading Program Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect & explore synergy!`;
  if (note.length > 295) {
    note = `Hi ${firstName}, saw your hiring post for ${company || 'your team'}. I bring 15+ yrs leading Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect!`;
  }
  return note;
}

async function findAndConnectHiringManagers(maxConnections = 5) {
  console.log(`\n=================== ACTIVE HIRING INTENT CONNECTION DISPATCH ===================`);
  console.log(`Targeting 2nd-degree profiles with ACTIVE HIRING INTENT in Bangalore / India...`);

  let existingConnections = [];
  if (fs.existsSync(connectionsFile)) {
    try { existingConnections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8')); } catch (e) {}
  }

  const todayStr = new Date().toDateString();
  const sentToday = existingConnections.filter(c => c.verifiedAt && new Date(c.verifiedAt).toDateString() === todayStr).length;

  if (sentToday >= 20) {
    console.log(`🛑 Daily LinkedIn connection limit (20) reached for today. Skipping.`);
    return { dispatched: 0, reason: 'Daily Cap Reached' };
  }

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const targetQueries = [
    // Role-specific hiring intent
    'hiring "Program Manager"',
    'hiring "Transformation Lead"',
    'hiring "ServiceNow Manager"',
    'hiring "Data Governance"',
    'hiring "PMO Manager"',
    'hiring "Delivery Manager"',
    'hiring "IT Program Manager"',
    'hiring "Operations Manager"',
    'hiring "Change Manager"',
    'hiring "Project Manager" ServiceNow',
    'hiring "HRSD" ServiceNow',
    'hiring "Business Analyst" transformation',
    'hiring "Scrum Master"',
    'hiring "Agile Coach"',
    'hiring "Product Manager" enterprise',
    // Function-based hiring intent
    '"looking to hire" "program manager"',
    '"we are hiring" transformation',
    '"join our team" ServiceNow',
    '"actively hiring" PMO',
    '"open to connect" recruiter "program manager"',
    // Recruiter/TA targeting
    'recruiter "ServiceNow" hiring Bangalore',
    'talent acquisition "program manager" Bangalore',
    '"talent partner" "digital transformation"',
    'HR recruiter "IT transformation" India',
    '"people and culture" hiring manager technology',
    // Industry + role combinations
    'hiring "banking operations" manager',
    'hiring "investment banking" program',
    'hiring "digital transformation" lead India',
    'hiring "ERP" program manager',
    'hiring "cloud transformation" manager',
    'hiring "ITSM" ServiceNow',
    '"hiring manager" "program manager" fintech',
    '"hiring manager" "operations" BFSI Bangalore',
  ];
  const locations = ["Bangalore", "India", "Remote", "Mumbai", "Hyderabad", "Pune"];
  const selectedQuery = targetQueries[Math.floor(Math.random() * targetQueries.length)] + " " + locations[Math.floor(Math.random()*locations.length)];
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(selectedQuery)}`;
  console.log(`Navigating to Hiring Intent People Search: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  // Wait longer for LinkedIn's JS-rendered search results to fully load
  await page.waitForTimeout(8000);

  // ── Session health check: detect LinkedIn security challenge redirect ──────
  const currentPageUrl = page.url();
  if (currentPageUrl.includes('/checkpoint/') || currentPageUrl.includes('/uas/login') || currentPageUrl.includes('/authwall')) {
    const pageTitle = await page.title().catch(() => '');
    console.log(`🔒 LinkedIn session issue detected. URL: ${currentPageUrl} | Title: ${pageTitle}`);
    console.log('⏸️  Skipping this run — LinkedIn account restricted or session expired.');
    await ctx.close();
    return { dispatched: 0, reason: 'Session Restricted' };
  }

  // Try scrolling to trigger lazy-loaded cards
  await page.evaluate(() => window.scrollTo(0, 600)).catch(() => {});
  await page.waitForTimeout(3000);

  // Check again after scroll (LinkedIn may redirect lazily)
  const postScrollUrl = page.url();
  if (postScrollUrl.includes('/checkpoint/') || postScrollUrl.includes('/uas/login')) {
    console.log('🔒 LinkedIn redirected after scroll. Session still restricted.');
    await ctx.close();
    return { dispatched: 0, reason: 'Session Restricted Post-Scroll' };
  }

  const candidateUrls = await page.evaluate(() => {
    // Broader selectors: grab all hrefs including data-href, full URLs, relative URLs
    const allLinks = [];
    // Method 1: standard anchor tags
    document.querySelectorAll('a[href*="/in/"]').forEach(a => {
      allLinks.push(a.href || a.getAttribute('href'));
    });
    // Method 2: data-href attributes (LinkedIn sometimes uses these)
    document.querySelectorAll('[data-href*="/in/"]').forEach(el => {
      allLinks.push(el.getAttribute('data-href'));
    });
    // Method 3: entity URN links in search result cards
    document.querySelectorAll('.entity-result__title-text a, .reusable-search__result-container a').forEach(a => {
      if (a.href && a.href.includes('/in/')) allLinks.push(a.href);
    });
    return Array.from(new Set(allLinks.filter(Boolean)))
      .map(u => {
        try { return new URL(u).pathname.split('?')[0]; } catch(e) { return u.split('?')[0]; }
      })
      .filter(u => u.includes('/in/') && !u.endsWith('/in/') && u.split('/in/')[1]?.length > 1);
  }).catch(err => {
    console.log(`[Evaluate Error] ${err.message} — LinkedIn likely navigated away mid-evaluate.`);
    return [];
  });

  console.log(`Found ${candidateUrls.length} candidate profile URLs.`);

  let dispatchedCount = 0;
  // Build a set of all profile URLs already contacted (ever) for strict dedup
  const alreadyContacted = new Set(existingConnections.map(c => c.profileUrl.replace(/\/+$/, '').toLowerCase()));

  for (const rawUrl of candidateUrls) {
    if (dispatchedCount >= maxConnections) break;

    const profileUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.linkedin.com${rawUrl}`;
    const profileUrlNorm = profileUrl.replace(/\/+$/, '').toLowerCase();

    // Skip if already contacted (dedup)
    if (alreadyContacted.has(profileUrlNorm)) {
      console.log(`[Skip] Already sent connection to ${profileUrl}. Skipping duplicate.`);
      continue;
    }

    console.log(`\nEvaluating candidate profile: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    // Wait for profile name h1 to render (LinkedIn is JS-heavy)
    await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const profileText = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerText.toLowerCase();
    });

    if (profileText.includes('standard chartered')) {
      console.log('🛑 EXCLUDED: Candidate profile belongs to Standard Chartered. Skipping.');
      continue;
    }

    if (!hasHiringIntent(profileText)) {
      console.log(`[Skip] No explicit hiring intent detected on profile: ${profileUrl}`);
      continue;
    }

    const leadInfo = await page.evaluate(() => {
      // Try multiple selectors to get the real name
      const h1 = document.querySelector('h1.text-heading-xlarge, h1[class*="heading"], main h1');
      const name = (h1 && h1.innerText.trim()) ? h1.innerText.trim() : '';
      const headlineEl = document.querySelector('.text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium');
      const headline = headlineEl ? headlineEl.innerText.trim() : '';
      return { name, headline };
    });

    const displayName = leadInfo.name || profileUrl.split('/in/')[1]?.replace(/\//g,'') || 'Unknown';
    console.log(`✅ Candidate Verified: ${displayName} | Headline: ${leadInfo.headline}`);

    // Mark as contacted before clicking (prevents double-send on retry)
    alreadyContacted.add(profileUrlNorm);
    // ── Dismiss any LinkedIn Premium upsell popup/banner first ──────────────
    try {
      // Try pressing Escape to close any modal overlay
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      // Also try clicking the explicit close/dismiss button on the premium banner
      const premiumClose = page.locator([
        'button[aria-label="Dismiss"]',
        'button[aria-label="Close"]',
        'button.artdeco-modal__dismiss',
        'button:has-text("No thanks")',
        'button:has-text("Dismiss")',
        '[data-test-modal-close-btn]'
      ].join(', ')).first();
      if (await premiumClose.isVisible({ timeout: 2000 }).catch(() => false)) {
        await premiumClose.click();
        await page.waitForTimeout(800);
      }
    } catch (_) {}

    // Click Connect button (direct hero or via More menu)
    let clicked = false;
    const heroConnect = page.locator('main button[aria-label*="Invite"], main button.artdeco-button--primary:has-text("Connect")').first();
    if (await heroConnect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await heroConnect.click();
      clicked = true;
    } else {
      const heroMore = page.locator('main button:has-text("More"), main button[aria-label*="More actions"]').first();
      if (await heroMore.isVisible({ timeout: 3000 }).catch(() => false)) {
        await heroMore.click();
        await page.waitForTimeout(1500);
        const dropdownConnect = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
        if (await dropdownConnect.isVisible({ timeout: 3000 }).catch(() => false)) {
          try {
            await dropdownConnect.click({ force: true });
            clicked = true;
          } catch (e) {
            console.log(`[Connect] Dropdown click blocked, trying JS click...`);
            await dropdownConnect.evaluate(el => el.click()).catch(() => {});
            clicked = true;
          }
        }
      }
    }


    if (clicked) {
      await page.waitForTimeout(2500);

      // Handle "How do you know [Name]?" modal if present
      const knowOther = page.locator('button:has-text("Other"), label:has-text("Other"), [aria-label*="Other"]').first();
      if (await knowOther.isVisible({ timeout: 2000 }).catch(() => false)) {
        await knowOther.click().catch(() => {});
        await page.waitForTimeout(1000);
        const connectModalNext = page.locator('button:has-text("Connect"), button[aria-label*="Connect"]').first();
        if (await connectModalNext.isVisible({ timeout: 2000 }).catch(() => false)) {
          await connectModalNext.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // Check for "Send without a note" / "Send now" / "Send" modal buttons
      let sendSuccess = false;

      // Option A: Click "Send without a note" or "Send now"
      const sendWithoutNoteBtn = page.locator([
        'button:has-text("Send without a note")',
        'button[aria-label*="Send without a note"]',
        'button:has-text("Send now")',
        'button[aria-label*="Send now"]'
      ].join(', ')).first();

      if (await sendWithoutNoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[Connect] Clicking "Send without a note" for ${leadInfo.name}...`);
        await sendWithoutNoteBtn.click().catch(() => {});
        await page.waitForTimeout(2500);
        sendSuccess = true;
      } else {
        // Option B: Try "Add a note" -> fill note -> click "Send"
        const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
        if (await addNoteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[Connect] "Add a note" button visible, sending customized note for ${leadInfo.name}...`);
          await addNoteBtn.click().catch(() => {});
          await page.waitForTimeout(1500);

          const noteText = buildCustomizedNote(leadInfo.name, 'your organization', 'Transformation Leadership');
          await page.fill('textarea[name="message"]', noteText).catch(() => {});
          await page.waitForTimeout(1000);

          const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"]').first();
          if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            try {
              await sendBtn.click({ timeout: 5000 });
            } catch (e) {
              console.log(`[Connect] Send button blocked, attempting force click...`);
              await sendBtn.click({ force: true }).catch(() => {});
            }
            await page.waitForTimeout(2500);
            sendSuccess = true;
          }
        } else {
          // Option C: Check if a direct "Send" button is visible in the modal
          const directSendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"]').first();
          if (await directSendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`[Connect] Direct "Send" button visible, clicking for ${leadInfo.name}...`);
            await directSendBtn.click().catch(() => {});
            await page.waitForTimeout(2500);
            sendSuccess = true;
          }
        }
      }

      if (sendSuccess) {
        console.log(`🎉 INVITATION DISPATCHED LIVE TO ${leadInfo.name}!`);
        dispatchedCount++;

        existingConnections.push({
          name: leadInfo.name,
          profileUrl,
          headline: leadInfo.headline,
          status: 'SENT',
          verifiedAt: new Date().toISOString()
        });
        fs.writeFileSync(connectionsFile, JSON.stringify(existingConnections, null, 2), 'utf8');
      } else {
        console.log(`⚠️ [Skip] Clicked Connect for ${leadInfo.name}, but could not confirm send in modal. Invitation not recorded.`);
      }
    }
  }

  await ctx.close();
  console.log(`\n=================== DISPATCH COMPLETE: ${dispatchedCount} Connections Sent ===================`);
  return { dispatched: dispatchedCount };
}

if (require.main === module) {
  findAndConnectHiringManagers(3);
}

module.exports = { findAndConnectHiringManagers };
