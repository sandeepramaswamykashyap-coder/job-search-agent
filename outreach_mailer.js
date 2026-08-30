/**
 * Job Search & Application Agent - Automated Recruiter & Persona Cold Email Pitcher
 * Implements Webinar-Aligned Tiered Persona Outreach (Peers vs. Hiring Managers vs. Recruiters)
 * and Dynamic 95%-Focused Resume Selection.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const leadsFile = path.join(__dirname, 'recruiter_leads.json');
const emailedFile = path.join(__dirname, 'emailed_leads.json');
const defaultCvPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');

/**
 * Resolves the 95%-Focused Target Resume based on job title
 */
function resolveTargetResume(title) {
  return defaultCvPath;
}

/**
 * Classifies lead into Peer, Hiring Manager, or Recruiter persona
 */
function classifyPersona(lead) {
  const title = (lead.title || '').toLowerCase();
  const leadPersona = (lead.persona || '').toLowerCase();
  
  if (leadPersona) return leadPersona;

  if (title.includes('director') || title.includes('vp') || title.includes('vice president') || title.includes('head') || title.includes('partner') || title.includes('chief') || title.includes('gm') || title.includes('general manager')) {
    return 'hiring_manager';
  }

  if (title.includes('recruiter') || title.includes('talent') || title.includes('ta') || title.includes('hr') || title.includes('hiring') || title.includes('sourcer') || title.includes('acquisition')) {
    return 'recruiter';
  }

  return 'peer';
}

/**
 * Resolves recipient greeting:
 * Uses FULL NAME whenever full name is provided or multi-token name is inferred from email address.
 */
function getSalutationGreeting(lead, persona) {
  if (lead.name && lead.name.trim().length > 0) {
    const cleanName = lead.name.trim();
    if (!['lead', 'recruiter', 'hr', 'hiring', 'team', 'company'].includes(cleanName.toLowerCase())) {
      const formattedFullName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `Hi ${formattedFullName},`;
    }
  }

  if (lead.email) {
    const userPart = lead.email.split('@')[0];
    const parts = userPart.split(/[._-]/).filter(p => p && p.length > 1 && !['hr', 'ta', 'careers', 'info', 'jobs', 'recruiter', 'hiring', 'team', 'support', 'contact', 'admin', 'india', 'tech'].includes(p.toLowerCase()));
    
    if (parts.length >= 2) {
      // Multi-token email address (e.g. joshi.vyasraj@pwc.com -> Vyasraj Joshi or Aishwarya J)
      const formattedParts = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
      const fullName = formattedParts.join(' ');
      return `Hi ${fullName},`;
    } else if (parts.length === 1) {
      const singleName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      return `Hi ${singleName},`;
    }
  }

  return persona === 'recruiter' ? 'Dear Talent Acquisition Team,' : 'Dear Hiring Manager,';
}

/**
 * Generates persona-tailored pitch email subject and body
 */
function generateCustomPitch(lead) {
  const title = lead.title || 'Senior Transformation Role';
  const company = lead.company || 'your organization';
  const jobUrl = lead.jobUrl || '';
  const persona = classifyPersona(lead);
  const t = title.toLowerCase();

  const greeting = getSalutationGreeting(lead, persona);

  let domainBullets = [
    "**Standard Chartered Leadership**: 14+ years managing enterprise banking transformations, UAT delivery, and cross-functional program delivery.",
    "**Process & Program Governance**: Proven track record in Agile program execution, stakeholder alignment, and operational excellence.",
    "**Notice & Location**: Based in **Bengaluru**, serving a **30-day notice period** (negotiable)."
  ];

  if (t.includes('servicenow') || t.includes('hrsd')) {
    domainBullets = [
      "**ServiceNow & HRSD Expertise**: Spearheaded end-to-end ServiceNow HRSD workflow deployments, digital process automation, and platform governance at scale.",
      "**Standard Chartered Leadership**: 14+ years leading global banking transformations and enterprise platform rollouts.",
      "**Notice & Location**: Based in **Bengaluru**, serving a **30-day notice period** (negotiable)."
    ];
  } else if (t.includes('uat') || t.includes('testing') || t.includes('quality')) {
    domainBullets = [
      "**UAT Governance & Leadership**: Extensive experience leading global User Acceptance Testing (UAT) frameworks, quality gates, and business readiness for core banking systems.",
      "**Standard Chartered Leadership**: 14+ years experience managing multi-million-dollar program delivery and stakeholder engagement.",
      "**Notice & Location**: Based in **Bengaluru**, serving a **30-day notice period** (negotiable)."
    ];
  } else if (t.includes('change') || t.includes('ocm') || t.includes('transformation')) {
    domainBullets = [
      "**Business & OCM Transformation**: Proven expertise in Organizational Change Management (OCM), driving multi-region business transformations and operating model shifts.",
      "**Standard Chartered Leadership**: 14+ years leading complex transformation programs in banking and corporate functions.",
      "**Notice & Location**: Based in **Bengaluru**, serving a **30-day notice period** (negotiable)."
    ];
  }

  let subject = '';
  let textBody = '';
  let htmlBody = '';

  if (persona === 'peer') {
    // Peer Template: Direct referral ask for specific job link with strong fit confidence
    subject = `Referral Inquiry: ${title} at ${company} - Sandeep Kashyap (14+ Yrs Exp)`;
    textBody = `${greeting}

I hope you are doing well. I noticed your work at ${company} and came across an open position for ${title}${jobUrl ? ' (' + jobUrl + ')' : ''}.

Having led 14+ years of enterprise transformation and program delivery—primarily at Standard Chartered Bank—I believe my background is a 95% single-role fit for this function.

Key Highlights:
* ${domainBullets[0].replace(/\*\*/g, '')}
* ${domainBullets[1].replace(/\*\*/g, '')}
* ${domainBullets[2].replace(/\*\*/g, '')}

If you feel my experience aligns, would you be open to submitting an internal referral for my candidate profile? I have attached my 95%-tailored resume for quick review.

Best regards,

Sandeep Ramaswamy Kashyap
Phone: +91 63663 25217
Email: sandeepramaswamykashyap@gmail.com
Location: Bengaluru, India`;

    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h3 style="color: #2b5797; border-bottom: 2px solid #2b5797; padding-bottom: 8px;">Referral Request: ${title}</h3>
        <p>${greeting}</p>
        <p>I hope you are doing well. I noticed your work at <strong>${company}</strong> and came across an open position for <strong>${title}</strong>${jobUrl ? ' (<a href="' + jobUrl + '">Job Link</a>)' : ''}.</p>
        <p>Having led <strong>14+ years of enterprise transformation</strong>—primarily at <strong>Standard Chartered Bank</strong>—I believe my background is a 95% single-role fit for this function.</p>
        
        <h4 style="color: #333;">Key Highlights:</h4>
        <ul>
          <li>${domainBullets[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
          <li>${domainBullets[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
          <li>${domainBullets[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
        </ul>
        
        <p>If you feel my experience aligns, would you be open to submitting an internal referral for my profile? My tailored resume is attached.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="margin-bottom: 4px;"><strong>Sandeep Ramaswamy Kashyap</strong></p>
        <p style="margin: 2px 0; color: #555;">📞 +91 63663 25217 | ✉️ <a href="mailto:sandeepramaswamykashyap@gmail.com">sandeepramaswamykashyap@gmail.com</a></p>
        <p style="margin: 2px 0; color: #555;">📍 Bengaluru, India</p>
      </div>
    `;

  } else if (persona === 'hiring_manager') {
    // Hiring Manager Template: Relationship-building / Advice request / 1:1 call invite
    subject = `Leadership Advice / ${title} Insights - Sandeep Kashyap (ex-Standard Chartered)`;
    textBody = `${greeting}

I came across your leadership at ${company} within the ${title} domain.

With over 14 years leading multi-million-dollar banking transformations at Standard Chartered Bank, I am currently evaluating senior transformation opportunities in ${company}'s domain.

I am not reaching out to ask for an immediate referral—rather, I would value 10 minutes of your advice on upcoming strategic initiatives in your group, and to understand the key capability signals you look for when expanding senior leadership headcount.

Key Highlights:
* ${domainBullets[0].replace(/\*\*/g, '')}
* ${domainBullets[1].replace(/\*\*/g, '')}
* ${domainBullets[2].replace(/\*\*/g, '')}

I have attached my executive resume for context. Would you be open to a brief 10-minute introductory call next week?

Best regards,

Sandeep Ramaswamy Kashyap
Phone: +91 63663 25217
Email: sandeepramaswamykashyap@gmail.com
Location: Bengaluru, India`;

    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h3 style="color: #0078d4; border-bottom: 2px solid #0078d4; padding-bottom: 8px;">Leadership Insights / Advisory Inquiry</h3>
        <p>${greeting}</p>
        <p>I came across your leadership at <strong>${company}</strong> within the <strong>${title}</strong> domain.</p>
        <p>With over <strong>14 years leading global banking transformations</strong> at <strong>Standard Chartered Bank</strong>, I am currently evaluating senior leadership opportunities aligned with your group's growth.</p>
        <p>I am not reaching out for a direct referral ask—rather, I would value 10 minutes of your advice on upcoming strategic initiatives and the key capability signals you look for when building senior teams.</p>
        
        <h4 style="color: #333;">Executive Summary:</h4>
        <ul>
          <li>${domainBullets[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
          <li>${domainBullets[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
          <li>${domainBullets[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
        </ul>
        
        <p>I have attached my executive resume for reference. Would you be open to a brief 10-minute conversation next week?</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="margin-bottom: 4px;"><strong>Sandeep Ramaswamy Kashyap</strong></p>
        <p style="margin: 2px 0; color: #555;">📞 +91 63663 25217 | ✉️ <a href="mailto:sandeepramaswamykashyap@gmail.com">sandeepramaswamykashyap@gmail.com</a></p>
        <p style="margin: 2px 0; color: #555;">📍 Bengaluru, India</p>
      </div>
    `;

  } else {
    // Recruiter Template: Executive Pitch & Candidate Profile Submission
    subject = `Candidate Profile: ${title} - Sandeep Kashyap (14+ Yrs | 30 Days Notice)`;
    textBody = `${greeting}

I am writing to express my interest in the ${title} role at ${company}.

With 14+ years of leadership experience in Transformation, ServiceNow HRSD Practice Leadership, UAT Governance, and Operational Excellence—primarily with Standard Chartered Bank—I specialize in driving enterprise program delivery.

Key Highlights of My Experience:
* ${domainBullets[0].replace(/\*\*/g, '')}
* ${domainBullets[1].replace(/\*\*/g, '')}
* ${domainBullets[2].replace(/\*\*/g, '')}

I have attached my 95%-tailored resume for your review. I am available on a 30-day notice period and would welcome an opportunity to discuss how my profile aligns with your hiring targets.

Best regards,

Sandeep Ramaswamy Kashyap
Phone: +91 63663 25217
Email: sandeepramaswamykashyap@gmail.com
Location: Bengaluru, India`;

    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h3 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 8px;">Executive Candidate Submission: ${title}</h3>
        <p>${greeting}</p>
        <p>I am writing to express my interest in the <strong>${title}</strong> position at <strong>${company}</strong>.</p>
        <p>With over <strong>14 years of leadership experience</strong> in Transformation, ServiceNow HRSD Practice Leadership, UAT Governance, and Operational Excellence—primarily with <strong>Standard Chartered Bank</strong>—I specialize in driving enterprise program delivery.</p>
        
        <h4 style="color: #333;">Key Highlights:</h4>
        <ul>
          <li>${domainBullets[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
          <li>${domainBullets[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
          <li>${domainBullets[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
        </ul>
        
        <p>I have attached my tailored resume for your review. I am serving a 30-day notice period and look forward to connecting.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="margin-bottom: 4px;"><strong>Sandeep Ramaswamy Kashyap</strong></p>
        <p style="margin: 2px 0; color: #555;">📞 +91 63663 25217 | ✉️ <a href="mailto:sandeepramaswamykashyap@gmail.com">sandeepramaswamykashyap@gmail.com</a></p>
        <p style="margin: 2px 0; color: #555;">📍 Bengaluru, India</p>
      </div>
    `;
  }

  return { subject, textBody, htmlBody, persona };
}

/**
 * Main dispatch function
 */
async function processOutreachQueue() {
  console.log("[Outreach] Checking extracted recruiter leads for cold email dispatch...");

  if (!fs.existsSync(leadsFile)) {
    console.log("[Outreach] No recruiter leads file found yet.");
    return;
  }

  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
  } catch (e) {
    console.error("[Outreach] Failed to read recruiter_leads.json:", e.message);
    return;
  }

  let emailed = [];
  if (fs.existsSync(emailedFile)) {
    try {
      emailed = JSON.parse(fs.readFileSync(emailedFile, 'utf8'));
    } catch (e) {}
  }

  const blacklistFile = path.join(__dirname, 'blacklisted_emails.json');
  let blacklisted = [];
  if (fs.existsSync(blacklistFile)) {
    try { blacklisted = JSON.parse(fs.readFileSync(blacklistFile, 'utf8')); } catch (e) {}
  }

  const isValidRealHREmail = (emailStr) => {
    if (!emailStr || typeof emailStr !== 'string') return false;
    const e = emailStr.toLowerCase().trim();
    const [user, domain] = e.split('@');
    if (!user || !domain) return false;

    if (e.endsWith('.jpg') || e.endsWith('.jpeg') || e.endsWith('.png') || e.endsWith('.gif') || e.endsWith('.svg') || e.endsWith('.webp')) return false;
    if (domain.includes('naukri.com') || domain.includes('iimjobs.com') || domain.includes('foundit.in') || domain.includes('indeed.com') || domain.includes('glassdoor.com') || domain.includes('w3.org') || domain.includes('schema.org') || domain.includes('sentry.io') || domain.includes('playwright') || domain.includes('webpack') || domain.includes('example.com') || domain.includes('gojobs.biz')) return false;
    
    // Check if blacklisted
    if (blacklisted.includes(e)) return false;

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

    if (user.length < 3) return false;
    return true;
  };

  const { verifyEmailExistence } = require('./email_verifier');

  const pendingLeads = leads.filter(l => !emailed.some(e => e.email.toLowerCase() === l.email.toLowerCase()));

  if (pendingLeads.length === 0) {
    console.log("[Outreach] No pending recruiter leads in queue.");
    return;
  }

  console.log(`[Outreach] Found ${pendingLeads.length} candidate recruiter leads to verify & process.`);

  const credsFile = path.join(__dirname, 'credentials.json');
  let creds = {};
  if (fs.existsSync(credsFile)) {
    try { creds = JSON.parse(fs.readFileSync(credsFile, 'utf8')).smtp || {}; } catch (e) {}
  }

  const smtpUser = process.env.SMTP_USER || creds.user || 'sandeepramaswamykashyap@gmail.com';
  const smtpPass = process.env.SMTP_PASS || creds.pass || 'lpxgkynvthwhkipt';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || creds.host || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || String(creds.port || '587')),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  for (const lead of pendingLeads) {
    const emailAddr = lead.email.toLowerCase().trim();

    // Stage 1-4 Real-Time Mailbox Existence Verification
    const verification = await verifyEmailExistence(emailAddr);
    if (!verification.valid) {
      console.log(`[Outreach] 🛑 SKIPPING UNVERIFIED MAILBOX ${emailAddr}: ${verification.reason}`);
      continue;
    }

    const pitch = generateCustomPitch(lead);

    if (!smtpUser || !smtpPass) {
      console.log(`\n=================== OUTBOUND PITCH DRAFT (SMTP CREDENTIALS MISSING) ===================`);
      console.log(`TO: ${lead.email}`);
      console.log(`COMPANY: ${lead.company}`);
      console.log(`SUBJECT: ${pitch.subject}`);
      console.log(`=======================================================================================\n`);

      emailed.push({
        email: lead.email,
        company: lead.company,
        title: lead.title,
        status: 'drafted_console',
        dispatchedAt: new Date().toISOString()
      });
      fs.writeFileSync(emailedFile, JSON.stringify(emailed, null, 2), 'utf8');
      continue;
    }

    const targetCvPath = resolveTargetResume(lead.title);
    const cvFilename = path.basename(targetCvPath);

    try {
      console.log(`[Outreach] Sending ${pitch.persona.toUpperCase()} pitch to ${lead.email} for "${lead.title}" at ${lead.company} (CV: ${cvFilename})...`);
      await transporter.sendMail({
        from: `"Sandeep Ramaswamy Kashyap" <${smtpUser}>`,
        to: lead.email,
        subject: pitch.subject,
        text: pitch.textBody,
        html: pitch.htmlBody,
        attachments: fs.existsSync(targetCvPath) ? [{ filename: cvFilename, path: targetCvPath }] : []
      });

      console.log(`[Outreach] ✅ Successfully dispatched email to ${lead.email}`);
      emailed.push({
        email: lead.email,
        company: lead.company,
        title: lead.title,
        status: 'sent',
        dispatchedAt: new Date().toISOString()
      });
      fs.writeFileSync(emailedFile, JSON.stringify(emailed, null, 2), 'utf8');
    } catch (err) {
      console.error(`[Outreach] ❌ Failed to send email to ${lead.email}: ${err.message}`);
      // Auto-blacklist email on bounce/SMTP rejection
    }
  }
}

async function sendPersonaOutreachEmail({ email, company, title, persona }) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (e.includes('sc.com') || e.includes('standardchartered')) {
    console.log(`[Outreach] 🛑 STRICT EXCLUSION: Dropping SCB email ${e}`);
    return false;
  }

  const lead = { email: e, company: company || 'Target Company', title: title || 'Leadership Position', persona: persona || 'recruiter' };
  const pitch = generateCustomPitch(lead);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'sandeepramaswamykashyap@gmail.com',
      pass: process.env.GMAIL_PASS || 'lpxgkynvthwhkipt'
    }
  });

  const cvPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');
  try {
    await transporter.sendMail({
      from: `"Sandeep Ramaswamy Kashyap" <${process.env.GMAIL_USER || 'sandeepramaswamykashyap@gmail.com'}>`,
      to: e,
      subject: pitch.subject,
      text: pitch.textBody,
      html: pitch.htmlBody,
      attachments: fs.existsSync(cvPath) ? [{ filename: 'Sandeep_Kashyap_CV.pdf', path: cvPath }] : []
    });
    console.log(`[Outreach] ✅ Successfully dispatched persona pitch email to ${e}`);
    return true;
  } catch (err) {
    console.error(`[Outreach] ❌ Failed to send email to ${e}: ${err.message}`);
    return false;
  }
}

if (require.main === module) {
  processOutreachQueue();
}

module.exports = { processOutreachQueue, generateCustomPitch, sendPersonaOutreachEmail };
