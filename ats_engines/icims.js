/**
 * ats_engines/icims.js — iCIMS ATS Engine
 */

const { fillAllFormFields, uploadCV, submitForm } = require('../form_filler');
const { ensureAuthenticated, saveSession } = require('../account_manager');

async function apply(page, job, context) {
  console.log(`\n[iCIMS] Applying: "${job.title}" @ ${job.company}`);
  try {
    const url = job.applyUrl || job.url || job.link;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    await ensureAuthenticated('icims', page, context, page.url());
    await page.waitForTimeout(3000);

    // iCIMS usually has a multi-step wizard — iterate through pages
    let maxSteps = 6;
    for (let step = 0; step < maxSteps; step++) {
      await fillAllFormFields(page, job.title, job.company);
      if (step === 0) await uploadCV(page, job.title);

      // Try submit first
      const submitted = await submitForm(page);
      if (submitted) {
        await saveSession(context, page.url());
        console.log(`[iCIMS] ✅ Submitted: "${job.title}" @ ${job.company}`);
        return { success: true, atsType: 'icims' };
      }

      // Try Next button
      const nextBtn = page.locator('a:has-text("Next"), button:has-text("Continue"), input[value="Next"], a.iCIMS_Button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(3500);
      } else {
        break;
      }
    }

    return { success: false, reason: 'submit_not_found' };
  } catch (err) {
    console.error(`[iCIMS] ❌ Error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { apply };
