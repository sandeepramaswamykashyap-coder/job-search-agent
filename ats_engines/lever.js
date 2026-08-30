/**
 * ats_engines/lever.js — Lever ATS Engine (Fixed)
 * 
 * Lever uses a clean single-page apply form. No login required.
 * URL pattern: jobs.lever.co/<company>/<job-id>
 * Apply URL:   jobs.lever.co/<company>/<job-id>/apply
 */

const { fillAllFormFields, uploadCV, submitForm } = require('../form_filler');

// Detect login/register wall — skip immediately
const LOGIN_WALL_PATTERNS = [
  /register.*account/i, /create.*account/i, /sign.*in.*to.*apply/i,
  /login.*to.*apply/i, /please.*login/i, /account.*required/i
];

async function isLoginWall(page) {
  const url = page.url();
  const body = await page.textContent('body').catch(() => '');
  if (/register|login|sign.?in/i.test(url) && !/apply/i.test(url)) return true;
  return LOGIN_WALL_PATTERNS.some(p => p.test(body));
}

async function apply(page, job) {
  console.log(`\n[Lever] Applying: "${job.title}" @ ${job.company}`);

  try {
    let applyUrl = job.applyUrl || job.url || job.link;

    // Lever job listing → append /apply if not already there
    if (!applyUrl.includes('/apply')) {
      applyUrl = applyUrl.replace(/\/$/, '') + '/apply';
    }

    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // ── Login wall check ──
    if (await isLoginWall(page)) {
      console.log(`[Lever] ⏭️  Login/register wall detected — skipping: ${applyUrl}`);
      return { success: false, reason: 'login_wall' };
    }

    // ── Lever sometimes has multi-step forms ──
    // Step 1: fill the standard apply form
    const filled = await fillAllFormFields(page, job.title, job.company);

    // Upload CV
    await uploadCV(page, job.title);

    // Handle Lever-specific optional fields
    await handleLeverOptionalFields(page);

    // Try Submit — Lever's button is usually "Submit application"
    const submitted = await submitLever(page);
    if (submitted) {
      await page.waitForTimeout(4000);
      const confirmText = await page.textContent('body').catch(() => '');
      if (/thank|received|submitted|application complete/i.test(confirmText)) {
        console.log(`[Lever] ✅ Confirmed submitted: "${job.title}" @ ${job.company}`);
      } else {
        console.log(`[Lever] ✅ Submit clicked (${filled} fields): "${job.title}" @ ${job.company}`);
      }
      return { success: true, atsType: 'lever' };
    }

    console.log(`[Lever] ⚠️ Submit not found (${filled} fields filled)`);
    return { success: false, reason: 'submit_not_found' };

  } catch (err) {
    console.error(`[Lever] ❌ Error: ${err.message.slice(0, 100)}`);
    return { success: false, reason: err.message };
  }
}

/**
 * Lever-specific submit handler — tries all known Lever submit patterns.
 */
async function submitLever(page) {
  const leverSelectors = [
    'button[type="submit"]',
    'button:has-text("Submit application")',
    'button:has-text("Submit Application")',
    'button:has-text("Submit")',
    'button.postings-btn',
    '[data-qa="btn-submit-app"]',
    'input[type="submit"]',
  ];
  for (const sel of leverSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click({ force: true });
        await page.waitForTimeout(4000);
        console.log(`[Lever] 🚀 Clicked submit via: ${sel}`);
        return true;
      }
    } catch (_) {}
  }
  // Also try submitForm as final fallback
  const { submitForm } = require('../form_filler');
  return submitForm(page);
}

/**
 * Handles Lever-specific optional fields.
 */
async function handleLeverOptionalFields(page) {
  try {
    const referralSelect = page.locator('select[name*="how"], select[id*="how"], select[name*="source"], select[name*="referral"]').first();
    if (await referralSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const opts = await referralSelect.locator('option').allTextContents();
      const linkedin = opts.find(o => /linkedin/i.test(o));
      const website = opts.find(o => /website|online|internet/i.test(o));
      const choice = linkedin || website;
      if (choice) await referralSelect.selectOption({ label: choice });
    }
  } catch (_) {}
}

module.exports = { apply };
