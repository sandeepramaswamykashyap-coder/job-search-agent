/**
 * naukri_iimjobs_morning_booster.js
 * 
 * Aggressive Daily Indian Job Market Driver:
 * 1. NAUKRI:
 *    - Uses persistent browser profile (with pre-authenticated session)
 *    - Re-uploads cleaned, pristine Sandeep_Kashyap.pdf (CV Boost: Catapults profile to #1 in recruiter Resdex searches)
 *    - Applies to Senior Manager, Operations Manager, Transformation Lead, Program Manager roles in Bengaluru
 * 2. IIMJOBS:
 *    - Logs in
 *    - Re-uploads CV and applies to Senior Leadership roles for IIM Indore alumni
 * 3. Consolidates data and syncs to GitHub
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const { runNaukriE2E } = require('./portal_drivers/naukri_e2e');
const { runIIMJobsE2E } = require('./portal_drivers/iimjobs_e2e');
const { syncToGitHub } = require('./git_auto_pusher');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

async function runMorningBooster(options = {}) {
  const isHeadless = process.argv.includes('--headless');
  console.log('\n======================================================================');
  console.log('🇮🇳 [MORNING BOOSTER] LAUNCHING AGGRESSIVE NAUKRI & IIMJOBS OPTIMIZATION');
  console.log(`Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log(`Display Mode: ${isHeadless ? 'Background (Headless)' : 'Visible (Headed)'}`);
  console.log('======================================================================');

  let browserContext = null;
  try {
    browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: isHeadless,
      viewport: { width: 1366, height: 850 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();

    // 1. Run Naukri CV Re-Upload & Applications
    console.log('\n[MorningBooster] 🚀 Step 1: Running Naukri Profile Booster & Bengaluru Applications...');
    const naukriApps = await runNaukriE2E(page, browserContext, 20).catch(e => {
      console.warn(`[MorningBooster] ⚠️ Naukri error: ${e.message}`);
      return 0;
    });

    // 2. Run IIMJobs Executive Applications
    console.log('\n[MorningBooster] 🎓 Step 2: Running IIMJobs Executive Leadership Applications...');
    const iimApps = await runIIMJobsE2E(page, browserContext, 15).catch(e => {
      console.warn(`[MorningBooster] ⚠️ IIMJobs error: ${e.message}`);
      return 0;
    });

    console.log('\n======================================================================');
    console.log(`✅ [MorningBooster] SUCCESS: ${naukriApps} Naukri + ${iimApps} IIMJobs applications completed.`);
    console.log('======================================================================');

    syncToGitHub(`feat: morning booster completed ${naukriApps} Naukri + ${iimApps} IIMJobs applications`);
  } catch (err) {
    console.error(`[MorningBooster] ❌ Critical Error: ${err.message}`);
  } finally {
    if (browserContext) {
      await browserContext.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  runMorningBooster();
}

module.exports = { runMorningBooster };
