/**
 * WATCHDOG — Self-Healing Process Monitor
 * Checks every 60s that all engines are alive.
 * Auto-restarts any crashed process immediately.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const LOG = (msg) => console.log(`[Watchdog ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}] ${msg}`);

const ENGINES = [
  {
    name: 'VisiblePortals',
    script: 'run_visible_portals.js',
    log: 'visible_portals.log',
    nice: 0,
  },
  {
    name: 'QuadGrinder',
    script: 'live_continuous_submission_engine.js',
    log: 'continuous_grinder.log',
    nice: 15,
  },
  {
    name: 'Scheduler',
    script: 'scheduler.js',
    log: 'scheduler.log',
    nice: 0,
  },
  {
    name: 'InboxCleaner',
    script: 'inbox_auto_cleaner.js',
    log: 'inbox_cleaner.log',
    nice: 19,
  },
];

const processes = {};

function isRunning(script) {
  try {
    const result = execSync(`pgrep -f "node ${script}"`, { encoding: 'utf8' }).trim();
    return result.length > 0;
  } catch (_) {
    return false;
  }
}

function startEngine(engine) {
  LOG(`🚀 Starting ${engine.name} (${engine.script})...`);
  const logStream = fs.openSync(path.join(DIR, engine.log), 'a');
  const child = spawn('node', [path.join(DIR, engine.script)], {
    detached: true,
    stdio: ['ignore', logStream, logStream],
    cwd: DIR,
  });
  child.unref();
  processes[engine.script] = child.pid;
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

