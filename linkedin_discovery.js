/**
 * Job Search & Application Agent - LinkedIn Boolean Lead Discovery Module
 * Executes LinkedIn Boolean search queries to discover Peers & Hiring Managers across target companies.
 */

const fs = require('fs');
const path = require('path');

const leadsFile = path.join(__dirname, 'recruiter_leads.json');

const { buildBooleanQueries } = require('./boolean_engine');

/**
 * Builds targeted Boolean search strings for LinkedIn discovery
 */
function generateBooleanQueries(companyName) {
  const queries = buildBooleanQueries();
  if (companyName) {
    return queries.map(q => ({
      ...q,
      searchQuery: `${q.searchQuery} "${companyName}"`
    }));
  }
  return queries;
}

/**
 * Parses and saves extracted leads with persona metadata
 */
function saveDiscoveredLead(lead) {
  if (!lead.email || typeof lead.email !== 'string') return;
  const e = lead.email.toLowerCase().trim();

  let leads = [];
  if (fs.existsSync(leadsFile)) {
    try { leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8')); } catch (err) {}
  }

  if (!leads.some(l => l.email.toLowerCase() === e)) {
    leads.push({
      email: e,
      company: lead.company || 'Target Company',
      title: lead.title || 'Target Role',
      persona: lead.persona || 'peer',
      jobUrl: lead.jobUrl || '',
      discoveredAt: new Date().toISOString()
    });
    fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), 'utf8');
    console.log(`[LinkedInDiscovery] 🎯 Saved new ${lead.persona.toUpperCase()} lead: ${e} (${lead.title} at ${lead.company})`);
  }
}

module.exports = {
  generateBooleanQueries,
  saveDiscoveredLead
};
