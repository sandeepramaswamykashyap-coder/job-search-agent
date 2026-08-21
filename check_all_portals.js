/**
 * COMPREHENSIVE ALL-PORTAL CHECK
 * Tests all 19 portals — connectivity, data extraction, and job matching status.
 * Indian portals: naukri, iimjobs, foundit, linkedin, instahyre, indeed,
 *                 hirist, cutshort, wellfound, glassdoor, shine, timesjobs
 * Global Remote:  weworkremotely, remoteok, jobgether, remotive,
 *                 workingnomads, surelyremote, dailyremote
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

const statsFile = path.join(__dirname, 'stats.json');
const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

function ok(msg)   { console.log(`  ${GREEN}✅${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}❌${RESET} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}⚠️ ${RESET} ${msg}`); }
function info(msg) { console.log(`  ${CYAN}ℹ️ ${RESET} ${msg}`); }

// Quick HTTP probe — just checks connectivity + status code
function probe(url, label) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : require('http');
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/json,*/*;q=0.8',
      },
      timeout: 10000
    }, (res) => {
      let size = 0;
      res.on('data', c => { size += c.length; if (size > 2000) req.destroy(); });
      res.on('end', () => resolve({ label, url, status: res.statusCode, bytes: size, ok: res.statusCode < 400 }));
    });
    req.on('error', e => resolve({ label, url, status: 0, error: e.message, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ label, url, status: 0, error: 'timeout', ok: false }); });
  });
}

// Count applications per portal from stats
function countApps(portalKey) {
  return (stats.appliedRolesList || []).filter(r => r.portal === portalKey).length;
}
function lastApp(portalKey) {
  const apps = (stats.appliedRolesList || []).filter(r => r.portal === portalKey);
  if (!apps.length) return 'Never';
  const last = apps[apps.length - 1];
  return `${last.time ? new Date(last.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Unknown'} — ${last.title} @ ${last.company}`;
}
function countRemote(portalKey) {
  return (stats.remoteJobs || []).filter(r => r.portal === portalKey).length;
}

async function runAllChecks() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║        COMPLETE PORTAL HEALTH CHECK — ALL 19 WEBSITES            ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  Run time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log(`  Total applications in system: ${BOLD}${stats.applicationsSubmitted || 0}${RESET}\n`);

  const results = [];

  const userConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

  const indianPortals = [
    { key: 'naukri',    label: 'Naukri',     url: 'https://www.naukri.com/program-manager-jobs', enabled: userConfig.platforms?.naukri?.enabled ?? true,  dailyCap: userConfig.platforms?.naukri?.max_applications_per_day || 95  },
    { key: 'iimjobs',   label: 'IIMJobs',    url: 'https://www.iimjobs.com/j/program-manager',   enabled: userConfig.platforms?.iimjobs?.enabled ?? true,  dailyCap: userConfig.platforms?.iimjobs?.max_applications_per_day || 40  },
    { key: 'foundit',   label: 'Foundit',    url: 'https://www.foundit.in/srp/results?query=program+manager', enabled: userConfig.platforms?.foundit?.enabled ?? true, dailyCap: userConfig.platforms?.foundit?.max_applications_per_day || 40 },
    { key: 'linkedin',  label: 'LinkedIn',   url: 'https://www.linkedin.com/jobs/search/?keywords=program+manager', enabled: userConfig.platforms?.linkedin?.enabled ?? true, dailyCap: userConfig.platforms?.linkedin?.max_applications_per_day || 25 },
    { key: 'instahyre', label: 'Instahyre',  url: 'https://www.instahyre.com/candidate/opportunities', enabled: userConfig.platforms?.instahyre?.enabled ?? true, dailyCap: userConfig.platforms?.instahyre?.max_applications_per_day || 30 },
    { key: 'indeed',    label: 'Indeed',     url: 'https://in.indeed.com/jobs?q=program+manager', enabled: userConfig.platforms?.indeed?.enabled ?? true, dailyCap: userConfig.platforms?.indeed?.max_applications_per_day || 40 },
    { key: 'hirist',    label: 'Hirist',     url: 'https://www.hirist.tech/j/program-manager',   enabled: userConfig.platforms?.hirist?.enabled ?? true,  dailyCap: userConfig.platforms?.hirist?.max_applications_per_day || 30  },
    { key: 'cutshort',  label: 'Cutshort',   url: 'https://cutshort.io/jobs',                    enabled: userConfig.platforms?.cutshort?.enabled ?? true,  dailyCap: userConfig.platforms?.cutshort?.max_applications_per_day || 20  },
    { key: 'wellfound', label: 'Wellfound',  url: 'https://wellfound.com/jobs?q=program+manager', enabled: userConfig.platforms?.wellfound?.enabled ?? true, dailyCap: userConfig.platforms?.wellfound?.max_applications_per_day || 15  },
    { key: 'glassdoor', label: 'Glassdoor',  url: 'https://www.glassdoor.co.in/Job/india-program-manager-jobs-SRCH_IL.0,5_IN115_KO6,21.htm', enabled: userConfig.platforms?.glassdoor?.enabled ?? true, dailyCap: userConfig.platforms?.glassdoor?.max_applications_per_day || 30 },
    { key: 'shine',     label: 'Shine',      url: 'https://www.shine.com/job-search/program-manager-jobs', enabled: userConfig.platforms?.shine?.enabled ?? true, dailyCap: userConfig.platforms?.shine?.max_applications_per_day || 35 },
    { key: 'timesjobs', label: 'TimesJobs',  url: 'https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=program+manager', enabled: userConfig.platforms?.timesjobs?.enabled ?? true, dailyCap: userConfig.platforms?.timesjobs?.max_applications_per_day || 20 },
  ];

  for (const p of indianPortals) {
    process.stdout.write(`\n${BOLD}[${p.label}]${RESET} `);
    if (!p.enabled) { warn(`DISABLED in config`); results.push({ ...p, reachable: null, disabled: true }); continue; }

    const probe_result = await probe(p.url, p.label);
    const apps = countApps(p.key);
    const last = lastApp(p.key);

    if (probe_result.ok) {
      ok(`Reachable (HTTP ${probe_result.status}) | Applied: ${BOLD}${apps}${RESET} | Daily cap: ${p.dailyCap}`);
      info(`Last: ${last}`);
      results.push({ ...p, reachable: true, apps, status: probe_result.status });
    } else {
      fail(`${probe_result.error || `HTTP ${probe_result.status}`} | Applied: ${apps}`);
      results.push({ ...p, reachable: false, apps, error: probe_result.error });
    }
  }

  // ── GROUP 2: GLOBAL REMOTE PORTALS ───────────────────────────────────────
  console.log(`\n\n${BOLD}━━━ GROUP 2: GLOBAL REMOTE PORTALS ━━━${RESET}`);

  const remotePortals = [
    {
      key: 'weworkremotely', label: 'We Work Remotely',
      url: 'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss',
      method: 'RSS Feed', enabled: true, dailyCap: 25
    },
    {
      key: 'remoteok', label: 'RemoteOK',
      url: 'https://remoteok.com/remote-management-jobs.json',
      method: 'JSON API', enabled: true, dailyCap: 25
    },
    {
      key: 'jobgether', label: 'Jobgether',
      url: 'https://jobgether.com/jobs?query=program+manager&remote=true',
      method: 'Browser (SPA)', enabled: true, dailyCap: 25
    },
    {
      key: 'remotive', label: 'Remotive',
      url: 'https://remotive.com/api/remote-jobs?search=program+manager&limit=5',
      method: 'JSON API (Cloudflare)', enabled: true, dailyCap: 25
    },
    {
      key: 'workingnomads', label: 'Working Nomads',
      url: 'https://www.workingnomads.com/api/exposed_jobs/?category=management',
      method: 'JSON API', enabled: true, dailyCap: 25
    },
    {
      key: 'surelyremote', label: 'Surely Remote',
      url: 'https://surelyremote.com/jobs',
      method: 'HTTP scrape', enabled: true, dailyCap: 25
    },
    {
      key: 'dailyremote', label: 'DailyRemote',
      url: 'https://dailyremote.com/remote-management-jobs',
      method: 'Browser (SPA)', enabled: true, dailyCap: 25
    },
  ];

  for (const p of remotePortals) {
    process.stdout.write(`\n${BOLD}[${p.label}]${RESET} `);
    const probe_result = await probe(p.url, p.label);
    const discovered = countRemote(p.key);
    const apps = countApps(p.key);

    let statusStr = probe_result.ok
      ? `${GREEN}✅ Reachable (HTTP ${probe_result.status})${RESET}`
      : `${RED}❌ ${probe_result.error || `HTTP ${probe_result.status}`}${RESET}`;

    console.log(statusStr);
    info(`Method: ${p.method} | Discovered: ${discovered} | Applied: ${BOLD}${apps}${RESET} | Cap: ${p.dailyCap}/day`);
    if (!probe_result.ok) warn(`ISSUE: ${p.url} returned ${probe_result.status || probe_result.error}`);

    results.push({ ...p, reachable: probe_result.ok, apps, discovered, status: probe_result.status });
  }

  // ── SUMMARY TABLE ─────────────────────────────────────────────────────────
  console.log(`\n\n${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║                      SUMMARY REPORT                             ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}`);

  const working   = results.filter(r => r.reachable === true && !r.disabled);
  const broken    = results.filter(r => r.reachable === false);
  const disabled  = results.filter(r => r.disabled);

  console.log(`\n  ${GREEN}✅ Working:  ${working.length}${RESET}  |  ${RED}❌ Issues: ${broken.length}${RESET}  |  ⚪ Disabled: ${disabled.length}`);
  console.log(`\n  ${BOLD}Portal                Apps    Status${RESET}`);
  console.log('  ' + '─'.repeat(55));
  results.forEach(r => {
    const appStr = String(r.apps || 0).padStart(5);
    let statusIcon = r.disabled ? '⚪ DISABLED' : r.reachable ? `${GREEN}✅ OK${RESET}` : `${RED}❌ FAIL${RESET}`;
    console.log(`  ${r.label.padEnd(22)} ${appStr}   ${statusIcon}`);
  });

  console.log(`\n  ${BOLD}Total applications logged: ${stats.applicationsSubmitted || 0}${RESET}`);
  console.log(`  ${BOLD}Total jobs scanned: ${stats.jobsScanned || 0}${RESET}`);

  if (broken.length > 0) {
    console.log(`\n  ${RED}${BOLD}Portals needing attention:${RESET}`);
    broken.forEach(r => console.log(`  ${RED}→ ${r.label}: ${r.error || `HTTP ${r.status}`}${RESET}`));
  }

  console.log('\n');
}

runAllChecks().catch(console.error);
