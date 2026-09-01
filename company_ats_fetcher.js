/**
 * company_ats_fetcher.js — Direct ATS Job Ingestion Engine
 * 
 * Directly queries public JSON APIs of Greenhouse, Lever, Ashby, and SmartRecruiters
 * across 350+ Tier-1 Enterprise Tech, BFSI, Fintech, Consulting, and Automation Leaders.
 */

const https = require('https');
const { isExcluded } = require('./ats_detector');

const TARGET_ROLE_KEYWORDS = [
  /program\s*manager/i,
  /technical\s*program\s*manager/i,
  /tpm\b/i,
  /transformation/i,
  /business\s*transformation/i,
  /digital\s*transformation/i,
  /service\s*delivery/i,
  /operations\s*manager/i,
  /change\s*management/i,
  /automation/i,
  /intelligent\s*automation/i,
  /rpa\b/i,
  /agentic/i,
  /ai\s*workflow/i,
  /operations\s*lead/i,
  /delivery\s*lead/i,
  /delivery\s*manager/i,
  /project\s*manager/i,
  /director/i,
  /head\s*of/i,
  /vice\s*president/i,
  /vp\b/i,
  /product\s*operations/i,
  /strategy\s*&?\s*operations/i,
  /bizops/i,
  /chief\s*of\s*staff/i,
  /governance/i,
  /risk\s*operations/i
];

function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 10000 }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return resolve(null);
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (_) {
      resolve(null);
    }
  });
}

function matchesKeywords(title) {
  if (!title) return false;
  return TARGET_ROLE_KEYWORDS.some(pattern => pattern.test(title));
}

// ── 1. GREENHOUSE BOARDS (Enterprise SaaS, BFSI, Global Scale-ups) ───────────
const GREENHOUSE_COMPANIES = [
  // Tech / SaaS / Cloud
  'stripe', 'coinbase', 'atlassian', 'dropbox',
  'figma', 'hubspot', 'zendesk', 'benchling', 'brex',
  'mixpanel', 'hashicorp', 'instacart', 'affirm', 'gusto', 'doordash',
  'klaviyo', 'outreach', 'gong', 'productboard', 'pendo', 'amplitude',
  'segment', 'miro', 'notion', 'coda', 'asana', 'monday',
  'intercom', 'freshworks', 'chargebee', 'razorpay', 'clevertap',
  'databricks', 'confluent', 'box', 'canva', 'toast', 'palantir',
  'sentry', 'postman', 'automattic', 'duolingo', 'datadog',
  'reddit', 'pinterest', 'lyft', 'snap', 'spotify', 'pagerduty',
  'splunk', 'zoominfo', 'braze', 'samsara', 'couchbase', 'neo4j',
  'workato', 'coupa', 'qualtrics', 'guidewire', 'nutanix', 'servicetitan',
  'harness', 'starburst', 'fivetran', 'thoughtspot', 'drata', 'vanta',
  'wiz', 'cribl', 'honeycomb', 'sumologic', 'newrelic', 'dynatrace',
  // BFSI / Fintech & Wealth
  'plaid', 'chime', 'mercury', 'ramp', 'rippling', 'robinhood',
  'revolut', 'monzo', 'klarna', 'sofi', 'remitly', 'wise', 'payoneer',
  'circle', 'ripple', 'traderepublic', 'starlingbank', 'oaknorth',
  'checkout', 'worldline', 'affirm', 'gusto', 'bill', 'marqeta',
  // Automation & Enterprise Workflow
  'uipath', 'automationanywhere', 'celonis', 'dataiku', 'alteryx',
  'boomi', 'mulesoft', 'informatica', 'appdynamics',
  // Enterprise Consulting & Advisory
  'slalom', 'kearney', 'alixpartners', 'westmonroe',
  'zsassociates', 'fractalanalytics', 'sutherland', 'genpact',
  // Security / Cloud
  'grafana', 'cloudflare', 'fastly', 'mongodb', 'okta', 'snowflake',
  'crowdstrike', 'zscaler', 'tanium', 'sentinelone', 'snyk'
];

// ── 2. LEVER BOARDS (High-Growth Tech & AI Platforms) ────────────────────────
const LEVER_COMPANIES = [
  'mongodb', 'cloudflare', 'notion', 'twilio', 'scaleai', 'retool',
  'lattice', 'loom', 'plaid', 'dbtlabs', 'airtable', 'linear',
  'vercel', 'fly', 'railway', 'supabase', 'neon', 'planetscale',
  'carta', 'rippling', 'deel', 'remote', 'oyster',
  'sourcegraph', 'temporal', 'prefect', 'dagster', 'affirm', 'gusto',
  'fullstory', 'ironclad', 'webflow', 'algolia', 'checkr', 'front',
  'anthropic', 'cohere', 'mistral', 'groq', 'anyscale', 'baseten',
  'synthesia', 'runwayml', 'cursor', 'writer', 'togetherai', 'jasper'
];

// ── 3. ASHBY BOARDS (Modern AI, Fintech & Engineering Scale-ups) ─────────────
const ASHBY_COMPANIES = [
  'openai', 'ramp', 'posthog', 'linear', 'sentry', 'elevenlabs', 'resend',
  'perplexity', 'cognition', 'mistral', 'anyscale', 'deepgram', 'character',
  'replicate', 'modal', 'together', 'vapi', 'langchain', 'pinecone',
  'incident', 'cal', 'dust', 'qdrant', 'weaviate', 'chroma', 'unstructured',
  'retool', 'supabase', 'cursor', 'cartesia', 'tavily', 'fal', 'livekit'
];

// ── 4. SMARTRECRUITERS BOARDS (Global Consulting & IT Giants) ────────────────
const SMARTRECRUITERS_COMPANIES = [
  'Freshworks', 'Visa', 'Collibra', 'PublicisSapient', 'Bosch', 'Siemens', 'SchneiderElectric',
  'Capgemini', 'Wipro', 'Cognizant', 'Infosys', 'LTIMindtree', 'Genpact', 'TechMahindra',
  'HCLTech', 'NTTData', 'DXCTechnology', 'Avanade', 'Slalom', 'EPAM', 'Globant', 'Thoughtworks'
];

async function fetchGreenhouseJobs(slug) {
  try {
    const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    if (!data || !Array.isArray(data.jobs)) return [];
    
    return data.jobs
      .filter(j => matchesKeywords(j.title))
      .map(j => ({
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        title: j.title.trim(),
        applyUrl: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`,
        atsType: 'greenhouse',
        location: j.location ? j.location.name : 'Remote'
      }));
  } catch (_) {
    return [];
  }
}

async function fetchLeverJobs(slug) {
  try {
    const data = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!data || !Array.isArray(data)) return [];

    return data
      .filter(j => matchesKeywords(j.text))
      .map(j => ({
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        title: j.text.trim(),
        applyUrl: j.applyUrl || (j.hostedUrl ? `${j.hostedUrl}/apply` : null),
        atsType: 'lever',
        location: j.categories ? j.categories.location : 'Remote'
      }))
      .filter(j => j.applyUrl);
  } catch (_) {
    return [];
  }
}

async function fetchAshbyJobs(slug) {
  try {
    const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    if (!data || !Array.isArray(data.jobs)) return [];

    return data.jobs
      .filter(j => matchesKeywords(j.title))
      .map(j => ({
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        title: j.title.trim(),
        applyUrl: j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        atsType: 'ashby',
        location: j.location ? j.location : 'Remote'
      }))
      .filter(j => j.applyUrl);
  } catch (_) {
    return [];
  }
}

async function fetchSmartRecruitersJobs(slug) {
  try {
    const data = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`);
    if (!data || !Array.isArray(data.content)) return [];

    return data.content
      .filter(j => matchesKeywords(j.name))
      .map(j => ({
        company: slug,
        title: j.name.trim(),
        applyUrl: `https://careers.smartrecruiters.com/${slug}/${j.id}`,
        atsType: 'smartrecruiters',
        location: j.location ? `${j.location.city || ''}, ${j.location.country || ''}` : 'Remote'
      }));
  } catch (_) {
    return [];
  }
}

/**
 * Fetches all live, real-time matching jobs directly from Greenhouse, Lever, Ashby, and SmartRecruiters
 */
async function fetchAllLiveATSJobs() {
  const fs = require('fs');
  const path = require('path');
  const dynamicFile = path.join(__dirname, 'dynamic_companies.json');
  let dynamicDb = { greenhouse: [], lever: [], ashby: [], smartrecruiters: [] };
  if (fs.existsSync(dynamicFile)) {
    try { dynamicDb = JSON.parse(fs.readFileSync(dynamicFile, 'utf8')); } catch (_) {}
  }

  const allGh = Array.from(new Set([...GREENHOUSE_COMPANIES, ...(dynamicDb.greenhouse || [])]));
  const allLv = Array.from(new Set([...LEVER_COMPANIES, ...(dynamicDb.lever || [])]));
  const allAsh = Array.from(new Set([...ASHBY_COMPANIES, ...(dynamicDb.ashby || [])]));
  const allSr = Array.from(new Set([...SMARTRECRUITERS_COMPANIES, ...(dynamicDb.smartrecruiters || [])]));

  console.log(`[ATS Ingestion] 🌐 Fetching live jobs across Greenhouse (${allGh.length}), Lever (${allLv.length}), Ashby (${allAsh.length}) & SmartRecruiters (${allSr.length}) APIs...`);
  
  const greenhousePromises = allGh.map(fetchGreenhouseJobs);
  const leverPromises = allLv.map(fetchLeverJobs);
  const ashbyPromises = allAsh.map(fetchAshbyJobs);
  const srPromises = allSr.map(fetchSmartRecruitersJobs);

  const results = await Promise.all([
    ...greenhousePromises,
    ...leverPromises,
    ...ashbyPromises,
    ...srPromises
  ]);

  const allJobs = results.flat().filter(j => !isExcluded(j.company));
  console.log(`[ATS Ingestion] ✅ Found ${allJobs.length} live matching jobs across all direct company ATS portals.`);
  return allJobs;
}

module.exports = { fetchAllLiveATSJobs };
