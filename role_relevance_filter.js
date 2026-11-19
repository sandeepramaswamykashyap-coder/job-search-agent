/**
 * role_relevance_filter.js
 * 
 * Strict Domain & Leadership Relevance Filter for Sandeep Ramaswamy Kashyap
 * 
 * Candidate Profile:
 * - 15+ years experience in:
 *   1. ServiceNow (Architect, Solution Architect, Delivery Lead, Practice Lead, ITSM, GRC, HRSD)
 *   2. Business & Digital Transformation / Process Transformation / Process Excellence
 *   3. Technical Program Management (TPM) / Program Management / Delivery Management / PMO
 *   4. Intelligent Automation / AI Workflow / RPA / Agentic AI / Hyperautomation
 *   5. UAT Strategy / Quality Governance / Test Governance / Release Governance
 *   6. Operational Excellence / Operations Management (Banking, Tech, IT, BizOps, Strategy & Ops)
 *   7. Organizational Change Management (OCM) / Transition Management
 *   8. Banking Operations / Investment Banking Operations / Risk Operations
 */

const EXCLUDE_PATTERNS = [
  // Junior / Entry Level
  /\b(intern|internship|new grad|graduate|entry level|junior|associate customer|trainee|fresher|student|apprentice|tier 1)\b/i,

  // Sales / Business Development / Account Management (STRICT EXCLUDE)
  /\b(account executive|account manager|sales|business development|bdr|sdr|growth manager|commercial director|commercial manager|deal desk|partnerships|quota|revenue director|account director|sales director|client executive|merchant success|customer success manager|enterprise sales|field sales|channel sales)\b/i,

  // Marketing, Brand & PR (STRICT EXCLUDE - note word boundary for PR)
  /\b(marketing|brand|content|copywriter|social media|\bpr\b|public relations|communications|events manager|demand gen|seo|creative director|art director|campaign)\b/i,

  // Design & Creative
  /\b(designer|ui designer|ux designer|product designer|graphic designer|visual designer)\b/i,

  // Hands-on Software Engineering / Coding (STRICT EXCLUDE pure developers/engineers)
  /\b(software engineer|software developer|frontend|backend|fullstack|full stack|ios developer|android developer|mobile developer|devops|site reliability|\bsre\b|cloud engineer|firmware|hardware|embedded|compiler|systems engineer|machine learning engineer|ml engineer|data scientist|deep learning|research scientist|security engineer|network engineer|database administrator|\bdba\b)\b/i,

  // Hands-on IC Developer / Engineer titles (e.g. forward deployed engineer, MTS, research engineer)
  /\b(developer|research engineer|forward deployed engineer|member of technical staff)\b/i,

  // HR / Recruiting / People
  /\b(recruiter|talent acquisition|sourcer|recruiting|hrbp|hr business partner|hr generalist|people partner|compensation|benefits|people operations|talent manager)\b/i,

  // Finance, Accounting & Tax
  /\b(financial controller|fp&a|treasury|tax manager|accounting manager|accountant|payroll|auditor|wealth manager|fund manager|equity analyst|investment analyst)\b/i,

  // Legal
  /\b(legal counsel|corporate counsel|attorney|lawyer|paralegal|litigation|patent)\b/i,

  // Facilities, Workplace & Physical operations
  /\b(workplace|occupancy|real estate|facilities|construction|manufacturing|supply chain|warehouse|logistics|store manager|retail|culinary|chef|security guard|driver|fleet)\b/i,

  // Healthcare / Clinical
  /\b(nurse|physician|clinical|pharmacist)\b/i,

  // Non-target Operations functions
  /\b(legal operations|community operations|travel operations|billing operations)\b/i,

  // IC Analyst / Specialist / Coordinator roles (Sandeep is 15+ yr Executive / Manager)
  /\b(analyst|specialist|coordinator)\b/i
];

const RELEVANT_DOMAINS = [
  // 1. ServiceNow
  /\b(servicenow|service now|snow)\b/i,

  // 2. Transformation & Process Excellence
  /\b(transformation|business transformation|digital transformation|process transformation|operations transformation|process excellence)\b/i,

  // 3. Program / Portfolio / Delivery Management / PMO
  /\b(technical program manager|program manager|programme manager|delivery manager|delivery lead|service delivery|portfolio manager|pmo|project director|senior project manager|it project manager|agile delivery|agile coach|scrum master)\b/i,

  // 4. Intelligent Automation / AI Workflow / RPA
  /\b(intelligent automation|automation manager|automation lead|automation director|rpa|hyperautomation|agentic|ai workflow|workflow automation|process automation)\b/i,

  // 5. UAT Strategy & Quality Governance
  /\b(uat|user acceptance|quality governance|qa lead|test manager|testing manager|quality assurance manager)\b/i,

  // 6. Operations Leadership & Operational Excellence
  /\b(operations manager|senior operations manager|director of operations|head of operations|operational excellence|ops excellence|business operations|bizops|strategy & operations|product operations|it operations manager|operations lead|head of delivery)\b/i,

  // 7. Organizational Change Management (OCM) & Transition
  /\b(change management|organizational change|ocm|transition manager|service transition)\b/i,

  // 8. Banking Operations & Risk Governance
  /\b(banking operations|investment banking operations|financial services operations|regulatory operations|governance risk|risk operations|grc)\b/i
];

/**
 * Checks whether a job title is strictly relevant to Sandeep's 15+ yr leadership profile.
 * @param {string} title
 * @returns {boolean}
 */
function isRoleRelevant(title) {
  if (!title || typeof title !== 'string') return false;

  // 1. Strict Exclude Check
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(title)) {
      return false;
    }
  }

  // 2. Strict Domain Relevance Check
  for (const pattern of RELEVANT_DOMAINS) {
    if (pattern.test(title)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  isRoleRelevant,
  EXCLUDE_PATTERNS,
  RELEVANT_DOMAINS
};
