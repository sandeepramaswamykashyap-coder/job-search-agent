/**
 * LIVE LINKEDIN CONNECTION SENDER
 * Sends REAL personalized LinkedIn connection requests right now.
 * Headed mode (visible browser) so you can watch it happen on screen.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session');
const connectionsFile = path.join(__dirname, 'connection_requests.json');

function buildNote(name, title, company) {
  const firstName = (name || '').split(' ')[0] || 'there';
  let note = `Hi ${firstName}, I noticed your work in ${title || 'Transformation'} at ${company || 'your org'}. I have 14+ yrs leading Program Transformation, ServiceNow HRSD & UAT at Standard Chartered (30-day notice). Would love to connect!`;
  if (note.length > 295) {
    note = `Hi ${firstName}, I bring 14+ yrs leading Transformation, ServiceNow HRSD & UAT at Standard Chartered Bank (30-day notice). Would love to connect with you at ${company || 'your org'}!`;
  }
  return note;
}

// Target recruiters & hiring managers to connect with
const TARGETS = [
  { name: 'Vikram Akundy', company: 'Capgemini', title: 'VP Transformation', profileUrl: 'https://www.linkedin.com/in/vikramakundy/' },
  { name: 'Naveen Krishnamurthy', company: 'EPAM Systems', title: 'Delivery Director', profileUrl: null },
  { name: 'Priya Ramachandran', company: 'Miratech', title: 'HR Business Partner', profileUrl: null },
  { name: 'Rajesh Sharma', company: 'NTT DATA', title: 'Program Manager', profileUrl: null },
  { name: 'Sneha Kulkarni', company: 'PwC India', title: 'Talent Acquisition Lead', profileUrl: null },
];

async function sendLiveLinkedInConnections() {
  console.log(`================================================================`);
  console.log(`🚀 LIVE LINKEDIN PERSONALIZED CONNECTION SENDER`);
  console.log(`Mode: VISIBLE HEADED (headless: false) — Watch on screen`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log(`================================================================\n`);

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 800,
    viewport: { width: 1366, height: 768 },
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await ctx.newPage();
  
  // Check login
  console.log(`[LinkedIn] Verifying LinkedIn session...`);
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  if (page.url().includes('login') || page.url().includes('authwall')) {
    console.log(`[LinkedIn] ❌ SESSION EXPIRED — Please log into LinkedIn first.`);
    await ctx.close();
    return;
  }
  console.log(`[LinkedIn] ✅ Session active. LinkedIn feed loaded.`);

  let sent = 0;
  let logs = [];
  if (fs.existsSync(connectionsFile)) {
    try { logs = JSON.parse(fs.readFileSync(connectionsFile, 'utf8')); } catch (e) {}
  }

  for (const target of TARGETS) {
    console.log(`\n─────────────────────────────────────────────`);
    console.log(`[LinkedIn] Target: ${target.name} | ${target.title} @ ${target.company}`);
    
    const note = buildNote(target.name, target.title, target.company);
    console.log(`[LinkedIn] Personalized Note: "${note}"`);

    // Navigate to profile or search
    let targetUrl = target.profileUrl;
    if (!targetUrl) {
      const searchQuery = `${target.name} ${target.company}`;
      console.log(`[LinkedIn] Searching for profile: "${searchQuery}"`);
      await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const foundUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
        const match = links.find(a => a.href && a.href.includes('/in/') && !a.href.includes('/in/ACoA'));
        return match ? match.href.split('?')[0] : null;
      });

      if (foundUrl) {
        targetUrl = foundUrl;
        console.log(`[LinkedIn] Found profile: ${targetUrl}`);
      } else {
        console.warn(`[LinkedIn] ⚠️ Could not find profile for ${target.name}. Skipping.`);
        continue;
      }
    }

    // Navigate to profile
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Hide message overlay
    await page.evaluate(() => {
      document.querySelectorAll('.msg-overlay-container, #msg-overlay, div[class*="msg-overlay"]').forEach(el => el.style.display = 'none');
    }).catch(() => {});

    // Find Connect button
    const buttonCenter = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], a'));
      const connectEl = all.find(el => {
        const text = (el.innerText || '').trim();
        const rect = el.getBoundingClientRect();
        return (text === 'Connect' || text === '+ Connect') && rect.left > 50 && rect.left < 400 && rect.top > 100 && rect.top < 700;
      });
      if (connectEl) {
        const rect = connectEl.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, tag: connectEl.tagName };
      }
      return null;
    }).catch(() => null);

    if (!buttonCenter) {
      console.warn(`[LinkedIn] ⚠️ Connect button not found on profile for ${target.name}. May already be connected or following.`);
      continue;
    }

    console.log(`[LinkedIn] Clicking Connect button at (${buttonCenter.x.toFixed(0)}, ${buttonCenter.y.toFixed(0)})...`);
    await page.mouse.click(buttonCenter.x, buttonCenter.y);
    await page.waitForTimeout(2500);

    // Handle "How do you know" modal
    const knowOther = page.locator('button:has-text("Other"), label:has-text("Other")').first();
    if (await knowOther.isVisible().catch(() => false)) {
      await knowOther.click().catch(() => {});
      await page.waitForTimeout(1000);
      const next = page.locator('button:has-text("Connect")').first();
      if (await next.isVisible().catch(() => false)) {
        await next.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    // Click "Add a note" button and type personalized message
    const addNoteBtn = page.locator('button:has-text("Add a note")').first();
    const sendWithoutBtn = page.locator('button:has-text("Send without a note")').first();

    if (await addNoteBtn.isVisible().catch(() => false)) {
      console.log(`[LinkedIn] Clicking "Add a note" to type personalized message...`);
      await addNoteBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);

      const textarea = page.locator('textarea[name="message"], textarea').first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(note);
        console.log(`[LinkedIn] ✍️ Personalized note typed: "${note.substring(0, 60)}..."`);
        await page.waitForTimeout(1000);
      }

      const sendBtn = page.locator('button:has-text("Send"), button:has-text("Send invitation")').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(4000);
        console.log(`[LinkedIn] 📤 Invitation sent with personalized note!`);
      }
    } else if (await sendWithoutBtn.isVisible().catch(() => false)) {
      // Even without note modal, send — but log this
      await sendWithoutBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(4000);
      console.log(`[LinkedIn] 📤 Sent without note (no note modal appeared).`);
    } else {
      console.warn(`[LinkedIn] ⚠️ Neither "Add a note" nor "Send without a note" found. Modal may not have opened.`);
      continue;
    }

    // MANDATORY VERIFICATION: Reload & check Pending
    console.log(`[LinkedIn] Reloading profile to verify Pending status...`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const isPending = await page.evaluate(() => document.body.innerText.includes('Pending')).catch(() => false);

    if (isPending) {
      console.log(`[LinkedIn] ✅ VERIFIED PENDING — Invitation confirmed delivered to ${target.name}!`);
      
      // Remove old placeholder entries for this person
      logs = logs.filter(l => l.name !== 'Leader');
      
      logs.push({
        name: target.name,
        company: target.company,
        title: target.title,
        profileUrl: targetUrl,
        note: note,
        status: 'SENT',
        personalizedNote: true,
        verifiedAt: new Date().toISOString()
      });
      fs.writeFileSync(connectionsFile, JSON.stringify(logs, null, 2), 'utf8');
      sent++;
    } else {
      console.warn(`[LinkedIn] ⚠️ Pending NOT verified for ${target.name} after reload.`);
    }

    // Wait 45 seconds between connections
    if (sent < TARGETS.length - 1) {
      console.log(`[LinkedIn] Waiting 45 seconds before next connection (account safety)...`);
      await page.waitForTimeout(45000);
    }
  }

  await ctx.close();

  console.log(`\n================================================================`);
  console.log(`✅ LIVE LINKEDIN CONNECTION SESSION COMPLETE`);
  console.log(`Total Real Verified Connections Sent This Session: ${sent}`);
  console.log(`================================================================`);
}

sendLiveLinkedInConnections().catch(console.error);
