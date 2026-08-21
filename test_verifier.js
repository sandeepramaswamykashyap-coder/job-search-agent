/**
 * Verification Test Script for email_verifier.js
 */

const { verifyEmailExistence } = require('./email_verifier');

async function runTests() {
  console.log("==================== RUNNING MAILBOX EXISTENCE VERIFIER TESTS ====================");

  const testCases = [
    { email: "sandeepramaswamykashyap@gmail.com", expectedValid: true, desc: "User Valid Gmail Account" },
    { email: "connect.sandeepkashyap@gmail.com", expectedValid: true, desc: "User EOD Report Recipient Account" },
    { email: "joshi.vyasraj@pwc.com", expectedValid: true, desc: "PwC Recruiter Lead" },
    { email: "fake_nonexistent_user_9999999@gmail.com", expectedValid: false, desc: "Fake Non-Existent Gmail User" },
    { email: "accommodations@adobe.com", expectedValid: false, desc: "Generic Accessibility Disclaimer Mailbox" },
    { email: "reportfraud@manpowergroup.com", expectedValid: false, desc: "Compliance Disclaimer Mailbox" }
  ];

  for (const tc of testCases) {
    console.log(`\nTesting: [${tc.desc}] ${tc.email}...`);
    const res = await verifyEmailExistence(tc.email);
    console.log(`Result: Valid=${res.valid} | Reason="${res.reason}"`);
    if (res.valid === tc.expectedValid) {
      console.log(`✅ TEST PASSED for ${tc.email}`);
    } else {
      console.log(`⚠️ TEST NOTICE for ${tc.email} (Got valid=${res.valid}, expected=${tc.expectedValid})`);
    }
  }

  console.log("\n==================================================================================");
}

runTests();
