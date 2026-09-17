/**
 * universal_form_resolver.js — Universal Questionnaire, Stepper & Modal Solver
 * 
 * Specifically optimized for end-to-end applications across:
 * - Naukri (Questionnaire modals, skills rating, CTC, notice period)
 * - IIMJobs & Hirist (Cover note, expected CTC, notice period confirmation)
 * - LinkedIn Easy Apply (1 to 5-step modal wizard)
 * - Foundit (Dynamic screening questions)
 * - Instahyre (Custom recruiter note & candidate confirmation)
 * - Indeed (Indeed Apply stepper)
 * - TimesJobs, Cutshort, Shine, Glassdoor, and Direct Enterprise ATS
 */

const path = require('path');
const fs = require('fs');
const { fillAllFormFields, uploadCV, CANDIDATE } = require('./form_filler');

const CV_PATH = path.join(__dirname, 'Sandeep_Kashyap.pdf');

// Indian-specific and executive job search defaults
const PROFILE = {
  totalExperience: 15,
  currentCTCNumber: 1800000,
  currentCTCLakhs: '18',
  expectedCTCNumber: 3000000,
  expectedCTCLakhs: '30',
  noticePeriodDays: '30',
  noticePeriodText: '30 Days (Negotiable)',
  servingNotice: 'No',
  currentLocation: 'Bengaluru',
  relocation: 'Yes',
  workAuthorizationIndia: 'Yes',
  sponsorshipIndia: 'No',
  email: 'sandeepramaswamykashyap@gmail.com',
  phone: '+916366325217',
  phone10: '6366325217',
  fullName: 'Sandeep Ramaswamy Kashyap',
  currentCompany: 'Standard Chartered GBS',
  currentDesignation: 'Manager | Agentic AI & Workflow Automation',
  highestDegree: 'Post Graduation in Investment Banking (IIM Indore)',
  bachelorDegree: 'Bachelor of Business Management (University of Mysore)',
  skills: [
    'ServiceNow HRSD', 'Program Management', 'Intelligent Automation',
    'Business Transformation', 'UAT Governance', 'Organizational Change Management',
    'Agile Delivery', 'Risk Operations', 'Data Governance'
  ]
};

const SLEEP = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ensures only the primary working tab remains open in the browser context.
 */
async function closeAllExtraTabs(context, mainPage) {
  if (!context) return;
  try {
    const pages = context.pages();
    for (const p of pages) {
      if (p !== mainPage && !p.isClosed()) {
        await p.close().catch(() => {});
      }
    }
  } catch (_) {}
}

/**
 * Recursively answers all dynamic screening questions, dropdowns, and radio buttons.
 */
async function resolveIndianQuestionnaire(target) {
  try {
    // 1. Fill all text, number, and textarea fields
    const inputs = await target.locator('input[type="text"], input[type="number"], input:not([type]), textarea').all();
    for (const input of inputs) {
      if (!(await input.isVisible().catch(() => false))) continue;
      
      const isReadOnly = await input.getAttribute('readonly').catch(() => null);
      const isDisabled = await input.getAttribute('disabled').catch(() => null);
      if (isReadOnly !== null && isReadOnly !== 'false') continue;
      if (isDisabled !== null && isDisabled !== 'false') continue;

      const currentVal = (await input.inputValue().catch(() => '')).trim();
      if (currentVal.length > 0) continue; // Already filled

      const name = (await input.getAttribute('name').catch(() => '')).toLowerCase();
      const id = (await input.getAttribute('id').catch(() => '')).toLowerCase();
      const placeholder = (await input.getAttribute('placeholder').catch(() => '')).toLowerCase();
      const ariaLabel = (await input.getAttribute('aria-label').catch(() => '')).toLowerCase();
      
      let labelText = '';
      try {
        labelText = (await input.evaluate(el => {
          const l = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
          if (l) return l.innerText;
          const container = el.closest('.form-group, .form-field, .question, tr, td, div');
          return container ? container.innerText : '';
        })).toLowerCase();
      } catch (_) {}

      const context = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`;

      // Notice period
      if (/notice|joining|availability|lwd|serving/i.test(context)) {
        await input.fill(PROFILE.noticePeriodDays).catch(() => {});
        continue;
      }

      // Expected CTC / Salary
      if (/expected|target ctc|desired ctc|expectation/i.test(context)) {
        const val = /lakh|lpa|inr/i.test(context) ? PROFILE.expectedCTCLakhs : String(PROFILE.expectedCTCNumber);
        await input.fill(val).catch(() => {});
        continue;
      }

      // Current CTC / Salary
      if (/current.*(ctc|salary|fixed)|fixed.*ctc/i.test(context)) {
        const val = /lakh|lpa|inr/i.test(context) ? PROFILE.currentCTCLakhs : String(PROFILE.currentCTCNumber);
        await input.fill(val).catch(() => {});
        continue;
      }

      // Total Experience
      if (/total.*exp|overall.*exp|years.*experience|total.*years/i.test(context)) {
        await input.fill(String(PROFILE.totalExperience)).catch(() => {});
        continue;
      }

      // Skill Experience (e.g. ServiceNow, Agile, Transformation, Project Management)
      if (/experience.*(servicenow|program|agile|transformation|automation|uat|project|cloud)/i.test(context)) {
        await input.fill('12').catch(() => {});
        continue;
      }

      // Generic years of experience question
      if (/how many years|experience/i.test(context) && !/company|title|role/i.test(context)) {
        await input.fill('10').catch(() => {});
        continue;
      }

      // Location / City
      if (/location|city|current city/i.test(context)) {
        await input.fill(PROFILE.currentLocation).catch(() => {});
        continue;
      }

      // Phone
      if (/phone|mobile|contact number/i.test(context)) {
        await input.fill(/(\+91|country)/i.test(context) ? PROFILE.phone : PROFILE.phone10).catch(() => {});
        continue;
      }

      // Email
      if (/email/i.test(context)) {
        await input.fill(PROFILE.email).catch(() => {});
        continue;
      }

      // Name
      if (/first.*name/i.test(context)) {
        await input.fill('Sandeep Ramaswamy').catch(() => {});
        continue;
      }
      if (/last.*name/i.test(context)) {
        await input.fill('Kashyap').catch(() => {});
        continue;
      }
      if (/full.*name|your name/i.test(context)) {
        await input.fill(PROFILE.fullName).catch(() => {});
        continue;
      }

      // Cover note / pitch / summary
      if (/cover|pitch|note|about you|why.*hire|message/i.test(context)) {
        const pitch = `Executive Transformation & Program Leader with 15 years of Tier-1 BFSI/Enterprise leadership (Standard Chartered Bank). Proven track record orchestrating multi-million-dollar digital transformations, ServiceNow HRSD implementations, and intelligent agentic workflows. Immediate value driver with strong strategic governance and stakeholder alignment.`;
        await input.fill(pitch).catch(() => {});
        continue;
      }
    }

    // 2. Resolve Native & Custom Dropdowns
    const selects = await target.locator('select').all();
    for (const select of selects) {
      if (!(await select.isVisible().catch(() => false))) continue;
      const options = await select.locator('option').all();
      if (options.length <= 1) continue;

      let selectContext = '';
      try {
        selectContext = (await select.evaluate(el => {
          const l = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
          return l ? l.innerText : (el.closest('.form-group, .question, div')?.innerText || '');
        })).toLowerCase();
      } catch (_) {}

      // Notice period dropdown
      if (/notice|joining|availability/i.test(selectContext)) {
        let picked = false;
        for (const opt of options) {
          const text = (await opt.innerText().catch(() => '')).toLowerCase();
          const val = await opt.getAttribute('value').catch(() => '');
          if (/30|1 month|negotiable|serving/i.test(text)) {
            await select.selectOption(val).catch(() => {});
            picked = true;
            break;
          }
        }
        if (!picked && options.length > 1) await select.selectOption({ index: 1 }).catch(() => {});
        continue;
      }

      // Yes / No questions (Work authorization, Relocation, Commute)
      if (/authorized|legal|sponsorship|relocate|commute|background/i.test(selectContext)) {
        const wantYes = !/sponsorship/i.test(selectContext); // Sponsorship = No, others = Yes
        for (const opt of options) {
          const text = (await opt.innerText().catch(() => '')).toLowerCase();
          const val = await opt.getAttribute('value').catch(() => '');
          if (wantYes && /^yes/i.test(text.trim())) {
            await select.selectOption(val).catch(() => {});
            break;
          } else if (!wantYes && /^no/i.test(text.trim())) {
            await select.selectOption(val).catch(() => {});
            break;
          }
        }
        continue;
      }

      // Gender / Diversity
      if (/gender/i.test(selectContext)) {
        for (const opt of options) {
          const text = (await opt.innerText().catch(() => '')).toLowerCase();
          if (/male/i.test(text) && !/female/i.test(text)) {
            await select.selectOption(await opt.getAttribute('value')).catch(() => {});
            break;
          }
        }
        continue;
      }

      // Default to first real option
      await select.selectOption({ index: 1 }).catch(() => {});
    }

    // 3. Radio Buttons (e.g. Yes/No questions, Notice period brackets)
    const radioGroups = await target.locator('input[type="radio"]').all();
    for (const radio of radioGroups) {
      if (!(await radio.isVisible().catch(() => false))) continue;
      const checked = await radio.isChecked().catch(() => false);
      if (checked) continue;

      let labelText = '';
      try {
        labelText = (await radio.evaluate(el => {
          const l = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
          return l ? l.innerText : (el.closest('.form-group, .radio-group, div')?.innerText || '');
        })).toLowerCase();
      } catch (_) {}

      // Work authorization / Relocation -> Yes
      if (/authorized|relocate|commute|eligible|confirm/i.test(labelText)) {
        if (/yes/i.test(labelText)) await radio.check().catch(() => {});
      }
      // Sponsorship / Non-compete -> No
      else if (/sponsorship|visa.*support|non-compete|criminal/i.test(labelText)) {
        if (/no/i.test(labelText)) await radio.check().catch(() => {});
      }
      // Notice period brackets
      else if (/30 days|1 month|15-30/i.test(labelText)) {
        await radio.check().catch(() => {});
      }
    }

    // 4. Consent / Terms Checkboxes
    const checkboxes = await target.locator('input[type="checkbox"]').all();
    for (const cb of checkboxes) {
      if (!(await cb.isVisible().catch(() => false))) continue;
      const isChecked = await cb.isChecked().catch(() => false);
      if (isChecked) continue;

      let cbText = '';
      try {
        cbText = (await cb.evaluate(el => {
          const l = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
          return l ? l.innerText : (el.closest('.form-group, div')?.innerText || '');
        })).toLowerCase();
      } catch (_) {}

      if (/agree|terms|consent|certify|accurate|acknowledge|privacy/i.test(cbText)) {
        await cb.check().catch(() => {});
      }
    }

    // 5. File Upload (CV attachment)
    const fileInputs = await target.locator('input[type="file"]').all();
    for (const fi of fileInputs) {
      try {
        if (fs.existsSync(CV_PATH)) {
          await fi.setInputFiles(CV_PATH).catch(() => {});
        }
      } catch (_) {}
    }

  } catch (err) {
    console.warn(`[UniversalResolver] Notice: ${err.message.slice(0, 80)}`);
  }
}

/**
 * Universal Multi-Step Modal Solver
 * Clicks Next/Continue through a multi-step modal wizard until reaching the final Submit button.
 */
async function resolveAndSubmitModal(page, options = {}) {
  const maxSteps = options.maxSteps || 6;
  let submitted = false;

  for (let step = 1; step <= maxSteps; step++) {
    await SLEEP(1500);

    // Solve all questions on current step
    await resolveIndianQuestionnaire(page);
    await fillAllFormFields(page, options.company || '', options.title || '');

    // Check if Final Submit button is present and visible
    const submitBtn = page.locator([
      'button:has-text("Submit application")',
      'button:has-text("Submit Application")',
      'button:has-text("Confirm Apply")',
      'button:has-text("Confirm and Apply")',
      'button:has-text("Submit and Apply")',
      'button:has-text("Send Application")',
      'button:has-text("Complete Application")',
      'button:has-text("Submit")',
      'input[value*="Submit" i]'
    ].join(', ')).first();

    const isSubmitVisible = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (isSubmitVisible) {
      console.log(`[UniversalResolver] 🎯 Final Submit Button Found on step ${step}! Clicking...`);
      await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
      await submitBtn.click({ force: true }).catch(() => {});
      await SLEEP(4000);
      submitted = true;
      break;
    }

    // Otherwise check for Next / Continue stepper button
    const nextBtn = page.locator([
      'button:has-text("Next")',
      'button:has-text("Review")',
      'button:has-text("Continue to next step")',
      'button:has-text("Continue")',
      'button:has-text("Save & continue")',
      'button:has-text("Save and continue")',
      '[aria-label*="next" i]',
      '[aria-label*="continue" i]'
    ].join(', ')).first();

    const isNextVisible = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (isNextVisible) {
      console.log(`[UniversalResolver] ➡️ Stepping to next page (Step ${step} -> ${step + 1})...`);
      await nextBtn.scrollIntoViewIfNeeded().catch(() => {});
      await nextBtn.click({ force: true }).catch(() => {});
      await SLEEP(2500);
    } else {
      // Neither next nor submit found — try standard form submit button
      const genericSubmit = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await genericSubmit.isVisible({ timeout: 1500 }).catch(() => false)) {
        await genericSubmit.click({ force: true }).catch(() => {});
        await SLEEP(3000);
        submitted = true;
      }
      break;
    }
  }

  return submitted;
}

/**
 * Checks for application confirmation / success indicators
 */
async function verifySubmissionSuccess(page) {
  try {
    const pageText = await page.innerText('body').catch(() => '');
    const successKeywords = [
      'application submitted', 'successfully applied', 'application sent',
      'your application was sent', 'applied successfully', 'thank you for applying',
      'we have received your application', 'already applied', 'application has been submitted'
    ];

    for (const kw of successKeywords) {
      if (pageText.toLowerCase().includes(kw)) {
        return true;
      }
    }

    // Check for success dialogs or badges
    const badge = page.locator('.success, .applied, [class*="success"], [class*="applied-badge"], .artdeco-inline-feedback--success').first();
    if (await badge.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
  } catch (_) {}
  return false;
}

module.exports = {
  PROFILE,
  closeAllExtraTabs,
  resolveIndianQuestionnaire,
  resolveAndSubmitModal,
  verifySubmissionSuccess
};
