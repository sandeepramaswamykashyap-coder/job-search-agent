/**
 * ats_engines/taleo.js — Taleo ATS Engine
 */

const { fillAllFormFields, uploadCV, submitForm } = require('../form_filler');
const { ensureAuthenticated, saveSession } = require('../account_manager');

async function apply(page, job, context) {
  console.log(`\n[Taleo] Applying: "${job.title}" @ ${job.company}`);
  try {
    const url = job.applyUrl || job.url || job.link;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Taleo: click "Apply Online" or "Apply Now" if on listing
    const applyBtn = page.locator('a:has-text("Apply Online"), a:has-text("Apply Now"), button:has-text("Apply")').first();
    if (await applyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(4000);
    }

    await ensureAuthenticated('taleo', page, context, page.url());
    await page.waitForTimeout(3000);

    // Taleo multi-step — iterate up to 8 pages
    let maxSteps = 8;
    for (let step = 0; step < maxSteps; step++) {
      await fillAllFormFields(page, job.title, job.company);
      if (step === 0) await uploadCV(page, job.title);

      const submitted = await submitForm(page);
      if (submitted) {
        await saveSession(context, page.url());
        console.log(`[Taleo] ✅ Submitted: "${job.title}" @ ${job.company}`);
        return { success: true, atsType: 'taleo' };
      }

      const nextBtn = page.locator('a.btn:has-text("Next"), button:has-text("Next"), input[value="Next >"], a:has-text("Continue")').first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(4000);
      } else {
        break;
      }
    }

    return { success: false, reason: 'submit_not_found' };
  } catch (err) {
    console.error(`[Taleo] ❌ Error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { apply };
