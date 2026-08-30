/**
 * Master Executive CV Generator (with Autonomous Job Search Platform & Agentic AI Architecture)
 * Generates an ATS-optimized, pixel-perfect 1-page PDF using Playwright Chromium.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

async function generateCV() {
  console.log('[CVGenerator] Building pristine 1-page executive CV with Autonomous Platform & Agentic AI skills...');

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <style>
      @page {
        size: A4;
        margin: 8mm 12mm;
      }
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1a1a1a;
        line-height: 1.32;
        font-size: 9.1pt;
        margin: 0;
        padding: 0;
      }
      .header {
        text-align: center;
        border-bottom: 1.5pt solid #0d47a1;
        padding-bottom: 4px;
        margin-bottom: 5px;
      }
      .name {
        font-size: 16.5pt;
        font-weight: 700;
        color: #0d47a1;
        letter-spacing: 0.5px;
        margin: 0 0 2px 0;
        text-transform: uppercase;
      }
      .subtitle {
        font-size: 9.4pt;
        font-weight: 600;
        color: #2b3a4a;
        margin: 0 0 3px 0;
        letter-spacing: 0.3px;
      }
      .contact-bar {
        font-size: 8.3pt;
        color: #4a5568;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 5px;
      }
      .contact-bar a {
        color: #0d47a1;
        text-decoration: none;
        font-weight: 500;
      }
      .section-title {
        font-size: 9.3pt;
        font-weight: 700;
        color: #0d47a1;
        text-transform: uppercase;
        border-bottom: 0.75pt solid #cbd5e1;
        padding-bottom: 1.5px;
        margin-top: 5px;
        margin-bottom: 3.5px;
        letter-spacing: 0.4px;
      }
      .summary-text {
        font-size: 8.6pt;
        text-align: justify;
        color: #2d3748;
        margin-bottom: 4px;
        line-height: 1.28;
      }
      .skills-text {
        font-size: 8.4pt;
        color: #2d3748;
        line-height: 1.28;
        margin-bottom: 4px;
      }
      .job-header {
        display: flex;
        justify-content: space-between;
        font-size: 8.8pt;
        font-weight: 700;
        color: #1a202c;
        margin-top: 3.5px;
      }
      .job-company {
        color: #0d47a1;
        font-weight: 600;
      }
      .job-dates {
        font-size: 8.2pt;
        font-weight: 600;
        color: #64748b;
      }
      ul {
        margin: 1.5px 0 4px 0;
        padding-left: 13px;
      }
      li {
        font-size: 8.4pt;
        color: #2d3748;
        margin-bottom: 1.8px;
        line-height: 1.24;
      }
      .education-item {
        font-size: 8.4pt;
        color: #2d3748;
        margin-bottom: 1.5px;
      }
      strong {
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="name">Sandeep Ramaswamy Kashyap</div>
      <div class="subtitle">Business Transformation &bull; Intelligent Automation &bull; Agentic AI &bull; Delivery Leadership</div>
      <div class="contact-bar">
        <span>Bengaluru, India</span>
        <span>&bull;</span>
        <span><a href="tel:+916366325217">+91 63663 25217</a></span>
        <span>&bull;</span>
        <span><a href="mailto:sandeepramaswamykashyap@gmail.com">sandeepramaswamykashyap@gmail.com</a></span>
        <span>&bull;</span>
        <span><a href="https://www.linkedin.com/in/sandeepramaswamykashyap/">linkedin.com/in/sandeepramaswamykashyap</a></span>
        <span>&bull;</span>
        <span><a href="https://github.com/sandeepramaswamykashyap-coder">github.com/sandeepramaswamykashyap-coder</a></span>
      </div>
    </div>

    <div class="section-title">Professional Summary</div>
    <div class="summary-text">
      Business transformation and intelligent automation leader with <strong>15+ years</strong> in banking and financial services, currently <strong>Manager | Agentic AI & Workflow Automation</strong> at <strong>Standard Chartered</strong>. Delivers enterprise AI and automation enabled change across the full project lifecycle: operating model design, process and service excellence, UAT and go-live readiness, and transition to business as usual. Hands-on architect of multi-agent autonomous platforms combining business analysis, program delivery, and organizational change management with a proven track record of measurable outcomes (<strong>~65% efficiency gains, 800+ hours/month saved, 99%+ SLA performance</strong>).
    </div>

    <div class="section-title">Core Skills & Competencies</div>
    <div class="skills-text">
      <strong>Transformation & Delivery:</strong> Business Transformation &bull; Intelligent Automation & Agentic AI &bull; Business Analysis & Requirements &bull; Program & Project Management &bull; Organizational Change Management (OCM) &bull; UAT Strategy & Execution &bull; Service Transition (BAU)<br>
      <strong>AI Architecture & Engineering:</strong> Autonomous Multi-Agent Systems &bull; Workflow Automation &bull; Browser Automation (Playwright, Node.js) &bull; Enterprise ATS API Integration &bull; Real-Time 2FA & IMAP Security Solvers<br>
      <strong>Operations & Governance:</strong> Operational & Service Excellence &bull; Governance, Risk & Controls &bull; KPI & SLA Service Performance Reporting &bull; Stakeholder Management &bull; JIRA &bull; Azure DevOps &bull; Agile Delivery
    </div>

    <div class="section-title">Professional Experience & Technical Innovations</div>

    <div class="job-header">
      <div>Manager | Agentic AI & Workflow Automation | <span class="job-company">Standard Chartered GBS, Bengaluru</span></div>
      <div class="job-dates">Feb 2019 to Present</div>
    </div>
    <ul>
      <li>Lead business transformation and intelligent automation initiatives across the project lifecycle, partnering with business, operations, and technology to design scalable operating models and embed AI and automation into BAU.</li>
      <li>Delivered an Agentic AI personnel file automation processing <strong>~25,000 documents/month</strong>, achieving <strong>~65% efficiency improvement, ~5 FTE effort reduction</strong>, and <strong>800+ hours saved</strong> each month.</li>
      <li>Drove SCB OneSC transformation across go-live readiness, workflow validation, issue management, and post go-live stabilization, owning change and transition to business as usual.</li>
      <li>Owned UAT strategy and execution for global investment banking platforms (<strong>2,000+ test cases across JIRA and Azure DevOps</strong>), providing senior stakeholders with executive reporting and go/no-go recommendations.</li>
      <li>Built service performance and success measurement frameworks, analysing portal, virtual assistant, live advisor, and VOC data to define KPIs, classify issues, and drive continuous service improvement.</li>
      <li>Translated complex business requirements into functional specifications and solution designs across transformation and automation programs, managing risk based plans, defect triage, and governance under Agile delivery.</li>
    </ul>

    <div class="job-header">
      <div>Creator & Architect | Autonomous Executive Job Search Platform | <span class="job-company"><a href="https://github.com/sandeepramaswamykashyap-coder/job-search-agent" style="color: #0d47a1; text-decoration: none;">GitHub Open Source Project</a></span></div>
      <div class="job-dates">2026</div>
    </div>
    <ul>
      <li>Architected and deployed an autonomous multi-agent platform orchestrating real-time job ingestion across 180+ enterprise ATS platforms (Greenhouse, Lever, SmartRecruiters, Workday), automated multi-step form completion, SSL IMAP 2FA solvers, and live executive reporting.</li>
    </ul>

    <div class="job-header">
      <div>Team Lead | Client Onboarding | <span class="job-company">Wipro Ltd, Bengaluru</span></div>
      <div class="job-dates">Jan 2015 to Feb 2019</div>
    </div>
    <ul>
      <li>Led reference data management and client onboarding for <strong>500+ UBS clients</strong>, ensuring regulatory compliance and <strong>99.5% data accuracy</strong> across investment banking platforms.</li>
      <li>Improved turnaround through process automation and operational excellence, delivered SME training, and managed BAU escalations.</li>
      <li>Designed executive dashboards, standardized SOPs, and implemented controls to close audit gaps and maintain <strong>99%+ SLA performance</strong>.</li>
    </ul>

    <div class="job-header">
      <div>Business Acquisitions Manager &bull; BBS Pvt Ltd (2012 to 2014) | Payments Specialist &bull; IBM / Lloyds TSB (2010 to 2012)</div>
      <div class="job-dates">Bengaluru</div>
    </div>

    <div class="section-title">Education & Certifications</div>
    <div class="education-item">
      &bull; <strong>Post Graduation, Investment Banking</strong> | IIM Indore (2019 to 2020) &nbsp;&bull;&nbsp; <strong>Bachelor of Business Management</strong> | University of Mysore (2007 to 2010)<br>
      &bull; <strong>NISM Certified Research Analyst (Series XV)</strong> &nbsp;&bull;&nbsp; <strong>GitHub Portfolio:</strong> <a href="https://github.com/sandeepramaswamykashyap-coder" style="color: #0d47a1; text-decoration: none; font-weight: 600;">github.com/sandeepramaswamykashyap-coder</a>
    </div>
  </body>
  </html>
  `;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });

  const pdfPath = path.join(__dirname, 'Sandeep_Kashyap.pdf');
  const backupPdfPath = path.join(__dirname, 'Sandeep_Kashyap_-_Job-Search_Profile.pdf');
  const artifactPdfPath = '/Users/sandeepramaswamykashyap/.gemini/antigravity-ide/brain/672690c0-1885-4016-9a16-cee2972c5968/Sandeep_Kashyap_CV.pdf';
  const desktopPdfPath = '/Users/sandeepramaswamykashyap/Desktop/Sandeep_Kashyap_CV.pdf';
  const desktopPdfPath2 = '/Users/sandeepramaswamykashyap/Desktop/Sandeep_Kashyap.pdf';

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '7mm',
      bottom: '7mm',
      left: '10mm',
      right: '10mm'
    }
  });

  fs.copyFileSync(pdfPath, backupPdfPath);
  fs.copyFileSync(pdfPath, artifactPdfPath);
  fs.copyFileSync(pdfPath, desktopPdfPath);
  fs.copyFileSync(pdfPath, desktopPdfPath2);

  await browser.close();
  console.log(`[CVGenerator] ✅ Successfully generated and saved 1-page executive CV!`);
}

if (require.main === module) {
  generateCV();
}

module.exports = { generateCV };
