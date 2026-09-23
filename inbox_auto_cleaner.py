#!/usr/bin/env python3
"""
inbox_auto_cleaner.py — Automated Real-Time Inbox Cleaner & Greenhouse Suppressor

1. Scans INBOX for Greenhouse emails (security codes, application acknowledgements, updates).
2. For security code emails:
   - Extracts the 8-character verification code.
   - Saves it to latest_security_code.json with timestamp so application forms can use it.
   - Immediately and permanently deletes the email from Gmail INBOX & moves to Trash.
3. For all other Greenhouse emails (e.g. 'Thank you for applying', 'Application received'):
   - Immediately and permanently deletes from INBOX.
4. For delivery failures / bounce notices:
   - Immediately deletes from INBOX and flags BOUNCE:1 so undelivered cold emails are purged.
"""

import imaplib
import email
from bs4 import BeautifulSoup
import json
import os
import re
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDS_FILE = os.path.join(BASE_DIR, 'credentials.json')
CODE_CACHE_FILE = os.path.join(BASE_DIR, 'latest_security_code.json')

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


def save_cached_code(code, company='', subject=''):
    try:
        data = {
            'code': code,
            'company': company,
            'subject': subject,
            'timestamp': time.time(),
            'iso': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        with open(CODE_CACHE_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"[*] Saved security code '{code}' to cache for application submission.", flush=True)
    except Exception as e:
        print(f"⚠️ Failed to cache code: {e}", flush=True)


def clean_inbox():
    try:
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(USER, PASS)
        mail.select('INBOX')

        # Targeted queries for Greenhouse, security codes, and delivery bounces
        queries = [
            'FROM "greenhouse-mail.io"',
            'FROM "greenhouse.io"',
            'FROM "greenhouse"',
            'SUBJECT "Security code for your application"',
            'SUBJECT "Security code"',
            'FROM "mailer-daemon"',
            'SUBJECT "Delivery Status Notification"'
        ]

        found_ids = set()
        for q in queries:
            try:
                status, msgs = mail.search(None, q)
                if status == 'OK' and msgs[0]:
                    for mid in msgs[0].split():
                        found_ids.add(mid)
            except Exception:
                pass

        if not found_ids:
            mail.logout()
            print("CLEANED:0:BOUNCE:0")
            return

        cleaned = 0
        has_bounce = False

        for mid in found_ids:
            try:
                res, data = mail.fetch(mid, '(RFC822)')
                if not data or not data[0] or not isinstance(data[0], tuple):
                    continue

                msg = email.message_from_bytes(data[0][1])
                subject = msg.get('Subject', '')
                from_hdr = msg.get('From', '').lower()

                # Check for bounce
                if 'mailer-daemon' in from_hdr or 'delivery status' in subject.lower() or 'undeliverable' in subject.lower():
                    has_bounce = True

                # Check if it contains a Greenhouse security code
                is_greenhouse = ('greenhouse' in from_hdr or 'greenhouse' in subject.lower() or 'security code for your application' in subject.lower())
                
                if is_greenhouse and ('security code' in subject.lower() or 'code' in subject.lower()):
                    body = ''
                    for p in msg.walk():
                        if p.get_content_type() == 'text/html':
                            soup = BeautifulSoup(p.get_payload(decode=True).decode('utf-8', errors='ignore'), 'html.parser')
                            body += soup.get_text() + ' '
                        elif p.get_content_type() == 'text/plain':
                            body += p.get_payload(decode=True).decode('utf-8', errors='ignore') + ' '

                    m = (
                        re.search(r'security code field on your application:\s*([A-Za-z0-9]{6,10})', body, re.IGNORECASE) or
                        re.search(r'Copy and paste this code[^\n:]*[:\s]+([A-Za-z0-9]{6,10})', body, re.IGNORECASE) or
                        re.search(r'([A-Za-z0-9]{6,10})\s+After you enter the code', body, re.IGNORECASE)
                    )
                    if m:
                        code = m.group(1).strip()
                        # Extract company name from subject
                        comp_match = re.search(r'application to\s+(.+)$', subject, re.IGNORECASE)
                        company = comp_match.group(1).strip() if comp_match else 'Greenhouse'
                        save_cached_code(code, company, subject)

                # Permanently delete email from INBOX and move to Trash
                mail.store(mid, '+FLAGS', '\\Deleted')
                mail.store(mid, '+X-GM-LABELS', '\\Trash')
                mail.store(mid, '-X-GM-LABELS', '\\Inbox')
                cleaned += 1
            except Exception as ex:
                pass

        if cleaned > 0:
            mail.expunge()

        mail.logout()
        print(f"CLEANED:{cleaned}:BOUNCE:{1 if has_bounce else 0}")

    except Exception as e:
        print(f"ERROR:{e}")


if __name__ == '__main__':
    clean_inbox()
