const { chromium } = require('./node_modules/playwright');
const { loginToPortal } = require('./agent');

async function test(portal) {
  console.log(`\n=== Testing login for ${portal} ===`);
  const userDataDir = './.browser_session_test_' + portal;
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Show headed browser to inspect visually
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const page = await context.newPage();
  try {
    const success = await loginToPortal(page, portal);
    if (success) {
      console.log(`[Test] ${portal} login reported SUCCESS.`);
    } else {
      console.log(`[Test] ${portal} login reported FAILURE.`);
    }
    await page.waitForTimeout(5000);
  } catch (e) {
    console.error(`[Test] ${portal} login threw error:`, e);
  } finally {
    await context.close();
  }
}

async function run() {
  const portal = process.argv[2];
  if (!portal) {
    console.log("Usage: node test_logins.js <portal_name>");
    process.exit(1);
  }
  await test(portal);
}

run();
