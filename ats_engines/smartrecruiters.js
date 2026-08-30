/**
 * ats_engines/smartrecruiters.js — SmartRecruiters ATS Engine
 */

const { fillAllFormFields, uploadCV, submitForm } = require('../form_filler');

async function apply(page, job) {
  console.log(`\n[SmartRecruiters] Applying: "${job.title}" @ ${job.company}`);
  try {
    const url = job.applyUrl || job.url || job.link;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    // Check if redirected to company root or listing page (job expired)
    if (!currentUrl.includes(url.split('/').pop()) && !/\d{8,}/.test(currentUrl)) {
      console.log(`[SmartRecruiters] ⏭️ Job expired / redirected to career root (${currentUrl}) — skipping.`);
      return { success: false, reason: 'job_expired' };
    }

    // Click "I'm Interested" or Apply button
    const applyBtn = page.locator('button:has-text("I\'m Interested"), a:has-text("Apply"), button:has-text("Apply Now"), button[data-qa="btn-apply-top"]').first();
    if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(3000);
    }

    // SmartRecruiters single-page form
    await fillAllFormFields(page, job.title, job.company);
    await uploadCV(page, job.title);

    const submitted = await submitForm(page);
    if (submitted) {
      console.log(`[SmartRecruiters] ✅ Submitted: "${job.title}" @ ${job.company}`);
      return { success: true, atsType: 'smartrecruiters' };
    }

    return { success: false, reason: 'submit_not_found' };
  } catch (err) {
    console.error(`[SmartRecruiters] ❌ Error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { apply };
