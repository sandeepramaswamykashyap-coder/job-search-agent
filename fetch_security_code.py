#!/usr/bin/env python3
import imaplib
import email
from bs4 import BeautifulSoup
import re
import sys
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDS_FILE = os.path.join(BASE_DIR, 'credentials.json')

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

company_filter = sys.argv[1].lower().strip() if len(sys.argv) > 1 else ''

try:
    mail = imaplib.IMAP4_SSL('imap.gmail.com')
    mail.login(USER, PASS)
    
    # Check Inbox first, fallback to All Mail
    folders = ['INBOX', '"[Gmail]/All Mail"']
    found_code = None

    for folder in folders:
        try:
            mail.select(folder)
        except Exception:
            continue

        # Target Greenhouse and ATS verification code emails
        queries = [
            'SUBJECT "Security code for your application"',
            'SUBJECT "Security code"',
            '(FROM "greenhouse-mail.io" SUBJECT "code")'
        ]
        
        all_ids = set()
        for q in queries:
            try:
                status, messages = mail.search(None, q)
                if messages and messages[0]:
                    for e_id in messages[0].split():
                        all_ids.add(e_id)
            except Exception:
                pass

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
                    from_hdr = msg.get('From', '').lower()
                    
                    # Strictly require subject to be a security/verification code email
                    if not ('security code' in subject.lower() or 'verification code' in subject.lower()):
                        continue

                    if company_filter and ('application to' in subject.lower()):
                        if company_filter not in subject.lower() and company_filter not in msg.as_string().lower():
                            continue

                    body = ''
                    for p in msg.walk():
                        if p.get_content_type() == 'text/html':
                            soup = BeautifulSoup(p.get_payload(decode=True).decode('utf-8', errors='ignore'), 'html.parser')
                            body += soup.get_text() + ' '
                        elif p.get_content_type() == 'text/plain':
                            body += p.get_payload(decode=True).decode('utf-8', errors='ignore') + ' '

                    # Match strict Greenhouse code pattern (surrounded by security code instruction text)
                    m = (
                        re.search(r'security code field on your application:\s*([A-Za-z0-9]{6,10})', body, re.IGNORECASE) or
                        re.search(r'Copy and paste this code[^\n:]*[:\s]+([A-Za-z0-9]{6,10})', body, re.IGNORECASE) or
                        re.search(r'([A-Za-z0-9]{6,10})\s+After you enter the code', body, re.IGNORECASE) or
                        re.search(r'verification code is:\s*([A-Za-z0-9]{6,10})', body, re.IGNORECASE)
                    )
                    
                    if m:
                        code_candidate = m.group(1).strip()
                        # Ensure candidate is alphanumeric and not a word
                        if code_candidate.lower() not in ['security', 'greenhouse', 'application', 'resubmit', 'applying']:
                            found_code = code_candidate
                            
                            # Save to cache file for instant consumer access
                            try:
                                with open(os.path.join(BASE_DIR, 'latest_security_code.json'), 'w') as f:
                                    json.dump({
                                        'code': found_code,
                                        'company': company_filter or 'Greenhouse',
                                        'timestamp': __import__('time').time()
                                    }, f, indent=2)
                            except Exception:
                                pass

                            # Immediately and permanently delete email from Gmail
                            try:
                                mail.store(e_id, '+FLAGS', '\\Deleted')
                                mail.store(e_id, '+X-GM-LABELS', '\\Trash')
                                mail.store(e_id, '-X-GM-LABELS', '\\Inbox')
                                mail.expunge()
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
