const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session');
const statsFile = path.join(__dirname, 'stats.json');
const cvPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');

const CANDIDATE_PROFILE = {
  firstName: 'Sandeep',
  lastName: 'Kashyap',
  fullName: 'Sandeep Ramaswamy Kashyap',
  email: 'sandeepramaswamykashyap@gmail.com',
  phone: '+91 63663 25217',
  linkedin: 'https://www.linkedin.com/in/sandeepramaswamykashyap/',
  location: 'Bangalore, Karnataka, India',
  noticePeriod: '30 days',
  experienceYears: '15'
};

/**
 * Automates form filling on external ATS platforms (Greenhouse, Lever, Workday, Direct ATS)
 */
async function autoSubmitRemoteATS(page, job) {
  console.log(`\n=================== AUTOMATING REMOTE ATS APPLICATION ===================`);
  console.log(`Job: ${job.title} @ ${job.company}`);
  console.log(`URL: ${job.link || job.url}`);

  try {
    await page.goto(job.link || job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // If on aggregator page (WeWorkRemotely / RemoteOK / WorkingNomads), click out to destination ATS
    let finalPage = page;
    const applyCta = page.locator('a#job-cta-alt, a.apply-job-button, a:has-text("Apply for this position"), a:has-text("Apply Now"), button:has-text("Apply")').first();
    if (await applyCta.isVisible().catch(() => false)) {
      console.log('Clicking Apply CTA link on aggregator listing...');
      const href = await applyCta.getAttribute('href');
      if (href && (href.startsWith('http') || href.includes('greenhouse') || href.includes('lever'))) {
        await page.goto(href.startsWith('http') ? href : `https://weworkremotely.com${href}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
      } else {
        await applyCta.click();
        await page.waitForTimeout(4000);
      }
    }

    const currentUrl = page.url();
    console.log(`Destination ATS URL: ${currentUrl}`);

    // Fill candidate inputs (Greenhouse, Lever, JazzHR, Workday, Custom ATS)
    const firstNameInput = page.locator('input[name*="first_name"], input[name*="firstname"], input[id*="first_name"], input[id*="firstname"], input[autocomplete="given-name"]').first();
    if (await firstNameInput.isVisible().catch(() => false)) await firstNameInput.fill(CANDIDATE_PROFILE.firstName);

    const lastNameInput = page.locator('input[name*="last_name"], input[name*="lastname"], input[id*="last_name"], input[id*="lastname"], input[autocomplete="family-name"]').first();
    if (await lastNameInput.isVisible().catch(() => false)) await lastNameInput.fill(CANDIDATE_PROFILE.lastName);

    const fullNameInput = page.locator('input[name*="name"], input[id*="name"], input[placeholder*="Full Name"]').first();
    if (await fullNameInput.isVisible().catch(() => false) && !(await firstNameInput.isVisible().catch(() => false))) {
      await fullNameInput.fill(CANDIDATE_PROFILE.fullName);
    }

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[id*="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) await emailInput.fill(CANDIDATE_PROFILE.email);

    const phoneInput = page.locator('input[type="tel"], input[name*="phone"], input[id*="phone"]').first();
    if (await phoneInput.isVisible().catch(() => false)) await phoneInput.fill(CANDIDATE_PROFILE.phone);

    const linkedinInput = page.locator('input[name*="linkedin"], input[id*="linkedin"], input[placeholder*="LinkedIn"]').first();
    if (await linkedinInput.isVisible().catch(() => false)) await linkedinInput.fill(CANDIDATE_PROFILE.linkedin);

    // Attach CV PDF
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0 && fs.existsSync(cvPath)) {
      console.log('Attaching Sandeep_Kashyap.pdf CV resume...');
      await fileInput.setInputFiles(cvPath);
      await page.waitForTimeout(2500);
    }

    // Submit Application
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    let submitBtn = page.locator('input[name*="submit"], input[id*="submit"], input[type="submit"], button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit"), #submit_app, #submit-button, #resumator_submit_button').first();
    const count = await submitBtn.count().catch(() => 0);
    if (count > 0) {
      console.log('Found Submit button! Clicking live submission...');
      await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
      await submitBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(6000);

      console.log(`🎉 REMOTE ATS APPLICATION SUBMITTED LIVE FOR ${job.title} @ ${job.company}!`);
      return true;
    }
  } catch (err) {
    console.error(`Remote ATS apply error for ${job.title}: ${err.message}`);
  }
  return false;
}

module.exports = { autoSubmitRemoteATS };
