/**
 * ats_engines/ashby.js — Ashby ATS Engine
 * 
 * Handles automated job applications on Ashby (jobs.ashbyhq.com/<company>/<job-id>)
 * Automated field filling, CV upload, custom questions, and submission confirmation.
 */

const path = require('path');
const fs = require('fs');
const { fillAllFormFields, uploadCV, CANDIDATE } = require('../form_filler');

async function applyAshby(page, job) {
  console.log(`\n[Ashby] Applying: "${job.title}" @ ${job.company}`);
  console.log(`[Ashby] Target URL: ${job.applyUrl}`);

  try {
    const cleanUrl = (job.applyUrl || '').replace(/\/application\/?$/, '');
    await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);

    // If "Apply for this job" CTA is present, click it to open the application drawer/form
    const applyBtn = page.locator('a:has-text("Apply for this job"), button:has-text("Apply for this job"), a:has-text("Apply"), button:has-text("Apply")').first();
    if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyBtn.click();
      console.log(`[Ashby] 🖱️ Clicked "Apply" CTA`);
      await page.waitForTimeout(1500);
    }

    // Wait for the primary Ashby system input to mount
    const nameInput = page.locator('input[name="_systemfield_name"], input[id="_systemfield_name"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(CANDIDATE.fullName);
      console.log(`[Ashby] ✅ Filled name: ${CANDIDATE.fullName}`);
    }

    const emailInput = page.locator('input[name="_systemfield_email"], input[id="_systemfield_email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(CANDIDATE.email);
      console.log(`[Ashby] ✅ Filled email: ${CANDIDATE.email}`);
    }

    const phoneInput = page.locator('input[id*="phone" i], input[name*="phone" i], input[type="tel"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(CANDIDATE.phone);
      console.log(`[Ashby] ✅ Filled phone: ${CANDIDATE.phone}`);
    }

    // Fill all remaining custom form fields and questions
    const filled = await fillAllFormFields(page, job.title, job.company);

    // Upload CV
    const resumeUploaded = await uploadCV(page, job.title);

    // Submit Ashby Application — check top page and all child frames
    const submitSelectors = [
      'button:has-text("Submit Application")',
      'button:has-text("Submit application")',
      'button[type="submit"]',
      'button:has-text("Submit")',
      'input[type="submit"]'
    ];

    let submitted = false;
    // Check main page first
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log(`[Ashby] 🚀 Clicking submit via: ${sel}`);
          await btn.click({ force: true });
          submitted = true;
          break;
        }
      } catch (_) {}
    }

    // If not found in main page, check frames
    if (!submitted) {
      for (const frame of page.frames()) {
        for (const sel of submitSelectors) {
          try {
            const btn = frame.locator(sel).first();
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
              console.log(`[Ashby] 🚀 Clicking submit in iframe via: ${sel}`);
              await btn.click({ force: true });
              submitted = true;
              break;
            }
          } catch (_) {}
        }
        if (submitted) break;
      }
    }

    if (!submitted) {
      console.log(`[Ashby] ⚠️ Submit button not found — skipping`);
      return { success: false, reason: 'submit_button_missing' };
    }

    // Wait up to 10 seconds for real submission confirmation or URL redirection
    let isConfirmed = false;
    const successIndicators = [
      'thank you', 'thanks for applying', 'application received',
      'application submitted', 'successfully submitted', 'we received your application',
      'we have received your application', 'your application has been submitted'
    ];

    for (let poll = 0; poll < 10; poll++) {
      await page.waitForTimeout(1000);
      const curUrl = page.url().toLowerCase();
      if (curUrl.includes('/submitted') || curUrl.includes('/thank-you') || curUrl.includes('/success')) {
        isConfirmed = true;
        break;
      }

      const bodyText = (await page.textContent('body').catch(() => '')).toLowerCase();
      if (successIndicators.some(ind => bodyText.includes(ind))) {
        isConfirmed = true;
        break;
      }

      // Check if any error is displayed
      const errorMsg = page.locator('.error-message, [aria-invalid="true"], .has-error, .is-invalid, text="This field is required"').first();
      if (await errorMsg.isVisible({ timeout: 500 }).catch(() => false)) {
        const errText = (await errorMsg.textContent().catch(() => '')).trim();
        console.warn(`[Ashby] ⚠️ Form validation error on page: "${errText}"`);
        return { success: false, reason: 'validation_error: ' + errText };
      }
    }

    if (isConfirmed) {
      console.log(`[Ashby] ✅ Application submitted & confirmed: "${job.title}" @ ${job.company}`);
      return { success: true, atsType: 'ashby' };
    }

    console.warn(`[Ashby] ⚠️ Submission could not be confirmed — page did not transition.`);
    return { success: false, reason: 'unconfirmed_submission' };

  } catch (err) {
    console.error(`[Ashby] ❌ Error: ${err.message.slice(0, 100)}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { applyAshby };
