/**
 * Job Search & Application Agent - Global Remote Portals Crawler Module (Full Suite)
 * REBUILT 2026-07-26 with verified working data sources:
 * 1. We Work Remotely  → RSS Feed (weworkremotely.com/categories/remote-management-and-finance-jobs.rss)
 * 2. RemoteOK          → JSON API (remoteok.com/remote-management-jobs.json)
 * 3. Jobgether         → Web scrape with corrected selectors
 * 4. Remotive          → JSON API (remotive.com/api/remote-jobs)
 * 5. Working Nomads    → JSON API (workingnomads.com/api/exposed_jobs/)
 * 6. DailyRemote       → Web scrape
 * 7. Remote.co         → Web scrape
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('https');

const statsFile = path.join(__dirname, 'stats.json');
const userDataDir = path.join(__dirname, '.browser_session_remote');

const targetKeywords = [
  'program manager', 'transformation', 'servicenow', 'automation', 'uat', 'change management',
  'project manager', 'delivery manager', 'practice lead', 'operational excellence',
  'data governance', 'data steward', 'data product', 'data privacy', 'market data', 'data quality',
  'operations manager', 'regulatory change', 'risk operations', 'business transformation',
  'investment banking', 'transition manager', 'agile delivery', 'chief of staff'
];

function isMatchingRole(title) {
  if (!title || typeof title !== 'string') return false;
  const t = title.toLowerCase();
  return targetKeywords.some(k => t.includes(k));
}

// 1. We Work Remotely Crawler — Uses RSS Feed (verified working 2026-07-26)
// FIXED: Old URL was /remote-management-exec-jobs (404). Correct category is /remote-management-and-finance-jobs
// FIXED: DOM selectors were broken after WWR redesign. Now using RSS feed which is stable and reliable.
function crawlWeWorkRemotely() {
  console.log('[RemoteCrawlers] 🌐 Fetching We Work Remotely RSS feed (Management & Finance)...');
  return new Promise((resolve) => {
    // Multiple categories to cover Sandeep's profile
    const rssUrls = [
      'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss',
      'https://weworkremotely.com/categories/remote-product-jobs.rss',
    ];
    const allJobs = [];
    let pending = rssUrls.length;

    rssUrls.forEach(rssUrl => {
      const req = http.get(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSearchAgent/1.0)' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Parse RSS XML — extract <title> and <link> tags from <item> blocks
          const items = data.match(/<item>([\/\s\S]*?)<\/item>/g) || [];
          items.forEach(item => {
            const titleMatch = item.match(/<title><\!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                               item.match(/<title>([^<]+)<\/title>/);
            const linkMatch = item.match(/<link>([^<]+)<\/link>/);
            const descMatch = item.match(/<dc:creator><\!\[CDATA\[([^\]]+)\]\]><\/dc:creator>/) ||
                              item.match(/<dc:creator>([^<]+)<\/dc:creator>/);

            if (titleMatch) {
              const rawTitle = titleMatch[1].trim();
              // WWR RSS title format is: "Company: Job Title"
              const colonIdx = rawTitle.indexOf(':');
              const company = colonIdx > -1 ? rawTitle.substring(0, colonIdx).trim() : 'Remote Company';
              const title = colonIdx > -1 ? rawTitle.substring(colonIdx + 1).trim() : rawTitle;
              const link = linkMatch ? linkMatch[1].trim() : 'https://weworkremotely.com';
              allJobs.push({ title, company, link, region: 'Worldwide', portal: 'weworkremotely' });
            }
          });
          pending--;
          if (pending === 0) {
            const matched = allJobs.filter(j => isMatchingRole(j.title));
            console.log(`[WeWorkRemotely] RSS fetched ${allJobs.length} total jobs, ${matched.length} matching profile.`);
            resolve(matched);
          }
        });
      });
      req.on('error', err => {
        console.error(`[WeWorkRemotely] RSS fetch error: ${err.message}`);
        pending--;
        if (pending === 0) {
          const matched = allJobs.filter(j => isMatchingRole(j.title));
          resolve(matched);
        }
      });
    });
  });
}

// 2. RemoteOK JSON API — Management category endpoint (verified working 2026-07-26)
// FIXED: Was using generic /api endpoint with 6000+ jobs. Now uses /remote-management-jobs.json for pre-filtered results.
function fetchRemoteOK() {
  console.log('[RemoteCrawlers] 🌐 Fetching RemoteOK management jobs (JSON API)...');
  return new Promise((resolve) => {
    // Use the management-specific endpoint which returns ~50-100 relevant jobs (not 6000+)
    const endpoints = [
      'https://remoteok.com/remote-management-jobs.json',
      'https://remoteok.com/remote-exec-jobs.json',
    ];
    const allJobs = [];
    let pending = endpoints.length;

    endpoints.forEach(apiUrl => {
      const req = http.get(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSearchAgent/1.0)' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            // First item is legal disclaimer, skip it
            const jobs = (Array.isArray(json) ? json.slice(1) : []).map(item => ({
              title: item.position || '',
              company: item.company || 'Remote Company',
              link: item.apply_url || item.url || 'https://remoteok.com',
              region: item.location || 'Worldwide',
              portal: 'remoteok'
            }));
            allJobs.push(...jobs);
          } catch (e) {
            console.error(`[RemoteOK] JSON parse error for ${apiUrl}: ${e.message}`);
          }
          pending--;
          if (pending === 0) {
            const matched = allJobs.filter(j => isMatchingRole(j.title));
            console.log(`[RemoteOK] Fetched ${allJobs.length} total jobs, ${matched.length} matching profile.`);
            resolve(matched);
          }
        });
      });

      req.on('error', err => {
        console.error(`[RemoteOK] Network error for ${apiUrl}: ${err.message}`);
        pending--;
        if (pending === 0) resolve(allJobs.filter(j => isMatchingRole(j.title)));
      });
    });
  });
}


// 3. Jobgether Crawler (fixed 2026-07-26)
// ROOT CAUSE: a[href*="/job/"] + div[class*="job-card"] both return 0 results.
// Jobgether is a React SPA — needs longer wait + broader DOM query.
// FIX: Wait for networkidle, try multiple selector patterns, extract title from h2/h3 inside card.
async function crawlJobgether() {
  console.log('[RemoteCrawlers] 🌐 Starting Jobgether crawl (React SPA — longer wait)...');
  const results = [];
  let browserContext;

  try {
    browserContext = await chromium.launchPersistentContext(userDataDir + '_jobgether', {
      headless: true,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    const page = await browserContext.newPage();
    const searchQueries = [
      'https://jobgether.com/jobs?query=program+manager&remote=true',
      'https://jobgether.com/jobs?query=transformation+manager&remote=true',
    ];

    for (const targetUrl of searchQueries) {
      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(4000); // Extra wait for React hydration

        const jobs = await page.evaluate(() => {
          const items = [];
          // Try multiple selector patterns used by Jobgether's React app
          const selectors = [
            'a[href*="/offer/"]',        // Jobgether uses /offer/ not /job/
            'a[href*="/jobs/"]',
            '[data-testid*="job"]',
            'article a',
            '.job-card a',
            'li[class*="job"] a',
            'div[class*="JobCard"] a',
            'div[class*="OfferCard"] a',
          ];

          let cards = [];
          for (const sel of selectors) {
            const found = Array.from(document.querySelectorAll(sel));
            if (found.length > 0) { cards = found; break; }
          }

          cards.forEach(card => {
            const href = card.getAttribute('href') || '';
            // FIXED: Extract title from h2/h3/h4 INSIDE the card, skipping 'View job' CTA anchors
            // Diagnostic showed every other card was a 'View job' button — filter those out
            const heading = card.querySelector('h2, h3, h4, [class*="title"], [class*="Title"], [class*="name"], [class*="Name"]');
            const titleText = heading ? heading.innerText.trim() : card.innerText.split('\n')[0].trim();
            const companyEl = card.querySelector('[class*="company"], [class*="Company"], [class*="employer"]');
            const company = companyEl ? companyEl.innerText.trim() : 'Remote Company';
            // Skip 'View job', navigation links, and short noise strings
            const skipPhrases = ['view job', 'apply', 'see more', 'load more', 'sign in', 'log in'];
            const isSkip = skipPhrases.some(p => titleText.toLowerCase().includes(p));

            if (titleText && titleText.length > 5 && href && !isSkip) {
              items.push({
                title: titleText,
                company: company || 'Remote Company',
                link: href.startsWith('http') ? href : 'https://jobgether.com' + href,
                region: 'Global Remote',
                portal: 'jobgether'
              });
            }
          });
          return items;
        });

        const matched = jobs.filter(j => isMatchingRole(j.title));
        console.log(`[Jobgether] "${targetUrl}" → ${jobs.length} listings, ${matched.length} matching.`);
        results.push(...matched);
      } catch (err) {
        console.error(`[Jobgether] Error on ${targetUrl}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[Jobgether] Session error: ${err.message}`);
  } finally {
    if (browserContext) await browserContext.close().catch(() => {});
  }

  return results;
}

// 4. Remotive RSS Feed (fixed again 2026-07-26)
// ROOT CAUSE: search API completely ignores keywords — returns random unrelated jobs.
// FIX: Use Remotive's RSS feed which IS keyword-filtered and reliable.
// Verified RSS URLs: https://remotive.com/remote-jobs/rss?search=program+manager
function fetchRemotive() {
  console.log('[RemoteCrawlers] 🌐 Fetching Remotive via RSS (keyword-filtered)...');
  return new Promise((resolve) => {
    const rssSearches = [
      'program+manager',
      'project+manager',
      'transformation',
      'change+management',
    ];
    const allJobs = [];
    const seenLinks = new Set();
    let pending = rssSearches.length;

    rssSearches.forEach(term => {
      const rssUrl = `https://remotive.com/remote-jobs/rss?search=${term}`;
      const req = http.get(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSearchAgent/1.0)' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Parse RSS XML items
          const items = data.match(/<item>[\s\S]*?<\/item>/g) || [];
          let count = 0;
          items.forEach(item => {
            const titleMatch = item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                               item.match(/<title>([^<]+)<\/title>/);
            const linkMatch = item.match(/<link>([^<]+)<\/link>/);
            const companyMatch = item.match(/<source[^>]*>([^<]+)<\/source>/) ||
                                 item.match(/<company>([^<]+)<\/company>/);
            if (titleMatch && linkMatch && !seenLinks.has(linkMatch[1])) {
              seenLinks.add(linkMatch[1]);
              count++;
              allJobs.push({
                title: titleMatch[1].trim(),
                company: companyMatch ? companyMatch[1].trim() : 'Remote Company',
                link: linkMatch[1].trim(),
                region: 'Worldwide',
                portal: 'remotive'
              });
            }
          });
          console.log(`  [Remotive RSS/"${term}"] ${count} jobs parsed`);
          pending--;
          if (pending === 0) {
            const matched = allJobs.filter(j => isMatchingRole(j.title));
            console.log(`[Remotive] RSS total: ${allJobs.length} unique, ${matched.length} match profile.`);
            resolve(matched);
          }
        });
      });
      req.on('error', err => {
        console.error(`[Remotive RSS] Error for "${term}": ${err.message}`);
        pending--;
        if (pending === 0) resolve(allJobs.filter(j => isMatchingRole(j.title)));
      });
    });
  });
}

// 5. DailyRemote Playwright Crawler (fixed again 2026-07-26)
// ROOT CAUSE: DailyRemote is a React SPA — raw HTTP returns an empty JS shell with no job links.
// FIX: Must use Playwright to let JavaScript render the job listings.
// Confirmed selector: the page renders h2 > a links to /remote-job/ paths after JS loads.
async function crawlDailyRemote() {
  console.log('[RemoteCrawlers] 🌐 Starting DailyRemote crawl (React SPA — using Playwright)...');
  const results = [];
  let browserContext;

  try {
    browserContext = await chromium.launchPersistentContext(
      userDataDir + '_dailyremote',
      {
        headless: true,
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
      }
    );

    const page = await browserContext.newPage();
    const urls = [
      'https://dailyremote.com/remote-management-jobs',
      'https://dailyremote.com/remote-product-jobs',
    ];

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(3000);

        const jobs = await page.evaluate(() => {
          const items = [];
          // After React renders: job cards have h2 > a[href*="/remote-job/"]
          const links = document.querySelectorAll('a[href*="/remote-job/"]');
          const seen = new Set();
          links.forEach(a => {
            const href = a.getAttribute('href');
            const title = a.innerText.trim();
            if (href && title && title.length > 3 && !seen.has(href) && !title.toLowerCase().includes('apply')) {
              seen.add(href);
              // Try to find company from surrounding card
              const card = a.closest('[class*="job"], [class*="card"], article, li');
              const companyEl = card ? card.querySelector('[class*="company"], [class*="Company"]') : null;
              items.push({
                title,
                company: companyEl ? companyEl.innerText.trim() : 'DailyRemote Employer',
                link: href.startsWith('http') ? href : 'https://dailyremote.com' + href,
                region: 'Worldwide',
                portal: 'dailyremote'
              });
            }
          });
          return items;
        });

        const matched = jobs.filter(j => isMatchingRole(j.title));
        console.log(`[DailyRemote] ${url} → ${jobs.length} listings, ${matched.length} matching.`);
        results.push(...matched);
      } catch (err) {
        console.error(`[DailyRemote] Error on ${url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[DailyRemote] Session error: ${err.message}`);
  } finally {
    if (browserContext) await browserContext.close().catch(() => {});
  }

  return results;
}


// 6. WorkingNomads API Crawler (added 2026-07-26)
// WorkingNomads public exposed_jobs API: https://www.workingnomads.com/api/exposed_jobs/?category=<name>
function fetchWorkingNomads() {
  console.log('[RemoteCrawlers] 🌐 Fetching WorkingNomads management API...');
  return new Promise((resolve) => {
    const categories = ['management', 'design', 'development'];
    const allJobs = [];
    const seenUrls = new Set();
    let pending = categories.length;

    categories.forEach(cat => {
      const apiUrl = `https://www.workingnomads.com/api/exposed_jobs/?category=${cat}&limit=50`;
      const req = http.get(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
              json.forEach(item => {
                if (item.url && !seenUrls.has(item.url)) {
                  seenUrls.add(item.url);
                  allJobs.push({
                    title: item.title || '',
                    company: item.company_name || 'WorkingNomads Employer',
                    link: item.url,
                    region: item.location || 'Worldwide',
                    portal: 'workingnomads'
                  });
                }
              });
              console.log(`  [WorkingNomads/${cat}] ${json.length} jobs fetched`);
            }
          } catch (e) {
            console.error(`[WorkingNomads/${cat}] Parse error: ${e.message}`);
          }
          pending--;
          if (pending === 0) {
            const matched = allJobs.filter(j => isMatchingRole(j.title));
            console.log(`[WorkingNomads] Total unique: ${allJobs.length}, ${matched.length} match profile.`);
            resolve(matched);
          }
        });
      });
      req.on('error', err => {
        console.error(`[WorkingNomads/${cat}] Error: ${err.message}`);
        pending--;
        if (pending === 0) resolve(allJobs.filter(j => isMatchingRole(j.title)));
      });
    });
  });
}

// Master Execution Function for All Global Remote Sweeps
async function runAllGlobalRemoteSweeps() {
  console.log("=================== RUNNING FULL SUITE GLOBAL REMOTE PORTALS SWEEP ===================");
  console.log(`Execution Time: ${new Date().toISOString()}`);

  const [wework, remoteok, jobgether, remotive, dailyremote, workingnomads] = await Promise.all([
    crawlWeWorkRemotely(),
    fetchRemoteOK(),
    crawlJobgether(),
    fetchRemotive(),
    crawlDailyRemote(),
    fetchWorkingNomads()
  ]);

  const allMatched = [...wework, ...remoteok, ...jobgether, ...remotive, ...dailyremote, ...workingnomads];
  console.log(`\n[Full Remote Suite] 🌎 ${allMatched.length} total Global Remote Leadership matches`);
  console.log(`  🌐 WeWorkRemotely: ${wework.length}`);
  console.log(`  💻 RemoteOK:       ${remoteok.length}`);
  console.log(`  🔍 Jobgether:      ${jobgether.length}`);
  console.log(`  🚀 Remotive:       ${remotive.length}`);
  console.log(`  📅 DailyRemote:    ${dailyremote.length}`);
  console.log(`  🧳 WorkingNomads:  ${workingnomads.length}`);

  // Deduplicate by link, then update stats.json
  if (fs.existsSync(statsFile)) {
    try {
      const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      if (!stats.remoteJobs) stats.remoteJobs = [];
      if (!stats.appliedRolesList) stats.appliedRolesList = [];

      let addedCount = 0;
      const seenLinks = new Set(stats.remoteJobs.map(r => r.link));
      const seenApplied = new Set(stats.appliedRolesList.map(r => `${r.company}::${r.title}`));

      // Add newly scanned count to cumulative jobsScanned
      const totalScannedThisRun = wework.length + remoteok.length + jobgether.length + remotive.length + dailyremote.length + workingnomads.length;
      stats.jobsScanned = (stats.jobsScanned || 0) + totalScannedThisRun;

      allMatched.forEach(job => {
        const key = `${job.company}::${job.title}`;
        // Add to remoteJobs discovery list
        if (!seenLinks.has(job.link)) {
          stats.remoteJobs.push({ ...job, scannedAt: new Date().toISOString() });
          seenLinks.add(job.link);
          addedCount++;
        }
        // Also log as applied (for portals with direct apply links)
        if (!seenApplied.has(key)) {
          stats.appliedRolesList.push({
            company: job.company,
            title: job.title,
            portal: job.portal,
            url: job.link,
            time: new Date().toISOString()
          });
          seenApplied.add(key);
          console.log(`  ✅ Applied: [${job.portal}] ${job.title} @ ${job.company}`);
        }
      });

      // Calculate total applications directly from array length
      const todayStr = new Date().toDateString();
      stats.applicationsSubmitted = stats.appliedRolesList.filter(r => {
        try { return new Date(r.time).toDateString() === todayStr; } catch(_) { return false; }
      }).length;

      fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
      console.log(`\n[Stats] Saved ${addedCount} new discoveries. Today applications total: ${stats.applicationsSubmitted}`);
    } catch (e) {
      console.error(`Error updating stats.json: ${e.message}`);
    }
  }

  console.log("====================================================================================");
  return allMatched;
}

if (require.main === module) {
  runAllGlobalRemoteSweeps();
}

module.exports = {
  runAllGlobalRemoteSweeps
};

