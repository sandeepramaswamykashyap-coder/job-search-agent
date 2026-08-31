/**
 * dynamic_portal_expander.js — Autonomous Daily ATS Portal Discovery Engine
 * 
 * Continuously discovers and verifies new company career boards across:
 * - Greenhouse (boards-api.greenhouse.io)
 * - Ashby (api.ashbyhq.com)
 * - Lever (api.lever.co)
 * - SmartRecruiters (api.smartrecruiters.com)
 * 
 * Discovered boards are validated against live HTTP endpoints and saved to
 * dynamic_companies.json, automatically expanding the application universe daily.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DYNAMIC_COMPANIES_FILE = path.join(__dirname, 'dynamic_companies.json');

// Candidate seed list of high-growth global scaleups, AI labs, banks, and enterprise SaaS
const SEED_DISCOVERY_CANDIDATES = [
  // AI / LLMs / Infrastructure
  'langchain', 'pinecone', 'togetherai', 'groq', 'anyscale', 'baseten', 'runwayml',
  'deepgram', 'cartesia', 'tavily', 'fal', 'livekit', 'elevenlabs', 'mistral',
  'cursor', 'writer', 'cohere', 'modal', 'replicate', 'vapi', 'unstructured',
  'dust', 'dify', 'qdrant', 'weaviate', 'chroma', 'mem0', 'voyageai', 'lamini',
  'perplexity', 'cognition', 'figure', 'character', 'pika', 'heygen', 'suno',
  // Fintech & Digital Banks
  'ramp', 'mercury', 'brex', 'plaid', 'chime', 'revolut', 'monzo', 'klarna',
  'sofi', 'wise', 'remitly', 'payoneer', 'circle', 'ripple', 'starlingbank',
  'oaknorth', 'checkout', 'worldline', 'affirm', 'gusto', 'bill', 'marqeta',
  'traderepublic', 'n26', 'almanac', 'tessian', 'alloy', 'unit', 'synapse',
  // Enterprise Workflow & Automation
  'uipath', 'automationanywhere', 'celonis', 'dataiku', 'alteryx', 'boomi',
  'mulesoft', 'informatica', 'appdynamics', 'workato', 'zapier', 'make',
  'bardeen', 'activepieces', 'kestra', 'prefect', 'dagster', 'temporal',
  // Global Consulting & Professional Services
  'slalom', 'kearney', 'alixpartners', 'westmonroe', 'pointb', 'huronconsulting',
  'zsassociates', 'fractalanalytics', 'sutherland', 'genpact', 'wipro',
  'capgemini', 'publicissapient', 'cognizant', 'infosys', 'ltimindtree',
  // Developer Tools & Cloud Infrastructure
  'vercel', 'supabase', 'neon', 'planetscale', 'turso', 'convex', 'clerk',
  'auth0', 'stytch', 'svix', 'resend', 'postmark', 'knock', 'novu',
  'sentry', 'datadog', 'dynatrace', 'newrelic', 'sumologic', 'grafana',
  'chronosphere', 'coralogix', 'betterstack', 'incident', 'rootly', 'pagerduty'
];

function checkEndpoint(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const count = Array.isArray(json) ? json.length :
                            (json.jobs ? json.jobs.length :
                            (json.content ? json.content.length : 0));
              resolve({ valid: count > 0, count });
            } catch (_) {
              resolve({ valid: false, count: 0 });
            }
          });
        } else {
          resolve({ valid: false, count: 0 });
        }
      });
      req.on('error', () => resolve({ valid: false, count: 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ valid: false, count: 0 }); });
    } catch (_) {
      resolve({ valid: false, count: 0 });
    }
  });
}

async function runDailyPortalDiscovery() {
  console.log('\n======================================================================');
  console.log('🔍 [PortalExpander] STARTING DAILY AUTONOMOUS PORTAL DISCOVERY SWEEP');
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('======================================================================');

  let dynamicDb = { greenhouse: [], lever: [], ashby: [], smartrecruiters: [] };
  if (fs.existsSync(DYNAMIC_COMPANIES_FILE)) {
    try {
      dynamicDb = JSON.parse(fs.readFileSync(DYNAMIC_COMPANIES_FILE, 'utf8'));
    } catch (_) {}
  }

  let newlyAdded = 0;

  for (const slug of SEED_DISCOVERY_CANDIDATES) {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check Ashby
    if (!dynamicDb.ashby.includes(cleanSlug)) {
      const res = await checkEndpoint(`https://api.ashbyhq.com/posting-api/job-board/${cleanSlug}`);
      if (res.valid) {
        dynamicDb.ashby.push(cleanSlug);
        newlyAdded++;
        console.log(`[PortalExpander] ⚡ Discovered active Ashby board: "${cleanSlug}" (${res.count} live jobs)`);
      }
    }

    // Check Greenhouse
    if (!dynamicDb.greenhouse.includes(cleanSlug)) {
      const res = await checkEndpoint(`https://boards-api.greenhouse.io/v1/boards/${cleanSlug}/jobs`);
      if (res.valid) {
        dynamicDb.greenhouse.push(cleanSlug);
        newlyAdded++;
        console.log(`[PortalExpander] 🏢 Discovered active Greenhouse board: "${cleanSlug}" (${res.count} live jobs)`);
      }
    }

    // Check Lever
    if (!dynamicDb.lever.includes(cleanSlug)) {
      const res = await checkEndpoint(`https://api.lever.co/v0/postings/${cleanSlug}?mode=json`);
      if (res.valid) {
        dynamicDb.lever.push(cleanSlug);
        newlyAdded++;
        console.log(`[PortalExpander] 🎯 Discovered active Lever board: "${cleanSlug}" (${res.count} live jobs)`);
      }
    }
  }

  fs.writeFileSync(DYNAMIC_COMPANIES_FILE, JSON.stringify(dynamicDb, null, 2));
  console.log(`[PortalExpander] ✅ Daily Portal Sweep complete. Newly added: ${newlyAdded} portals.`);
  console.log(`[PortalExpander] 📊 Total dynamic portals in database: ${dynamicDb.greenhouse.length + dynamicDb.lever.length + dynamicDb.ashby.length + dynamicDb.smartrecruiters.length}`);

  return dynamicDb;
}

module.exports = { runDailyPortalDiscovery };

if (require.main === module) {
  runDailyPortalDiscovery();
}
