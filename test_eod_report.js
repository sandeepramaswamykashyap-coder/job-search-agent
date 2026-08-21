const { sendDailyReport } = require('./reporter');

const testStats = {
  jobsScanned: 1161,
  applicationsSubmitted: 130,
  appliedRolesList: [
    { company: "PricewaterhouseCoopers", title: "FDD - Manager", portal: "naukri", time: new Date().toISOString() },
    { company: "Accenture", title: "Business Transformation Senior Manager", portal: "naukri", time: new Date().toISOString() },
    { company: "Insight Direct India", title: "Sr Project manager - Service Transition", portal: "naukri", time: new Date().toISOString() }
  ],
  failures: []
};

console.log("Dispatching test EOD report to connect.sandeepkashyap@gmail.com...");
sendDailyReport(testStats).then(() => {
  console.log("Test EOD report sent successfully!");
}).catch(err => {
  console.error("Failed to send test EOD report:", err);
});
