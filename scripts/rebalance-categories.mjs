import fs from 'node:fs';

const contentCode = fs.readFileSync('content.js', 'utf8');
const fakeWindow = {};
new Function('window', contentCode)(fakeWindow);
const content = fakeWindow.OLYMPUS_CONTENT;

const filmKeywords = ['ciod', 'pamela', 'osime', 'teaser', 'podcast', 'documentary', 'cinema', 'cinematography', 'film', 'portrait', '0703', '0773', '123', 'original'];
const eventKeywords = ['summit', 'conference', 'interview', 'carpet', 'ezimadu', 'eqwuekwe', 'peter', 'sadibo', 'osanyin', 'birthday', 'celebration', 'gala', 'church', 'service', 'sunday', 'convention', 'festival', 'gathering', 'fellowship', 'seminar', 'workshop', 'symposium', 'burial', 'funeral', 'coronation', 'party', 'carol', 'outreach', 'dinner'];
const editorialKeywords = ['ulaps', 'magazine', 'epitherapy', 'publication', 'editorial', 'certificate', 'book', 'catalog', 'brochure', 'handbook'];
const motionKeywords = ['motion', 'app', 'animation', 'animated', '3d', 'loop', 'vfx', 'kinetic'];
const weddingKeywords = ['wedding', 'bride', 'groom', 'matrimony', 'nuptial', 'couple'];
const editingKeywords = ['editing', 'montage', 'grade', 'cut', 'reel', 'post-production'];

content.portfolioItems = content.portfolioItems.map(item => {
  const t = (item.title || '').toLowerCase();
  const d = (item.description || '').toLowerCase();
  const col = (item.collection || '').toLowerCase();
  const id = (item.id || '').toLowerCase();
  const combined = `${t} ${d} ${col} ${id}`;

  if (weddingKeywords.some(k => combined.includes(k))) {
    return { ...item, category: 'wedding-highlights', collection: 'Wedding Highlights' };
  }
  if (editingKeywords.some(k => combined.includes(k))) {
    return { ...item, category: 'editing-alone', collection: 'Video Editing Alone' };
  }
  if (editorialKeywords.some(k => combined.includes(k)) || item.mediaType === 'pdf') {
    return { ...item, category: 'editorial', collection: 'Editorial' };
  }
  if (motionKeywords.some(k => combined.includes(k))) {
    return { ...item, category: 'motion', collection: 'Motion Design' };
  }
  if (filmKeywords.some(k => combined.includes(k))) {
    return { ...item, category: 'film', collection: 'Film & Photography' };
  }
  if (eventKeywords.some(k => combined.includes(k))) {
    return { ...item, category: 'events', collection: 'Events & Conferences' };
  }
  return { ...item, category: 'graphics', collection: 'Graphics & Branding' };
});

const counts = {};
content.portfolioItems.forEach(item => {
  counts[item.category] = (counts[item.category] || 0) + 1;
});

console.log('Rebalanced Category Breakdown:');
console.log(counts);

fs.writeFileSync('content.js', `window.OLYMPUS_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
