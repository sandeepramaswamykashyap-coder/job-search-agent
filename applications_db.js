/**
 * applications_db.js — Centralized Persistent Application Database
 * 
 * Single source of truth for ALL applications submitted.
 * Writes are append-only and never erased.
 * Every module that submits an application should call logApplication().
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'applications_history.json');
const STATS_FILE = path.join(__dirname, 'stats.json');

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (_) {}
  }
  return [];
}

function saveDb(records) {
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * Appends a single verified application to the persistent DB.
 * Deduplicates by portal + company + title.
 * Also mirrors the record into stats.json for backward-compat with older code.
 */
function logApplication({ company, title, portal, url, time }) {
  if (!company || !title || !portal) return;

  const records = loadDb();
  const key = `${portal}::${company.trim()}::${title.trim()}`;
  const alreadyExists = records.some(r =>
    `${r.portal}::${r.company.trim()}::${r.title.trim()}` === key
  );
  if (alreadyExists) return;

  const entry = {
    company: company.trim(),
    title: title.trim(),
    portal: portal.trim().toLowerCase(),
    url: url || null,
    time: time || new Date().toISOString(),
    status: (['unconfirmed', 'error', 'failed', 'job_expired'].includes(portal.toLowerCase()) ? 'unconfirmed' : 'submitted')
  };

  records.push(entry);
  saveDb(records);

  // Also mirror into stats.json for backward compat
  try {
    let stats = { jobsScanned: 0, applicationsSubmitted: 0, appliedRolesList: [], failures: [] };
    if (fs.existsSync(STATS_FILE)) {
      try { stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch (_) {}
    }
    if (!stats.appliedRolesList) stats.appliedRolesList = [];
    const alreadyInStats = stats.appliedRolesList.some(r =>
      `${r.portal}::${(r.company || '').trim()}::${(r.title || '').trim()}` === key
    );
    if (!alreadyInStats) {
      stats.appliedRolesList.push(entry);
      stats.applicationsSubmitted = stats.appliedRolesList.length;
    }
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (_) {}

  console.log(`[DB] ✅ Logged: [${portal}] ${title} @ ${company}`);
  return entry;
}

/**
 * Loads all applications from the persistent DB.
 */
function getAllApplications() {
  return loadDb();
}

/**
 * Returns applications submitted in the last N hours.
 */
function getApplicationsInLastHours(hours = 24) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  return loadDb().filter(r => {
    try { return new Date(r.time).getTime() >= cutoff; } catch (_) { return false; }
  });
}

/**
 * Returns a breakdown by portal.
 */
function getPortalBreakdown(records) {
  const breakdown = {};
  (records || loadDb()).forEach(r => {
    const p = r.portal || 'other';
    breakdown[p] = (breakdown[p] || 0) + 1;
  });
  return breakdown;
}

module.exports = { logApplication, getAllApplications, getApplicationsInLastHours, getPortalBreakdown };
