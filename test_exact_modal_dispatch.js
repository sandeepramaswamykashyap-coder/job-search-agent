const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('=================== TEST LIVE LINKEDIN INVITATION DISPATCH ===================');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const profileUrl = 'https://www.linkedin.com/in/sarath-n-98b902102/';
  console.log(`1. Navigating to profile: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Check SCB exclusion
  const scbCheck = await page.evaluate(() => {
    const exp = document.querySelector('#experience');
    return exp ? exp.innerText.toLowerCase().includes('standard chartered') : false;
  });

  if (scbCheck) {
    console.log('🛑 EXCLUSION: Standard Chartered detected in experience section!');
    await ctx.close();
    return;
  }

  console.log('2. Clicking "More" button on profile hero...');
  const moreBtn = page.locator('button[aria-label*="More"], button:has-text("More")').nth(1);
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(2000);

    console.log('3. Looking for "Connect" in More dropdown menu...');
    const connectItem = page.locator('div[role="button"]:has-text("Connect"), span:has-text("Connect"), li:has-text("Connect")').first();
    if (await connectItem.isVisible()) {
      console.log('Clicking "Connect" in dropdown...');
      await connectItem.click();
      await page.waitForTimeout(2500);

      // Check for invitation modal "Add a note" button
      const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
      if (await addNoteBtn.isVisible()) {
        console.log('4. Clicking "Add a note" button in modal...');
        await addNoteBtn.click();
        await page.waitForTimeout(1500);

        const noteText = "Hi Sarath, I noticed your team's active hiring at YASH Tech. I bring 15+ yrs leading Program Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect & explore synergy!";

        console.log(`Writing customized note (${noteText.length} chars):\n"${noteText}"`);
        await page.fill('textarea[name="message"], textarea#custom-message', noteText);
        await page.waitForTimeout(1000);

        const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"]').first();
        if (await sendBtn.isVisible()) {
          console.log('5. 🚀 Clicking "Send" invitation button...');
          await sendBtn.click();
          await page.waitForTimeout(4000);

          console.log('\n🎉 SUCCESS: Live LinkedIn Connection Request Dispatched!');
        } else {
          console.log('❌ Send button not visible in note modal.');
        }
      } else {
        console.log('"Add a note" button not visible in modal.');
        const sendWithoutNote = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
        if (await sendWithoutNote.isVisible()) {
          console.log('Clicking "Send without a note"...');
          await sendWithoutNote.click();
          await page.waitForTimeout(3000);
        }
      }
    } else {
      console.log('❌ Connect item not visible in dropdown.');
    }
  } else {
    console.log('❌ More button not visible on profile hero.');
  }

  // Verify in Sent Invitations tab
  console.log('\n6. Checking LinkedIn Sent Invitations outbox tab...');
  await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const sentOutboxText = await page.evaluate(() => {
    const list = document.querySelector('main');
    return list ? list.innerText.slice(0, 600) : 'No main element found';
  });

  console.log('\n=================== LINKEDIN SENT INVITATIONS OUTBOX ===================');
  console.log(sentOutboxText);
  console.log('========================================================================');

  await ctx.close();
})().catch(console.error);
