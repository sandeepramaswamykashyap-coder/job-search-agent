/**
 * portal_drivers/timesjobs_e2e.js — Full End-to-End TimesJobs Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { resolveAndSubmitModal, closeAllExtraTabs } = require('../universal_form_resolver');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ensureTimesJobsLoggedIn(page) {
  try {
    console.log('[TimesJobsE2E] 🌐 Navigating to TimesJobs login...');
    await page.goto('https://www.timesjobs.com/candidate/login.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3000);

    const userInp = page.locator('#j_username, input[name="j_username"], input[type="text"]').first();
    if (await userInp.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[TimesJobsE2E] 🔑 Entering credentials...');
      await userInp.fill(credentials.timesjobs.username);
      await SLEEP(600);
      const passInp = page.locator('#j_password, input[type="password"]').first();
      await passInp.fill(credentials.timesjobs.password);
      await SLEEP(600);
      await page.click('button[type="submit"], input[type="submit"], .btn-submit');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await SLEEP(3000);
    }
    return true;
  } catch (err) {
    console.warn(`[TimesJobsE2E] Login notice: ${err.message}`);
    return false;
  }
}

async function runTimesJobsE2E(page, context, maxApplications = 10) {
  console.log('\n======================================================================');
  console.log('⏰ [TIMESJOBS E2E] STARTING END-TO-END TIMESJOBS APPLICATIONS');
  console.log('======================================================================');

  await ensureTimesJobsLoggedIn(page);

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  const TIMESJOBS_ROLES = [
    'Senior Manager',
    'Senior Operations Manager',
    'Program Manager',
    'Technical Program Manager'
  ];

  try {
    for (const role of TIMESJOBS_ROLES) {
      if (applicationsCount >= maxApplications) break;

      const encoded = encodeURIComponent(role);
      const searchUrl = `https://www.timesjobs.com/candidate/job-search.html?from=submit&actualTxtKeywords=${encoded}&searchBy=0&rdoOperator=OR&searchType=personalizedSearch&luceneResultSize=25&postWeek=60&txtLocation=Bengaluru`;
      console.log(`\n[TimesJobsE2E] 🔍 Searching: "${role}" in Bengaluru...`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await SLEEP(3500);

      const jobCards = await page.locator('.job-bx, .job-tuple, .srp-listing').all();
      console.log(`[TimesJobsE2E] Found ${jobCards.length} job cards for "${role}".`);

      const seenInRole = new Set();
      for (const card of jobCards.slice(0, 8)) {
        if (applicationsCount >= maxApplications) break;

        try {
          const titleEl = card.locator('h2 a, .job-title').first();
          const compEl = card.locator('h3.joblist-comp-name, .company-name').first();

          const title = (await titleEl.innerText().catch(() => 'Program Leadership')).trim();
          const company = (await compEl.innerText().catch(() => 'TimesJobs Employer')).trim();

          if (!title || !company) continue;

          const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
          if (seenInRole.has(key) || appliedKeys.has(key)) {
            if (!seenInRole.has(key)) {
              console.log(`[TimesJobsE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
            }
            seenInRole.add(key);
            continue;
          }
          seenInRole.add(key);

          const applyBtn = card.locator('a:has-text("Apply"), button:has-text("Apply")').first();
          if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`\n[TimesJobsE2E] 🚀 Submitting Application for "${title}" @ ${company}...`);
            await applyBtn.click().catch(() => {});
            await SLEEP(2500);

            await resolveAndSubmitModal(page, { company, title });

            logApplication({
              company,
              title,
              portal: 'timesjobs',
              url: page.url(),
              time: new Date().toISOString(),
              status: 'submitted'
            });
            appliedKeys.add(key);
            applicationsCount++;
            console.log(`[TimesJobsE2E] ✅ SUBMISSION CONFIRMED: "${title}" @ ${company} (${applicationsCount}/${maxApplications})`);
          }
        } catch (err) {
          console.warn(`[TimesJobsE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
        } finally {
          await closeAllExtraTabs(context, page);
        }
        await SLEEP(2000);
      }
    }
  } catch (err) {
    console.error(`[TimesJobsE2E] Error: ${err.message}`);
  }

  console.log(`[TimesJobsE2E] 🏁 TimesJobs cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runTimesJobsE2E };
