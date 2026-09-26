/**
 * update_naukri_headline.js
 * 
 * Accurately updates Naukri Resume Headline using direct page clicks.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Clear session locks
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

const NEW_HEADLINE = "Senior Operations & Transformation Manager | Ex-ANZ BFSI | 15 Yrs Exp | IIM Indore | Immediate / 15 Days Notice | Bengaluru";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateHeadline() {
  console.log('======================================================================');
  console.log('✏️  [NaukriHeadline] UPDATING RESUME HEADLINE ON NAUKRI');
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
    console.log('[NaukriHeadline] 🌐 Opening Naukri Profile...');
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    // Click "Resume headline" on left quick links
    console.log('[NaukriHeadline] 🔍 Clicking Resume headline quick link...');
    const quickLink = page.locator('span:has-text("Resume headline"), a:has-text("Resume headline")').first();
    if (await quickLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await quickLink.click();
      await sleep(1500);
    }

    // Look for the edit link/pencil in the resume headline widget
    const editHeadlineBtn = page.locator('.resumeHeadline .edit, [class*="resumeHeadline"] span.edit, span:has-text("editOneTheme")').first();
    if (await editHeadlineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[NaukriHeadline] Clicking Edit Headline...');
      await editHeadlineBtn.click();
      await sleep(1500);
    } else {
      // Try clicking anywhere on the headline text
      const headlineBox = page.locator('.resumeHeadline, [class*="resumeHeadline"]').first();
      await headlineBox.click().catch(() => {});
      await sleep(1500);
    }

    // Now check for textarea
    const textarea = page.locator('#resumeHeadlineTxt, textarea').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`[NaukriHeadline] Filling new headline (${NEW_HEADLINE.length} chars)...`);
      await textarea.fill(NEW_HEADLINE);
      await sleep(1000);

      // Click Save
      const saveBtn = page.locator('button:has-text("Save"), .btn:has-text("Save")').first();
      await saveBtn.click();
      await sleep(3000);
      console.log('[NaukriHeadline] ✅ Saved new Resume Headline successfully!');
    } else {
      console.warn('[NaukriHeadline] ⚠️ Textarea not visible after click.');
    }

    await page.screenshot({ path: path.join(__dirname, 'naukri_headline_updated.png') });
    console.log('[NaukriHeadline] 📸 Screenshot saved to naukri_headline_updated.png');

  } catch (err) {
    console.error(`[NaukriHeadline] ❌ Error: ${err.message}`);
  } finally {
    await browserContext.close().catch(() => {});
  }
}

updateHeadline();
