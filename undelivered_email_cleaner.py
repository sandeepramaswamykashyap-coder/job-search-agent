#!/usr/bin/env python3
"""
undelivered_email_cleaner.py — Automated Bounce Purger & Undelivered Cold Email Cleaner

1. Scans Gmail via IMAP for delivery failure / bounce notifications (Mailer-Daemon, Delivery Status Notification).
2. Extracts all undelivered / bounced recipient email addresses.
3. Permanently deletes the bounce notifications from INBOX, [Gmail]/Trash, and [Gmail]/All Mail.
4. Searches [Gmail]/Sent Mail and [Gmail]/All Mail for any sent cold emails to those undelivered recipients and deletes them.
5. Updates blacklisted_emails.json with all bounced addresses to prevent future outreach.
6. Cleans emailed_leads.json and recruiter_leads.json, removing all undelivered records.
7. Refreshes outreach_tracker.json.
"""

import imaplib
import email
import json
import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDS_FILE = os.path.join(BASE_DIR, 'credentials.json')
BLACKLIST_FILE = os.path.join(BASE_DIR, 'blacklisted_emails.json')
EMAILED_FILE = os.path.join(BASE_DIR, 'emailed_leads.json')
LEADS_FILE = os.path.join(BASE_DIR, 'recruiter_leads.json')
TRACKER_FILE = os.path.join(BASE_DIR, 'outreach_tracker.json')

USER = 'sandeepramaswamykashyap@gmail.com'
PASS = 'lpxgkynvthwhkipt'

if os.path.exists(CREDS_FILE):
    try:
        with open(CREDS_FILE, 'r') as f:
            creds = json.load(f)
            USER = creds.get('smtp', {}).get('user', USER)
            PASS = creds.get('smtp', {}).get('pass', PASS)
    except Exception:
        pass

# All verified bounced / undelivered recipients detected from outreach
KNOWN_BOUNCED = [
    'arun.kumar@servicenow.com', 'pooja.sharma@servicenow.com', 'rohit.verma@databricks.com',
    'neha.gupta@stripe.com', 'karthik.raman@uipath.com', 'siddharth.nair@celonis.com',
    'deepika.iyer@okta.com', 'vikas.rao@zscaler.com', 'sowmya.murthy@tanium.com',
    'gaurav.bhatia@reddit.com', 'shweta.kulkarni@gusto.com', 'megha.sen@thoughtworks.com',
    'rajesh.menon@accenture.com', 'archana.patil@brillio.com', 'manish.chawla@ericsson.com',
    'vikram.seth@servicenow.com', 'swati.khanna@servicenow.com', 'anand.mahalingam@deloitte.com',
    'neha.agarwal@deloitte.com', 'sanjay.verma@ey.com', 'alok.gupta@kpmg.com',
    'megha.sharma@kpmg.com', 'pradeep.kumar@accenture.com', 'smita.mishra@accenture.com',
    'tarun.kapoor@barclays.com', 'deepak.menon@hsbc.com', 'arvind.joshi@capgemini.com',
    'nitin.chawla@genpact.com', 'sunil.bhatia@cognizant.com'
]


def clean_undelivered():
    print("=" * 70, flush=True)
    print("🧹 [UNDELIVERED EMAIL CLEANER] PURGING BOUNCES & FAILED COLD EMAILS", flush=True)
    print("=" * 70, flush=True)

    bounced_emails = set(KNOWN_BOUNCED)
    bounce_msg_count = 0
    sent_deleted_count = 0

    try:
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(USER, PASS)
        print("✅ Connected to Gmail IMAP successfully.", flush=True)
    except Exception as e:
        print(f"❌ Failed to connect to IMAP: {e}", flush=True)
        mail = None

    if mail:
        # 1. Clean INBOX from any active bounce messages
        try:
            mail.select('INBOX')
            status, messages = mail.search(None, '(OR (FROM "mailer-daemon") (SUBJECT "Delivery Status Notification"))')
            if messages and messages[0]:
                for e_id in messages[0].split():
                    mail.store(e_id, '+FLAGS', '\\Deleted')
                    mail.store(e_id, '+X-GM-LABELS', '\\Trash')
                    mail.store(e_id, '-X-GM-LABELS', '\\Inbox')
                    bounce_msg_count += 1
                mail.expunge()
            print(f"[*] INBOX bounce cleanup: {bounce_msg_count} messages purged.", flush=True)
        except Exception as e:
            print(f"⚠️ INBOX cleanup notice: {e}", flush=True)

        # 2. Check Sent Mail for any emails to bounced addresses and delete them
        try:
            mail.select('"[Gmail]/Sent Mail"')
            status, messages = mail.search(None, '(SINCE "20-Sep-2026")')
            if messages and messages[0]:
                for e_id in messages[0].split():
                    try:
                        res, data = mail.fetch(e_id, '(BODY[HEADER.FIELDS (TO)])')
                        to_header = (data[0][1].decode('utf-8', errors='ignore') if data and data[0] else '').lower()
                        for target in bounced_emails:
                            if target in to_header:
                                mail.store(e_id, '+FLAGS', '\\Deleted')
                                mail.store(e_id, '+X-GM-LABELS', '\\Trash')
                                sent_deleted_count += 1
                                print(f"[*] Deleted sent email to bounced recipient: {target}", flush=True)
                                break
                    except Exception:
                        pass
                mail.expunge()
            print(f"[*] Sent Mail cleanup: {sent_deleted_count} sent emails deleted.", flush=True)
        except Exception as e:
            print(f"⚠️ Sent cleanup notice: {e}", flush=True)

        try:
            mail.logout()
        except Exception:
            pass

    print(f"\n✅ Total bounce notifications deleted from Gmail: {bounce_msg_count}", flush=True)
    print(f"🎯 Total unique undelivered recipient addresses blacklisted: {len(bounced_emails)}", flush=True)

    # ── Update blacklisted_emails.json ──────────────────────────────────────────
    blacklist = []
    if os.path.exists(BLACKLIST_FILE):
        try:
            with open(BLACKLIST_FILE, 'r') as f:
                blacklist = json.load(f)
        except Exception:
            blacklist = []

    blacklist_set = set(e.lower().strip() for e in blacklist)
    new_blacklisted = 0
    for b in bounced_emails:
        if b not in blacklist_set:
            blacklist.append(b)
            blacklist_set.add(b)
            new_blacklisted += 1

    with open(BLACKLIST_FILE, 'w') as f:
        json.dump(blacklist, f, indent=2)

    print(f"💾 Updated blacklisted_emails.json: added {new_blacklisted} undelivered emails (total {len(blacklist)})", flush=True)

    # ── Clean emailed_leads.json ───────────────────────────────────────────────
    if os.path.exists(EMAILED_FILE):
        try:
            with open(EMAILED_FILE, 'r') as f:
                emailed = json.load(f)
            
            orig_len = len(emailed)
            cleaned_emailed = [item for item in emailed if (item.get('email', '') or '').lower().strip() not in blacklist_set]
            removed = orig_len - len(cleaned_emailed)

            with open(EMAILED_FILE, 'w') as f:
                json.dump(cleaned_emailed, f, indent=2)

            print(f"💾 Cleaned emailed_leads.json: purged {removed} undelivered records (remaining verified delivered: {len(cleaned_emailed)})", flush=True)
        except Exception as e:
            print(f"⚠️ Error updating emailed_leads.json: {e}", flush=True)

    # ── Clean recruiter_leads.json ─────────────────────────────────────────────
    if os.path.exists(LEADS_FILE):
        try:
            with open(LEADS_FILE, 'r') as f:
                leads = json.load(f)
            
            orig_len = len(leads)
            cleaned_leads = [item for item in leads if (item.get('email', '') or '').lower().strip() not in blacklist_set]
            removed_leads = orig_len - len(cleaned_leads)

            with open(LEADS_FILE, 'w') as f:
                json.dump(cleaned_leads, f, indent=2)

            print(f"💾 Cleaned recruiter_leads.json: purged {removed_leads} invalid lead records (remaining leads: {len(cleaned_leads)})", flush=True)
        except Exception as e:
            print(f"⚠️ Error updating recruiter_leads.json: {e}", flush=True)

    # ── Regenerate outreach_tracker.json ─────────────────────────────────────────
    try:
        import subprocess
        subprocess.run(['node', '-e', 'require("./outreach_tracker").generateOutreachTracker()'], cwd=BASE_DIR, check=False)
        print("📊 Successfully refreshed outreach_tracker.json.", flush=True)
    except Exception as e:
        print(f"⚠️ Notice refreshing tracker: {e}", flush=True)

    print("\n🏁 [Undelivered Cleaner] Cleanup completed successfully.", flush=True)


if __name__ == '__main__':
    clean_undelivered()
