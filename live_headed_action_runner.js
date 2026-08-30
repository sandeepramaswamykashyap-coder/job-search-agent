const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('=================== LIVE HEADED VISUAL ACTION RUNNER ===================');
  console.log('Launching Chromium in VISIBLE HEADED MODE (headless: false, slowMo: 1000ms)...');

  const userDataDir = path.join(__dirname, '.browser_session');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 1000,
    viewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();

  async function fillVisible(selector, text, label) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.isVisible().catch(() => false)) {
        console.log(`[Live Action] Highlighting and typing ${label}: "${text}"`);
        await loc.evaluate(el => {
          el.style.border = '4px solid #ff0055';
          el.style.backgroundColor = '#ffffaa';
        });
        await page.waitForTimeout(800);
        await loc.fill(text);
        await page.waitForTimeout(800);
      }
    } catch (e) {}
  }

  // Pass 1: WeWorkRemotely Stripe Technical Program Manager
  console.log('\n[Pass 1] Navigating to WeWorkRemotely Remote Leadership Listing...');
  await page.goto('https://weworkremotely.com/remote-jobs/stripe-technical-program-manager-money-as-a-service', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Pass 2: JazzHR Storyteller Application Form
  console.log('\n[Pass 2] Navigating to Storyteller JazzHR Application Form...');
  await page.goto('https://storyteller.applytojob.com/apply/AIGgQqs3nE/AI-Operations-Manager?source=working+nomads', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await fillVisible('input#resumator_firstname_field', 'Sandeep', 'First Name');
  await fillVisible('input#resumator_lastname_field', 'Ramaswamy Kashyap', 'Last Name');
  await fillVisible('input#resumator_email_field', 'sandeepramaswamykashyap@gmail.com', 'Email');
  await fillVisible('input#resumator_phone_field', '+91 63663 25217', 'Phone Number');
  await fillVisible('input#resumator_linkedin_field, input[name*="linkedin"]', 'https://www.linkedin.com/in/sandeepramaswamykashyap/', 'LinkedIn URL');

  const cvPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0 && fs.existsSync(cvPath)) {
    console.log('[Live Action] Attaching Sandeep_Kashyap.pdf CV resume...');
    await fileInput.setInputFiles(cvPath);
    await page.waitForTimeout(3000);
  }

  // Pass 3: LinkedIn Invitations Outbox
  console.log('\n[Pass 3] Navigating to LinkedIn Sent Invitations Tab...');
  await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);

  console.log('\n=================== VISUAL ACTION PASS COMPLETE ===================');
  console.log('Keeping Chrome open for 30 seconds for visual verification...');
  await page.waitForTimeout(30000);

  await browser.close().catch(() => {});
})().catch(console.error);
