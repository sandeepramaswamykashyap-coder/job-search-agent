const { sendDailyReport } = require('./reporter');
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, 'stats.json');
let stats = {};
if (fs.existsSync(statsPath)) {
  stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
}

console.log('[ReportDispatcher] Sending live executive summary report to connect.sandeepkashyap@gmail.com...');
sendDailyReport(stats).then(info => {
  console.log('[ReportDispatcher] ✅ Live Report Email Dispatched Successfully!', info ? info.messageId : '');
}).catch(err => {
  console.error('[ReportDispatcher] ❌ Failed to send report:', err.message);
});
