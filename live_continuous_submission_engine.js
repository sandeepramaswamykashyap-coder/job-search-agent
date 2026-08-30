/**
 * High-Throughput Real-Time Application Submission Engine
 * Expands ingestion across 180+ direct company boards & global aggregators,
 * executes automated form submissions with CV attachment, and records verified confirmations.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');
const { applyToPortal } = require('./portal_router');
const { logApplication, getAllApplications } = require('./applications_db');
const { syncToGitHub } = require('./git_auto_pusher');

const RESUME_PATH = path.join(__dirname, 'Sandeep_Kashyap.pdf');
const SESSION_DIR = path.join(__dirname, '.browser_session_live_continuous');

// Ensure browser session lock directory is clean
if (fs.existsSync(path.join(SESSION_DIR, 'SingletonLock'))) {
  try { fs.unlinkSync(path.join(SESSION_DIR, 'SingletonLock')); } catch (_) {}
}

const SENIOR_KEYWORDS = [
  'program manager', 'technical program manager', 'tpm', 'delivery manager',
  'project manager', 'transformation', 'service delivery', 'servicenow',
  'director', 'head of', 'vice president', 'vp', 'agile', 'scrum master',
  'operations manager', 'product manager', 'change management', 'lead'
];

const EXCLUDE_KEYWORDS = [
  'intern', 'junior', 'entry level', 'graduate', 'student', 'fellow'
];

function isSeniorMatch(title) {
  const t = (title || '').toLowerCase();
  const matches = SENIOR_KEYWORDS.some(k => t.includes(k));
  const excluded = EXCLUDE_KEYWORDS.some(k => t.includes(k));
  return matches && !excluded;
}

async function gatherAllLiveJobs() {
  console.log('\n[ContinuousEngine] 🌐 Gathering fresh live job listings across all streams...');
  const [atsJobs, remoteJobs] = await Promise.all([
    fetchAllLiveATSJobs().catch(() => []),
    runAllGlobalRemoteSweeps().catch(() => [])
  ]);

  const all = [
    ...atsJobs,
    ...remoteJobs.map(j => ({ ...j, applyUrl: j.link || j.url, atsType: j.portal || 'remote_portal' }))
  ];

  console.log(`[ContinuousEngine] Total raw live listings gathered: ${all.length}`);
  const matched = all.filter(j => isSeniorMatch(j.title));
  console.log(`[ContinuousEngine] 🎯 Senior leadership matched listings: ${matched.length}`);
  return matched;
}

async function runLiveSubmissionCycle() {
  console.log('\n======================================================================');
  console.log('🚀 [ContinuousEngine] STARTING HIGH-THROUGHPUT REAL APPLICATION CYCLE');
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('======================================================================');

  const jobs = await gatherAllLiveJobs();
  const existing = getAllApplications();
  const now = Date.now();

  const submittedKeys = new Set(
    existing
      .filter(a => a.status === 'submitted' && !['unconfirmed', 'error', 'failed'].includes(a.portal) && a.time && (now - new Date(a.time).getTime() < 48 * 3600 * 1000))
      .map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  const pending = jobs.filter(j => {
    const key = `${(j.company || '').toLowerCase().trim()}::${(j.title || '').toLowerCase().trim()}`;
    return !submittedKeys.has(key);
  });

  console.log(`[ContinuousEngine] 📋 New unapplied senior openings in queue: ${pending.length}`);

  if (pending.length === 0) {
    console.log('[ContinuousEngine] All current active openings submitted. Standing by for new listings.');
    return;
  }

  let browserContext = null;
  try {
    browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: true,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--renderer-process-limit=2',
        '--js-flags=--max-old-space-size=384'
      ]
    });

    const page = await browserContext.newPage();
    // Block heavy tracking/media
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      const url = route.request().url();
      if (['image', 'media', 'font'].includes(type) || url.includes('google-analytics') || url.includes('hotjar') || url.includes('doubleclick')) {
        return route.abort();
      }
      return route.continue();
    });

    let successCount = 0;
    for (const job of pending.slice(0, 30)) { // Process batch of 30
      console.log(`\n----------------------------------------------------------------------`);
      console.log(`📝 Processing: "${job.title}" @ ${job.company}`);
      console.log(`Apply URL: ${job.applyUrl}`);
      console.log(`----------------------------------------------------------------------`);

      try {
        const result = await applyToPortal(page, browserContext, job);
        if (result && result.success) {
          successCount++;
          console.log(`[ContinuousEngine] ✅ CONFIRMED SUBMISSION: "${job.title}" @ ${job.company}`);
          logApplication({
            company: job.company,
            title: job.title,
            portal: result.atsType || job.atsType || 'direct_portal',
            url: job.applyUrl,
            time: new Date().toISOString(),
            status: 'submitted'
          });
        } else {
          console.log(`[ContinuousEngine] ⚠️ Submission skipped/unconfirmed: ${result?.reason || 'Form requirements'}`);
        }
      } catch (err) {
        console.error(`[ContinuousEngine] ❌ Error applying to ${job.company}: ${err.message}`);
      }

      const pauseSec = 8 + Math.floor(Math.random() * 6);
      console.log(`[ContinuousEngine] ⏳ Pausing ${pauseSec}s before next application...`);
      await page.waitForTimeout(pauseSec * 1000);
    }

    console.log(`\n[ContinuousEngine] Cycle complete. Successfully confirmed ${successCount} new submissions.`);
    if (successCount > 0) {
      syncToGitHub(`feat: recorded ${successCount} verified application submissions`);
    }
  } catch (err) {
    console.error(`[ContinuousEngine] Error in browser cycle: ${err.message}`);
  } finally {
    if (browserContext) {
      await browserContext.close().catch(() => {});
    }
  }
}

async function startEngine() {
  while (true) {
    try {
      await runLiveSubmissionCycle();
    } catch (err) {
      console.error(`[ContinuousEngine] Auto-recovery: ${err.message}`);
    }
    console.log('[ContinuousEngine] Waiting 5 minutes before next discovery & submission sweep...');
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
  }
}

if (require.main === module) {
  startEngine();
}

module.exports = { startEngine, runLiveSubmissionCycle };
