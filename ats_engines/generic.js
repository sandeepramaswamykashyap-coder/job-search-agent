/**
 * ats_engines/generic.js — Generic / Unknown ATS Fallback Engine (Fixed)
 * 
 * Applied to any career page that doesn't match a known ATS.
 * Strategy: fill all visible fields, upload CV, click submit.
 * 
 * Improvements:
 * - Login-wall detection: skip immediately instead of wasting 30s
 * - Confirmation page detection  
 * - New-tab/popup tracking for portals that open apply form in new tab
 * - Handles Ashby, BambooHR, Jobvite, SmartRecruiters, custom company pages
 */

const { fillAllFormFields, uploadCV, submitForm } = require('../form_filler');

// Login/register wall patterns — skip these immediately
const LOGIN_WALL_PATTERNS = [
  /create.*account.*to.*apply/i, /register.*to.*apply/i,
  /sign.*in.*to.*view/i, /login.*required/i,
  /you.*must.*log.*in/i, /please.*create.*account/i,
];
const LOGIN_WALL_URL_PATTERNS = [
  /\/register\b/, /\/login\b/, /\/sign-?in\b/, /\/auth\b/, /\/account\/create/,
];

async function isLoginWall(page) {
  const url = page.url();
  // URL itself is a login/register page
  if (LOGIN_WALL_URL_PATTERNS.some(p => p.test(url)) && !/apply/i.test(url)) return true;
  const body = await page.textContent('body').catch(() => '');
  return LOGIN_WALL_PATTERNS.some(p => p.test(body));
}

// Error page / 404 detection
async function isErrorPage(page) {
  const url = page.url();
  if (/404|errorpage|error.*type|not.*found/i.test(url)) return true;
  const body = await page.textContent('body').catch(() => '');
  return /page.*not.*found|404.*not.*found|this.*page.*doesn.*exist/i.test(body);
}

async function apply(page, job) {
  console.log(`\n[Generic ATS] Applying: "${job.title}" @ ${job.company}`);

  try {
    const url = job.applyUrl || job.url || job.link;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    // ── Login-wall / error-page guard ──
    if (await isLoginWall(page)) {
      console.log(`[Generic ATS] ⏭️  Login/register wall — skipping`);
      return { success: false, reason: 'login_wall' };
    }
    if (await isErrorPage(page)) {
      console.log(`[Generic ATS] ⏭️  Error/404 page — skipping`);
      return { success: false, reason: 'error_page' };
    }

    // ── Click through any intermediate "Apply" buttons ──
    // Some portals open a new tab/popup — track it
    const applyBtns = [
      'a:has-text("Apply for this Job")',
      'a:has-text("Apply Now")',
      'button:has-text("Apply for this Position")',
      'a:has-text("Apply for this Position")',
      'button:has-text("Apply")',
      'a.apply-btn', '.apply-button',
    ];
    for (const sel of applyBtns) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          const href = await btn.getAttribute('href').catch(() => '');
          if (href && href.startsWith('http')) {
            // Check if it's an ATS URL we can handle directly
            const isAts = /greenhouse|lever|ashby|workday|icims|taleo|smartrecruiters|bamboohr|jobvite/i.test(href);
            if (isAts || !href.includes('register')) {
              await page.goto(href, { waitUntil: 'domcontentloaded' });
            } else {
              console.log(`[Generic ATS] ⏭️  Apply button leads to registration — skipping`);
              return { success: false, reason: 'apply_requires_registration' };
            }
          } else {
            await btn.click();
          }
          await page.waitForTimeout(3000);
          break;
        }
      } catch (_) {}
    }

    // Re-check after navigation
    if (await isLoginWall(page)) {
      console.log(`[Generic ATS] ⏭️  Login wall after navigation — skipping`);
      return { success: false, reason: 'login_wall_after_nav' };
    }

    // ── Fill all visible fields ──
    const filled = await fillAllFormFields(page, job.title, job.company);

    // Upload CV
    await uploadCV(page, job.title);

    // Try to submit
    const submitted = await submitForm(page);

    if (submitted) {
      console.log(`[Generic ATS] ✅ Submitted: "${job.title}" @ ${job.company} (${filled} fields filled)`);
      return { success: true, atsType: 'generic' };
    }

    // Check if already on a confirmation page
    const bodyText = await page.textContent('body').catch(() => '');
    if (/thank you|application received|successfully submitted|we.ll be in touch|application complete/i.test(bodyText)) {
      console.log(`[Generic ATS] ✅ Confirmation page detected: "${job.title}" @ ${job.company}`);
      return { success: true, atsType: 'generic' };
    }

    // Only log partial if we actually filled fields — otherwise silently skip
    if (filled > 0) {
      console.log(`[Generic ATS] ⚠️ ${filled} fields filled but submit not found`);
    } else {
      console.log(`[Generic ATS] ⏭️  No fillable fields found — skipping`);
    }
    return { success: false, reason: 'submit_not_found', fieldsFilled: filled };

  } catch (err) {
    // Swallow network errors (DNS, SSL) silently — don't waste log space
    const isNetworkErr = /ERR_NAME_NOT_RESOLVED|ERR_CERT|ERR_CONNECTION|ENOTFOUND|ETIMEDOUT/i.test(err.message);
    if (isNetworkErr) {
      console.log(`[Generic ATS] ⏭️  Network error (dead URL) — skipping: ${job.company}`);
    } else {
      console.error(`[Generic ATS] ❌ Error: ${err.message.slice(0, 100)}`);
    }
    return { success: false, reason: err.message };
  }
}

module.exports = { apply };
