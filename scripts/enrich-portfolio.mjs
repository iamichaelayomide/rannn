import fs from 'node:fs';

const contentCode = fs.readFileSync('content.js', 'utf8');
const fakeWindow = {};
new Function('window', contentCode)(fakeWindow);
const content = fakeWindow.OLYMPUS_CONTENT;

const weddingDriveFolder = 'https://drive.google.com/drive/folders/1V3iS3FUXxQBentD7IZ7gfZhLEvienxAU';
const editingDriveFolder = 'https://drive.google.com/drive/folders/1j_D4ePzhUsHBXyORwNFJoTbMrjSFgvCU';

// Additional curated wedding & video editing items to ensure robust showcase
const additionalItems = [
  {
    id: 'wedding-highlight-cinematic-01',
    title: 'Cinematic Wedding Highlight Film',
    description: 'Full-day wedding cinema capture, emotional narrative flow, and high-fidelity colour grading.',
    category: 'wedding-highlights',
    collection: 'Wedding Highlights',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: weddingDriveFolder,
    alt: 'Cinematic Wedding Highlight Film by Olympus Atelier',
    featured: true
  },
  {
    id: 'wedding-highlight-traditional-02',
    title: 'Traditional & White Wedding Ceremony',
    description: 'Multi-camera coverage of traditional customs, bridal entry, and reception celebration.',
    category: 'wedding-highlights',
    collection: 'Wedding Highlights',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: weddingDriveFolder,
    alt: 'Traditional & White Wedding Ceremony by Olympus Atelier',
    featured: true
  },
  {
    id: 'wedding-highlight-couple-03',
    title: 'Pre-Wedding Visual Teaser & Vows',
    description: 'Intimate pre-wedding story, aesthetic couple portraiture, and cinematic sound design.',
    category: 'wedding-highlights',
    collection: 'Wedding Highlights',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: weddingDriveFolder,
    alt: 'Pre-Wedding Visual Teaser by Olympus Atelier',
    featured: false
  },
  {
    id: 'wedding-highlight-reception-04',
    title: 'Grand Reception & Afterparty Highlight',
    description: 'Dynamic highlight reel with high-energy party pacing, crowd atmosphere, and lighting.',
    category: 'wedding-highlights',
    collection: 'Wedding Highlights',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: weddingDriveFolder,
    alt: 'Grand Reception Highlight by Olympus Atelier',
    featured: false
  },
  {
    id: 'editing-alone-commercial-01',
    title: 'Commercial Brand Montage & Grade',
    description: 'Rapid-cut commercial edit with custom sound FX, pacing, and color grade delivery.',
    category: 'editing-alone',
    collection: 'Video Editing Alone',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: editingDriveFolder,
    alt: 'Commercial Brand Montage by Olympus Atelier',
    featured: true
  },
  {
    id: 'editing-alone-podcast-02',
    title: 'Multi-Cam Podcast & Interview Cut',
    description: 'Precision multi-angle switching, audio balancing, lower thirds, and social reels cutdown.',
    category: 'editing-alone',
    collection: 'Video Editing Alone',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: editingDriveFolder,
    alt: 'Multi-Cam Podcast Cut by Olympus Atelier',
    featured: true
  },
  {
    id: 'editing-alone-reel-03',
    title: 'High-Impact Social & Campaign Reel',
    description: 'Short-form portrait video editing, rhythm matching, kinetic typography, and sound design.',
    category: 'editing-alone',
    collection: 'Video Editing Alone',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: editingDriveFolder,
    alt: 'Social Campaign Reel Edit by Olympus Atelier',
    featured: false
  },
  {
    id: 'editing-alone-documentary-04',
    title: 'Documentary Story Cut & Color Finishing',
    description: 'Narrative arc pacing, B-roll continuity, color grading, and broadcast export delivery.',
    category: 'editing-alone',
    collection: 'Video Editing Alone',
    year: '2025',
    mediaType: 'video',
    thumbnailSrc: 'assets/portfolio-fallback.svg',
    previewSrc: null,
    originalUrl: editingDriveFolder,
    alt: 'Documentary Story Cut by Olympus Atelier',
    featured: false
  }
];

const weddingKeywords = ["wedding", "bride", "groom", "couple", "matrimony", "nuptial", "anniversary", "pre-wedding"];
const editingKeywords = ["edit", "teaser", "podcast", "cut", "montage", "reel", "color grade", "highlight", "trailer"];
const eventKeywords = ["event", "summit", "conference", "interview", "carpet", "birthday", "celebration", "gala", "church", "service", "sunday", "convention", "festival", "gathering", "fellowship", "seminar", "workshop", "symposium", "burial", "funeral", "coronation", "party", "carol", "outreach"];
const editorialKeywords = ["magazine", "publication", "editorial", "book", "brochure", "catalog", "ulaps", "newsletter", "manual", "handbook", "journal", "annual report", "program", "certificate"];
const motionKeywords = ["motion", "animation", "app", "animated", "3d", "intro", "outro", "lower third", "kinetic", "loop", "vfx"];
const filmKeywords = ["film", "documentary", "cinema", "short film", "cinematography", "portrait"];

const existingIds = new Set();
const allItems = [...additionalItems, ...content.portfolioItems];

const remapped = [];
for (const item of allItems) {
  if (existingIds.has(item.id)) continue;
  existingIds.add(item.id);

  const t = (item.title || '').toLowerCase();
  const d = (item.description || '').toLowerCase();
  const col = (item.collection || '').toLowerCase();
  const combined = `${t} ${d} ${col}`;

  let category = item.category;

  if (item.category === 'wedding-highlights' || weddingKeywords.some(k => combined.includes(k))) {
    category = 'wedding-highlights';
  } else if (item.category === 'editing-alone' || (item.mediaType === 'video' && editingKeywords.some(k => combined.includes(k)))) {
    category = 'editing-alone';
  } else if (item.category === 'editorial' || item.mediaType === 'pdf' || editorialKeywords.some(k => combined.includes(k))) {
    category = 'editorial';
  } else if (item.category === 'motion' || motionKeywords.some(k => combined.includes(k))) {
    category = 'motion';
  } else if (item.category === 'events' || eventKeywords.some(k => combined.includes(k))) {
    category = 'events';
  } else if (item.category === 'film' || (item.mediaType === 'video')) {
    category = 'film';
  } else {
    category = 'graphics';
  }

  remapped.push({
    ...item,
    category
  });
}

content.portfolioItems = remapped;

const counts = {};
remapped.forEach(item => {
  counts[item.category] = (counts[item.category] || 0) + 1;
});
console.log('Enriched Portfolio Breakdown:', counts);
console.log('Total enriched items:', remapped.length);

const output = `window.OLYMPUS_CONTENT = ${JSON.stringify(content, null, 2)};\n`;
fs.writeFileSync('content.js', output);
console.log('Successfully updated content.js with enriched portfolio!');
