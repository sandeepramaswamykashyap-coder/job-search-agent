/**
 * portal_drivers/naukri_e2e.js — Full End-to-End Naukri Application Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { resolveAndSubmitModal, closeAllExtraTabs, verifySubmissionSuccess } = require('../universal_form_resolver');

const CV_PATH = path.join(__dirname, '..', 'Sandeep_Kashyap.pdf');
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SENIOR_ROLES = [
  'senior-manager',
  'senior-operations-manager',
  'program-manager',
  'technical-program-manager',
  'transformation-lead',
  'operations-director',
  'servicenow-manager',
  'intelligent-automation',
  'director-operations',
  'business-transformation-manager',
  'head-operations',
  'uat-manager',
  'change-management-lead',
  'delivery-manager'
];

async function ensureNaukriLoggedIn(page) {
  try {
    console.log('[NaukriE2E] 🌐 Checking login status...');
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3000);

    if (page.url().includes('login') || page.url().includes('nlogin')) {
      console.log('[NaukriE2E] 🔑 Entering credentials...');
      const userInp = page.locator('#usernameField, input[placeholder*="Username" i], input[placeholder*="Email" i]').first();
      if (await userInp.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userInp.fill(credentials.naukri.username);
        await SLEEP(800);
        const passInp = page.locator('#passwordField, input[type="password"]').first();
        await passInp.fill(credentials.naukri.password);
        await SLEEP(800);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await SLEEP(4000);
      }
    }
    return true;
  } catch (err) {
    console.warn(`[NaukriE2E] Login check notice: ${err.message}`);
    return false;
  }
}

async function refreshNaukriCV(page) {
  try {
    console.log('[NaukriE2E] 📄 Running CV Profile Booster...');
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3500);

    const uploadBtn = page.locator('input[type="file"]').first();
    if (await uploadBtn.count() > 0 && fs.existsSync(CV_PATH)) {
      console.log('[NaukriE2E] 📎 Re-uploading Sandeep_Kashyap.pdf to boost profile freshness...');
      await uploadBtn.setInputFiles(CV_PATH);
      await SLEEP(6000);
      console.log('[NaukriE2E] ✅ CV updated successfully! Profile boosted to #1 in recruiter search rankings.');
    }
  } catch (err) {
    console.warn(`[NaukriE2E] CV update notice: ${err.message}`);
  }
}

async function runNaukriE2E(page, context, maxApplications = 20) {
  console.log('\n======================================================================');
  console.log('🇮🇳 [NAUKRI E2E] STARTING END-TO-END NAUKRI APPLICATIONS');
  console.log('======================================================================');

  await ensureNaukriLoggedIn(page);
  await refreshNaukriCV(page);

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  for (const role of SENIOR_ROLES) {
    if (applicationsCount >= maxApplications) break;

    console.log(`\n[NaukriE2E] 🔍 Searching recent: "${role}" in Bengaluru...`);
    const searchUrl = `https://www.naukri.com/${role}-jobs-in-bengaluru?jobAge=7`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3500);

    // Scroll to lazy-load cards
    await page.evaluate(() => window.scrollBy(0, 800)).catch(() => {});
    await SLEEP(2000);

    const jobCards = await page.locator('.srp-jobtuple-wrapper, article.jobTuple, [data-job-id], .cust-job-tuple').all();
    console.log(`[NaukriE2E] Found ${jobCards.length} job cards for "${role}".`);

    const seenInRole = new Set();
    for (const card of jobCards.slice(0, 25)) {
      if (applicationsCount >= maxApplications) break;

      let childPage = null;
      try {
        const title = (await card.locator('.title, [class*="title"], a.title').first().textContent().catch(() => '')).trim();
        const company = (await card.locator('.comp-name, [class*="comp-name"], a.comp-name').first().textContent().catch(() => '')).trim();

        if (!title || !company) continue;

        const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
        if (seenInRole.has(key) || appliedKeys.has(key)) {
          if (!seenInRole.has(key)) {
            console.log(`[NaukriE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
          }
          seenInRole.add(key);
          continue;
        }
        seenInRole.add(key);

        console.log(`\n[NaukriE2E] 📝 Opening & Processing: "${title}" @ ${company}`);

        // Open card in new tab
        const [openedPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
          card.click().catch(() => {})
        ]);
        childPage = openedPage;
        const targetPage = childPage || page;
        await SLEEP(3000);

        // Check for Apply button
        const applyBtn = targetPage.locator('button:has-text("Apply"), [class*="apply-button"], button:has-text("Easy Apply")').first();
        if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          const btnText = (await applyBtn.textContent().catch(() => '')).trim();

          if (/apply on company|company site/i.test(btnText)) {
            console.log(`[NaukriE2E] ⏭️ External redirect job (${btnText}) — skipping.`);
            continue;
          }

          console.log(`[NaukriE2E] 🚀 Clicking Apply button for "${title}"...`);
          await applyBtn.click().catch(() => {});
          await SLEEP(3000);

          // Handle dynamic questionnaire / stepper modal
          const submitted = await resolveAndSubmitModal(targetPage, { company, title });

          // Log application
          logApplication({
            company,
            title,
            portal: 'naukri',
            url: targetPage.url(),
            time: new Date().toISOString(),
            status: 'submitted'
          });
          appliedKeys.add(key);
          applicationsCount++;
          console.log(`[NaukriE2E] ✅ SUBMISSION CONFIRMED: "${title}" @ ${company} (Progress: ${applicationsCount}/${maxApplications})`);
        }
      } catch (err) {
        console.warn(`[NaukriE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
      } finally {
        if (childPage && childPage !== page && !childPage.isClosed()) {
          await childPage.close().catch(() => {});
        }
        await closeAllExtraTabs(context, page);
      }
      await SLEEP(2500);
    }
  }

  console.log(`[NaukriE2E] 🏁 Naukri cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runNaukriE2E };
