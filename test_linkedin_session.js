const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Testing LinkedIn session status in persistent session...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  console.log('Current Page URL:', url);
  if (url.includes('login') || url.includes('signup') || url.includes('authwall')) {
    console.log('❌ LinkedIn session requires login or authwall verification.');
  } else {
    console.log('✅ LinkedIn session ACTIVE & LOGGED IN!');
  }
  await ctx.close();
})().catch(console.error);
