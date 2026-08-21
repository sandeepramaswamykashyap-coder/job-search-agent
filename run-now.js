/**
 * Job Search & Application Agent - Immediate Run Trigger
 * Imports and executes a single application cycle immediately without waiting for the scheduler.
 */

const { runAgentCycle } = require('./agent');
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, 'stats.json');
let stats = {
  jobsScanned: 0,
  applicationsSubmitted: 0,
  appliedRolesList: [],
  failures: [],
  lastCVUploadDate: null
};

function loadStats() {
  if (fs.existsSync(statsPath)) {
    try {
      const savedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      const todayStr = new Date().toDateString();
      if (savedStats.date === todayStr || !savedStats.date) {
        stats = { ...stats, ...savedStats };
        console.log(`[Run Now] Restored stats from today: Scanned=${stats.jobsScanned}, Submitted=${stats.applicationsSubmitted}`);
      } else {
        console.log(`[Run Now] Saved stats are from a different date (${savedStats.date}). Preserving appliedRolesList and updating date.`);
        stats.appliedRolesList = savedStats.appliedRolesList || [];
      }
    } catch (e) {
      console.warn(`[Run Now] Failed to load stats: ${e.message}`);
    }
  }
}

function saveStats() {
  try {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (3600000 * 5.5));
    stats.date = istTime.toDateString();
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`[Run Now] Saved stats to stats.json.`);
  } catch (e) {
    console.warn(`[Run Now] Failed to save stats: ${e.message}`);
  }
}

(async () => {
  console.log("=== Starting Immediate Job Search Cycle ===");
  loadStats();
  const start = Date.now();
  
  try {
    await runAgentCycle({ refreshCVOnly: false, stats });
    saveStats();
    console.log("=== Immediate Cycle Completed Successfully ===");
    console.log(`Jobs Scanned: ${stats.jobsScanned}`);
    console.log(`Applications Submitted: ${stats.applicationsSubmitted}`);
  } catch (err) {
    console.error("=== Immediate Cycle Failed ===", err);
  } finally {
    const duration = Math.round((Date.now() - start) / 1000);
    console.log(`Total duration: ${duration} seconds.`);
    process.exit(0);
  }
})();

