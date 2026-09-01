/**
 * Ultra-Aggressive Quad-Worker High-Throughput Application Engine
 * 
 * Executes blistering-fast, 4-way concurrent submissions across 350+ Enterprise Boards
 * (Ashby, Lever, SmartRecruiters, Greenhouse, Workday) with 100% verified ground truth data.
 * 
 * Capabilities:
 * - 4 Parallel Concurrent Workers (4x speed & volume)
 * - Ultra-tight human-like pacing (1.5–3.5s per submission)
 * - High-conversion priority queue (Ashby & Lever front-loaded)
 * - Auto-skips OTP/verification hurdles to eliminate candidate email noise
 * - Real-time Git auto-sync every 5 confirmed submissions
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
  console.log('\n[QuadGrinder] 🌐 Aggressively sweeping 350+ enterprise ATS boards & remote aggregators...');
  const [atsJobs, remoteJobs] = await Promise.all([
    fetchAllLiveATSJobs().catch(() => []),
    runAllGlobalRemoteSweeps().catch(() => [])
  ]);

  const all = [
    ...atsJobs,
    ...remoteJobs.map(j => ({ ...j, applyUrl: j.link || j.url, atsType: j.portal || 'remote_portal' }))
  ];

  console.log(`[QuadGrinder] Total raw live listings gathered: ${all.length}`);
  const matched = all.filter(j => isSeniorMatch(j.title));
  console.log(`[QuadGrinder] 🎯 Senior leadership matched listings: ${matched.length}`);

  // Sort: Prioritize high-conversion, fast-submitting engines first (Ashby > Lever > SmartRecruiters > Greenhouse)
  const priority = { ashby: 1, lever: 2, smartrecruiters: 3, greenhouse: 4, remote_portal: 5 };
  matched.sort((a, b) => (priority[a.atsType] || 6) - (priority[b.atsType] || 6));

  return matched;
}

async function runWorker(workerId, jobs, browser) {
  console.log(`[Worker-${workerId}] 🚀 Spawning stream with ${jobs.length} jobs in queue...`);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  // Block heavy assets to maximize speed and stability
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    const url = route.request().url();
    if (['image', 'media'].includes(type) || url.includes('google-analytics') || url.includes('hotjar') || url.includes('doubleclick')) {
      return route.abort();
    }
    return route.continue();
  });

  let workerSuccess = 0;
  for (const job of jobs) {
    console.log(`\n[Worker-${workerId}] 📝 Processing: "${job.title}" @ ${job.company} (${job.atsType})`);
    console.log(`[Worker-${workerId}] Apply URL: ${job.applyUrl}`);

    try {
      // 45s ceiling per submission
      const result = await Promise.race([
        applyToPortal(page, context, job),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Submission timeout (45s exceeded)')), 45000))
      ]);

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

    const pauseSec = 1.5 + Math.random() * 2; // 1.5–3.5s rapid pacing
    console.log(`[Worker-${workerId}] ⏳ Pausing ${pauseSec.toFixed(1)}s before next application...`);
    await page.waitForTimeout(pauseSec * 1000);
  }

  await context.close().catch(() => {});
  return workerSuccess;
}

async function runAggressiveQuadGrindCycle() {
  console.log('\n======================================================================');
  console.log('⚡⚡⚡ [QuadGrinder] STARTING ULTRA-AGGRESSIVE QUAD-WORKER PARALLEL GRIND');
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

  console.log(`[QuadGrinder] 📋 Unapplied leadership roles in queue: ${pending.length}`);
  if (pending.length === 0) {
    console.log('[QuadGrinder] All available listings applied! Standing by for incoming openings.');
    return;
  }

  // Split pending jobs into 4 concurrent streams
  const batch = pending.slice(0, 200); // 200 jobs per cycle
  const w1Jobs = batch.filter((_, idx) => idx % 4 === 0);
  const w2Jobs = batch.filter((_, idx) => idx % 4 === 1);
  const w3Jobs = batch.filter((_, idx) => idx % 4 === 2);
  const w4Jobs = batch.filter((_, idx) => idx % 4 === 3);

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--renderer-process-limit=6',
        '--js-flags=--max-old-space-size=768'
      ]
    });

    const results = await Promise.all([
      runWorker(1, w1Jobs, browser).catch(() => 0),
      runWorker(2, w2Jobs, browser).catch(() => 0),
      runWorker(3, w3Jobs, browser).catch(() => 0),
      runWorker(4, w4Jobs, browser).catch(() => 0)
    ]);

    const totalCycleSuccess = results.reduce((a, b) => a + (b || 0), 0);
    console.log(`\n[QuadGrinder] 🏁 Batch complete! Confirmed ${totalCycleSuccess} new submissions across 4 parallel workers.`);
    if (totalCycleSuccess > 0) {
      syncToGitHub(`feat: confirmed ${totalCycleSuccess} verified submissions in quad-worker cycle`);
    }
  } catch (err) {
    console.error(`[QuadGrinder] Browser session error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function startQuadGrinder() {
  while (true) {
    try {
      await runAggressiveQuadGrindCycle();
    } catch (err) {
      console.error(`[QuadGrinder] Auto-recovery: ${err.message}`);
    }
    console.log('[QuadGrinder] ⏳ Standing by 15 seconds before next quad sweep...');
    await new Promise(r => setTimeout(r, 15 * 1000));
  }
}

if (require.main === module) {
  startQuadGrinder();
}

module.exports = { startQuadGrinder, runAggressiveQuadGrindCycle };
