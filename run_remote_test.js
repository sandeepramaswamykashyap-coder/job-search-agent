const { applyToNewRemotePortals } = require('./apply_new_remote_portals');

(async () => {
  console.log('Running live Global Remote Portals Sweep...');
  await applyToNewRemotePortals();
  console.log('Global Remote Sweep Complete.');
})().catch(console.error);
