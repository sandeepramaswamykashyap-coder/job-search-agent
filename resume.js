/**
 * resume.js — Cross-platform Node.js launcher to resume the agent after restart
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = __dirname;
process.chdir(PROJECT_DIR);

console.log('======================================================================');
console.log('⚡ RESUMING AUTONOMOUS JOB APPLICATION AGENT FROM CHECKPOINT');
console.log(`Timestamp: ${new Date().toLocaleString()}`);
console.log(`Directory: ${PROJECT_DIR}`);
console.log('======================================================================');

// 1. Clean stale locks
console.log('🧹 [1/5] Cleaning stale locks...');
try {
  const dirs = ['.browser_session', '.browser_session_visible', '.browser_session_live_continuous', '.browser_session_portals'];
  dirs.forEach(d => {
    const lock = path.join(PROJECT_DIR, d, 'SingletonLock');
    if (fs.existsSync(lock)) fs.unlinkSync(lock);
  });
} catch (_) {}

// 2. Kill old orphan processes
try {
  execSync('pkill -9 -f "live_continuous_submission_engine.js" || true', { stdio: 'ignore' });
  execSync('pkill -9 -f "run_visible_portals.js" || true', { stdio: 'ignore' });
  execSync('pkill -9 -f "scheduler.js" || true', { stdio: 'ignore' });
  execSync('pkill -9 -f "inbox_auto_cleaner.js" || true', { stdio: 'ignore' });
} catch (_) {}

// 3. Keep macOS awake
try {
  const caffeinate = spawn('caffeinate', ['-s', '-i', '-d'], { detached: true, stdio: 'ignore' });
  caffeinate.unref();
  console.log('☕ [2/5] macOS Caffeinate activated (sleep prevented).');
} catch (_) {}

// 4. Start Daemons with dedicated log streams for full visibility
const engineLog = fs.openSync(path.join(PROJECT_DIR, 'engine.log'), 'a');
const schedulerLog = fs.openSync(path.join(PROJECT_DIR, 'scheduler.log'), 'a');
const portalsLog = fs.openSync(path.join(PROJECT_DIR, 'portals.log'), 'a');
const inboxLog = fs.openSync(path.join(PROJECT_DIR, 'inbox.log'), 'a');

console.log('🛡️  [3/5] Starting Inbox Cleaner (logging to inbox.log)...');
const cleaner = spawn('nice', ['-n', '19', 'node', 'inbox_auto_cleaner.js'], { detached: true, stdio: ['ignore', inboxLog, inboxLog] });
cleaner.unref();

console.log('⏰ [4/5] Starting Master Scheduler (logging to scheduler.log)...');
const scheduler = spawn('node', ['scheduler.js'], { detached: true, stdio: ['ignore', schedulerLog, schedulerLog] });
scheduler.unref();

console.log('🖥️  [5/5] Launching Visible Headed Runner (logging to portals.log)...');
const visible = spawn('node', ['run_visible_portals.js'], { detached: true, stdio: ['ignore', portalsLog, portalsLog] });
visible.unref();

console.log('⚡ Launching Parallel Quad-Worker Grinder (logging to engine.log)...');
const grinder = spawn('nice', ['-n', '15', 'node', 'live_continuous_submission_engine.js'], { detached: true, stdio: ['ignore', engineLog, engineLog] });
grinder.unref();

setTimeout(() => {
  console.log('\n======================================================================');
  console.log('✅ ALL ENGINES ACTIVE & RUNNING!');
  try {
    const apps = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'applications_history.json'), 'utf8'));
    console.log(`📊 Cumulative verified applications: ${apps.length}`);
  } catch (_) {}
  console.log('======================================================================\n');
  process.exit(0);
}, 2000);
