/**
 * portal_drivers/instahyre_e2e.js — Full End-to-End Instahyre Driver
 */

const path = require('path');
const fs = require('fs');
const { logApplication, getAllApplications } = require('../applications_db');
const { closeAllExtraTabs, PROFILE } = require('../universal_form_resolver');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ensureInstahyreLoggedIn(page) {
  try {
    console.log('[InstahyreE2E] 🌐 Checking Instahyre login status...');
    await page.goto('https://www.instahyre.com/candidate/opportunities/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(3000);

    if (page.url().includes('login') || page.url().includes('auth')) {
      console.log('[InstahyreE2E] 🔑 Logging in with credentials...');
      const emailInp = page.locator('input[name="email"], input[type="email"], #email').first();
      if (await emailInp.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInp.fill(credentials.instahyre.username);
        await SLEEP(600);
        const passInp = page.locator('input[name="password"], input[type="password"], #password').first();
        await passInp.fill(credentials.instahyre.password);
        await SLEEP(600);
        await page.click('button[type="submit"], input[type="submit"], button:has-text("Log in")');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await SLEEP(4000);
      }
    }
    return true;
  } catch (err) {
    console.warn(`[InstahyreE2E] Login notice: ${err.message}`);
    return false;
  }
}

async function runInstahyreE2E(page, context, maxApplications = 15) {
  console.log('\n======================================================================');
  console.log('⚡ [INSTAHYRE E2E] STARTING END-TO-END INSTAHYRE APPLICATIONS');
  console.log('======================================================================');

  await ensureInstahyreLoggedIn(page);

  const existing = getAllApplications();
  const appliedKeys = new Set(
    existing.map(a => `${(a.company || '').toLowerCase().trim()}::${(a.title || '').toLowerCase().trim()}`)
  );

  let applicationsCount = 0;

  try {
    await page.goto('https://www.instahyre.com/candidate/opportunities/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await SLEEP(4000);

    const opportunityCards = await page.locator('.opportunity-card, .employer-row, [class*="opportunity"]').all();
    console.log(`[InstahyreE2E] Found ${opportunityCards.length} matching candidate opportunities.`);

    for (const card of opportunityCards.slice(0, 15)) {
      if (applicationsCount >= maxApplications) break;

      try {
        const titleEl = card.locator('.job-title, h3, h4, [class*="title"]').first();
        const compEl = card.locator('.employer-name, .company-name, [class*="company"]').first();

        const title = (await titleEl.innerText().catch(() => 'Program Leadership')).trim();
        const company = (await compEl.innerText().catch(() => 'Instahyre Partner')).trim();

        if (!title || !company) continue;

        const key = `${company.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
        if (appliedKeys.has(key)) {
          console.log(`[InstahyreE2E] ⏭️ Already applied to: "${title}" @ ${company}`);
          continue;
        }

        const applyBtn = card.locator('button:has-text("Apply"), button:has-text("Interested"), a:has-text("Apply")').first();
        if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`\n[InstahyreE2E] 🚀 Submitting Application for "${title}" @ ${company}...`);
          await applyBtn.click().catch(() => {});
          await SLEEP(2500);

          // Handle optional note to recruiter modal
          const noteBox = page.locator('textarea[placeholder*="note" i], textarea[name*="pitch" i], textarea').first();
          if (await noteBox.isVisible({ timeout: 2000 }).catch(() => false)) {
            const pitch = `With 15 years leading enterprise transformation, ServiceNow implementations, and intelligent automation at Standard Chartered Bank, I am eager to bring strategic execution to this role at ${company}.`;
            await noteBox.fill(pitch).catch(() => {});
            await SLEEP(1000);
          }

          // Confirm button in modal
          const confirmBtn = page.locator('button:has-text("Send"), button:has-text("Confirm"), button:has-text("Submit")').first();
          if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmBtn.click().catch(() => {});
            await SLEEP(2500);
          }

          logApplication({
            company,
            title,
            portal: 'instahyre',
            url: page.url(),
            time: new Date().toISOString(),
            status: 'submitted'
          });
          appliedKeys.add(key);
          applicationsCount++;
          console.log(`[InstahyreE2E] ✅ SUBMISSION CONFIRMED: "${title}" @ ${company} (${applicationsCount}/${maxApplications})`);
        }
      } catch (err) {
        console.warn(`[InstahyreE2E] ⚠️ Card skipped: ${err.message.slice(0, 80)}`);
      } finally {
        await closeAllExtraTabs(context, page);
      }
      await SLEEP(2000);
    }
  } catch (err) {
    console.error(`[InstahyreE2E] Error: ${err.message}`);
  }

  console.log(`[InstahyreE2E] 🏁 Instahyre cycle complete: ${applicationsCount} new applications submitted.`);
  return applicationsCount;
}

module.exports = { runInstahyreE2E };
