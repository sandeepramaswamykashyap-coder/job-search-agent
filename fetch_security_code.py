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
    
    # Check Inbox first, fallback to All Mail
    folders = ['inbox', '\"[Gmail]/All Mail\"']
    found_code = None

    for folder in folders:
        try:
            mail.select(folder)
        except Exception:
            continue

        # Search for security code and verification code emails
        queries = [
            'SUBJECT "Security code"',
            'SUBJECT "verification code"',
            'SUBJECT "GitLab"',
            'FROM "no-reply@greenhouse.io"'
        ]
        
        all_ids = set()
        for q in queries:
            status, messages = mail.search(None, q)
            if messages and messages[0]:
                for e_id in messages[0].split():
                    all_ids.add(e_id)

        if not all_ids:
            continue

        # Check latest emails
        sorted_ids = sorted(list(all_ids), key=lambda x: int(x))
        for e_id in reversed(sorted_ids[-5:]):
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

                    # Match Greenhouse / GitLab / Stripe security codes (6 to 10 alphanumeric chars)
                    m = re.search(r'(?:code|verification[^\n]*code)[^\n:]*[:\s]+([A-Za-z0-9]{6,10})\b', body, re.IGNORECASE) or \
                        re.search(r'Copy and paste this code[^\n]*\s+([A-Za-z0-9]{6,10})\b', body, re.IGNORECASE) or \
                        re.search(r'\b([A-Za-z0-9]{8})\b', body)
                    
                    if m:
                        found_code = m.group(1).strip()
                        
                        # Instantly mark as READ and AUTO-TRASH/ARCHIVE so user is not disturbed
                        try:
                            mail.store(e_id, '+FLAGS', '\\Seen')
                            mail.store(e_id, '-X-GM-LABELS', '\\Inbox')
                            mail.store(e_id, '+X-GM-LABELS', '\\Trash')
                        except Exception:
                            pass
                        
                        break
            if found_code:
                break
        if found_code:
            break

    if found_code:
        print(f'CODE:{found_code}')
    else:
        print('NONE')

    mail.logout()
except Exception as e:
    print(f'ERROR:{e}')
