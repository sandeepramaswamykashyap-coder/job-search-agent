/**
 * Job Search & Application Agent - Scheduler & Coordinator
 * Coordinates 24/7 automated search, daily CV updates, and 8 PM IST daily email reporting.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Keep macOS awake when locked or display turns off
try {
  const caffeinate = spawn('caffeinate', ['-s', '-i', '-d']);
  caffeinate.unref();
  console.log("[Scheduler] ☕ Caffeinate active: macOS sleep prevented during 24/7 background run.");
} catch (e) {}

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { runAgentCycle } = require('./agent');
const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');
const { runOvernightOutreachCycle } = require('./overnight_runner');
const { sendDailyReport } = require('./reporter');

// Load configurations
const configPath = path.join(__dirname, 'config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  console.warn("WARNING: config.json not found, utilizing defaults from template.");
  config = {
    scheduler: { run_interval_hours: 2, max_start_jitter_minutes: 15, daily_report_time: "20:00" }
  };
}

// Global run statistics
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
        log(`Restored stats from today: Scanned=${stats.jobsScanned}, Submitted=${stats.applicationsSubmitted}`);
      } else {
        log(`Saved stats are from a different date (${savedStats.date}). Initializing fresh stats.`);
      }
    } catch (e) {
      console.warn(`[Scheduler] Failed to load stats: ${e.message}`);
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
  } catch (e) {
    console.warn(`[Scheduler] Failed to save stats: ${e.message}`);
  }
}

loadStats();

/**
 * Calculates a random jitter in milliseconds
 */
function getJitterMs() {
  const maxMinutes = config.scheduler.max_start_jitter_minutes || 15;
  const jitterMinutes = (Math.random() * 2 - 1) * maxMinutes; // Random value between -maxMinutes and +maxMinutes
  return Math.round(jitterMinutes * 60 * 1000);
}

/**
 * Helper to log with timestamps
 */
function log(msg) {
  console.log(`[${new Date().toISOString()}] [Scheduler] ${msg}`);
}

/**
 * Check and run CV refresh on job portals
 */
async function checkAndRunCVRefresh() {
  const todayStr = new Date().toDateString();
  const forceHeaded = (config.scheduler.browser_mode === 'headed');
  if (stats.lastCVUploadDate !== todayStr) {
    log("First run of the day: Initiating daily CV upload sequence (excluding LinkedIn)...");
    try {
      await runAgentCycle({ refreshCVOnly: true, stats, forceHeaded });
      stats.lastCVUploadDate = todayStr;
      log("Daily CV upload completed successfully.");
    } catch (err) {
      log(`Error uploading CV: ${err.message}`);
      stats.failures.push({ time: new Date().toISOString(), context: "CV Upload", error: err.message });
    }
  }
}

/**
 * Core loop executor
 */
async function executeCycle() {
  log("Starting new job search and application cycle...");
  const forceHeaded = (config.scheduler.browser_mode === 'headed');
  log(`Browser mode: ${forceHeaded ? 'Visible Window (Headed)' : 'Silent Background (Headless)'}`);
  try {
    // 1. Refresh CV if needed
    await checkAndRunCVRefresh();
    saveStats();

    // 2. Remote portals first — WeWorkRemotely, RemoteOK, Jobgether, Remotive, WorkingNomads, SurelyRemote, DailyRemote
    log('Starting REMOTE portals sweep (priority 1-7)...');
    await runAllGlobalRemoteSweeps().catch(e => log(`Remote sweep warning: ${e.message}`));
    saveStats();

    // 3. Indian portals — Naukri, IIMJobs, Foundit, LinkedIn, Instahyre, etc.
    log('Starting INDIAN portals sweep (priority 8-19)...');
    await runAgentCycle({ refreshCVOnly: false, stats, forceHeaded });
    saveStats();

    // 4. Perform overnight autonomous lead discovery, email outreach, and connection dispatch
    await runOvernightOutreachCycle().catch(e => log(`Overnight outreach warning: ${e.message}`));
    saveStats();
    
    log("Cycle completed successfully.");
  } catch (err) {
    log(`Critical error during cycle execution: ${err.message}`);
    stats.failures.push({ time: new Date().toISOString(), context: "Cycle Execution", error: err.message });
    saveStats();
  }

  // Schedule the next cycle with jitter
  scheduleNextRun();
}

/**
 * Schedules the next cycle after the 2-hour interval + random jitter
 */
function scheduleNextRun() {
  const intervalMs = (config.scheduler.run_interval_hours || 2) * 60 * 60 * 1000;
  const jitterMs = getJitterMs();
  const delay = Math.max(1000, intervalMs + jitterMs); // ensure positive delay

  log(`Next run scheduled in ${Math.round(delay / 1000 / 60)} minutes (Interval: ${config.scheduler.run_interval_hours}h, Jitter: ${Math.round(jitterMs / 1000 / 60)}m)`);
  setTimeout(executeCycle, delay);
}

/**
 * Schedules the daily 8 AM IST report (Morning EOD Report)
 */
let lastReportDate = null;
function scheduleDailyReport() {
  setInterval(async () => {
    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (3600000 * 5.5));

    const todayStr = istTime.toDateString();
    // Check if it's 8 AM IST (08:00) or later, and we haven't sent a report today
    if (istTime.getHours() >= 8 && lastReportDate !== todayStr) {
      log("It is 8 AM IST or later. Executing pre-report recruiter outreach flush to reach maximum daily capacity...");
      try {
        const { processOutreachQueue } = require('./outreach_mailer');
        await processOutreachQueue();
        log("Pre-report outreach flush completed. Dispatching morning 8 AM IST daily email report...");
        await sendDailyReport(stats);
        log("Morning 8 AM IST daily report email & recruiter pitch dispatch completed.");
        lastReportDate = todayStr;
        
        // Reset daily stats after sending the morning report
        stats.jobsScanned = 0;
        stats.applicationsSubmitted = 0;
        stats.appliedRolesList = [];
        stats.failures = [];
        saveStats();
      } catch (err) {
        log(`Failed to dispatch morning 8 AM daily report: ${err.message}`);
      }
    }
  }, 60 * 1000); // Check every minute
}

// Start the scheduler
log("Google Antigravity Job Search & Application Agent Scheduler initialized.");
log("24/7 service started.");
executeCycle();
scheduleDailyReport();
