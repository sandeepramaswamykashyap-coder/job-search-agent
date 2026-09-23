/**
 * gmail_security_code_reader.js — Real-time Gmail IMAP Security Code Fetcher
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

const SCRIPT_PATH = path.join(__dirname, 'fetch_security_code.py');
const CACHE_PATH = path.join(__dirname, 'latest_security_code.json');

/**
 * Polls Gmail IMAP & Cache for the latest security code received in the last N seconds
 * @param {string} companyName - Company name hint (e.g. 'Elastic', 'GitLab')
 * @param {number} maxWaitSeconds - Maximum seconds to poll (default 25)
 * @returns {Promise<string|null>} - The security code string or null
 */
async function fetchLatestSecurityCode(companyName = '', maxWaitSeconds = 25) {
  console.log(`[GmailSecurityReader] 🔐 Checking Gmail & Cache for security code (${companyName || 'Greenhouse'})...`);
  
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
    // 1. Check if background auto-cleaner already intercepted, saved, and deleted the email
    if (fs.existsSync(CACHE_PATH)) {
      try {
        const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
        const ageSeconds = (Date.now() - (cached.timestamp * 1000)) / 1000;
        if (ageSeconds < 90 && cached.code) {
          const compClean = (companyName || '').toLowerCase().replace(/[,.]/g, '').trim();
          const cachedComp = (cached.company || '').toLowerCase().replace(/[,.]/g, '').trim();
          if (!compClean || !cachedComp || compClean.includes(cachedComp) || cachedComp.includes(compClean) || ageSeconds < 30) {
            console.log(`[GmailSecurityReader] ✅ Retrieved Security Code from real-time cache: "${cached.code}" (age: ${ageSeconds.toFixed(1)}s)`);
            return cached.code;
          }
        }
      } catch (_) {}
    }

    // 2. Poll Gmail IMAP directly (which also extracts code and deletes email)
    try {
      const { stdout } = await execPromise(`python3 "${SCRIPT_PATH}" "${companyName}"`);
      const output = (stdout || '').trim();
      if (output.startsWith('CODE:')) {
        const code = output.replace('CODE:', '').trim();
        console.log(`[GmailSecurityReader] ✅ Retrieved Security Code from Gmail IMAP: ${code}`);
        return code;
      }
    } catch (e) {
      // retry
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`[GmailSecurityReader] ⚠️ No security code received within ${maxWaitSeconds}s`);
  return null;
}

module.exports = { fetchLatestSecurityCode };
