/**
 * aggressive_portal_runner.js — Non-Stop Aggressive Company Portal Application Daemon
 *
 * Runs continuously in the background to apply for every matching job across:
 * - Greenhouse direct boards
 * - Lever direct portals
 * - SmartRecruiters portals
 * - Workday career sites
 * - Direct company ATS endpoints
 *
 * Designed to reach high-volume daily targets (150+ applications/day).
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

const { runPortalApplicationCycle } = require('./portal_router');
const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { logApplication, getAllApplications } = require('./applications_db');

const BATCH_SIZE = 50;
const COOLDOWN_BETWEEN_BATCHES_MS = 60 * 1000; // 1 minute between batches

async function runAggressiveDaemon() {
  console.log('======================================================================');
  console.log('🚀 [AggressivePortalRunner] Daemon Started — 24/7 High-Volume Execution');
  console.log('======================================================================');

  while (true) {
    try {
      console.log(`\n[AggressivePortalRunner] 🌐 Fetching latest live ATS job openings...`);
      const liveJobs = await fetchAllLiveATSJobs().catch(e => {
        console.warn(`[AggressivePortalRunner] Fetch warning: ${e.message}`);
        return [];
      });

      console.log(`[AggressivePortalRunner] Total live jobs fetched: ${liveJobs.length}`);

      // Filter out already applied
      const existing = getAllApplications();
      const existingKeys = new Set(
        existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
      );

      const pendingJobs = liveJobs.filter(j => {
        const key = `${(j.company || '').toLowerCase().trim()}::${(j.title || '').toLowerCase().trim()}`;
        return !existingKeys.has(key);
      });

      console.log(`[AggressivePortalRunner] 📋 Pending unapplied jobs: ${pendingJobs.length}`);

      if (pendingJobs.length > 0) {
        console.log(`[AggressivePortalRunner] 🎯 Launching application batch of up to ${BATCH_SIZE} jobs...`);
        const results = await runPortalApplicationCycle(pendingJobs, BATCH_SIZE);
        console.log(`[AggressivePortalRunner] ✅ Batch finished. Submitted: ${results.length}`);
      } else {
        console.log(`[AggressivePortalRunner] All current live jobs processed. Waiting for new openings...`);
      }

    } catch (err) {
      console.error(`[AggressivePortalRunner] ❌ Error in cycle: ${err.message}`);
    }

    console.log(`[AggressivePortalRunner] ⏳ Cooling down for ${COOLDOWN_BETWEEN_BATCHES_MS / 1000}s before next aggressive cycle...\n`);
    await new Promise(r => setTimeout(r, COOLDOWN_BETWEEN_BATCHES_MS));
  }
}

runAggressiveDaemon().catch(console.error);
