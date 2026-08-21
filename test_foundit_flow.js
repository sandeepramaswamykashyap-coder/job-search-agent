/**
 * Foundit Flow Test Script
 */
const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  console.log('[Foundit Test] Launching Playwright browser...');
  const browserContext = await chromium.launchPersistentContext(
    path.join(__dirname, '.browser_session_foundit_test'),
    {
      headless: true,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    }
  );

  const page = await browserContext.newPage();
  const searchUrl = 'https://www.foundit.in/srp/results?query=program+manager&experience=8-20&sort=1';
  console.log(`[Foundit Test] Navigating to ${searchUrl}...`);

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const info = await page.evaluate(() => {
    // Selectors on foundit SRP (Search Results Page)
    const cardSelectors = [
      '.srpCard', '.job-card', '.card-body', '.cardContainer',
      '[class*="srpCard"]', '[class*="jobCard"]', '[class*="card"]'
    ];

    let cards = [], usedSelector = '';
    for (const sel of cardSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 2) {
        cards = found;
        usedSelector = sel;
        break;
      }
    }

    const items = [];
    const allLinks = Array.from(document.querySelectorAll('a[href*="/job/"], a[href*="foundit.in/seeker/job-details"], a[href*="-jobs-"]'));

    allLinks.forEach(a => {
      const title = a.innerText.trim();
      const href = a.getAttribute('href');
      if (title && title.length > 5 && href) {
        items.push({ title, href });
      }
    });

    return {
      usedSelector,
      cardCount: cards.length,
      sampleCards: cards.slice(0, 5).map(c => c.innerText.substring(0, 100)),
      linkCount: items.length,
      sampleLinks: items.slice(0, 10)
    };
  });

  console.log('[Foundit Test] Selector used:', info.usedSelector);
  console.log('[Foundit Test] Card count:', info.cardCount);
  console.log('[Foundit Test] Sample card snippets:', info.sampleCards);
  console.log('[Foundit Test] Job links count:', info.linkCount);
  console.log('[Foundit Test] Sample links:', info.sampleLinks);

  await browserContext.close();
})().catch(console.error);
