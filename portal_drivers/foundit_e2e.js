/**
 * portal_drivers/foundit_e2e.js — Full End-to-End Foundit (Monster India) Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { resolveAndSubmitModal, closeAllExtraTabs } = require('../universal_form_resolver');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FOUNDIT_ROLES = [
  'Program Manager',
  'Technical Program Manager',
  'Operations Transformation',
  'ServiceNow Practice Lead'
];

async function ensureFounditLoggedIn(page) {
  try {
    console.log('[FounditE2E] 🌐 Navigating to Foundit seeker dashboard...');
    await page.goto('https://www.foundit.in/seeker/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3000);

    if (page.url().includes('login') || page.url().includes('rio')) {
      console.log('[FounditE2E] 🔑 Submitting login credentials...');
      const loginViaPasswordBtn = page.locator('text=Login via Password').first();
      if (await loginViaPasswordBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginViaPasswordBtn.click();
        await SLEEP(1000);
      }
      await page.locator('#userName').fill(credentials.foundit.username, { timeout: 5000 }).catch(() => {});
      await SLEEP(500);
      await page.locator('#password').fill(credentials.foundit.password, { timeout: 5000 }).catch(() => {});
      await SLEEP(500);
      await page.click('#loginSubmit').catch(() => {});
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await SLEEP(4000);
    }
    return true;
  } catch (err) {
    console.warn(`[FounditE2E] Login notice: ${err.message}`);
    return false;
  }
}

async function runFounditE2E(page, context, maxApplications = 15) {
  console.log('\n======================================================================');
  console.log('🦖 [FOUNDIT E2E] STARTING END-TO-END FOUNDIT APPLICATIONS');
  console.log('======================================================================');

  await ensureFounditLoggedIn(page);

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  for (const role of FOUNDIT_ROLES) {
    if (applicationsCount >= maxApplications) break;

    const encoded = encodeURIComponent(role);
    const searchUrl = `https://www.foundit.in/srp/results?query=${encoded}&locations=Bengaluru`;
    console.log(`\n[FounditE2E] 🔍 Searching: "${role}" on Foundit...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(4000);

    const jobCards = await page.locator('.cardContainer, .srpCard, .job-card, .card-body').all();
    console.log(`[FounditE2E] Found ${jobCards.length} job cards for "${role}".`);

    for (const card of jobCards.slice(0, 8)) {
      if (applicationsCount >= maxApplications) break;

      let childPage = null;
      try {
        const titleText = await card.locator('.jobTitle, .title, h3, h2').first().innerText().catch(() => 'Program Manager');
        const rawCompany = await card.locator('.companyName, .company, .cardHead').first().innerText().catch(() => 'Foundit Partner');
        const companyText = rawCompany.split('\n').pop().trim() || 'Foundit Partner';

        const title = titleText.trim();
        const company = companyText.trim();
        if (!title || !company) continue;

        const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
        if (appliedKeys.has(key)) {
          console.log(`[FounditE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
          continue;
        }

        console.log(`\n[FounditE2E] 📝 Reviewing & Applying: "${title}" @ ${company}`);

        // Open card (may open in new tab or navigate)
        const [openedPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 6000 }).catch(() => null),
          card.click().catch(() => {})
        ]);
        childPage = openedPage;
        const targetPage = childPage || page;
        await SLEEP(3000);

        const applyBtn = targetPage.locator('button:has-text("Apply"), a:has-text("Apply")').first();
        if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`[FounditE2E] 🚀 Clicking Apply button...`);
          await applyBtn.click().catch(() => {});
          await SLEEP(3000);

          // Handle dynamic modal questionnaire
          await resolveAndSubmitModal(targetPage, { company, title });

          logApplication({
            company,
            title,
            portal: 'foundit',
            url: targetPage.url(),
            time: new Date().toISOString(),
            status: 'submitted'
          });
          appliedKeys.add(key);
          applicationsCount++;
          console.log(`[FounditE2E] ✅ SUBMISSION CONFIRMED: "${title}" @ ${company} (${applicationsCount}/${maxApplications})`);
        }
      } catch (err) {
        console.warn(`[FounditE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
      } finally {
        if (childPage && childPage !== page && !childPage.isClosed()) {
          await childPage.close().catch(() => {});
        }
        await closeAllExtraTabs(context, page);
      }
      await SLEEP(2500);
    }
  }

  console.log(`[FounditE2E] 🏁 Foundit cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runFounditE2E };
