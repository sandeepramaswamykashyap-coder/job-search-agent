const { chromium } = require('playwright');
const path = require('path');

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

async function captureDashboardMatrix() {
  console.log('[DashboardCapture] Navigating to http://localhost:3000...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  const destPath = '/Users/sandeepramaswamykashyap/.gemini/antigravity-ide/brain/672690c0-1885-4016-9a16-cee2972c5968/dashboard_matrix_live.png';
  await page.screenshot({ path: destPath, fullPage: true });
  console.log(`[DashboardCapture] Saved live matrix screenshot to ${destPath}`);
  
  await browser.close();
}

captureDashboardMatrix().catch(console.error);
