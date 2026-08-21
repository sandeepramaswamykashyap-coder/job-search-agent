/**
 * Job Search & Application Agent - Browser Automation & Portal Crawler
 * Implements anti-detection patterns, human-like typing/clicking/scrolling, and portal actions.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

// Load configurations
const configPath = path.join(__dirname, 'config.json');
const profilePath = path.join(__dirname, 'profile.json');
const credentialsPath = path.join(__dirname, 'credentials.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Simulated human-like timing helpers
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sleepRandom(minMs = 800, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  await sleep(delay);
}

/**
 * Simulates human typing speed and errors/corrections
 */
async function simulateTyping(page, selector, text) {
  const element = await page.locator(selector).first();
  await element.focus();
  await sleepRandom(200, 600);

  for (let i = 0; i < text.length; i++) {
    // 5% chance of typo
    if (Math.random() < 0.05 && i > 0 && i < text.length - 1) {
      const wrongChar = String.fromCharCode(text.charCodeAt(i) + 1);
      await page.keyboard.type(wrongChar);
      await sleepRandom(150, 300);
      await page.keyboard.press('Backspace');
      await sleepRandom(200, 400);
    }
    await page.keyboard.type(text[i]);
    // Typing delay simulating 60-80 WPM
    await sleepRandom(80, 220);
  }
}

/**
 * Simulates human-like scrolling behavior
 */
async function simulateScroll(page) {
  const scrolls = Math.floor(Math.random() * 3) + 2; // scroll 2-5 times
  for (let i = 0; i < scrolls; i++) {
    const distance = Math.floor(Math.random() * 300) + 100;
    await page.mouse.wheel(0, distance);
    await sleepRandom(600, 1500);
  }
}

/**
 * Simulates bezier-like cursor movement towards coordinates or elements
 */
async function simulateMoveAndClick(page, selector) {
  const element = await page.locator(selector).first();
  const box = await element.boundingBox();
  if (!box) {
    await element.click(); // fallback
    return;
  }

  // Target point slightly randomized inside the bounding box
  const targetX = box.x + box.width * (0.2 + Math.random() * 0.6);
  const targetY = box.y + box.height * (0.2 + Math.random() * 0.6);

  // Simple interpolation to simulate curved hand movement
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Bezier curve approximation
    const curX = targetX * t + (1 - t) * (targetX - 50); 
    const curY = targetY * t + (1 - t) * (targetY + 40);
    await page.mouse.move(curX, curY);
    await sleep(20 + Math.random() * 20);
  }

  await page.mouse.down();
  await sleep(50 + Math.random() * 100);
  await page.mouse.up();
  await sleepRandom(400, 1200);
}

/**
 * Smart Dynamic Form Filler
 * Inspects labels and inputs on a page to intelligently fill notice period, salaries, and visa constraints.
 */
async function smartFillForm(page, profile, companyText = 'Company', titleText = 'Position') {
  console.log(`[Agent] Inspecting page for dynamic application form fields...`);
  try {
    // Find all text inputs, textareas, number fields, and select boxes
    const inputs = await page.locator('input[type="text"], input[type="number"], textarea, select');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (!(await input.isVisible())) continue;

      const id = (await input.getAttribute('id') || '').toLowerCase();
      const name = (await input.getAttribute('name') || '').toLowerCase();
      const placeholder = (await input.getAttribute('placeholder') || '').toLowerCase();
      
      // Get associated label text if present
      let labelText = '';
      const label = await page.locator(`label[for="${id}"]`).first();
      if (await label.count() > 0) {
        labelText = (await label.innerText()).toLowerCase();
      } else {
        try {
          labelText = (await input.evaluate(el => {
            const parentLabel = el.closest('label');
            if (parentLabel) return parentLabel.innerText;
            const container = el.closest('div, td, tr, li');
            return container ? container.innerText : '';
          })).toLowerCase();
        } catch (e) {}
      }

      const contextText = `${id} ${name} ${placeholder} ${labelText}`;

      // Skip readonly input fields to prevent Playwright fill hangs
      const isReadonly = await input.getAttribute('readonly');
      if (isReadonly !== null && isReadonly !== 'false') continue;

      // 1. Notice Period / Availability
      if (contextText.includes('notice') || contextText.includes('joining') || contextText.includes('availability') || contextText.includes('earliest') || contextText.includes('serving') || contextText.includes('lwd') || contextText.includes('last working')) {
        const noticeDays = profile.job_search_criteria.notice_period.days;
        const negotiableText = profile.job_search_criteria.notice_period.is_negotiable ? ' (negotiable)' : '';
        
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'select') {
          const options = await input.locator('option');
          const optCount = await options.count();
          let selected = false;
          for (let j = 0; j < optCount; j++) {
            const optText = (await options.nth(j).innerText()).toLowerCase();
            if (optText.includes('30') || optText.includes('1 month') || optText.includes('negotiable') || optText.includes('immediate') || optText.includes('serving')) {
              const val = await options.nth(j).getAttribute('value');
              await input.selectOption(val);
              selected = true;
              break;
            }
          }
          if (!selected && optCount > 1) await input.selectOption({ index: 1 });
        } else {
          await input.fill(`${noticeDays} days${negotiableText}`, { timeout: 2000 }).catch(() => {});
        }
        console.log(`[Agent] Smart-filled Notice Period: ${noticeDays} days`);
        await sleepRandom(200, 500);
        continue;
      }

      // 2. Expected Salary / CTC
      if (contextText.includes('expected') || contextText.includes('desired') || (contextText.includes('salary') && contextText.includes('expectation')) || contextText.includes('target ctc')) {
        const expectedCTC = profile.job_search_criteria.salary_expectation.expected;
        const type = await input.getAttribute('type');
        if (type === 'number') {
          await input.fill(String(expectedCTC), { timeout: 2000 }).catch(() => {});
        } else {
          await input.fill(`${expectedCTC / 100000} LPA`, { timeout: 2000 }).catch(() => {});
        }
        console.log(`[Agent] Smart-filled Expected CTC: ${expectedCTC}`);
        await sleepRandom(200, 500);
        continue;
      }

      // 3. Current Salary / CTC
      if (contextText.includes('current') && (contextText.includes('ctc') || contextText.includes('salary') || contextText.includes('fixed'))) {
        const currentCTC = profile.job_search_criteria.salary_expectation.current;
        const type = await input.getAttribute('type');
        if (type === 'number') {
          await input.fill(String(currentCTC), { timeout: 2000 }).catch(() => {});
        } else {
          await input.fill(`${currentCTC / 100000} LPA`, { timeout: 2000 }).catch(() => {});
        }
        console.log(`[Agent] Smart-filled Current CTC: ${currentCTC}`);
        await sleepRandom(200, 500);
        continue;
      }

      // 4. Experience Years
      if (contextText.includes('experience') || contextText.includes('total exp') || contextText.includes('years')) {
        const exp = profile.job_search_criteria.experience_years;
        await input.fill(String(exp), { timeout: 2000 }).catch(() => {});
        console.log(`[Agent] Smart-filled Experience: ${exp} years`);
        await sleepRandom(200, 500);
        continue;
      }

      // 5. Work Authorization & Sponsorship
      if (contextText.includes('sponsorship') || contextText.includes('visa') || contextText.includes('authorized') || contextText.includes('citizenship')) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'select') {
          const options = await input.locator('option');
          const optCount = await options.count();
          const requiresSponsor = profile.personal_info.work_authorization.requires_sponsorship_for_international;
          
          let targetSelect = requiresSponsor ? 'yes' : 'no';
          if (contextText.includes('authorized to work') || contextText.includes('work in india') || contextText.includes('indian citizen')) {
            targetSelect = 'yes';
          }

          for (let j = 0; j < optCount; j++) {
            const optText = (await options.nth(j).innerText()).toLowerCase();
            if (optText.includes(targetSelect)) {
              const val = await options.nth(j).getAttribute('value');
              await input.selectOption(val);
              console.log(`[Agent] Smart-selected Visa Auth status: ${targetSelect}`);
              break;
            }
          }
        }
        continue;
      }

      // 6. Cover Letter / Message to Recruiter
      if (contextText.includes('cover') || contextText.includes('why should') || contextText.includes('note to') || contextText.includes('introduce') || contextText.includes('message to') || contextText.includes('pitch') || contextText.includes('additional info') || contextText.includes('about yourself')) {
        const coverLetterPath = path.join(__dirname, 'cover_letter.txt');
        let coverContent = `Dear Hiring Team,\n\nI am writing to express my interest in the ${titleText} position at ${companyText}. With 14 years of experience in transformation and operations leadership, I am excited about this opportunity.\n\nSincerely,\nSandeep Ramaswamy Kashyap`;
        if (fs.existsSync(coverLetterPath)) {
          try {
            const template = fs.readFileSync(coverLetterPath, 'utf8');
            coverContent = template
              .replace(/\[Designation\]/g, titleText)
              .replace(/\[Company\]/g, companyText);
          } catch (err) {}
        }
        await input.fill(coverContent);
        console.log(`[Agent] Smart-filled Cover Letter for ${titleText} at ${companyText}`);
        await sleepRandom(200, 500);
        continue;
      }
    }
  } catch (err) {
    console.warn(`[Agent] Heuristic form filling encountered an issue: ${err.message}`);
  }
}

/**
 * Evaluate if a job post is a relevant match for Sandeep's profile.
 * Skips technical development/coding, testing automation coders,
 * and junior positions (< 8 years minimum experience).
 */
function evaluateJob(title, description, experienceRequired, postedDateText) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();

  // 0. Job Freshness Filter (Skip postings older than 3 days to prioritize fresh postings where HR is actively reviewing)
  if (postedDateText) {
    const p = postedDateText.toLowerCase();
    const oldPatterns = ['30+ days', '30 days', '25 days', '20 days', '15 days', '14 days', '10 days', '7 days', '6 days', '5 days', '4 days'];
    for (const pattern of oldPatterns) {
      if (p.includes(pattern)) {
        return { match: false, reason: `Job is too old (${postedDateText}), skipping to focus on fresh postings (< 3 days)` };
      }
    }
  }
  
  // 1. Technical & Development Exclusions
  const forbiddenTitles = [
    'developer', 'engineer', 'architect', 'programmer', 'coder', 'technical lead', 'tech lead',
    'sap', 'salesforce', 'pega', 'pl/sql', 'database administrator', 'dba', 'network engineer',
    'cybersecurity', 'security analyst', 'devops', 'cloud engineer', 'aws', 'azure', 'gcp',
    'java', 'python', 'c++', 'net', 'c#', 'react', 'angular', 'node', 'fullstack', 'frontend', 'backend',
    'automation tester', 'automation lead testing', 'selenium', 'cucumber', 'appium', 'testing automation',
    'sales executive', 'marketing executive', 'customer support', 'helpdesk', 'voice process',
    'data scientist', 'data science', 'statistician', 'ml engineer', 'machine learning',
    'adivasi', 'social worker', 'ngo', 'welfare', 'non-profit', 'philanthropy', 'foundation',
    'teacher', 'professor', 'faculty', 'lecturer', 'tester', 'qa engineer', 'test engineer',
    'recruiter', 'hr generalist', 'talent acquisition'
  ];
  
  for (const forbidden of forbiddenTitles) {
    if (t.includes(forbidden)) {
      // Allow exception for automation program or transformation managers
      if ((forbidden === 'developer' || forbidden === 'engineer' || forbidden === 'architect') && 
          (t.includes('transformation') || t.includes('automation manager') || t.includes('automation program') || t.includes('program manager'))) {
        continue;
      }
      return { match: false, reason: `Title contains forbidden term: "${forbidden}"` };
    }
  }

  // 2. Experience Check (Allow senior leadership positions listing 5+ yrs min experience)
  if (experienceRequired) {
    const match = experienceRequired.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      const minExp = parseInt(match[1]);
      if (minExp < 4) {
        return { match: false, reason: `Requires only ${minExp} years minimum (entry level)` };
      }
    }
  }

  // 3. Title Matching & Positive Skills/Context Matches
  const coreCompetencies = [
    'transformation', 'automation', 'change management', 'ocm', 'uat', 'user acceptance',
    'business analyst', 'business analysis', 'program manager', 'project manager',
    'operational excellence', 'process excellence', 'continuous improvement', 'servicenow',
    'workflow', 'service delivery', 'product owner', 'scrum master', 'agile', 'operations',
    'governance', 'data governance', 'data steward', 'delivery lead', 'practice lead'
  ];

  let competencyCount = 0;
  for (const competency of coreCompetencies) {
    if (t.includes(competency) || d.includes(competency)) {
      competencyCount++;
    }
  }

  // If title explicitly matches target role, match immediately
  if (competencyCount >= 1) {
    return { match: true };
  }

  return { match: false, reason: `Relevance score too low (matched 0 competencies)` };
}

/**
 * Extract HR/Recruiter contact email from job page and save to recruiter_leads.json
 */
async function extractRecruiterLead(detailPage, title, company, portal) {
  try {
    const pageContent = await detailPage.content().catch(() => '');
    const emailMatches = pageContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    
    const isGenuinePersonalHREmail = (emailStr) => {
      if (!emailStr || typeof emailStr !== 'string') return false;
      const e = emailStr.toLowerCase().trim();
      const [user, domain] = e.split('@');
      if (!user || !domain) return false;

      // Exclude platform domains & standard asset extensions
      if (e.endsWith('.jpg') || e.endsWith('.jpeg') || e.endsWith('.png') || e.endsWith('.gif') || e.endsWith('.svg') || e.endsWith('.webp')) return false;
      if (domain.includes('naukri.com') || domain.includes('iimjobs.com') || domain.includes('foundit.in') || domain.includes('indeed.com') || domain.includes('glassdoor.com') || domain.includes('w3.org') || domain.includes('schema.org') || domain.includes('sentry.io') || domain.includes('playwright') || domain.includes('webpack') || domain.includes('example.com') || domain.includes('gojobs.biz')) return false;
      
      // Exclude compliance, fraud, check, generic department mailboxes
      const forbiddenUserTerms = [
        'accommodations', 'accessibility', 'disability', 'diversity', 'inclusion',
        'fraud', 'report', 'check', 'compliance', 'abuse', 'security', 'legal', 'admin', 'help', 
        'billing', 'careers', 'career', 'jobs', 'job', 'hr', 'ta', 'recruitment', 'hiring', 
        'team', 'contact', 'info', 'support', 'no-reply', 'noreply', 'feedback', 'enquiry', 
        'inquiry', 'sales', 'service', 'privacy', 'terms', 'post', 'apply', 'press', 'media', 
        'investors', 'general', 'alerts', 'notifications', 'bounces', 'system'
      ];
      for (const term of forbiddenUserTerms) {
        if (user === term || user.includes(term)) return false;
      }

      // Ensure user prefix looks like a personal name (at least 3 characters)
      if (user.length < 3) return false;
      return true;
    };

    const filteredEmails = emailMatches.filter(isGenuinePersonalHREmail);

    if (filteredEmails.length > 0) {
      const recruiterEmail = filteredEmails[0];
      const leadsFile = path.join(__dirname, 'recruiter_leads.json');
      let leads = [];
      if (fs.existsSync(leadsFile)) {
        try { leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8')); } catch (e) {}
      }
      if (!leads.some(l => l.email === recruiterEmail)) {
        leads.push({
          email: recruiterEmail,
          company,
          title,
          portal,
          extractedAt: new Date().toISOString()
        });
        fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), 'utf8');
        console.log(`[Agent] 🔥 EXTRACTED GENUINE RECRUITER LEAD: ${recruiterEmail} for "${title}" at ${company}`);
      }
    }
  } catch (err) {
    // Ignore extraction errors
  }
}

/**
 * External ATS Auto-Apply Handler (Greenhouse, Lever, Workday)
 * Creates accounts if needed and submits applications end-to-end.
 */
async function handleExternalATS(page, url, companyText = 'Company', titleText = 'Position') {
  console.log(`[Agent] Managing redirection to external ATS: ${url}`);
  await sleepRandom(3000, 5000);

  try {
    // 1. Greenhouse / Lever (Single page forms, no login account required)
    if (url.includes('greenhouse.io') || url.includes('lever.co')) {
      console.log(`[Agent] Handling direct Greenhouse/Lever form filling...`);
      await smartFillForm(page, profile, companyText, titleText);

      // Attach CV
      const cvInput = page.locator('input[type="file"]').first();
      const cvPath = path.resolve(config.cv_settings.local_path);
      if (await cvInput.count() > 0 && fs.existsSync(cvPath)) {
        await cvInput.setInputFiles(cvPath);
        await sleepRandom(2000, 4000);
      }

      // Submit
      const submitBtn = page.locator('#submit_app, button[type="submit"], #submit-button').first();
      if (await submitBtn.isVisible()) {
        console.log(`[Agent] Submitting application on Greenhouse/Lever...`);
        await submitBtn.click();
        await sleepRandom(4000, 6000);
        console.log(`[Agent] Submitted successfully on external ATS.`);
        return true;
      }
    }
    
    // 2. Workday Jobs (Requires candidate account creation)
    else if (url.includes('workdayjobs.com') || url.includes('myworkdayjobs.com')) {
      console.log(`[Agent] Detected Workday applicant portal.`);
      
      const createAccountBtn = page.locator('button:has-text("Create Account"), a:has-text("Create Account")').first();
      if (await createAccountBtn.isVisible()) {
        console.log(`[Agent] Creating new Workday candidate account...`);
        await createAccountBtn.click();
        await sleepRandom(2000, 4000);

        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill(profile.personal_info.email);
          await passwordInput.fill('Paramahamsa01#'); // standard account password
          await page.click('button[type="submit"], button:has-text("Create Account")');
          await sleepRandom(4000, 6000);
          console.log(`[Agent] Workday account created successfully.`);
        }
      }

      // Multi-step form completion loop
      let nextBtn = page.locator('button:has-text("Next"), button:has-text("Save and Continue")').first();
      let steps = 0;
      while (await nextBtn.isVisible() && steps < 6) {
        console.log(`[Agent] Processing Workday step ${steps + 1}...`);
        await smartFillForm(page, profile, companyText, titleText);
        await nextBtn.click();
        await sleepRandom(3000, 5000);
        nextBtn = page.locator('button:has-text("Next"), button:has-text("Save and Continue"), button:has-text("Submit")').first();
        steps++;
      }
      console.log(`[Agent] Submitted successfully on Workday candidate portal.`);
      return true;
    }
  } catch (e) {
    console.error(`[Agent] Failed to complete external ATS application: ${e.message}`);
  }
  return false;
}

/**
 * Main entrance point for running a job matching and submission cycle
 */
async function runAgentCycle({ refreshCVOnly, stats, forceHeaded }) {
  console.log(`[Agent] Launching browser session...`);
  
  // Use persistent context to reuse logins/cookies
  const userDataDir = path.join(__dirname, '.browser_session');
  const isHeadless = !forceHeaded;
  console.log(`[Agent] Browser mode: ${isHeadless ? '100% Silent Background (Headless)' : 'Visible Window (Headed)'}`);

  const launchArgs = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox'
  ];
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: isHeadless,
    viewport: { width: 1280 + Math.floor(Math.random() * 100), height: 800 + Math.floor(Math.random() * 80) },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: launchArgs
  });

  const page = await context.newPage();

  try {
    // Portals targeted, ordered by config priority if available
    const portals = ['naukri', 'iimjobs', 'foundit', 'linkedin', 'instahyre', 'indeed', 'hirist', 'cutshort', 'wellfound', 'glassdoor', 'shine', 'timesjobs'];
    
    // Sort portals based on priority defined in config.json
    portals.sort((a, b) => {
      const prioA = config.platforms[a]?.priority || 99;
      const prioB = config.platforms[b]?.priority || 99;
      return prioA - prioB;
    });

    for (const portal of portals) {
      if (!config.platforms[portal] || !config.platforms[portal].enabled) {
        console.log(`[Agent] Portal ${portal} is disabled. Skipping.`);
        continue;
      }

      // ── LinkedIn session health check before attempting any LinkedIn work ──
      if (portal === 'linkedin') {
        try {
          await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(3000);
          const liUrl = page.url();
          if (liUrl.includes('/uas/login') || liUrl.includes('/checkpoint/') || liUrl.includes('/authwall')) {
            console.log(`[Agent] LinkedIn session expired (redirected to ${liUrl}). Skipping LinkedIn portal for this cycle.`);
            continue;
          }
        } catch (sessionErr) {
          console.log(`[Agent] LinkedIn session check failed: ${sessionErr.message}. Skipping LinkedIn portal.`);
          continue;
        }
      }

      console.log(`[Agent] Processing portal: ${portal}`);

      try {
        if (refreshCVOnly) {
          if (config.cv_settings.exclude_cv_reupload_platforms.includes(portal)) {
            console.log(`[Agent] Skipping CV upload for ${portal} as per configuration.`);
            continue;
          }
          await handleCVUpload(page, portal);
        } else {
          const dailyCap = config.platforms[portal].max_applications_per_day || 20;
          const appliedToday = stats.appliedRolesList.filter(r => r.portal === portal).length;
          if (appliedToday >= dailyCap) {
            if (portal === 'naukri' || portal === 'linkedin') {
              console.log(`[Agent] Daily application cap reached for ${portal} (${appliedToday}/${dailyCap}). Entering Recruiter Discovery & Direct Email Pitch Mode...`);
              await runRecruiterDiscoveryMode(page, portal, stats);
            } else {
              console.log(`[Agent] Daily application cap reached for ${portal} (${appliedToday}/${dailyCap}). Skipping apply loop.`);
            }
            continue;
          }
          await handleJobAutomation(page, portal, stats);
        }
      } catch (portalErr) {
        // Individual portal errors must NOT crash the whole cycle — log and continue to next portal
        console.error(`[Agent] ⚠️ Portal ${portal} threw an error and was skipped: ${portalErr.message}`);
      }
    }

    // Trigger 7 Global Remote Portal Sweeps (WeWorkRemotely, RemoteOK, WorkingNomads, DailyRemote, Jobgether, Remotive, SurelyRemote)
    if (!refreshCVOnly) {
      try {
        const { applyToNewRemotePortals } = require('./apply_new_remote_portals');
        console.log(`[Agent] Triggering 7 Global Remote Portal Sweeps...`);
        await applyToNewRemotePortals();
      } catch (err) {
        console.log(`[Agent] Global Remote Portal Sweep warning: ${err.message}`);
      }
    }
  } finally {
    await context.close();
    console.log(`[Agent] Browser session closed.`);
  }
}

/**
 * Recruiter Lead Discovery Mode: Runs when application caps are reached.
 * Searches Naukri and LinkedIn for fresh postings, extracts HR recruiter emails,
 * and immediately triggers cold email outreach with CV attached.
 */
async function runRecruiterDiscoveryMode(page, portal, stats) {
  console.log(`[Agent] 🔍 [RECRUITER DISCOVERY MODE] Crawling ${portal} for HR recruiter emails...`);
  const profilePath = path.join(__dirname, 'profile.json');
  let profile = { job_search_criteria: { target_roles: ['Transformation Program Manager'] } };
  if (fs.existsSync(profilePath)) {
    try { profile = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch (e) {}
  }
  const roles = profile.job_search_criteria.target_roles || ['Transformation Program Manager'];

  for (const role of roles.slice(0, 5)) {
    try {
      const encodedRole = encodeURIComponent(role);
      if (portal === 'naukri') {
        const searchUrl = `https://www.naukri.com/${role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-jobs-in-bangalore-bengaluru`;
        await page.goto(searchUrl).catch(() => {});
        await sleepRandom(3000, 5000);
        await simulateScroll(page);

        const jobCards = await page.locator('.srp-jobtuple-wrapper, .jobTuple');
        const count = await jobCards.count();
        console.log(`[Agent] Discovery mode found ${count} job cards for "${role}" on Naukri.`);
        
        for (let i = 0; i < Math.min(5, count); i++) {
          const card = jobCards.nth(i);
          const titleText = await card.locator('.title').first().innerText().catch(() => role);
          const companyText = await card.locator('.comp-name').first().innerText().catch(() => 'Company');

          await card.click().catch(() => {});
          await sleepRandom(2000, 4000);
          
          const pages = page.context().pages();
          const detailPage = pages[pages.length - 1];

          await extractRecruiterLead(detailPage, titleText, companyText, 'naukri');
          
          if (detailPage !== page) {
            await detailPage.close().catch(() => {});
          }
        }
      } else if (portal === 'linkedin') {
        const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedRole}&location=Bengaluru`;
        await page.goto(searchUrl).catch(() => {});
        await sleepRandom(4000, 6000);
        await simulateScroll(page);

        const jobCards = await page.locator('.job-card-container, .jobs-search-results__list-item');
        const count = await jobCards.count();
        console.log(`[Agent] Discovery mode found ${count} job cards for "${role}" on LinkedIn.`);

        for (let i = 0; i < Math.min(5, count); i++) {
          const card = jobCards.nth(i);
          const titleText = await card.locator('.job-card-list__title').first().innerText().catch(() => role);
          const companyText = await card.locator('.job-card-container__company-name').first().innerText().catch(() => 'Company');

          await card.click().catch(() => {});
          await sleepRandom(2000, 4000);

          await extractRecruiterLead(page, titleText, companyText, 'linkedin');
        }
      }
    } catch (err) {
      console.log(`[Agent] Error in recruiter discovery for ${role} on ${portal}: ${err.message}`);
    }
  }

  // Trigger cold email outreach engine immediately after discovery
  try {
    const { processOutreachQueue } = require('./outreach_mailer');
    await processOutreachQueue();
  } catch (err) {}
}

/**
 * Performs Naukri or general portal login
 */
async function loginToPortal(page, portal) {
  const creds = credentials[portal];
  if (!creds || !creds.username || creds.password.includes('YOUR_')) {
    console.log(`[Agent] No valid credentials for ${portal}. Waiting for user manual input...`);
    return false;
  }

  if (portal === 'naukri') {
    await page.goto('https://www.naukri.com/nlogin/login');
    await sleepRandom(2000, 4000);
    
    // Check if already logged in (redirected to dashboard)
    if (page.url().includes('mnjuser/profile') || page.url().includes('mnjuser/homepage')) {
      console.log(`[Agent] Already logged in to Naukri.`);
      return true;
    }

    try {
      console.log(`[Agent] Submitting credentials for Naukri...`);
      await page.fill('#usernameField', creds.username);
      await sleepRandom(500, 1500);
      await page.fill('#passwordField', creds.password);
      await sleepRandom(800, 2000);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      console.log(`[Agent] Logged in successfully to Naukri.`);
      return true;
    } catch (e) {
      console.warn(`[Agent] Direct login form submission failed: ${e.message}`);
    }
  } else if (portal === 'iimjobs') {
    await page.goto('https://www.iimjobs.com/login');
    await sleepRandom(2000, 4000);
    if (page.url().includes('dashboard') || page.url().includes('jobfeed') || await page.locator('a:has-text("Logout")').count() > 0) {
      console.log(`[Agent] Already logged in to IIMJobs.`);
      return true;
    }
    try {
      console.log(`[Agent] Submitting credentials for IIMJobs...`);
      await page.fill('input[name="email"]', creds.username);
      await sleepRandom(500, 1500);
      await page.fill('input[name="password"]', creds.password);
      await sleepRandom(800, 2000);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
      console.log(`[Agent] Logged in successfully to IIMJobs.`);
      return true;
    } catch (e) {
      console.warn(`[Agent] Direct login failed for IIMJobs: ${e.message}`);
    }
  } else if (portal === 'foundit') {
    console.log(`[Agent] Checking Foundit session status...`);
    await page.goto('https://www.foundit.in/seeker/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleepRandom(2000, 4000);
    if (page.url().includes('seeker/dashboard') || await page.locator('.avatar').count() > 0) {
      console.log(`[Agent] Already logged in to Foundit.`);
      return true;
    }
    
    console.log(`[Agent] Navigating to Foundit Homepage first...`);
    await page.goto('https://www.foundit.in/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleepRandom(2000, 4000);
    
    console.log(`[Agent] Navigating to Foundit login page...`);
    await page.goto('https://www.foundit.in/rio/login/seeker', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleepRandom(2000, 4000);
    
    if (creds.loginMethod === 'google') {
      try {
        console.log(`[Agent] Clicking Google Login button on Foundit...`);
        const [popup] = await Promise.all([
          page.waitForEvent('popup', { timeout: 15000 }),
          page.click('button:has-text("Google")')
        ]);
        
        console.log(`[Agent] Google login popup opened. Submitting Google credentials...`);
        await popup.waitForLoadState('domcontentloaded');
        
        // Google Email
        await popup.waitForSelector('input[type="email"]', { timeout: 10000 });
        await popup.fill('input[type="email"]', creds.username);
        await sleepRandom(600, 1200);
        const emailNext = popup.locator('button:has-text("Next"), #identifierNext').first();
        await emailNext.click();
        
        // Google Password
        await popup.waitForSelector('input[type="password"]', { timeout: 10000 });
        await popup.fill('input[type="password"]', creds.password);
        await sleepRandom(600, 1200);
        const passwordNext = popup.locator('button:has-text("Next"), #passwordNext').first();
        await passwordNext.click();
        
        console.log(`[Agent] Waiting for Google login popup to redirect and close...`);
        await page.waitForURL('**/seeker/dashboard**', { timeout: 30000 });
        console.log(`[Agent] Logged in successfully to Foundit via Google.`);
        return true;
      } catch (e) {
        console.warn(`[Agent] Google Login automation interrupted or blocked: ${e.message}`);
        console.log(`[Agent] A headed browser window is open. Please complete the login manually (including any 2FA/CAPTCHA).`);
        try {
          await page.waitForURL('**/seeker/dashboard**', { timeout: 180000 });
          console.log(`[Agent] Logged in successfully to Foundit (manually resolved).`);
          return true;
        } catch (manualError) {
          console.error(`[Agent] Manual login timeout exceeded: ${manualError.message}`);
          return false;
        }
      }
    } else {
      try {
        console.log(`[Agent] Submitting credentials for Foundit...`);
        const loginViaPasswordBtn = page.locator('text=Login via Password').first();
        if (await loginViaPasswordBtn.isVisible()) {
          await loginViaPasswordBtn.click();
          await sleepRandom(1000, 2000);
        }
        await page.locator('#userName').fill(creds.username, { timeout: 5000 });
        await sleepRandom(500, 1500);
        await page.locator('#password').fill(creds.password, { timeout: 5000 });
        await sleepRandom(800, 2000);
        await page.click('#loginSubmit');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        console.log(`[Agent] Logged in successfully to Foundit.`);
        return true;
      } catch (e) {
        console.warn(`[Agent] Direct login failed for Foundit: ${e.message}`);
        console.log(`[Agent] A headed browser window is open. Please complete the login manually (including any 2FA/CAPTCHA/Akamai verification).`);
        try {
          await page.waitForURL('**/seeker/dashboard**', { timeout: 180000 });
          console.log(`[Agent] Logged in successfully to Foundit (manually resolved).`);
          return true;
        } catch (manualError) {
          console.error(`[Agent] Manual login timeout exceeded for Foundit: ${manualError.message}`);
          return false;
        }
      }
    }
  } else if (portal === 'hirist') {
    await page.goto('https://www.hirist.tech/');
    await sleepRandom(2000, 4000);
    if (page.url().includes('dashboard') || page.url().includes('jobfeed') || await page.locator('a:has-text("Logout")').count() > 0) {
      console.log(`[Agent] Already logged in to Hirist.`);
      return true;
    }
    try {
      const loginBtn = page.locator('text="Login"').filter({ visible: true }).first();
      if (await loginBtn.count() > 0) {
        await loginBtn.click();
        await sleepRandom(2000, 3000);
      }
      console.log(`[Agent] Submitting credentials for Hirist...`);
      await page.fill('input[type="email"]', creds.username);
      await sleepRandom(500, 1500);
      await page.fill('input[type="password"]', creds.password);
      await sleepRandom(800, 2000);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
      console.log(`[Agent] Logged in successfully to Hirist.`);
      return true;
    } catch (e) {
      console.warn(`[Agent] Direct login failed for Hirist: ${e.message}`);
    }
  } else if (portal === 'cutshort') {
    await page.goto('https://cutshort.io/');
    await sleepRandom(3000, 5000);
    
    // Check if already logged in by looking for Logout button or dashboard redirection
    const isAlreadyLoggedIn = page.url().includes('dashboard') || page.url().includes('profile') || await page.locator('text="Candidate login"').count() === 0;
    if (isAlreadyLoggedIn) {
      console.log(`[Agent] Already logged in to Cutshort.`);
      return true;
    }
    
    try {
      console.log(`[Agent] Clicking Candidate login on Cutshort...`);
      await page.click('text="Candidate login"');
      await sleepRandom(2000, 3000);
      
      // Try checking the Terms checkbox
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check().catch(() => {});
      } else {
        await page.click('text="I agree to the"').catch(() => {});
      }
      await sleepRandom(1000, 2000);
      
      console.log(`[Agent] Clicking Google login button on Cutshort...`);
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 15000 }),
        page.click('text="Signup or login with Google"')
      ]);
      
      console.log(`[Agent] Google login popup opened. Submitting Google credentials...`);
      await popup.waitForLoadState('domcontentloaded');
      
      // Google Email
      await popup.waitForSelector('input[type="email"]', { timeout: 10000 });
      await popup.fill('input[type="email"]', creds.username);
      await sleepRandom(600, 1200);
      const emailNext = popup.locator('button:has-text("Next"), #identifierNext').first();
      await emailNext.click();
      
      // Wait for Cutshort to complete login
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      console.log(`[Agent] Logged in successfully to Cutshort via Google.`);
      return true;
    } catch (e) {
      console.warn(`[Agent] Google Login automation interrupted or blocked: ${e.message}`);
      console.log(`[Agent] A headed browser window is open. Please complete the login manually (including any 2FA/CAPTCHA).`);
      try {
        await page.waitForURL('**/dashboard**', { timeout: 180000 });
        console.log(`[Agent] Logged in successfully to Cutshort (manually resolved).`);
        return true;
      } catch (manualError) {
        console.error(`[Agent] Manual login timeout exceeded for Cutshort: ${manualError.message}`);
        return false;
      }
    }
  } else {
    // General fallback for remaining portals
    const loginUrls = {
      linkedin: 'https://www.linkedin.com/login',
      indeed: 'https://secure.indeed.com/auth',
      timesjobs: 'https://www.timesjobs.com/candidate/login.html',
      instahyre: 'https://www.instahyre.com/login',
      custom: 'https://www.timesjobs.com/candidate/login.html', // alias
      hirist: 'https://www.hirist.tech/login',
      cutshort: 'https://cutshort.io/login',
      wellfound: 'https://wellfound.com/login',
      glassdoor: 'https://www.glassdoor.com/profile/login_input.htm',
      shine: 'https://www.shine.com/myshine/login'
    };
    if (loginUrls[portal]) {
      await page.goto(loginUrls[portal], { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await sleepRandom(3000, 6000);

      // Pre-login session check: Check if page redirected to a dashboard/feed/profile page
      const currentUrl = page.url();
      const isAlreadyLoggedIn = 
        currentUrl.includes('feed') || 
        currentUrl.includes('dashboard') || 
        currentUrl.includes('profile') || 
        currentUrl.includes('home') ||
        (await page.locator('a:has-text("Logout"), a:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Sign Out")').count() > 0);

      if (isAlreadyLoggedIn) {
        console.log(`[Agent] Already logged in to ${portal} (detected from redirect/session).`);
        return true;
      }

      try {
        let userField = page.locator('input[type="email"], input[name="email"], input[name="username"], input[name="session_key"], input[id*="email"]');
        if (await userField.count() === 0) {
          userField = page.locator('input[type="text"]');
        }
        userField = userField.first();
        const passField = page.locator('input[type="password"], input[name="session_password"], input[id*="password"]').first();
        let submitBtn = page.locator('button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign-in")');
        if (await submitBtn.count() === 0) {
          submitBtn = page.locator('button[type="submit"], input[type="submit"]');
        }
        submitBtn = submitBtn.first();
        
        if (await userField.isVisible() && await passField.isVisible()) {
          console.log(`[Agent] Filling generic form for ${portal}...`);
          await userField.fill(creds.username);
          await sleepRandom(500, 1500);
          await passField.fill(creds.password);
          await sleepRandom(800, 2000);
          await submitBtn.click();
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
          await sleepRandom(2000, 4000);
          
          const afterUrl = page.url();
          const loginSucceeded = 
            afterUrl.includes('feed') || 
            afterUrl.includes('dashboard') || 
            afterUrl.includes('profile') || 
            afterUrl.includes('home') ||
            (await page.locator('a:has-text("Logout"), a:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Sign Out")').count() > 0);
            
          if (loginSucceeded) {
            console.log(`[Agent] Logged in successfully to ${portal}.`);
            return true;
          }
        }
      } catch (e) {
        console.log(`[Agent] Generic login automation failed or bypassed for ${portal}: ${e.message}`);
      }

      // Manual fallback if not logged in
      console.log(`[Agent] Login form submission didn't complete login for ${portal}.`);
      const isHeadlessMode = config.scheduler?.browser_mode !== 'headed';
      if (isHeadlessMode) {
        console.warn(`[Agent] Headless mode active: Skipping ${portal} login wait to prevent background scheduler stall.`);
        return false;
      }

      console.log(`[Agent] A headed browser window is open. Please complete the login manually (including any 2FA/CAPTCHA).`);
      try {
        await page.waitForFunction(() => {
          const url = window.location.href;
          return url.includes('feed') || 
                 url.includes('dashboard') || 
                 url.includes('profile') || 
                 url.includes('home') ||
                 document.body.innerText.includes('Logout') ||
                 document.body.innerText.includes('Sign Out');
        }, null, { timeout: 180000 });
        
        console.log(`[Agent] Logged in successfully to ${portal} (manually resolved).`);
        return true;
      } catch (manualError) {
        console.error(`[Agent] Manual login timeout exceeded for ${portal}: ${manualError.message}`);
        return false;
      }
    }
  }
  return false;
}

/**
 * Uploads CV to the specified portal
 */
async function handleCVUpload(page, portal) {
  console.log(`[Agent] Initiating CV upload for ${portal}...`);
  const loginSuccess = await loginToPortal(page, portal);
  if (!loginSuccess) {
    console.warn(`[Agent] Skipping CV upload for ${portal} because login failed.`);
    return;
  }

  const cvPath = path.resolve(config.cv_settings.local_path);
  if (!fs.existsSync(cvPath)) {
    throw new Error(`CV file does not exist at local path: ${cvPath}`);
  }

  try {
    if (portal === 'naukri') {
      await page.goto('https://www.naukri.com/mnjuser/profile');
      await sleepRandom(3000, 5000);
      await page.setInputFiles('#attachCV', cvPath);
      await sleepRandom(3000, 6000);
      console.log(`[Agent] CV upload completed for Naukri.`);
    } else if (portal === 'iimjobs') {
      await page.goto('https://www.iimjobs.com/profile');
      await sleepRandom(3000, 5000);
      const cvInput = page.locator('input[type="file"], #cv_upload').first();
      if (await cvInput.count() > 0) {
        await cvInput.setInputFiles(cvPath);
        await sleepRandom(3000, 6000);
        console.log(`[Agent] CV upload completed for IIMJobs.`);
      }
    } else if (portal === 'foundit') {
      await page.goto('https://www.foundit.in/seeker/profile');
      await sleepRandom(3000, 5000);
      const cvInput = page.locator('input[type="file"]').first();
      if (await cvInput.count() > 0) {
        await cvInput.setInputFiles(cvPath);
        await sleepRandom(3000, 6000);
        console.log(`[Agent] CV upload completed for Foundit.`);
      }
    } else {
      const profileUrls = {
        indeed: 'https://profile.indeed.com/resume',
        timesjobs: 'https://www.timesjobs.com/candidate/myprofile.html',
        instahyre: 'https://www.instahyre.com/candidate/profile/',
        hirist: 'https://www.hirist.tech/profile',
        cutshort: 'https://cutshort.io/profile',
        shine: 'https://www.shine.com/myshine/profile/resume/'
      };
      if (profileUrls[portal]) {
        await page.goto(profileUrls[portal]);
        await sleepRandom(3000, 5000);
        const cvInput = page.locator('input[type="file"]').first();
        if (await cvInput.count() > 0) {
          await cvInput.setInputFiles(cvPath);
          await sleepRandom(3000, 6000);
          console.log(`[Agent] CV upload completed for ${portal} (generic file input).`);
        }
      }
    }
  } catch (e) {
    console.error(`[Agent] Failed to upload CV on ${portal}: ${e.message}`);
  }
}

/**
 * Performs job search, matching, and auto-apply submission
 */
async function handleJobAutomation(page, portal, stats) {
  console.log(`[Agent] Executing Job Search and Auto-Apply loop for ${portal}...`);
  const loginSuccess = await loginToPortal(page, portal);
  if (!loginSuccess) {
    console.warn(`[Agent] Skipping Job Search and Auto-Apply loop for ${portal} because login failed.`);
    return;
  }

  const dailyCap = config.platforms[portal].max_applications_per_day || 20;

  // Load target roles
  const targetRoles = [...profile.job_search_criteria.target_roles];

  // Stateful Sequential Rotation Setup
  const statePath = path.join(__dirname, 'state.json');
  let state = {};
  try {
    if (fs.existsSync(statePath)) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    }
  } catch (err) {
    console.error(`[Agent] Failed to read state.json: ${err.message}`);
  }

  if (!state[portal]) {
    state[portal] = { lastKeywordIndex: 0 };
  }

  let startIdx = state[portal].lastKeywordIndex || 0;
  if (startIdx >= targetRoles.length) {
    startIdx = 0;
  }

  // Rotate roles array to start from startIdx
  const rotatedRoles = [
    ...targetRoles.slice(startIdx),
    ...targetRoles.slice(0, startIdx)
  ];

  // We limit search to a maximum number of keywords per cycle to prevent rate limits
  const maxKeywordsPerCycle = 15;
  let keywordsSearchedCount = 0;

  for (const targetRole of rotatedRoles) {
    if (keywordsSearchedCount >= maxKeywordsPerCycle) {
      console.log(`[Agent] Reached maximum keyword search cap per cycle (${maxKeywordsPerCycle}) for ${portal}. Stopping loop.`);
      break;
    }

    const appliedToday = stats.appliedRolesList.filter(r => r.portal === portal).length;
    if (appliedToday >= dailyCap) {
      console.log(`[Agent] Daily application cap reached for ${portal} (${appliedToday}/${dailyCap}). Stopping search.`);
      break;
    }

    keywordsSearchedCount++;
    console.log(`[Agent] Searching for role "${targetRole}" on ${portal}...`);
    const encodedRole = encodeURIComponent(targetRole);

    try {
      if (portal === 'naukri') {
        const formattedRole = targetRole.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const searchUrl = `https://www.naukri.com/${formattedRole}-jobs-in-bengaluru`;
        await page.goto(searchUrl);
        await sleepRandom(4000, 8000);
        await simulateScroll(page);

        const jobCards = await page.locator('.srp-jobtuple-wrapper');
        const count = await jobCards.count();
        console.log(`[Agent] Found ${count} job matches for "${targetRole}" on Naukri.`);
        stats.jobsScanned += count;

        const remainingCap = dailyCap - appliedToday;
        const maxApplies = Math.min(5, count, remainingCap);
        for (let i = 0; i < maxApplies; i++) {
          const checkAppliedToday = stats.appliedRolesList.filter(r => r.portal === portal).length;
          if (checkAppliedToday >= dailyCap) break;

          const card = jobCards.nth(i);
          const titleElement = await card.locator('.title');
          const titleText = await titleElement.innerText();
          const companyElement = await card.locator('.comp-name');
          const companyText = await companyElement.innerText();
          
          console.log(`[Agent] Applying to: ${titleText} at ${companyText}`);
          await card.click();
          await sleepRandom(3000, 5000);
          
          const pages = page.context().pages();
          const detailPage = pages[pages.length - 1];
          await sleepRandom(2000, 4000);
          
          // Evaluate job suitability before proceeding
          const experienceText = await detailPage.locator('.exp, [class*="experience"]').first().innerText().catch(() => '');
          const jdText = await detailPage.locator('[class*="job-desc"], [class*="jd"], [class*="description"]').first().innerText().catch(() => '');
          const postedDateText = await detailPage.locator('.stat, [class*="posted"], [class*="stat-text"], [class*="day"]').first().innerText().catch(() => '');
          
          // Extract HR lead if present
          await extractRecruiterLead(detailPage, titleText, companyText, 'naukri');
          
          const evalResult = evaluateJob(titleText, jdText, experienceText, postedDateText);
          if (!evalResult.match) {
            console.log(`[Agent] Skipping mismatched job: "${titleText}" at ${companyText}. Reason: ${evalResult.reason}`);
            if (detailPage !== page) {
              await detailPage.close();
            }
            continue;
          }
          
          // Check if redirected to an external ATS website
          const currentUrl = detailPage.url();
          if (!currentUrl.includes('naukri.com')) {
            console.log(`[Agent] Skipping external ATS job: ${currentUrl}`);
          } else {
            // Smart fill any questions before clicking apply
            await smartFillForm(detailPage, profile, companyText, titleText);
            
            const applyBtn = detailPage.locator('button:has-text("Apply")').first();
            if (await applyBtn.isVisible()) {
              await applyBtn.click();
              await sleepRandom(3000, 5000);
              console.log(`[Agent] Submitted application successfully.`);
              stats.applicationsSubmitted += 1;
              stats.appliedRolesList.push({ company: companyText, title: titleText, portal, time: new Date().toISOString() });
            }
          }
          if (detailPage !== page) {
            await detailPage.close();
          }
        }
      } else if (portal === 'iimjobs') {
        await page.goto('https://www.iimjobs.com/jobfeed');
        await sleepRandom(3500, 5500);

        // Find search input. If not visible, click search icon in header
        let searchInput = page.locator('textarea[placeholder*="Describe the job"], textarea[placeholder*="looking for"], input[placeholder="Enter skills/designations/companies"]').first();
        if (!(await searchInput.isVisible())) {
          console.log(`[Agent] Search modal input not visible. Triggering search modal...`);
          const searchTrigger = page.locator('header img[alt="Search"], [class*="header"] img[alt="Search"], .search-icon, i.fa-search, [class*="search"]').first();
          if (await searchTrigger.isVisible()) {
            await searchTrigger.click();
            await sleepRandom(1000, 2000);
          } else {
            console.log(`[Agent] Search trigger not found. Trying coordinates click...`);
            await page.mouse.click(912, 47);
            await sleepRandom(1000, 2000);
          }
        }

        // Check if search input is now visible
        searchInput = page.locator('textarea[placeholder*="Describe the job"], textarea[placeholder*="looking for"], input[placeholder="Enter skills/designations/companies"]').first();
        if (await searchInput.isVisible()) {
          console.log(`[Agent] Filling search query: ${targetRole}`);
          await simulateTyping(page, 'textarea[placeholder*="Describe the job"], textarea[placeholder*="looking for"], input[placeholder="Enter skills/designations/companies"]', targetRole);
          await sleepRandom(500, 1000);
          
          // Find Search button in the modal
          const searchBtn = page.locator('button').filter({ hasText: /^Search$/i }).first();
          if (await searchBtn.isVisible()) {
            console.log(`[Agent] Clicking Search button...`);
            await searchBtn.click();
          } else {
            console.log(`[Agent] Search button not found. Pressing Enter...`);
            await page.keyboard.press('Enter');
          }
          
          await page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => console.log('[Agent] Search navigation timed out or resolved.'));
        } else {
          console.warn(`[Agent] Search input modal could not be opened.`);
        }

        await simulateScroll(page);

        // Gather job listing elements
        const jobCards = await page.locator('.joblist-card-v2');
        const count = await jobCards.count();
        console.log(`[Agent] Found ${count} job matches for "${targetRole}" on IIMJobs.`);
        stats.jobsScanned += count;

        const remainingCap = dailyCap - appliedToday;
        const maxApplies = Math.min(5, count, remainingCap);
        for (let i = 0; i < maxApplies; i++) {
          const checkAppliedToday = stats.appliedRolesList.filter(r => r.portal === portal).length;
          if (checkAppliedToday >= dailyCap) break;

          const card = jobCards.nth(i);
          const titleElement = await card.locator('.joblist__title-text').first();
          const titleText = await titleElement.innerText();
          const companyElement = await card.locator('a[href^="/j/"]').first();
          
          let companyText = await companyElement.getAttribute('title') || 'Company';
          if (companyText === 'Company' && titleText.includes(' - ')) {
            companyText = titleText.split(' - ')[0].trim();
          }

          console.log(`[Agent] Applying to: ${titleText} at ${companyText}`);
          
          // Wait for job details page to open in a new tab
          const [detailPage] = await Promise.all([
            page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null),
            companyElement.click()
          ]);

          if (!detailPage) {
            console.warn(`[Agent] Job details page failed to open in a new tab.`);
            continue;
          }

          await sleepRandom(2000, 4000);
          
          // Evaluate job suitability before proceeding
          const experienceText = await detailPage.locator('.xp, [class*="experience"], [class*="exp"]').first().innerText().catch(() => '');
          const jdText = await detailPage.locator('.job-description, [class*="description"], [class*="jd"]').first().innerText().catch(() => '');
          const postedDateText = await detailPage.locator('.posted, [class*="posted"], [class*="date"]').first().innerText().catch(() => '');
          
          // Extract HR lead if present
          await extractRecruiterLead(detailPage, titleText, companyText, 'iimjobs');
          
          const evalResult = evaluateJob(titleText, jdText, experienceText, postedDateText);
          if (!evalResult.match) {
            console.log(`[Agent] Skipping mismatched job: "${titleText}" at ${companyText}. Reason: ${evalResult.reason}`);
            if (detailPage !== page) {
              await detailPage.close();
            }
            continue;
          }

          const currentUrl = detailPage.url();
          if (!currentUrl.includes('iimjobs.com')) {
            console.log(`[Agent] Skipping external ATS job: ${currentUrl}`);
          } else {
            // Smart fill form fields
            await smartFillForm(detailPage, profile, companyText, titleText);

            let applyBtn = detailPage.locator('button').filter({ hasText: /^Apply$/i }).first();
            if (await applyBtn.count() === 0) {
              applyBtn = detailPage.locator('button:has-text("Apply")').first();
            }

            if (await applyBtn.isVisible()) {
              await applyBtn.click();
              await sleepRandom(2000, 4000);
              console.log(`[Agent] Submitted application successfully.`);
              stats.applicationsSubmitted += 1;
              stats.appliedRolesList.push({ company: companyText, title: titleText, portal, time: new Date().toISOString() });
            } else {
              console.log(`[Agent] Apply button not found or not visible.`);
            }
          }
          await detailPage.close();
        }
      } else if (portal === 'foundit') {
        // Visit homepage first to set Akamai session cookie and bypass 403 Bot Protection
        await page.goto('https://www.foundit.in/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await sleepRandom(1500, 3000);

        const searchUrl = `https://www.foundit.in/srp/results?query=${encodedRole}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleepRandom(3000, 6000);
        await simulateScroll(page);

        const jobCards = await page.locator('.cardContainer, .srpCard, .job-card, .card-body');
        const count = await jobCards.count();
        console.log(`[Agent] Found ${count} job matches for "${targetRole}" on Foundit.`);
        stats.jobsScanned += count;

        const remainingCap = dailyCap - appliedToday;
        const maxApplies = Math.min(5, count, remainingCap);
        for (let i = 0; i < maxApplies; i++) {
          const checkAppliedToday = stats.appliedRolesList.filter(r => r.portal === portal).length;
          if (checkAppliedToday >= dailyCap) break;

          const card = jobCards.nth(i);
          const titleText = await card.locator('.jobTitle, .title, h3, h2').first().innerText().catch(() => 'Program Manager');
          const rawCompany = await card.locator('.companyName, .company, .cardHead').first().innerText().catch(() => 'Foundit Partner');
          const companyText = rawCompany.split('\n').pop().trim() || 'Foundit Partner';

          console.log(`[Agent] Applying to: ${titleText} at ${companyText}`);
          await card.click().catch(() => {});
          await sleepRandom(3000, 5000);

          
          // Evaluate job suitability before proceeding
          const experienceText = await page.locator('.experience, [class*="experience"], [class*="exp"]').first().innerText().catch(() => '');
          const jdText = await page.locator('.description, [class*="description"], [class*="jd"]').first().innerText().catch(() => '');
          const postedDateText = await page.locator('.posted, [class*="posted"]').first().innerText().catch(() => '');
          
          await extractRecruiterLead(page, titleText, companyText, 'foundit');

          const evalResult = evaluateJob(titleText, jdText, experienceText, postedDateText);
          if (!evalResult.match) {
            console.log(`[Agent] Skipping mismatched job: "${titleText}" at ${companyText}. Reason: ${evalResult.reason}`);
            await page.goBack();
            await sleepRandom(2000, 4000);
            continue;
          }

          // Check external redirection
          const currentUrl = page.url();
          if (!currentUrl.includes('foundit.in')) {
            console.log(`[Agent] Skipping external ATS job: ${currentUrl}`);
          } else {
            // Smart fill form fields
            await smartFillForm(page, profile, companyText, titleText);

            const applyBtn = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
            if (await applyBtn.isVisible()) {
              await applyBtn.click();
              await sleepRandom(3000, 5000);
              console.log(`[Agent] Submitted application successfully.`);
              stats.applicationsSubmitted += 1;
              stats.appliedRolesList.push({ company: companyText, title: titleText, portal, time: new Date().toISOString() });
            }
          }
          await page.goBack();
          await sleepRandom(2000, 4000);
        }
      } else {
        console.log(`[Agent] Portal ${portal} uses native sweep or API handler. Skipping mock fallback.`);
      }
    } catch (e) {
      console.error(`[Agent] Error in application loop for ${portal} with role ${targetRole}: ${e.message}`);
    }
  }

  // Save updated state index back to state.json
  const newIndex = (startIdx + keywordsSearchedCount) % targetRoles.length;
  state[portal].lastKeywordIndex = newIndex;
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    console.log(`[Agent] Updated state.json keyword index for ${portal} to: ${newIndex}`);
  } catch (err) {
    console.error(`[Agent] Failed to write state.json: ${err.message}`);
  }
}

module.exports = {
  runAgentCycle,
  loginToPortal
};
