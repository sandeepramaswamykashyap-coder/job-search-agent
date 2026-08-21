/**
 * Continuous IMAP Bounce Watchdog Service
 * Monitors Gmail INBOX for any delivery bounce notifications, auto-blacklists the failed recipient,
 * and purges the bounce notification to Trash to guarantee a 100% clean INBOX.
 */

const Imap = require('imap');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const blacklistFile = path.join(__dirname, 'blacklisted_emails.json');

function addToBlacklist(email) {
  if (!email || typeof email !== 'string') return;
  const e = email.toLowerCase().trim();
  let list = [];
  if (fs.existsSync(blacklistFile)) {
    try { list = JSON.parse(fs.readFileSync(blacklistFile, 'utf8')); } catch (err) {}
  }
  if (!list.includes(e)) {
    list.push(e);
    try {
      fs.writeFileSync(blacklistFile, JSON.stringify(list, null, 2), 'utf8');
      console.log(`[BounceWatchdog] 🚫 Blacklisted failed bounce recipient: ${e}`);
    } catch (err) {}
  }
}

function checkAndPurgeBounces() {
  const user = process.env.SMTP_USER || 'sandeepramaswamykashyap@gmail.com';
  const pass = process.env.SMTP_PASS || 'lpxgkynvthwhkipt';

  const imap = new Imap({
    user,
    password: pass,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });

  imap.once('ready', function() {
    imap.openBox('INBOX', false, function(err, box) {
      if (err) {
        console.error(`[BounceWatchdog] IMAP Box open error: ${err.message}`);
        imap.end();
        return;
      }

      // Search for bounce messages by sender or subject
      imap.search([['HEADER', 'FROM', 'mailer-daemon@googlemail.com']], function(err, results1) {
        const uids1 = results1 || [];
        imap.search([['HEADER', 'SUBJECT', 'Delivery Status Notification']], function(err, results2) {
          const uids2 = results2 || [];
          const allUids = Array.from(new Set([...uids1, ...uids2]));

          if (allUids.length === 0) {
            console.log(`[BounceWatchdog] Check complete: 0 bounce notifications in INBOX.`);
            imap.end();
            return;
          }

          console.log(`[BounceWatchdog] ⚠️ Found ${allUids.length} bounce notifications in INBOX. Processing & moving to Trash...`);

          // Fetch message headers to extract recipient if available
          const fetchStream = imap.fetch(allUids, { struct: false, headers: true });
          fetchStream.on('message', function(msg) {
            msg.on('body', function(stream) {
              let buffer = '';
              stream.on('data', function(chunk) { buffer += chunk.toString('utf8'); });
              stream.on('end', function() {
                const match = buffer.match(/To:\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i) ||
                              buffer.match(/Failed Recipient:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                if (match && match[1]) {
                  addToBlacklist(match[1]);
                }
              });
            });
          });

          fetchStream.once('end', function() {
            // Move all bounce emails to Trash
            imap.move(allUids, '[Gmail]/Trash', function(err) {
              if (err) {
                console.error(`[BounceWatchdog] Error moving bounces to Trash: ${err.message}`);
              } else {
                console.log(`[BounceWatchdog] ✅ Moved ${allUids.length} bounce notifications to Trash.`);
              }
              imap.end();
            });
          });
        });
      });
    });
  });

  imap.once('error', function(err) {
    console.error(`[BounceWatchdog] IMAP Error: ${err.message}`);
  });

  imap.connect();
}

// Run immediately on start
checkAndPurgeBounces();

// Schedule to run every 10 minutes
setInterval(checkAndPurgeBounces, 10 * 60 * 1000);
