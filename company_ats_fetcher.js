/**
 * company_ats_fetcher.js — Real-Time Direct ATS Job Ingestion
 * 
 * Fetches active, live job openings directly from company ATS endpoints:
 *   - Greenhouse Board APIs (e.g. Stripe, GitLab, Coinbase, Atlassian, Elastic, Dropbox, Figma, Hubspot)
 *   - Lever APIs (e.g. MongoDB, Cloudflare, Notion, Twilio, Scale AI)
 *   - SmartRecruiters APIs (e.g. Freshworks, Bosch, Siemens, Visa)
 * 
 * Automatically filters by target keywords:
 *   Program Manager, Transformation, ServiceNow, Operations, UAT, Change Management
 */

const https = require('https');
const { isExcluded } = require('./ats_detector');

const TARGET_ROLE_KEYWORDS = [
  /program.?manager/i,
  /transformation/i,
  /servicenow/i,
  /operations.?manager/i,
  /delivery.?manager/i,
  /product.?owner/i,
  /product.?manager/i,
  /change.?management/i,
  /uat/i,
  /data.?governance/i,
  /intelligent.?automation/i,
  /agile.?delivery/i,
  /operational.?excellence/i
];

function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.setTimeout(3500, () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
    } catch (_) {
      resolve(null);
    }
  });
}

function matchesKeywords(title) {
  if (!title) return false;
  return TARGET_ROLE_KEYWORDS.some(pattern => pattern.test(title));
}

// Greenhouse boards to continuously monitor (verified working)
const GREENHOUSE_COMPANIES = [
  // Tech / SaaS / Enterprise
  'gitlab', 'stripe', 'coinbase', 'atlassian', 'elastic', 'dropbox',
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
  // BFSI / Fintech
  'plaid', 'chime', 'mercury', 'ramp', 'rippling', 'robinhood',
  // Enterprise / Cloud / Infrastructure / Security
  'grafana', 'cloudflare', 'fastly', 'mongodb', 'okta', 'snowflake',
  'crowdstrike', 'zscaler', 'tanium', 'sentinelone', 'netskope', 'snyk'
];

// Lever accounts to continuously monitor (verified working)
const LEVER_COMPANIES = [
  'mongodb', 'cloudflare', 'notion', 'twilio', 'scaleai', 'retool',
  'lattice', 'loom', 'plaid', 'dbtlabs', 'airtable', 'linear',
  'vercel', 'fly', 'railway', 'supabase', 'neon', 'planetscale',
  'carta', 'rippling', 'deel', 'remote', 'oyster',
  'sourcegraph', 'temporal', 'prefect', 'dagster', 'affirm', 'gusto',
  'fullstory', 'ironclad', 'webflow', 'algolia', 'checkr', 'front',
  'anthropic', 'cohere', 'mistral', 'groq', 'anyscale', 'baseten'
];

// SmartRecruiters companies
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
 * Fetches all live, real-time matching jobs directly from Greenhouse, Lever, and SmartRecruiters
 */
async function fetchAllLiveATSJobs() {
  console.log('[ATS Ingestion] 🌐 Fetching live jobs directly from Greenhouse, Lever & SmartRecruiters APIs...');
  
  const greenhousePromises = GREENHOUSE_COMPANIES.map(fetchGreenhouseJobs);
  const leverPromises = LEVER_COMPANIES.map(fetchLeverJobs);
  const srPromises = SMARTRECRUITERS_COMPANIES.map(fetchSmartRecruitersJobs);

  const results = await Promise.all([
    ...greenhousePromises,
    ...leverPromises,
    ...srPromises
  ]);

  const allJobs = results.flat().filter(j => !isExcluded(j.company));
  console.log(`[ATS Ingestion] ✅ Found ${allJobs.length} live matching jobs on direct company ATS portals.`);
  return allJobs;
}

module.exports = { fetchAllLiveATSJobs };
