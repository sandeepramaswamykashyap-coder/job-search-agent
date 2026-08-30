/**
 * aggressive_tier1_orchestrator.js — Aggressive Tier-1 Company Portals & Executive Outreach Engine
 *
 * Exclusively executes:
 * 1. Direct Tier-1 Corporate ATS Applications (Greenhouse, Lever, SmartRecruiters, Workday)
 * 2. Targeted Recruiter & Hiring Manager Outreach (Original Approved Formats + Tailored CV)
 * 3. Indian Executive Portals (Naukri & IIMJobs)
 *
 * Strict Rules:
 * - 0 Standard Chartered Bank (SCB) contacts or applications
 * - Authentic candidate profile: Transformation Program Leader / Manager (14 Yrs SCB)
 * - Correct LinkedIn URL: https://www.linkedin.com/in/sandeepramaswamykashyap/
 * - 0 Generic aggregator feeds (DailyRemote/Jobgether disabled)
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

const { runPortalApplicationCycle } = require('./portal_router');
const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { processOutreachQueue } = require('./outreach_mailer');
const { getAllApplications } = require('./applications_db');

const BATCH_SIZE = 40;
const LOOP_PAUSE_MS = 30 * 1000; // 30s pause between major sweeps

async function runAggressiveEngine() {
  console.log('======================================================================');
  console.log('🚀 [AggressiveTier1Engine] Initialized — High-Volume Tier-1 & Outreach');
  console.log(`Execution Start: ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  let cycleNumber = 1;

  while (true) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`⚡ [Cycle #${cycleNumber}] Starting Tier-1 Ingestion & Application Sweep...`);
    console.log(`----------------------------------------------------------------------`);

    try {
      // 1. Fetch live jobs across all Tier-1 Greenhouse, Lever, SmartRecruiters endpoints
      const liveJobs = await fetchAllLiveATSJobs().catch(e => {
        console.warn(`[AggressiveTier1Engine] ATS fetch error: ${e.message}`);
        return [];
      });

      console.log(`[AggressiveTier1Engine] 🌐 Live Tier-1 openings active: ${liveJobs.length}`);

      // Filter unapplied
      const existing = getAllApplications();
      const existingKeys = new Set(
        existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
      );

      const pending = liveJobs.filter(j => {
        const key = `${(j.company || '').toLowerCase().trim()}::${(j.title || '').toLowerCase().trim()}`;
        return !existingKeys.has(key);
      });

      console.log(`[AggressiveTier1Engine] 📋 Unapplied Tier-1 target roles: ${pending.length}`);

      if (pending.length > 0) {
        console.log(`[AggressiveTier1Engine] 🎯 Executing application batch of up to ${BATCH_SIZE} roles...`);
        const submitted = await runPortalApplicationCycle(pending, BATCH_SIZE);
        console.log(`[AggressiveTier1Engine] ✅ Batch complete: ${submitted.length} applications submitted.`);
      } else {
        console.log(`[AggressiveTier1Engine] All current Tier-1 roles applied. Standing by for new listings.`);
      }

      // 2. Trigger Targeted Recruiter & Hiring Manager Outreach
      console.log(`\n[AggressiveTier1Engine] 📧 Checking Recruiter & Hiring Manager Outreach Queue...`);
      try {
        await processOutreachQueue();
      } catch (err) {
        console.warn(`[AggressiveTier1Engine] Outreach queue notice: ${err.message}`);
      }

    } catch (err) {
      console.error(`[AggressiveTier1Engine] ❌ Error in cycle #${cycleNumber}: ${err.message}`);
    }

    cycleNumber++;
    console.log(`\n[AggressiveTier1Engine] ⏳ Cooldown for ${LOOP_PAUSE_MS / 1000}s before next high-volume sweep...\n`);
    await new Promise(r => setTimeout(r, LOOP_PAUSE_MS));
  }
}

runAggressiveEngine().catch(console.error);
