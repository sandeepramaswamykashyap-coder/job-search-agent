/**
 * Job Search & Application Agent - Remote Platforms Candidate Profile Setup
 * Inspects registration flows and automates candidate profile setup on global remote portals.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session_remote_profile');
const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'profile.json'), 'utf8'));

async function inspectAndSetupJobgetherProfile() {
  console.log('=================== SETTING UP REMOTE PROFILES (JOBGETHER) ===================');
  let browserContext;

  try {
    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--disable-blink-features=AutomationControlled']
    });

    const page = await browserContext.newPage();
    console.log('[JobgetherProfile] Navigating to Jobgether signup page...');
    await page.goto('https://jobgether.com/auth/signup', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[JobgetherProfile] Page Title: "${title}"`);

    // Check if email input exists
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.count() > 0) {
      console.log('[JobgetherProfile] Filling email: sandeepramaswamykashyap@gmail.com');
      await emailInput.first().fill(profile.personal_info.email);
      await page.waitForTimeout(1000);
    } else {
      console.log('[JobgetherProfile] Alternative auth options present (Google OAuth / Single Sign-On).');
    }

    // Save screenshot for user confirmation
    const screenshotPath = path.join(__dirname, 'jobgether_profile_setup.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`[JobgetherProfile] Screenshot saved to ${screenshotPath}`);

  } catch (err) {
    console.error(`[JobgetherProfile] Error during setup: ${err.message}`);
  } finally {
    if (browserContext) await browserContext.close().catch(() => {});
  }
}

async function explainRemotePortalMechanics() {
  console.log('\n=================== GLOBAL REMOTE PORTALS ARCHITECTURE ===================');
  console.log('1. We Work Remotely: Direct-Apply platform. No candidate account needed; applications submit via recruiter email or employer ATS.');
  console.log('2. RemoteOK: Open remote board. Applications submit directly to hiring manager emails or company career URLs.');
  console.log('3. Jobgether: Candidate profile platform. Profile setup automated via Jobgether signup form.');
  console.log('=========================================================================\n');
}

async function runProfileSetup() {
  await explainRemotePortalMechanics();
  await inspectAndSetupJobgetherProfile();
}

if (require.main === module) {
  runProfileSetup();
}

module.exports = { runProfileSetup };
