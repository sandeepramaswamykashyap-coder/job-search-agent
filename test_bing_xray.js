const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser for Bing X-Ray verification...');
  const ctx = await chromium.launchPersistentContext(path.join(__dirname, '.browser_session_bool_test3'), {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const q1 = 'site:linkedin.com/in/ "Transformation Program Manager" hiring Bangalore';
  console.log('--- Testing Bing LinkedIn X-Ray ---');
  await page.goto('https://www.bing.com/search?q=' + encodeURIComponent(q1));
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Bing Page Body Text Snippet:', bodyText.substring(0, 500));

  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('li.b_algo')).map(item => {
      const a = item.querySelector('h2 a');
      const snippet = item.querySelector('.b_caption p, .b_algoSlug');
      return {
        title: a ? a.innerText.trim() : '',
        url: a ? a.getAttribute('href') : '',
        snippet: snippet ? snippet.innerText.trim() : ''
      };
    });
  });

  console.log(`Found ${results.length} Bing X-Ray profile matches:`);
  results.slice(0, 5).forEach((r, idx) => {
    console.log(`\n[Match ${idx+1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`);
  });

  await ctx.close();
})().catch(console.error);
