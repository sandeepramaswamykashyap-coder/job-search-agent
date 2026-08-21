/**
 * Job Search & Application Agent - Overnight Autonomous Outreach Runner
 * Executes lead discovery, SMTP mailbox verification, customized cold email outreach,
 * and tailored LinkedIn connection request dispatch overnight.
 *
 * STRICT RULES ENFORCED:
 * 1. 0 Standard Chartered / SCB contacts emailed or connected.
 * 2. Max 20 LinkedIn connections per day (account safety cap).
 * 3. Throttled SMTP email dispatch with randomized delay.
 */

const fs = require('fs');
const path = require('path');
const { runBooleanDiscovery } = require('./run_boolean_discovery');
const { processOutreachQueue } = require('./outreach_mailer');
const { sendLinkedInConnection } = require('./linkedin_connector');

const leadsFile = path.join(__dirname, 'recruiter_leads.json');
const connectionsFile = path.join(__dirname, 'connection_requests.json');

/**
 * Runs full overnight lead discovery, email outreach, and connection request cycle
 */
async function runOvernightOutreachCycle() {
  console.log(`\n=================== OVERNIGHT AUTONOMOUS OUTREACH CYCLE ===================`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // 1. Run Boolean Lead Discovery across all 33 target roles
  console.log(`\n[OvernightRunner] 🔍 Step 1: Executing Boolean Lead Discovery across 33 roles...`);
  try {
    await runBooleanDiscovery();
  } catch (err) {
    console.error(`[OvernightRunner] Boolean discovery error: ${err.message}`);
  }

  // 2. Process Cold Email Outreach Queue
  console.log(`\n[OvernightRunner] 📧 Step 2: Processing Verified Cold Email Outreach Queue...`);
  try {
    await processOutreachQueue();
  } catch (err) {
    console.error(`[OvernightRunner] Email outreach error: ${err.message}`);
  }

  // 3. LinkedIn Connection Requests — ACTIVE with personalized notes
  console.log(`\n[OvernightRunner] 🤝 Step 3: Dispatching PERSONALIZED LinkedIn connection requests (max 20/day, verified Pending)...`);
  try {
    let leads = [];
    if (fs.existsSync(leadsFile)) {
      try { leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8')); } catch (e) {}
    }

    let sentToday = 0;
    const MAX_CONNECTIONS_PER_DAY = 20;
    const todayStr = new Date().toDateString();

    let existingConnections = [];
    if (fs.existsSync(connectionsFile)) {
      try { existingConnections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8')); } catch (e) {}
    }

    const connectedToday = existingConnections.filter(c => {
      try { return new Date(c.verifiedAt).toDateString() === todayStr; } catch (_) { return false; }
    }).length;

    sentToday = connectedToday;
    console.log(`[OvernightRunner] Already sent ${sentToday} LinkedIn connections today. Cap: ${MAX_CONNECTIONS_PER_DAY}`);

    for (const lead of leads) {
      if (sentToday >= MAX_CONNECTIONS_PER_DAY) {
        console.log(`[OvernightRunner] Daily LinkedIn connection cap (${MAX_CONNECTIONS_PER_DAY}) reached. Stopping.`);
        break;
      }

      // Skip if already connected
      const alreadyConnected = existingConnections.some(c =>
        (lead.linkedinUrl && c.profileUrl === lead.linkedinUrl) ||
        (lead.name && c.name && c.name.toLowerCase() === lead.name.toLowerCase() && c.company && c.company.toLowerCase() === (lead.company || '').toLowerCase())
      );
      if (alreadyConnected) {
        console.log(`[OvernightRunner] Already connected to ${lead.name || lead.email}. Skipping.`);
        continue;
      }

      // Only send if we have either a LinkedIn URL or at least a name + company
      if (!lead.linkedinUrl && !(lead.name && lead.company)) {
        console.log(`[OvernightRunner] Insufficient data for LinkedIn connection (no URL or name+company). Skipping: ${lead.email}`);
        continue;
      }

      const result = await sendLinkedInConnection({
        profileUrl: lead.linkedinUrl || null,
        name: lead.name || lead.contactName || null,
        title: lead.title || null,
        company: lead.company || null,
        persona: lead.persona || 'recruiter'
      });

      if (result.success) {
        sentToday++;
        console.log(`[OvernightRunner] ✅ Personalized LinkedIn connection sent to ${lead.name || lead.email} at ${lead.company}. Note: "${result.note ? result.note.substring(0, 60) : 'N/A'}..."`);
      } else {
        console.warn(`[OvernightRunner] ⚠️ LinkedIn connection failed for ${lead.name || lead.email}: ${result.reason}`);
      }

      // Throttle: wait 30-60 seconds between LinkedIn connections to stay safe
      const delay = 30000 + Math.floor(Math.random() * 30000);
      console.log(`[OvernightRunner] Waiting ${Math.round(delay/1000)}s before next LinkedIn connection...`);
      await new Promise(r => setTimeout(r, delay));
    }

    console.log(`[OvernightRunner] LinkedIn connections dispatched today: ${sentToday}`);
  } catch (err) {
    console.error(`[OvernightRunner] LinkedIn connection error: ${err.message}`);
  }

  // 4. Global Remote Portals Sweep
  console.log(`\n[OvernightRunner] 🌐 Step 4: Executing Global Remote Portals Sweep...`);
  try {
    const { applyToNewRemotePortals } = require('./apply_new_remote_portals');
    await applyToNewRemotePortals();
  } catch (err) {
    console.error(`[OvernightRunner] Remote portals sweep error: ${err.message}`);
  }

  console.log(`=================== OVERNIGHT OUTREACH CYCLE COMPLETE ===================\n`);
}

if (require.main === module) {
  runOvernightOutreachCycle();
}

module.exports = { runOvernightOutreachCycle };
