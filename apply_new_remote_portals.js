/**
 * Job Search & Application Agent - New Remote Portals Direct Application Engine
 * Crawls and applies to all matching listings on newly added remote portals:
 * WeWorkRemotely, RemoteOK, Jobgether, Remotive, WorkingNomads, SurelyRemote, DailyRemote.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const fs = require('fs');
const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');
const { verifyEmailExistence } = require('./email_verifier');
const { sendPersonaOutreachEmail } = require('./outreach_mailer');

const statsFile = path.join(__dirname, 'stats.json');

async function applyToNewRemotePortals() {
  console.log("=================== STARTING DIRECT APPLY SWEEP ON NEW REMOTE PORTALS ===================");
  console.log(`Execution Time: ${new Date().toISOString()}`);

  // 1. Fetch matching remote jobs across all 7 new remote portals
  const matchedJobs = await runAllGlobalRemoteSweeps();
  console.log(`\n[RemoteApplyEngine] Retesting ${matchedJobs.length} matched remote listings...`);

  let appliedCount = 0;
  let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [] };
  if (fs.existsSync(statsFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      stats = { ...existing, ...stats };
      stats.jobsScanned = existing.jobsScanned || stats.jobsScanned || 0;
      stats.appliedRolesList = existing.appliedRolesList || [];
    } catch (e) {}
  }

  for (const job of matchedJobs) {
    console.log(`\n[RemoteApplyEngine] Processing: "${job.title}" at ${job.company} (${job.portal.toUpperCase()})`);
    
    // Check if explicit email contact exists for direct pitch
    const emailMatch = (job.link || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) ||
                       (job.description || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    let applicationSubmitted = false;

    if (emailMatch && emailMatch[0]) {
      const email = emailMatch[0];
      console.log(`[RemoteApplyEngine] Found target recruiter email: ${email}. Verifying...`);
      const verification = await verifyEmailExistence(email);

      if (verification.valid) {
        console.log(`[RemoteApplyEngine] ✅ Mailbox verified (250 OK). Dispatching executive pitch package...`);
        const sent = await sendPersonaOutreachEmail({
          email: email,
          company: job.company,
          title: job.title,
          persona: 'recruiter'
        });

        if (sent) {
          applicationSubmitted = true;
          console.log(`[RemoteApplyEngine] 🚀 Application successfully emailed to ${email}`);
        }
      } else {
        console.log(`[RemoteApplyEngine] Mailbox rejected (${verification.reason}). Launching Playwright ATS form-filler...`);
        const { chromium } = require('playwright');
        const userDataDir = path.join(__dirname, '.browser_session');
        const ctx = await chromium.launchPersistentContext(userDataDir, {
          headless: true,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          args: ['--no-sandbox']
        });
        const page = await ctx.newPage();
        const { autoSubmitRemoteATS } = require('./automate_remote_ats_submissions');
        applicationSubmitted = await autoSubmitRemoteATS(page, job);
        await ctx.close();
      }
    } else {
      console.log(`[RemoteApplyEngine] Launching Playwright Remote ATS form-filler for ${job.link}...`);
      const { chromium } = require('playwright');
      const userDataDir = path.join(__dirname, '.browser_session');
      const ctx = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: ['--no-sandbox']
      });
      const page = await ctx.newPage();
      const { autoSubmitRemoteATS } = require('./automate_remote_ats_submissions');
      applicationSubmitted = await autoSubmitRemoteATS(page, job);
      await ctx.close();
    }

    if (applicationSubmitted) {
      appliedCount++;
      stats.applicationsSubmitted = (stats.applicationsSubmitted || 0) + 1;
      if (!stats.appliedRolesList) stats.appliedRolesList = [];
      stats.appliedRolesList.push({
        company: job.company,
        title: job.title,
        portal: job.portal,
        time: new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');

  console.log("\n=================== NEW REMOTE PORTALS APPLY SUMMARY ===================");
  console.log(`Total New Remote Applications Processed & Staged: ${appliedCount}`);
  console.log("=========================================================================");
}

if (require.main === module) {
  applyToNewRemotePortals();
}

module.exports = { applyToNewRemotePortals };
