/**
 * Visible 24/7 Headed Desktop Automation Engine
 * Runs continuously in VISIBLE HEADED BROWSER MODE (headless: false)
 * Keeps Chrome windows open and actively navigating, searching, filling forms,
 * and dispatching outreach every second of the day.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const { runAgentCycle } = require('./agent');
const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');
const { processOutreachQueue } = require('./outreach_mailer');
const { sendLinkedInConnection } = require('./linkedin_connector');

async function runVisible247HeadedEngine() {
  console.log(`================================================================`);
  console.log(`🚀 LAUNCHING VISIBLE 24/7 HEADED AUTOMATION ENGINE`);
  console.log(`Browser Mode: VISIBLE HEADED (headless: false)`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log(`================================================================\n`);

  const userDataDir = path.join(__dirname, '.browser_session');
  
  let loopCount = 1;
  while (true) {
    console.log(`\n=================== HEAVY VISIBLE CHURN PASS #${loopCount} ===================`);
    console.log(`Time: ${new Date().toLocaleTimeString()} IST`);

    try {
      // Pass A: Visible Chrome Browser for Portal Searches & Applications
      console.log(`[Visible247] Step A: Opening Headed Chrome Browser for Portal Applications...`);
      const ctx = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        slowMo: 600,
        viewport: { width: 1366, height: 768 },
        args: ['--start-maximized', '--no-sandbox']
      });

      const page = await ctx.newPage();

      // Highlight helper
      async function highlightAndNavigate(url, label) {
        console.log(`[Visible247] 🎯 Navigating to ${label}: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000);
      }

      // 1. Visit IIMJobs Transformation Roles
      await highlightAndNavigate('https://www.iimjobs.com/search/transformation-program-manager-jobs.html', 'IIMJobs Transformation Roles');

      // 2. Visit Naukri Program Manager Roles
      await highlightAndNavigate('https://www.naukri.com/transformation-program-manager-jobs-in-bengaluru', 'Naukri Bengaluru Roles');

      // 3. Visit WeWorkRemotely Remote Leadership
      await highlightAndNavigate('https://weworkremotely.com/categories/remote-management-executive-jobs', 'WeWorkRemotely Executive Category');

      // 4. Visit Local Dashboard
      await highlightAndNavigate('http://localhost:3000', 'Live Local Dashboard UI');

      await ctx.close().catch(() => {});
    } catch (err) {
      console.error(`[Visible247] Step A Exception: ${err.message}`);
    }

    // Pass B: Execute Multi-Portal Agent Cycle
    console.log(`\n[Visible247] Step B: Executing Multi-Portal Auto-Apply Engine...`);
    try {
      const statsPath = path.join(__dirname, 'stats.json');
      let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [], failures: [] };
      if (fs.existsSync(statsPath)) {
        try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch (e) {}
      }
      await runAgentCycle({ refreshCVOnly: false, stats, forceHeaded: true });
      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');
    } catch (err) {
      console.error(`[Visible247] Step B Exception: ${err.message}`);
    }

    // Pass C: Recruiter Outreach & Cold Email Dispatch
    console.log(`\n[Visible247] Step C: Dispatching Cold Pitch Emails to Recruiter Mailboxes...`);
    try {
      await processOutreachQueue();
    } catch (err) {
      console.error(`[Visible247] Step C Exception: ${err.message}`);
    }

    console.log(`\n=================== PASS #${loopCount} COMPLETE. RESTARTING IMMEDIATELY ===================`);
    loopCount++;
    await new Promise(r => setTimeout(r, 5000)); // 5-second pause before next pass
  }
}

runVisible247HeadedEngine().catch(console.error);
