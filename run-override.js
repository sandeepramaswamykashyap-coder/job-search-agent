/**
 * Job Search & Application Agent - Generic Override Trigger
 * Temporarily disables all portals except the specified targets, increases their daily caps,
 * runs the application cycle immediately, and restores configurations on exit.
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const configBackupPath = path.join(__dirname, 'config.json.backup');
const statsPath = path.join(__dirname, 'stats.json');

// Parse target portals from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node run-override.js <portal1> [portal2] ...");
  process.exit(1);
}

// Normalize portal names (e.g., 'hireist' -> 'hirist')
const targets = args.map(p => {
  let name = p.toLowerCase().trim();
  if (name === 'hireist') name = 'hirist';
  return name;
});

// 1. Back up config.json
if (!fs.existsSync(configPath)) {
  console.error("config.json not found!");
  process.exit(1);
}
const originalConfigText = fs.readFileSync(configPath, 'utf8');
fs.writeFileSync(configBackupPath, originalConfigText, 'utf8');

try {
  const config = JSON.parse(originalConfigText);
  
  // Validate that targets are valid portals in config
  for (const target of targets) {
    if (!config.platforms[target]) {
      console.error(`Error: Unknown portal "${target}". Available portals: ${Object.keys(config.platforms).join(', ')}`);
      fs.unlinkSync(configBackupPath);
      process.exit(1);
    }
  }

  // 2. Modify config.json to only run the targeted portals with higher caps
  for (const portal in config.platforms) {
    if (targets.includes(portal)) {
      config.platforms[portal].enabled = true;
      // Set to a high cap to override today's limits
      config.platforms[portal].max_applications_per_day = 120; 
    } else {
      config.platforms[portal].enabled = false;
    }
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`[Override Run] Temporarily modified config.json (enabled: ${targets.join(', ')}, increased caps to 120).`);

  // 3. Load stats
  let stats = {
    jobsScanned: 0,
    applicationsSubmitted: 0,
    appliedRolesList: [],
    failures: [],
    lastCVUploadDate: null
  };
  
  if (fs.existsSync(statsPath)) {
    try {
      const savedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcTime + (3600000 * 5.5));
      const todayStr = istTime.toDateString();
      if (savedStats.date === todayStr) {
        stats = { ...stats, ...savedStats };
        console.log(`[Override Run] Restored stats from today: Scanned=${stats.jobsScanned}, Submitted=${stats.applicationsSubmitted}`);
      } else {
        console.log(`[Override Run] Saved stats are from a different date (${savedStats.date}). Initializing fresh stats.`);
      }
    } catch (e) {
      console.warn(`[Override Run] Failed to load stats: ${e.message}`);
    }
  }

  // 4. Require agent and run cycle
  const { runAgentCycle } = require('./agent');

  (async () => {
    console.log(`=== Starting Override Job Search Cycle for: ${targets.join(', ')} ===`);
    const start = Date.now();
    try {
      await runAgentCycle({ refreshCVOnly: false, stats });
      
      // Save stats
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcTime + (3600000 * 5.5));
      stats.date = istTime.toDateString();
      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');
      console.log("[Override Run] Saved updated stats to stats.json.");
      
      console.log("=== Override Cycle Completed Successfully ===");
    } catch (err) {
      console.error("=== Override Cycle Failed ===", err);
    } finally {
      // 5. Restore config.json
      fs.writeFileSync(configPath, originalConfigText, 'utf8');
      if (fs.existsSync(configBackupPath)) {
        fs.unlinkSync(configBackupPath);
      }
      console.log("[Override Run] Restored original config.json.");
      
      const duration = Math.round((Date.now() - start) / 1000);
      console.log(`Total duration: ${duration} seconds.`);
      process.exit(0);
    }
  })();

} catch (err) {
  console.error("Failed to set up override:", err);
  // Restore config.json in case of error before the async block
  if (fs.existsSync(configBackupPath)) {
    fs.writeFileSync(configPath, originalConfigText, 'utf8');
    fs.unlinkSync(configBackupPath);
  }
  process.exit(1);
}
