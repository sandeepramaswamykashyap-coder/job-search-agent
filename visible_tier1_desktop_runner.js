/**
 * visible_tier1_desktop_runner.js — Visible Headed Tier-1 Corporate Application Runner
 *
 * Runs with `headless: false` so you can visually watch the Chrome browser window
 * open on your macOS display, navigate to direct corporate career sites, fill in form fields,
 * attach your resume, and click submit in real time.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { applyToPortal } = require('./portal_router');
const { getAllApplications, logApplication } = require('./applications_db');
const { isRoleRelevant } = require('./role_relevance_filter');

const userDataDir = path.join(__dirname, '.browser_session_amicable_light');

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

async function runVisibleDesktopRunner() {
  console.log('======================================================================');
  console.log('🖥️  [VisibleDesktopRunner] LAUNCHING VISIBLE HEADED BROWSER ENGINE');
  console.log(`Browser Mode: VISIBLE HEADED (headless: false)`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('======================================================================\n');

  let browserContext;

  try {
    const lockPath = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      try { fs.unlinkSync(lockPath); } catch (_) {}
    }

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      slowMo: 100,
      viewport: { width: 1280, height: 850 },
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--renderer-process-limit=2',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--mute-audio',
        '--js-flags=--max-old-space-size=384',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    // Block heavy video, audio, fonts, and 3rd party trackers to save 80% CPU & RAM
    await browserContext.route('**/*', (route) => {
      const reqUrl = route.request().url().toLowerCase();
      const resType = route.request().resourceType();
      if (
        ['media', 'font'].includes(resType) ||
        /google-analytics|googletagmanager|hotjar|segment\.io|doubleclick|sentry|datadog|youtube|vimeo/i.test(reqUrl)
      ) {
        return route.abort();
      }
      return route.continue();
    });

    const page = await browserContext.newPage();

    while (true) {
      console.log('\n[VisibleDesktopRunner] 🌐 Fetching latest live Tier-1 corporate openings...');
      const liveJobs = await fetchAllLiveATSJobs();
      console.log(`[VisibleDesktopRunner] Total live openings active: ${liveJobs.length}`);

      // STRICT RELEVANCE FILTER: Only roles matching Sandeep's 15+ yr leadership profile:
      // ServiceNow · Transformation · TPM / PMO · Delivery Management · Intelligent Automation / RPA · UAT Governance · Ops Leadership
      const seniorJobs = liveJobs.filter(j => isRoleRelevant(j.title));

      console.log(`[VisibleDesktopRunner] 🎯 Strictly filtered relevant leadership roles: ${seniorJobs.length}`);

      const existing = getAllApplications();
      const submittedKeys = new Set(
        existing
          .filter(a => /submitted/i.test(a.status || '') && !['unconfirmed', 'error', 'failed', 'job_expired'].includes(a.portal))
          .map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
      );

      const pending = seniorJobs.filter(j => {
        const key = `${(j.company || '').toLowerCase().trim()}::${(j.title || '').toLowerCase().trim()}`;
        return !submittedKeys.has(key);
      });

      console.log(`[VisibleDesktopRunner] 📋 Pending live unapplied senior roles: ${pending.length}`);

      if (pending.length === 0) {
        console.log('[VisibleDesktopRunner] All current openings applied. Standing by for new listings...');
        await page.waitForTimeout(30000);
        continue;
      }

      for (const job of pending) {
        console.log(`\n======================================================================`);
        console.log(`🖥️  [VISIBLE LIVE APPLY] "${job.title}" @ ${job.company}`);
        console.log(`URL: ${job.applyUrl}`);
        console.log(`======================================================================`);

        try {
          await page.bringToFront().catch(() => {});
          const result = await applyToPortal(page, browserContext, job);
          console.log(`[VisibleDesktopRunner] Result for "${job.title}" @ ${job.company}:`, result);
          if (result && result.success) {
            logApplication({
              company: job.company,
              title: job.title,
              portal: result.atsType || 'portal',
              url: job.applyUrl
            });
          } else {
            logApplication({
              company: job.company,
              title: job.title,
              portal: result?.reason || 'unconfirmed',
              url: job.applyUrl
            });
          }
        } catch (err) {
          console.error(`[VisibleDesktopRunner] ❌ Error applying to ${job.company}: ${err.message}`);
          logApplication({
            company: job.company,
            title: job.title,
            portal: 'error',
            url: job.applyUrl
          });
        } finally {
          await closeAllExtraTabs(browserContext, page);
        }

        const waitSec = 15 + Math.floor(Math.random() * 10);
        console.log(`[VisibleDesktopRunner] ⏳ Gentle low-impact pause: ${waitSec}s before next application...`);
        await page.waitForTimeout(waitSec * 1000);
      }
    }
  } catch (err) {
    console.error(`[VisibleDesktopRunner] Error in cycle: ${err.message}`);
  } finally {
    if (browserContext) {
      await browserContext.close().catch(() => {});
    }
  }
}

async function startOvernightEngine() {
  console.log('======================================================================');
  console.log('🌙 [OvernightEngine] STARTING CONTINUOUS OVERNIGHT AUTOMATION ENGINE');
  console.log('Auto-recovery: ENABLED | Cadence: 15-25s | Memory Capped');
  console.log('======================================================================\n');

  while (true) {
    try {
      await runVisibleDesktopRunner();
    } catch (err) {
      console.error(`[OvernightEngine] 🔄 Auto-recovering after error: ${err.message}`);
    }
    console.log('[OvernightEngine] Standing by 15s before starting next job sweep...');
    await new Promise(r => setTimeout(r, 15000));
  }
}

startOvernightEngine().catch(console.error);
