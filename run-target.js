/**
 * Job Search & Application Agent - Target Trigger
 * Temporarily enables all portals and increases caps, runs applications
 * until exactly 200 applications have been submitted, and merges statistics.
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const configBackupPath = path.join(__dirname, 'config.json.backup');
const statsPath = path.join(__dirname, 'stats.json');

// 1. Back up config.json
if (!fs.existsSync(configPath)) {
  console.error("config.json not found!");
  process.exit(1);
}
const originalConfigText = fs.readFileSync(configPath, 'utf8');
fs.writeFileSync(configBackupPath, originalConfigText, 'utf8');

try {
  // 2. Modify config.json to enable all platforms and set caps high
  const config = JSON.parse(originalConfigText);
  for (const portal in config.platforms) {
    config.platforms[portal].enabled = true;
    config.platforms[portal].max_applications_per_day = 200;
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log("[Target Run] Temporarily modified config.json (enabled all portals, set caps to 200).");

  // 3. Load today's actual stats for merging later
  let realStats = {
    jobsScanned: 0,
    applicationsSubmitted: 0,
    appliedRolesList: [],
    failures: [],
    lastCVUploadDate: null,
    date: ""
  };
  
  if (fs.existsSync(statsPath)) {
    try {
      const savedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcTime + (3600000 * 5.5));
      const todayStr = istTime.toDateString();
      if (savedStats.date === todayStr) {
        realStats = savedStats;
        console.log(`[Target Run] Loaded today's existing stats: Scanned=${realStats.jobsScanned}, Submitted=${realStats.applicationsSubmitted}`);
      } else {
        console.log(`[Target Run] Existing stats are from a different date (${savedStats.date}). Resetting stats.`);
        realStats.date = todayStr;
      }
    } catch (e) {
      console.warn(`[Target Run] Failed to load stats.json: ${e.message}`);
    }
  }

  // 4. Create target stats object using Proxy to stop exactly at 200
  const targetStats = new Proxy({
    jobsScanned: 0,
    applicationsSubmitted: 0,
    appliedRolesList: [],
    failures: [],
    lastCVUploadDate: realStats.lastCVUploadDate
  }, {
    set(target, prop, value) {
      target[prop] = value;
      if (prop === 'applicationsSubmitted' && value >= 200) {
        console.log(`\n[Target Run] TARGET REACHED: ${value} applications submitted during this run. Terminating cycle early.`);
        throw new Error('TARGET_REACHED');
      }
      return true;
    }
  });

  const { runAgentCycle } = require('./agent');

  (async () => {
    console.log("=== Starting Target Job Search Cycle (Target: 200 applications) ===");
    const start = Date.now();
    let reachedTarget = false;
    
    try {
      await runAgentCycle({ refreshCVOnly: false, stats: targetStats });
    } catch (err) {
      if (err.message === 'TARGET_REACHED') {
        reachedTarget = true;
      } else {
        console.error("=== Target Cycle Error ===", err);
        realStats.failures.push({ time: new Date().toISOString(), context: "Target Run", error: err.message });
      }
    } finally {
      // 5. Merge the results of the manual run into real stats
      realStats.jobsScanned += targetStats.jobsScanned;
      realStats.applicationsSubmitted += targetStats.applicationsSubmitted;
      realStats.appliedRolesList.push(...targetStats.appliedRolesList);
      
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcTime + (3600000 * 5.5));
      realStats.date = istTime.toDateString();
      
      fs.writeFileSync(statsPath, JSON.stringify(realStats, null, 2), 'utf8');
      console.log(`[Target Run] Merged and saved stats.json: Scanned Today=${realStats.jobsScanned}, Submitted Today=${realStats.applicationsSubmitted}`);

      // 6. Restore original config.json
      fs.writeFileSync(configPath, originalConfigText, 'utf8');
      if (fs.existsSync(configBackupPath)) {
        fs.unlinkSync(configBackupPath);
      }
      console.log("[Target Run] Restored original config.json.");
      
      const duration = Math.round((Date.now() - start) / 1000);
      console.log(`Total duration: ${duration} seconds.`);
      console.log(`Applications submitted during this run: ${targetStats.applicationsSubmitted}`);
      console.log(`Target reached: ${reachedTarget ? 'YES' : 'NO'}`);
      
      process.exit(0);
    }
  })();

} catch (err) {
  console.error("Failed to set up target run:", err);
  if (fs.existsSync(configBackupPath)) {
    fs.writeFileSync(configPath, originalConfigText, 'utf8');
    fs.unlinkSync(configBackupPath);
  }
  process.exit(1);
}
