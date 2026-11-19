/**
 * WATCHDOG — Self-Healing Process Monitor
 * Checks every 60s that all engines are alive.
 * Auto-restarts any crashed process immediately.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const LOG = (msg) => console.log(`[Watchdog ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}] ${msg}`);

const ENGINES = [
  {
    name: 'VisiblePortals',
    script: 'run_visible_portals.js',
    log: 'visible_portals.log',
  },
  {
    name: 'QuadGrinder',
    script: 'live_continuous_submission_engine.js',
    log: 'continuous_grinder.log',
  },
  {
    name: 'Scheduler',
    script: 'scheduler.js',
    log: 'scheduler.log',
  },
  {
    name: 'InboxCleaner',
    script: 'inbox_auto_cleaner.js',
    log: 'inbox_cleaner.log',
  },
];

// Track child processes by script name — no pgrep needed
const processes = {};

function isRunning(script) {
  const child = processes[script];
  if (!child) return false;
  // exitCode is null while still running
  return child.exitCode === null && !child.killed;
}

function startEngine(engine) {
  LOG(`🚀 Starting ${engine.name} (${engine.script})...`);
  const logStream = fs.openSync(path.join(DIR, engine.log), 'a');
  const child = spawn('node', [path.join(DIR, engine.script)], {
    stdio: ['ignore', logStream, logStream],
    cwd: DIR,
  });
  // Keep reference alive so isRunning() can track exit status
  processes[engine.script] = child;
  child.on('exit', (code) => {
    LOG(`⚠️  ${engine.name} exited (code ${code}). Will restart on next health check.`);
  });
  LOG(`✅ ${engine.name} started (PID: ${child.pid})`);
}

function checkAndHeal() {
  LOG('🔍 Health check...');
  let allOk = true;
  for (const engine of ENGINES) {
    if (!isRunning(engine.script)) {
      LOG(`❌ ${engine.name} is DOWN — restarting...`);
      startEngine(engine);
      allOk = false;
    } else {
      LOG(`🟢 ${engine.name} OK`);
    }
  }
  if (allOk) LOG('✅ All engines healthy.');
}

// Initial start of all engines
LOG('🐕 Watchdog online — starting all engines...');
checkAndHeal();

// Check every 60 seconds
setInterval(checkAndHeal, 60 * 1000);

LOG('⚡ Watchdog monitoring active. Engines auto-restart on crash.');

