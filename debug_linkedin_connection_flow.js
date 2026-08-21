const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Debugging LinkedIn Connection Flow live...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  // Test Search Query
  const searchTerms = ['Sarath Yash Technologies', 'Vyasraj PwC', 'Snigdha Bean HR'];

  for (const term of searchTerms) {
    console.log(`\n=================== SEARCHING: "${term}" ===================`);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(term)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const profileLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
      return anchors.map(a => ({
        text: a.innerText.trim().replace(/\n/g, ' '),
        href: a.getAttribute('href')
      })).filter(x => x.href && x.href.includes('/in/') && !x.href.includes('/in/ACoA'));
    });

    console.log(`Found ${profileLinks.length} candidate profile links:`);
    if (profileLinks.length > 0) {
      console.log('Top Match:', profileLinks[0]);
      let targetUrl = profileLinks[0].href;
      if (!targetUrl.startsWith('http')) targetUrl = `https://www.linkedin.com${targetUrl}`;

      console.log(`Navigating to profile: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      // Check text for SCB
      const text = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (text.includes('standard chartered') || text.includes('scb')) {
        console.log('🛑 EXCLUSION: Standard Chartered detected! Skipping.');
        continue;
      }

      // Check Connect button locators
      const buttonInfo = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a.artdeco-button, div[role="button"]'));
        return btns.map(b => ({
          text: b.innerText.trim().replace(/\n/g, ' '),
          aria: b.getAttribute('aria-label') || '',
          tag: b.tagName
        })).filter(b => b.text || b.aria);
      });

      console.log('Profile Action Buttons Found on Page:', buttonInfo.slice(0, 15));
    }
  }

  await ctx.close();
})().catch(console.error);
