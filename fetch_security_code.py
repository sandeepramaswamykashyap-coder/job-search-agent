#!/usr/bin/env python3
import imaplib
import email
from bs4 import BeautifulSoup
import re
import sys

USER = 'sandeepramaswamykashyap@gmail.com'
PASS = 'lpxgkynvthwhkipt'

company_filter = sys.argv[1].lower() if len(sys.argv) > 1 else ''

try:
    mail = imaplib.IMAP4_SSL('imap.gmail.com')
    mail.login(USER, PASS)
    mail.select('inbox')

    # Search security code emails
    status, messages = mail.search(None, 'SUBJECT "Security code"')
    email_ids = messages[0].split() if messages and messages[0] else []

    if not email_ids:
        print('NONE')
        sys.exit(0)

    # Check latest 3 emails
    for e_id in reversed(email_ids[-3:]):
        res, msg_data = mail.fetch(e_id, '(RFC822)')
        for part in msg_data:
            if isinstance(part, tuple):
                msg = email.message_from_bytes(part[1])
                subject = msg.get('Subject', '')
                
                body = ''
                for p in msg.walk():
                    if p.get_content_type() == 'text/html':
                        soup = BeautifulSoup(p.get_payload(decode=True).decode('utf-8', errors='ignore'), 'html.parser')
                        body += soup.get_text() + ' '
                    elif p.get_content_type() == 'text/plain':
                        body += p.get_payload(decode=True).decode('utf-8', errors='ignore') + ' '

                # Match Greenhouse security code
                m = re.search(r'Copy and paste this code[^\n]*\s+([A-Za-z0-9]{6,10})\b', body, re.IGNORECASE)
                if m:
                    code = m.group(1).strip()
                    print(f'CODE:{code}')
                    mail.logout()
                    sys.exit(0)

    mail.logout()
    print('NONE')
except Exception as e:
    print(f'ERROR:{e}')
