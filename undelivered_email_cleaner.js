/**
 * undelivered_email_cleaner.js — Node.js wrapper for undelivered_email_cleaner.py
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

const SCRIPT_PATH = path.join(__dirname, 'undelivered_email_cleaner.py');

async function purgeUndeliveredEmails() {
  try {
    const { stdout, stderr } = await execPromise(`python3 "${SCRIPT_PATH}"`);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
    return true;
  } catch (err) {
    console.warn(`[UndeliveredCleaner] Warning: ${err.message}`);
    return false;
  }
}

if (require.main === module) {
  purgeUndeliveredEmails();
}

module.exports = { purgeUndeliveredEmails };
