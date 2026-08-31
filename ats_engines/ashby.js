/**
 * ats_engines/ashby.js — Ashby ATS Engine
 * 
 * Handles job applications on Ashby (https://jobs.ashbyhq.com/<company>/<job-id>/application)
 * Automated field filling, CV upload, custom questions, and submission confirmation.
 */

const path = require('path');
const fs = require('fs');
const { fillAllFormFields, uploadCV, CANDIDATE } = require('../form_filler');

async function applyAshby(page, job) {
  console.log(`\n[Ashby] Applying: "${job.title}" @ ${job.company}`);
  console.log(`[Ashby] Target URL: ${job.applyUrl}`);

  try {
    let targetUrl = job.applyUrl;
    if (!targetUrl.includes('/application')) {
      targetUrl = targetUrl.replace(/\/$/, '') + '/application';
    }

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(2000);

    // If redirected to job detail, click "Apply for this job"
    const applyBtn = page.locator('a:has-text("Apply for this job"), button:has-text("Apply for this job"), a:has-text("Apply"), button:has-text("Apply")').first();
    if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(3000);
    }

    // Fill standard Ashby system fields
    const nameInput = page.locator('input[name="_systemfield_name"], input[id="_systemfield_name"]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(CANDIDATE.fullName);
      console.log(`[Ashby] ✅ Filled name: ${CANDIDATE.fullName}`);
    }

    const emailInput = page.locator('input[name="_systemfield_email"], input[id="_systemfield_email"]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill(CANDIDATE.email);
      console.log(`[Ashby] ✅ Filled email: ${CANDIDATE.email}`);
    }

    const phoneInput = page.locator('input[type="tel"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill(CANDIDATE.phoneUS);
      console.log(`[Ashby] ✅ Filled phone: ${CANDIDATE.phoneUS}`);
    }

    // Fill all remaining custom form fields and questions
    const filled = await fillAllFormFields(page, job.title, job.company);

    // Upload CV
    const resumeUploaded = await uploadCV(page, job.title);

    // Submit Ashby Application
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit Application")',
      'button:has-text("Submit application")',
      'button:has-text("Submit")',
      'button:has-text("Apply")'
    ];

    let clickedSubmit = false;
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.scrollIntoViewIfNeeded().catch(() => {});
          await btn.click({ force: true });
          console.log(`[Ashby] 🚀 Clicked submit via: ${sel}`);
          clickedSubmit = true;
          await page.waitForTimeout(5000);
          break;
        }
      } catch (_) {}
    }

    if (!clickedSubmit) {
      console.log(`[Ashby] ⚠️ Submit button not found — skipping`);
      return { success: false, reason: 'submit_not_found' };
    }

    // Check for submission confirmation
    const bodyText = await page.textContent('body').catch(() => '') || '';
    const postUrl = page.url() || '';
    const isConfirmed = /thank\s*you|application\s*received|submitted|success|confirmation/i.test(bodyText) ||
                        /confirm|thanks|success/i.test(postUrl);

    if (isConfirmed) {
      console.log(`[Ashby] ✅ Application confirmed submitted: "${job.title}" @ ${job.company}`);
      return { success: true, atsType: 'ashby' };
    }

    console.log(`[Ashby] ⚠️ Application state unconfirmed for "${job.title}" @ ${job.company}`);
    return { success: false, reason: 'unconfirmed_submission' };

  } catch (err) {
    console.error(`[Ashby] ❌ Error: ${err.message.slice(0, 100)}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { applyAshby };
