/**
 * Job Search & Application Agent - Dashboard API Server
 * Exposes endpoints to control the scheduler, modify configs, read logs, and trigger runs.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const configPath = path.join(__dirname, 'config.json');
const profilePath = path.join(__dirname, 'profile.json');
const credentialsPath = path.join(__dirname, 'credentials.json');

// Helper to get latest log file from system generated tasks
function getLatestLogFile() {
  const brainDir = path.join(__dirname, '../../brain');
  if (!fs.existsSync(brainDir)) return null;

  let allLogFiles = [];
  try {
    const convoDirs = fs.readdirSync(brainDir);
    for (const convo of convoDirs) {
      const taskLogsDir = path.join(brainDir, convo, '.system_generated', 'tasks');
      if (fs.existsSync(taskLogsDir)) {
        const files = fs.readdirSync(taskLogsDir)
          .filter(f => f.endsWith('.log'))
          .map(f => {
            const fullPath = path.join(taskLogsDir, f);
            return {
              name: f,
              path: fullPath,
              time: fs.statSync(fullPath).mtime.getTime()
            };
          });
        allLogFiles = allLogFiles.concat(files);
      }
    }
  } catch (e) {
    console.error('Error scanning logs:', e);
  }

  if (allLogFiles.length === 0) return null;
  allLogFiles.sort((a, b) => b.time - a.time);
  return allLogFiles[0].path;
}

// 1. Fetch current agent status and statistics
app.get('/api/status', (req, res) => {
  const latestLog = getLatestLogFile();
  let logContent = 'No logs available.';
  if (latestLog && fs.existsSync(latestLog)) {
    logContent = fs.readFileSync(latestLog, 'utf8');
  }

  // Read stats directly from stats.json (single source of truth)
  let stats = {
    jobsScanned: 0,
    applicationsSubmitted: 0,
    appliedRolesList: []
  };

  const statsPath = path.join(__dirname, 'stats.json');
  if (fs.existsSync(statsPath)) {
    try {
      const statsFileData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      const todayStr = new Date().toDateString();
      const todayApps = (statsFileData.appliedRolesList || []).filter(r => {
        try { return new Date(r.time).toDateString() === todayStr; } catch(_) { return false; }
      });
      stats = {
        jobsScanned: statsFileData.jobsScanned || 0,
        applicationsSubmitted: todayApps.length,
        appliedRolesList: statsFileData.appliedRolesList || []
      };
    } catch (e) {}
  }

  // Read emailed leads
  let emailedLeads = [];
  const emailedPath = path.join(__dirname, 'emailed_leads.json');
  if (fs.existsSync(emailedPath)) {
    try { emailedLeads = JSON.parse(fs.readFileSync(emailedPath, 'utf8')); } catch (e) {}
  }

  // Read LinkedIn connection requests
  let connectionRequests = [];
  const connPath = path.join(__dirname, 'connection_requests.json');
  if (fs.existsSync(connPath)) {
    try { connectionRequests = JSON.parse(fs.readFileSync(connPath, 'utf8')); } catch (e) {}
  }

  const todayStr = new Date().toDateString();
  const emailedToday = emailedLeads.filter(e => {
    try { return new Date(e.dispatchedAt).toDateString() === todayStr; } catch (_) { return false; }
  });
  const connToday = connectionRequests.filter(c => {
    try { return new Date(c.verifiedAt).toDateString() === todayStr; } catch (_) { return false; }
  });

  res.json({
    status: 'Running',
    nextRunTime: 'In 2 Hours (Calculated dynamically)',
    stats,
    outreachStats: {
      emailsSentTotal: emailedLeads.length,
      emailsSentToday: emailedToday.length,
      emailedLeadsList: emailedLeads,
      connectionsSentTotal: connectionRequests.length,
      connectionsSentToday: connToday.length,
      connectionsList: connectionRequests
    },
    logFile: latestLog ? path.basename(latestLog) : 'N/A'
  });
});

// 2. Fetch configurations
app.get('/api/config', (req, res) => {
  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    res.json({ config: configData, profile: profileData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Update configurations
app.post('/api/config', (req, res) => {
  try {
    const { config: newConfig, profile: newProfile } = req.body;
    if (newConfig) fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    if (newProfile) fs.writeFileSync(profilePath, JSON.stringify(newProfile, null, 2));
    res.json({ message: 'Configurations updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Fetch credentials list (passwords hidden)
app.get('/api/credentials', (req, res) => {
  try {
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const sanitized = {};
    for (const portal in creds) {
      if (portal === '_comment') continue;
      sanitized[portal] = {
        username: creds[portal].username,
        hasPassword: !!creds[portal].password && !creds[portal].password.includes('YOUR_')
      };
    }
    res.json(sanitized);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Update password for a specific portal
app.post('/api/credentials', (req, res) => {
  try {
    const { portal, username, password } = req.body;
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (!creds[portal]) creds[portal] = {};
    if (username) creds[portal].username = username;
    if (password) creds[portal].password = password;
    fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2));
    res.json({ message: `Credentials updated for ${portal}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Fetch live console logs
app.get('/api/logs', (req, res) => {
  const latestLog = getLatestLogFile();
  if (latestLog && fs.existsSync(latestLog)) {
    const content = fs.readFileSync(latestLog, 'utf8');
    res.send(content);
  } else {
    res.send('No activity logs recorded yet.');
  }
});

// 7. Trigger a cycle run immediately
app.post('/api/run-now', (req, res) => {
  console.log('[Server] Manual run triggered by dashboard user.');
  exec('node run-now.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`[Server] Manual run error: ${error.message}`);
      return res.status(500).json({ output: stdout, error: error.message });
    }
    res.json({ output: stdout });
  });
});

// 7b. Trigger Boolean Lead Discovery & Scraping run
app.post('/api/run-boolean-discovery', (req, res) => {
  console.log('[Server] Manual Boolean Discovery triggered by dashboard user.');
  exec('node run_boolean_discovery.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`[Server] Boolean Discovery run error: ${error.message}`);
      return res.status(500).json({ output: stdout, error: error.message });
    }
    res.json({ output: stdout });
  });
});

// 8. Fetch cover letter template
app.get('/api/cover-letter', (req, res) => {
  try {
    const coverLetterPath = path.join(__dirname, 'cover_letter.txt');
    if (fs.existsSync(coverLetterPath)) {
      const content = fs.readFileSync(coverLetterPath, 'utf8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 9. Update cover letter template
app.post('/api/cover-letter', (req, res) => {
  try {
    const { content } = req.body;
    const coverLetterPath = path.join(__dirname, 'cover_letter.txt');
    fs.writeFileSync(coverLetterPath, content, 'utf8');
    res.json({ message: 'Cover letter updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Dashboard UI running at http://localhost:${PORT}`);
});
