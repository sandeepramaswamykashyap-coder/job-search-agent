/**
 * Diagnostic script — prints actual job titles from Remotive, Jobgether, DailyRemote
 * to understand WHY keyword matching fails
 */
const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const http = require('https');

// ── Remotive: what titles are actually returned? ──────────────────────────
function diagRemotive() {
  return new Promise((resolve) => {
    const url = 'https://remotive.com/api/remote-jobs?search=program+manager&limit=20';
    http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; diag/1.0)' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('\n[Remotive] Sample titles returned for "program manager":');
          (json.jobs || []).slice(0, 15).forEach(j => console.log(`  → "${j.title}" @ ${j.company_name}`));
          console.log(`  Total: ${json['job-count']} jobs`);
        } catch(e) { console.log('Parse error:', e.message); }
        resolve();
      });
    }).on('error', e => { console.log('Error:', e.message); resolve(); });
  });
}

// ── DailyRemote: what does the raw HTML actually contain? ──────────────────
function diagDailyRemote() {
  return new Promise((resolve) => {
    http.get('https://dailyremote.com/remote-management-jobs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      console.log(`\n[DailyRemote] Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
      res.on('data', c => data += c);
      res.on('end', () => {
        // Try the link pattern
        const linkPattern = /href="(https:\/\/dailyremote\.com\/remote-job\/[^"]+)"[^>]*>([^<]+)</g;
        let match;
        const found = [];
        while ((match = linkPattern.exec(data)) !== null) {
          found.push({ link: match[1], title: match[2].trim() });
        }
        console.log(`[DailyRemote] Link regex found ${found.length} matches`);
        // Also try the raw pattern we saw in the fetched markdown
        const anchors = data.match(/href="https:\/\/dailyremote\.com\/remote-job\/[^"]+"/g) || [];
        console.log(`[DailyRemote] Raw href anchors count: ${anchors.length}`);
        // Show first 500 chars of body to understand structure
        console.log('[DailyRemote] First 800 chars of response:');
        console.log(data.substring(0, 800));
        resolve();
      });
    }).on('error', e => { console.log('Error:', e.message); resolve(); });
  });
}

// ── Jobgether: print first 20 actual titles from the 178 found ────────────
async function diagJobgether() {
  console.log('\n[Jobgether] Launching browser to inspect 178 titles...');
  let browserContext;
  try {
    browserContext = await chromium.launchPersistentContext(
      path.join(__dirname, '.browser_session_remote_jobgether_diag'),
      { headless: true, args: ['--no-sandbox'] }
    );
    const page = await browserContext.newPage();
    await page.goto('https://jobgether.com/jobs?query=program+manager&remote=true', {
      waitUntil: 'networkidle', timeout: 45000
    });
    await page.waitForTimeout(4000);

    const info = await page.evaluate(() => {
      const selectors = [
        'a[href*="/offer/"]', 'a[href*="/jobs/"]', '[data-testid*="job"]',
        'article a', '.job-card a', 'li[class*="job"] a',
        'div[class*="JobCard"] a', 'div[class*="OfferCard"] a',
      ];
      let cards = [], usedSel = '';
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length > 0) { cards = found; usedSel = sel; break; }
      }
      return {
        usedSelector: usedSel,
        totalCards: cards.length,
        sampleTitles: cards.slice(0, 20).map(c => {
          const heading = c.querySelector('h1,h2,h3,h4,[class*="title"],[class*="Title"]');
          return heading ? heading.innerText.trim() : c.innerText.split('\n')[0].trim();
        }),
        bodySnippet: document.body.innerText.substring(0, 500),
      };
    });

    console.log(`[Jobgether] Selector used: "${info.usedSelector}", ${info.totalCards} cards`);
    console.log('[Jobgether] Sample titles:');
    info.sampleTitles.forEach(t => console.log(`  → "${t}"`));
    if (!info.usedSelector) {
      console.log('[Jobgether] No selector matched. Body snippet:', info.bodySnippet);
    }
  } catch(e) {
    console.log('[Jobgether] Error:', e.message);
  } finally {
    if (browserContext) await browserContext.close().catch(() => {});
  }
}

async function runDiag() {
  console.log('=== DIAGNOSTIC RUN — checking actual data from broken portals ===');
  await diagRemotive();
  await diagDailyRemote();
  await diagJobgether();
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

runDiag().catch(console.error);
