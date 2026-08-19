import fs from 'node:fs';

const contentCode = fs.readFileSync('content.js', 'utf8');
const fakeWindow = {};
new Function('window', contentCode)(fakeWindow);
const content = fakeWindow.OLYMPUS_CONTENT;

const serviceToCategoryMap = {
  'wedding-highlights': 'wedding-highlights',
  'editing-alone': 'editing-alone',
  'photo-film': 'film',
  'graphics': 'graphics',
  'editorial': 'editorial',
  'motion': 'motion',
  'events': 'events',
  'web': 'graphics',
  'ads-commercial': 'film'
};

content.services = content.services.map(service => ({
  ...service,
  portfolioCategory: serviceToCategoryMap[service.id] || 'all'
}));

fs.writeFileSync('content.js', `window.OLYMPUS_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
console.log('Successfully mapped all service categories in content.js:');
console.log(content.services.map(s => `[${s.id}] ${s.title} -> ${s.portfolioCategory}`).join('\n'));
