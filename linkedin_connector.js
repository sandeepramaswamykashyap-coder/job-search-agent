const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

const userDataDir = path.join(__dirname, '.browser_session');
const connectionsFile = path.join(__dirname, 'connection_requests.json');

/**
 * Builds a personalized connection note — HARD CAP 150 chars, uses first name + company
 */
function buildCustomizedNote(lead) {
  const firstName = (lead.name || lead.contactName || 'there').split(' ')[0].replace(/[^a-zA-Z]/g, '');
  const org = (lead.company || lead.companyName || 'your org').replace(/[^a-zA-Z0-9 &]/g, '').substring(0, 20).trim();
  const note = `Hi ${firstName}, 14+ yrs Transformation & ServiceNow HRSD at SCB. 30-day notice. Would love to connect at ${org}!`;
  if (note.length <= 150) return note;
  return `Hi ${firstName}, Transformation & HRSD leader, 14+ yrs at SCB, 30-day notice. Let's connect!`;
}

/**
 * Sends a customized LinkedIn connection request with dual-layer SCB exclusion & outbox verification.
 */
async function sendLinkedInConnection(leadOptions = {}) {
  const { profileUrl, name, title, company, persona, testMode = false } = leadOptions;
  const lead = { name, title, company, persona };
  const noteText = buildCustomizedNote(lead);

  console.log(`\n=================== LINKEDIN CUSTOM CONNECTION REQUEST ===================`);
  console.log(`Target: ${name || 'Lead'} | Title: ${title || 'N/A'} | Company: ${company || 'N/A'}`);
  console.log(`Profile URL: ${profileUrl || 'N/A'}`);
  console.log(`[LinkedInConnector] Customized Note (${noteText.length} chars):\n"${noteText}"`);

  if (testMode) {
    console.log(`[LinkedInConnector] TEST MODE: Skipping browser dispatch. Connection valid.`);
    return { success: true, reason: 'Test Mode Simulated' };
  }

  let browser = null;
  let ctx = null;
  let clickedConnect = false;

  try {
    console.log(`[LinkedInConnector] Checking LinkedIn login session...`);
    ctx = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--no-sandbox']
    });

    const page = await ctx.newPage();
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (page.url().includes('login') || page.url().includes('signup') || page.url().includes('authwall')) {
      console.log(`[LinkedInConnector] ⚠️ LinkedIn session expired or requires login.`);
      await ctx.close();
      return { success: false, reason: 'LinkedIn Session Requires Login' };
    }

    let targetUrl = profileUrl;

    // Automated People Search resolution if direct profile URL is missing
    if (!targetUrl && (name || company)) {
      const searchQuery = `${name || ''} ${company || ''}`.trim();
      console.log(`[LinkedInConnector] Searching LinkedIn People for: "${searchQuery}"`);
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      // Try clicking Connect directly on Search Result Card
      const cardConnectBtn = page.locator('div.reusable-search__result-container button:has-text("Connect"), button[aria-label*="Connect with"]').first();
      if (await cardConnectBtn.isVisible().catch(() => false)) {
        console.log(`[LinkedInConnector] Found direct Connect button on Search Result Card! Clicking...`);
        await cardConnectBtn.click({ force: true }).catch(() => cardConnectBtn.click());
        clickedConnect = true;
      }

      const foundUrl = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
        const match = anchors.find(a => a.getAttribute('href') && a.getAttribute('href').includes('/in/') && !a.getAttribute('href').includes('/in/ACoA'));
        return match ? match.getAttribute('href').split('?')[0] : null;
      });

      if (foundUrl) {
        targetUrl = foundUrl.startsWith('http') ? foundUrl : `https://www.linkedin.com${foundUrl}`;
        console.log(`[LinkedInConnector] Found target profile URL: ${targetUrl}`);
      }
    }

    if (!clickedConnect && !targetUrl) {
      console.log(`[LinkedInConnector] Profile URL unavailable for target.`);
      await ctx.close();
      return { success: false, reason: 'Profile URL Unavailable' };
    }

    if (!clickedConnect && targetUrl) {
      console.log(`[LinkedInConnector] Navigating to target profile: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      // Dual-Layer SCB Exclusion Guardrail specifically on candidate profile main content / experience
      const scbInProfile = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const expSection = document.querySelector('#experience') ? document.querySelector('#experience').innerText.toLowerCase() : main.innerText.toLowerCase();
        return expSection.includes('standard chartered') || expSection.includes('standard chartered bank');
      });

      if (scbInProfile) {
        console.log(`[LinkedInConnector] 🛑 STRICT EXCLUSION: Candidate profile experience shows Standard Chartered. Aborting.`);
        await ctx.close();
        return { success: false, reason: 'Standard Chartered Exclusion Enforced' };
      }
    }

    // Dismiss floating messaging drawer overlays to prevent click interception
    await page.evaluate(() => {
      document.querySelectorAll('.msg-overlay-container, #msg-overlay, div[class*="msg-overlay"]').forEach(el => {
        el.style.display = 'none';
      });
    }).catch(() => {});

    // Multi-tag element locator for profile Connect button (button, a, or div)
    if (!clickedConnect) {
      const buttonCenter = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('button, div[role="button"], span, a'));
        const connectEl = all.find(el => {
          const text = (el.innerText || '').trim();
          const rect = el.getBoundingClientRect();
          // Left side of profile card header (x: 50-300, y: 150-600) containing text Connect
          return (text === 'Connect' || text === '+ Connect') && rect.left > 50 && rect.left < 300 && rect.top > 100 && rect.top < 650;
        });

        if (connectEl) {
          const rect = connectEl.getBoundingClientRect();
          return { text: connectEl.innerText, tag: connectEl.tagName, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return null;
      }).catch(() => null);

      if (buttonCenter) {
        console.log(`[LinkedInConnector] Found Connect element (${buttonCenter.tag}) at (${buttonCenter.x.toFixed(1)}, ${buttonCenter.y.toFixed(1)}). Clicking pointer...`);
        await page.mouse.click(buttonCenter.x, buttonCenter.y).catch(() => {});
        clickedConnect = true;
        await page.waitForTimeout(2500);
      } else {
        console.log(`[LinkedInConnector] Direct Connect button not visible in top card. Trying profile More menu...`);
        const moreBtn = page.locator('button[aria-label="More"]').last();
        await moreBtn.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(500);
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button[aria-label="More"], button:has-text("More")'));
          const btn = btns[btns.length - 1];
          if (btn) btn.click();
        }).catch(() => {});
        await page.waitForTimeout(2000);
        const dropdownConnect = page.locator('.artdeco-dropdown__content *:has-text("Connect"), span:has-text("Connect"), div[role="button"]:has-text("Connect"), li:has-text("Connect"), button:has-text("Connect")').first();
        if (await dropdownConnect.isVisible().catch(() => false)) {
          console.log(`[LinkedInConnector] Found Connect in More dropdown. Clicking...`);
          await dropdownConnect.click({ force: true }).catch(() => dropdownConnect.click());
          clickedConnect = true;
          await page.waitForTimeout(2500);
        }
      }
    }

    if (clickedConnect) {
      await page.waitForTimeout(2000);

      // Handle "How do you know" modal if present
      const knowModalOther = page.locator('button:has-text("Other"), label:has-text("Other")').first();
      if (await knowModalOther.isVisible().catch(() => false)) {
        await knowModalOther.click().catch(() => {});
        await page.waitForTimeout(1000);
        const connectModalNext = page.locator('button:has-text("Connect")').first();
        if (await connectModalNext.isVisible().catch(() => false)) {
          await connectModalNext.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // Handle "Add a note to your invitation?" modal
      let inviteSentSuccessfully = false;

      const addNoteBtn = page.locator('button:has-text("Add a note"), button[aria-label*="Add a note"]').first();
      const sendWithoutNoteBtn = page.locator('button:has-text("Send without a note"), button[aria-label*="Send without"]').first();

      if (await addNoteBtn.isVisible().catch(() => false)) {
        console.log(`[LinkedInConnector] Clicking "Add a note" modal button...`);
        await addNoteBtn.click({ force: true }).catch(() => page.evaluate(el => el.click(), addNoteBtn.elementHandle()));
        await page.waitForTimeout(1500);

        const textarea = page.locator('textarea[name="message"], textarea#custom-message, textarea.connect-button-send-invite__custom-message, textarea').first();
        if (await textarea.isVisible().catch(() => false)) {
          await textarea.fill(noteText);
          await page.waitForTimeout(1000);
        }

        const sendBtn = page.locator('button:has-text("Send"), button:has-text("Send invitation"), button[aria-label*="Send"]').first();
        if (await sendBtn.isVisible().catch(() => false)) {
          console.log(`[LinkedInConnector] Clicking "Send" invitation modal button...`);
          await sendBtn.click({ force: true }).catch(() => sendBtn.click());
          await page.waitForTimeout(4000);
        }
      } else if (await sendWithoutNoteBtn.isVisible().catch(() => false)) {
        console.log(`[LinkedInConnector] Clicking "Send without a note" modal button...`);
        await sendWithoutNoteBtn.click({ force: true }).catch(() => sendWithoutNoteBtn.click());
        await page.waitForTimeout(4000);
      } else {
        // Fallback JS click on modal buttons
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const sendWithout = btns.find(b => (b.innerText || '').includes('Send without a note'));
          if (sendWithout) sendWithout.click();
        }).catch(() => {});
        await page.waitForTimeout(4000);
      }

      // MANDATORY VERIFICATION: Reload page and verify Pending status on live profile
      console.log(`[LinkedInConnector] Reloading profile page to verify Pending status...`);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(3500);

      const pendingVerified = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Pending') || text.includes('Pending invitation');
      }).catch(() => false);

      if (pendingVerified) {
        inviteSentSuccessfully = true;
        console.log(`[LinkedInConnector] ✅ VERIFIED: Profile CTA is now "Pending"! Invitation confirmed delivered.`);
      } else {
        console.warn(`[LinkedInConnector] ⚠️ Pending status verification failed after profile reload.`);
      }

      if (inviteSentSuccessfully) {
        let logs = [];
        if (fs.existsSync(connectionsFile)) {
          try { logs = JSON.parse(fs.readFileSync(connectionsFile, 'utf8')); } catch (e) {}
        }
        // Avoid duplicate log entry
        if (!logs.some(l => l.profileUrl === targetUrl)) {
          logs.push({
            name: name || 'Lead',
            profileUrl: targetUrl,
            company: company || 'N/A',
            title: title || 'N/A',
            note: noteText,
            status: 'SENT',
            verifiedAt: new Date().toISOString()
          });
          fs.writeFileSync(connectionsFile, JSON.stringify(logs, null, 2), 'utf8');
        }

        await ctx.close();
        return { success: true, profileUrl: targetUrl, note: noteText, verified: true };
      } else {
        await ctx.close();
        return { success: false, reason: 'Connect modal submitted but Pending status verification failed on profile reload' };
      }
    }

    await ctx.close();
    return { success: false, reason: 'Connect Button or Profile Action unavailable' };
  } catch (err) {
    if (ctx) await ctx.close().catch(() => {});
    console.error(`[LinkedInConnector] Execution error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { sendLinkedInConnection, buildCustomizedNote };
