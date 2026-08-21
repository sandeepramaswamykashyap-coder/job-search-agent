const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

const userDataDir = path.join(__dirname, '.browser_session');

(async () => {
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  console.log('--- Checking LinkedIn session status ---');
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const currentUrl = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  const feedLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/in/"]')).slice(0, 5).map(a => a.href);
  });

  console.log('Feed URL:', currentUrl);
  console.log('Feed Title:', title);
  console.log('Feed body snippet:', bodyText);
  console.log('Feed /in/ links:', feedLinks);

  console.log('\n--- Testing search page ---');
  await page.goto('https://www.linkedin.com/search/results/people/?keywords=hiring+program+manager+bangalore', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  await page.evaluate(() => window.scrollTo(0, 600)).catch(() => {});
  await page.waitForTimeout(3000);

  const searchUrl = page.url();
  const searchTitle = await page.title();
  const searchLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/in/"]')).slice(0, 10).map(a => a.href);
  });
  const searchBody = await page.evaluate(() => document.body.innerText.substring(0, 600));

  console.log('Search URL:', searchUrl);
  console.log('Search Title:', searchTitle);
  console.log('Search /in/ links:', JSON.stringify(searchLinks));
  console.log('Search body:', searchBody);

  await ctx.close();
})();
