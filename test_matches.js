const { fetchAllLiveATSJobs } = require('./company_ats_fetcher');
const { isRoleRelevant } = require('./role_relevance_filter');

(async () => {
  const jobs = await fetchAllLiveATSJobs();
  const matched = jobs.filter(j => isRoleRelevant(j.title));
  console.log('Total live ATS jobs:', jobs.length);
  console.log('Strictly matched relevant leadership roles:', matched.length);
  console.log('--- Matched Roles List ---');
  matched.forEach((j, i) => {
    console.log((i + 1) + '. [' + j.company + '] ' + j.title + ' -> ' + j.applyUrl);
  });
})();
