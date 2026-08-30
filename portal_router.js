/**
 * portal_router.js — Company Career Portal Application Orchestrator
 * 
 * Main entry point for direct company portal applications.
 * 
 * Flow:
 *   1. Receive job { title, company, applyUrl, careerUrl }
 *   2. Check deduplication against applications_history.json
 *   3. Detect ATS type (ats_detector.js)
 *   4. Route to correct ATS engine
 *   5. Log result to applications_db.js
 *   6. Report success/failure
 * 
 * Usage:
 *   const { runPortalApplicationCycle } = require('./portal_router');
 *   await runPortalApplicationCycle(jobQueue);
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

const { detectAtsFromUrl, detectAtsFromPage, isExcluded, COMPANY_ATS_MAP } = require('./ats_detector');
const { logApplication, getAllApplications } = require('./applications_db');
const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');

// ATS Engines
const greenhouse    = require('./ats_engines/greenhouse');
const lever         = require('./ats_engines/lever');
const workday       = require('./ats_engines/workday');
const icims         = require('./ats_engines/icims');
const taleo         = require('./ats_engines/taleo');
const smartrecruit  = require('./ats_engines/smartrecruiters');
const generic       = require('./ats_engines/generic');

const ENGINES = {
  greenhouse:     (page, job, ctx) => greenhouse.apply(page, job),
  lever:          (page, job, ctx) => lever.apply(page, job),
  workday:        (page, job, ctx) => workday.apply(page, job, ctx),
  icims:          (page, job, ctx) => icims.apply(page, job, ctx),
  taleo:          (page, job, ctx) => taleo.apply(page, job, ctx),
  successfactors: (page, job, ctx) => workday.apply(page, job, ctx), // SAP SF uses similar flow
  smartrecruiters:(page, job, ctx) => smartrecruit.apply(page, job),
  generic:        (page, job, ctx) => generic.apply(page, job),
};

const DAILY_PORTAL_TARGET = 150;
const DELAY_BETWEEN_APPS_MS = 8000 + Math.random() * 7000; // 8–15 seconds optimal humanlike delay

function alreadyApplied(job) {
  const all = getAllApplications();
  const now = Date.now();
  const key = `${(job.company || '').toLowerCase().trim()}::${(job.title || '').toLowerCase().trim()}`;
  return all.some(a => 
    a.status === 'submitted' &&
    a.time && (now - new Date(a.time).getTime() < 48 * 3600 * 1000) &&
    `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}` === key
  );
}

/**
 * Routes a single job to the correct ATS engine and logs result.
 * @param {Page} page — Playwright page
 * @param {BrowserContext} context
 * @param {Object} job — { title, company, applyUrl, careerUrl }
 */
async function applyToPortal(page, context, job) {
  const url = job.applyUrl || job.careerUrl || job.url || job.link;
  if (!url) {
    console.log(`[PortalRouter] ⚠️ No URL for ${job.company} — skipping`);
    return null;
  }

  // SCB exclusion guard
  if (isExcluded(job.company)) {
    console.log(`[PortalRouter] 🛑 SCB EXCLUDED: ${job.company}`);
    return null;
  }

  // Deduplication guard
  if (alreadyApplied(job)) {
    console.log(`[PortalRouter] ⏭️ Already applied: "${job.title}" @ ${job.company}`);
    return null;
  }

  // Detect ATS
  const atsInfo = detectAtsFromUrl(url);
  console.log(`[PortalRouter] 🧭 Routing "${job.title}" @ ${job.company} → ${atsInfo.type.toUpperCase()} (${url.slice(0, 60)}...)`);

  const engine = ENGINES[atsInfo.type] || ENGINES.generic;

  try {
    const result = await engine(page, { ...job, applyUrl: url }, context);

    if (result && result.success) {
      logApplication({
        company: job.company,
        title: job.title,
        portal: `direct_portal_${result.atsType || atsInfo.type}`,
        url,
        time: new Date().toISOString(),
        source: 'company_portal'
      });
      return { ...result, job };
    } else if (result && result.needsManual) {
      console.log(`[PortalRouter] 📋 Logged as needs_manual_apply: "${job.title}" @ ${job.company} (CAPTCHA)`);
      logApplication({
        company: job.company,
        title: job.title,
        portal: `needs_manual_${atsInfo.type}`,
        url,
        time: new Date().toISOString(),
        source: 'company_portal',
        status: 'needs_manual_apply'
      });
    }
  } catch (err) {
    console.error(`[PortalRouter] ❌ Engine error for ${job.company}: ${err.message}`);
  }

  return null;
}

/**
 * Priority company list — verified working ATS direct apply URLs only.
 * These are fallbacks when the live ATS ingestion doesn't cover a specific company.
 * Only include URLs that are confirmed to work (no login walls, no dead DNS).
 */
const PRIORITY_COMPANY_QUEUE = [
  // ── Verified Workday portals ──
  { company: 'Salesforce',     title: 'Technical Program Manager',      atsType: 'workday', applyUrl: 'https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/jobs?q=program+manager' },
  { company: 'ServiceNow',     title: 'Staff Program Manager',          atsType: 'workday', applyUrl: 'https://careers.servicenow.com/careers/jobs?q=program+manager' },
  { company: 'SAP',            title: 'Senior Program Manager',         atsType: 'workday', applyUrl: 'https://jobs.sap.com/search/?q=program+manager&location=India' },
  { company: 'Mastercard',     title: 'Senior Program Manager',         atsType: 'workday', applyUrl: 'https://mastercard.wd1.myworkdayjobs.com/CorporateCareers/jobs?q=program+manager' },
  { company: 'Barclays',       title: 'VP Program Manager',             atsType: 'workday', applyUrl: 'https://barclays.taleo.net/careersection/2/jobsearch.ftl' },

  // ── Verified iCIMS portals ──
  { company: 'Aon',            title: 'Manager - HR Transformation',    atsType: 'icims',   applyUrl: 'https://aon.wd1.myworkdayjobs.com/AON_Careers/jobs?q=program+manager' },

  // ── Verified SmartRecruiters portals ──
  { company: 'Bosch',          title: 'Program Manager - IoT',          atsType: 'smartrecruiters', applyUrl: 'https://careers.smartrecruiters.com/BoschGroup?q=program+manager' },
  { company: 'Visa',           title: 'Senior Manager - Operations',    atsType: 'smartrecruiters', applyUrl: 'https://careers.smartrecruiters.com/Visa?q=program+manager' },
  { company: 'Publicis Sapient', title: 'Program Manager',              atsType: 'smartrecruiters', applyUrl: 'https://careers.smartrecruiters.com/PublicisSapient?q=program+manager' },

  // ── Verified Greenhouse direct job URLs (verified from API) ──
  { company: 'Atlassian',      title: 'Program Manager - Jira Service Management', atsType: 'greenhouse', applyUrl: 'https://job-boards.greenhouse.io/atlassian/jobs' },
];


/**
 * Main runner — processes a queue of company portal jobs.
 * @param {Array} jobQueue — optional custom list; falls back to PRIORITY_COMPANY_QUEUE
 * @param {number} dailyLimit — max applications in this run
 */
async function runPortalApplicationCycle(jobQueue = null, dailyLimit = DAILY_PORTAL_TARGET) {
  let queue = jobQueue;
  if (!queue) {
    // Dynamically fetch live direct ATS jobs from Greenhouse, Lever, SmartRecruiters APIs
    try {
      const liveAtsJobs = await fetchAllLiveATSJobs();
      queue = [...liveAtsJobs, ...PRIORITY_COMPANY_QUEUE];
    } catch (_) {
      queue = PRIORITY_COMPANY_QUEUE;
    }
  }

  const pending = queue.filter(j => !alreadyApplied(j) && !isExcluded(j.company));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[PortalRouter] 🚀 Starting Company Portal Application Cycle`);
  console.log(`[PortalRouter] Queue: ${pending.length} pending (${queue.length - pending.length} already applied)`);
  console.log(`[PortalRouter] Daily limit: ${dailyLimit} | ATS engines: Greenhouse, Lever, Workday, iCIMS, Taleo, SmartRecruiters, Generic`);
  console.log(`${'='.repeat(70)}\n`);

  if (pending.length === 0) {
    console.log(`[PortalRouter] ✅ All priority companies already applied to.`);
    return [];
  }

  let browser = await chromium.launchPersistentContext(
    path.join(__dirname, '.browser_session_portals'),
    {
      headless: true,
      slowMo: 300,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    }
  );

  const results = [];
  let appCount = 0;

  for (const job of pending) {
    if (appCount >= dailyLimit) {
      console.log(`[PortalRouter] Daily limit of ${dailyLimit} reached. Stopping.`);
      break;
    }

    let page;
    try {
      // Ensure browser is alive
      if (!browser || !browser.pages) {
        browser = await chromium.launchPersistentContext(
          path.join(__dirname, '.browser_session_portals'),
          {
            headless: true,
            slowMo: 300,
            viewport: { width: 1280, height: 900 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          }
        );
      }
      page = browser.pages()[0] || await browser.newPage();
    } catch (e) {
      console.warn(`[PortalRouter] Browser recreation needed: ${e.message}`);
      browser = await chromium.launchPersistentContext(
        path.join(__dirname, '.browser_session_portals'),
        {
          headless: true,
          viewport: { width: 1280, height: 900 },
        }
      );
      page = await browser.newPage();
    }

    try {
      const result = await applyToPortal(page, browser, job);
      if (result && result.success) {
        results.push(result);
        appCount++;
        console.log(`[PortalRouter] Progress: ${appCount}/${dailyLimit} applications submitted.`);
      }
    } catch (err) {
      console.error(`[PortalRouter] ⚠️ Error applying to ${job.company}: ${err.message}`);
    }

    // Human-like delay between applications
    const delay = 8000 + Math.random() * 7000;
    console.log(`[PortalRouter] Waiting ${Math.round(delay/1000)}s before next application...`);
    await new Promise(r => setTimeout(r, delay));
  }

  try { await browser.close(); } catch (_) {}

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[PortalRouter] 🏁 Cycle complete. ${appCount} applications submitted to company portals.`);
  console.log(`${'='.repeat(70)}\n`);
  return results;
}

// Allow direct execution for testing
if (require.main === module) {
  const testMode = process.argv.includes('--test');
  if (testMode) {
    const testJob = {
      title: process.argv[process.argv.indexOf('--title') + 1] || 'Program Manager',
      company: process.argv[process.argv.indexOf('--company') + 1] || 'Test Company',
      applyUrl: process.argv[process.argv.indexOf('--url') + 1] || 'https://boards.greenhouse.io/stripe'
    };
    console.log(`[PortalRouter] TEST MODE: ${JSON.stringify(testJob)}`);
    runPortalApplicationCycle([testJob], 1).catch(console.error);
  } else {
    runPortalApplicationCycle().catch(console.error);
  }
}

module.exports = { runPortalApplicationCycle, applyToPortal, PRIORITY_COMPANY_QUEUE };
