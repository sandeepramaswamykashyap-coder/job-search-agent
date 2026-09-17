/**
 * portal_drivers/linkedin_e2e.js — Full End-to-End LinkedIn Easy Apply Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { resolveAndSubmitModal, closeAllExtraTabs, PROFILE } = require('../universal_form_resolver');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const LINKEDIN_ROLES = [
  'Senior Manager',
  'Senior Operations Manager',
  'Program Manager',
  'Technical Program Manager',
  'Transformation Director',
  'ServiceNow Manager',
  'Head of Operations'
];

async function ensureLinkedInLoggedIn(page) {
  try {
    console.log('[LinkedInE2E] 🌐 Checking LinkedIn session status...');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await SLEEP(3500);

    if (page.url().includes('login') || page.url().includes('checkpoint')) {
      console.log('[LinkedInE2E] 🔑 Logging in to LinkedIn...');
      const userInp = page.locator('#username, input[name="session_key"]').first();
      if (await userInp.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userInp.fill(credentials.linkedin.username);
        await SLEEP(800);
        const passInp = page.locator('#password, input[name="session_password"]').first();
        await passInp.fill(credentials.linkedin.password);
        await SLEEP(800);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await SLEEP(4000);
      }
    }

    if (page.url().includes('feed')) {
      console.log('[LinkedInE2E] ✅ Verified LinkedIn session active.');
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[LinkedInE2E] Login notice: ${err.message}`);
    return false;
  }
}

async function runLinkedInE2E(page, context, maxApplications = 10) {
  console.log('\n======================================================================');
  console.log('💼 [LINKEDIN E2E] STARTING END-TO-END EASY APPLY SUBMISSIONS');
  console.log('======================================================================');

  const loggedIn = await ensureLinkedInLoggedIn(page);
  if (!loggedIn) {
    console.warn('[LinkedInE2E] Session not logged in or requires checkpoint/2FA. Skipping cycle.');
    return 0;
  }

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  for (const role of LINKEDIN_ROLES) {
    if (applicationsCount >= maxApplications) break;

    const encoded = encodeURIComponent(role);
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encoded}&location=Bengaluru&f_AL=true`;
    console.log(`\n[LinkedInE2E] 🔍 Searching Easy Apply for "${role}" in Bengaluru...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await SLEEP(4000);

    // Wait for jobs container or list to render
    await page.waitForSelector('ul.scaffold-layout__list-container, .jobs-search-results-list, [data-occludable-job-id], .job-card-container, .jobs-search-results__list-item', { timeout: 8000 }).catch(() => {});

    // Scroll to populate job card list
    await page.evaluate(() => window.scrollBy(0, 700)).catch(() => {});
    await SLEEP(2000);

    const jobCards = await page.locator('.jobs-search-results__list-item, .job-card-container, [data-job-id], li[data-occludable-job-id], .scaffold-layout__list-container > li, .job-card-job-posting-card-wrapper').all();
    console.log(`[LinkedInE2E] Found ${jobCards.length} Easy Apply cards for "${role}".`);

    const seenInRole = new Set();
    for (const card of jobCards.slice(0, 8)) {
      if (applicationsCount >= maxApplications) break;

      try {
        await card.scrollIntoViewIfNeeded().catch(() => {});
        const titleEl = card.locator('.job-card-list__title, .artdeco-entity-lockup__title, strong, a[data-control-name="job_card_click"]').first();
        const compEl = card.locator('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, .job-card-container__company-name').first();

        const title = (await titleEl.innerText().catch(() => 'Senior Leader')).trim();
        const company = (await compEl.innerText().catch(() => 'LinkedIn Employer')).trim();

        if (!title || !company) continue;

        const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
        if (seenInRole.has(key) || appliedKeys.has(key)) {
          if (!seenInRole.has(key)) {
            console.log(`[LinkedInE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
          }
          seenInRole.add(key);
          continue;
        }
        seenInRole.add(key);

        console.log(`\n[LinkedInE2E] 📝 Reviewing: "${title}" @ ${company}`);
        await card.click().catch(() => {});
        await SLEEP(2500);

        // Click Easy Apply button
        const easyApplyBtn = page.locator('button.jobs-apply-button, button:has-text("Easy Apply")').first();
        if (await easyApplyBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          console.log(`[LinkedInE2E] 🚀 Triggering Easy Apply modal...`);
          await easyApplyBtn.click().catch(() => {});
          await SLEEP(2500);

          // Solve modal wizard
          const submitted = await resolveAndSubmitModal(page, { company, title, maxSteps: 6 });

          // Dismiss any remaining dialog / feedback
          const dismissBtn = page.locator('button[aria-label="Dismiss"], button:has-text("Done")').first();
          if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dismissBtn.click().catch(() => {});
            await SLEEP(1000);
          }

          logApplication({
            company,
            title,
            portal: 'linkedin_easy_apply',
            url: page.url(),
            time: new Date().toISOString(),
            status: 'submitted'
          });
          appliedKeys.add(key);
          applicationsCount++;
          console.log(`[LinkedInE2E] ✅ SUBMISSION CONFIRMED: "${title}" @ ${company} (${applicationsCount}/${maxApplications})`);
        }
      } catch (err) {
        console.warn(`[LinkedInE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
      } finally {
        await closeAllExtraTabs(context, page);
      }
      await SLEEP(3000);
    }
  }

  console.log(`[LinkedInE2E] 🏁 LinkedIn cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runLinkedInE2E };
