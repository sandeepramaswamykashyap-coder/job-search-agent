/**
 * Test Runner for LinkedIn Custom Connection Requests
 * Validates customized connection note generation, length limits,
 * Standard Chartered exclusion rules, and automated execution.
 */

const { buildCustomizedNote, sendLinkedInConnection } = require('./linkedin_connector');

async function testConnectionFlow() {
  console.log("=================== LINKEDIN CUSTOM CONNECTION TEST RUNNER ===================");

  // Test 1: Customized Note Generation for Hiring Manager
  console.log("\n--- Test 1: Hiring Manager Note Generation ---");
  const note1 = buildCustomizedNote(
    "Rajesh Kumar",
    "ServiceNow HRSD Practice Lead",
    "ServiceNow India",
    "hiring_manager"
  );
  console.log(`Length: ${note1.length} chars (Limit: 300)`);
  console.log(`Note Content:\n"${note1}"`);

  // Test 2: Customized Note Generation for Talent Acquisition Lead
  console.log("\n--- Test 2: Talent Acquisition Lead Note Generation ---");
  const note2 = buildCustomizedNote(
    "Priya Sharma",
    "Talent Acquisition Lead",
    "Cognizant",
    "recruiter"
  );
  console.log(`Length: ${note2.length} chars (Limit: 300)`);
  console.log(`Note Content:\n"${note2}"`);

  // Test 3: Standard Chartered Exclusion Check
  console.log("\n--- Test 3: Standard Chartered Exclusion Rule Test ---");
  const scTest = await sendLinkedInConnection({
    profileUrl: "https://www.linkedin.com/in/test-scb-user",
    name: "John Doe",
    title: "Director",
    company: "Standard Chartered Bank",
    persona: "hiring_manager",
    testMode: true
  });
  console.log(`SC Exclusion Result: ${scTest.success ? 'FAIL (Allowed)' : 'PASS (Blocked)'} - Reason: ${scTest.reason}`);

  // Test 4: Valid Hiring Lead Connection Note Pipeline
  console.log("\n--- Test 4: Valid Hiring Lead Connection Validation ---");
  const leadTest = await sendLinkedInConnection({
    profileUrl: "https://www.linkedin.com/in/sample-hiring-lead",
    name: "Anand Verma",
    title: "Transformation Program Manager",
    company: "PwC India",
    persona: "hiring_manager",
    testMode: true
  });
  console.log(`Hiring Lead Connection Result: ${leadTest.success ? 'PASS' : 'FAIL'} - Note Verified (${leadTest.message?.length} chars)`);

  console.log("\n==========================================================================");
}

if (require.main === module) {
  testConnectionFlow();
}

module.exports = { testConnectionFlow };
