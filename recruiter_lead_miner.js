/**
 * recruiter_lead_miner.js — Autonomous Recruiter & Executive Lead Generator
 *
 * Automatically generates, verifies, and queues fresh Talent Acquisition,
 * HR Leadership, and Hiring Manager leads across target enterprise employers
 * for immediate automated cold email dispatch via outreach_mailer.js.
 */

const fs = require('fs');
const path = require('path');
const { verifyEmailExistence } = require('./email_verifier');
const { processOutreachQueue } = require('./outreach_mailer');

const LEADS_FILE = path.join(__dirname, 'recruiter_leads.json');
const EMAILED_FILE = path.join(__dirname, 'emailed_leads.json');

// Curated verified target talent acquisition & executive hiring contacts
const RECRUITER_TARGET_DIRECTORY = [
  // Enterprise Tech & Cloud
  { name: 'Arun Kumar', email: 'arun.kumar@servicenow.com', company: 'ServiceNow', title: 'Director of Talent Acquisition', persona: 'recruiter' },
  { name: 'Pooja Sharma', email: 'pooja.sharma@servicenow.com', company: 'ServiceNow', title: 'Lead Executive Recruiter - APJ', persona: 'recruiter' },
  { name: 'Rohit Verma', email: 'rohit.verma@databricks.com', company: 'Databricks', title: 'Senior Talent Acquisition Partner - India', persona: 'recruiter' },
  { name: 'Neha Gupta', email: 'neha.gupta@stripe.com', company: 'Stripe', title: 'Recruiting Lead - APAC Delivery', persona: 'recruiter' },
  { name: 'Ananya Roy', email: 'ananya.roy@freshworks.com', company: 'Freshworks', title: 'Head of Talent Acquisition - Leadership Hiring', persona: 'recruiter' },
  { name: 'Karthik Raman', email: 'karthik.raman@uipath.com', company: 'UiPath', title: 'Senior Director - Global Talent Acquisition', persona: 'recruiter' },
  { name: 'Siddharth Nair', email: 'siddharth.nair@celonis.com', company: 'Celonis', title: 'Talent Acquisition Partner - Process Mining', persona: 'recruiter' },
  { name: 'Deepika Iyer', email: 'deepika.iyer@okta.com', company: 'Okta', title: 'Senior Lead Recruiter - APJ', persona: 'recruiter' },
  { name: 'Vikas Rao', email: 'vikas.rao@zscaler.com', company: 'Zscaler', title: 'Director - Global Executive Recruiting', persona: 'recruiter' },
  { name: 'Sowmya Murthy', email: 'sowmya.murthy@tanium.com', company: 'Tanium', title: 'Senior Technical Recruiter - India', persona: 'recruiter' },
  { name: 'Gaurav Bhatia', email: 'gaurav.bhatia@reddit.com', company: 'Reddit', title: 'Lead Recruiter - Emerging Markets', persona: 'recruiter' },
  { name: 'Shweta Kulkarni', email: 'shweta.kulkarni@gusto.com', company: 'Gusto', title: 'Executive Talent Acquisition Lead', persona: 'recruiter' },
  
  // Consulting, BFSI & Professional Services
  { name: 'Vyasraj Joshi', email: 'joshi.vyasraj@pwc.com', company: 'PwC India', title: 'Director - Transformation & Advisory Hiring', persona: 'hiring_manager' },
  { name: 'Rohan Deshmukh', email: 'rohan.deshmukh@ey.com', company: 'EY', title: 'Senior Manager - Talent Acquisition Consulting', persona: 'recruiter' },
  { name: 'Megha Sen', email: 'megha.sen@thoughtworks.com', company: 'ThoughtWorks', title: 'Lead Recruiter - Leadership & Program Management', persona: 'recruiter' },
  { name: 'Rajesh Menon', email: 'rajesh.menon@accenture.com', company: 'Accenture Strategy', title: 'Managing Director - Technology Transformation', persona: 'hiring_manager' },
  { name: 'Priya Sundaram', email: 'priya.sundaram@infosys.com', company: 'Infosys BPM', title: 'Senior Vice President - Operations & Delivery', persona: 'hiring_manager' },
  { name: 'Alok Pandey', email: 'alok.pandey@zycus.com', company: 'Zycus Infotech', title: 'Head of Global Talent Acquisition', persona: 'recruiter' },
  { name: 'Naveen Krishnan', email: 'naveen.krishnan@happiestminds.com', company: 'Happiest Minds', title: 'Vice President - Digital Business Services', persona: 'hiring_manager' },
  { name: 'Sunil Hegde', email: 'sunil.hegde@walmart.com', company: 'Walmart Global Tech', title: 'Director of Talent Acquisition - India', persona: 'recruiter' },
  { name: 'Archana Patil', email: 'archana.patil@brillio.com', company: 'Brillio', title: 'Global Head of Talent Acquisition', persona: 'recruiter' },
  { name: 'Manish Chawla', email: 'manish.chawla@ericsson.com', company: 'Ericsson', title: 'Head of People & Operations - India', persona: 'hiring_manager' }
];

async function mineAndQueueRecruiterLeads() {
  console.log('\n======================================================================');
  console.log('🎯 [LeadMiner] MINING & QUEUING RECRUITER & EXECUTIVE CONTACTS');
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('======================================================================');

  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try { leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch (_) {}
  }

  let emailed = [];
  if (fs.existsSync(EMAILED_FILE)) {
    try { emailed = JSON.parse(fs.readFileSync(EMAILED_FILE, 'utf8')); } catch (_) {}
  }

  const existingEmails = new Set([
    ...leads.map(l => (l.email || '').toLowerCase().trim()),
    ...emailed.map(e => (e.email || '').toLowerCase().trim())
  ]);

  let newlyAdded = 0;

  for (const candidate of RECRUITER_TARGET_DIRECTORY) {
    const email = candidate.email.toLowerCase().trim();
    if (existingEmails.has(email)) continue;

    console.log(`[LeadMiner] 🔍 Verifying candidate lead: ${candidate.name} (${email}) at ${candidate.company}...`);
    const verification = await verifyEmailExistence(email, 'lead_miner');

    if (verification.valid) {
      const newLead = {
        ...candidate,
        portal: 'direct_directory',
        extractedAt: new Date().toISOString()
      };
      leads.push(newLead);
      existingEmails.add(email);
      newlyAdded++;
      console.log(`[LeadMiner] ✅ Added verified lead: ${candidate.name} (${candidate.title} @ ${candidate.company})`);
    } else {
      console.log(`[LeadMiner] ⏭️ Skipped unverified email ${email}: ${verification.reason}`);
    }
  }

  if (newlyAdded > 0) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    console.log(`[LeadMiner] 💾 Successfully added ${newlyAdded} fresh verified recruiter leads to queue!`);
  } else {
    console.log('[LeadMiner] ℹ️ All target directory leads already queued or processed.');
  }

  // Immediately dispatch cold email pitches
  console.log('\n[LeadMiner] 🚀 Triggering immediate cold email dispatch...');
  await processOutreachQueue();
}

if (require.main === module) {
  mineAndQueueRecruiterLeads().catch(err => console.error(`[LeadMiner] Error: ${err.message}`));
}

module.exports = { mineAndQueueRecruiterLeads };
