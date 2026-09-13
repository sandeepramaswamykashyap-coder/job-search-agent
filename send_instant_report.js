/**
 * send_instant_report.js — Instant Consolidated Executive Report Mailer
 * 
 * Compiles and immediately dispatches the consolidated executive status report
 * with accurate, un-hardcoded metrics, live charts/tables, and attaches
 * consolidated_applications_master.csv and Sandeep_Kashyap.pdf.
 */

const { sendSessionReport, buildSessionHtmlReport } = require('./reporter');

async function sendInstantEmailReport() {
  console.log('--- COMPILING AND DISPATCHING INSTANT CONSOLIDATED REPORT ---');
  await sendSessionReport();
  console.log('--- INSTANT CONSOLIDATED REPORT DELIVERED ---');
}

if (require.main === module) {
  sendInstantEmailReport();
}

module.exports = { sendInstantEmailReport, buildSessionHtmlReport };
