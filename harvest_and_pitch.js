/**
 * Instant Recruiter Lead Harvester & Email Pitcher
 * Crawls fresh job postings on Naukri & IIMJobs, extracts genuine HR recruiter emails,
 * and immediately dispatches customized cold pitches with Sandeep_Kashyap.pdf attached.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const { processOutreachQueue } = require('./outreach_mailer');

async function harvestAndPitch() {
  console.log("[Harvester] 🚀 Starting instant Recruiter Lead Harvest & Email Pitch run...");
  
  const userDataDir = path.join(__dirname, '.browser_session');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await context.newPage();
  const targetRoles = [
    'Transformation Program Manager',
    'Service Transition Manager',
    'Business Transformation Manager',
    'ServiceNow HRSD Practice Lead',
    'UAT Program Manager'
  ];

  let newLeadsFound = 0;

  for (const role of targetRoles) {
    console.log(`[Harvester] Searching fresh job postings for "${role}"...`);
    try {
      const formattedRole = role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const searchUrl = `https://www.naukri.com/${formattedRole}-jobs-in-bengaluru`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5000);

      const jobCards = page.locator('.srp-jobtuple-wrapper');
      const count = await jobCards.count();
      console.log(`[Harvester] Found ${count} job cards for "${role}". Inspecting for recruiter contacts...`);

      for (let i = 0; i < Math.min(10, count); i++) {
        const card = jobCards.nth(i);
        const titleText = await card.locator('.title').first().innerText().catch(() => role);
        const companyText = await card.locator('.comp-name').first().innerText().catch(() => 'Company');

        await card.locator('.title').first().click().catch(() => {});
        await page.waitForTimeout(3000);

        const pages = context.pages();
        const detailPage = pages[pages.length - 1];
        await detailPage.bringToFront().catch(() => {});

        const pageContent = await detailPage.content().catch(() => '');
        const emailMatches = pageContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        
        const filteredEmails = emailMatches.filter(e => {
          const email = e.toLowerCase().trim();
          if (email.endsWith('.jpg') || email.endsWith('.png') || email.endsWith('.jpeg') || email.endsWith('.svg') || email.endsWith('.webp')) return false;
          if (email.includes('naukri.com') || email.includes('iimjobs.com') || email.includes('foundit.in') || email.includes('indeed.com') || email.includes('glassdoor.com') || email.includes('w3.org') || email.includes('schema.org') || email.includes('sentry.io') || email.includes('playwright') || email.includes('webpack') || email.includes('example.com')) return false;
          if (email.startsWith('careers@') || email.startsWith('hr@') || email.startsWith('ta@') || email.startsWith('jobs@') || email.startsWith('support@') || email.startsWith('info@') || email.startsWith('no-reply@')) return false;
          return true;
        });

        if (filteredEmails.length > 0) {
          const recruiterEmail = filteredEmails[0];
          const leadsFile = path.join(__dirname, 'recruiter_leads.json');
          let leads = [];
          if (fs.existsSync(leadsFile)) {
            try { leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8')); } catch (e) {}
          }
          if (!leads.some(l => l.email.toLowerCase() === recruiterEmail.toLowerCase())) {
            leads.push({
              email: recruiterEmail,
              company: companyText,
              title: titleText,
              portal: 'naukri_live',
              extractedAt: new Date().toISOString()
            });
            fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), 'utf8');
            console.log(`[Harvester] 🔥 NEW RECRUITER LEAD CAPTURED: ${recruiterEmail} (${titleText} at ${companyText})`);
            newLeadsFound++;
          }
        }

        if (detailPage !== page) {
          await detailPage.close().catch(() => {});
        }
        await page.bringToFront().catch(() => {});
      }
    } catch (err) {
      console.log(`[Harvester] Error searching for ${role}: ${err.message}`);
    }
  }

  await context.close();
  console.log(`[Harvester] Harvesting complete. Total new HR leads captured: ${newLeadsFound}`);

  // Trigger cold email dispatcher immediately
  console.log("[Harvester] 📧 Triggering cold email dispatch engine...");
  await processOutreachQueue();
  console.log("[Harvester] ✅ Harvest & Pitch run completed!");
}

harvestAndPitch().catch(err => console.error("Harvester error:", err));
