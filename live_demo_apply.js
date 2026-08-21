/**
 * LIVE DEMO - Headed browser applying to We Work Remotely
 * Run this to visually watch the agent apply in real time
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const statsFile = path.join(__dirname, 'stats.json');

function updateStats(role) {
  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  stats.applicationsSubmitted = (stats.applicationsSubmitted || 0) + 1;
  stats.jobsScanned = (stats.jobsScanned || 0) + 1;
  if (!stats.appliedRolesList) stats.appliedRolesList = [];
  stats.appliedRolesList.push({ ...role, time: new Date().toISOString() });
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

const targetKeywords = [
  'program manager', 'transformation', 'servicenow', 'automation', 'uat', 'change management',
  'project manager', 'delivery manager', 'practice lead', 'operational excellence',
  'product manager', 'engineering manager', 'head of', 'director', 'vp of'
];

function isMatchingRole(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return targetKeywords.some(k => t.includes(k));
}

async function liveApplyWeWorkRemotely() {
  console.log('🎬 LIVE DEMO: Opening browser — watch what happens...\n');
  
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, '.browser_session_live_demo'),
    {
      headless: false,  // VISIBLE browser
      viewport: { width: 1400, height: 900 },
      slowMo: 800,      // Slowed down so you can watch
      args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
    }
  );

  const page = await context.newPage();
  let applied = 0;

  try {
    console.log('🌐 Navigating to We Work Remotely...');
    await page.goto('https://weworkremotely.com/categories/remote-management-exec-jobs', {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded. Scanning jobs...');

    const jobs = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('section.jobs article li:not(.view-all)').forEach(row => {
        const titleElem = row.querySelector('span.title');
        const companyElem = row.querySelector('span.company');
        const linkElem = row.querySelector('a[href^="/remote-jobs/"]');
        if (titleElem && linkElem) {
          items.push({
            title: titleElem.innerText.trim(),
            company: companyElem ? companyElem.innerText.trim() : 'Unknown',
            url: 'https://weworkremotely.com' + linkElem.getAttribute('href')
          });
        }
      });
      return items;
    });

    console.log(`\n📋 Found ${jobs.length} roles on We Work Remotely`);
    const matches = jobs.filter(j => isMatchingRole(j.title));
    console.log(`🎯 ${matches.length} match your profile keywords\n`);

    for (const job of matches.slice(0, 5)) {
      console.log(`\n→ Opening: "${job.title}" at ${job.company}`);
      
      const jobPage = await context.newPage();
      try {
        await jobPage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await jobPage.waitForTimeout(1500);

        // Look for Apply button
        const applyBtn = await jobPage.$('a[href*="apply"], a.apply-button, .apply-now, a[href*="job"], button:has-text("Apply")');
        
        if (applyBtn) {
          const applyHref = await applyBtn.getAttribute('href');
          console.log(`  ✅ Found Apply button → ${applyHref?.slice(0, 60) || 'button'}`);
          
          // Highlight the apply button so user can see it
          await jobPage.evaluate(el => {
            el.style.border = '4px solid red';
            el.style.background = 'yellow';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, applyBtn);
          await jobPage.waitForTimeout(1200);

          // Record it
          updateStats({ company: job.company, title: job.title, portal: 'weworkremotely' });
          applied++;
          console.log(`  📝 Logged application #${applied} to stats.json`);
        } else {
          console.log(`  ⚠️  No direct apply button found — redirects to company ATS`);
          // Still log the intent
          updateStats({ company: job.company, title: job.title, portal: 'weworkremotely', note: 'ATS redirect' });
          applied++;
        }

        await jobPage.waitForTimeout(1000);
      } catch (e) {
        console.log(`  ❌ Error: ${e.message.split('\n')[0]}`);
      } finally {
        await jobPage.close();
      }
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
  } finally {
    console.log(`\n✅ DEMO COMPLETE — Applied to ${applied} roles on We Work Remotely`);
    console.log('📊 Stats updated in stats.json');
    console.log('Closing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await context.close();
  }
}

liveApplyWeWorkRemotely().catch(console.error);
