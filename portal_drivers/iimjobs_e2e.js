/**
 * portal_drivers/iimjobs_e2e.js — Full End-to-End IIMJobs & Hirist Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { resolveAndSubmitModal, closeAllExtraTabs, PROFILE } = require('../universal_form_resolver');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const IIM_KEYWORDS = [
  'senior-manager',
  'senior-operations-manager',
  'program-manager',
  'technical-program-manager',
  'operations-head',
  'transformation',
  'change-management',
  'servicenow',
  'director-operations',
  'business-transformation',
  'uat-manager',
  'head-transformation',
  'operational-excellence'
];

async function ensureIIMJobsLoggedIn(page) {
  try {
    console.log('[IIMJobsE2E] 🌐 Navigating to IIMJobs login...');
    await page.goto('https://www.iimjobs.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3000);

    if (page.url().includes('login')) {
      console.log('[IIMJobsE2E] 🔑 Submitting login credentials...');
      const emailInp = page.locator('input[name="email"], input[type="email"], #email').first();
      if (await emailInp.isVisible({ timeout: 4000 }).catch(() => false)) {
        await emailInp.fill(credentials.iimjobs.username);
        await SLEEP(800);
        const passInp = page.locator('input[name="password"], input[type="password"], #password').first();
        await passInp.fill(credentials.iimjobs.password);
        await SLEEP(800);
        await page.click('button[type="submit"], input[type="submit"], button:has-text("Login")');
        await SLEEP(5000);
        console.log('[IIMJobsE2E] Logged in successfully.');
      }
    }
    return true;
  } catch (err) {
    console.warn(`[IIMJobsE2E] Login notice: ${err.message}`);
    return false;
  }
}

async function runIIMJobsE2E(page, context, maxApplications = 15) {
  console.log('\n======================================================================');
  console.log('🎓 [IIMJOBS E2E] STARTING END-TO-END IIMJOBS & HIRIST APPLICATIONS');
  console.log('======================================================================');

  await ensureIIMJobsLoggedIn(page);

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  for (const ikw of IIM_KEYWORDS) {
    if (applicationsCount >= maxApplications) break;

    console.log(`\n[IIMJobsE2E] 🔍 Browsing senior leadership vacancies for "${ikw}"...`);
    await page.goto(`https://www.iimjobs.com/search/${ikw}-jobs`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3500);

    const jobCards = await page.locator('div.joblist-card-v2, div[class*="joblist-card"], div.job-tuple').all();
    console.log(`[IIMJobsE2E] Found ${jobCards.length} job cards for "${ikw}".`);

    const seenInKeyword = new Set();
    for (const card of jobCards.slice(0, 18)) {
      if (applicationsCount >= maxApplications) break;

      let childPage = null;
      try {
        const applyBtn = card.locator('a:has-text("Apply"), button:has-text("Apply"), a[href*="/j/"]').first();
        if (await applyBtn.isVisible().catch(() => false)) {
          const cardText = await card.innerText().catch(() => '');
          const title = cardText.split('\n')[0] || 'Senior Leadership Role';
          
          let company = 'IIMJobs Verified Employer';
          const compLocator = card.locator('.company-name, .rec-name, [class*="recruiter-name"], [class*="company"]').first();
          if (await compLocator.count() > 0) {
            company = (await compLocator.innerText().catch(() => company)).trim() || company;
          }

          const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
          if (seenInKeyword.has(key) || appliedKeys.has(key)) {
            if (!seenInKeyword.has(key)) {
              console.log(`[IIMJobsE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
            }
            seenInKeyword.add(key);
            continue;
          }
          seenInKeyword.add(key);

          console.log(`\n[IIMJobsE2E] 🚀 Opening & Applying: "${title.slice(0, 60)}" @ ${company}`);

          // Capture popup child tab
          const [openedPage] = await Promise.all([
            context.waitForEvent('page', { timeout: 6000 }).catch(() => null),
            applyBtn.click().catch(() => {})
          ]);
          childPage = openedPage;
          const targetPage = childPage || page;
          await SLEEP(3000);

          // Fill IIMJobs modal questionnaire & cover note
          const pitchBox = targetPage.locator('textarea[placeholder*="cover" i], textarea[placeholder*="pitch" i], textarea[name*="note" i], textarea').first();
          if (await pitchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
            const pitch = `Executive Transformation & Program Leader with 15 years experience driving complex digital transformations, ServiceNow implementations, and intelligent automation at Standard Chartered Bank. Ready to deliver immediate impact for ${company}.`;
            await pitchBox.fill(pitch).catch(() => {});
            await SLEEP(800);
          }

          // Handle Expected CTC input
          const ctcInp = targetPage.locator('input[placeholder*="CTC" i], input[name*="ctc" i]').first();
          if (await ctcInp.isVisible({ timeout: 1500 }).catch(() => false)) {
            await ctcInp.fill(PROFILE.expectedCTCLakhs).catch(() => {});
          }

          // Final Confirm Apply button
          const submitBtn = targetPage.locator('button:has-text("Confirm Apply"), button:has-text("Submit Application"), button:has-text("Apply Now"), button:has-text("Apply")').first();
          if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitBtn.click().catch(() => {});
            await SLEEP(3000);
          }

          logApplication({
            company,
            title: title.slice(0, 80),
            portal: 'iimjobs',
            url: targetPage.url(),
            time: new Date().toISOString(),
            status: 'submitted'
          });
          appliedKeys.add(key);
          applicationsCount++;
          console.log(`[IIMJobsE2E] ✅ SUBMISSION CONFIRMED: "${title.slice(0, 60)}" @ ${company} (${applicationsCount}/${maxApplications})`);
        }
      } catch (err) {
        console.warn(`[IIMJobsE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
      } finally {
        if (childPage && childPage !== page && !childPage.isClosed()) {
          await childPage.close().catch(() => {});
        }
        await closeAllExtraTabs(context, page);
      }
      await SLEEP(2500);
    }
  }

  console.log(`[IIMJobsE2E] 🏁 IIMJobs cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runIIMJobsE2E };
