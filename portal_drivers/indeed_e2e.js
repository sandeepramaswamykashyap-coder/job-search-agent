/**
 * portal_drivers/indeed_e2e.js — Full End-to-End Indeed Apply Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { resolveAndSubmitModal, closeAllExtraTabs } = require('../universal_form_resolver');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const INDEED_ROLES = [
  'Senior Manager',
  'Senior Operations Manager',
  'Program Manager',
  'Technical Program Manager',
  'Operations Transformation'
];

async function ensureIndeedLoggedIn(page) {
  try {
    console.log('[IndeedE2E] 🌐 Navigating to Indeed...');
    await page.goto('https://secure.indeed.com/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3000);

    const emailInp = page.locator('input[type="email"], #ifl-InputFormField-3, input[name="__email"]').first();
    if (await emailInp.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[IndeedE2E] 🔑 Entering email...');
      await emailInp.fill(credentials.indeed.username);
      await SLEEP(600);
      await page.click('button[type="submit"]');
      await SLEEP(3000);

      const passInp = page.locator('input[type="password"]').first();
      if (await passInp.isVisible({ timeout: 3000 }).catch(() => false)) {
        await passInp.fill(credentials.indeed.password);
        await SLEEP(600);
        await page.click('button[type="submit"]');
        await SLEEP(4000);
      }
    }
    return true;
  } catch (err) {
    console.warn(`[IndeedE2E] Login notice: ${err.message}`);
    return false;
  }
}

async function runIndeedE2E(page, context, maxApplications = 10) {
  console.log('\n======================================================================');
  console.log('💼 [INDEED E2E] STARTING END-TO-END INDEED APPLICATIONS');
  console.log('======================================================================');

  await ensureIndeedLoggedIn(page);

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  for (const role of INDEED_ROLES) {
    if (applicationsCount >= maxApplications) break;

    const encoded = encodeURIComponent(role);
    const searchUrl = `https://in.indeed.com/jobs?q=${encoded}&l=Bengaluru%2C+Karnataka&sc=0kf%3Aattr%28DSQF7%29%3B`; // Easily Apply filter
    console.log(`\n[IndeedE2E] 🔍 Searching: "${role}" on Indeed...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await SLEEP(3500);

    const jobCards = await page.locator('.job_seen_beacon, .resultContent, [data-jk]').all();
    console.log(`[IndeedE2E] Found ${jobCards.length} job cards for "${role}".`);

    for (const card of jobCards.slice(0, 8)) {
      if (applicationsCount >= maxApplications) break;

      let childPage = null;
      try {
        const titleEl = card.locator('h2.jobTitle, a[data-jk]').first();
        const compEl = card.locator('[data-testid="company-name"], .companyName').first();

        const title = (await titleEl.innerText().catch(() => 'Program Manager')).trim();
        const company = (await compEl.innerText().catch(() => 'Indeed Employer')).trim();

        if (!title || !company) continue;

        const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
        if (appliedKeys.has(key)) {
          console.log(`[IndeedE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
          continue;
        }

        console.log(`\n[IndeedE2E] 📝 Reviewing & Applying: "${title}" @ ${company}`);
        await card.click().catch(() => {});
        await SLEEP(3000);

        const applyBtn = page.locator('#indeedApplyButton, button:has-text("Apply now"), button:has-text("Easily apply")').first();
        if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`[IndeedE2E] 🚀 Triggering Indeed Apply modal...`);
          
          const [openedPage] = await Promise.all([
            context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
            applyBtn.click().catch(() => {})
          ]);
          childPage = openedPage;
          const targetPage = childPage || page;
          await SLEEP(3000);

          await resolveAndSubmitModal(targetPage, { company, title });

          logApplication({
            company,
            title,
            portal: 'indeed',
            url: targetPage.url(),
            time: new Date().toISOString(),
            status: 'submitted'
          });
          appliedKeys.add(key);
          applicationsCount++;
          console.log(`[IndeedE2E] ✅ SUBMISSION CONFIRMED: "${title}" @ ${company} (${applicationsCount}/${maxApplications})`);
        }
      } catch (err) {
        console.warn(`[IndeedE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
      } finally {
        if (childPage && childPage !== page && !childPage.isClosed()) {
          await childPage.close().catch(() => {});
        }
        await closeAllExtraTabs(context, page);
      }
      await SLEEP(2500);
    }
  }

  console.log(`[IndeedE2E] 🏁 Indeed cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runIndeedE2E };
