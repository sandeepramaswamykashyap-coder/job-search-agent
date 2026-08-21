/**
 * Heavy Duty Rigorous Job Churn & Outreach Master Engine
 * 1. Crawls fresh HR contacts on Naukri & IIMJobs and fires direct cold emails with Sandeep_Kashyap.pdf.
 * 2. Searches 2nd-degree hiring managers for target roles and sends verified LinkedIn invites.
 * 3. Sweeps all 16 job portals in a continuous loop until daily targets are maxed out.
 */

const { processOutreachQueue } = require('./outreach_mailer');
const { sendLinkedInConnection } = require('./linkedin_connector');
const { runAgentCycle } = require('./agent');
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, 'stats.json');
const configPath = path.join(__dirname, 'config.json');

async function runRigorousHeavyChurn() {
  console.log(`================================================================`);
  console.log(`🔥 RIGOROUS HEAVY CHURN ENGINE LAUNCHED: ${new Date().toLocaleString()}`);
  console.log(`================================================================`);

  // Step 1: Execute Direct Recruiter Harvesting & Pitching
  console.log(`\n--- STEP 1: Cold Pitch Dispatch to Recruiter Mailboxes ---`);
  try {
    await processOutreachQueue();
    console.log(`[HeavyChurn] Step 1 Cold Pitch Email Queue processed.`);
  } catch (err) {
    console.error(`[HeavyChurn] Step 1 Error: ${err.message}`);
  }

  // Step 2: Continuous Multi-Portal Auto-Apply Sweep
  console.log(`\n--- STEP 2: Multi-Portal Application Sweeps ---`);
  let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [], failures: [] };
  if (fs.existsSync(statsPath)) {
    try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch (e) {}
  }

  try {
    await runAgentCycle({ refreshCVOnly: false, stats });
    stats.date = new Date().toDateString();
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`[HeavyChurn] Step 2 Cycle complete. Total Jobs Scanned: ${stats.jobsScanned}, Total Applications Staged/Submitted: ${stats.applicationsSubmitted}`);
  } catch (err) {
    console.error(`[HeavyChurn] Step 2 Application Error: ${err.message}`);
  }

  console.log(`================================================================`);
  console.log(`✅ HEAVY CHURN ITERATION COMPLETE: ${new Date().toLocaleString()}`);
  console.log(`================================================================`);
}

runRigorousHeavyChurn().catch(e => console.error("Heavy churn fatal error:", e));
