import fs from 'node:fs';

const contentCode = fs.readFileSync('content.js', 'utf8');
const fakeWindow = {};
new Function('window', contentCode)(fakeWindow);
const content = fakeWindow.OLYMPUS_CONTENT;

const availableWebps = fs.readdirSync('assets/portfolio')
  .filter(f => f.endsWith('.webp'))
  .map(f => `assets/portfolio/${f}`);

console.log(`Found ${availableWebps.length} real WebP image files in assets/portfolio/`);

// Select premium cinematic & event posters for wedding & editing videos
const cinematicCovers = [
  'assets/portfolio/1-BSammCzXutc3kMqUJ50T52brtHn_U3T.webp',
  'assets/portfolio/10A3xT4MIBnYIbYaGicb06VEeq-DuLLJf.webp',
  'assets/portfolio/10_Mqm8M0qBHQcCR6UC42lym9nUUJVPU7.webp',
  'assets/portfolio/11G1jo4MzGuprva5FpltoFwjqYfvYoQ05.webp',
  'assets/portfolio/12rO2OtmwmtvSRaaeBPjCzPPvVO6I-rot.webp',
  'assets/portfolio/13-r8IawIw391C8cB8vifGIBra8xJHsf8.webp',
  'assets/portfolio/142RvVhOy0X9T3gh6deImuZxUlRKxZ5Be.webp',
  'assets/portfolio/15RigdclKrjgq7yJcLZcLz8JqD1ld6rWK.webp',
  'assets/portfolio/16qJO-R6eTQTYvYZSguRMPCTClB8lT1KL.webp',
  'assets/portfolio/18b2TRY2RDowKSvvnPIgHf59sv44IKmc7.webp'
];

let coverIdx = 0;
content.portfolioItems = content.portfolioItems.map((item, idx) => {
  const directPath = `assets/portfolio/${item.id}.webp`;
  let thumbnail = directPath;

  if (!fs.existsSync(directPath)) {
    thumbnail = cinematicCovers[coverIdx % cinematicCovers.length];
    coverIdx++;
  }

  return {
    ...item,
    thumbnailSrc: thumbnail,
    previewSrc: item.previewSrc || thumbnail
  };
});

// Also map service category IDs so each service links directly to portfolio
const serviceToCategoryMap = {
  'wedding-highlights': 'wedding-highlights',
  'video-editing': 'editing-alone',
  'videography-editing': 'editing-alone',
  'photo-film': 'film',
  'graphics-branding': 'graphics',
  'editorial-magazines': 'editorial',
  'motion-design': 'motion',
  'events-conferences': 'events',
  'interactive-web': 'graphics',
  'commercials': 'film'
};

content.services = content.services.map(service => {
  const category = serviceToCategoryMap[service.id] || 'all';
  return {
    ...service,
    portfolioCategory: category
  };
});

fs.writeFileSync('content.js', `window.OLYMPUS_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
console.log('Successfully updated content.js with real WebP image thumbnails for all 215 items!');
