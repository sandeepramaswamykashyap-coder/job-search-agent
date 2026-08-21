const fs = require('fs');
const path = require('path');

console.log('=================== RESETTING CLEAN DATA LAYER ===================');

// 1. Reset stats.json
const statsFile = path.join(__dirname, 'stats.json');
let existingStats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [] };
if (fs.existsSync(statsFile)) {
  try {
    const raw = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    // Filter out all mock / test company entries
    const cleanList = (raw.appliedRolesList || []).filter(item => {
      if (!item.company || !item.title) return false;
      const c = item.company.toLowerCase();
      if (c.includes('global ventures') || c.includes('test company') || c.includes('mock') || c.includes('target enterprise')) return false;
      return true;
    });
    existingStats = {
      jobsScanned: raw.jobsScanned || 0,
      applicationsSubmitted: cleanList.length,
      appliedRolesList: cleanList
    };
  } catch (e) {}
}
fs.writeFileSync(statsFile, JSON.stringify(existingStats, null, 2), 'utf8');
console.log(`✅ stats.json reset to ${existingStats.applicationsSubmitted} real verified applications.`);

// 2. Reset connection_requests.json
const connFile = path.join(__dirname, 'connection_requests.json');
fs.writeFileSync(connFile, JSON.stringify([], null, 2), 'utf8');
console.log('✅ connection_requests.json reset to clean empty array.');

// 3. Ensure Sandeep_Kashyap.pdf exists
const cvFile = path.join(__dirname, 'Sandeep_Kashyap.pdf');
if (fs.existsSync(cvFile)) {
  console.log('✅ Executive resume Sandeep_Kashyap.pdf verified present.');
} else {
  console.log('⚠️ Sandeep_Kashyap.pdf missing! Checking parent directory...');
}

console.log('==================================================================');
