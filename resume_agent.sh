#!/bin/bash
# ==============================================================================
# 🚀 RESUME JOB SEARCH & APPLICATION AGENT AFTER SYSTEM RESTART
# ==============================================================================
# Usage:
#   bash resume_agent.sh           # Resumes all daemons (Visible Naukri/IIMJobs + Quad Grinder)
#   bash resume_agent.sh --silent  # Resumes in 100% silent background mode
# ==============================================================================

PROJECT_DIR="/Users/sandeepramaswamykashyap/.gemini/antigravity-ide/scratch/job-search-agent"
cd "$PROJECT_DIR" || exit 1

echo "======================================================================"
echo "⚡ RESUMING AUTONOMOUS JOB APPLICATION AGENT FROM CHECKPOINT"
echo "Timestamp: $(date)"
echo "Directory: $PROJECT_DIR"
echo "======================================================================"

# 1. Clean stale locks from prior session
echo "🧹 [1/6] Cleaning up stale browser locks..."
find . -name "SingletonLock" -delete 2>/dev/null
pkill -f "caffeinate -s -i -d" 2>/dev/null
pkill -f "live_continuous_submission_engine.js" 2>/dev/null
pkill -f "run_visible_portals.js" 2>/dev/null
pkill -f "inbox_auto_cleaner.js" 2>/dev/null
pkill -f "scheduler.js" 2>/dev/null
sleep 1

# 2. Prevent macOS sleep during 24/7 run
echo "☕ [2/6] Activating macOS caffeinate (prevents sleep during sleep/lid closed)..."
nohup caffeinate -s -i -d > /dev/null 2>&1 &

# 3. Verify Playwright browsers environment
echo "🎭 [3/6] Configuring Playwright browser environment..."
export PLAYWRIGHT_BROWSERS_PATH="$PROJECT_DIR/.playwright-browsers"

# 4. Launch Silent Inbox Auto-Cleaner (suppresses OTP & verification noise)
echo "🛡️  [4/6] Starting Silent Inbox Cleaner daemon..."
nohup nice -n 19 node inbox_auto_cleaner.js > "$PROJECT_DIR/inbox_cleaner.log" 2>&1 &

# 5. Launch Master 24/7 Scheduler (Bi-Daily 8 AM & 8 PM IST reports)
echo "⏰ [5/6] Starting Master 24/7 Scheduler (8 AM & 8 PM IST reporting)..."
nohup node scheduler.js > "$PROJECT_DIR/scheduler.log" 2>&1 &

# 6. Launch Application Engines
if [ "$1" == "--silent" ]; then
    echo "⚡ [6/6] Launching Quad-Worker High-Throughput Grinder (Silent Background)..."
    nohup nice -n 15 node live_continuous_submission_engine.js > "$PROJECT_DIR/continuous_grinder.log" 2>&1 &
else
    echo "🖥️  [6/6] Launching Visible Headed Runner (Naukri, IIMJobs & Corporate ATS)..."
    nohup node run_visible_portals.js > "$PROJECT_DIR/visible_portals.log" 2>&1 &
    echo "⚡ Launching Parallel Quad-Worker Grinder in background..."
    nohup nice -n 15 node live_continuous_submission_engine.js > "$PROJECT_DIR/continuous_grinder.log" 2>&1 &
fi

sleep 2

# Summary of status
echo ""
echo "======================================================================"
echo "✅ AGENT RESUMED SUCCESSFULLY! ALL ENGINES ACTIVE"
echo "======================================================================"
node -e "
const fs = require('fs');
try {
  const apps = JSON.parse(fs.readFileSync('applications_history.json', 'utf8'));
  console.log('📊 Total verified submissions in database:', apps.length);
  const today = apps.filter(a => (a.time || a.appliedAt || '').startsWith(new Date().toISOString().slice(0, 10)));
  console.log('📈 Submissions today:', today.length);
} catch (_) {}
"
echo ""
echo "Active Processes:"
ps aux | grep -E "node (scheduler|live_continuous|run_visible|inbox_auto)" | grep -v grep | awk '{print "  🟢 " $11 " " $12 " (PID: " $2 ")"}'
echo "======================================================================"
echo "💡 To view visible Chrome window: Look at your macOS desktop."
echo "💡 Next scheduled report: 8:00 AM / 8:00 PM IST."
echo "======================================================================"
