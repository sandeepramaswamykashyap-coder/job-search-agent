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

// ── Sandeep Ramaswamy Kashyap – Relevant Role Filter ──────────────────────────
// Only apply to roles that genuinely match Sandeep's 15-yr profile:
// ServiceNow · Business/Digital Transformation · UAT · Change Management ·
// Intelligent Automation · Operations Excellence · Data Governance · Program/Portfolio Mgmt
const RELEVANT_TITLE_KEYWORDS = [
  // ServiceNow
  'servicenow', 'service now', 'snow',
  // Transformation
  'transformation', 'business transformation', 'digital transformation',
  'operations transformation', 'process transformation',
  // Program / Portfolio / Delivery Management
  'program manager', 'programme manager', 'portfolio manager',
  'delivery manager', 'delivery lead', 'pmo',
  // Change Management / OCM
  'change management', 'organizational change', 'ocm',
  // UAT / Quality Governance
  'uat', 'user acceptance', 'quality assurance', 'qa lead', 'test manager',
  // Intelligent Automation / RPA
  'intelligent automation', 'automation manager', 'rpa', 'hyperautomation',
  // Operations & Operational Excellence
  'operations manager', 'operational excellence', 'ops excellence',
  'service delivery', 'service operations',
  // Data Governance / Data Management
  'data governance', 'data steward', 'data product', 'data quality',
  'data privacy', 'market data', 'data analytics manager',
  // Agile / Scrum
  'agile coach', 'scrum master', 'agile delivery',
  // Senior leadership titles (domain-qualified below)
  'senior manager', 'senior operations',
  // Transition
  'transition manager', 'service transition',
  // Investment Banking Ops (IIM Indore background)
  'investment banking operations', 'banking operations',
  // Risk / Regulatory
  'risk operations', 'regulatory change', 'governance risk',
];

// Hard exclude — titles that sound senior but are NOT Sandeep's domain
const EXCLUDE_TITLE_KEYWORDS = [
  'intern', 'junior', 'entry level', 'graduate', 'student', 'fellow', 'trainee', 'fresher',
  // Sales / Marketing
  'sales director', 'sales manager', 'account manager', 'account executive',
  'business development', 'bd manager', 'marketing manager', 'growth manager',
  'demand generation', 'revenue manager', 'commercial director',
  // Legal / Compliance (not Sandeep's domain)
  'legal counsel', 'corporate legal', 'compliance manager', 'compliance officer',
  // Finance / Accounting
  'finance manager', 'financial controller', 'fp&a', 'treasurer', 'cfo',
  'fixed income', 'fund manager', 'asset manager', 'investment manager',
  'wealth manager', 'relationship manager',
  // Engineering / Dev
  'software engineer', 'software developer', 'frontend', 'backend', 'fullstack',
  'devops engineer', 'cloud engineer', 'data engineer', 'ml engineer',
  // HR (not his target unless HRSD related)
  'hr manager', 'hrbp', 'talent acquisition', 'recruiter', 'l&d manager',
  // Creative / Design
  'ui designer', 'ux designer', 'graphic designer', 'brand manager', 'content manager',
  // Unrelated verticals
  'real estate', 'manufacturing', 'supply chain', 'procurement manager',
  'logistics', 'hospitality', 'retail manager',
];

function isSeniorMatch(title) {
  const t = (title || '').toLowerCase();
  const excluded = EXCLUDE_TITLE_KEYWORDS.some(k => t.includes(k));
  if (excluded) return false;
  const relevant = RELEVANT_TITLE_KEYWORDS.some(k => t.includes(k));
  return relevant;
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
  const appliedKeys = new Set(getAllApplications().map(a => `${(a.company||'').toLowerCase().trim()}::${(a.title||'').toLowerCase().trim()}`));
  const matched = all.filter(j => {
    if (!isSeniorMatch(j.title)) return false;
    const key = `${(j.company||'').toLowerCase().trim()}::${(j.title||'').toLowerCase().trim()}`;
    if (appliedKeys.has(key)) return false;
    if ((j.company || '').toLowerCase() === 'cursor') return false;
    return true;
  });
  console.log(`[QuadGrinder] 🎯 Fresh unapplied senior leadership listings: ${matched.length}`);

  // Sort: Prioritize high-conversion, fast-submitting engines first (Lever > SmartRecruiters > Greenhouse > Ashby > Remote)
  const priority = { lever: 1, smartrecruiters: 2, greenhouse: 3, ashby: 4, remote_portal: 5 };
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

  const submittedKeys = new Set(
    existing
      .filter(a => /submitted/i.test(a.status || '') && !['unconfirmed', 'error', 'failed'].includes(a.portal))
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
