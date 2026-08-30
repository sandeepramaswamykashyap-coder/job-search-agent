/**
 * ats_engines/workday.js — Workday ATS Engine
 * 
 * Workday uses a multi-step wizard typically across 4-6 pages.
 * Requires an account. Sessions are persisted via account_manager.js.
 * 
 * URL pattern: <company>.myworkdayjobs.com/.../<job-id>
 * 
 * Steps:
 *   1. Detect and click "Apply" button
 *   2. Login or create account (via account_manager)
 *   3. Step 1: My Information (personal info)
 *   4. Step 2: My Experience (work history, CV upload)
 *   5. Step 3: Application Questions (custom screening)
 *   6. Step 4: Self Identify (EEO)
 *   7. Step 5: Review & Submit
 */

const { fillAllFormFields, uploadCV, submitForm, CANDIDATE } = require('../form_filler');
const { ensureAuthenticated, saveSession } = require('../account_manager');

const NEXT_BTN_SELECTORS = [
  '[data-automation-id="bottom-navigation-next-button"]',
  'button:has-text("Next")',
  'button:has-text("Continue")',
  'button:has-text("Save and Continue")',
  '[aria-label="Next"]',
];

async function clickNext(page) {
  for (const sel of NEXT_BTN_SELECTORS) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click();
        await page.waitForTimeout(3500);
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function apply(page, job, context) {
  console.log(`\n[Workday] Applying: "${job.title}" @ ${job.company}`);

  try {
    const url = job.applyUrl || job.url || job.link;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(3000);

    // Click "Apply" button if on listing page
    const applyBtn = page.locator(
      'a[data-automation-id="applyButton"], button[data-automation-id="applyButton"], a:has-text("Apply"), button:has-text("Apply Now")'
    ).first();
    if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(4000);
    }

    // Ensure authentication (login or create account)
    await ensureAuthenticated('workday', page, context, page.url());
    await page.waitForTimeout(3000);

    // Check for CAPTCHA — if present, log as needs_manual_apply
    const captchaFrame = page.frameLocator('iframe[title*="reCAPTCHA"], iframe[src*="recaptcha"]').first();
    const captchaVisible = await captchaFrame.locator('.recaptcha-checkbox').isVisible({ timeout: 2000 }).catch(() => false);
    if (captchaVisible) {
      console.log(`[Workday] ⚠️ CAPTCHA detected — logging as needs_manual_apply`);
      return { success: false, reason: 'captcha_detected', needsManual: true };
    }

    // ── Step 1: My Information ───────────────────────────────────────────
    console.log('[Workday] Step 1: My Information');
    await fillAllFormFields(page, job.title, job.company);
    await clickNext(page);

    // ── Step 2: My Experience (CV upload + work history) ─────────────────
    console.log('[Workday] Step 2: My Experience');
    await uploadCV(page, job.title);
    await fillAllFormFields(page, job.title, job.company);
    await clickNext(page);

    // ── Step 3: Application Questions (custom screening) ─────────────────
    console.log('[Workday] Step 3: Application Questions');
    await handleWorkdayScreeningQuestions(page);
    await clickNext(page);

    // ── Step 4: Self Identify (EEO) ───────────────────────────────────────
    console.log('[Workday] Step 4: Self Identify (EEO)');
    await handleWorkdayEEO(page);
    await clickNext(page);

    // ── Step 5: Review & Submit ───────────────────────────────────────────
    console.log('[Workday] Step 5: Review & Submit');
    await page.waitForTimeout(2000);
    const submitted = await submitForm(page);

    if (submitted) {
      await saveSession(context, page.url());
      console.log(`[Workday] ✅ Application submitted: "${job.title}" @ ${job.company}`);
      return { success: true, atsType: 'workday' };
    }

    return { success: false, reason: 'submit_not_found' };

  } catch (err) {
    console.error(`[Workday] ❌ Error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

/**
 * Handles Workday custom screening questions.
 * Typical patterns: Yes/No radio, country of residence, work authorization.
 */
async function handleWorkdayScreeningQuestions(page) {
  try {
    // Work authorization questions — click "Yes" for "legally authorized to work"
    const yesLabels = await page.locator('label:has-text("Yes")').all();
    for (const label of yesLabels) {
      const labelText = await label.textContent().catch(() => '');
      if (/authorized|eligible|legal/i.test(labelText)) {
        const radioInput = await label.locator('input[type="radio"]').or(label.locator('xpath=preceding-sibling::input[@type="radio"]')).first();
        await radioInput.click().catch(() => {});
      }
    }

    // Sponsorship question — click "No" for "require sponsorship"
    const noLabels = await page.locator('label:has-text("No")').all();
    for (const label of noLabels) {
      const labelText = await label.textContent().catch(() => '');
      if (/sponsor/i.test(labelText)) {
        const radioInput = await label.locator('input[type="radio"]').or(label.locator('xpath=preceding-sibling::input[@type="radio"]')).first();
        await radioInput.click().catch(() => {});
      }
    }

    // Fill any remaining text inputs on this step
    await fillAllFormFields(page, '', '');
  } catch (_) {}
}

/**
 * Handles Workday EEO (Self-Identify) step.
 * Selects "Decline" or "Prefer not to say" for all demographic questions.
 */
async function handleWorkdayEEO(page) {
  try {
    const selects = await page.locator('select').all();
    for (const sel of selects) {
      const opts = await sel.locator('option').allTextContents().catch(() => []);
      const decline = opts.find(o => /decline|prefer not|not specified|choose not/i.test(o));
      if (decline) {
        await sel.selectOption({ label: decline }).catch(() => {});
      }
    }
  } catch (_) {}
}

module.exports = { apply };
