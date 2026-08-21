/**
 * Unit Test Runner for Global Remote Portals Expansion
 */

const { runAllGlobalRemoteSweeps } = require('./remote_crawlers');

async function testRemoteCrawlers() {
  console.log('[TestRunner] Starting Full Remote Suite Crawlers test...');
  const results = await runAllGlobalRemoteSweeps();
  console.log(`[TestRunner] Test completed. Retrieved ${results.length} total remote matches.`);
}

testRemoteCrawlers();
