/**
 * Master CV Generator with Clickable GitHub & LinkedIn Links
 * Generates an ATS-optimized, pixel-perfect 1-page PDF using Playwright Chromium.
 */

const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const { chromium } = require('playwright');
const fs = require('fs');

async function generateCV() {
  console.log('[CVGenerator] Building ATS-optimized 1-page executive CV...');

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <style>
      @page {
        size: A4;
        margin: 12mm 14mm;
      }
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1a1a1a;
        line-height: 1.35;
        font-size: 9.5pt;
        margin: 0;
        padding: 0;
      }
      .header {
        text-align: center;
        border-bottom: 1.5pt solid #0d47a1;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .name {
        font-size: 18pt;
        font-weight: 700;
        color: #0d47a1;
        letter-spacing: 0.5px;
        margin: 0 0 3px 0;
        text-transform: uppercase;
      }
      .subtitle {
        font-size: 10pt;
        font-weight: 600;
        color: #2b3a4a;
        margin: 0 0 5px 0;
        letter-spacing: 0.3px;
      }
      .contact-bar {
        font-size: 8.5pt;
        color: #4a5568;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 6px;
      }
      .contact-bar a {
        color: #0d47a1;
        text-decoration: none;
        font-weight: 500;
      }
      .section-title {
        font-size: 10pt;
        font-weight: 700;
        color: #0d47a1;
        text-transform: uppercase;
        border-bottom: 0.75pt solid #cbd5e1;
        padding-bottom: 2px;
        margin-top: 7px;
        margin-bottom: 4px;
        letter-spacing: 0.5px;
      }
      .summary-text {
        font-size: 9pt;
        text-align: justify;
        color: #2d3748;
        margin-bottom: 6px;
      }
      .skills-text {
        font-size: 8.8pt;
        color: #2d3748;
        line-height: 1.3;
        margin-bottom: 6px;
      }
      .job-header {
        display: flex;
        justify-content: space-between;
        font-size: 9.2pt;
        font-weight: 700;
        color: #1a202c;
        margin-top: 5px;
      }
      .job-company {
        color: #0d47a1;
        font-weight: 600;
      }
      .job-dates {
        font-size: 8.5pt;
        font-weight: 600;
        color: #64748b;
      }
      ul {
        margin: 2px 0 6px 0;
        padding-left: 14px;
      }
      li {
        font-size: 8.8pt;
        color: #2d3748;
        margin-bottom: 2.5px;
        line-height: 1.28;
      }
      .education-item {
        font-size: 8.8pt;
        color: #2d3748;
        margin-bottom: 2px;
      }
      strong {
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="name">Sandeep Ramaswamy Kashyap</div>
      <div class="subtitle">Business Transformation &bull; Intelligent Automation &bull; Change & Delivery</div>
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
      Business-transformation and automation leader with <strong>15+ years</strong> in banking and financial services, currently <strong>Manager &ndash; Agentic AI & Workflow Automation</strong> at <strong>Standard Chartered</strong>. Delivers AI- and automation-enabled change across the full project lifecycle &mdash; operating-model design, process and service excellence, UAT and go-live readiness, and transition to business-as-usual. Combines business analysis, program/project delivery and organizational change management with strong executive-stakeholder engagement and a proven track record of measurable outcomes (<strong>~65% efficiency gains, 800+ hours/month saved, 99%+ SLA performance</strong>).
    </div>

    <div class="section-title">Core Skills & Competencies</div>
    <div class="skills-text">
      <strong>Transformation & Delivery:</strong> Business Transformation &bull; Workflow & Intelligent Automation (Agentic AI) &bull; Business Analysis & Requirements &bull; Program / Project Management &bull; Organizational Change Management (OCM) &bull; UAT Strategy & Execution &bull; Service Transition (BAU)<br>
      <strong>Operations & Governance:</strong> Operational & Service Excellence &bull; Governance, Risk & Controls &bull; KPI / SLA Service-Performance Reporting &bull; Stakeholder Management &bull; JIRA &bull; Azure DevOps &bull; Agile Delivery &bull; Advanced Excel & PowerPoint
    </div>

    <div class="section-title">Professional Experience</div>

    <div class="job-header">
      <div>Manager &ndash; Agentic AI & Workflow Automation &mdash; <span class="job-company">Standard Chartered GBS, Bengaluru</span></div>
      <div class="job-dates">Feb 2019 &ndash; Present</div>
    </div>
    <ul>
      <li>Lead business-transformation and intelligent-automation initiatives across the project lifecycle, partnering with business, operations, and technology to design scalable operating models and embed AI/automation into BAU.</li>
      <li>Delivered an Agentic-AI personnel-file automation processing <strong>~25,000 documents/month</strong> &mdash; achieving <strong>~65% efficiency improvement, ~5 FTE effort reduction</strong>, and <strong>800+ hours saved</strong> each month.</li>
      <li>Drove SCB’s OneSC transformation across go-live and business-readiness, workflow validation, issue management, and post-go-live stabilization &mdash; owning change and transition to business-as-usual.</li>
      <li>Owned UAT strategy and execution for global investment-banking platforms &mdash; <strong>2,000+ test cases across JIRA and Azure DevOps</strong> &mdash; providing senior stakeholders with executive reporting and go/no-go recommendations.</li>
      <li>Built service-performance and success-measurement frameworks, analysing portal, virtual-assistant, live-advisor, and VOC data to define KPIs, classify issues, and drive continuous service improvement.</li>
      <li>Translated complex business requirements into functional specifications and solution designs across transformation and automation programs, managing risk-based plans, defect triage, and governance under Agile delivery.</li>
    </ul>

    <div class="job-header">
      <div>Team Lead &ndash; Client On-Boarding &mdash; <span class="job-company">Wipro Ltd, Bengaluru</span></div>
      <div class="job-dates">Jan 2015 &ndash; Feb 2019</div>
    </div>
    <ul>
      <li>Led reference-data management and client onboarding for <strong>500+ UBS clients</strong>, ensuring regulatory compliance and <strong>99.5% data accuracy</strong> across investment-banking platforms.</li>
      <li>Improved turnaround through process automation and operational excellence; delivered SME training and managed BAU escalations.</li>
      <li>Designed executive dashboards, standardized SOPs, and implemented controls to close audit gaps and strengthen compliance posture.</li>
      <li>Maintained <strong>99%+ SLA performance</strong> through structured Agile project management and cross-functional leadership.</li>
    </ul>

    <div class="job-header">
      <div>Business Acquisitions Manager &mdash; <span class="job-company">BBS Pvt Ltd, Bengaluru</span></div>
      <div class="job-dates">Jul 2012 &ndash; Dec 2014</div>
    </div>
    <ul>
      <li>Managed business acquisition and key client relationships, driving revenue growth through structured pipeline management.</li>
    </ul>

    <div class="job-header">
      <div>Payments Specialist &ndash; CHAPS &mdash; <span class="job-company">IBM / Lloyds TSB Bank, Bengaluru</span></div>
      <div class="job-dates">Dec 2010 &ndash; Jun 2012</div>
    </div>
    <ul>
      <li>Processed high-value CHAPS payments for a UK banking operation with strict accuracy, controls adherence, and regulatory compliance.</li>
    </ul>

    <div class="section-title">Education & Certifications</div>
    <div class="education-item">
      &bull; <strong>Post Graduation, Investment Banking</strong> &mdash; IIM Indore (2019&ndash;2020) &nbsp;&bull;&nbsp; <strong>Bachelor of Business Management</strong> &mdash; University of Mysore (2007&ndash;2010)<br>
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

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '12mm',
      right: '12mm'
    }
  });

  fs.copyFileSync(pdfPath, backupPdfPath);

  await browser.close();
  console.log(`[CVGenerator] ✅ Successfully generated updated 1-page CV: ${pdfPath}`);
}

if (require.main === module) {
  generateCV();
}

module.exports = { generateCV };
