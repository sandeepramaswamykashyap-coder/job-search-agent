const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('=================== SLOW-MOTION VISUAL BROWSER DEMONSTRATION ===================');
  console.log('Launching Chromium in Headed Mode with slowMo: 1500ms so you can visually watch every single action...');

  const userDataDir = path.join(__dirname, '.browser_session');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 1500, // 1.5 second delay per action!
    viewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();

  // Helper to visually highlight element before interacting
  async function highlightAndFill(selector, text, label) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.isVisible().catch(() => false)) {
        console.log(`[Visual] Highlighting & filling ${label}: "${text}"`);
        await loc.evaluate(el => {
          el.style.border = '4px solid #ff0055';
          el.style.backgroundColor = '#ffffaa';
        });
        await page.waitForTimeout(1000);
        await loc.fill(text);
        await page.waitForTimeout(1000);
      }
    } catch (e) {}
  }

  // 1. Visit WeWorkRemotely Job Posting
  console.log('\n[Visual Demo 1] Navigating to WeWorkRemotely Remote Leadership posting...');
  await page.goto('https://weworkremotely.com/remote-jobs/stripe-technical-program-manager-money-as-a-service', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 2. Visit Storyteller ApplyToJob ATS Form
  console.log('\n[Visual Demo 2] Navigating to Storyteller JazzHR ATS application form...');
  await page.goto('https://storyteller.applytojob.com/apply/AIGgQqs3nE/AI-Operations-Manager?source=working+nomads', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await highlightAndFill('input#resumator_firstname_field', 'Sandeep', 'First Name');
  await highlightAndFill('input#resumator_lastname_field', 'Ramaswamy Kashyap', 'Last Name');
  await highlightAndFill('input#resumator_email_field', 'sandeepramaswamykashyap@gmail.com', 'Email');
  await highlightAndFill('input#resumator_phone_field', '+91 63663 25217', 'Phone Number');
  await highlightAndFill('input#resumator_linkedin_field, input[name*="linkedin"]', 'https://www.linkedin.com/in/sandeepramaswamykashyap/', 'LinkedIn URL');

  // Attach CV
  const cvPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0 && fs.existsSync(cvPath)) {
    console.log('[Visual Demo] Highlighting Resume Upload field and attaching Sandeep_Kashyap.pdf...');
    await fileInput.setInputFiles(cvPath);
    await page.waitForTimeout(3000);
  }

  // 3. Visit LinkedIn Sent Invitations Tab
  console.log('\n[Visual Demo 3] Navigating to your live LinkedIn Sent Invitations Manager...');
  await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  console.log('\n=================== VISUAL DEMO COMPLETE ===================');
  console.log('Keeping Chrome open for 20 seconds so you can inspect the screen...');
  await page.waitForTimeout(20000);

  await browser.close().catch(() => {});
})().catch(console.error);
