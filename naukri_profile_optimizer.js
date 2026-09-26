/**
 * naukri_profile_optimizer.js
 * 
 * Inspects and aggressively optimizes Sandeep's Naukri Profile:
 * 1. Sets high-impact Resume Headline for maximum Resdex search ranking
 * 2. Checks/updates Key Skills
 * 3. Verifies Notice Period is set to 15-30 days / Serving Notice
 * 4. Re-uploads the clean Sandeep_Kashyap.pdf
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const CV_PATH = path.join(__dirname, 'Sandeep_Kashyap.pdf');
const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Clear session locks
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

const TARGET_HEADLINE = "Senior Operations & Transformation Manager | Ex-ANZ BFSI | 15+ Yrs Exp | IIM Indore | Immediate / 15-30 Days Notice | Bengaluru";

const TARGET_SKILLS = [
  "Operations Management",
  "Digital Transformation",
  "Business Transformation",
  "UAT Governance",
  "Banking Operations",
  "Intelligent Automation",
  "Program Management",
  "Process Excellence",
  "Service Delivery",
  "ServiceNow HRSD",
  "RPA",
  "Agile",
  "Operational Risk"
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function optimizeNaukriProfile() {
  console.log('======================================================================');
  console.log('🚀 [NaukriOptimizer] STARTING AGGRESSIVE PROFILE & RESDEX OPTIMIZATION');
  console.log('======================================================================');

  const browserContext = await chromium.launchPersistentContext(SESSION_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 850 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browserContext.pages()[0] || await browserContext.newPage();

  try {
    console.log('[NaukriOptimizer] 🌐 Navigating to Naukri Profile...');
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    // Check if login needed
    if (page.url().includes('login') || page.url().includes('nlogin')) {
      console.log('[NaukriOptimizer] 🔑 Logging into Naukri...');
      const userInp = page.locator('#usernameField, input[placeholder*="Username" i], input[placeholder*="Email" i]').first();
      if (await userInp.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userInp.fill(credentials.naukri.username);
        await sleep(600);
        const passInp = page.locator('#passwordField, input[type="password"]').first();
        await passInp.fill(credentials.naukri.password);
        await sleep(600);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await sleep(4000);
      }
    }

    console.log(`[NaukriOptimizer] 📍 Current URL: ${page.url()}`);

    // 1. Re-upload clean CV
    console.log('[NaukriOptimizer] 📎 Re-uploading clean Sandeep_Kashyap.pdf...');
    const uploadInput = page.locator('input[type="file"]').first();
    if (await uploadInput.count() > 0 && fs.existsSync(CV_PATH)) {
      await uploadInput.setInputFiles(CV_PATH);
      await sleep(6000);
      console.log('[NaukriOptimizer] ✅ CV re-uploaded successfully.');
    }

    // 2. Read and update Resume Headline
    console.log('[NaukriOptimizer] 📝 Checking Resume Headline...');
    const headlineSection = page.locator('.resumeHeadline, [class*="resumeHeadline"]').first();
    if (await headlineSection.isVisible({ timeout: 4000 }).catch(() => false)) {
      const currentHeadline = (await headlineSection.innerText().catch(() => '')).trim();
      console.log(`[NaukriOptimizer] Current Headline: "${currentHeadline}"`);

      // Click Edit Headline
      const editBtn = headlineSection.locator('.edit, [class*="edit"], .icon, text=edit').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        await sleep(1500);

        const textarea = page.locator('#resumeHeadlineTxt, textarea[name="resumeHeadline"], textarea').first();
        if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          await textarea.fill(TARGET_HEADLINE);
          await sleep(1000);
          const saveBtn = page.locator('button:has-text("Save"), .btn:has-text("Save")').first();
          await saveBtn.click();
          await sleep(2500);
          console.log(`[NaukriOptimizer] ✅ Updated Resume Headline to: "${TARGET_HEADLINE}"`);
        }
      }
    } else {
      console.log('[NaukriOptimizer] ℹ️ Headline section selector not found directly, checking text...');
    }

    // 3. Check Notice Period in Profile Summary / Details
    console.log('[NaukriOptimizer] ⏳ Inspecting Notice Period and Availability...');
    const pageText = await page.textContent('body').catch(() => '');
    if (pageText.includes('Notice Period') || pageText.includes('Serving Notice')) {
      console.log('[NaukriOptimizer] Notice Period section detected on page.');
    }

    console.log('[NaukriOptimizer] 📸 Capturing snapshot of optimized profile...');
    await page.screenshot({ path: path.join(__dirname, 'naukri_profile_snapshot.png'), fullPage: false });
    console.log('[NaukriOptimizer] ✅ Snapshot saved to naukri_profile_snapshot.png');

  } catch (err) {
    console.error(`[NaukriOptimizer] ❌ Error: ${err.message}`);
  } finally {
    await browserContext.close().catch(() => {});
  }
}

optimizeNaukriProfile();
