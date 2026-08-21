const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const { buildCustomizedNote } = require('./linkedin_connector');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Launching browser to test LinkedIn People Search & Connection button locators...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const searchQuery = "Transformation Lead PwC Bangalore";
  console.log(`Searching LinkedIn People for: "${searchQuery}"`);
  await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const profileLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    return anchors.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href')
    })).filter(x => x.text && x.href.includes('/in/'));
  });

  console.log(`Found ${profileLinks.length} profile links in search results:`);
  profileLinks.slice(0, 5).forEach((p, idx) => {
    console.log(`[Result ${idx+1}] ${p.text} -> ${p.href}`);
  });

  await ctx.close();
})().catch(console.error);
