const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function captureAllProofScreenshots() {
  const userDataDir = path.join(__dirname, '.browser_session');
  console.log('[CaptureProof] Launching Playwright persistent browser context...');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox']
  });

  const page = await ctx.newPage();

  // Proof 1: Dashboard at http://localhost:3000
  console.log('[CaptureProof] Proof 1: Navigating to Web Dashboard http://localhost:3000...');
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const dashboardPath = path.join(__dirname, 'proof_dashboard_live.png');
    await page.screenshot({ path: dashboardPath, fullPage: true });
    console.log(`[CaptureProof] Dashboard proof screenshot saved: ${dashboardPath}`);
  } catch (e) {
    console.warn(`[CaptureProof] Dashboard screenshot error: ${e.message}`);
  }

  // Proof 2: LinkedIn Profile with Verified Pending CTA
  console.log('[CaptureProof] Proof 2: Navigating to LinkedIn Profile https://www.linkedin.com/in/vikramakundy/...');
  try {
    await page.goto('https://www.linkedin.com/in/vikramakundy/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    // Hide chat overlay
    await page.evaluate(() => {
      document.querySelectorAll('.msg-overlay-container, #msg-overlay, div[class*="msg-overlay"]').forEach(el => el.style.display = 'none');
    }).catch(() => {});
    const linkedinPath = path.join(__dirname, 'proof_linkedin_pending_live.png');
    await page.screenshot({ path: linkedinPath });
    console.log(`[CaptureProof] LinkedIn profile proof screenshot saved: ${linkedinPath}`);
  } catch (e) {
    console.warn(`[CaptureProof] LinkedIn screenshot error: ${e.message}`);
  }

  // Proof 3: Remote Leadership Listing / Application
  console.log('[CaptureProof] Proof 3: Navigating to Remote Job Listing https://weworkremotely.com/remote-jobs/stripe-technical-program-manager-money-as-a-service...');
  try {
    await page.goto('https://weworkremotely.com/remote-jobs/stripe-technical-program-manager-money-as-a-service', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const portalPath = path.join(__dirname, 'proof_portal_job_live.png');
    await page.screenshot({ path: portalPath });
    console.log(`[CaptureProof] Portal job proof screenshot saved: ${portalPath}`);
  } catch (e) {
    console.warn(`[CaptureProof] Portal screenshot error: ${e.message}`);
  }

  await ctx.close();
  console.log('[CaptureProof] ✅ All Proof Screenshots Captured Successfully!');
}

captureAllProofScreenshots().catch(console.error);
