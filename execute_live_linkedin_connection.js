const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('🚀 EXECUTING LIVE LINKEDIN CONNECTION DISPATCH...');

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox']
  });
  const page = await ctx.newPage();

  const target = {
    name: 'Raj Krishna',
    title: 'HR Transformation Lead',
    company: 'Deloitte India',
    searchQuery: 'Raj Krishna Deloitte HR Transformation'
  };

  console.log(`\nTarget Lead: ${target.name} (${target.title} at ${target.company})`);
  console.log(`Searching LinkedIn People for: "${target.searchQuery}"`);

  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(target.searchQuery)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Try finding profile card Connect button directly on Search page
  const searchConnectBtn = page.locator('button.artdeco-button:has-text("Connect"), button[aria-label*="Connect with"]').first();

  let clickedConnect = false;

  if (await searchConnectBtn.isVisible().catch(() => false)) {
    console.log('✅ Found direct "Connect" button on Search result card! Clicking...');
    await searchConnectBtn.click();
    clickedConnect = true;
  } else {
    // Navigate to profile page
    const profileLink = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
      const match = anchors.find(a => a.getAttribute('href') && a.getAttribute('href').includes('/in/') && !a.getAttribute('href').includes('/in/ACoA'));
      return match ? match.getAttribute('href') : null;
    });

    if (profileLink) {
      let fullUrl = profileLink.startsWith('http') ? profileLink : `https://www.linkedin.com${profileLink}`;
      console.log(`Navigating to Profile Page: ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      // Verify SCB exclusion specifically on candidate profile main content
      const scbInProfile = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const text = main.innerText.toLowerCase();
        // Check if candidate currently or previously worked at Standard Chartered
        const expSection = document.querySelector('#experience') ? document.querySelector('#experience').innerText.toLowerCase() : text;
        return expSection.includes('standard chartered') || expSection.includes('standard chartered bank');
      });

      if (scbInProfile) {
        console.log('🛑 EXCLUSION ENFORCED: Candidate profile experience shows Standard Chartered!');
        await ctx.close();
        return;
      }

      // Try Direct profile Connect button
      const profileConnectBtn = page.locator('button.artdeco-button:has-text("Connect"), button[aria-label*="Connect to"]').first();
      if (await profileConnectBtn.isVisible().catch(() => false)) {
        console.log('✅ Found direct "Connect" button on Profile Page! Clicking...');
        await profileConnectBtn.click();
        clickedConnect = true;
      } else {
        // Try More Menu button
        console.log('Clicking "More" menu on Profile Page...');
        const moreBtns = page.locator('button[aria-label*="More"], button:has-text("More")');
        const count = await moreBtns.count();
        if (count > 0) {
          await moreBtns.nth(count > 1 ? 1 : 0).click();
          await page.waitForTimeout(1500);

          const dropdownConnect = page.locator('ul.artdeco-dropdown__content li:has-text("Connect"), ul.artdeco-dropdown__content span:has-text("Connect"), div[role="button"]:has-text("Connect")').first();
          if (await dropdownConnect.isVisible().catch(() => false)) {
            console.log('✅ Found "Connect" in More dropdown menu! Clicking...');
            await dropdownConnect.click();
            clickedConnect = true;
          }
        }
      }
    }
  }

  if (clickedConnect) {
    await page.waitForTimeout(3000);

    const modalButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div.artdeco-modal button, button'));
      return btns.map(b => ({
        text: b.innerText.trim().replace(/\n/g, ' '),
        aria: b.getAttribute('aria-label') || '',
        class: b.className
      })).filter(b => b.text.includes('note') || b.text.includes('Send') || b.aria.includes('note') || b.aria.includes('Send'));
    });

    console.log('Invitation Modal Action Buttons Found:', modalButtons);

    // Look for "Add a note" button in invitation modal
    const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"], button[aria-label*="add a note"]').first();
    if (await addNoteBtn.isVisible().catch(() => false)) {
      console.log('✅ Found "Add a note" modal button! Clicking...');
      await addNoteBtn.click();
      await page.waitForTimeout(2000);

      const noteText = `Hi ${target.name}, I noticed your team's work in ${target.title} at ${target.company}. I bring 15+ yrs leading Program Transformation, ServiceNow HRSD, UAT & IB Ops (on 30-day notice). Would love to connect & explore synergy!`;

      console.log(`Writing customized note (${noteText.length} chars):\n"${noteText}"`);
      await page.fill('textarea[name="message"], textarea#custom-message', noteText);
      await page.waitForTimeout(1000);

      const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send invitation"], button[aria-label*="Send now"]').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        console.log('🚀 Clicking "Send" invitation button...');
        await sendBtn.click();
        await page.waitForTimeout(3000);

        console.log('\n🎉 SUCCESS: LIVE LINKEDIN CONNECTION INVITATION SENT SUCCESSFULLY!');

        // Record in connection_requests.json
        const logFile = path.join(__dirname, 'connection_requests.json');
        let logs = [];
        if (fs.existsSync(logFile)) {
          try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch (e) {}
        }
        logs.push({
          name: target.name,
          title: target.title,
          company: target.company,
          note: noteText,
          status: 'SENT',
          sentAt: new Date().toISOString()
        });
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
        console.log(`Logged connection request to connection_requests.json. Total sent: ${logs.length}`);
      }
    } else {
      console.log('Add a note modal button not visible. Trying direct Send...');
      const sendWithoutNote = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();
      if (await sendWithoutNote.isVisible().catch(() => false)) {
        await sendWithoutNote.click();
        console.log('Sent connection without note.');
      }
    }
  } else {
    console.log('❌ Could not interact with Connect button on LinkedIn.');
  }

  await ctx.close();
})().catch(console.error);
