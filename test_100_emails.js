/**
 * Bulk 100 Email Verification Test Suite
 * Evaluates 100 diverse email addresses against the 4-Stage Verification Engine (email_verifier.js).
 */

const { verifyEmailExistence } = require('./email_verifier');

const sampleDomains = [
  'gmail.com', 'pwc.com', 'accenture.com', 'ey.com', 'deloitte.com', 
  'wipro.com', 'infosys.com', 'tcs.com', 'cognizant.com', 'capgemini.com',
  'google.com', 'microsoft.com', 'adobe.com', 'amazon.com', 'ibm.com',
  'oracle.com', 'salesforce.com', 'sap.com', 'cisco.com', 'intel.com'
];

const forbiddenKeywords = [
  'accommodations', 'accessibility', 'disability', 'diversity', 'inclusion',
  'fraud', 'report', 'check', 'compliance', 'abuse', 'security', 'legal', 'admin', 'help', 
  'billing', 'careers', 'career', 'jobs', 'job', 'hr', 'ta', 'recruitment', 'hiring', 
  'team', 'contact', 'info', 'support', 'no-reply', 'noreply', 'feedback', 'enquiry', 
  'inquiry', 'sales', 'service', 'privacy', 'terms', 'post', 'apply', 'press', 'media'
];

const validTestEmails = [
  'sandeepramaswamykashyap@gmail.com',
  'connect.sandeepkashyap@gmail.com',
  'joshi.vyasraj@pwc.com',
  'Snigdha@beanhr.com',
  'aishwarya.j@idexcel.com',
  'vanshika@theglove.co.in',
  'narni.sarath@yash.com',
  'raghur@nousinfo.com'
];

function generate100TestEmails() {
  const emails = [...validTestEmails];

  // Add 38 forbidden disclaimer / departmental email patterns
  for (let i = 0; i < forbiddenKeywords.length && emails.length < 46; i++) {
    const domain = sampleDomains[i % sampleDomains.length];
    emails.push(`${forbiddenKeywords[i]}@${domain}`);
  }

  // Add 25 fake / non-existent user patterns
  for (let i = 1; i <= 25 && emails.length < 71; i++) {
    const domain = sampleDomains[i % sampleDomains.length];
    emails.push(`nonexistent_test_user_${i * 9999}@${domain}`);
  }

  // Add 15 invalid domain / syntax errors
  for (let i = 1; i <= 15 && emails.length < 86; i++) {
    emails.push(`user_${i}@domainthatdoesnotexist_${i * 12345}.com`);
  }

  // Add 14 personal recruiter test patterns
  const sampleNames = ['rahul.sharma', 'priya.singh', 'amit.kumar', 'sneha.patel', 'vikram.rao', 'neha.gupta', 'arun.varmas', 'pooja.nair', 'deepak.joshi', 'anjali.deshmukh', 'karan.mehta', 'divya.reddy', 'sanjay.sen', 'ritesh.chawla'];
  for (let i = 0; i < sampleNames.length && emails.length < 100; i++) {
    const domain = sampleDomains[i % sampleDomains.length];
    emails.push(`${sampleNames[i]}@${domain}`);
  }

  return emails.slice(0, 100);
}

async function runBulk100Test() {
  console.log("==================== STARTING BULK 100 EMAIL VERIFICATION TEST ====================");
  const emailsToTest = generate100TestEmails();
  console.log(`Generated ${emailsToTest.length} test email addresses.\n`);

  let validCount = 0;
  let rejectedCount = 0;
  let blacklistedCount = 0;

  const startTime = Date.now();

  for (let i = 0; i < emailsToTest.length; i++) {
    const email = emailsToTest[i];
    process.stdout.write(`[${i + 1}/100] Testing ${email}... `);
    
    const result = await verifyEmailExistence(email);

    if (result.valid) {
      validCount++;
      console.log(`✅ VERIFIED (Reason: ${result.reason})`);
    } else {
      rejectedCount++;
      if (result.isBlacklisted) blacklistedCount++;
      console.log(`❌ REJECTED (Reason: ${result.reason})`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n==================== BULK 100 VERIFICATION RESULTS ====================");
  console.log(`Total Emails Tested      : ${emailsToTest.length}`);
  console.log(`Verified Mailboxes (250)  : ${validCount}`);
  console.log(`Rejected & Dropped       : ${rejectedCount}`);
  console.log(`Blacklisted Addresses    : ${blacklistedCount}`);
  console.log(`Total Execution Time     : ${durationSec} seconds`);
  console.log("=======================================================================");
}

runBulk100Test().catch(err => console.error("Bulk test error:", err));
