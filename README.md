# Google Antigravity – Job Search & Application Agent

An autonomous agent that searches and applies for jobs on your behalf across major job portals, featuring human-like anti-detection algorithms, daily CV re-upload, and daily reporting at 8 PM IST.

## Project Structure

* `scheduler.js` - Continuous loop controller (2-hour search cycles, randomized jitter, daily report triggers).
* `agent.js` - Browser automation scripts utilizing Playwright (anti-detection timing, typing simulation, and cursor movement).
* `reporter.js` - Compiles daily run metrics and dispatches an HTML report to `sandeepramaswamykashyap@gmail.com`.
* `profile.json` - Custom profile search parameters (job titles, locations, skills) parsed from your PDF.
* `config.json` - Operational configurations mapping CV location (`Sandeep_Kashyap.pdf`), target platforms, and limits.
* `credentials.json` - Secure credential repository for job portals.

## Installation & Setup

1. Make sure you have Node.js installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update portal credentials in `credentials.json`. If you prefer to log in manually to avoid inputting passwords, the browser launches in headed mode. Cookies will automatically save in the `.browser_session/` directory to preserve your active sessions.
4. Run the scheduler:
   ```bash
   npm start
   ```

## Daily Email Reports
Configure SMTP environment variables or your `.env` file for automated email reporting:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```
*(If SMTP is not configured, the daily report will print to the console standard output at 8 PM IST).*
