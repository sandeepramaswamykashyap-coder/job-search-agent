const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('Testing exact modal elements on 2nd degree profile (Abhishek Anson)...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const url = 'https://www.linkedin.com/in/abhishek-anson-111aa8235/';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const directConnect = page.locator('main button:has-text("Connect"), main button[aria-label*="Connect"]').first();
  if (await directConnect.isVisible()) {
    console.log('1. Clicking Direct Connect button on profile hero...');
    await directConnect.click();
    await page.waitForTimeout(3000);

    const shotPath = path.join(__dirname, 'abhishek_modal_opened.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved modal screenshot to: ${shotPath}`);

    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('div.artdeco-modal, div[role="dialog"]');
      return modal ? modal.innerText : document.body.innerText.slice(0, 600);
    });
    console.log('\n--- MODAL DOM TEXT ---');
    console.log(modalText);
    console.log('----------------------');

    // Click Add a note
    const addNoteBtn = page.locator('button[aria-label*="Add a note"], button:has-text("Add a note")').first();
    if (await addNoteBtn.isVisible()) {
      console.log('2. Clicking "Add a note" button in modal...');
      await addNoteBtn.click();
      await page.waitForTimeout(1500);

      const noteText = 'Hi Abhishek, I noticed your active work in program management. I bring 15+ yrs leading Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect!';
      console.log('3. Filling customized connection note text...');
      await page.fill('textarea[name="message"], textarea#custom-message', noteText);
      await page.waitForTimeout(1000);

      const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"], button[aria-label*="Send now"]').first();
      if (await sendBtn.isVisible()) {
        console.log('4. Clicking "Send" button...');
        await sendBtn.click();
        await page.waitForTimeout(4000);
        console.log('🎉 INVITATION DISPATCHED LIVE TO LINKEDIN SERVERS!');

        // Check LinkedIn Sent Invitations outbox tab
        console.log('5. Navigating to LinkedIn Sent Invitations Outbox tab...');
        await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const outboxText = await page.evaluate(() => document.body.innerText.slice(0, 700));
        console.log('\n--- LINKEDIN SENT INVITATIONS OUTBOX PROOF ---');
        console.log(outboxText);
        console.log('--------------------------------------------------');

        const proofPath = path.join(__dirname, 'abhishek_sent_outbox_proof.png');
        await page.screenshot({ path: proofPath });
        console.log(`Saved Screenshot Proof to: ${proofPath}`);
      }
    }
  }

  await ctx.close();
})().catch(console.error);
