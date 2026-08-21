const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('=================== TEST CORRECTED PROFILE CONNECT DISPATCH ===================');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const url = 'https://www.linkedin.com/in/bs-padmanabh-92145429/';
  console.log(`Navigating to profile: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Target the profile hero More button specifically (not global nav)
  const heroMoreBtn = page.locator('main button:has-text("More"), main button[aria-label*="More"]').first();
  if (await heroMoreBtn.isVisible()) {
    console.log('Found Hero Profile More button. Clicking...');
    await heroMoreBtn.click();
    await page.waitForTimeout(2000);

    const shotPath1 = path.join(__dirname, 'hero_more_opened.png');
    await page.screenshot({ path: shotPath1 });

    const dropdownConnect = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
    if (await dropdownConnect.isVisible()) {
      console.log('Found Connect item in dropdown menu. Clicking...');
      await dropdownConnect.click();
      await page.waitForTimeout(3000);

      const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
      if (await addNoteBtn.isVisible()) {
        console.log('Found Add a note button. Clicking...');
        await addNoteBtn.click();
        await page.waitForTimeout(1500);

        const noteText = 'Hi Padmanabh, I noticed your active work in program transformation. I bring 15+ yrs leading Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect!';
        await page.fill('textarea[name="message"]', noteText);
        await page.waitForTimeout(1000);

        const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"]').first();
        if (await sendBtn.isVisible()) {
          console.log('Clicking Send invitation button...');
          await sendBtn.click();
          await page.waitForTimeout(4000);
          console.log('🎉 INVITATION TRANSMITTED LIVE TO LINKEDIN SERVERS!');

          console.log('Navigating to LinkedIn Sent Invitations Outbox...');
          await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(4000);

          const shotPathOutbox = path.join(__dirname, 'live_sent_outbox_proof.png');
          await page.screenshot({ path: shotPathOutbox });
          console.log(`Saved Live Outbox Screenshot Proof to: ${shotPathOutbox}`);
        }
      }
    }
  }

  await ctx.close();
})().catch(console.error);
