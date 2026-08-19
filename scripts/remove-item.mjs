import fs from 'node:fs';

const contentCode = fs.readFileSync('content.js', 'utf8');
const fakeWindow = {};
new Function('window', contentCode)(fakeWindow);
const content = fakeWindow.OLYMPUS_CONTENT;

const targetId = '1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y';
const initialLen = content.portfolioItems.length;

content.portfolioItems = content.portfolioItems.filter(item => item.id !== targetId);

console.log(`Removed item ${targetId}. Total items before: ${initialLen}, after: ${content.portfolioItems.length}`);

fs.writeFileSync('content.js', `window.OLYMPUS_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
console.log('Successfully updated content.js!');
