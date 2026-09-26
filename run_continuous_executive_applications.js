/**
 * run_continuous_executive_applications.js
 * 
 * Continuous, high-intensity executive application runner for:
 * 1. NAUKRI (Recent Bangalore Leadership Roles, jobAge=7, 25 cards/role)
 * 2. IIMJOBS (13 executive categories, 18 cards/category)
 * 3. FOUNDIT (Bengaluru Operations & Transformation)
 * 
 * Runs in a continuous loop with auto-recovery and 90-second intervals.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const { runNaukriE2E } = require('./portal_drivers/naukri_e2e');
const { runIIMJobsE2E } = require('./portal_drivers/iimjobs_e2e');
const { runFounditE2E } = require('./portal_drivers/foundit_e2e');
const { syncToGitHub } = require('./git_auto_pusher');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Remove lingering lock
function clearLock() {
  const lockPath = path.join(SESSION_DIR, 'SingletonLock');
  if (fs.existsSync(lockPath)) {
    try { fs.unlinkSync(lockPath); } catch (_) {}
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeExtraTabs(context, mainPage) {
  if (!context) return;
  try {
    for (const p of context.pages()) {
      if (p !== mainPage && !p.isClosed()) {
        await p.close().catch(() => {});
      }
    }
  } catch (_) {}
}

async function startContinuousExecutiveGrind() {
  console.log('======================================================================');
  console.log('🚀 [ExecutiveGrind] LAUNCHING CONTINUOUS BENGALURU EXECUTIVE RUNNER');
  console.log(`Started: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log('Target: Senior Operations Manager, Transformation Lead, Head of Operations');
  console.log('======================================================================\n');

  clearLock();

  let browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 850 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled']
  });

  let cycle = 1;

  while (true) {
    let page = browserContext.pages()[0] || await browserContext.newPage();
    console.log(`\n▶️ === STARTING CYCLE #${cycle} ===`);

    try {
      // 1. NAUKRI
      console.log(`\n[Cycle #${cycle}] 🇮🇳 Running Naukri Executive Sweep...`);
      try {
        await runNaukriE2E(page, browserContext, 20);
      } catch (err) {
        console.warn(`[Cycle #${cycle}] ⚠️ Naukri notice: ${err.message}`);
      }
      await closeExtraTabs(browserContext, page);

      // 2. IIMJOBS
      console.log(`\n[Cycle #${cycle}] 🎓 Running IIMJobs Leadership Sweep...`);
      try {
        await runIIMJobsE2E(page, browserContext, 15);
      } catch (err) {
        console.warn(`[Cycle #${cycle}] ⚠️ IIMJobs notice: ${err.message}`);
      }
      await closeExtraTabs(browserContext, page);

      // 3. FOUNDIT
      console.log(`\n[Cycle #${cycle}] 🦖 Running Foundit Sweep...`);
      try {
        await runFounditE2E(page, browserContext, 10);
      } catch (err) {
        console.warn(`[Cycle #${cycle}] ⚠️ Foundit notice: ${err.message}`);
      }
      await closeExtraTabs(browserContext, page);

      // Sync progress
      syncToGitHub(`feat: executive runner completed cycle #${cycle}`);

      console.log(`\n✅ Cycle #${cycle} finished. Pausing 90 seconds before next sweep...`);
      cycle++;
      await sleep(90 * 1000);

    } catch (criticalErr) {
      console.error(`[Cycle #${cycle}] ❌ Critical error: ${criticalErr.message}`);
      await sleep(15000);
      try {
        clearLock();
        if (browserContext) await browserContext.close().catch(() => {});
        browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
          channel: 'chrome',
          headless: false,
          viewport: { width: 1366, height: 850 },
          args: ['--disable-blink-features=AutomationControlled']
        });
      } catch (_) {}
    }
  }
}

if (require.main === module) {
  startContinuousExecutiveGrind();
}

module.exports = { startContinuousExecutiveGrind };
