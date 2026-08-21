const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const stats = JSON.parse(fs.readFileSync('./stats.json', 'utf8'));

console.log("=== Job Search Agent Today's Progress ===");
console.log(`Date: ${stats.date}`);
console.log(`Total Jobs Scanned: ${stats.jobsScanned}`);
console.log(`Total Applications Submitted: ${stats.applicationsSubmitted}`);
console.log("\nPortal-wise Applications:");

const portalCaps = {};
const portalApplies = {};

for (const portal in config.platforms) {
  if (config.platforms[portal].enabled) {
    const dailyCap = config.platforms[portal].max_applications_per_day || 20;
    const appliedToday = stats.appliedRolesList.filter(r => r.portal === portal).length;
    console.log(`- ${portal.padEnd(12)}: ${appliedToday}/${dailyCap} applications ${appliedToday >= dailyCap ? '✅ CAPPED' : '⏳ RUNNING'}`);
  } else {
    console.log(`- ${portal.padEnd(12)}: DISABLED`);
  }
}
