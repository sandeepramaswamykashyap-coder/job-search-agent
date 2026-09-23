/**
 * inbox_auto_cleaner.js — Real-Time Background Inbox Noise Suppressor
 * 
 * Automatically monitors Gmail via IMAP and silently intercepts, marks as READ,
 * and archives/trashes automated ATS emails (security codes, OTPs, "Thank you for applying" confirmations).
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const CLEAN_CMD = `python3 -c "
import imaplib

USER = 'sandeepramaswamykashyap@gmail.com'
PASS = 'lpxgkynvthwhkipt'

const PATTERNS_FROM = ['greenhouse-mail.io', 'greenhouse.io', 'lever.co', 'ashbyhq.com', 'smartrecruiters.com', 'myworkdayjobs.com', 'mg.gitlab.com', 'stripe.com', 'mailer-daemon', 'postmaster']
PATTERNS_SUBJ = ['Security code', 'verification code', 'Thank you for applying', 'Application received', 'Thanks for applying', 'Your application to', 'We have received your application', 'Delivery Status Notification', 'Undeliverable:']

try:
    mail = imaplib.IMAP4_SSL('imap.gmail.com')
    mail.login(USER, PASS)
    mail.select('inbox')
    status, messages = mail.search(None, 'ALL')
    has_bounce = False
    if messages and messages[0]:
        ids = messages[0].split()
        cleaned = 0
        for e_id in reversed(ids[-30:]):
            res, data = mail.fetch(e_id, '(BODY[HEADER.FIELDS (FROM SUBJECT)])')
            if not data or not data[0] or not isinstance(data[0], tuple):
                continue
            header = data[0][1].decode('utf-8', errors='ignore').lower()
            if any(p.lower() in header for p in PATTERNS_FROM) or any(s.lower() in header for s in PATTERNS_SUBJ):
                if 'mailer-daemon' in header or 'delivery status' in header or 'undeliverable' in header:
                    has_bounce = True
                mail.store(e_id, '+FLAGS', '\\\\Deleted')
                mail.store(e_id, '-X-GM-LABELS', '\\\\Inbox')
                mail.store(e_id, '+X-GM-LABELS', '\\\\Trash')
                cleaned += 1
        if cleaned > 0:
            mail.expunge()
            print(f'CLEANED:{cleaned}:BOUNCE:{1 if has_bounce else 0}')
    mail.logout()
except Exception:
    pass
"`;

const { purgeUndeliveredEmails } = require('./undelivered_email_cleaner');

async function loop() {
  console.log('[InboxCleaner] 🛡️ Real-Time Background Inbox Noise Suppressor active (Auto-deleting Greenhouse codes & bounced emails).');
  while (true) {
    try {
      const { stdout } = await execPromise(CLEAN_CMD);
      if (stdout && stdout.includes('CLEANED:')) {
        const parts = stdout.split(':');
        const count = parts[1] || '1';
        const hasBounce = stdout.includes('BOUNCE:1');
        console.log(`[InboxCleaner] 🧹 Intercepted & purged ${count} ATS security/notification emails.`);
        if (hasBounce) {
          console.log('[InboxCleaner] ⚠️ Delivery failure notice detected! Triggering undelivered email purge...');
          await purgeUndeliveredEmails();
        }
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 15000));
  }
}

if (require.main === module) {
  loop();
}

module.exports = { loop };
