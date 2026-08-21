const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Navigating directly to LinkedIn Sent Invitations Manager...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const shotPath = path.join(__dirname, 'real_sent_outbox_check.png');
  await page.screenshot({ path: shotPath });
  console.log(`Saved outbox screenshot to: ${shotPath}`);

  const pageText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log('\n--- LINKEDIN SENT INVITATIONS OUTBOX LIVE DOM TEXT ---');
  console.log(pageText);
  console.log('------------------------------------------------------');

  await ctx.close();
})().catch(console.error);
