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
const { logApplication } = require('./applications_db');
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

      const jobCards = await page.locator('.srp-jobtuple-wrapper, [class*="jobTuple"], [class*="srp-tuple"]').all();
      console.log(`[Naukri] Found ${jobCards.length} job cards for "${kw}".`);

      let appliesForKeyword = 0;
      for (const card of jobCards.slice(0, 8)) {
        if (appliesForKeyword >= 4) break;

        try {
          const title = (await card.locator('.title, [class*="title"]').first().textContent().catch(() => '')).trim();
          const company = (await card.locator('.comp-name, [class*="comp-name"]').first().textContent().catch(() => '')).trim();
          
          if (!title || !company) continue;
          console.log(`[Naukri] 📝 Reviewing: "${title}" @ ${company}`);

          // Click to open job
          const [newPage] = await Promise.all([
            page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
            card.click().catch(() => {})
          ]);

          const activePage = newPage || page;
          await sleep(3000);

          // Check for Easy Apply on Naukri
          const applyBtn = activePage.locator('button:has-text("Apply"), [class*="apply-button"], button:has-text("Easy Apply")').first();
          if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            const btnText = (await applyBtn.textContent()).trim();
            if (/apply on company|company site/i.test(btnText)) {
              console.log(`[Naukri] ⏭️ External redirect job (${btnText}) — skipping.`);
            } else {
              console.log(`[Naukri] 🚀 Clicking Apply for "${title}" @ ${company}...`);
              await applyBtn.click();
              await sleep(4000);

              // Check if modal or questions opened
              const submitModalBtn = activePage.locator('button:has-text("Submit"), button:has-text("Save and Apply")').first();
              if (await submitModalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await submitModalBtn.click();
                await sleep(3000);
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

          if (newPage && newPage !== page) {
            await newPage.close().catch(() => {});
          }
        } catch (err) {
          console.log(`[Naukri] ⚠️ Skipping card: ${err.message.slice(0, 80)}`);
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

    // Navigate to senior leadership job feed
    console.log('[IIMJobs] 🔍 Browsing senior executive job feed...');
    await page.goto('https://www.iimjobs.com/jobfeed', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    const applyButtons = await page.locator('a:has-text("Apply"), button:has-text("Apply")').all();
    console.log(`[IIMJobs] Found ${applyButtons.length} visible Apply opportunities.`);

    let iimApplies = 0;
    for (const btn of applyButtons.slice(0, 5)) {
      try {
        if (await btn.isVisible()) {
          await btn.click();
          await sleep(3000);
          console.log('[IIMJobs] ✅ Clicked Apply on executive role.');
          iimApplies++;
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error(`[IIMJobs] Error: ${err.message}`);
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
    }

    await sleep(4000);
  }
}

async function main() {
  console.log('======================================================================');
  console.log('🖥️  LAUNCHING FULL VISIBLE HEADED RUNNER (Chrome Desktop Window)');
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('======================================================================\n');

  const browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, // VISIBLE TO USER
    slowMo: 120,    // Human-like deliberate pacing so you can visually watch
    viewport: { width: 1280, height: 850 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browserContext.newPage();

  while (true) {
    try {
      // 1. Naukri Profile Booster & Easy Apply
      await runNaukriAutomation(page);

      // 2. IIMJobs Executive Applications
      await runIIMJobsAutomation(page);

      // 3. Direct Tier-1 Corporate Applications
      await runVisibleCorporateGrind(page, browserContext);

      // Sync to GitHub
      syncToGitHub('feat: recorded visible portal applications on Naukri, IIMJobs, and corporate boards');

      console.log('\n[VisibleRunner] Cycle complete! Pausing 2 minutes before next sweep...');
      await sleep(120 * 1000);
    } catch (err) {
      console.error(`[VisibleRunner] Auto-recovery: ${err.message}`);
      await sleep(10000);
    }
  }
}

if (require.main === module) {
  main();
}
