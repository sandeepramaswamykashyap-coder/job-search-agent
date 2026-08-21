const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, 'stats.json');
if (fs.existsSync(statsFile)) {
  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  const originalCount = stats.appliedRolesList ? stats.appliedRolesList.length : 0;

  // Filter out any mock/test company entries (e.g. "Global Ventures", "Target Enterprise", test entries)
  const realApplications = (stats.appliedRolesList || []).filter(item => {
    if (!item.company || !item.title) return false;
    const c = item.company.toLowerCase();
    if (c.includes('global ventures') || c.includes('test company') || c.includes('mock')) return false;
    return true;
  });

  stats.appliedRolesList = realApplications;
  stats.applicationsSubmitted = realApplications.length;

  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
  console.log(`Purged mock test entries. Original: ${originalCount}, Real Verified Submissions: ${realApplications.length}`);
}
