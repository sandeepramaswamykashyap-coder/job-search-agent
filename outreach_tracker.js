/**
 * Job Search & Application Agent - Outreach & Response Tracker Module
 * Tracks engagement, response lifecycle, aging (days pending), and follow-up triggers
 * for LinkedIn Connection Requests and Cold Recruiter Emails.
 */

const fs = require('fs');
const path = require('path');

const emailedPath = path.join(__dirname, 'emailed_leads.json');
const connPath = path.join(__dirname, 'connection_requests.json');
const trackerPath = path.join(__dirname, 'outreach_tracker.json');

function calculateAgingDays(dateStr) {
  if (!dateStr) return 0;
  const sentDate = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - sentDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function generateOutreachTracker() {
  let emailed = [];
  let connections = [];

  if (fs.existsSync(emailedPath)) {
    try { emailed = JSON.parse(fs.readFileSync(emailedPath, 'utf8')); } catch (e) {}
  }

  if (fs.existsSync(connPath)) {
    try { connections = JSON.parse(fs.readFileSync(connPath, 'utf8')); } catch (e) {}
  }

  // 1. Process Cold Emails
  const trackedEmails = emailed.map(item => {
    const daysElapsed = calculateAgingDays(item.dispatchedAt);
    let stage = 'Initial Outreach Window (0-2 days)';
    let followUpStatus = 'Pending Initial Review';

    if (daysElapsed >= 5) {
      stage = 'Follow-Up Eligible (5+ days)';
      followUpStatus = 'Follow-Up Email 1 Due';
    } else if (daysElapsed >= 3) {
      stage = 'Under Evaluation (3-4 days)';
      followUpStatus = 'Awaiting Recruiter Response';
    }

    return {
      type: 'Cold Email',
      recipient: item.email,
      company: item.company || 'Enterprise Partner',
      title: item.title || 'Senior Role',
      dispatchedAt: item.dispatchedAt || new Date().toISOString(),
      daysElapsed,
      stage,
      status: item.status || 'SENT',
      followUpStatus
    };
  });

  // 2. Process LinkedIn Connections
  const trackedConnections = connections.map(item => {
    const daysElapsed = calculateAgingDays(item.verifiedAt);
    let stage = 'Pending Executive Acceptance';
    let followUpStatus = 'In Invitation Queue';

    if (daysElapsed >= 7) {
      stage = 'Expired / Unconnected (7+ days)';
      followUpStatus = 'Re-target via InMail / Email';
    } else if (daysElapsed >= 3) {
      stage = 'Awaiting Profile Visit (3-6 days)';
      followUpStatus = 'Pending Acceptance';
    }

    return {
      type: 'LinkedIn Invite',
      recipient: item.name || item.profileUrl,
      company: item.company || 'Target Organization',
      title: item.title || item.headline || 'Executive Leader',
      profileUrl: item.profileUrl || '',
      dispatchedAt: item.verifiedAt || new Date().toISOString(),
      daysElapsed,
      stage,
      status: item.status || 'SENT',
      followUpStatus
    };
  });

  const summary = {
    totalOutreachItems: trackedEmails.length + trackedConnections.length,
    coldEmailsCount: trackedEmails.length,
    linkedInInvitesCount: trackedConnections.length,
    responseFunnel: {
      initialWindow_0_2_days: trackedEmails.filter(e => e.daysElapsed <= 2).length + trackedConnections.filter(c => c.daysElapsed <= 2).length,
      underEvaluation_3_4_days: trackedEmails.filter(e => e.daysElapsed >= 3 && e.daysElapsed <= 4).length + trackedConnections.filter(c => c.daysElapsed >= 3 && c.daysElapsed <= 6).length,
      followUpEligible_5plus_days: trackedEmails.filter(e => e.daysElapsed >= 5).length + trackedConnections.filter(c => c.daysElapsed >= 7).length
    },
    lastUpdated: new Date().toISOString(),
    emailsList: trackedEmails,
    connectionsList: trackedConnections
  };

  fs.writeFileSync(trackerPath, JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

if (require.main === module) {
  const result = generateOutreachTracker();
  console.log('Outreach Tracker Summary Generated:');
  console.log(`Total Outreached Leads: ${result.totalOutreachItems}`);
  console.log(`- Cold Emails: ${result.coldEmailsCount}`);
  console.log(`- LinkedIn Invites: ${result.linkedInInvitesCount}`);
  console.log(`Funnel Breakdown:`, result.responseFunnel);
}

module.exports = { generateOutreachTracker };
