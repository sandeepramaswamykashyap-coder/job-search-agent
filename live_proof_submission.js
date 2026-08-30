const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const { fillAllFormFields, uploadCV, submitForm } = require('./form_filler');

const ARTIFACTS_DIR = '/Users/sandeepramaswamykashyap/.gemini/antigravity-ide/brain/672690c0-1885-4016-9a16-cee2972c5968';

async function runLiveProof() {
  console.log('=== RUNNING LIVE COMPANY PORTAL SUBMISSION PROOF ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const job = {
    company: 'GitLab',
    title: 'AI Transformation Owner, CRO',
    url: 'https://job-boards.greenhouse.io/gitlab/jobs/8638232002'
  };

  console.log(`1. Navigating to: ${job.url}`);
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  console.log('2. Filling form fields with candidate profile...');
  const filledCount = await fillAllFormFields(page, job.title, job.company);
  console.log(`   Fields filled: ${filledCount}`);

  console.log('3. Uploading CV...');
  await uploadCV(page, job.title);
  await page.waitForTimeout(2000);

  // Capture Screenshot 1: Form Filled
  const screenshot1Path = path.join(ARTIFACTS_DIR, 'proof_portal_form_filled.png');
  await page.screenshot({ path: screenshot1Path, fullPage: true });
  console.log(`📸 Screenshot 1 saved: ${screenshot1Path}`);

  console.log('4. Clicking Submit Application button...');
  const submitted = await submitForm(page);
  console.log(`   Submit action result: ${submitted}`);

  // Wait for submission confirmation page
  console.log('5. Waiting for confirmation page...');
  await page.waitForTimeout(6000);

  const currentUrl = page.url();
  const pageTitle = await page.title();
  const bodyText = await page.textContent('body');

  const isConfirmed = /thank|received|submitted|success|application/i.test(bodyText);

  // Capture Screenshot 2: Confirmation
  const screenshot2Path = path.join(ARTIFACTS_DIR, 'proof_portal_submitted_confirmed.png');
  await page.screenshot({ path: screenshot2Path, fullPage: true });
  console.log(`📸 Screenshot 2 saved: ${screenshot2Path}`);

  console.log('\n=== SUBMISSION RESULT ===');
  console.log('Final URL:', currentUrl);
  console.log('Page Title:', pageTitle);
  console.log('Confirmation Text Detected:', isConfirmed);
  
  // Extract snippet of confirmation message
  const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 5 && /thank|application|received|gitlab/i.test(l));
  console.log('Confirmation Snippets:', lines.slice(0, 5));

  await browser.close();
  console.log('=== PROOF COMPLETE ===');
}

runLiveProof().catch(console.error);
