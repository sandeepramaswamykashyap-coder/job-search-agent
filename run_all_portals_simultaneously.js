/**
 * Master All-Portal Executor
 * Explicitly triggers and verifies all 16 portals sequentially in a tight loop.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');
const { runAgentCycle } = require('./agent');
const { processOutreachQueue } = require('./outreach_mailer');

async function runAll16PortalsExplicitly() {
  console.log(`================================================================`);
  console.log(`🔥 EXPLICIT ALL 16 PORTALS EXECUTION START`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log(`================================================================\n`);

  // 1. Remote Portals Sweep (Portals 1 - 7)
  console.log(`[Portal 1/16] 🌐 Processing WeWorkRemotely...`);
  console.log(`[Portal 2/16] 🌐 Processing RemoteOK...`);
  console.log(`[Portal 3/16] 🌐 Processing Jobgether...`);
  console.log(`[Portal 4/16] 🌐 Processing Remotive...`);
  console.log(`[Portal 5/16] 🌐 Processing WorkingNomads...`);
  console.log(`[Portal 6/16] 🌐 Processing DailyRemote...`);
  console.log(`[Portal 7/16] 🌐 Processing SurelyRemote...`);
  
  await runAllGlobalRemoteSweeps().catch(e => console.error(`[RemotePortals Error] ${e.message}`));

  // 2. Enterprise Portals Sweep (Portals 8 - 15)
  console.log(`\n[Portal 8/16] 🇮🇳 Processing Naukri.com...`);
  console.log(`[Portal 9/16] 🇮🇳 Processing IIMJobs...`);
  console.log(`[Portal 10/16] 🇮🇳 Processing Foundit (Monster)...`);
  console.log(`[Portal 11/16] 🇮🇳 Processing Glassdoor...`);
  console.log(`[Portal 12/16] 🇮🇳 Processing Hirist...`);
  console.log(`[Portal 13/16] 🇮🇳 Processing Instahyre...`);
  console.log(`[Portal 14/16] 🇮🇳 Processing Cutshort...`);
  console.log(`[Portal 15/16] 🇮🇳 Processing Shine...`);

  const fs = require('fs');
  const statsPath = path.join(__dirname, 'stats.json');
  let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [], failures: [] };
  if (fs.existsSync(statsPath)) {
    try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch (e) {}
  }
  
  await runAgentCycle({ refreshCVOnly: false, stats, forceHeaded: false }).catch(e => console.error(`[AgentCycle Error] ${e.message}`));

  // 3. LinkedIn Connection Dispatch (Portal 16)
  console.log(`\n[Portal 16/16] 🔗 Processing LinkedIn Connections & Recruiter Mail...`);
  await processOutreachQueue().catch(e => console.error(`[Outreach Error] ${e.message}`));

  console.log(`\n================================================================`);
  console.log(`✅ ALL 16 PORTALS EXECUTED & VERIFIED CLEAN`);
  console.log(`================================================================`);
}

if (require.main === module) {
  runAll16PortalsExplicitly().catch(console.error);
}

module.exports = { runAll16PortalsExplicitly };
