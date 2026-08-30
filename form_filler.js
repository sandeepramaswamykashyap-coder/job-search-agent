/**
 * form_filler.js — Universal Semantic Form Filler v3 (COMPREHENSIVE)
 *
 * Fills ANY career application form field type:
 *   - text / email / tel / url / number / date inputs
 *   - <select> native dropdowns
 *   - React-Select / Chosen / Select2 custom dropdowns
 *   - <textarea> (cover letter, essay, open-ended)
 *   - radio buttons (Yes/No, gender, work auth, etc.)
 *   - checkboxes (terms, consent, EEOC)
 *   - file upload (CV/Resume, cover letter)
 *   - Workday, Taleo, iCIMS, Greenhouse, Lever, Ashby, SmartRecruiters, BambooHR, Jobvite
 *   - Multi-step forms (navigates Next buttons)
 *   - Div/ARIA custom widgets
 *
 * Profile: Sandeep Ramaswamy Kashyap
 *   14 years at Standard Chartered Bank | Bengaluru, India
 *   ServiceNow HRSD, Program Management, UAT, Transformation, Change Management
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE PROFILE — Complete, rich data for every possible field
// ─────────────────────────────────────────────────────────────────────────────
const CANDIDATE = {
  // Basic
  firstName:         'Sandeep Ramaswamy',
  lastName:          'Kashyap',
  fullName:          'Sandeep Ramaswamy Kashyap',
  preferredName:     'Sandeep',
  email:             'sandeepramaswamykashyap@gmail.com',
  phone:             '+916366325217',
  phoneFormatted:    '+91 63663 25217',
  phoneUS:           '6366325217',

  // Location
  city:              'Bengaluru',
  state:             'Karnataka',
  country:           'India',
  countryFull:       'India',
  countryCode:       'IN',
  zipCode:           '560001',
  address:           '3rd Floor, MG Road, Bengaluru, Karnataka 560001, India',
  addressLine1:      'MG Road',
  addressLine2:      'Bengaluru, Karnataka',
  timezone:          'Asia/Kolkata',

  // Online presence
  linkedin:          'https://www.linkedin.com/in/sandeepramaswamykashyap/',
  linkedinHandle:    'sandeepramaswamykashyap',
  github:            'https://github.com/sandeepramaswamykashyap-coder',
  portfolio:         'https://github.com/sandeepramaswamykashyap-coder',
  website:           'https://github.com/sandeepramaswamykashyap-coder',
  twitter:           '',

  // Current employment
  currentCompany:    'Standard Chartered Bank',
  currentTitle:      'Transformation Program Manager — ServiceNow HRSD & Enterprise Delivery',
  currentDept:       'Human Resources Technology & Operations',
  employmentType:    'Full-time',
  startDate:         '2010-06',
  currentSalary:     '1800000',
  currentSalaryNum:  1800000,
  currentSalaryCTC:  '18,00,000',
  currentSalaryLPA:  '18',
  currentSalaryK:    '1800',

  // Job expectations
  expectedSalary:    '2600000',
  expectedSalaryNum: 2600000,
  expectedSalaryCTC: '26,00,000',
  expectedSalaryLPA: '26',
  expectedSalaryK:   '2600',
  noticePeriod:      '30',
  noticePeriodText:  '30 days',
  noticePeriodWeeks: '4',
  availability:      'Available in 30 days',
  joinDate:          new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],

  // Experience & education
  experienceYears:   '14',
  experienceYearsNum: 14,
  experienceBand:    '10+ years',
  highestDegree:     'Bachelor of Engineering',
  degreeShort:       'BE',
  major:             'Electronics and Communication Engineering',
  university:        'Visvesvaraya Technological University',
  graduationYear:    '2009',
  graduationMonth:   '06',
  gpa:               '3.5',
  school:            'Visvesvaraya Technological University',
  schoolLocation:    'Belgaum, Karnataka, India',

  // Work auth
  requiresVisa:      'No',
  sponsorship:       'No',
  sponsorshipNeeded: 'No',
  workAuthorized:    'Yes',
  citizenship:       'Indian',
  nationality:       'Indian',
  workAuth:          'Indian Citizen — No Sponsorship Required',
  legallyAuthorized: 'Yes',
  visaStatus:        'Citizen',
  rightToWork:       'Yes',

  // Demographics (EEO — Decline where possible, No for disability/veteran)
  gender:            'Male',
  genderIdentity:    'Man',
  pronouns:          'He/Him',
  ethnicity:         'Asian',
  ethnicityAlt:      'Prefer not to say',
  race:              'Asian',
  disability:        'No',
  disabilityFull:    'No, I do not have a disability',
  veteran:           'No',
  veteranStatus:     'I am not a protected veteran',
  hispanicLatino:    'No',

  // Skills (comma-separated for skills fields)
  skillsPrimary:     'ServiceNow HRSD, Program Management, Business Transformation, UAT Governance, Change Management, Data Governance, Agile Delivery, Intelligent Automation',
  skillsAll:         'ServiceNow HRSD, ITSM, HR Service Delivery, Program Management, Portfolio Management, Business Transformation, UAT Governance, UAT Delivery, Quality Governance, Organizational Change Management, Change Management, Data Governance, Data Stewardship, Data Quality, Agile Delivery, Scrum, JIRA, Confluence, Intelligent Automation, RPA, Process Excellence, Lean Six Sigma, Banking & Financial Services, Investment Banking Operations, Regulatory Change, Risk Operations',
  yearsServiceNow:   '7',
  yearsBanking:      '14',

  // About / Cover letter
  headline:          'Transformation Program Manager | ServiceNow HRSD, UAT Governance & Enterprise Delivery (14 Yrs SCB)',
  summary:           'Senior transformation and program delivery leader with 14 years at Standard Chartered Bank, specializing in ServiceNow HRSD implementation, UAT governance, organizational change management, and enterprise-wide digital transformation. Proven track record of delivering complex multi-country programs, driving process excellence, and building high-performing cross-functional teams across BFSI and technology domains.',
  coverLetterShort:  'I am a results-driven transformation program leader with 14+ years at Standard Chartered Bank, specializing in ServiceNow HRSD, UAT governance, and enterprise change management. I bring a proven track record of delivering complex multi-country programs and would be delighted to contribute my expertise to this role.',
  whyApply:          `I am deeply aligned with this role's focus on transformation and delivery excellence. My 14-year tenure at Standard Chartered Bank has given me hands-on experience with ServiceNow HRSD implementation, UAT governance, organizational change management, and cross-functional program leadership — skills I am eager to bring to a forward-thinking organization.`,
  howHeard:          'LinkedIn',
  referralSource:    'LinkedIn',
  coverLetterFull:   `Dear Hiring Manager,

I am writing to express my strong interest in this opportunity. With 14 years of progressive experience at Standard Chartered Bank, I have led enterprise-wide transformation programs spanning ServiceNow HRSD implementation, UAT governance, organizational change management, and intelligent automation.

I have successfully delivered multi-million dollar programs across 15+ countries, managed cross-functional teams of 50+ members, and driven measurable improvements in operational efficiency, compliance, and employee experience. My expertise in ServiceNow HRSD has resulted in platform adoption rates exceeding 90% and sustained benefits realization.

I am energized by the opportunity to bring this experience to your organization and contribute to your transformation journey.

Warm regards,
Sandeep Ramaswamy Kashyap`,

  // Security / background
  backgroundCheck:   'Yes',
  drugTest:          'Yes',
  criminalRecord:    'No',

  // Misc
  password:          'Sandeep@2026!',
  dobYear:           '1987',
  dobMonth:          '03',
  dobDay:            '15',
  age:               '37',
  ssn:               '',   // leave blank — never fill SSN
  middleName:        '',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE FIELD MAP — patterns → candidate values
// Every possible field label, name, id, placeholder pattern across all ATS
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_MAP = [
  // ── NAME ──────────────────────────────────────────────────────────────────
  { patterns: [/first[\s._-]?name/i, /given[\s._-]?name/i, /fname/i, /firstname/i, /forename/i, /^name\.first/i], value: () => CANDIDATE.firstName },
  { patterns: [/last[\s._-]?name/i, /family[\s._-]?name/i, /surname/i, /lname/i, /lastname/i, /^name\.last/i], value: () => CANDIDATE.lastName },
  { patterns: [/full[\s._-]?name/i, /your[\s._-]?name/i, /^name$/i, /candidate[\s._-]?name/i, /applicant[\s._-]?name/i, /complete[\s._-]?name/i], value: () => CANDIDATE.fullName },
  { patterns: [/preferred[\s._-]?name/i, /go[\s._-]?by/i, /nickname/i, /display[\s._-]?name/i], value: () => CANDIDATE.preferredName },
  { patterns: [/middle[\s._-]?name/i, /middle[\s._-]?initial/i], value: () => CANDIDATE.middleName },

  // ── CONTACT ───────────────────────────────────────────────────────────────
  { patterns: [/email/i, /e[\s._-]?mail/i, /electronic[\s._-]?mail/i], value: () => CANDIDATE.email },
  { patterns: [/phone/i, /mobile/i, /telephone/i, /cell/i, /contact[\s._-]?no/i, /contact[\s._-]?number/i, /ph[\s._-]?no/i, /ph\.no/i, /number/i], value: () => CANDIDATE.phoneUS },

  // ── WORK AUTH / SPONSORSHIP (HIGH PRIORITY — MUST PREVENT FALSE COUNTRY MATCHES) ──
  { patterns: [/what[\s._-]?countr/i, /which[\s._-]?countr/i, /countries[\s._-]?(do[\s._-]?you|where)/i, /country[\s._-]?of[\s._-]?(work|eligib)/i], value: () => CANDIDATE.country },
  { patterns: [/visa[\s._-]?sponsor/i, /require.*sponsor/i, /need.*sponsor/i, /sponsorship/i, /work[\s._-]?permit/i], value: () => CANDIDATE.requiresVisa, fieldType: 'radio_no' },
  { patterns: [/work[\s._-]?authoriz/i, /authorized[\s._-]?to[\s._-]?work/i, /legally[\s._-]?authorized/i, /eligible[\s._-]?to[\s._-]?work/i, /right[\s._-]?to[\s._-]?work/i, /work[\s._-]?eligib/i], value: () => CANDIDATE.workAuthorized, fieldType: 'radio_yes' },
  { patterns: [/nationality/i, /national[\s._-]?of/i, /passport[\s._-]?country/i], value: () => CANDIDATE.nationality },
  { patterns: [/citizenship/i, /citizen[\s._-]?of/i], value: () => CANDIDATE.citizenship },
  { patterns: [/visa[\s._-]?type/i, /visa[\s._-]?status/i, /visa[\s._-]?category/i, /immigration[\s._-]?status/i], value: () => CANDIDATE.visaStatus },

  // ── LOCATION ──────────────────────────────────────────────────────────────
  { patterns: [/\bcity\b/i, /city[\s._-]?name/i, /town/i, /municipality/i, /current[\s._-]?city/i], value: () => CANDIDATE.city },
  { patterns: [/^state$/i, /province/i, /region/i, /state[\s._-]?province/i, /county/i], value: () => CANDIDATE.state },
  { patterns: [/^country$/i, /^country[\s._-]?name$/i, /country[\s._-]?of[\s._-]?(residence|birth|origin)/i, /citizenship[\s._-]?country/i, /^residing/i], value: () => CANDIDATE.country },
  { patterns: [/zip[\s._-]?code/i, /postal/i, /pincode/i, /pin[\s._-]?code/i, /postcode/i], value: () => CANDIDATE.zipCode },
  { patterns: [/^address$/i, /street[\s._-]?address/i, /home[\s._-]?address/i, /mailing[\s._-]?address/i, /current[\s._-]?address/i], value: () => CANDIDATE.address },
  { patterns: [/address[\s._-]?(line[\s._-]?)?1/i], value: () => CANDIDATE.addressLine1 },
  { patterns: [/address[\s._-]?(line[\s._-]?)?2/i], value: () => CANDIDATE.addressLine2 },
  { patterns: [/^location$/i, /current[\s._-]?location/i, /where[\s._-]?(are[\s._-]?you|do[\s._-]?you[\s._-]?live)/i], value: () => CANDIDATE.city + ', ' + CANDIDATE.country },
  { patterns: [/timezone/i, /time[\s._-]?zone/i], value: () => CANDIDATE.timezone },

  // ── ONLINE PRESENCE ───────────────────────────────────────────────────────
  { patterns: [/linkedin/i, /linked[\s._-]?in/i], value: () => CANDIDATE.linkedin },
  { patterns: [/github/i, /git[\s._-]?hub/i], value: () => CANDIDATE.github },
  { patterns: [/portfolio/i, /personal[\s._-]?(url|site|website)/i, /website/i, /blog/i, /^url$/i], value: () => CANDIDATE.website },
  { patterns: [/twitter/i, /x\.com/i], value: () => CANDIDATE.twitter },

  // ── CURRENT EMPLOYMENT ────────────────────────────────────────────────────
  { patterns: [/current[\s._-]?(company|employer|organization|organisation|workplace)/i, /present[\s._-]?(company|employer)/i, /employer[\s._-]?name/i, /company[\s._-]?name/i, /^employer$/i], value: () => CANDIDATE.currentCompany },
  { patterns: [/current[\s._-]?(job[\s._-]?)?title/i, /present[\s._-]?title/i, /job[\s._-]?title/i, /position[\s._-]?title/i, /role[\s._-]?title/i, /designation/i, /\btitle\b/i], value: () => CANDIDATE.currentTitle },
  { patterns: [/department/i, /division/i, /function/i, /\bteam\b/i], value: () => CANDIDATE.currentDept },

  // ── EXPERIENCE ────────────────────────────────────────────────────────────
  { patterns: [/years[\s._-]?of[\s._-]?exp/i, /experience[\s._-]?years/i, /total[\s._-]?exp/i, /how[\s._-]?many[\s._-]?years/i, /yrs[\s._-]?exp/i, /work[\s._-]?experience[\s._-]?(in[\s._-]?years)?/i, /experience[\s._-]?level/i, /number[\s._-]?of[\s._-]?years/i, /exp[\s._-]?in[\s._-]?years/i], value: () => CANDIDATE.experienceYears },
  { patterns: [/servicenow[\s._-]?exp/i, /years[\s._-]?servicenow/i, /servicenow[\s._-]?years/i], value: () => CANDIDATE.yearsServiceNow },
  { patterns: [/banking[\s._-]?exp/i, /financial[\s._-]?exp/i, /bfsi[\s._-]?exp/i], value: () => CANDIDATE.yearsBanking },

  // ── SALARY ────────────────────────────────────────────────────────────────
  { patterns: [/current[\s._-]?(ctc|salary|compensation|pay|package|remuneration)/i, /present[\s._-]?(salary|ctc)/i, /existing[\s._-]?salary/i, /last[\s._-]?salary/i, /current[\s._-]?annual/i], value: () => CANDIDATE.currentSalaryCTC },
  { patterns: [/expected[\s._-]?(ctc|salary|compensation|pay|package)/i, /desired[\s._-]?(salary|compensation)/i, /salary[\s._-]?expectation/i, /target[\s._-]?salary/i, /asking[\s._-]?salary/i, /required[\s._-]?salary/i], value: () => CANDIDATE.expectedSalaryCTC },
  { patterns: [/lpa/i, /annual[\s._-]?salary/i], value: () => CANDIDATE.currentSalaryLPA },

  // ── NOTICE PERIOD / AVAILABILITY ──────────────────────────────────────────
  { patterns: [/notice[\s._-]?period/i, /notice/i, /joining[\s._-]?time/i, /when[\s._-]?can[\s._-]?you[\s._-]?join/i, /available[\s._-]?to[\s._-]?start/i, /start[\s._-]?date/i, /how[\s._-]?soon/i, /earliest[\s._-]?(available|start)/i, /date[\s._-]?of[\s._-]?joining/i], value: () => CANDIDATE.noticePeriodText },
  { patterns: [/availability/i, /available[\s._-]?from/i], value: () => CANDIDATE.availability },

  // ── DEMOGRAPHICS / EEO ────────────────────────────────────────────────────
  { patterns: [/disability/i, /disabled/i, /differently[\s._-]?abled/i, /medical[\s._-]?condition/i, /chronic[\s._-]?condition/i], value: () => CANDIDATE.disability, fieldType: 'radio_no' },
  { patterns: [/veteran/i, /military/i, /armed[\s._-]?forces/i, /service[\s._-]?member/i, /combat/i], value: () => CANDIDATE.veteran, fieldType: 'radio_no' },
  { patterns: [/\bgender\b/i, /gender[\s._-]?identity/i, /\bsex\b/i], value: () => CANDIDATE.gender, fieldType: 'select' },
  { patterns: [/ethnicity/i, /\brace\b/i, /ethnic[\s._-]?group/i, /racial/i], value: () => CANDIDATE.ethnicity, fieldType: 'select_prefer_not' },
  { patterns: [/hispanic/i, /latino/i], value: () => CANDIDATE.hispanicLatino, fieldType: 'radio_no' },
  { patterns: [/pronouns/i, /preferred[\s._-]?pronoun/i], value: () => CANDIDATE.pronouns },

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  { patterns: [/highest[\s._-]?(qualification|degree|education)/i, /\bdegree\b/i, /qualification/i], value: () => CANDIDATE.highestDegree },
  { patterns: [/field[\s._-]?of[\s._-]?study/i, /\bmajor\b/i, /specialization/i, /\bdiscipline\b/i, /\bcourse\b/i], value: () => CANDIDATE.major },
  { patterns: [/\bschool\b/i, /university/i, /college/i, /institution/i, /school[\s._-]?name/i, /alma[\s._-]?mater/i], value: () => CANDIDATE.university },
  { patterns: [/start[\s._-]?date[\s._-]?year/i, /start[\s._-]?year/i, /from[\s._-]?year/i], value: () => '2004' },
  { patterns: [/end[\s._-]?date[\s._-]?year/i, /end[\s._-]?year/i, /to[\s._-]?year/i, /graduation[\s._-]?year/i, /year[\s._-]?of[\s._-]?graduation/i, /pass[\s._-]?out[\s._-]?year/i, /degree[\s._-]?year/i], value: () => CANDIDATE.graduationYear },
  { patterns: [/start[\s._-]?date[\s._-]?month/i, /start[\s._-]?month/i, /from[\s._-]?month/i], value: () => '06' },
  { patterns: [/end[\s._-]?date[\s._-]?month/i, /end[\s._-]?month/i, /to[\s._-]?month/i], value: () => '05' },
  { patterns: [/gpa/i, /cgpa/i, /grade/i, /percentage/i], value: () => CANDIDATE.gpa },

  // ── WORK AUTH / VISA ──────────────────────────────────────────────────────
  { patterns: [/visa[\s._-]?sponsor/i, /require.*sponsor/i, /need.*sponsor/i, /sponsorship/i, /work[\s._-]?permit/i], value: () => CANDIDATE.requiresVisa, fieldType: 'radio_no' },
  { patterns: [/work[\s._-]?authoriz/i, /authorized[\s._-]?to[\s._-]?work/i, /legally[\s._-]?authorized/i, /eligible[\s._-]?to[\s._-]?work/i, /right[\s._-]?to[\s._-]?work/i, /work[\s._-]?eligib/i], value: () => CANDIDATE.workAuthorized, fieldType: 'radio_yes' },
  { patterns: [/nationality/i, /national[\s._-]?of/i, /passport[\s._-]?country/i], value: () => CANDIDATE.nationality },
  { patterns: [/citizenship/i, /citizen[\s._-]?of/i], value: () => CANDIDATE.citizenship },
  { patterns: [/visa[\s._-]?type/i, /visa[\s._-]?status/i, /visa[\s._-]?category/i, /immigration[\s._-]?status/i], value: () => CANDIDATE.visaStatus },
  { patterns: [/employment[\s._-]?agreement/i, /post[\s._-]?employment[\s._-]?restriction/i, /non[\s._-]?compete/i, /restrictive[\s._-]?covenant/i], value: () => CANDIDATE.currentCompany },

  // ── COVER LETTER / ESSAYS ─────────────────────────────────────────────────
  { patterns: [/cover[\s._-]?letter/i, /covering[\s._-]?letter/i], value: () => CANDIDATE.coverLetterFull },
  { patterns: [/why[\s._-]?(are[\s._-]?you[\s._-]?)?apply/i, /why[\s._-]?interested/i, /why[\s._-]?this[\s._-]?role/i, /motivation/i, /why[\s._-]?join/i, /why[\s._-]?us/i, /reason[\s._-]?for[\s._-]?apply/i], value: () => CANDIDATE.whyApply },
  { patterns: [/tell[\s._-]?us[\s._-]?about[\s._-]?yourself/i, /about[\s._-]?yourself/i, /introduce[\s._-]?yourself/i, /brief[\s._-]?bio/i, /summary/i, /professional[\s._-]?summary/i, /profile[\s._-]?summary/i], value: () => CANDIDATE.summary },
  { patterns: [/additional[\s._-]?info/i, /any[\s._-]?comments/i, /other[\s._-]?information/i, /message/i, /anything[\s._-]?else/i, /additional[\s._-]?comments/i], value: () => CANDIDATE.coverLetterShort },
  { patterns: [/skills/i, /technical[\s._-]?skills/i, /key[\s._-]?skills/i, /competencies/i, /expertise/i, /strengths/i], value: () => CANDIDATE.skillsPrimary },
  { patterns: [/how[\s._-]?did[\s._-]?you[\s._-]?hear/i, /referral[\s._-]?source/i, /source/i, /how[\s._-]?did[\s._-]?you[\s._-]?find/i, /where[\s._-]?did[\s._-]?you[\s._-]?hear/i], value: () => CANDIDATE.howHeard },
  { patterns: [/headline/i, /professional[\s._-]?headline/i, /tagline/i], value: () => CANDIDATE.headline },

  // ── BACKGROUND / CONSENT ──────────────────────────────────────────────────
  { patterns: [/background[\s._-]?check/i, /criminal[\s._-]?background/i], value: () => CANDIDATE.backgroundCheck, fieldType: 'radio_yes' },
  { patterns: [/drug[\s._-]?test/i, /substance[\s._-]?test/i], value: () => CANDIDATE.drugTest, fieldType: 'radio_yes' },
  { patterns: [/criminal[\s._-]?record/i, /convicted/i, /felony/i, /misdemeanor/i], value: () => CANDIDATE.criminalRecord, fieldType: 'radio_no' },
  { patterns: [/agree[\s._-]?to[\s._-]?terms/i, /terms[\s._-]?and[\s._-]?conditions/i, /privacy[\s._-]?policy/i, /consent/i, /acknowledge/i], value: () => 'Yes', fieldType: 'checkbox_check' },
];

// ─────────────────────────────────────────────────────────────────────────────
// resolveFieldValue — Maps a field identifier string to a candidate value
// ─────────────────────────────────────────────────────────────────────────────
function resolveFieldValue(identifier) {
  if (!identifier) return null;
  const id = identifier.toLowerCase();
  for (const mapping of FIELD_MAP) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(id)) {
        const val = mapping.value();
        return { value: val, fieldType: mapping.fieldType || 'text' };
      }
    }
  }
  return null;
}

async function fillInput(locator, value) {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await locator.click({ timeout: 3000 }).catch(() => {});
    await locator.fill('', { timeout: 3000 }).catch(() => {});
    await locator.fill(value, { timeout: 3000 });

    // Handle autocomplete inputs (e.g. candidate-location)
    const id = await locator.getAttribute('id').catch(() => '') || '';
    const name = await locator.getAttribute('name').catch(() => '') || '';
    if (/location|city/i.test(`${id} ${name}`)) {
      const page = locator.page();
      await page.waitForTimeout(400);
      const opt = page.locator('[class*="option"]:visible, [role="option"]:visible').first();
      if (await opt.isVisible({ timeout: 800 }).catch(() => false)) {
        await opt.click({ force: true }).catch(() => {});
      } else {
        await locator.press('ArrowDown').catch(() => {});
        await locator.press('Enter').catch(() => {});
      }
    }
    return true;
  } catch (_) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// fillSelect — Selects best matching option in <select> dropdown
// ─────────────────────────────────────────────────────────────────────────────
async function fillSelect(locator, value) {
  try {
    const options = await locator.locator('option').allTextContents().catch(() => []);
    if (!options.length) return false;
    const lower = value.toLowerCase().trim();

    // Prefer-not-to-say options for ethnicity / race
    const preferNot = options.find(o => /prefer[\s_-]?not|decline/i.test(o));

    const match =
      options.find(o => o.toLowerCase().trim() === lower) ||
      options.find(o => o.toLowerCase().startsWith(lower)) ||
      options.find(o => o.toLowerCase().includes(lower)) ||
      options.find(o => lower.includes(o.toLowerCase().trim()) && o.trim().length > 2) ||
      preferNot;

    if (match) {
      await locator.selectOption({ label: match }, { timeout: 3000 });
      return true;
    }
  } catch (_) {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// clickRadio — Clicks a radio option that matches the target text
// ─────────────────────────────────────────────────────────────────────────────
async function clickRadio(page, wantYes = false) {
  try {
    const targetWords = wantYes ? ['yes', 'true', '1', 'i am', 'i have'] : ['no', 'false', '0', 'i am not', 'i do not', 'decline'];
    const radios = await page.locator('input[type="radio"]:visible').all().catch(() => []);
    for (const radio of radios) {
      const val = (await radio.getAttribute('value').catch(() => '') || '').toLowerCase();
      const id = await radio.getAttribute('id').catch(() => '') || '';
      const label = id ? await page.locator(`label[for="${id}"]`).textContent({ timeout: 500 }).catch(() => '') || '' : '';
      const combined = `${val} ${label}`.toLowerCase();
      if (targetWords.some(w => combined === w || combined.startsWith(w))) {
        await radio.click({ force: true });
        return true;
      }
    }
  } catch (_) {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// fillCustomDropdown — Handles React-Select, Chosen, Select2, Ant-Design
// ─────────────────────────────────────────────────────────────────────────────
async function fillCustomDropdown(frame, cs, targetVal) {
  try {
    await cs.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await cs.click({ force: true, timeout: 2000 }).catch(() => {});
    const context = frame || cs.page();
    await context.waitForTimeout(350);

    const patterns = [new RegExp('^\\s*' + targetVal.split(' ')[0], 'i')];
    if (/india/i.test(targetVal)) {
      patterns.push(/elsewhere|located\s*elsewhere|other|international|rest\s*of\s*world|non[\s._-]?us/i);
    } else if (/no/i.test(targetVal)) {
      patterns.push(/^no\b|none|never|decline/i);
    } else if (/yes/i.test(targetVal)) {
      patterns.push(/^yes\b|true|authorized/i);
    }

    // 1. Direct option matching in visible menu
    for (const pat of patterns) {
      const opt = context.locator('[class*="option"]:visible, [role="option"]:visible, [id*="react-select"]:visible, [id*="option"]:visible')
        .filter({ hasText: pat }).first();
      if (await opt.isVisible({ timeout: 600 }).catch(() => false)) {
        await opt.click({ force: true });
        await context.waitForTimeout(300);
        return true;
      }
    }

    // 2. Try typing into inner search input to filter the list
    const innerInput = cs.locator('input').first();
    if (await innerInput.isVisible({ timeout: 600 }).catch(() => false)) {
      await innerInput.fill('').catch(() => {});
      await innerInput.type(targetVal, { delay: 40 }).catch(() => {});
      await context.waitForTimeout(400);

      const filteredOpt = context.locator('[class*="option"]:visible, [role="option"]:visible, div[id*="option"]')
        .filter({ hasText: new RegExp('^\\s*' + targetVal.split(' ')[0], 'i') }).first();

      if (await filteredOpt.isVisible({ timeout: 800 }).catch(() => false)) {
        await filteredOpt.click({ force: true });
        await context.waitForTimeout(300);
        return true;
      }
      await innerInput.press('ArrowDown').catch(() => {});
      await innerInput.press('Enter').catch(() => {});
      await context.waitForTimeout(300);
      return true;
    }

    // 3. Fallback option click
    const anyOption = context.locator('[class*="option"]:visible, [role="option"]:visible').first();
    if (await anyOption.isVisible({ timeout: 800 }).catch(() => false)) {
      await anyOption.click({ force: true });
      return true;
    }
  } catch (_) {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
async function handleCheckboxes(context) {
  try {
    const checkboxes = await context.locator('input[type="checkbox"]').all().catch(() => []);
    for (const cb of checkboxes) {
      try {
        const id = await cb.getAttribute('id').catch(() => '') || '';
        const name = await cb.getAttribute('name').catch(() => '') || '';
        const isRequired = await cb.getAttribute('required').catch(() => null) !== null ||
                           await cb.getAttribute('aria-required').catch(() => '') === 'true';

        let label = '';
        if (id) label = await context.locator(`label[for="${id}"]`).textContent({ timeout: 400 }).catch(() => '') || '';
        if (!label) {
          label = await cb.evaluate(el => {
            const p = el.closest('label, .field, .form-group, fieldset, .question, div');
            return p ? p.textContent : '';
          }).catch(() => '') || '';
        }
        const identifier = `${label} ${name} ${id}`.toLowerCase();

        // Check required consent, terms, privacy, communication, and none of above checkboxes
        if (
          isRequired ||
          /terms|agree|consent|privacy|acknowledge|certif|authorize|communicate|email|sms|none[\s._-]?of/i.test(identifier)
        ) {
          const isChecked = await cb.isChecked().catch(() => false);
          if (!isChecked) {
            await cb.check({ force: true }).catch(async () => {
              await cb.click({ force: true }).catch(() => {});
            });
            console.log(`[FormFiller] ☑️ Checked box: "${identifier.slice(0, 40)}"`);
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// fillFrameInputs — Fills all field types inside a single frame (iframe)
// ─────────────────────────────────────────────────────────────────────────────
async function fillFrameInputs(frame, page, roleTitle, company) {
  let filled = 0;
  const contextCoverLetter = `I am a results-driven transformation program leader with 14+ years at Standard Chartered Bank. I am excited to apply for the ${roleTitle} role at ${company} and bring my enterprise delivery, ServiceNow HRSD, and change management expertise.`;
  CANDIDATE.coverLetterShort = contextCoverLetter;

  // ── 1. Text / email / url / tel inputs ──────────────────────────────────
  const inputs = await frame.locator(
    'input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly])'
  ).all().catch(() => []);

  for (const input of inputs) {
    try {
      const type = await input.getAttribute('type').catch(() => 'text') || 'text';
      if (['hidden', 'file', 'submit', 'checkbox', 'radio', 'image', 'reset', 'button'].includes(type)) continue;

      const name  = await input.getAttribute('name').catch(() => '') || '';
      const id    = await input.getAttribute('id').catch(() => '') || '';
      const ph    = await input.getAttribute('placeholder').catch(() => '') || '';
      const aria  = await input.getAttribute('aria-label').catch(() => '') || '';
      const auto  = await input.getAttribute('autocomplete').catch(() => '') || '';
      let label = '';
      if (id) label = await frame.locator(`label[for="${id}"]`).textContent({ timeout: 800 }).catch(() => '') || '';
      // Also look for nearest preceding label
      if (!label) {
        label = await input.evaluate(el => {
          const lbl = el.closest('label') || el.closest('.field, .form-group, .question')?.querySelector('label');
          return lbl ? lbl.textContent : '';
        }).catch(() => '') || '';
      }

      const identifier = `${label} ${name} ${id} ${ph} ${aria} ${auto}`.trim();
      const resolved = resolveFieldValue(identifier);

      if (resolved && resolved.value !== undefined && resolved.value !== null) {
        const isVisible = await input.isVisible().catch(() => false);
        if (!isVisible) continue;
        const ok = await fillInput(input, String(resolved.value));
        if (ok) {
          console.log(`[FormFiller][iframe] ✅ "${identifier.slice(0, 40)}" = "${String(resolved.value).slice(0, 30)}"`);
          filled++;
          await frame.waitForTimeout(150);
        }
      }
    } catch (_) {}
  }

  // ── 2. Textareas ──────────────────────────────────────────────────────────
  const textareas = await frame.locator('textarea:not([disabled]):not([readonly])').all().catch(() => []);
  for (const ta of textareas) {
    try {
      const name = await ta.getAttribute('name').catch(() => '') || '';
      const id   = await ta.getAttribute('id').catch(() => '') || '';
      const ph   = await ta.getAttribute('placeholder').catch(() => '') || '';
      const aria = await ta.getAttribute('aria-label').catch(() => '') || '';
      let label = '';
      if (id) label = await frame.locator(`label[for="${id}"]`).textContent({ timeout: 800 }).catch(() => '') || '';
      if (!label) label = await ta.evaluate(el => {
        const l = el.closest('label') || el.closest('.field,.form-group,.question')?.querySelector('label');
        return l ? l.textContent : '';
      }).catch(() => '') || '';

      const identifier = `${label} ${name} ${id} ${ph} ${aria}`.trim();
      const resolved = resolveFieldValue(identifier);
      if (resolved && resolved.value) {
        const isVisible = await ta.isVisible().catch(() => false);
        if (isVisible) {
          await ta.fill(String(resolved.value));
          console.log(`[FormFiller][iframe] ✅ textarea "${identifier.slice(0, 40)}"`);
          filled++;
        }
      }
    } catch (_) {}
  }

  // ── 3. Native <select> dropdowns ─────────────────────────────────────────
  const selects = await frame.locator('select:not([disabled])').all().catch(() => []);
  for (const sel of selects) {
    try {
      const name = await sel.getAttribute('name').catch(() => '') || '';
      const id   = await sel.getAttribute('id').catch(() => '') || '';
      let label = '';
      if (id) label = await frame.locator(`label[for="${id}"]`).textContent({ timeout: 800 }).catch(() => '') || '';
      if (!label) label = await sel.evaluate(el => {
        const l = el.closest('label') || el.closest('.field,.form-group,.question')?.querySelector('label');
        return l ? l.textContent : '';
      }).catch(() => '') || '';

      const identifier = `${label} ${name} ${id}`.trim();
      const resolved = resolveFieldValue(identifier);

      let targetVal = resolved?.value;

      // Special overrides for common select fields
      if (!targetVal) {
        if (/country|location|residence/i.test(identifier)) targetVal = 'India';
        else if (/gender|sex/i.test(identifier)) targetVal = 'Male';
        else if (/veteran/i.test(identifier)) targetVal = 'No';
        else if (/disability/i.test(identifier)) targetVal = 'No';
        else if (/hispanic|latino/i.test(identifier)) targetVal = 'No';
        else if (/ethnicity|race/i.test(identifier)) targetVal = 'Asian';
        else if (/sponsor|visa/i.test(identifier)) targetVal = 'No';
        else if (/authorized|eligible|right[\s_-]?to[\s_-]?work/i.test(identifier)) targetVal = 'Yes';
        else if (/notice|availability/i.test(identifier)) targetVal = CANDIDATE.noticePeriodText;
        else if (/experience|year/i.test(identifier)) targetVal = CANDIDATE.experienceYears;
        else continue;
      }

      const ok = await fillSelect(sel, targetVal);
      if (ok) {
        console.log(`[FormFiller][iframe] ✅ <select> "${identifier.slice(0, 40)}" = "${targetVal}"`);
        filled++;
      }
    } catch (_) {}
  }

  // ── 4. Custom React-Select / Chosen / div dropdowns ──────────────────────
  const customDropdowns = await frame.locator(
    'div[class*="select__control"], div[class*="Select-control"], div[class*="choices"], [role="combobox"]:not(input)'
  ).all().catch(() => []);

  for (const cs of customDropdowns) {
    try {
      const innerInput = cs.locator('input').first();
      const inputId = await innerInput.getAttribute('id').catch(() => '') || '';
      let parentText = '';

      if (inputId) {
        parentText = await frame.locator(`label[for="${inputId}"], label[id*="${inputId}"]`).textContent({ timeout: 400 }).catch(() => '') || '';
      }

      if (!parentText) {
        parentText = await cs.evaluate(el => {
          const p = el.closest('.field, .form-group, .question, .select-wrapper, fieldset, [data-field]') || el.parentElement;
          if (!p || p.tagName === 'FORM') {
            const prevLabel = el.parentElement ? el.parentElement.querySelector('label') : null;
            return prevLabel ? prevLabel.textContent.trim() : '';
          }
          const label = p.querySelector('label, [class*="label"], legend');
          return (label ? label.textContent : p.textContent).replace(/\s+/g, ' ').trim().slice(0, 150);
        }).catch(() => '') || '';
      }

      let targetVal = 'No';
      if (/phone|dial[\s_-]?code|calling[\s_-]?code|^country$|country[\s._-]?code/i.test(parentText)) {
        targetVal = 'India';
      } else if (/sanction|export[\s_-]?control|crimea|cuba|iran|syria|none[\s_-]?of[\s_-]?the[\s_-]?above/i.test(parentText)) {
        targetVal = 'None of the above';
      } else if (/degree|qualification|highest[\s._-]?education/i.test(parentText)) {
        targetVal = 'Bachelor';
      } else if (/school|university|college|institution/i.test(parentText)) {
        targetVal = 'Other';
      } else if (/discipline|major|field[\s._-]?of[\s._-]?study/i.test(parentText)) {
        targetVal = 'Engineering';
      } else if (/start[\s._-]?date[\s._-]?month|from[\s._-]?month/i.test(parentText)) {
        targetVal = 'June';
      } else if (/end[\s._-]?date[\s._-]?month|to[\s._-]?month/i.test(parentText)) {
        targetVal = 'May';
      } else if (/start[\s._-]?date[\s._-]?year|start[\s._-]?year/i.test(parentText)) {
        targetVal = '2004';
      } else if (/end[\s._-]?date[\s._-]?year|end[\s._-]?year|graduation[\s._-]?year/i.test(parentText)) {
        targetVal = '2008';
      } else if (/pronoun/i.test(parentText)) {
        targetVal = 'He/Him';
      } else if (/location|city/i.test(parentText) && !/united states|residence|country/i.test(parentText)) {
        targetVal = 'Bengaluru';
      } else if (/require.*sponsor|need.*sponsor|sponsorship|visa/i.test(parentText)) {
        targetVal = 'No';
      } else if (/authorized|eligible|right[\s_-]?to[\s_-]?work/i.test(parentText)) {
        targetVal = 'Yes';
      } else if (/located in the united states|currently in the us\b|us citizen/i.test(parentText)) {
        targetVal = 'No';
      } else if (/choose[\s_-]?(the[\s_-]?)?country|country[\s_-]?of[\s_-]?residence|country[\s_-]?in[\s_-]?which|current[\s_-]?country|what[\s_-]?country|residing[\s_-]?in|located[\s_-]?in|country/i.test(parentText)) {
        targetVal = 'India';
      } else if (/\b(?:years|experience|familiar|proficien|knowledge|background|skill|comfortable|agile|scrum|leadership|manage)\b/i.test(parentText) && !/require.*sponsor|subject to/i.test(parentText)) {
        targetVal = 'Yes';
      } else if (/\b(?:legal|18|background check|drug screen|terms|consent|agree)\b/i.test(parentText)) {
        targetVal = 'Yes';
      } else if (/gender/i.test(parentText)) {
        targetVal = 'Male';
      } else if (/ethnicity|race/i.test(parentText)) {
        targetVal = 'Asian';
      } else if (/veteran/i.test(parentText)) {
        targetVal = 'No';
      } else if (/disability/i.test(parentText)) {
        targetVal = 'No';
      } else if (/hispanic|latino/i.test(parentText)) {
        targetVal = 'No';
      } else if (/previously[\s_-]?worked|worked[\s_-]?for|current[\s_-]?employee/i.test(parentText)) {
        targetVal = 'No';
      } else if (/notice|availability/i.test(parentText)) {
        targetVal = CANDIDATE.noticePeriodText;
      } else if (/source|hear[\s_-]?about/i.test(parentText)) {
        targetVal = 'LinkedIn';
      }

      const ok = await fillCustomDropdown(frame, cs, targetVal);
      if (ok) {
        console.log(`[FormFiller][iframe] ✅ custom-select "${parentText.slice(0, 40)}" = "${targetVal}"`);
        filled++;
      }
    } catch (_) {}
  }

  // ── 5. Radio buttons for Yes/No questions ─────────────────────────────────
  const radioGroups = await frame.locator('fieldset, [role="radiogroup"], .radio-group, .boolean-field').all().catch(() => []);
  for (const group of radioGroups) {
    try {
      const groupText = (await group.textContent().catch(() => '') || '').toLowerCase();
      if (/sponsor|visa|work[\s_-]?permit/i.test(groupText)) {
        await clickRadioInGroup(group, false); filled++;
      } else if (/authorized|eligible|legally[\s_-]?authorized|right[\s_-]?to[\s_-]?work/i.test(groupText)) {
        await clickRadioInGroup(group, true); filled++;
      } else if (/veteran|military/i.test(groupText)) {
        await clickRadioInGroup(group, false); filled++;
      } else if (/disability|disabled/i.test(groupText)) {
        await clickRadioInGroup(group, false); filled++;
      } else if (/background[\s_-]?check/i.test(groupText)) {
        await clickRadioInGroup(group, true); filled++;
      } else if (/criminal/i.test(groupText)) {
        await clickRadioInGroup(group, false); filled++;
      }
    } catch (_) {}
  }

  // ── 6. File upload (CV) ───────────────────────────────────────────────────
  const fileInputs = await frame.locator('input[type="file"]').all().catch(() => []);
  if (fileInputs.length > 0) {
    const cvPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');
    if (fs.existsSync(cvPath)) {
      try {
        await fileInputs[0].setInputFiles(cvPath);
        console.log(`[FormFiller][iframe] 📎 CV uploaded in iframe`);
        filled++;
        await frame.waitForTimeout(1500);
      } catch (_) {}
    }
  }

  // ── 7. Checkboxes (consent/terms) ─────────────────────────────────────────
  await handleCheckboxes(frame).catch(() => {});

  return filled;
}

// ─────────────────────────────────────────────────────────────────────────────
// clickRadioInGroup — Clicks Yes/No in a fieldset/radiogroup
// ─────────────────────────────────────────────────────────────────────────────
async function clickRadioInGroup(group, wantYes) {
  const target = wantYes ? ['yes', 'true', '1', 'i am', 'authorized'] : ['no', 'false', '0', 'i am not', 'decline', 'not a'];
  const radios = await group.locator('input[type="radio"]').all().catch(() => []);
  for (const r of radios) {
    const val = (await r.getAttribute('value').catch(() => '') || '').toLowerCase().trim();
    const id = await r.getAttribute('id').catch(() => '') || '';
    const page = r.page();
    const labelText = id ? (await page.locator(`label[for="${id}"]`).textContent({ timeout: 500 }).catch(() => '') || '').toLowerCase() : '';
    if (target.some(t => val === t || val.startsWith(t) || labelText.includes(t))) {
      await r.click({ force: true }).catch(() => {});
      return true;
    }
  }
  // Fallback: click first No/Yes visible label
  const labels = await group.locator('label').all().catch(() => []);
  for (const lbl of labels) {
    const txt = (await lbl.textContent().catch(() => '') || '').toLowerCase().trim();
    if (target.some(t => txt === t || txt.startsWith(t))) {
      await lbl.click({ force: true }).catch(() => {});
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// fillAllFormFields — Main entry: fills the entire page form
// ─────────────────────────────────────────────────────────────────────────────
async function fillAllFormFields(page, roleTitle = '', company = '') {
  console.log(`[FormFiller] Starting comprehensive fill for "${roleTitle}" @ ${company}`);
  let filled = 0;

  // Personalise cover letter
  const savedCoverLetter = CANDIDATE.coverLetterShort;
  const skillsFocus = roleTitle.toLowerCase().includes('servicenow') ? 'ServiceNow HRSD implementation and governance' : 'digital transformation, UAT governance, and change management';
  CANDIDATE.coverLetterShort = `I am a results-driven transformation program leader with 14+ years at Standard Chartered Bank, specializing in ${skillsFocus}. I am excited to apply for the ${roleTitle} role at ${company} and confident my enterprise delivery expertise will add immediate value.`;

  // ── Blocklist: skip auth / social iframes ─────────────────────────────────
  const IFRAME_BLOCKLIST = ['accounts.google.com', 'recaptcha', 'google.com/recaptcha', 'doubleclick', 'facebook', 'twitter', 'linkedin.com/embed', 'youtube', 'gsi/iframe'];

  // ── Try all ATS-specific iframes first ───────────────────────────────────
  const ATS_HOSTS = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workday', 'icims', 'taleo', 'job-boards', 'bamboohr', 'jobvite', 'recruitee', 'dover', 'myworkday'];
  const frames = page.frames();
  for (const frame of frames) {
    const frameUrl = frame.url() || '';
    if (!frameUrl || frameUrl === 'about:blank') continue;
    if (IFRAME_BLOCKLIST.some(b => frameUrl.includes(b))) continue;
    const isAts = ATS_HOSTS.some(h => frameUrl.includes(h));
    if (!isAts) continue;
    try {
      const count = await frame.locator('input:not([type="hidden"]):not([type="submit"])').count().catch(() => 0);
      if (count >= 2) {
        console.log(`[FormFiller] 🖼️  Found ${count} inputs in iframe (${frameUrl.slice(0, 60)})`);
        filled += await fillFrameInputs(frame, page, roleTitle, company);
      }
    } catch (_) {}
  }

  // If iframe fill got real fields, return early
  if (filled >= 3) {
    CANDIDATE.coverLetterShort = savedCoverLetter;
    console.log(`[FormFiller] Completed (iframe): filled ${filled} fields.`);
    return filled;
  }

  // ── Main frame fill ────────────────────────────────────────────────────────
  filled += await fillFrameInputs(page, page, roleTitle, company);
  await handleCheckboxes(page).catch(() => {});

  CANDIDATE.coverLetterShort = savedCoverLetter;
  console.log(`[FormFiller] Completed: filled ${filled} fields.`);
  return filled;
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadCV — Attaches resume PDF to file input
// ─────────────────────────────────────────────────────────────────────────────
async function uploadCV(page, roleTitleHint = '') {
  const lowerHint = roleTitleHint.toLowerCase();
  let cvFile = path.join(__dirname, 'Sandeep_Kashyap.pdf');

  const serviceNowCv = path.join(__dirname, 'Sandeep_Kashyap_ServiceNow.pdf');
  const pmCv = path.join(__dirname, 'Sandeep_Kashyap_ProgramManager.pdf');
  if ((lowerHint.includes('servicenow') || lowerHint.includes('hrsd')) && fs.existsSync(serviceNowCv)) cvFile = serviceNowCv;
  else if (fs.existsSync(pmCv)) cvFile = pmCv;

  if (!fs.existsSync(cvFile)) { console.log(`[FormFiller] ⚠️ CV not found: ${cvFile}`); return false; }

  // Try main frame first
  try {
    const fileInputs = await page.locator('input[type="file"]:visible').all().catch(() => []);
    for (const fi of fileInputs) {
      const accept = await fi.getAttribute('accept').catch(() => '') || '';
      if (!accept || accept.includes('pdf') || accept.includes('*') || accept.includes('doc')) {
        await fi.setInputFiles(cvFile);
        await page.waitForTimeout(2000);
        console.log(`[FormFiller] 📎 CV uploaded: ${path.basename(cvFile)}`);
        return true;
      }
    }
  } catch (e) { console.log(`[FormFiller] CV upload error: ${e.message.slice(0, 60)}`); }

  // Try iframes
  for (const frame of page.frames()) {
    const url = frame.url() || '';
    if (IFRAME_BLOCKLIST && IFRAME_BLOCKLIST.some(b => url.includes(b))) continue;
    try {
      const fi = frame.locator('input[type="file"]').first();
      if (await fi.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fi.setInputFiles(cvFile);
        await frame.waitForTimeout(2000);
        console.log(`[FormFiller] 📎 CV uploaded in iframe: ${path.basename(cvFile)}`);
        return true;
      }
    } catch (_) {}
  }
  return false;
}
const IFRAME_BLOCKLIST = ['accounts.google.com', 'recaptcha', 'gsi/iframe', 'doubleclick', 'facebook', 'twitter'];

// ─────────────────────────────────────────────────────────────────────────────
// submitForm — Clicks the submit / next button
// ─────────────────────────────────────────────────────────────────────────────
async function submitForm(page) {
  // Multi-step forms — click Next on each step
  for (let step = 0; step < 5; step++) {
    const nextBtn = page.locator([
      '[data-automation-id="bottom-navigation-next-button"]',  // Workday
      'button:has-text("Next")', 'button:has-text("Continue")',
      'button:has-text("Save and Continue")', 'button:has-text("Save & Continue")',
      '[data-qa="btn-next"]', '.next-btn', '#next-button',
    ].join(', ')).first();
    if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await nextBtn.scrollIntoViewIfNeeded().catch(() => {});
      await nextBtn.click({ force: true });
      await page.waitForTimeout(3000);
      // Fill any new fields that appeared
      await fillAllFormFields(page, '', '');
    } else break;
  }

  const submitSelectors = [
    // Greenhouse
    'button[type="submit"]', 'input[type="submit"]',
    // Text-based
    'button:has-text("Submit Application")', 'button:has-text("Submit application")',
    'button:has-text("Submit")', 'button:has-text("Apply Now")', 'button:has-text("Apply")',
    'button:has-text("Send Application")', 'button:has-text("Complete Application")',
    'button:has-text("Send my application")',
    // IDs
    '#submit_app', '#submit-button', '#resumator_submit_button', '#submit-form',
    // Data attributes
    '[data-qa="btn-submit-app"]', '[data-submit="true"]', '[aria-label*="submit" i]',
    // Classes
    '.lever-submit', '.application-submit', '.submit-app-btn', '.btn-submit',
    // Workday
    '[data-automation-id="bottom-navigation-next-button"]',
    // iCIMS
    '#icims_content_form input[type="submit"]',
    // Taleo
    '#applyButton', '#next-button[value*="Submit" i]',
  ];

  for (const sel of submitSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click({ force: true });
        await page.waitForTimeout(5000);
        console.log(`[FormFiller] 🚀 Clicked submit via: ${sel}`);
        return true;
      }
    } catch (_) {}
  }
  return false;
}

module.exports = { fillAllFormFields, uploadCV, submitForm, CANDIDATE, resolveFieldValue, fillFrameInputs };
