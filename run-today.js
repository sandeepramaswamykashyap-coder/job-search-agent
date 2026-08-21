/**
 * Job Search & Application Agent - Today's Action Manual Trigger
 * Performs the daily CV upload sequence (if not already done today) and the auto-apply loop,
 * updating and saving the stats to stats.json.
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
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcTime + (3600000 * 5.5));
      const todayStr = istTime.toDateString();
      if (savedStats.date === todayStr) {
        stats = { ...stats, ...savedStats };
        console.log(`[Run Today] Restored stats from today: Scanned=${stats.jobsScanned}, Submitted=${stats.applicationsSubmitted}`);
      } else {
        console.log(`[Run Today] Saved stats are from a different date (${savedStats.date}). Initializing fresh stats.`);
      }
    } catch (e) {
      console.warn(`[Run Today] Failed to load stats: ${e.message}`);
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
    console.log(`[Run Today] Saved stats to stats.json.`);
  } catch (e) {
    console.warn(`[Run Today] Failed to save stats: ${e.message}`);
  }
}

(async () => {
  console.log("=== Starting Manual 'Today's Action' Cycle ===");
  loadStats();
  const start = Date.now();
  
  const todayStr = new Date().toDateString();
  
  // 1. Run CV upload if not yet completed today
  if (stats.lastCVUploadDate !== todayStr) {
    console.log(`[Run Today] CV upload date is '${stats.lastCVUploadDate}', today is '${todayStr}'. Initiating CV re-upload...`);
    try {
      await runAgentCycle({ refreshCVOnly: true, stats });
      stats.lastCVUploadDate = todayStr;
      saveStats();
      console.log("[Run Today] Daily CV upload completed successfully.");
    } catch (err) {
      console.error("[Run Today] Error uploading CV:", err.message);
      stats.failures.push({ time: new Date().toISOString(), context: "Manual CV Upload", error: err.message });
      saveStats();
    }
  } else {
    console.log(`[Run Today] CV already successfully uploaded today (${todayStr}). Skipping CV upload step.`);
  }

  // 2. Run normal application loop
  console.log("[Run Today] Starting job search and auto-apply loop...");
  try {
    await runAgentCycle({ refreshCVOnly: false, stats });
    saveStats();
    console.log("=== Manual 'Today's Action' Cycle Completed Successfully ===");
    console.log(`Total Jobs Scanned Today: ${stats.jobsScanned}`);
    console.log(`Total Applications Submitted Today: ${stats.applicationsSubmitted}`);
  } catch (err) {
    console.error("=== Manual 'Today's Action' Cycle Failed ===", err);
    stats.failures.push({ time: new Date().toISOString(), context: "Manual Apply Loop", error: err.message });
    saveStats();
  } finally {
    const duration = Math.round((Date.now() - start) / 1000);
    console.log(`Total duration: ${duration} seconds.`);
    process.exit(0);
  }
})();
