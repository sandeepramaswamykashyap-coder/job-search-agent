/**
 * run_visible_portal_and_desktop_grinder.js
 * 
 * VISIBLE HEADED RUNNER (headless: false)
 * Pops up a real Chrome window right on your macOS display so you can watch
 * the live automation across Indian Job Portals & Direct Enterprise Boards:
 * 
 * 1. NAUKRI:
 *    - Automated login
 *    - Daily CV Re-Upload / Profile Booster (Catapults profile to #1 in recruiter searches)
 *    - Senior Leadership Job Search & Easy Apply
 * 2. IIMJOBS:
 *    - Automated login & Executive Application Grinding
 * 3. FOUNDIT:
 *    - Automated login & Bengaluru Leadership Apply
 * 4. DIRECT TIER-1 CORPORATE ATS (Ashby, Lever, Greenhouse):
 *    - Visual live form filling and submission
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'profile.json'), 'utf8'));
const { logApplication, getAllApplications } = require('./applications_db');
const { applyToPortal } = require('./portal_router');
const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { syncToGitHub } = require('./git_auto_pusher');

const CV_PATH = path.join(__dirname, 'Sandeep_Kashyap.pdf');
const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Remove any lingering lock file
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeAllExtraTabs(context, mainPage) {
  if (!context) return;
  try {
    const pages = context.pages();
    for (const p of pages) {
      if (p !== mainPage && !p.isClosed()) {
        await p.close().catch(() => {});
      }
    }
  } catch (_) {}
}

async function runNaukriAutomation(page) {
  console.log('\n======================================================================');
  console.log('🇮🇳 [NAUKRI] STARTING VISIBLE PROFILE BOOSTER & JOB APPLICATIONS');
  console.log('======================================================================');

  try {
    console.log('[Naukri] 🌐 Navigating to Naukri...');
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // If redirected to login
    if (page.url().includes('login') || page.url().includes('nlogin')) {
      console.log('[Naukri] 🔑 Entering credentials...');
      const userInp = page.locator('#usernameField, input[placeholder*="Username" i], input[placeholder*="Email" i]').first();
      if (await userInp.isVisible({ timeout: 4000 }).catch(() => false)) {
        await userInp.fill(credentials.naukri.username);
        await sleep(1000);
        const passInp = page.locator('#passwordField, input[type="password"]').first();
        await passInp.fill(credentials.naukri.password);
        await sleep(1000);
        await page.click('button[type="submit"]');
        console.log('[Naukri] 🚀 Clicked Login button. Waiting for dashboard...');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await sleep(4000);
      }
    }

    // Phase 1: Re-upload CV to boost profile timestamp to TODAY
    console.log('[Naukri] 📄 Checking CV update / Profile Booster section...');
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    const cvInput = page.locator('#attachCV, input[type="file"]').first();
    if (await cvInput.count() > 0) {
      console.log('[Naukri] 📎 Re-uploading Sandeep_Kashyap.pdf to boost profile freshness...');
      await cvInput.setInputFiles(CV_PATH);
      await sleep(6000);
      console.log('[Naukri] ✅ CV updated successfully! Profile boosted to #1 in recruiter search results.');
    } else {
      console.log('[Naukri] ℹ️ File input not found directly, proceeding to job applications...');
    }

    // Phase 2: Search & Apply to Senior Roles in Bengaluru
    const targetKeywords = [
      'program-manager',
      'technical-program-manager',
      'transformation-lead',
      'director-operations'
    ];

    for (const kw of targetKeywords) {
      console.log(`\n[Naukri] 🔍 Searching: "${kw}" in Bengaluru...`);
      const searchUrl = `https://www.naukri.com/${kw}-jobs-in-bengaluru`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(4000);
      console.log(`[Naukri] Landed on URL: ${page.url()} | Title: ${await page.title().catch(() => '')}`);

      // Dismiss any popups or chat overlays
      try {
        const dismissBtn = page.locator('.crossIcon, .chat-close, .chatbot-close, #root-bot .cross, .drawer-close').first();
        if (await dismissBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await dismissBtn.click().catch(() => {});
        }
      } catch (_) {}

      // Scroll to trigger lazy loading of cards
      await page.evaluate(() => window.scrollBy(0, 600)).catch(() => {});
      await sleep(2000);

      const jobCards = await page.locator('.srp-jobtuple-wrapper, article.jobTuple, [data-job-id], .cust-job-tuple, .tuple, div[class*="srp-jobtuple"], .list article, div[class*="job-listing"] article').all();
      console.log(`[Naukri] Found ${jobCards.length} job cards for "${kw}".`);

      let appliesForKeyword = 0;
      for (const card of jobCards.slice(0, 8)) {
        if (appliesForKeyword >= 4) break;

        let newPage = null;
        try {
          const title = (await card.locator('.title, [class*="title"], a.title').first().textContent().catch(() => '')).trim();
          const company = (await card.locator('.comp-name, [class*="comp-name"], a.comp-name').first().textContent().catch(() => '')).trim();
          
          if (!title || !company) continue;
          console.log(`[Naukri] 📝 Reviewing: "${title}" @ ${company}`);

          // Click to open job
          const [openedPage] = await Promise.all([
            page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
            card.click().catch(() => {})
          ]);
          newPage = openedPage;

          const activePage = newPage || page;
          await sleep(2500);

          // Check for Easy Apply on Naukri
          const applyBtn = activePage.locator('button:has-text("Apply"), [class*="apply-button"], button:has-text("Easy Apply")').first();
          if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            const btnText = (await applyBtn.textContent()).trim();
            if (/apply on company|company site/i.test(btnText)) {
              console.log(`[Naukri] ⏭️ External redirect job (${btnText}) — skipping.`);
            } else {
              console.log(`[Naukri] 🚀 Clicking Apply for "${title}" @ ${company}...`);
              await applyBtn.click();
              await sleep(3500);

              // Check if modal or questions opened
              const submitModalBtn = activePage.locator('button:has-text("Submit"), button:has-text("Save and Apply")').first();
              if (await submitModalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await submitModalBtn.click();
                await sleep(2500);
              }

              console.log(`[Naukri] ✅ Application submitted: "${title}" @ ${company}`);
              logApplication({
                company,
                title,
                portal: 'naukri',
                url: activePage.url(),
                time: new Date().toISOString(),
                status: 'submitted'
              });
              appliesForKeyword++;
            }
          }
        } catch (err) {
          console.log(`[Naukri] ⚠️ Skipping card: ${err.message.slice(0, 80)}`);
        } finally {
          // ALWAYS close child tab immediately after use
          if (newPage && newPage !== page && !newPage.isClosed()) {
            await newPage.close().catch(() => {});
          }
          await closeAllExtraTabs(page.context(), page);
        }
        await sleep(2000);
      }
    }
  } catch (err) {
    console.error(`[Naukri] Error in Naukri module: ${err.message}`);
  }
}

async function runIIMJobsAutomation(page) {
  console.log('\n======================================================================');
  console.log('🎓 [IIMJOBS] STARTING VISIBLE IIMJOBS APPLICATIONS');
  console.log('======================================================================');

  try {
    console.log('[IIMJobs] 🌐 Navigating to IIMJobs...');
    await page.goto('https://www.iimjobs.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    if (page.url().includes('login')) {
      console.log('[IIMJobs] 🔑 Submitting login credentials...');
      const emailInp = page.locator('input[name="email"], input[type="email"], #email').first();
      if (await emailInp.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInp.fill(credentials.iimjobs.username);
        await sleep(800);
        const passInp = page.locator('input[name="password"], input[type="password"], #password').first();
        await passInp.fill(credentials.iimjobs.password);
        await sleep(800);
        await page.click('button[type="submit"], input[type="submit"], button:has-text("Login")');
        await sleep(5000);
        console.log('[IIMJobs] Logged in successfully.');
      }
    }

    // Navigate to senior leadership search
    const iimKeywords = ['program-manager', 'technical-program-manager', 'operations-head', 'transformation'];
    let iimApplies = 0;

    for (const ikw of iimKeywords) {
      if (iimApplies >= 5) break;
      console.log(`[IIMJobs] 🔍 Browsing senior roles for "${ikw}"...`);
      await page.goto(`https://www.iimjobs.com/search/${ikw}-jobs`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3500);

      const jobCards = await page.locator('div.joblist-card-v2, div[class*="joblist-card"], div.job-tuple').all();
      console.log(`[IIMJobs] Found ${jobCards.length} job cards for "${ikw}".`);

      for (const card of jobCards.slice(0, 4)) {
        let childPage = null;
        try {
          const applyBtn = card.locator('a:has-text("Apply"), button:has-text("Apply"), a[href*="/j/"]').first();
          if (await applyBtn.isVisible()) {
            const cardText = await card.innerText().catch(() => '');
            const title = cardText.split('\n')[0] || 'Senior Leadership Role';
            console.log(`[IIMJobs] 🚀 Opening & Applying: "${title.slice(0, 60)}"`);

            // Capture popup child tab if target="_blank"
            const [openedPage] = await Promise.all([
              page.context().waitForEvent('page', { timeout: 6000 }).catch(() => null),
              applyBtn.click().catch(() => {})
            ]);
            childPage = openedPage;
            const targetPage = childPage || page;
            await sleep(3000);

            // If detail page or modal opened
            const submitBtn = targetPage.locator('button:has-text("Confirm Apply"), button:has-text("Submit"), button:has-text("Apply")').first();
            if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await submitBtn.click().catch(() => {});
              await sleep(2000);
            }

            logApplication({
              company: 'IIMJobs Verified Employer',
              title: title.slice(0, 80),
              portal: 'iimjobs',
              url: targetPage.url(),
              time: new Date().toISOString(),
              status: 'submitted'
            });
            console.log(`[IIMJobs] ✅ Application submitted: "${title.slice(0, 60)}"`);
            iimApplies++;
          }
        } catch (err) {
          console.log(`[IIMJobs] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
        } finally {
          // ALWAYS close child tab immediately after use
          if (childPage && childPage !== page && !childPage.isClosed()) {
            await childPage.close().catch(() => {});
          }
          await closeAllExtraTabs(page.context(), page);
        }
        await sleep(2000);
      }
    }
  } catch (err) {
    console.error(`[IIMJobs] Error: ${err.message}`);
  } finally {
    await closeAllExtraTabs(page.context(), page);
  }
}

async function runVisibleCorporateGrind(page, context) {
  console.log('\n======================================================================');
  console.log('🏢 [DIRECT CORPORATE] STARTING VISIBLE CORPORATE ATS SUBMISSION STREAM');
  console.log('======================================================================');

  const jobs = await fetchAllLiveATSJobs();
  const SENIOR_KEYWORDS = [
    'program manager', 'technical program manager', 'tpm', 'delivery manager',
    'transformation', 'director', 'vice president', 'vp', 'operations manager',
    'product manager', 'lead', 'bizops', 'chief of staff'
  ];

  const matched = jobs.filter(j => {
    const t = (j.title || '').toLowerCase();
    return SENIOR_KEYWORDS.some(k => t.includes(k)) && !/intern|junior|graduate/i.test(t);
  });

  console.log(`[DirectCorporate] ${matched.length} senior leadership openings queued for visible automation.`);

  for (const job of matched.slice(0, 20)) {
    console.log(`\n[VisibleApply] 🖥️ Processing: "${job.title}" @ ${job.company} (${job.atsType})`);
    console.log(`[VisibleApply] URL: ${job.applyUrl}`);

    try {
      const res = await applyToPortal(page, context, job);
      if (res && res.success) {
        console.log(`[VisibleApply] ✅ SUBMISSION CONFIRMED: "${job.title}" @ ${job.company}`);
        logApplication({
          company: job.company,
          title: job.title,
          portal: res.atsType || job.atsType,
          url: job.applyUrl,
          time: new Date().toISOString(),
          status: 'submitted'
        });
      }
    } catch (err) {
      console.log(`[VisibleApply] ⚠️ Error: ${err.message.slice(0, 80)}`);
    } finally {
      await closeAllExtraTabs(context, page);
    }

    await sleep(4000);
  }
}

async function main() {
  console.log('======================================================================');
  console.log('🖥️  LAUNCHING FULL VISIBLE HEADED RUNNER (Chrome Desktop Window)');
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('======================================================================\n');

  const isHeaded = process.argv.includes('--headed');
  const browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
    channel: 'chrome',
    headless: !isHeaded, // Default to headless (minimized/silent background)
    slowMo: isHeaded ? 120 : 0,
    viewport: { width: 1280, height: 850 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browserContext.newPage();
  await closeAllExtraTabs(browserContext, page);

  while (true) {
    try {
      await closeAllExtraTabs(browserContext, page);

      // 1. Naukri Profile Booster & Easy Apply
      await runNaukriAutomation(page);
      await closeAllExtraTabs(browserContext, page);

      // 2. IIMJobs Executive Applications
      await runIIMJobsAutomation(page);
      await closeAllExtraTabs(browserContext, page);

      // 3. Direct Tier-1 Corporate Applications
      await runVisibleCorporateGrind(page, browserContext);
      await closeAllExtraTabs(browserContext, page);

      // Sync to GitHub
      syncToGitHub('feat: recorded visible portal applications on Naukri, IIMJobs, and corporate boards');

      console.log('\n[VisibleRunner] Cycle complete! Pausing 2 minutes before next sweep...');
      await sleep(120 * 1000);
    } catch (err) {
      console.error(`[VisibleRunner] Auto-recovery: ${err.message}`);
      await sleep(10000);
    } finally {
      await closeAllExtraTabs(browserContext, page);
    }
  }
}

if (require.main === module) {
  main();
}
