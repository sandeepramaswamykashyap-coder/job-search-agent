/**
 * Unit Test Suite for Tiered Persona Outreach & Dynamic 95%-Focused Resume Selection
 */

const { generateCustomPitch, processOutreachQueue } = require('./outreach_mailer');
const { generateBooleanQueries } = require('./linkedin_discovery');

function runPersonaTests() {
  console.log("==================== RUNNING PERSONA OUTREACH & RESUME RESOLUTION TESTS ====================");

  const testLeads = [
    { title: "Senior Program Manager", company: "Standard Chartered", persona: "peer", email: "peer.test@company.com" },
    { title: "Director - Business Transformation", company: "PwC", persona: "hiring_manager", email: "director.test@pwc.com" },
    { title: "Talent Acquisition Lead", company: "ServiceNow", persona: "recruiter", email: "ta.test@servicenow.com" },
    { title: "ServiceNow HRSD Practice Lead", company: "Accenture", email: "hrsd.lead@accenture.com" },
    { title: "Head of UAT & Quality Governance", company: "HSBC", email: "uat.head@hsbc.com" }
  ];

  for (const lead of testLeads) {
    console.log(`\n--- Testing Lead: ${lead.title} at ${lead.company} ---`);
    const pitch = generateCustomPitch(lead);
    console.log(`Assigned Persona : ${pitch.persona.toUpperCase()}`);
    console.log(`Subject          : ${pitch.subject}`);
    console.log(`Preview Body     :\n${pitch.textBody.slice(0, 180)}...\n`);
  }

  console.log("--- Testing Boolean Query Generator ---");
  const queries = generateBooleanQueries("Standard Chartered");
  for (const q of queries) {
    console.log(`[${q.persona.toUpperCase()}] ${q.query}`);
  }

  console.log("\n==========================================================================================");
}

runPersonaTests();
