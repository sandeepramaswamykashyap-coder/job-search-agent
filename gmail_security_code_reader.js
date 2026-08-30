/**
 * gmail_security_code_reader.js — Real-time Gmail IMAP Security Code Fetcher
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

const SCRIPT_PATH = path.join(__dirname, 'fetch_security_code.py');

/**
 * Polls Gmail IMAP for the latest security code received in the last N seconds
 * @param {string} companyName - Company name hint (e.g. 'Elastic', 'GitLab')
 * @param {number} maxWaitSeconds - Maximum seconds to poll (default 25)
 * @returns {Promise<string|null>} - The security code string or null
 */
async function fetchLatestSecurityCode(companyName = '', maxWaitSeconds = 25) {
  console.log(`[GmailSecurityReader] 🔐 Checking Gmail for security code (${companyName || 'Greenhouse'})...`);
  
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
    try {
      const { stdout } = await execPromise(`python3 "${SCRIPT_PATH}" "${companyName}"`);
      const output = stdout.trim();
      if (output.startsWith('CODE:')) {
        const code = output.replace('CODE:', '').trim();
        console.log(`[GmailSecurityReader] ✅ Retrieved Security Code from Gmail: ${code}`);
        return code;
      }
    } catch (e) {
      // retry
    }
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log(`[GmailSecurityReader] ⚠️ No security code received within ${maxWaitSeconds}s`);
  return null;
}

module.exports = { fetchLatestSecurityCode };
