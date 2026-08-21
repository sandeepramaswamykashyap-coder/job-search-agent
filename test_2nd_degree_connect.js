const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Searching for 2nd/3rd degree candidate lead in Bangalore...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  // Search 2nd degree connections explicitly
  await page.goto('https://www.linkedin.com/search/results/people/?network=%5B%22S%22%5D&keywords=hiring%20%22Program%20Manager%22', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const profileUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    return Array.from(new Set(anchors.map(a => a.getAttribute('href').split('?')[0]))).filter(u => u.includes('/in/') && !u.includes('/in/ACoA'));
  });

  console.log(`Found ${profileUrls.length} 2nd-degree candidate URLs.`);

  for (const rawUrl of profileUrls.slice(0, 5)) {
    const profileUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.linkedin.com${rawUrl}`;
    console.log(`\nTesting candidate profile: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const isSCB = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerText.toLowerCase().includes('standard chartered');
    });

    if (isSCB) {
      console.log('🛑 EXCLUDED: Candidate profile belongs to Standard Chartered. Skipping.');
      continue;
    }

    const degreeText = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerText.slice(0, 400);
    });
    console.log('Degree check snippet:\n', degreeText.slice(0, 200));

    // Look for Connect button
    const directConnect = page.locator('main button:has-text("Connect"), main button[aria-label*="Connect"]').first();
    if (await directConnect.isVisible().catch(() => false)) {
      console.log('Found Direct Connect Button on 2nd-degree profile! Clicking...');
      await directConnect.click();
      await page.waitForTimeout(2500);
    } else {
      const heroMore = page.locator('main button:has-text("More"), main button[aria-label*="More"]').first();
      if (await heroMore.isVisible().catch(() => false)) {
        await heroMore.click();
        await page.waitForTimeout(1500);
        const dropdownConnect = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
        if (await dropdownConnect.isVisible().catch(() => false)) {
          console.log('Found Connect in More Menu! Clicking...');
          await dropdownConnect.click();
          await page.waitForTimeout(2500);
        }
      }
    }

    // Handle "How do you know" modal
    const knowOther = page.locator('button:has-text("Other"), label:has-text("Other")').first();
    if (await knowOther.isVisible().catch(() => false)) {
      console.log('Handling "How do you know" dialog...');
      await knowOther.click();
      await page.waitForTimeout(1000);
      const nextBtn = page.locator('button:has-text("Connect")').first();
      if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
      await page.waitForTimeout(1500);
    }

    const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
    if (await addNoteBtn.isVisible().catch(() => false)) {
      console.log('Found "Add a note" button! Clicking...');
      await addNoteBtn.click();
      await page.waitForTimeout(1500);

      const noteText = 'Hi, I noticed your active work in program transformation. I bring 15+ yrs leading Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect!';
      await page.fill('textarea[name="message"]', noteText);
      await page.waitForTimeout(1000);

      const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"]').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(4000);
        console.log('🎉 LIVE INVITATION DISPATCHED TO LINKEDIN SERVERS!');

        console.log('Navigating to LinkedIn Sent Invitations Outbox tab...');
        await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const shotPath = path.join(__dirname, '2nd_degree_sent_outbox_proof.png');
        await page.screenshot({ path: shotPath });
        console.log(`Saved screenshot proof to: ${shotPath}`);

        const outboxText = await page.evaluate(() => document.body.innerText.slice(0, 600));
        console.log('\n--- LINKEDIN SENT INVITATIONS OUTBOX PROOF ---');
        console.log(outboxText);
        console.log('--------------------------------------------------');
        break;
      }
    }
  }

  await ctx.close();
})().catch(console.error);
