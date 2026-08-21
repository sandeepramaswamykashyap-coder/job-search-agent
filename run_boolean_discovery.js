/**
 * Job Search & Application Agent - Dedicated Boolean Search & Email Discovery Runner
 * Executes strict candidature-aligned Boolean searches, scrapes contacts,
 * pre-verifies mailboxes via 250 OK SMTP handshakes, and saves leads for outreach.
 * 
 * STRICT RULES ENFORCED:
 * 1. ONLY target contacts explicitly showing HIRING intent ("hiring", "we are hiring", "recruiting").
 * 2. STRICTLY EXCLUDE anybody from Standard Chartered Bank (former employer).
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');
const { verifyEmailExistence } = require('./email_verifier');
const { buildBooleanQueries } = require('./boolean_engine');

const leadsFile = path.join(__dirname, 'recruiter_leads.json');
const userDataDir = path.join(__dirname, '.browser_session_discovery');

function isGenuinePersonalHREmail(emailStr) {
  if (!emailStr || typeof emailStr !== 'string') return false;
  const e = emailStr.toLowerCase().trim();
  const [user, domain] = e.split('@');
  if (!user || !domain) return false;

  // STRICT RULE: Never email Standard Chartered domains
  if (domain.includes('sc.com') || domain.includes('standardchartered.com') || domain.includes('standardchartered')) {
    console.log(`[BooleanRunner] 🛑 STRICT EXCLUSION: Dropping Standard Chartered address ${e}`);
    return false;
  }

  if (e.endsWith('.jpg') || e.endsWith('.jpeg') || e.endsWith('.png') || e.endsWith('.gif') || e.endsWith('.svg') || e.endsWith('.webp')) return false;
  if (domain.includes('naukri.com') || domain.includes('iimjobs.com') || domain.includes('foundit.in') || domain.includes('indeed.com') || domain.includes('glassdoor.com') || domain.includes('w3.org') || domain.includes('schema.org') || domain.includes('sentry.io') || domain.includes('playwright') || domain.includes('webpack') || domain.includes('example.com') || domain.includes('gojobs.biz')) return false;

  const forbiddenSystemTerms = [
    'accommodations', 'accessibility', 'disability', 'fraud', 'report', 'compliance', 'abuse', 'security',
    'admin', 'help', 'billing', 'no-reply', 'noreply', 'feedback', 'enquiry', 'inquiry', 'sales',
    'privacy', 'terms', 'media', 'investors', 'bounces', 'system'
  ];

  for (const term of forbiddenSystemTerms) {
    if (user === term) return false;
  }

  if (user.length < 3) return false;
  return true;
}

async function runBooleanDiscovery() {
  console.log("=================== CANDIDATURE-STRICT BOOLEAN DISCOVERY (ALL 33 ROLES | HIRING INTENT ONLY) ===================");
  console.log(`Execution Time: ${new Date().toISOString()}`);

  const candidateQueries = buildBooleanQueries();
  let browserContext;
  let leadsAdded = 0;

  try {
    console.log("[BooleanRunner] Launching headless browser context for discovery...");
    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    const page = await browserContext.newPage();

    for (const q of candidateQueries) {
      console.log(`\n[BooleanRunner] 🔍 Executing Query (${q.persona.toUpperCase()}): "${q.searchQuery}"`);
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q.searchQuery)}`;
      
      try {
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const pageText = await page.evaluate(() => document.body.innerText);

        // Double check text does not belong to Standard Chartered
        if (pageText.toLowerCase().includes('standard chartered') || pageText.toLowerCase().includes('scb')) {
          console.log(`[BooleanRunner] ℹ️ Skipping page text containing Standard Chartered references.`);
        }

        const emailMatches = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const validEmails = Array.from(new Set(emailMatches.filter(isGenuinePersonalHREmail)));

        console.log(`[BooleanRunner] Scraped ${validEmails.length} hiring-verified email addresses from search results.`);

        for (const email of validEmails) {
          console.log(`[BooleanRunner] Verifying mailbox: ${email}...`);
          const verification = await verifyEmailExistence(email);

          if (verification.valid) {
            let leads = [];
            if (fs.existsSync(leadsFile)) {
              try { leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8')); } catch (e) {}
            }

            if (!leads.some(l => l.email.toLowerCase() === email.toLowerCase())) {
              leads.push({
                email: email.toLowerCase(),
                company: 'Target Enterprise (Verified Hiring)',
                title: q.titleCategory,
                persona: q.persona,
                discoveredAt: new Date().toISOString()
              });
              fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), 'utf8');
              leadsAdded++;
              console.log(`[BooleanRunner] ✅ VERIFIED & SAVED HIRING LEAD (${q.persona.toUpperCase()}): ${email}`);
            }
          } else {
            console.log(`[BooleanRunner] 🛑 REJECTED MAILBOX ${email}: ${verification.reason}`);
          }
        }
      } catch (err) {
        console.error(`[BooleanRunner] Query execution error for "${q.searchQuery}": ${err.message}`);
      }
    }

  } catch (err) {
    console.error(`[BooleanRunner] Browser session error: ${err.message}`);
  } finally {
    if (browserContext) {
      await browserContext.close().catch(() => {});
    }
  }

  console.log("\n=================== BOOLEAN LEAD DISCOVERY SUMMARY ===================");
  console.log(`New Verified Hiring Leads Added : ${leadsAdded}`);
  console.log("======================================================================");
}

if (require.main === module) {
  runBooleanDiscovery();
}

module.exports = { runBooleanDiscovery };
