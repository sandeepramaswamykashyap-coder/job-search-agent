/**
 * inbox_auto_cleaner.js — Real-Time Background Inbox Noise Suppressor
 * 
 * Automatically monitors Gmail via IMAP and silently intercepts, marks as READ,
 * and trashes/expunges automated Greenhouse emails (security codes, OTPs, application confirmations)
 * as well as undelivered / bounce notices.
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

const SCRIPT_PATH = path.join(__dirname, 'inbox_auto_cleaner.py');
const { purgeUndeliveredEmails } = require('./undelivered_email_cleaner');

async function checkAndCleanInbox() {
  try {
    const { stdout } = await execPromise(`python3 "${SCRIPT_PATH}"`);
    const output = (stdout || '').trim();
    if (output.includes('CLEANED:')) {
      const match = output.match(/CLEANED:(\d+):BOUNCE:(\d+)/);
      if (match) {
        const cleaned = parseInt(match[1], 10);
        const hasBounce = match[2] === '1';
        if (cleaned > 0) {
          console.log(`[InboxCleaner] 🧹 Intercepted & purged ${cleaned} Greenhouse/ATS emails from INBOX.`);
        }
        if (hasBounce) {
          console.log('[InboxCleaner] ⚠️ Delivery failure notice detected! Triggering undelivered email purge...');
          await purgeUndeliveredEmails().catch(() => {});
        }
        return { cleaned, hasBounce };
      }
    }
  } catch (err) {
    // quiet recovery
  }
  return { cleaned: 0, hasBounce: false };
}

async function loop() {
  console.log('[InboxCleaner] 🛡️ Real-Time Background Inbox Noise Suppressor active (Auto-deleting Greenhouse codes & bounced emails).');
  while (true) {
    await checkAndCleanInbox();
    await new Promise(r => setTimeout(r, 6000)); // Poll every 6 seconds
  }
}

if (require.main === module) {
  loop();
}

module.exports = { loop, checkAndCleanInbox };
