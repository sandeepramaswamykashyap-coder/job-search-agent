/**
 * Job Search & Application Agent - Daily Email Reporter
 * Compiles and dispatches the daily summary email to the user.
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

/**
 * Formats the statistics into an HTML report
 */
function buildHtmlReport(stats) {
  const todayStr = new Date().toDateString();

  // ── Filter to TODAY only ─────────────────────────────────────────────────
  const todayApplied = (stats.appliedRolesList || []).filter(r => {
    try { return new Date(r.time).toDateString() === todayStr; } catch(_) { return false; }
  });

  const appliedRows = todayApplied.map(r => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${r.company}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${r.title}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">${r.portal}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${new Date(r.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</td>
    </tr>
  `).join('');

  const todayFailures = (stats.failures || []).filter(f => {
    try { return new Date(f.time).toDateString() === todayStr; } catch(_) { return false; }
  });
  const failureRows = todayFailures.map(f => `
    <tr style="color: #d9534f;">
      <td style="padding: 8px; border: 1px solid #ddd;">${new Date(f.time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${f.context}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${f.error}</td>
    </tr>
  `).join('');

  // ── Today's recruiter emails only ───────────────────────────────────────
  let emailedLeads = [];
  const emailedFile = path.join(__dirname, 'emailed_leads.json');
  if (fs.existsSync(emailedFile)) {
    try { emailedLeads = JSON.parse(fs.readFileSync(emailedFile, 'utf8')); } catch (e) {}
  }
  const todayEmailed = emailedLeads.filter(e => {
    try { return new Date(e.dispatchedAt).toDateString() === todayStr; } catch(_) { return false; }
  });

  const outreachRows = todayEmailed.map(e => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${e.email}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${e.company}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${e.title}</td>
      <td style="padding: 8px; border: 1px solid #ddd; color: ${e.status === 'sent' ? '#28a745' : '#d9534f'}; font-weight: bold;">
        ${e.status === 'sent' ? '✅ SENT (CV Attached)' : '⚠️ ' + e.status}
      </td>
    </tr>
  `).join('');

  // ── LinkedIn connections sent today ─────────────────────────────────────
  let connectionsToday = 0;
  const connFile = path.join(__dirname, 'connection_requests.json');
  if (fs.existsSync(connFile)) {
    try {
      const conns = JSON.parse(fs.readFileSync(connFile, 'utf8'));
      connectionsToday = conns.filter(c => {
        try { return new Date(c.verifiedAt).toDateString() === todayStr; } catch(_) { return false; }
      }).length;
    } catch (e) {}
  }

  // ── Accurate counts from actual lists (not counters) ───────────────────
  const appCount = todayApplied.length;
  const remoteCount = todayApplied.filter(r =>
    ['weworkremotely','remoteok','jobgether','remotive','dailyremote','workingnomads','surelyremote'].includes((r.portal||'').toLowerCase())
  ).length;
  const indianCount = appCount - remoteCount;

  // ── Response & Aging Tracker ───────────────────────────────────────────────
  const { generateOutreachTracker } = require('./outreach_tracker');
  const tracker = generateOutreachTracker();

  const trackerRows = (tracker.emailsList || []).slice(0, 10).map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.recipient}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.company}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.title}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.daysElapsed} days</td>
      <td style="padding: 8px; border: 1px solid #ddd; color: #0056b3; font-weight: bold;">${item.stage}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
      <h2 style="color: #0056b3; text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 10px;">Google Antigravity Daily Job & Outreach Report (8 AM IST)</h2>

      <p>Hello Sandeep,</p>
      <p>Here is your 24/7 overnight job search and outreach summary report for <strong>${todayStr}</strong> (8:00 AM IST).</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Metric</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Today / Volume</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">Jobs Scanned / Evaluated</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${stats.jobsScanned || 0}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">🌍 Remote Applications Submitted</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #0056b3;">${remoteCount}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">🇮🇳 Indian Portal Applications Submitted</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #28a745;">${indianCount}</td>
        </tr>
        <tr style="background-color: #f0f8ff;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">✅ Total Applications (Today)</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 16px; color: #0056b3;">${appCount}</td>
        </tr>
        <tr style="background-color: #f0fff4;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">🤝 LinkedIn Connections Sent Today (Verified Pending)</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #28a745; font-size: 16px;">${connectionsToday}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">📧 Recruiter Cold Emails Sent Today</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #0056b3;">${todayEmailed.length}</td>
        </tr>
      </table>

      <h3 style="color: #0056b3;">1. Direct Recruiter Cold Email Outreach (Today)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead style="background-color: #e9ecef;">
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Recruiter Email</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Company</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Target Title</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${outreachRows.length > 0 ? outreachRows : '<tr><td colspan="4" style="text-align: center; padding: 15px; color: #777;">No new recruiter emails dispatched today.</td></tr>'}
        </tbody>
      </table>

      <h3 style="color: #0a66c2;">2. LinkedIn Personalized Connections Sent Today</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead style="background-color: #e8f0fe;">
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Company</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Note Sent</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Time (IST)</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            let conns = [];
            const connFile = require('path').join(__dirname, 'connection_requests.json');
            if (require('fs').existsSync(connFile)) {
              try { conns = JSON.parse(require('fs').readFileSync(connFile, 'utf8')); } catch(e) {}
            }
            const todayConns = conns.filter(c => c.personalizedNote === true && c.name !== 'Leader').filter(c => { try { return new Date(c.verifiedAt).toDateString() === todayStr; } catch(_) { return false; } });
            if (todayConns.length === 0) return '<tr><td colspan="4" style="text-align: center; padding: 15px; color: #777;">No verified LinkedIn connections sent today yet.</td></tr>';
            return todayConns.map(c => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${c.name}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${c.company || 'N/A'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-style: italic; color: #555;">${(c.note || '').substring(0, 100)}...</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${new Date(c.verifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</td>
              </tr>`).join('');
          })()}
        </tbody>
      </table>

      <h3 style="color: #28a745;">3. Executive Outreach & Response Aging Tracker</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead style="background-color: #e8f5e9;">
          <tr>
            <th style="padding: 6px; border: 1px solid #ddd;">Target Contact</th>
            <th style="padding: 6px; border: 1px solid #ddd;">Company</th>
            <th style="padding: 6px; border: 1px solid #ddd;">Role</th>
            <th style="padding: 6px; border: 1px solid #ddd;">Aging</th>
            <th style="padding: 6px; border: 1px solid #ddd;">Lifecycle Stage</th>
          </tr>
        </thead>
        <tbody>
          ${trackerRows}
        </tbody>
      </table>

      <h3 style="color: #333;">4. Applications Submitted Today (${appCount} total)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead style="background-color: #f1f3f5;">
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Company</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Title</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Portal</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Time (IST)</th>
          </tr>
        </thead>
        <tbody>
          ${appliedRows.length > 0 ? appliedRows : '<tr><td colspan="4" style="text-align: center; padding: 15px; color: #777;">No portal applications submitted today.</td></tr>'}
        </tbody>
      </table>

      ${todayFailures.length > 0 ? `
        <h3 style="color: #d9534f;">5. Warnings / Retries (Today)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <thead style="background-color: #fdf2f2;">
            <tr>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left; color: #d9534f;">Time</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left; color: #d9534f;">Context</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left; color: #d9534f;">Error / Notice</th>
            </tr>
          </thead>
          <tbody>
            ${failureRows}
          </tbody>
        </table>
      ` : ''}

      <footer style="text-align: center; border-top: 1px solid #eee; padding-top: 15px; color: #777; font-size: 12px; margin-top: 30px;">
        Automated 24/7 Service powered by Google Antigravity Agent Platform
      </footer>
    </div>
  `;
}

/**
 * Sends the daily email report to connect.sandeepkashyap@gmail.com
 */
async function sendDailyReport(stats) {
  console.log("[Reporter] Preparing EOD daily report...");
  const recipient = "connect.sandeepkashyap@gmail.com";
  
  // Set up Nodemailer transport from environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'sandeepramaswamykashyap@gmail.com',
      pass: process.env.SMTP_PASS || 'lpxgkynvthwhkipt'
    }
  });

  if (!stats) {
    const statsPath = path.join(__dirname, 'stats.json');
    if (fs.existsSync(statsPath)) {
      try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch (e) {}
    }
    stats = stats || { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [] };
  }

  const htmlContent = buildHtmlReport(stats);

  const mailOptions = {
    from: `"Sandeep Kashyap Automated Agent" <sandeepramaswamykashyap@gmail.com>`,
    to: recipient,
    subject: `EOD Job Applications & Recruiter Pitch Report - ${new Date().toDateString()}`,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Reporter] EOD Report successfully dispatched to ${recipient}`);
}

module.exports = {
  sendDailyReport
};
