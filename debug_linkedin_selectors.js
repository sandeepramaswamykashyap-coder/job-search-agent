/**
 * Debug: Dump LinkedIn search results HTML to find correct selectors
 */
const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session');

async function debugSelectors() {
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    args: ['--no-sandbox']
  });

  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('login') || page.url().includes('authwall')) {
    console.log('SESSION EXPIRED');
    await ctx.close();
    return;
  }

  const searchUrl = 'https://www.linkedin.com/search/results/people/?keywords=Transformation+Program+Manager+Bengaluru&origin=GLOBAL_SEARCH_HEADER';
  console.log(`Navigating to: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000); // Wait for React to render

  // Count various selectors
  const counts = await page.evaluate(() => {
    return {
      chameleon: document.querySelectorAll('[data-chameleon-result-urn]').length,
      reusableSearch: document.querySelectorAll('li.reusable-search__result-container').length,
      entityResult: document.querySelectorAll('.entity-result').length,
      searchResultsList: document.querySelectorAll('.search-results-container ul li').length,
      allLi: document.querySelectorAll('main ul li').length,
      profileLinks: document.querySelectorAll('a[href*="/in/"]').length,
    };
  });
  console.log('\n=== SELECTOR COUNTS ===');
  console.log(JSON.stringify(counts, null, 2));

  // Extract real profile links and names using multiple strategies
  const results = await page.evaluate(() => {
    const profiles = [];
    
    // Strategy 1: Any <a> tag linking to /in/ profiles that has visible text
    const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    for (const link of links) {
      const href = link.href.split('?')[0];
      if (href.includes('/in/') && !href.includes('/in/ACoA') && href !== 'https://www.linkedin.com/in/') {
        const text = (link.innerText || link.textContent || '').trim();
        if (text.length > 2 && text.length < 80) {
          // Try to get the subtitle from parent card
          const card = link.closest('li') || link.closest('[data-chameleon-result-urn]') || link.parentElement;
          const cardText = card ? (card.innerText || '').substring(0, 200) : '';
          profiles.push({ name: text, profileUrl: href, cardText });
        }
      }
    }
    return profiles.slice(0, 15); // First 15
  });

  console.log('\n=== REAL PROFILES FOUND ===');
  results.forEach((r, i) => {
    console.log(`\n[${i+1}] Name: ${r.name}`);
    console.log(`    URL: ${r.profileUrl}`);
    console.log(`    Card: ${r.cardText.substring(0, 100).replace(/\n/g, ' ')}`);
  });

  // Save HTML for manual inspection
  const html = await page.content();
  fs.writeFileSync(path.join(__dirname, 'linkedin_search_debug.html'), html);
  console.log('\n✅ Full HTML saved to linkedin_search_debug.html');

  await ctx.close();
}

debugSelectors().catch(console.error);
