/**
 * account_manager.js — Portal Account Creation & Session Persistence
 * 
 * Creates accounts on ATS platforms that require login.
 * Persists sessions via Playwright storageState so we never re-login.
 * 
 * Accounts vault: portal_accounts.json (gitignored)
 * Sessions: .browser_sessions/<domain>.json
 */

const fs = require('fs');
const path = require('path');
const { CANDIDATE } = require('./form_filler');

const ACCOUNTS_FILE = path.join(__dirname, 'portal_accounts.json');
const SESSIONS_DIR = path.join(__dirname, '.browser_sessions');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function loadAccounts() {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); } catch (_) {}
  }
  return {};
}

function saveAccounts(data) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function sessionFile(domain) {
  const safe = domain.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(SESSIONS_DIR, `${safe}.json`);
}

function extractDomain(url) {
  try { return new URL(url).hostname; } catch (_) { return url; }
}

/**
 * Attempts to restore a saved session for this domain.
 * Returns true if session was applied.
 */
async function restoreSession(context, url) {
  const domain = extractDomain(url);
  const sf = sessionFile(domain);
  if (fs.existsSync(sf)) {
    try {
      const state = JSON.parse(fs.readFileSync(sf, 'utf8'));
      await context.addCookies(state.cookies || []);
      console.log(`[AccountMgr] ✅ Restored session for ${domain}`);
      return true;
    } catch (_) {}
  }
  return false;
}

/**
 * Saves the current session for a domain.
 */
async function saveSession(context, url) {
  const domain = extractDomain(url);
  try {
    const state = await context.storageState();
    fs.writeFileSync(sessionFile(domain), JSON.stringify(state, null, 2), 'utf8');
    console.log(`[AccountMgr] 💾 Saved session for ${domain}`);
  } catch (_) {}
}

/**
 * Checks if we have saved credentials for a domain.
 */
function getCredentials(domain) {
  const accounts = loadAccounts();
  return accounts[domain] || null;
}

/**
 * Stores credentials after account creation.
 */
function storeCredentials(domain, email, password) {
  const accounts = loadAccounts();
  accounts[domain] = { email, password, createdAt: new Date().toISOString() };
  saveAccounts(accounts);
  console.log(`[AccountMgr] 🔐 Saved credentials for ${domain}`);
}

// ─── ATS-specific login & registration flows ────────────────────────────────

/**
 * Greenhouse: No login needed. Just returns true.
 */
async function handleGreenhouse(page) {
  return true; // No account required
}

/**
 * Lever: No login needed. Just returns true.
 */
async function handleLever(page) {
  return true; // No account required
}

/**
 * Generic login form handler — tries email + password fields.
 */
async function genericLogin(page, email, password) {
  try {
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[id*="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill(email);
    }
    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(password);
    }
    const loginBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), input[type="submit"]').first();
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(4000);
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Workday Account Handler.
 * Tries to log in with saved creds, or creates a new account.
 */
async function handleWorkday(page, context, url) {
  const domain = extractDomain(url);
  const creds = getCredentials(domain);

  // Try to click "Sign In" on Workday pages
  const signInBtn = page.locator('a:has-text("Sign In"), button:has-text("Sign In"), a[data-automation-id="signIn"]').first();
  if (await signInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signInBtn.click();
    await page.waitForTimeout(3000);
  }

  if (creds) {
    // Try login with saved credentials
    console.log(`[AccountMgr] Attempting Workday login for ${domain}`);
    const success = await genericLogin(page, creds.email, creds.password);
    if (success) {
      await saveSession(context, url);
      return true;
    }
  }

  // Try creating a new account
  console.log(`[AccountMgr] Creating new Workday account for ${domain}`);
  const createAccBtn = page.locator('a:has-text("Create Account"), button:has-text("Create Account"), a:has-text("Register")').first();
  if (await createAccBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await createAccBtn.click();
    await page.waitForTimeout(3000);

    // Fill registration form
    const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) await emailInput.fill(CANDIDATE.email);
    
    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) await passInput.fill(CANDIDATE.password);
    
    const confirmPassInput = page.locator('input[name*="confirm"], input[id*="confirm"]').first();
    if (await confirmPassInput.isVisible({ timeout: 3000 }).catch(() => false)) await confirmPassInput.fill(CANDIDATE.password);

    const firstNameInput = page.locator('input[name*="first"], input[id*="first"]').first();
    if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) await firstNameInput.fill(CANDIDATE.firstName);

    const lastNameInput = page.locator('input[name*="last"], input[id*="last"]').first();
    if (await lastNameInput.isVisible({ timeout: 3000 }).catch(() => false)) await lastNameInput.fill(CANDIDATE.lastName);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
      storeCredentials(domain, CANDIDATE.email, CANDIDATE.password);
      await saveSession(context, url);
      return true;
    }
  }

  return false;
}

/**
 * iCIMS Account Handler.
 */
async function handleICIMS(page, context, url) {
  const domain = extractDomain(url);
  const creds = getCredentials(domain);

  if (creds) {
    const success = await genericLogin(page, creds.email, creds.password);
    if (success) {
      await saveSession(context, url);
      return true;
    }
  }

  // Try to register
  const registerBtn = page.locator('a:has-text("Create Profile"), a:has-text("Register"), button:has-text("Create Account")').first();
  if (await registerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await registerBtn.click();
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) await emailInput.fill(CANDIDATE.email);

    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) await passInput.fill(CANDIDATE.password);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
      storeCredentials(domain, CANDIDATE.email, CANDIDATE.password);
      await saveSession(context, url);
      return true;
    }
  }

  return false;
}

/**
 * SAP SuccessFactors Account Handler.
 */
async function handleSuccessFactors(page, context, url) {
  const domain = extractDomain(url);
  const creds = getCredentials(domain);

  if (creds) {
    const success = await genericLogin(page, creds.email, creds.password);
    if (success) {
      await saveSession(context, url);
      return true;
    }
  }

  // SAP SF usually requires clicking "Apply" → "Create Account"
  const createBtn = page.locator('button:has-text("Create Account"), a:has-text("Create an Account"), button:has-text("Sign Up")').first();
  if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) await emailInput.fill(CANDIDATE.email);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
      storeCredentials(domain, CANDIDATE.email, CANDIDATE.password);
      await saveSession(context, url);
      return true;
    }
  }

  return false;
}

/**
 * SmartRecruiters Account Handler.
 */
async function handleSmartRecruiters(page, context, url) {
  return true; // SmartRecruiters usually allows apply without full login
}

/**
 * Main dispatcher — routes to the correct handler by ATS type.
 * @param {string} atsType 
 * @param {Page} page 
 * @param {BrowserContext} context 
 * @param {string} url 
 * @returns {Promise<boolean>} — true if auth/session is ready
 */
async function ensureAuthenticated(atsType, page, context, url) {
  console.log(`[AccountMgr] Ensuring auth for ATS type: ${atsType}`);

  // First, try to restore existing session
  const restored = await restoreSession(context, url);
  if (restored) return true;

  switch (atsType) {
    case 'greenhouse':    return handleGreenhouse(page);
    case 'lever':         return handleLever(page);
    case 'workday':       return handleWorkday(page, context, url);
    case 'icims':         return handleICIMS(page, context, url);
    case 'successfactors':return handleSuccessFactors(page, context, url);
    case 'smartrecruiters':return handleSmartRecruiters(page, context, url);
    default:              return true; // generic — attempt fill without auth
  }
}

module.exports = { ensureAuthenticated, saveSession, restoreSession };
