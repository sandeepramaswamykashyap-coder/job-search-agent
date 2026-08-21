const { sendLinkedInConnection } = require('./linkedin_connector');

(async () => {
  console.log('Testing live LinkedIn connection dispatch...');
  const res = await sendLinkedInConnection({
    profileUrl: 'https://www.linkedin.com/in/mohamed-thalhath-14a93811/',
    name: 'Mohamed Thalhath',
    title: 'Transformation Lead',
    company: 'PwC India',
    persona: 'hiring_manager',
    testMode: false
  });

  console.log('Connection Request Result:', res);
})().catch(console.error);
