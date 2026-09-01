/**
 * High-Throughput Parallel Application Grinder Engine
 * 
 * Executes rapid, concurrent live form submissions across 350+ Enterprise Boards
 * (Greenhouse, Ashby, Lever, SmartRecruiters, Workday) with 100% verified candidate ground truth.
 * 
 * Features:
 * - Dual concurrent worker streams (2x throughput)
 * - Optimized human-like timing (3-6s between submissions)
 * - Auto-skips OTP/verification hurdles to eliminate candidate email noise
 * - Real-time Git sync every 5 confirmed submissions
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

const SENIOR_KEYWORDS = [
  'program manager', 'technical program manager', 'tpm', 'delivery manager',
  'project manager', 'transformation', 'service delivery', 'servicenow',
  'director', 'head of', 'vice president', 'vp', 'agile', 'scrum master',
  'operations manager', 'product manager', 'change management', 'lead',
  'business operations', 'bizops', 'chief of staff', 'governance', 'risk operations'
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
  console.log('\n[ContinuousGrinder] 🌐 Gathering fresh live job listings across all 350+ company boards & feeds...');
  const [atsJobs, remoteJobs] = await Promise.all([
    fetchAllLiveATSJobs().catch(() => []),
    runAllGlobalRemoteSweeps().catch(() => [])
  ]);

  const all = [
    ...atsJobs,
    ...remoteJobs.map(j => ({ ...j, applyUrl: j.link || j.url, atsType: j.portal || 'remote_portal' }))
  ];

  console.log(`[ContinuousGrinder] Total raw live listings gathered: ${all.length}`);
  const matched = all.filter(j => isSeniorMatch(j.title));
  console.log(`[ContinuousGrinder] 🎯 Senior leadership matched listings: ${matched.length}`);
  return matched;
}

async function runWorker(workerId, jobs, browser) {
  console.log(`[Worker-${workerId}] 🚀 Starting stream with ${jobs.length} jobs in queue...`);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  // Block heavy assets to maximize speed and stability
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    const url = route.request().url();
    if (['image', 'media', 'font'].includes(type) || url.includes('google-analytics') || url.includes('hotjar') || url.includes('doubleclick')) {
      return route.abort();
    }
    return route.continue();
  });

  let workerSuccess = 0;
  for (const job of jobs) {
    console.log(`\n[Worker-${workerId}] 📝 Processing: "${job.title}" @ ${job.company} (${job.atsType})`);
    console.log(`[Worker-${workerId}] Apply URL: ${job.applyUrl}`);

    try {
      const result = await applyToPortal(page, context, job);
      if (result && result.success) {
        workerSuccess++;
        console.log(`[Worker-${workerId}] ✅ CONFIRMED SUBMISSION: "${job.title}" @ ${job.company}`);
        logApplication({
          company: job.company,
          title: job.title,
          portal: result.atsType || job.atsType || 'direct_portal',
          url: job.applyUrl,
          time: new Date().toISOString(),
          status: 'submitted'
        });

        if (workerSuccess % 5 === 0) {
          syncToGitHub(`feat: recorded ${workerSuccess} verified submissions from Worker-${workerId}`);
        }
      } else {
        console.log(`[Worker-${workerId}] ⚠️ Submission skipped/unconfirmed: ${result?.reason || 'Form requirements'}`);
      }
    } catch (err) {
      console.error(`[Worker-${workerId}] ❌ Error applying to ${job.company}: ${err.message}`);
    }

    const pauseSec = 3 + Math.floor(Math.random() * 4); // 3–6 seconds rapid humanlike pacing
    console.log(`[Worker-${workerId}] ⏳ Pausing ${pauseSec}s before next application...`);
    await page.waitForTimeout(pauseSec * 1000);
  }

  await context.close().catch(() => {});
  return workerSuccess;
}

async function runHighThroughputGrindCycle() {
  console.log('\n======================================================================');
  console.log('⚡ [ContinuousGrinder] STARTING MAXIMUM-THROUGHPUT PARALLEL APPLICATION GRIND');
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

  console.log(`[ContinuousGrinder] 📋 Unapplied leadership roles in queue: ${pending.length}`);
  if (pending.length === 0) {
    console.log('[ContinuousGrinder] Queue fully processed. Standing by for fresh openings.');
    return;
  }

  // Split pending jobs into 2 concurrent streams
  const batch = pending.slice(0, 100); // Process batch of 100 per cycle
  const worker1Jobs = batch.filter((_, idx) => idx % 2 === 0);
  const worker2Jobs = batch.filter((_, idx) => idx % 2 !== 0);

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--renderer-process-limit=4',
        '--js-flags=--max-old-space-size=512'
      ]
    });

    const [res1, res2] = await Promise.all([
      runWorker(1, worker1Jobs, browser).catch(() => 0),
      runWorker(2, worker2Jobs, browser).catch(() => 0)
    ]);

    const totalCycleSuccess = (res1 || 0) + (res2 || 0);
    console.log(`\n[ContinuousGrinder] 🏁 Batch complete! Confirmed ${totalCycleSuccess} new submissions in this parallel cycle.`);
    if (totalCycleSuccess > 0) {
      syncToGitHub(`feat: confirmed ${totalCycleSuccess} verified submissions in parallel grind cycle`);
    }
  } catch (err) {
    console.error(`[ContinuousGrinder] Browser session error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function startGrinder() {
  while (true) {
    try {
      await runHighThroughputGrindCycle();
    } catch (err) {
      console.error(`[ContinuousGrinder] Auto-recovery: ${err.message}`);
    }
    console.log('[ContinuousGrinder] ⏳ Standing by 30 seconds before next high-throughput sweep...');
    await new Promise(r => setTimeout(r, 30 * 1000));
  }
}

if (require.main === module) {
  startGrinder();
}

module.exports = { startGrinder, runHighThroughputGrindCycle };
