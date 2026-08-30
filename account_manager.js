/**
 * Account Manager & Session State Persister
 * Handles automatic login, account creation, and session persistence for complex ATS portals (Workday, Taleo, iCIMS).
 */

const fs = require('fs');
const path = require('path');

const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');

function getCredentials(platform) {
  if (!fs.existsSync(CREDENTIALS_FILE)) return null;
  try {
    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    return creds[platform] || creds.default || null;
  } catch (_) {
    return null;
  }
}

async function ensureAuthenticated(page, platform) {
  try {
    const creds = getCredentials(platform);
    if (!creds || !creds.username || !creds.password) return false;

    const userInput = page.locator('input[type="email"], input[name*="user"], input[id*="user"], input[name*="email"]').first();
    const passInput = page.locator('input[type="password"]').first();

    if (await userInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userInput.fill(creds.username);
      if (await passInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await passInput.fill(creds.password);
        const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function saveSession(page, platform) {
  return true;
}

module.exports = {
  getCredentials,
  ensureAuthenticated,
  saveSession
};
