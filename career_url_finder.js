/**
 * career_url_finder.js — Company Career Portal URL Discovery
 * 
 * Given a company name discovered via aggregator portals (DailyRemote, RemoteOK etc.),
 * identifies the direct ATS URL using a prioritized lookup strategy:
 * 
 *   1. Exact match in COMPANY_ATS_MAP (ats_detector.js)
 *   2. Known ATS URL construction heuristics (Greenhouse, Lever, Workday patterns)
 *   3. Fuzzy company name match in map
 *   4. Web search fallback (if enabled)
 */

const { COMPANY_ATS_MAP, detectAtsFromUrl, isExcluded } = require('./ats_detector');

// Common ATS URL patterns by company slug
function buildGreenhouseUrl(slug) { return `https://boards.greenhouse.io/${slug}`; }
function buildLeverUrl(slug) { return `https://jobs.lever.co/${slug}`; }
function buildWorkdayUrl(slug) { return `https://${slug}.myworkdayjobs.com/careers`; }
function buildSmartRecruitersUrl(slug) { return `https://careers.smartrecruiters.com/${slug}`; }

// Company name → known ATS slug mapping (most reliable)
const KNOWN_ATS_SLUGS = {
  'stripe':        { ats: 'greenhouse', url: buildGreenhouseUrl('stripe') },
  'coinbase':      { ats: 'greenhouse', url: buildGreenhouseUrl('coinbase') },
  'airbnb':        { ats: 'greenhouse', url: buildGreenhouseUrl('airbnb') },
  'benchling':     { ats: 'greenhouse', url: buildGreenhouseUrl('Benchling') },
  'atlassian':     { ats: 'greenhouse', url: buildGreenhouseUrl('atlassian') },
  'hubspot':       { ats: 'greenhouse', url: buildGreenhouseUrl('hubspot') },
  'zendesk':       { ats: 'greenhouse', url: buildGreenhouseUrl('zendesk') },
  'dropbox':       { ats: 'greenhouse', url: buildGreenhouseUrl('dropbox') },
  'intercom':      { ats: 'greenhouse', url: buildGreenhouseUrl('intercom') },
  'figma':         { ats: 'greenhouse', url: buildGreenhouseUrl('figma') },
  'gitlab':        { ats: 'greenhouse', url: buildGreenhouseUrl('gitlab') },
  'hashicorp':     { ats: 'greenhouse', url: buildGreenhouseUrl('hashicorp') },
  'elastic':       { ats: 'greenhouse', url: buildGreenhouseUrl('elastic') },
  'brex':          { ats: 'greenhouse', url: buildGreenhouseUrl('brex') },
  'remote':        { ats: 'greenhouse', url: buildGreenhouseUrl('remotecom') },
  'mixpanel':      { ats: 'greenhouse', url: buildGreenhouseUrl('mixpanel') },
  'netlify':       { ats: 'greenhouse', url: buildGreenhouseUrl('netlify') },

  // Lever
  'mongodb':       { ats: 'lever', url: buildLeverUrl('mongodb') },
  'cloudflare':    { ats: 'lever', url: buildLeverUrl('cloudflare') },
  'notion':        { ats: 'lever', url: buildLeverUrl('notion') },
  'scale ai':      { ats: 'lever', url: buildLeverUrl('scaleai') },
  'retool':        { ats: 'lever', url: buildLeverUrl('retool') },
  'lattice':       { ats: 'lever', url: buildLeverUrl('lattice') },
  'twilio':        { ats: 'lever', url: buildLeverUrl('twilio') },
  'loom':          { ats: 'lever', url: buildLeverUrl('loom') },

  // Workday
  'accenture':     { ats: 'workday', url: 'https://accenture.wd3.myworkday.com/accenture/d/inst/15121002/15121002?_FOCUS_STICKER=0' },
  'ibm':           { ats: 'workday', url: 'https://ibmgbs.wd3.myworkday.com/ibmgbs/d/inst/15121002/15121002' },
  'amazon':        { ats: 'workday', url: buildWorkdayUrl('amazon') },
  'microsoft':     { ats: 'workday', url: buildWorkdayUrl('microsoft') },
  'jpmorgan':      { ats: 'workday', url: 'https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/requisitions' },
  'barclays':      { ats: 'workday', url: buildWorkdayUrl('barclays') },
  'mastercard':    { ats: 'workday', url: buildWorkdayUrl('mastercard') },

  // SmartRecruiters
  'bosch':         { ats: 'smartrecruiters', url: buildSmartRecruitersUrl('BoschGroup') },
  'siemens':       { ats: 'smartrecruiters', url: buildSmartRecruitersUrl('SiemensCorporate') },
};

/**
 * Resolves a company name to its career portal URL and ATS type.
 * 
 * @param {string} companyName — raw company name from job listing
 * @returns {{ url: string, atsType: string }|null}
 */
function resolveCareerUrl(companyName) {
  if (!companyName || isExcluded(companyName)) return null;

  const lower = companyName.toLowerCase().trim();

  // 1. Exact match in KNOWN_ATS_SLUGS
  if (KNOWN_ATS_SLUGS[lower]) {
    return { url: KNOWN_ATS_SLUGS[lower].url, atsType: KNOWN_ATS_SLUGS[lower].ats, companyName };
  }

  // 2. Fuzzy match — check if any key is contained in the company name
  for (const [key, val] of Object.entries(KNOWN_ATS_SLUGS)) {
    if (lower.includes(key) || key.includes(lower.split(' ')[0])) {
      return { url: val.url, atsType: val.ats, companyName };
    }
  }

  // 3. Check COMPANY_ATS_MAP from ats_detector.js
  for (const [key, url] of Object.entries(COMPANY_ATS_MAP)) {
    if (url === 'EXCLUDED') continue;
    if (lower.includes(key) || key.includes(lower.split(' ')[0])) {
      const atsInfo = detectAtsFromUrl(url);
      return { url, atsType: atsInfo.type, companyName };
    }
  }

  // 4. Construct a likely Greenhouse URL as a best-effort attempt
  const slug = lower
    .replace(/\s+(inc|ltd|limited|pvt|private|llc|corp|global|india|technologies|technology|solutions|services|group|consulting)\.?/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  if (slug.length >= 3) {
    const guessedUrl = buildGreenhouseUrl(slug);
    return { url: guessedUrl, atsType: 'greenhouse', companyName, isGuessed: true };
  }

  return null;
}

/**
 * Enriches a list of job objects with their direct career URL.
 * @param {Array} jobs — Array of { title, company, ... }
 * @returns {Array} — Same array with careerUrl and atsType added
 */
function enrichJobsWithCareerUrls(jobs) {
  return jobs
    .map(job => {
      if (job.careerUrl || job.applyUrl) return job; // already has direct URL
      const resolved = resolveCareerUrl(job.company);
      if (resolved) {
        return {
          ...job,
          careerUrl: resolved.url,
          atsType: resolved.atsType,
          careerUrlSource: resolved.isGuessed ? 'guessed_greenhouse' : 'known_map'
        };
      }
      return job;
    })
    .filter(j => j.careerUrl || j.applyUrl); // only keep jobs with a resolved URL
}

module.exports = { resolveCareerUrl, enrichJobsWithCareerUrls, KNOWN_ATS_SLUGS };
