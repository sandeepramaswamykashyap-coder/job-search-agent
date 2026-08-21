/**
 * Job Search & Application Agent - Watch Live Mode
 * Launches a temporary visible Chrome browser window so you can watch the agent live in action.
 * Automatically restores silent background mode when done.
 */

const { runAgentCycle } = require('./agent');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Temporarily enable visible browser window
config.scheduler.headless = false;

const statsPath = path.join(__dirname, 'stats.json');
let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [] };
if (fs.existsSync(statsPath)) {
  try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch (e) {}
}

console.log("\n========================================================================");
console.log(" 👁️  WATCH LIVE MODE — Opening visible Chrome window on your screen...");
console.log("========================================================================\n");

(async () => {
  try {
    await runAgentCycle({ refreshCVOnly: false, stats, forceHeaded: true });
    console.log("\n✅ Watch Live cycle completed successfully.");
  } catch (err) {
    console.error(`\n❌ Watch Live cycle error: ${err.message}`);
  } finally {
    console.log("🔒 Restoring silent background mode for 24/7 scheduler...");
    process.exit(0);
  }
})();
