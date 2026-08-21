/**
 * Job Search & Application Agent - Continuous Runner
 * Runs the application cycles continuously without long pauses until daily caps are hit or matches are exhausted.
 */

const { runAgentCycle } = require('./agent');
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, 'stats.json');
const configPath = path.join(__dirname, 'config.json');

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
        console.log(`[Continuous Run] Restored stats from today: Scanned=${stats.jobsScanned}, Submitted=${stats.applicationsSubmitted}`);
      } else {
        console.log(`[Continuous Run] Stats date (${savedStats.date}) differs from today (${todayStr}). Initializing fresh stats.`);
        stats.jobsScanned = 0;
        stats.applicationsSubmitted = 0;
        stats.appliedRolesList = [];
        stats.failures = [];
        stats.date = todayStr;
      }
    } catch (e) {
      console.warn(`[Continuous Run] Failed to load stats: ${e.message}`);
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
    console.log(`[Continuous Run] Saved stats to stats.json.`);
  } catch (e) {
    console.warn(`[Continuous Run] Failed to save stats: ${e.message}`);
  }
}

async function run() {
  console.log("=== Starting Continuous Target Matching Action ===");
  
  let iteration = 1;
  while (true) {
    loadStats();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Check if all portals are capped
    let allCapped = true;
    let activePortalsCount = 0;
    
    console.log(`\n--- Iteration ${iteration} progress check ---`);
    for (const portal in config.platforms) {
      if (config.platforms[portal].enabled) {
        activePortalsCount++;
        const dailyCap = config.platforms[portal].max_applications_per_day || 20;
        const applied = stats.appliedRolesList.filter(r => r.portal === portal).length;
        console.log(`* ${portal}: ${applied}/${dailyCap}`);
        if (applied < dailyCap) {
          allCapped = false;
        }
      }
    }
    
    if (activePortalsCount === 0) {
      console.log("[Continuous Run] No active portals configured. Exiting.");
      break;
    }
    
    if (allCapped) {
      console.log("[Continuous Run] SUCCESS: All active job portals have met their daily application targets!");
      break;
    }
    
    const beforeCount = stats.applicationsSubmitted;
    console.log(`\n[Continuous Run] Starting cycle ${iteration} execution...`);
    try {
      await runAgentCycle({ refreshCVOnly: false, stats });
      saveStats();
    } catch (err) {
      console.error(`[Continuous Run] Error in cycle ${iteration}:`, err.message);
      stats.failures.push({ time: new Date().toISOString(), context: `Cycle ${iteration}`, error: err.message });
      saveStats();
    }
    
    const afterCount = stats.applicationsSubmitted;
    const progressMade = afterCount - beforeCount;
    console.log(`\n[Continuous Run] Cycle ${iteration} complete. Progress: +${progressMade} applications.`);
    
    if (progressMade === 0) {
      console.log("[Continuous Run] No new applications were submitted in this cycle. Job matches are likely exhausted or logins are blocked. Stopping run.");
      break;
    }
    
    console.log("[Continuous Run] Waiting 60 seconds before next cycle...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    iteration++;
  }
  
  console.log("=== Continuous Target Matching Action Completed ===");
}

run();
