/**
 * e2e_portal_orchestrator.js — Master End-to-End Job Portal Application Orchestrator
 *
 * Runs full end-to-end applications across all user-configured job portals:
 *   1. NAUKRI (Profile boost + questionnaire + Easy Apply)
 *   2. IIMJOBS & HIRIST (Executive search + cover note + CTC/notice confirmation)
 *   3. LINKEDIN (Easy Apply 1-5 step modal wizard)
 *   4. FOUNDIT (Monster India screening & apply)
 *   5. INSTAHYRE (Opportunities feed + pitch note)
 *   6. INDEED (Indeed Apply wizard)
 *   7. TIMESJOBS (Direct corporate apply)
 *   8. DIRECT ENTERPRISE ATS (Workday, Greenhouse, Lever, Ashby, SmartRecruiters)
 *
 * Usage:
 *   node e2e_portal_orchestrator.js --headed                 # Full visible desktop run
 *   node e2e_portal_orchestrator.js --headless               # Silent background run
 *   node e2e_portal_orchestrator.js --portal=naukri          # Targeted portal run
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const { closeAllExtraTabs } = require('./universal_form_resolver');
const { runNaukriE2E } = require('./portal_drivers/naukri_e2e');
const { runIIMJobsE2E } = require('./portal_drivers/iimjobs_e2e');
const { runLinkedInE2E } = require('./portal_drivers/linkedin_e2e');
const { runFounditE2E } = require('./portal_drivers/foundit_e2e');
const { runInstahyreE2E } = require('./portal_drivers/instahyre_e2e');
const { runIndeedE2E } = require('./portal_drivers/indeed_e2e');
const { runTimesJobsE2E } = require('./portal_drivers/timesjobs_e2e');
const { applyToPortal } = require('./portal_router');
const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { getAllApplications, logApplication } = require('./applications_db');
const { syncToGitHub } = require('./git_auto_pusher');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Remove any lingering lock file
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDirectCorporateATS(page, context, maxApplications = 15) {
  console.log('\n======================================================================');
  console.log('🏢 [DIRECT CORPORATE ATS] STARTING ENTERPRISE ATS SUBMISSIONS');
  console.log('======================================================================');

  const jobs = await fetchAllLiveATSJobs();
  const SENIOR_KEYWORDS = [
    'program manager', 'technical program manager', 'tpm', 'delivery manager',
    'transformation', 'director', 'vice president', 'vp', 'operations manager',
    'product manager', 'lead', 'bizops', 'chief of staff'
  ];

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  const matched = jobs.filter(j => {
    const t = (j.title || '').toLowerCase();
    const isSenior = SENIOR_KEYWORDS.some(k => t.includes(k)) && !/intern|junior|graduate/i.test(t);
    const key = `${(j.company || '').toLowerCase().trim()}::${(j.title || '').toLowerCase().trim()}`;
    return isSenior && !appliedKeys.has(key);
  });

  console.log(`[DirectCorporate] ${matched.length} fresh unapplied senior roles queued.`);
  let count = 0;

  for (const job of matched.slice(0, maxApplications)) {
    console.log(`\n[DirectCorporate] 🖥️ Processing: "${job.title}" @ ${job.company} (${job.atsType})`);
    console.log(`[DirectCorporate] URL: ${job.applyUrl}`);

    try {
      const res = await applyToPortal(page, context, job);
      if (res && res.success) {
        console.log(`[DirectCorporate] ✅ SUBMISSION CONFIRMED: "${job.title}" @ ${job.company}`);
        logApplication({
          company: job.company,
          title: job.title,
          portal: res.atsType || job.atsType,
          url: job.applyUrl,
          time: new Date().toISOString(),
          status: 'submitted'
        });
        count++;
      }
    } catch (err) {
      console.warn(`[DirectCorporate] ⚠️ Error: ${err.message.slice(0, 80)}`);
    } finally {
      await closeAllExtraTabs(context, page);
    }
    await SLEEP(3500);
  }

  console.log(`[DirectCorporate] 🏁 Direct ATS cycle complete: ${count} applications submitted.`);
  return count;
}

async function main() {
  const isHeaded = process.argv.includes('--headed');
  const portalArg = process.argv.find(a => a.startsWith('--portal='))?.split('=')[1]?.toLowerCase();

  console.log('======================================================================');
  console.log('🌟 END-TO-END JOB APPLICATION ORCHESTRATOR');
  console.log(`Browser Mode: ${isHeaded ? 'HEADED (Visible Desktop Window)' : 'HEADLESS (Background Engine)'}`);
  console.log(`Target Portal: ${portalArg ? portalArg.toUpperCase() : 'ALL PORTALS'}`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('======================================================================\n');

  const browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
    channel: 'chrome',
    headless: !isHeaded,
    slowMo: isHeaded ? 100 : 0,
    viewport: { width: 1280, height: 850 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browserContext.newPage();
  await closeAllExtraTabs(browserContext, page);

  try {
    while (true) {
      const summary = {};

      // 1. NAUKRI
      if (!portalArg || portalArg === 'naukri') {
        await closeAllExtraTabs(browserContext, page);
        summary.naukri = await runNaukriE2E(page, browserContext, 20);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(naukri): completed end-to-end applications');
      }

      // 2. IIMJOBS & HIRIST
      if (!portalArg || portalArg === 'iimjobs' || portalArg === 'hirist') {
        await closeAllExtraTabs(browserContext, page);
        summary.iimjobs = await runIIMJobsE2E(page, browserContext, 15);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(iimjobs): completed end-to-end applications');
      }

      // 3. LINKEDIN EASY APPLY
      if (!portalArg || portalArg === 'linkedin') {
        await closeAllExtraTabs(browserContext, page);
        summary.linkedin = await runLinkedInE2E(page, browserContext, 10);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(linkedin): completed end-to-end Easy Apply applications');
      }

      // 4. FOUNDIT
      if (!portalArg || portalArg === 'foundit') {
        await closeAllExtraTabs(browserContext, page);
        summary.foundit = await runFounditE2E(page, browserContext, 15);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(foundit): completed end-to-end applications');
      }

      // 5. INSTAHYRE
      if (!portalArg || portalArg === 'instahyre') {
        await closeAllExtraTabs(browserContext, page);
        summary.instahyre = await runInstahyreE2E(page, browserContext, 15);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(instahyre): completed end-to-end applications');
      }

      // 6. INDEED
      if (!portalArg || portalArg === 'indeed') {
        await closeAllExtraTabs(browserContext, page);
        summary.indeed = await runIndeedE2E(page, browserContext, 10);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(indeed): completed end-to-end applications');
      }

      // 7. TIMESJOBS
      if (!portalArg || portalArg === 'timesjobs') {
        await closeAllExtraTabs(browserContext, page);
        summary.timesjobs = await runTimesJobsE2E(page, browserContext, 10);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(timesjobs): completed end-to-end applications');
      }

      // 8. DIRECT CORPORATE ATS
      if (!portalArg || portalArg === 'corporate' || portalArg === 'ats') {
        await closeAllExtraTabs(browserContext, page);
        summary.corporate = await runDirectCorporateATS(page, browserContext, 15);
        await closeAllExtraTabs(browserContext, page);
        syncToGitHub('feat(corporate): completed end-to-end ATS applications');
      }

      console.log('\n======================================================================');
      console.log('🏁 FULL OMNI-PORTAL APPLICATION CYCLE FINISHED');
      console.log('Cycle Summary:', JSON.stringify(summary, null, 2));
      console.log('Pausing 3 minutes before next scheduled sweep...');
      console.log('======================================================================\n');

      if (process.argv.includes('--once') || process.argv.includes('--test')) {
        break;
      }

      await SLEEP(180 * 1000);
    }
  } catch (err) {
    console.error(`[E2EOrchestrator] Fatal error in cycle: ${err.message}`);
  } finally {
    try {
      await closeAllExtraTabs(browserContext, page);
      if (process.argv.includes('--once') || process.argv.includes('--test')) {
        await browserContext.close().catch(() => {});
      }
    } catch (_) {}
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
