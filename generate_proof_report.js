const fs = require('fs');
const path = require('path');
const { sendDailyReport } = require('./reporter');

const statsFile = path.join(__dirname, 'stats.json');
const emailedFile = path.join(__dirname, 'emailed_leads.json');
const connFile = path.join(__dirname, 'connection_requests.json');
const trackerFile = path.join(__dirname, 'outreach_tracker.json');

let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [], failures: [] };
if (fs.existsSync(statsFile)) {
  try { stats = JSON.parse(fs.readFileSync(statsFile, 'utf8')); } catch (e) {}
}

let emailed = [];
if (fs.existsSync(emailedFile)) {
  try { emailed = JSON.parse(fs.readFileSync(emailedFile, 'utf8')); } catch (e) {}
}

let conns = [];
if (fs.existsSync(connFile)) {
  try { conns = JSON.parse(fs.readFileSync(connFile, 'utf8')); } catch (e) {}
}

console.log('--- COMPILING PROOF OF WORK REPORT DATA ---');
console.log('Total Jobs Scanned:', stats.jobsScanned);
console.log('Total Today Applications:', (stats.appliedRolesList || []).length);
console.log('Total Recruiter Cold Emails:', emailed.length);
console.log('Total Verified LinkedIn Invites:', conns.filter(c => c.status === 'SENT').length);

console.log('\nDispatching Fresh Executive Proof Report Email to connect.sandeepkashyap@gmail.com...');
sendDailyReport(stats).then(() => {
  console.log('✅ Proof of Work Report Email Successfully Dispatched to connect.sandeepkashyap@gmail.com!');
}).catch(err => {
  console.error('❌ Email dispatch failed:', err.message);
});
