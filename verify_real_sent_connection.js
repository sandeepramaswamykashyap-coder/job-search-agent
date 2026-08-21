const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('=================== LIVE VERIFIED LINKEDIN CONNECTION DISPATCH ===================');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  // Search query for a fresh target hiring manager in Bangalore
  const searchQuery = 'Transformation Lead PwC Bangalore';
  console.log(`1. Navigating to LinkedIn Search: "${searchQuery}"`);
  await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Extract clean profile link
  const candidates = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    return anchors.map(a => ({
      name: a.innerText.trim().split('\n')[0],
      href: a.getAttribute('href') ? a.getAttribute('href').split('?')[0] : ''
    })).filter(x => x.href && x.href.includes('/in/') && !x.href.includes('/in/ACoA'));
  });

  console.log(`Found ${candidates.length} profiles in search results.`);

  let targetCandidate = null;
  for (const c of candidates) {
    let fullUrl = c.href.startsWith('http') ? c.href : `https://www.linkedin.com${c.href}`;
    console.log(`\n2. Inspecting Candidate Profile: ${c.name} (${fullUrl})`);
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Verify SCB exclusion specifically on candidate profile main content & experience
    const scbInProfile = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const expSection = document.querySelector('#experience') ? document.querySelector('#experience').innerText.toLowerCase() : main.innerText.toLowerCase();
      return expSection.includes('standard chartered') || expSection.includes('standard chartered bank');
    });

    if (scbInProfile) {
      console.log(`🛑 EXCLUSION ENFORCED: ${c.name} experience section shows Standard Chartered. Aborting.`);
      continue;
    }

    targetCandidate = { name: c.name, url: fullUrl };
    break;
  }

  if (!targetCandidate) {
    console.log('No compliant candidates found in this search query.');
    await ctx.close();
    return;
  }

  console.log(`\n3. Selected Target Compliant Candidate: ${targetCandidate.name}`);

  // Capture profile screenshot before action
  const preActionScreenshot = path.join(__dirname, 'linkedin_profile_before.png');
  await page.screenshot({ path: preActionScreenshot, fullPage: false });
  console.log(`Captured Profile Screenshot: ${preActionScreenshot}`);

  // Locate Connect button
  let clickedConnect = false;

  // Check 1: Direct Connect button on profile hero section
  const directConnect = page.locator('button.artdeco-button:has-text("Connect"), button[aria-label*="Connect to"]').first();
  if (await directConnect.isVisible().catch(() => false)) {
    console.log('Found Direct Connect button! Clicking...');
    await directConnect.click();
    clickedConnect = true;
  } else {
    // Check 2: More dropdown menu
    console.log('Direct Connect button not visible. Opening "More" menu...');
    const moreBtns = page.locator('button[aria-label*="More"], button:has-text("More")');
    const count = await moreBtns.count();
    if (count > 0) {
      await moreBtns.nth(count > 1 ? 1 : 0).click();
      await page.waitForTimeout(1500);

      // Look inside dropdown content
      const dropdownConnect = page.locator('div.artdeco-dropdown__content button:has-text("Connect"), div.artdeco-dropdown__content span:has-text("Connect"), div.artdeco-dropdown__content div[role="button"]:has-text("Connect")').first();
      if (await dropdownConnect.isVisible().catch(() => false)) {
        console.log('Found "Connect" in More dropdown menu! Clicking...');
        await dropdownConnect.click({ force: true });
        clickedConnect = true;
      }
    }
  }

  if (!clickedConnect) {
    console.log('❌ Could not click Connect button on profile page.');
    await ctx.close();
    return;
  }

  await page.waitForTimeout(2500);

  // Check if "How do you know" modal pops up
  const knowModalOther = page.locator('button:has-text("Other"), label:has-text("Other")').first();
  if (await knowModalOther.isVisible().catch(() => false)) {
    console.log('Handling "How do you know" dialog: selecting Other...');
    await knowModalOther.click();
    await page.waitForTimeout(1000);
    const connectModalNext = page.locator('button:has-text("Connect")').first();
    if (await connectModalNext.isVisible().catch(() => false)) {
      await connectModalNext.click();
      await page.waitForTimeout(1500);
    }
  }

  // Look for "Add a note" button in invitation modal
  const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
  if (await addNoteBtn.isVisible().catch(() => false)) {
    console.log('4. Clicking "Add a note" button in modal...');
    await addNoteBtn.click();
    await page.waitForTimeout(1500);

    const noteText = `Hi ${targetCandidate.name.split(' ')[0]}, I noticed your team's leadership in Program Transformation & Ops. I bring 15+ yrs leading Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect!`;

    console.log(`Writing customized note (${noteText.length} chars):\n"${noteText}"`);
    await page.fill('textarea[name="message"], textarea#custom-message', noteText);
    await page.waitForTimeout(1000);

    // Capture screenshot of note written in modal before clicking Send
    const noteScreenshot = path.join(__dirname, 'linkedin_note_written.png');
    await page.screenshot({ path: noteScreenshot });
    console.log(`Captured Note Written Screenshot: ${noteScreenshot}`);

    const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"], button[aria-label*="Send now"]').first();
    if (await sendBtn.isVisible().catch(() => false)) {
      console.log('5. 🚀 Clicking "Send" invitation button...');
      await sendBtn.click();
      await page.waitForTimeout(4000);

      // Capture screenshot after sending
      const postActionScreenshot = path.join(__dirname, 'linkedin_post_send.png');
      await page.screenshot({ path: postActionScreenshot });
      console.log(`Captured Post-Send Screenshot: ${postActionScreenshot}`);
    }
  } else {
    console.log('"Add a note" button not present. Checking for direct "Send" or "Send without a note"...');
    const sendWithout = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
    if (await sendWithout.isVisible().catch(() => false)) {
      await sendWithout.click();
      await page.waitForTimeout(3000);
    }
  }

  // 6. VERIFICATION: Navigate to LinkedIn Sent Invitations page to prove delivery!
  console.log('\n6. VERIFICATION: Navigating to LinkedIn Sent Invitations manager...');
  await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const sentPageScreenshot = path.join(__dirname, 'linkedin_sent_invitations_page.png');
  await page.screenshot({ path: sentPageScreenshot, fullPage: false });
  console.log(`Captured Sent Invitations Page Screenshot: ${sentPageScreenshot}`);

  const sentListText = await page.evaluate(() => {
    const list = document.querySelector('div.invitation-card, ul.mn-invitation-list, main');
    return list ? list.innerText.slice(0, 500) : 'No list element found';
  });

  console.log('\n=================== SENT INVITATIONS PAGE SNAPSHOT ===================');
  console.log(sentListText);
  console.log('=======================================================================');

  await ctx.close();
})().catch(console.error);
