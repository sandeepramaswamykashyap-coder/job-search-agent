#!/bin/bash
# ==============================================================================
# 🚀 RESUME JOB SEARCH & APPLICATION AGENT — WATCHDOG MODE
# ==============================================================================
# Usage:
#   bash resume_agent.sh           # Launches watchdog (auto-heals all engines)
#   bash resume_agent.sh --silent  # Same, fully silent
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR" || exit 1

echo "======================================================================"
echo "⚡ RESUMING AUTONOMOUS JOB APPLICATION AGENT — WATCHDOG MODE"
echo "Timestamp: $(date)"
echo "Directory: $PROJECT_DIR"
echo "======================================================================"

# 1. Kill ALL stale processes
echo "🧹 [1/4] Killing all stale engines & locks..."
pkill -f "caffeinate -s -i -d" 2>/dev/null
pkill -f "live_continuous_submission_engine.js" 2>/dev/null
pkill -f "run_visible_portals.js" 2>/dev/null
pkill -f "inbox_auto_cleaner.js" 2>/dev/null
pkill -f "scheduler.js" 2>/dev/null
pkill -f "watchdog.js" 2>/dev/null
find . -name "SingletonLock" -delete 2>/dev/null
sleep 2

# 2. Prevent macOS sleep
echo "☕ [2/4] Activating macOS caffeinate..."
nohup caffeinate -s -i -d > /dev/null 2>&1 &

# 3. Set Playwright path
echo "🎭 [3/4] Configuring Playwright browser environment..."
export PLAYWRIGHT_BROWSERS_PATH="$PROJECT_DIR/.playwright-browsers"

# 4. Launch Watchdog (manages ALL other engines + auto-restarts on crash)
echo "🐕 [4/4] Launching Self-Healing Watchdog (manages all engines)..."
nohup node watchdog.js > "$PROJECT_DIR/watchdog.log" 2>&1 &
WATCHDOG_PID=$!

sleep 4

echo ""
echo "======================================================================"
echo "✅ WATCHDOG ACTIVE — ALL ENGINES MANAGED & AUTO-HEALING!"
echo "======================================================================"
node -e "
const fs = require('fs');
try {
  const apps = JSON.parse(fs.readFileSync('applications_history.json', 'utf8'));
  console.log('📊 Total verified submissions:', apps.length);
  const today = apps.filter(a => (a.time || a.appliedAt || '').startsWith(new Date().toISOString().slice(0, 10)));
  console.log('📈 Submissions today:', today.length);
} catch (_) {}
"
echo ""
echo "🐕 Watchdog PID: $WATCHDOG_PID (auto-restarts any crashed engine every 60s)"
echo "📋 Monitor: tail -f watchdog.log"
echo "📋 Portals: tail -f visible_portals.log"
echo "📋 Grinder: tail -f continuous_grinder.log"
echo "⏰ Next report: 8:00 PM IST"
echo "======================================================================"
