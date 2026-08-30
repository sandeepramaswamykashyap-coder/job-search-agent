/**
 * ats_detector.js — ATS Type Detection Engine
 * 
 * Detects which Applicant Tracking System (ATS) is serving a given career page URL.
 * Uses URL pattern matching + DOM fingerprinting for high accuracy.
 * 
 * Supported ATS types:
 *   workday, greenhouse, lever, taleo, icims, successfactors,
 *   smartrecruiters, jobvite, ashby, generic (fallback)
 */

const ATS_SIGNATURES = [
  {
    type: 'workday',
    urlPatterns: [
      /myworkdayjobs\.com/i,
      /wd\d+\.myworkday\.com/i,
      /workday\.com\/.*\/jobs/i
    ],
    htmlSignatures: ['data-automation-id', 'wd-text', 'workday-footer'],
    loginRequired: true,
    multiStep: true
  },
  {
    type: 'greenhouse',
    urlPatterns: [
      /boards\.greenhouse\.io/i,
      /greenhouse\.io\/job_app/i
    ],
    htmlSignatures: ['#greenhouse-job-board', 'data-greenhouse', 'greenhouse'],
    loginRequired: false,
    multiStep: false
  },
  {
    type: 'lever',
    urlPatterns: [
      /jobs\.lever\.co/i,
      /lever\.co\/.*\/apply/i
    ],
    htmlSignatures: ['lever-team', 'lever-apply', 'lever-button'],
    loginRequired: false,
    multiStep: false
  },
  {
    type: 'taleo',
    urlPatterns: [
      /taleo\.net/i,
      /tbe\.taleo\.net/i,
      /\.taleo\./i
    ],
    htmlSignatures: ['taleo', 'req_listTitle', 'ftlTaleo'],
    loginRequired: true,
    multiStep: true
  },
  {
    type: 'icims',
    urlPatterns: [
      /careers\.icims\.com/i,
      /icims\.com\/jobs/i,
      /\.icims\.com/i
    ],
    htmlSignatures: ['icims', 'iCIMS_MainArea', 'icims-js-portal'],
    loginRequired: true,
    multiStep: true
  },
  {
    type: 'successfactors',
    urlPatterns: [
      /successfactors\.com/i,
      /jobs\.sap\.com/i,
      /sap\.com\/career/i,
      /\.successfactors\.eu/i
    ],
    htmlSignatures: ['sf-ui-component', 'sapuxd', 'successfactors'],
    loginRequired: true,
    multiStep: true
  },
  {
    type: 'smartrecruiters',
    urlPatterns: [
      /careers\.smartrecruiters\.com/i,
      /smartrecruiters\.com\/.*\/jobs/i
    ],
    htmlSignatures: ['sr-apply', 'smart-token', 'smartrecruiters'],
    loginRequired: false,
    multiStep: false
  },
  {
    type: 'jobvite',
    urlPatterns: [
      /jobs\.jobvite\.com/i,
      /jobvite\.com\/jobs/i
    ],
    htmlSignatures: ['jobvite', 'jv-apply', 'jvHeader'],
    loginRequired: true,
    multiStep: true
  },
  {
    type: 'ashby',
    urlPatterns: [
      /jobs\.ashbyhq\.com/i,
      /ashbyhq\.com/i
    ],
    htmlSignatures: ['ashby', '_ashby_'],
    loginRequired: false,
    multiStep: false
  },
  {
    type: 'bamboohr',
    urlPatterns: [
      /\.bamboohr\.com\/jobs/i
    ],
    htmlSignatures: ['bamboohr', 'BambooHR'],
    loginRequired: false,
    multiStep: false
  }
];

/**
 * Detects ATS type from a URL string alone (fast, no browser needed).
 * @param {string} url 
 * @returns {{ type: string, loginRequired: boolean, multiStep: boolean }}
 */
function detectAtsFromUrl(url) {
  if (!url) return { type: 'generic', loginRequired: false, multiStep: false };
  
  for (const sig of ATS_SIGNATURES) {
    for (const pattern of sig.urlPatterns) {
      if (pattern.test(url)) {
        return {
          type: sig.type,
          loginRequired: sig.loginRequired,
          multiStep: sig.multiStep
        };
      }
    }
  }
  return { type: 'generic', loginRequired: false, multiStep: false };
}

/**
 * Detects ATS type from live page HTML via Playwright page.
 * Combines URL detection with DOM fingerprinting for high accuracy.
 * @param {Page} page — Playwright page object
 * @returns {Promise<{ type: string, loginRequired: boolean, multiStep: boolean }>}
 */
async function detectAtsFromPage(page) {
  const url = page.url();
  const urlDetection = detectAtsFromUrl(url);

  // If URL was conclusive, trust it
  if (urlDetection.type !== 'generic') return urlDetection;

  // Fall back to DOM fingerprinting
  try {
    const html = await page.content().catch(() => '');
    const bodyText = html.toLowerCase();

    for (const sig of ATS_SIGNATURES) {
      for (const marker of sig.htmlSignatures) {
        if (bodyText.includes(marker.toLowerCase())) {
          return {
            type: sig.type,
            loginRequired: sig.loginRequired,
            multiStep: sig.multiStep
          };
        }
      }
    }
  } catch (_) {}

  return { type: 'generic', loginRequired: false, multiStep: false };
}

/**
 * Returns a prioritised ATS URL for a company from a set of known direct portals.
 * Used by career_url_finder.js.
 */
const COMPANY_ATS_MAP = {
  'hsbc':              'https://myhrjobs.hsbc.com',
  'accenture':         'https://www.accenture.com/in-en/careers/jobsearch',
  'pwc':               'https://jobs.pwc.com/search/?q=&startrow=0&location=India',
  'deloitte':          'https://apply.deloitte.com/careers/SearchJobs/?926=%5B1071%5D&926_format=1415&listFilterMode=1',
  'infosys':           'https://career.infosys.com/joblist',
  'wipro':             'https://careers.wipro.com/careers-home/jobs',
  'cognizant':         'https://careers.cognizant.com/global/en/search-results',
  'capgemini':         'https://www.capgemini.com/in-en/careers/job-search/',
  'ibm':               'https://www.ibm.com/in-en/employment/',
  'tcs':               'https://www.tcs.com/careers',
  'hcl':               'https://www.hcltech.com/careers',
  'anz':               'https://www.anz.com.au/about-us/careers/',
  'salesforce':        'https://careers.salesforce.com/en/jobs/?country=India',
  'freshworks':        'https://careers.freshworks.com/jobs',
  'genpact':           'https://jobs.genpact.com/search-jobs',
  'mindtree':          'https://jobs.ltimindtree.com/',
  'mphasis':           'https://careers.mphasis.com/home',
  'hexaware':          'https://jobs.hexaware.com/search-jobs',
  'sonata':            'https://careers.sonata-software.com/',
  'wns':               'https://careers.wns.com/Careers',
  'exl':               'https://jobs.exlservice.com',
  'servicenow':        'https://careers.servicenow.com/jobs',
  'workday':           'https://www.workday.com/en-us/company/careers.html',
  'jpmorgan':          'https://careers.jpmorgan.com/global/en/jobs',
  'barclays':          'https://search.jobs.barclays/',
  'standard chartered': 'EXCLUDED',
  'scb':               'EXCLUDED',
  'deutsche bank':     'https://careers.db.com/explore-the-bank/careers-in-india/',
  'goldman sachs':     'https://www.goldmansachs.com/careers/search/',
  'morgan stanley':    'https://www.morganstanley.com/people/india/',
  'mastercard':        'https://careers.mastercard.com/us/en/search-results?keywords=',
  'visa':              'https://usa.visa.com/about-visa/careers/jobdetails.html',
  'amazon':            'https://www.amazon.jobs/en/search?base_query=program+manager&loc_query=India',
  'google':            'https://careers.google.com/jobs/results/?location=India',
  'microsoft':         'https://jobs.careers.microsoft.com/global/en/search?q=program+manager&l=en_us&loc=India',
  'oracle':            'https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions?keyword=program+manager&location=India',
  'sap':               'https://jobs.sap.com/search/?q=program+manager&locationsearch=India',
  'cisco':             'https://jobs.cisco.com/jobs/SearchJobs/program%20manager?21178=%5B169482%5D&21178_format=6020',
};

/**
 * Checks if a company is excluded (Standard Chartered Bank).
 */
function isExcluded(companyName) {
  const lower = (companyName || '').toLowerCase();
  return lower.includes('standard chartered') || lower.includes(' scb') || lower === 'scb';
}

module.exports = { detectAtsFromUrl, detectAtsFromPage, COMPANY_ATS_MAP, isExcluded };
