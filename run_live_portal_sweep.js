const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { runAgentCycle } = require('./agent');
const fs = require('fs');

const statsFile = path.join(__dirname, 'stats.json');

(async () => {
  console.log('=================== EXECUTING LIVE PORTAL APPLICATION SWEEP ===================');

  let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [] };
  if (fs.existsSync(statsFile)) {
    try { stats = JSON.parse(fs.readFileSync(statsFile, 'utf8')); } catch (e) {}
  }

  await runAgentCycle({ refreshCVOnly: false, stats, forceHeaded: false });

  console.log('\n=================== LIVE SWEEP COMPLETE ===================');
  console.log(`Total Applications Submitted Today: ${stats.applicationsSubmitted}`);
})().catch(console.error);
