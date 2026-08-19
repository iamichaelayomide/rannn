import fs from 'node:fs';

// Load content.js
const contentCode = fs.readFileSync('content.js', 'utf8');
const fakeWindow = {};
new Function('window', contentCode)(fakeWindow);
const content = fakeWindow.OLYMPUS_CONTENT;

const fallbackImage = 'assets/portfolio-fallback.svg';
const iconNames = [
  'solar:camera-bold-duotone',
  'solar:palette-bold-duotone',
  'solar:notebook-bold-duotone',
  'solar:videocamera-record-bold-duotone',
  'solar:calendar-bold-duotone',
  'solar:code-square-bold-duotone'
];
const deliverables = [
  ['Editorial photography', 'Interview & campaign film', 'Colour-graded delivery'],
  ['Campaign design systems', 'Social & event posters', 'Brand-ready exports'],
  ['Magazine systems', 'Print-ready layouts', 'Certificates & publications'],
  ['Animated visual assets', 'Launch & brand motion', 'Platform-ready exports'],
  ['Conference coverage', 'Event highlight films', 'People & atmosphere'],
  ['Responsive interface design', 'Frontend development', 'Performance & launch support']
];
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const serviceCardsHtml = content.services.map((service, index) => `
          <article class="service-card glass-card border-gold-gradient rounded-3xl p-7 flex flex-col min-h-[310px] reveal-on-scroll stagger-${(index % 3) + 1}">
            <div class="service-card-icon"><iconify-icon icon="${iconNames[index % iconNames.length]}"></iconify-icon></div>
            <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400 mt-8">Service ${String(index + 1).padStart(2, '0')}</span>
            <h3 class="text-2xl font-bold text-white mt-3">${escapeHtml(service.title)}</h3>
            <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(service.summary)}</p>
            ${service.description ? `<p class="text-xs text-neutral-500 leading-relaxed mt-3">${escapeHtml(service.description)}</p>` : ''}
            <ul class="mt-6 space-y-2 text-xs text-neutral-300">
              ${(service.deliverables || deliverables[index] || []).map(item => `<li class="flex items-center gap-2"><span class="text-amber-400">✓</span>${escapeHtml(item)}</li>`).join('')}
            </ul>
            ${(service.title || '').toLowerCase().includes('wedding') || (service.title || '').toLowerCase().includes('videography') ? `
              <button type="button" class="wedding-package-trigger inline-flex items-center justify-center bg-gold-gradient text-neutral-950 font-bold px-5 py-3 rounded-full text-xs uppercase tracking-wider mt-6 hover:scale-105 transition-transform" data-open-wedding-modal="true">
                View Wedding Packages
              </button>
            ` : ''}
            <a href="#contact?intent=project&amp;service=${encodeURIComponent(service.title)}&amp;source_cta=Service%20card" data-page="contact" class="spa-nav-link text-xs font-bold uppercase tracking-wider text-amber-400 mt-auto pt-7">Brief this service →</a>
          </article>`).join('\n');

const weddingPackagesHtml = (content.weddingPackages || []).map((item, index) => `
            <article class="wedding-package glass-card border-gold-gradient rounded-3xl p-8 flex flex-col justify-between reveal-on-scroll stagger-${index + 1} ${index === 1 ? 'relative border-amber-400/50 shadow-xl shadow-amber-500/10' : ''}">
              ${index === 1 ? '<span class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold-gradient text-neutral-950 text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full font-mono">Most popular</span>' : ''}
              <div>
                <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400">Package 0${index + 1}</span>
                <h3 class="text-2xl font-bold text-white mt-2">${escapeHtml(item.name)}</h3>
                <strong class="text-3xl font-extrabold text-amber-400 mt-4 block font-display">${escapeHtml(item.price)}</strong>
                <ul class="mt-6 space-y-3 text-xs text-neutral-300">
                  ${item.features.map(feature => `<li class="flex items-center gap-2.5"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400 text-sm flex-shrink-0"></iconify-icon><span>${escapeHtml(feature)}</span></li>`).join('')}
                </ul>
              </div>
              <a href="#contact?intent=project&amp;service=${encodeURIComponent(`${item.name} Wedding Package`)}&amp;budget=${encodeURIComponent(item.price)}&amp;message=${encodeURIComponent(`I would like to book the ${item.name} Wedding Package (${item.price}) for full-day wedding videography coverage.`)}&amp;source_cta=Wedding%20packages%20section" data-page="contact" class="spa-nav-link inline-flex items-center justify-center bg-gold-gradient text-neutral-950 font-bold px-6 py-3.5 rounded-full text-xs uppercase tracking-wider mt-8 hover:scale-105 transition-transform w-full text-center">Book ${escapeHtml(item.name)} (${escapeHtml(item.price)})</a>
            </article>`).join('\n');

const teamHtml = content.teamMembers.map((member, index) => `
          <article class="team-card glass-card rounded-3xl overflow-hidden border border-white/10 reveal-on-scroll stagger-${(index % 3) + 1}">
            <div class="aspect-[4/5] overflow-hidden bg-neutral-900">
              <img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.name)} — ${escapeHtml(member.role)} at Olympus Atelier" class="w-full h-full object-cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/team/photographer.webp'">
            </div>
            <div class="p-6">
              <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${index === 0 ? 'Creative leadership' : 'Atelier team'}</span>
              <h3 class="text-2xl font-bold text-white mt-2">${escapeHtml(member.name)}</h3>
              <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">${escapeHtml(member.role)}</p>
              ${member.qualification ? `<p class="text-[11px] font-mono uppercase tracking-wider text-amber-400/80 mt-2">${escapeHtml(member.qualification)}</p>` : ''}
              <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(member.bio)}</p>
            </div>
          </article>`).join('\n');

const filterList = [
  { id: 'all', label: 'All Work' },
  { id: 'wedding-highlights', label: 'Wedding Highlights' },
  { id: 'editing-alone', label: 'Video Editing Alone' },
  { id: 'film', label: 'Film & Photography' },
  { id: 'events', label: 'Events & Conferences' },
  { id: 'graphics', label: 'Graphics & Branding' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'motion', label: 'Motion Design' }
];

const getFilterCount = (catId) => catId === 'all' ? content.portfolioItems.length : content.portfolioItems.filter(item => item.category === catId).length;

const filtersHtml = filterList.map(filter => `
        <button type="button" class="archive-filter${filter.id === 'all' ? ' active' : ''}" data-filter="${escapeHtml(filter.id)}">
          <span>${escapeHtml(filter.label)}</span>
          <span class="filter-count font-mono text-[11px] opacity-70 ml-1.5">(${getFilterCount(filter.id)})</span>
        </button>`).join('\n');

const initialPortfolioHtml = content.portfolioItems.slice(0, 12).map((item, index) => {
  const thumb = item.thumbnailSrc || item.thumbnail_src || fallbackImage;
  const mediaType = item.mediaType || item.media_type || 'image';
  const altText = item.alt || item.alt_text || item.title || '';
  return `
          <button type="button" class="portfolio-item archive-card text-left group reveal-on-scroll stagger-${(index % 3) + 1}" data-item-id="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.title)}">
            <span class="archive-card-media">
              <img src="${escapeHtml(thumb)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackImage}'">
              <span class="archive-card-overlay"></span>
              <span class="archive-card-type"><iconify-icon icon="${mediaType === 'video' ? 'solar:play-circle-bold' : mediaType === 'pdf' ? 'solar:document-bold' : 'solar:gallery-bold'}"></iconify-icon>${escapeHtml(mediaType)}</span>
            </span>
            <span class="archive-card-copy">
              <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${escapeHtml(item.collection || '')} · ${escapeHtml(item.year || '')}</span>
              <strong>${escapeHtml(item.title)}</strong>
            </span>
          </button>`;
}).join('\n');

let html = fs.readFileSync('index.html', 'utf8');

// Replace service-grid
html = html.replace(
  /<div id="service-grid"[^>]*>[\s\S]*?<\/div>/,
  `<div id="service-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite">\n${serviceCardsHtml}\n        </div>`
);

// Replace wedding-packages-grid
html = html.replace(
  /<div id="wedding-packages-grid"[^>]*>[\s\S]*?<\/div>/,
  `<div id="wedding-packages-grid" class="grid grid-cols-1 md:grid-cols-3 gap-8" aria-live="polite">\n${weddingPackagesHtml}\n          </div>`
);

// Replace portfolio-filters
html = html.replace(
  /<div id="portfolio-filters"[^>]*>[\s\S]*?<\/div>/,
  `<div id="portfolio-filters" class="flex flex-wrap gap-3 mb-10" aria-label="Filter portfolio">\n${filtersHtml}\n        </div>`
);

// Replace portfolio-grid
html = html.replace(
  /<div id="portfolio-grid"[^>]*>[\s\S]*?<\/div>/,
  `<div id="portfolio-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite">\n${initialPortfolioHtml}\n        </div>`
);

// Replace team-grid
html = html.replace(
  /<div id="team-grid"[^>]*>[\s\S]*?<\/div>/,
  `<div id="team-grid" class="team-grid" aria-label="Olympus Atelier team">\n${teamHtml}\n        </div>`
);

fs.writeFileSync('index.html', html);
console.log('Successfully pre-rendered static content with scroll reveals and category counts into index.html!');
