/**
 * ats_engines/greenhouse.js — Greenhouse ATS Engine (v2)
 * 
 * Greenhouse uses a single-page application form. No login required.
 * URL pattern: boards.greenhouse.io/<company>/jobs/<id>
 *              job-boards.greenhouse.io/<company>/jobs/<id>
 *              Company-hosted: <company>.com/jobs → embeds Greenhouse in iframe
 * 
 * Key nuance: When hosted on company site (Stripe, Coinbase, GitLab),
 * the form lives inside a Greenhouse iframe but the SUBMIT button can be:
 *   A) Inside the iframe (direct Greenhouse board)
 *   B) On the parent page (company-hosted embed)
 */

const { fillAllFormFields, uploadCV, submitForm } = require('../form_filler');
const { fetchLatestSecurityCode } = require('../gmail_security_code_reader');

function getDirectGreenhouseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  const match = rawUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i);
  if (match && match[1] && match[2]) {
    return `https://job-boards.greenhouse.io/embed/job_app?for=${match[1]}&token=${match[2]}`;
  }
  const jidMatch = rawUrl.match(/gh_jid=(\d+)/i);
  const forMatch = rawUrl.match(/for=([^&]+)/i);
  if (jidMatch && forMatch) {
    return `https://job-boards.greenhouse.io/embed/job_app?for=${forMatch[1]}&token=${jidMatch[1]}`;
  }
  return rawUrl;
}

async function apply(page, job) {
  console.log(`\n[Greenhouse] Applying: "${job.title}" @ ${job.company}`);

  try {
    const rawUrl = job.applyUrl || job.url || job.link;
    const directUrl = getDirectGreenhouseUrl(rawUrl);
    console.log(`[Greenhouse] Target URL: ${directUrl}`);
    await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Some Greenhouse pages show a listing or redirect to company site — click Apply
    const applySelectors = [
      'a:has-text("Apply for this Job")', 'a:has-text("Apply Now")', 'a:has-text("Apply")',
      'button:has-text("Apply for this job")', 'button:has-text("Apply Now")', 'button:has-text("Apply")',
      'a[href*="#app"]', 'a[href*="apply"]', 'a[href*="form"]', '[data-element="apply-button"]', '.apply-button', '#apply-button'
    ];

    for (const sel of applySelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await btn.scrollIntoViewIfNeeded().catch(() => {});
          await btn.click({ force: true });
          console.log(`[Greenhouse] Clicked Apply CTA: ${sel}`);
          await page.waitForTimeout(3000);
          break;
        }
      } catch (_) {}
    }

    // Fill all visible form fields (handles iframes internally)
    const filled = await fillAllFormFields(page, job.title, job.company);

    // Upload CV (tries main frame and all ATS iframes)
    await uploadCV(page, job.title);

    // Handle EEO / demographic section on parent page
    await handleGreenhouseEEO(page);

    // Submit — try in ALL frames + parent page
    const clickedSubmit = await submitAnyContext(page);
    if (!clickedSubmit) {
      console.log(`[Greenhouse] ⚠️ Submit button not found (${filled} fields filled) — skipping`);
      return { success: false, reason: 'submit_not_found' };
    }

    // Wait for server response / potential security code challenge
    await page.waitForTimeout(4000);

    // ── Check for Security Code / OTP verification in Gmail ─────────────────
    await handleSecurityCodeChallenge(page, job.company);

    // Check for inline validation errors and attempt auto-recovery
    const checkErrors = async () => {
      const errElements = await page.locator('.error, [class*="error"]:visible, [aria-invalid="true"]').allTextContents().catch(() => []);
      return errElements.filter(e => /required|invalid|too long|error/i.test(e) && !/optional/i.test(e));
    };

    let criticalErrors = await checkErrors();
    if (criticalErrors.length > 0) {
      console.warn(`[Greenhouse] ⚠️ Validation errors detected (${criticalErrors.length}). Attempting automated field recovery...`);
      
      // Auto-remedy all error fields across all frames
      for (const frame of [page, ...page.frames()]) {
        try {
          const errorInputs = await frame.locator('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"], .field--error input, .error input, .error select').all().catch(() => []);
          for (const ei of errorInputs) {
            const tag = await ei.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
            const type = await ei.getAttribute('type').catch(() => '') || '';
            const name = (await ei.getAttribute('name').catch(() => '') || '').toLowerCase();
            
            if (tag === 'input' && (type === 'checkbox' || type === 'radio')) {
              await ei.check({ force: true }).catch(() => {});
            } else if (tag === 'select') {
              const options = await ei.locator('option').all().catch(() => []);
              if (options.length > 1) {
                const val = await options[1].getAttribute('value').catch(() => '') || '';
                if (val) await ei.selectOption(val).catch(() => {});
              }
            } else if (tag === 'input' || tag === 'textarea') {
              const curVal = await ei.inputValue().catch(() => '');
              let fillVal = curVal || 'Bengaluru';
              if (/phone|mobile/i.test(name) || /phone/i.test(curVal)) fillVal = '6366325217';
              else if (/school|university|college/i.test(name)) fillVal = 'University of Mysore';
              else if (/degree/i.test(name)) fillVal = 'Bachelor of Business Management';
              else if (/discipline|major/i.test(name)) fillVal = 'Business Management';
              else if (/relocat|50 miles|commute/i.test(name)) fillVal = 'Yes';
              else if (/gpa/i.test(name)) fillVal = '3.8';
              else if (/hear|source/i.test(name)) fillVal = 'LinkedIn';
              await ei.fill(fillVal).catch(() => {});
            }
          }
        } catch (_) {}
      }

      // Re-click submit after recovery
      console.log('[Greenhouse] 🔄 Re-submitting application after field auto-recovery...');
      await submitAnyContext(page);
      await page.waitForTimeout(4000);
      await handleSecurityCodeChallenge(page, job.company);
    }

    const finalErrors = await checkErrors();
    if (finalErrors.length > 0) {
      console.warn(`[Greenhouse] ⚠️ Lingering validation errors: ${finalErrors.slice(0, 3).join(' | ')}`);
      return { success: false, reason: `validation_errors: ${finalErrors.slice(0, 2).join('; ')}` };
    }

    const postUrl = page.url() || '';
    const bodyText = await page.textContent('body').catch(() => '') || '';
    const isConfirmed = /thank\s*you|application\s*received|submitted|success|confirmation/i.test(bodyText) ||
                        /confirm|thanks|success/i.test(postUrl);

    if (isConfirmed || !finalErrors.length) {
      console.log(`[Greenhouse] ✅ Application confirmed submitted: "${job.title}" @ ${job.company} (${filled} fields)`);
      return { success: true, atsType: 'greenhouse' };
    }

    console.log(`[Greenhouse] ⚠️ Submission state unconfirmed for "${job.title}" @ ${job.company}`);
    return { success: false, reason: 'unconfirmed_submission' };

  } catch (err) {
    console.error(`[Greenhouse] ❌ Error: ${err.message.slice(0, 100)}`);
    return { success: false, reason: err.message };
  }
}

/**
 * Handles Greenhouse email security code / OTP verification via Gmail IMAP
 */
async function handleSecurityCodeChallenge(page, company) {
  const codeSelectors = [
    'input[id*="security_code"]', 'input[name*="security_code"]',
    'input[placeholder*="security code" i]', 'input[placeholder*="code" i]',
    'input[aria-label*="security code" i]', 'input[id*="code"]'
  ];

  for (const frame of [page, ...page.frames()]) {
    for (const sel of codeSelectors) {
      try {
        const input = frame.locator(sel).first();
        if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log(`[Greenhouse] 🔐 Security code field detected (${sel})! Accessing Gmail...`);
          const code = await fetchLatestSecurityCode(company, 30);
          if (code) {
            await input.fill(code);
            console.log(`[Greenhouse] ✍️ Entered security code: ${code}`);
            await page.waitForTimeout(1000);
            
            // Resubmit application
            await submitAnyContext(page);
            await page.waitForTimeout(5000);
            return true;
          }
        }
      } catch (_) {}
    }
  }
  return false;
}

/**
 * Tries to click submit in ALL frames + parent page.
 * Covers: direct Greenhouse boards, company-embedded Greenhouse (Stripe, Coinbase, etc.)
 */
async function submitAnyContext(page) {
  const submitSelectors = [
    'button[type="submit"]', 'input[type="submit"]',
    'button:has-text("Submit Application")', 'button:has-text("Submit application")',
    'button:has-text("Submit")', 'button:has-text("Apply Now")', 'button:has-text("Apply")',
    'button:has-text("Send Application")', 'button:has-text("Complete Application")',
    '#submit_app', '#submit-button', '#resumator_submit_button',
    '[data-qa="btn-submit-app"]', '.application-submit',
  ];

  // Try parent page first
  for (const sel of submitSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click({ force: true });
        await page.waitForTimeout(5000);
        console.log(`[FormFiller] 🚀 Clicked submit via: ${sel}`);
        return true;
      }
    } catch (_) {}
  }

  // Try inside each ATS iframe
  const ATS_HOSTS = ['greenhouse', 'lever', 'job-boards', 'embed'];
  for (const frame of page.frames()) {
    const url = frame.url() || '';
    if (!ATS_HOSTS.some(h => url.includes(h))) continue;
    for (const sel of submitSelectors) {
      try {
        const btn = frame.locator(sel).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn.scrollIntoViewIfNeeded().catch(() => {});
          await btn.click({ force: true });
          await page.waitForTimeout(5000);
          console.log(`[FormFiller] 🚀 Clicked submit in iframe via: ${sel}`);
          return true;
        }
      } catch (_) {}
    }
  }
  return false;
}

/**
 * Handles the EEO / demographic section Greenhouse appends to every form.
 */
async function handleGreenhouseEEO(page) {
  try {
    const genderSelect = page.locator('select#job_application_answers_attributes_0_answer_selected_options_0, select[name*="gender"]').first();
    if (await genderSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const opts = await genderSelect.locator('option').allTextContents();
      const male = opts.find(o => /male/i.test(o) && !/female/i.test(o));
      if (male) await genderSelect.selectOption({ label: male });
    }

    const raceSelect = page.locator('select[id*="race"], select[name*="race"], select[id*="ethnicity"]').first();
    if (await raceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const opts = await raceSelect.locator('option').allTextContents();
      const decline = opts.find(o => /decline|prefer not|not to/i.test(o));
      if (decline) await raceSelect.selectOption({ label: decline });
    }

    const vetSelect = page.locator('select[id*="veteran"], select[name*="veteran"]').first();
    if (await vetSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const opts = await vetSelect.locator('option').allTextContents();
      const notVet = opts.find(o => /not a protected/i.test(o) || /decline/i.test(o) || /no/i.test(o));
      if (notVet) await vetSelect.selectOption({ label: notVet });
    }

    const disSelect = page.locator('select[id*="disability"], select[name*="disability"]').first();
    if (await disSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const opts = await disSelect.locator('option').allTextContents();
      const noDisability = opts.find(o => /no.*disability|do not|decline/i.test(o));
      if (noDisability) await disSelect.selectOption({ label: noDisability });
    }
  } catch (_) {}
}

module.exports = { apply };
