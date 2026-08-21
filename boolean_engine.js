/**
 * Job Search & Application Agent - Enterprise Boolean Search Engine
 * Generates advanced, multi-operator Boolean search strings for all 33 target roles
 * and executes targeted X-Ray searches across LinkedIn, Google, and job portals.
 *
 * STRICT RULES ENFORCED:
 * 1. ONLY target contacts explicitly showing HIRING intent ("hiring", "we are hiring", "recruiting").
 * 2. STRICTLY EXCLUDE anybody from Standard Chartered Bank / SCB (former employer).
 */

const fs = require('fs');
const path = require('path');

const profilePath = path.join(__dirname, 'profile.json');

/**
 * Builds high-impact Boolean search queries covering all target role clusters
 */
function buildBooleanQueries() {
  let profile = {};
  if (fs.existsSync(profilePath)) {
    try { profile = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch (e) {}
  }

  const locations = '("Bengaluru" OR "Bangalore" OR "India" OR "Remote")';
  const hiringIntent = '("hiring" OR "we are hiring" OR "looking for" OR "hiring for" OR "join our team" OR "open role")';
  const exclusion = '-"Standard Chartered" -"SCB" -"Intern" -"Student" -"Trainee"';

  const queries = [
    // 1. Transformation & Change Leadership (Hiring Managers)
    {
      cluster: 'Transformation & Change Leadership',
      persona: 'hiring_manager',
      searchQuery: `site:linkedin.com/in/ ("Transformation Program Manager" OR "Business Transformation Lead" OR "VP Business Transformation" OR "Director Transformation") AND ${hiringIntent} AND ${locations} ${exclusion}`
    },
    // 2. ServiceNow & Enterprise Platform Leaders (Hiring Managers)
    {
      cluster: 'ServiceNow & Enterprise Platforms',
      persona: 'hiring_manager',
      searchQuery: `site:linkedin.com/in/ ("ServiceNow Program Manager" OR "ServiceNow Product Owner" OR "ServiceNow Practice Lead" OR "ServiceNow Platform Manager") AND ${hiringIntent} AND ${locations} ${exclusion}`
    },
    // 3. UAT Governance & Quality Assurance (Hiring Managers)
    {
      cluster: 'UAT & Quality Governance',
      persona: 'hiring_manager',
      searchQuery: `site:linkedin.com/in/ ("UAT Program Manager" OR "Head of UAT" OR "UAT Lead Manager" OR "Operational Excellence Lead") AND ${hiringIntent} AND ${locations} ${exclusion}`
    },
    // 4. IB Operations & Regulatory Change (Hiring Managers)
    {
      cluster: 'Investment Banking & Operations',
      persona: 'hiring_manager',
      searchQuery: `site:linkedin.com/in/ ("Investment Banking Operations" OR "Operations Transformation" OR "Regulatory Change Program Manager" OR "Risk Operations") AND ${hiringIntent} AND ${locations} ${exclusion}`
    },
    // 5. Data Governance & Data Leadership (Hiring Managers)
    {
      cluster: 'Data Governance & Data Strategy',
      persona: 'hiring_manager',
      searchQuery: `site:linkedin.com/in/ ("Data Governance Manager" OR "Data Governance Lead" OR "Lead Data Steward" OR "Data Product Owner") AND ${hiringIntent} AND ${locations} ${exclusion}`
    },
    // 6. Talent Acquisition & Executive Recruiters
    {
      cluster: 'Talent Acquisition & Recruiters',
      persona: 'recruiter',
      searchQuery: `site:linkedin.com/in/ ("Talent Acquisition Lead" OR "Recruitment Manager" OR "TA Manager" OR "Executive Recruiter") AND ("Banking" OR "Financial Services" OR "ServiceNow" OR "Transformation") AND ${hiringIntent} AND ${locations} ${exclusion}`
    },
    // 7. Direct Job Postings X-Ray (Naukri / LinkedIn / Foundit)
    {
      cluster: 'Direct Job Postings X-Ray',
      persona: 'job_posting',
      searchQuery: `(site:naukri.com/job-listings OR site:linkedin.com/jobs/view OR site:foundit.in/seeker/job-details) ("Transformation Program Manager" OR "ServiceNow Program Manager" OR "Data Governance Lead" OR "UAT Manager") AND ${locations} ${exclusion}`
    }
  ];

  return queries;
}

module.exports = {
  buildBooleanQueries
};
