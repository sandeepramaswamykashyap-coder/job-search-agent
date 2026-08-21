/**
 * Quick verification test — proves WWR RSS and RemoteOK JSON API work
 */
const path = require('path');
const http = require('https');

const targetKeywords = [
  'program manager', 'transformation', 'servicenow', 'automation', 'uat', 'change management',
  'project manager', 'delivery manager', 'practice lead', 'operational excellence',
  'head of', 'director', 'vp of', 'product manager'
];

function isMatchingRole(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return targetKeywords.some(k => t.includes(k));
}

// Test 1: We Work Remotely RSS
function testWWR() {
  return new Promise((resolve) => {
    console.log('\n[Test 1] 🔍 Testing We Work Remotely RSS feed...');
    http.get('https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSearchAgent/1.0)' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const items = data.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const jobs = [];
        items.forEach(item => {
          const titleMatch = item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                             item.match(/<title>([^<]+)<\/title>/);
          const linkMatch = item.match(/<link>([^<]+)<\/link>/);
          if (titleMatch) {
            const raw = titleMatch[1].trim();
            const colonIdx = raw.indexOf(':');
            const company = colonIdx > -1 ? raw.substring(0, colonIdx).trim() : 'Unknown';
            const title = colonIdx > -1 ? raw.substring(colonIdx + 1).trim() : raw;
            jobs.push({ title, company, url: linkMatch ? linkMatch[1].trim() : '' });
          }
        });
        const matched = jobs.filter(j => isMatchingRole(j.title));
        console.log(`  ✅ Found ${jobs.length} total jobs, ${matched.length} match your profile`);
        if (matched.length > 0) {
          console.log('  📋 Matching roles:');
          matched.slice(0, 5).forEach(j => console.log(`    → [${j.company}] ${j.title}`));
        } else {
          console.log('  📋 Sample jobs (not matching):');
          jobs.slice(0, 5).forEach(j => console.log(`    → [${j.company}] ${j.title}`));
        }
        resolve({ portal: 'weworkremotely', total: jobs.length, matched: matched.length });
      });
    }).on('error', err => {
      console.log(`  ❌ Error: ${err.message}`);
      resolve({ portal: 'weworkremotely', error: err.message });
    });
  });
}

// Test 2: RemoteOK JSON API
function testRemoteOK() {
  return new Promise((resolve) => {
    console.log('\n[Test 2] 🔍 Testing RemoteOK management JSON API...');
    http.get('https://remoteok.com/remote-management-jobs.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSearchAgent/1.0)' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const jobs = (Array.isArray(json) ? json.slice(1) : []).map(item => ({
            title: item.position || '',
            company: item.company || 'Unknown',
          }));
          const matched = jobs.filter(j => isMatchingRole(j.title));
          console.log(`  ✅ Found ${jobs.length} total jobs, ${matched.length} match your profile`);
          matched.slice(0, 5).forEach(j => console.log(`    → [${j.company}] ${j.title}`));
          resolve({ portal: 'remoteok', total: jobs.length, matched: matched.length });
        } catch (e) {
          console.log(`  ❌ Parse error: ${e.message}`);
          resolve({ portal: 'remoteok', error: e.message });
        }
      });
    }).on('error', err => {
      console.log(`  ❌ Error: ${err.message}`);
      resolve({ portal: 'remoteok', error: err.message });
    });
  });
}

async function runTests() {
  console.log('=== REMOTE PORTAL LIVE VERIFICATION TEST ===');
  console.log('Connecting to real APIs — no mocks, no simulations\n');
  const r1 = await testWWR();
  const r2 = await testRemoteOK();
  console.log('\n=== SUMMARY ===');
  [r1, r2].forEach(r => {
    if (r.error) console.log(`❌ ${r.portal}: ERROR — ${r.error}`);
    else console.log(`✅ ${r.portal}: ${r.total} total jobs | ${r.matched} matching your profile`);
  });
}

runTests().catch(console.error);
