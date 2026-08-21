const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');
const { autoSubmitRemoteATS } = require('./automate_remote_ats_submissions');

const statsFile = path.join(__dirname, 'stats.json');

(async () => {
  console.log('=================== DEDICATED 5-PORTAL GLOBAL REMOTE APPLY SWEEP ===================');
  console.log('Target Portals: WeWorkRemotely, DailyRemote, RemoteOK, Jobgether, WorkingNomads');
  console.log(`Execution Time: ${new Date().toISOString()}`);

  const TARGET_PORTALS = ['weworkremotely', 'dailyremote', 'remoteok', 'jobgether', 'workingnomads'];

  // 1. Fetch matching remote jobs across global remote crawlers
  const allRemoteJobs = await runAllGlobalRemoteSweeps();
  const targetJobs = allRemoteJobs.filter(j => TARGET_PORTALS.includes((j.portal || '').toLowerCase()));

  console.log(`\n[RemoteApplyMaster] Found ${targetJobs.length} matched remote listings across the 5 target portals.`);

  let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [] };
  if (fs.existsSync(statsFile)) {
    try { stats = JSON.parse(fs.readFileSync(statsFile, 'utf8')); } catch (e) {}
  }

  const userDataDir = path.join(__dirname, '.browser_session');
  let appliedCount = 0;

  for (const job of targetJobs) {
    console.log(`\n[RemoteApplyMaster] 🚀 Processing listing: "${job.title}" @ ${job.company} [${job.portal.toUpperCase()}]`);
    console.log(`URL: ${job.link || job.url}`);

    const ctx = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--no-sandbox']
    });
    const page = await ctx.newPage();

    const submitted = await autoSubmitRemoteATS(page, job);
    await ctx.close().catch(() => {});

    if (submitted) {
      appliedCount++;
      stats.applicationsSubmitted = (stats.applicationsSubmitted || 0) + 1;
      if (!stats.appliedRolesList) stats.appliedRolesList = [];
      stats.appliedRolesList.push({
        company: job.company,
        title: job.title,
        portal: job.portal.toLowerCase(),
        url: job.link || job.url,
        time: new Date().toISOString()
      });
      fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
      console.log(`✅ VERIFIED REMOTE APPLICATION SUBMITTED: ${job.title} @ ${job.company}`);
    }
  }

  console.log('\n=================== 5-PORTAL REMOTE APPLY SWEEP COMPLETE ===================');
  console.log(`Total Verified Remote Applications Submitted in this Sweep: ${appliedCount}`);
  console.log(`Total Verified Applications Counter: ${stats.applicationsSubmitted}`);
})().catch(console.error);
