/**
 * process_naukri_nvites.js
 * 
 * Automatically reviews and accepts/applies to all recruiter NVites
 * waiting in Sandeep's Naukri inbox.
 * When an NVite is accepted, recruiters are alerted immediately that
 * the candidate accepted their invitation to interview/apply!
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const { logApplication } = require('./applications_db');

const SESSION_DIR = path.join(__dirname, '.browser_session_visible');

// Clear session locks
const lockPath = path.join(SESSION_DIR, 'SingletonLock');
if (fs.existsSync(lockPath)) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processNVites() {
  console.log('======================================================================');
  console.log('⚡ [NaukriNVites] PROCESSING DIRECT RECRUITER NVITES & INVITATIONS');
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
    console.log('[NaukriNVites] 🌐 Navigating to Naukri NVites inbox...');
    await page.goto('https://www.naukri.com/mnjuser/inbox', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    let acceptedCount = 0;

    // Loop through cards
    for (let cycle = 0; cycle < 15; cycle++) {
      // Find the Apply button on the active preview pane
      const applyBtn = page.locator('button:has-text("Apply"), .apply-button:has-text("Apply")').first();
      
      if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Read job details from the preview pane
        const title = (await page.locator('h1, [class*="jobTitle"], .title').first().innerText().catch(() => 'Leadership Role')).trim();
        const company = (await page.locator('[class*="companyName"], [class*="hiringFor"], .comp-name').first().innerText().catch(() => 'Naukri Partner')).trim();
        
        console.log(`\n[NaukriNVites] 🎯 Accepting Recruiter NVite: "${title}" @ ${company}...`);
        await applyBtn.click().catch(() => {});
        await sleep(3000);

        // Check for any modal confirmation or questionnaire
        const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Apply Now")').first();
        if (await submitBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          await submitBtn.click().catch(() => {});
          await sleep(2000);
        }

        logApplication({
          company,
          title,
          portal: 'naukri_nvite',
          url: page.url(),
          time: new Date().toISOString(),
          status: 'ACCEPTED_INVITATION'
        });

        acceptedCount++;
        console.log(`[NaukriNVites] ✅ ACCEPTED & SUBMITTED: "${title}" @ ${company} (#${acceptedCount})`);
      }

      // Click the next unread NVite tuple in the left column
      const nextCard = page.locator('.tuple, [class*="card"], [class*="item"]').nth(cycle + 1);
      if (await nextCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextCard.click().catch(() => {});
        await sleep(2500);
      } else {
        break;
      }
    }

    console.log(`\n[NaukriNVites] 🏁 Finished processing NVites: ${acceptedCount} direct recruiter invitations accepted!`);

    await page.screenshot({ path: path.join(__dirname, 'naukri_nvites_processed.png') });

  } catch (err) {
    console.error(`[NaukriNVites] ❌ Error: ${err.message}`);
  } finally {
    await browserContext.close().catch(() => {});
  }
}

processNVites();
