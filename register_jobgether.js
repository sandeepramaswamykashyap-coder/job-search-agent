/**
 * Job Search & Application Agent - Automated Jobgether Registration
 * Creates candidate account on Jobgether using Sandeep's profile credentials.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session_jobgether_signup');
const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'profile.json'), 'utf8'));

async function registerJobgetherAccount() {
  console.log('=================== AUTOMATING JOBGETHER ACCOUNT CREATION ===================');
  let browserContext;

  try {
    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--disable-blink-features=AutomationControlled']
    });

    const page = await browserContext.newPage();
    console.log('[JobgetherRegister] Navigating to Jobgether sign up page...');
    await page.goto('https://jobgether.com/auth/signup', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Look for registration input fields
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    if (await emailField.count() > 0) {
      console.log(`[JobgetherRegister] Entering candidate email: ${profile.personal_info.email}`);
      await emailField.fill(profile.personal_info.email);
      await page.waitForTimeout(1000);
    }

    const firstNameField = page.locator('input[name="firstName"], input[placeholder*="first name" i]').first();
    if (await firstNameField.count() > 0) {
      console.log(`[JobgetherRegister] Entering first name: ${profile.personal_info.first_name}`);
      await firstNameField.fill(profile.personal_info.first_name);
    }

    const lastNameField = page.locator('input[name="lastName"], input[placeholder*="last name" i]').first();
    if (await lastNameField.count() > 0) {
      console.log(`[JobgetherRegister] Entering last name: ${profile.personal_info.last_name}`);
      await lastNameField.fill(profile.personal_info.last_name);
    }

    const screenshotPath = path.join(__dirname, 'jobgether_registration_form.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`[JobgetherRegister] Form screenshot saved to ${screenshotPath}`);

  } catch (err) {
    console.error(`[JobgetherRegister] Error: ${err.message}`);
  } finally {
    if (browserContext) await browserContext.close().catch(() => {});
  }
}

registerJobgetherAccount();
