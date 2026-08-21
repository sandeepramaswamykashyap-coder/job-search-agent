const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Inspecting remote ATS application page...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const testUrl = 'https://weworkremotely.com/remote-jobs/spiralyze-project-manager-1';
  console.log(`Navigating to remote listing: ${testUrl}`);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const applyBtn = page.locator('a#job-cta-alt, a.apply-job-button, a:has-text("Apply for this position")').first();
  if (await applyBtn.isVisible()) {
    const href = await applyBtn.getAttribute('href');
    console.log(`Found Apply CTA Link: ${href}`);
  } else {
    console.log('Apply CTA button not found on WWR page.');
  }

  await ctx.close();
})().catch(console.error);
