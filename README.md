# Autonomous Executive Job Search & Application Platform

An autonomous, production-grade AI agent platform built for executive job discovery, automated ATS portal form filling, real-time 2FA security code resolution, zero-guesswork recruiter outreach, and daily verified reporting.

---

## 🏗️ Architecture & Core Modules

### 1. Master Control & Submission Engines
* **`scheduler.js`**: Master 24/7 background coordinator managing job sweeps, recruiter outreach flushes, and daily morning reports.
* **`live_continuous_submission_engine.js`**: Multi-stream real-time submission daemon actively advancing through unapplied senior openings across 180+ enterprise company boards.
* **`visible_tier1_desktop_runner.js`**: Headed browser automation runner for visible live desktop form submissions.

### 2. ATS Ingestion & Form Automation
* **`company_ats_fetcher.js`**: High-speed parallel API fetcher querying 180+ enterprise company boards across Greenhouse, Lever, and SmartRecruiters in seconds.
* **`portal_router.js`**: Intelligent ATS detection and dispatch router.
* **`ats_engines/`**: Modular ATS drivers supporting Greenhouse, Lever, SmartRecruiters, Workday, Taleo, iCIMS, and generic forms.
* **`form_filler.js`**: Comprehensive multi-field form filler supporting custom dropdowns, notice periods, salary expectations, and CV file attachments.

### 3. Real-Time 2FA Verification & Security Solvers
* **`gmail_security_code_reader.js` & `fetch_security_code.py`**: Automated SSL IMAP email reader listening in real time to auto-extract 8-character verification codes (e.g. GitLab, Okta, Greenhouse security challenges) within 3 seconds.

### 4. Recruiter Outreach & Verification
* **`email_verifier.js`**: Zero-guesswork filter ensuring cold outreach emails are exclusively sent to verified contacts published inside authentic job postings.
* **`outreach_mailer.js` & `outreach_tracker.js`**: SMTP cold mailer dispatching personalized executive pitches with `Sandeep_Kashyap.pdf` attached.
* **`blacklisted_emails.json`**: Permanent blacklist preventing repeat delivery attempts to invalid or bouncing addresses.

### 5. Reporting & Master CV Generation
* **`reporter.js`**: Automated daily morning HTML executive report generator delivering directly to primary and secondary candidate inboxes.
* **`send_instant_report.js`**: On-demand instant status reporter.
* **`generate_perfect_cv.js`**: Automated Playwright Chromium PDF generator rendering clean, ATS-optimized 1-page CVs with embedded GitHub & LinkedIn links.

### 6. Automated Git Synchronization
* **`git_auto_pusher.js`**: Real-time git synchronization daemon automatically committing and pushing verified application milestones and engine updates to GitHub (`origin/main`).

---

## 📊 Data Layer & Databases

* **`applications_history.json`**: Strict single source of truth for verified submitted applications with portal types, URLs, and timestamps.
* **`emailed_leads.json`**: Registry of verified recruiter and hiring manager email dispatches.
* **`recruiter_leads.json`**: Target recruiter and executive contact queue.
* **`profile.json`**: Complete candidate master profile (contact info, target titles, salary bands, notice period, GitHub & LinkedIn URLs).
* **`config.json`**: Operational configurations, platform priorities, and scheduler settings.

---

## 🚀 Quick Start & Usage

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Continuous Submission Engine
```bash
node live_continuous_submission_engine.js
```

### 3. Start the Master 24/7 Scheduler
```bash
node scheduler.js
```

### 4. Generate Updated Master CV
```bash
node generate_perfect_cv.js
```

### 5. Dispatch Instant Email Report
```bash
node send_instant_report.js
```

### 6. Auto-Sync to GitHub
```bash
node -e "const { syncToGitHub } = require('./git_auto_pusher'); syncToGitHub();"
```

---

## 🛡️ Security & Privacy
* Sensitive local browser session caches (`.browser_session*`), personal authentication tokens, and temporary files are strictly ignored and protected via `.gitignore`.
