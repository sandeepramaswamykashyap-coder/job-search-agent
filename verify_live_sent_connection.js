const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('=================== LIVE LINKEDIN CONNECTION & OUTBOX VERIFICATION ===================');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  // Search for non-SCB Program Manager lead in Bangalore
  console.log('1. Searching LinkedIn People for non-SCB hiring manager...');
  await page.goto('https://www.linkedin.com/search/results/people/?keywords=hiring%20%22Program%20Manager%22%20Bangalore', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const profileUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    return Array.from(new Set(anchors.map(a => a.getAttribute('href').split('?')[0]))).filter(u => u.includes('/in/') && !u.includes('/in/ACoA'));
  });

  console.log(`Found ${profileUrls.length} candidate profile URLs.`);

  for (const rawUrl of profileUrls.slice(0, 5)) {
    const profileUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.linkedin.com${rawUrl}`;
    console.log(`\nEvaluating candidate: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const scbCheck = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const exp = document.querySelector('#experience') ? document.querySelector('#experience').innerText.toLowerCase() : main.innerText.toLowerCase();
      return exp.includes('standard chartered') || exp.includes('standard chartered bank');
    });

    if (scbCheck) {
      console.log('🛑 EXCLUDED: Profile belongs to Standard Chartered. Skipping.');
      continue;
    }

    console.log('✅ Non-SCB Candidate verified. Attempting Connection Request...');

    const moreBtn = page.locator('button[aria-label*="More"], button:has-text("More")').nth(1);
    if (await moreBtn.isVisible().catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(1500);

      const connectItem = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
      if (await connectItem.isVisible().catch(() => false)) {
        console.log('Clicking "Connect" in More dropdown menu...');
        await connectItem.click();
        await page.waitForTimeout(2500);

        const knowOther = page.locator('button:has-text("Other"), label:has-text("Other")').first();
        if (await knowOther.isVisible().catch(() => false)) {
          console.log('Handling "How do you know" dialog (Selecting Other)...');
          await knowOther.click();
          await page.waitForTimeout(1000);
          const nextBtn = page.locator('button:has-text("Connect")').first();
          if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
          await page.waitForTimeout(1500);
        }

        const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
        if (await addNoteBtn.isVisible().catch(() => false)) {
          console.log('Clicking "Add a note"...');
          await addNoteBtn.click();
          await page.waitForTimeout(1500);

          const noteText = 'Hi, I noticed your active work in program transformation. I bring 15+ yrs leading Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect!';
          await page.fill('textarea[name="message"]', noteText);
          await page.waitForTimeout(1000);

          const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"]').first();
          if (await sendBtn.isVisible().catch(() => false)) {
            await sendBtn.click();
            await page.waitForTimeout(4000);
            console.log('🎉 LIVE CONNECTION SENT SUCCESSFULLY!');

            // Check Sent Invitations outbox tab
            console.log('Navigating to LinkedIn Sent Invitations Outbox...');
            await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(4000);

            const outboxText = await page.evaluate(() => document.body.innerText.slice(0, 800));
            console.log('\n--- LINKEDIN SENT INVITATIONS OUTBOX PROOF ---');
            console.log(outboxText);
            console.log('--------------------------------------------------');

            const shotPath = path.join(__dirname, 'linkedin_sent_outbox_proof.png');
            await page.screenshot({ path: shotPath });
            console.log(`Saved screenshot proof to: ${shotPath}`);
            break;
          }
        }
      }
    }
  }

  await ctx.close();
})().catch(console.error);
