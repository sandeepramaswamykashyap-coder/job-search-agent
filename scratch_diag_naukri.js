const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

async function checkNaukri() {
  const sessionDir = path.join(__dirname, '.browser_session_naukri');
  const browser = await chromium.launchPersistentContext(sessionDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1366,768'
    ]
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to IIMJobs...');
    const response2 = await page.goto('https://www.iimjobs.com/j/bengaluru-jobs', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('IIMJobs HTTP Status:', response2 ? response2.status() : 'null');
    console.log('IIMJobs Final URL:', page.url());
    console.log('IIMJobs Title:', await page.title());

    await page.waitForTimeout(3000);
    const iimCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('.job-tuple, .tuple, [class*="joblist"], a[href*="/j/"]');
      return { count: cards.length };
    });
    console.log('IIMJobs Cards Info:', iimCards);
  } catch (err) {
    console.error('Diagnostic error:', err.message);
  } finally {
    await browser.close();
  }
}

checkNaukri();
