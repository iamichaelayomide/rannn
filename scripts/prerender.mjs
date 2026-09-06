import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Get clean baseline index.html from commit c2e510a (before any corrupted replacements)
const baseHtml = execSync('git show c2e510a:index.html', { encoding: 'utf8' });

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
            <div class="service-card-icon"><iconify-icon icon="${service.icon || iconNames[index % iconNames.length]}"></iconify-icon></div>
            <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400 mt-8">Service ${String(index + 1).padStart(2, '0')}</span>
            <h3 class="text-2xl font-bold text-white mt-3">${escapeHtml(service.title)}</h3>
            <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(service.summary)}</p>
            ${service.description ? `<p class="text-xs text-neutral-500 leading-relaxed mt-3">${escapeHtml(service.description)}</p>` : ''}
            <ul class="mt-6 space-y-2 text-xs text-neutral-300">
              ${(service.deliverables || []).map(item => `<li class="flex items-center gap-2"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400 text-sm flex-shrink-0"></iconify-icon><span>${escapeHtml(item)}</span></li>`).join('')}
            </ul>
            ${(service.title || '').toLowerCase().includes('wedding') ? `
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
            <div class="p-6 flex flex-col flex-1">
              <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${index < 2 ? 'Creative leadership' : 'Atelier team'}</span>
              <h3 class="text-2xl font-bold text-white mt-2">${escapeHtml(member.name)}</h3>
              <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">${escapeHtml(member.role)}</p>
              ${member.qualification ? `<p class="text-[11px] font-mono uppercase tracking-wider text-amber-400/80 mt-2">${escapeHtml(member.qualification)}</p>` : ''}
              <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(member.bio)}</p>
            </div>
          </article>`).join('\n');

const filterList = [
  { id: 'all', label: 'All Work' },
  { id: 'wedding', label: 'Weddings' },
  { id: 'editing-alone', label: 'Video Editing' },
  { id: 'film', label: 'Film & Photography' },
  { id: 'events', label: 'Events & Conferences' },
  { id: 'graphics', label: 'Graphics & Branding' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'motion', label: 'Motion Design' }
];

const filtersHtml = filterList.map(filter => `
        <button type="button" class="archive-filter${filter.id === 'all' ? ' active' : ''}" data-filter="${escapeHtml(filter.id)}" onclick="window.setPortfolioCategory('${escapeHtml(filter.id)}')">
          <span>${escapeHtml(filter.label)}</span>
        </button>`).join('\n');

const initialPortfolioHtml = content.portfolioItems.slice(0, 12).map((item, index) => {
  const thumb = item.thumbnailSrc || item.thumbnail_src || fallbackImage;
  const mediaType = item.mediaType || item.media_type || 'image';
  const altText = item.alt || item.alt_text || item.title || '';
  return `
          <button type="button" class="portfolio-item archive-card text-left group" data-item-id="${escapeHtml(item.id)}" onclick="window.openOlympusPortfolioItem('${escapeHtml(item.id)}')" aria-label="View ${escapeHtml(item.title)}">
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

// Clean section replacement
let html = baseHtml;

// Section 2: Services
const servicesSection = `
    <!-- PAGE 2: SERVICES -->
    <section id="page-services" class="spa-page">
      <div class="max-w-7xl mx-auto px-6 py-16 lg:py-24 space-y-20">
        <div>
          <div class="max-w-3xl mb-12">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Disciplines &amp; Commissions</span>
            <h2 class="h2-editorial font-extrabold text-white mt-3">Cinematography, Events &amp; Post-Production</h2>
            <p class="text-neutral-400 text-base md:text-lg mt-5 leading-relaxed">From full-day wedding cinema and multi-camera event coverage to high-end video editing, commercial campaigns, and digital systems—every commission is shaped with intentional craft.</p>
          </div>
          <div id="service-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite">
${serviceCardsHtml}
          </div>
        </div>

        <!-- Dedicated Wedding Videography Packages Section -->
        <div id="wedding-pricing-section" class="border-t border-white/10 pt-16">
          <div class="max-w-3xl mb-12">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Specialized Coverage</span>
            <h2 class="h2-editorial font-extrabold text-white mt-3">Wedding Videography Packages</h2>
            <p class="text-neutral-400 text-base md:text-lg mt-4 leading-relaxed">Three distinct coverage packages crafted for full-day celebrations, intimate moments, and cinema-grade final delivery.</p>
          </div>
          <div id="wedding-packages-grid" class="grid grid-cols-1 md:grid-cols-3 gap-8" aria-live="polite">
${weddingPackagesHtml}
          </div>
        </div>
      </div>
    </section>`;

// Section 3: Portfolio
const portfolioSection = `
    <!-- PAGE 3: PORTFOLIO -->
    <section id="page-portfolio" class="spa-page">
      <div class="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div class="max-w-3xl">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Full Archive</span>
            <h2 class="selected-work-title text-white mt-3">Work built to be seen.</h2>
            <p class="text-neutral-400 text-sm md:text-base mt-3 leading-relaxed font-light">Explore our body of work spanning weddings, event coverage, video editing showcases, brand films, motion visuals, and design.</p>
          </div>
          <p id="portfolio-result-status" class="text-xs font-mono uppercase tracking-widest text-neutral-500" aria-live="polite"></p>
        </div>
        <div class="relative mb-8">
          <div id="portfolio-filters" class="flex gap-2.5 pb-2" aria-label="Filter portfolio">
${filtersHtml}
          </div>
        </div>
        <div id="portfolio-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite">
${initialPortfolioHtml}
        </div>
        <div class="flex justify-center mt-12">
          <button id="portfolio-load-more" type="button" class="hidden bg-gold-gradient text-neutral-950 font-bold px-8 py-3.5 rounded-full hover:-translate-y-0.5 transition-transform">Load more work</button>
        </div>
      </div>
    </section>`;

// Replace Capabilities Deck Cards in baseHtml
const capabilitiesDeckHtml = `
          <!-- Reset Stack button on top right -->
          <button id="restack-deck-btn" class="absolute top-[-60px] right-0 bg-white/5 border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 hidden">
            <iconify-icon icon="solar:round-transfer-horizontal-bold" class="text-sm"></iconify-icon>
            <span>Restack Deck</span>
          </button>

          <!-- Card 1: Weddings -->
          <div class="capabilities-card bg-blur-gradient-1 border-gold-gradient p-6 rounded-3xl flex flex-col justify-between h-[360px] w-[280px] border border-white/5 absolute transition-all duration-300 overflow-hidden cursor-pointer" data-card-idx="0">
            <div class="sweep-shine"></div>
            <div class="absolute inset-0 bg-neutral-950/10 pointer-events-none"></div>
            <div class="hover-icon-topright text-gold-gradient">
              <iconify-icon icon="solar:videocamera-record-bold-duotone" class="text-xl"></iconify-icon>
            </div>
            <div class="card-content-wrapper h-full flex flex-col justify-between relative z-10 w-full transition-opacity duration-300">
              <div class="overflow-hidden">
                <div class="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gold-gradient mb-6 card-icon-wrapper">
                  <iconify-icon icon="solar:videocamera-record-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <div class="relative h-[200px] overflow-hidden">
                  <div class="primary-content-block absolute inset-0 transition-all duration-500 space-y-2">
                    <h3 class="text-lg font-bold text-white mb-2 uppercase font-display">Weddings</h3>
                    <p class="text-neutral-400 text-xs font-light leading-relaxed mb-4">
                      Full-day wedding cinema capture, emotional narrative flow, ceremony highlights, and color grading.
                    </p>
                  </div>
                  <div class="deliverables-content-block absolute inset-0 translate-y-[100px] opacity-0 transition-all duration-500 flex flex-col justify-center space-y-3">
                    <span class="text-[9px] font-mono text-gold-gradient uppercase tracking-widest">Pillar Deliverables:</span>
                    <ul class="space-y-2 text-[10px] font-mono text-neutral-300">
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-1"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Full-day Wedding Cinema</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-2"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Highlight &amp; Teaser Films</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-3"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Colour-graded Delivery</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                <a href="#services" class="text-xs font-bold text-gold-gradient uppercase tracking-widest flex items-center gap-1.5 spa-nav-link" data-page="services">
                  Learn More <iconify-icon icon="solar:arrow-right-linear" class="text-xs"></iconify-icon>
                </a>
                <span class="text-[9px] font-mono text-neutral-500 uppercase select-none text-right">Pillar 01</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Events & Conferences -->
          <div class="capabilities-card bg-blur-gradient-2 border-gold-gradient p-6 rounded-3xl flex flex-col justify-between h-[360px] w-[280px] border border-white/5 absolute transition-all duration-300 overflow-hidden cursor-pointer" data-card-idx="1">
            <div class="sweep-shine"></div>
            <div class="absolute inset-0 bg-neutral-950/10 pointer-events-none"></div>
            <div class="hover-icon-topright text-gold-gradient">
              <iconify-icon icon="solar:calendar-bold-duotone" class="text-xl"></iconify-icon>
            </div>
            <div class="card-content-wrapper h-full flex flex-col justify-between relative z-10 w-full transition-opacity duration-300">
              <div class="overflow-hidden">
                <div class="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gold-gradient mb-6 card-icon-wrapper">
                  <iconify-icon icon="solar:calendar-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <div class="relative h-[200px] overflow-hidden">
                  <div class="primary-content-block absolute inset-0 transition-all duration-500 space-y-2">
                    <h3 class="text-lg font-bold text-white mb-2 uppercase font-display">Events &amp; Conferences</h3>
                    <p class="text-neutral-400 text-xs font-light leading-relaxed mb-4">
                      Capturing summits, conferences, festivals, and live celebrations with people-first cinematic direction.
                    </p>
                  </div>
                  <div class="deliverables-content-block absolute inset-0 translate-y-[100px] opacity-0 transition-all duration-500 flex flex-col justify-center space-y-3">
                    <span class="text-[9px] font-mono text-gold-gradient uppercase tracking-widest">Pillar Deliverables:</span>
                    <ul class="space-y-2 text-[10px] font-mono text-neutral-300">
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-1"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Conference Coverage</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-2"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Event Highlight Films</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-3"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Atmosphere &amp; Interviews</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                <a href="#services" class="text-xs font-bold text-gold-gradient uppercase tracking-widest flex items-center gap-1.5 spa-nav-link" data-page="services">
                  Learn More <iconify-icon icon="solar:arrow-right-linear" class="text-xs"></iconify-icon>
                </a>
                <span class="text-[9px] font-mono text-neutral-500 uppercase select-none text-right">Pillar 02</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Video Editing -->
          <div class="capabilities-card bg-blur-gradient-3 border-gold-gradient p-6 rounded-3xl flex flex-col justify-between h-[360px] w-[280px] border border-white/5 absolute transition-all duration-300 overflow-hidden cursor-pointer" data-card-idx="2">
            <div class="sweep-shine"></div>
            <div class="absolute inset-0 bg-neutral-950/10 pointer-events-none"></div>
            <div class="hover-icon-topright text-gold-gradient">
              <iconify-icon icon="solar:play-circle-bold-duotone" class="text-xl"></iconify-icon>
            </div>
            <div class="card-content-wrapper h-full flex flex-col justify-between relative z-10 w-full transition-opacity duration-300">
              <div class="overflow-hidden">
                <div class="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gold-gradient mb-6 card-icon-wrapper">
                  <iconify-icon icon="solar:play-circle-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <div class="relative h-[200px] overflow-hidden">
                  <div class="primary-content-block absolute inset-0 transition-all duration-500 space-y-2">
                    <h3 class="text-lg font-bold text-white mb-2 uppercase font-display">Video Editing</h3>
                    <p class="text-neutral-400 text-xs font-light leading-relaxed mb-4">
                      Bring your existing footage. We shape pacing, DaVinci Resolve color grading, audio, and platform-ready exports.
                    </p>
                  </div>
                  <div class="deliverables-content-block absolute inset-0 translate-y-[100px] opacity-0 transition-all duration-500 flex flex-col justify-center space-y-3">
                    <span class="text-[9px] font-mono text-gold-gradient uppercase tracking-widest">Pillar Deliverables:</span>
                    <ul class="space-y-2 text-[10px] font-mono text-neutral-300">
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-1"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Pacing &amp; Narrative Flow</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-2"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>DaVinci Color Grading</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-3"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Multi-aspect Deliveries</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                <a href="#services" class="text-xs font-bold text-gold-gradient uppercase tracking-widest flex items-center gap-1.5 spa-nav-link" data-page="services">
                  Learn More <iconify-icon icon="solar:arrow-right-linear" class="text-xs"></iconify-icon>
                </a>
                <span class="text-[9px] font-mono text-neutral-500 uppercase select-none text-right">Pillar 03</span>
              </div>
            </div>
          </div>

          <!-- Card 4: Commercials & Brand Video -->
          <div class="capabilities-card bg-blur-gradient-4 border-gold-gradient p-6 rounded-3xl flex flex-col justify-between h-[360px] w-[280px] border border-white/5 absolute transition-all duration-300 overflow-hidden cursor-pointer" data-card-idx="3">
            <div class="sweep-shine"></div>
            <div class="absolute inset-0 bg-neutral-950/10 pointer-events-none"></div>
            <div class="hover-icon-topright text-gold-gradient">
              <iconify-icon icon="solar:clapperboard-play-bold-duotone" class="text-xl"></iconify-icon>
            </div>
            <div class="card-content-wrapper h-full flex flex-col justify-between relative z-10 w-full transition-opacity duration-300">
              <div class="overflow-hidden">
                <div class="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gold-gradient mb-6 card-icon-wrapper">
                  <iconify-icon icon="solar:clapperboard-play-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <div class="relative h-[200px] overflow-hidden">
                  <div class="primary-content-block absolute inset-0 transition-all duration-500 space-y-2">
                    <h3 class="text-lg font-bold text-white mb-2 uppercase font-display">Commercials &amp; Brand Video</h3>
                    <p class="text-neutral-400 text-xs font-light leading-relaxed mb-4">
                      Cinematic brand campaigns, executive interviews, and promotional video designed to captivate your audience.
                    </p>
                  </div>
                  <div class="deliverables-content-block absolute inset-0 translate-y-[100px] opacity-0 transition-all duration-500 flex flex-col justify-center space-y-3">
                    <span class="text-[9px] font-mono text-gold-gradient uppercase tracking-widest">Pillar Deliverables:</span>
                    <ul class="space-y-2 text-[10px] font-mono text-neutral-300">
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-1"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Scripting &amp; Production</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-2"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>4K Cinema Cameras</li>
                      <li class="flex items-center gap-2 transition-all duration-500 translate-y-3 opacity-0 stagger-3"><iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>Social &amp; Broadcast Cuts</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                <a href="#services" class="text-xs font-bold text-gold-gradient uppercase tracking-widest flex items-center gap-1.5 spa-nav-link" data-page="services">
                  Learn More <iconify-icon icon="solar:arrow-right-linear" class="text-xs"></iconify-icon>
                </a>
                <span class="text-[9px] font-mono text-neutral-500 uppercase select-none text-right">Pillar 04</span>
              </div>
            </div>
          </div>
`;

// Home Hero, Vision & Stats Section
const homeHeroAndVisionHtml = `
      <!-- Hero Section -->
      <div id="managed-home-hero" class="max-w-7xl mx-auto px-6 py-16 sm:py-20 lg:py-36 text-center flex flex-col items-center relative">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <span id="managed-hero-eyebrow" class="text-xs font-bold text-amber-400 uppercase tracking-[0.3em] mb-6 block font-mono">Olympus Atelier · Weddings, Events &amp; Post-Production</span>
        
        <h1 class="h1-editorial font-extrabold uppercase tracking-tighter text-white max-w-4xl mb-8 flex flex-col liquid-hero-text cursor-pointer">
          <span id="managed-hero-title-one">Cinematic Direction For</span>
          <span id="managed-hero-title-two" class="text-gold-gradient">Weddings, Events &amp; Film</span>
        </h1>

        <p id="managed-hero-body" class="text-neutral-300 text-base md:text-lg max-w-2xl font-light leading-relaxed mb-8 sm:mb-12">
          Full-day wedding coverage, high-profile event cinematography, and professional post-production crafted with emotion, pacing, and color-graded precision.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-5">
          <a href="#contact?intent=project&amp;source_cta=Home%20Hero" class="w-full sm:w-auto inline-flex items-center justify-center bg-gold-gradient text-neutral-950 font-bold px-8 py-4 rounded-full transition-transform duration-300 hover:-translate-y-0.5 shadow-lg shadow-amber-500/10 spa-nav-link" data-page="contact">
            Start A Project
          </a>
          <a href="#services" class="w-full sm:w-auto inline-flex items-center justify-center glass-card text-white font-semibold px-8 py-4 rounded-full hover:bg-white/5 transition-transform duration-300 hover:-translate-y-0.5 border-gold-gradient spa-nav-link" data-page="services">
            Our Services
          </a>
        </div>
        <button type="button" id="view-cac-certificate" aria-label="See our CAC registration certificate" aria-controls="lightbox-modal" class="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-amber-400 transition-colors">
          <iconify-icon icon="solar:verified-check-bold-duotone" class="text-lg text-amber-400"></iconify-icon>
          CAC registered · RC 7445892 · See Certificate
        </button>
      </div>

      <!-- Center Statement Block -->
      <div class="max-w-4xl mx-auto px-6 py-16 text-center border-t border-white/5">
        <div class="flex items-center justify-center gap-2 mb-6">
          <span class="w-2 h-2 bg-amber-400 rounded-full"></span>
          <span class="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 font-mono">Our Vision</span>
        </div>
        <p id="word-reveal-paragraph" class="text-xl md:text-3xl font-medium tracking-tight leading-relaxed text-neutral-200 font-display">
          We direct, film, and edit timeless visual stories. Specializing in luxury weddings, multi-camera event coverage, and high-end video post-production, Olympus combines intentional pacing with cinema-grade color to create films that outlive the moment.
        </p>
      </div>

      <!-- Trust Bar / Stats -->
      <div class="border-y border-white/5 bg-neutral-950/40 backdrop-blur-md py-12" id="trust-stats-section">
        <div class="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8 text-center">
          <div class="flex flex-col items-center">
            <span class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gold-gradient font-display flex items-center justify-center">
              <span class="stat-roll-number" data-target="240" data-decimals="0">0</span>+
            </span>
            <span class="text-xs text-neutral-400 uppercase tracking-widest mt-2 font-mono">Works Delivered</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-display flex items-center justify-center">
              <span class="stat-roll-number" data-target="100" data-decimals="0">0</span>%
            </span>
            <span class="text-xs text-neutral-400 uppercase tracking-widest mt-2 font-mono">On-Time Delivery</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-display flex items-center justify-center">
              <span class="stat-roll-number" data-target="4" data-decimals="0">0</span>K
            </span>
            <span class="text-xs text-neutral-400 uppercase tracking-widest mt-2 font-mono">Cinema Grade Masters</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gold-gradient font-display flex items-center justify-center">
              <span class="stat-roll-number" data-target="15" data-decimals="0">0</span>+
            </span>
            <span class="text-xs text-neutral-400 uppercase tracking-widest mt-2 font-mono">Industry Awards</span>
          </div>
        </div>
      </div>
`;

// Replace Home Hero, Vision & Stats
html = html.replace(
  /<!-- Hero Section -->[\s\S]*?<!-- Capabilities Card Stack section/,
  `${homeHeroAndVisionHtml.trim()}\n\n      <!-- Capabilities Card Stack section`
);

html = html.replace(
  /<div class="relative w-full min-h-\[460px\] mt-12" id="capabilities-deck-container">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `<div class="relative w-full min-h-[460px] mt-12" id="capabilities-deck-container">${capabilitiesDeckHtml}\n        </div>`
);

// Fallback replace for capabilities deck container if regex didn't match
if (!html.includes('data-card-idx="0"') || html.includes('Photography & Video')) {
  html = html.replace(
    /<div class="relative w-full min-h-\[460px\] mt-12" id="capabilities-deck-container">[\s\S]*?<!-- PAGE 2: SERVICES -->/,
    `<div class="relative w-full min-h-[460px] mt-12" id="capabilities-deck-container">${capabilitiesDeckHtml}\n        </div>\n      </div>\n    </div>\n\n    </section>\n\n    <!-- PAGE 2: SERVICES -->`
  );
}

// PAGE 4: ABOUT Section with Team Members Grid & How We Work
const aboutSection = `
    <!-- PAGE 4: ABOUT -->
    <section id="page-about" class="spa-page">
      <div class="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end mb-16">
          <div class="lg:col-span-7">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">The atelier</span>
            <h2 class="h2-editorial font-extrabold text-white mt-3">A compact team with an end-to-end visual practice.</h2>
          </div>
          <p class="lg:col-span-5 text-neutral-400 leading-relaxed">Olympus Atelier brings creative direction, photography, cinematography, editing, visual design, motion, and editorial production into one collaborative workflow.</p>
        </div>
        <div id="team-grid" class="team-grid" aria-label="Olympus Atelier team">
${teamHtml}
        </div>
        <div class="glass-card border-gold-gradient rounded-3xl p-8 md:p-12 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/5"><img src="assets/media/prefooter-stage.webp" alt="A professional conference stage covered by Olympus Atelier" class="w-full h-full object-cover" loading="lazy"></div>
          <div class="lg:col-span-7">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">How we work</span>
            <h3 class="text-3xl md:text-4xl font-bold text-white mt-3">One visual language, from concept to delivery.</h3>
            <p class="text-neutral-400 mt-5 leading-relaxed">Every project begins with the audience and the moment that matters. We shape the concept, capture the material, refine it in post, and deliver a coherent system that works across screens, campaigns, events, and publications.</p>
          </div>
        </div>
      </div>
    </section>
`;

// PAGE 5: BOOK NOW Section
const bookSection = `
    <!-- PAGE 5: BOOK NOW -->
    <section id="page-book" class="spa-page">
      <div class="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 mb-3">
            <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0"></span>
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono header-eyebrow-text">Direct Atelier Line</span>
          </div>
          <h2 class="h2-editorial font-extrabold text-white mt-2 header-title-text">Start a Project</h2>
          <p class="text-neutral-400 text-sm md:text-base mt-4 max-w-2xl mx-auto font-light leading-relaxed header-body-text">Tell us what you need and we will prepare a personalized brief directly on WhatsApp for instant review and pricing.</p>
        </div>
        <form id="booking-form" class="glass-card border-gold-gradient p-6 md:p-10 rounded-3xl space-y-6 shadow-2xl">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label for="booking-name" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Full Name <span class="text-amber-400">*</span></label>
              <input id="booking-name" name="name" type="text" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" required placeholder="Your full name">
            </div>
            <div>
              <label for="booking-phone" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Phone or WhatsApp <span class="text-amber-400">*</span></label>
              <input id="booking-phone" name="phone" type="tel" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" required placeholder="+234 ...">
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label for="booking-email" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Email Address <span class="text-neutral-600 normal-case">(optional)</span></label>
              <input id="booking-email" name="email" type="email" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="you@example.com">
            </div>
            <div>
              <label for="booking-service" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Service Requested <span class="text-amber-400">*</span></label>
              <select id="booking-service" name="service" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm focus:border-amber-400" required>
                <option value="">Choose a service</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label for="booking-date" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Preferred Date <span class="text-neutral-600 normal-case">(optional)</span></label>
              <input id="booking-date" name="date" type="text" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="e.g. November 2026">
            </div>
            <div>
              <label for="booking-budget" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Budget Range <span class="text-neutral-600 normal-case">(optional)</span></label>
              <input id="booking-budget" name="budget" type="text" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="e.g. ₦850,000">
            </div>
            <div>
              <label for="booking-location" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Location / Venue <span class="text-neutral-600 normal-case">(optional)</span></label>
              <input id="booking-location" name="location" type="text" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="City, venue, or remote">
            </div>
          </div>
          <div>
            <label for="booking-details" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Project Brief &amp; Notes <span class="text-amber-400">*</span></label>
            <textarea id="booking-details" name="details" rows="5" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" required placeholder="Tell us what you need, key deliverables, event timeline, or specific creative direction."></textarea>
          </div>
          <button type="submit" class="w-full bg-gold-gradient text-neutral-950 font-bold py-4 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer">
            <span>Send Request via WhatsApp</span>
            <iconify-icon icon="solar:arrow-right-linear" class="text-lg"></iconify-icon>
          </button>
          <p id="booking-form-status" class="text-xs text-neutral-400 text-center" role="status"></p>
          <p class="text-xs text-neutral-400 text-center font-light">Your brief opens directly on WhatsApp with your selections pre-filled for immediate review.</p>
        </form>
      </div>
    </section>
`;

// PAGE 6: CONTACT Section
const contactSection = `
    <!-- PAGE 6: CONTACT -->
    <section id="page-contact" class="spa-page">
      
      <div class="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 mb-3">
            <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0"></span>
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono header-eyebrow-text">Direct Atelier Line</span>
          </div>
          <h2 class="h2-editorial font-extrabold uppercase text-white mt-2 header-title-text">Start a Conversation</h2>
          <p class="text-neutral-400 text-sm md:text-base mt-3 max-w-xl mx-auto font-light leading-relaxed header-body-text">Direct line to our creative lead and production desk. We connect directly on WhatsApp to discuss concept, dates, and delivery.</p>
        </div>

        <div id="managed-contact-details" class="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8" aria-label="Atelier contact details"></div>

        <div class="glass-card border-gold-gradient p-6 md:p-10 rounded-3xl max-w-3xl mx-auto shadow-2xl">
          <div class="text-center mb-8">
            <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400">Direct WhatsApp Briefing</span>
            <h3 class="text-2xl md:text-3xl font-bold uppercase text-white mt-2 font-display">Brief Olympus Atelier</h3>
            <p class="text-sm text-neutral-400 mt-2">Choose your project type below. Your details will be prefilled directly into WhatsApp.</p>
          </div>
          
          <form id="unified-enquiry-form" class="space-y-6" novalidate>
            <input type="hidden" name="intent" id="enquiry-intent" value="project">
            <input type="hidden" name="turnstile_token" id="turnstile-token">
            <input type="hidden" name="source_cta" id="enquiry-source-cta">
            <input type="hidden" name="idempotency_key" id="enquiry-idempotency-key">
            <input type="text" name="website" class="enquiry-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">

            <div class="enquiry-intent-grid" role="radiogroup" aria-label="Enquiry type">
              <button type="button" class="enquiry-intent active" data-enquiry-intent="project" aria-pressed="true">
                <iconify-icon icon="solar:clipboard-list-linear"></iconify-icon>
                <span>Start a Project</span>
              </button>
              <button type="button" class="enquiry-intent" data-enquiry-intent="event" aria-pressed="false">
                <iconify-icon icon="solar:calendar-linear"></iconify-icon>
                <span>Wedding / Event</span>
              </button>
              <button type="button" class="enquiry-intent" data-enquiry-intent="general" aria-pressed="false">
                <iconify-icon icon="solar:chat-round-dots-linear"></iconify-icon>
                <span>General Enquiry</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label for="enquiry-name" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Full name <span class="text-amber-400">*</span></label>
                <input id="enquiry-name" name="name" type="text" maxlength="120" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="Your full name" required>
              </div>
              <div>
                <label for="enquiry-phone" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Phone or WhatsApp <span class="text-amber-400">*</span></label>
                <input id="enquiry-phone" name="phone" type="tel" maxlength="40" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="+234 ..." required>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label for="enquiry-email" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Email address <span class="text-neutral-600 normal-case">(optional)</span></label>
                <input id="enquiry-email" name="email" type="email" maxlength="254" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="you@example.com">
              </div>
              <div>
                <label for="enquiry-service" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Service requested <span class="text-amber-400">*</span></label>
                <select id="enquiry-service" name="service" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm focus:border-amber-400">
                  <option value="">Choose a service</option>
                </select>
              </div>
            </div>

            <div id="enquiry-project-fields" class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label for="enquiry-timeline" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Preferred date or timeline <span class="text-neutral-600 normal-case">(optional)</span></label>
                  <input id="enquiry-timeline" name="timeline" type="text" maxlength="120" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="e.g. November 2026 or flexible">
                </div>
                <div>
                  <label for="enquiry-budget" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Budget range <span class="text-neutral-600 normal-case">(optional)</span></label>
                  <input id="enquiry-budget" name="budget" type="text" maxlength="120" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="e.g. ₦850,000">
                </div>
              </div>
              <div>
                <label for="enquiry-location" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Location or venue <span class="text-neutral-600 normal-case">(optional)</span></label>
                <input id="enquiry-location" name="location" type="text" maxlength="240" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="City, venue, or remote">
              </div>
            </div>

            <div>
              <label for="enquiry-message" class="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 font-mono">Project brief &amp; details <span class="text-amber-400">*</span></label>
              <textarea id="enquiry-message" name="message" rows="5" minlength="5" maxlength="5000" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600 focus:border-amber-400" placeholder="Tell us what you need, key deliverables, event timeline, or specific creative direction." required></textarea>
            </div>

            <div id="turnstile-container" class="flex justify-center"></div>
            <div id="enquiry-form-error" class="enquiry-form-error hidden text-red-400 text-xs font-mono text-center" role="alert"></div>
            
            <button id="enquiry-submit" type="submit" class="w-full bg-gold-gradient text-neutral-950 font-bold py-4 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer">
              <span>Send Request via WhatsApp</span>
              <iconify-icon icon="solar:arrow-right-linear" class="text-lg"></iconify-icon>
            </button>
            <p class="text-xs text-neutral-400 text-center font-light">Your brief opens directly in WhatsApp with all selected details pre-filled for immediate response.</p>
          </form>

          <section id="enquiry-success" class="enquiry-success hidden text-center py-8 space-y-4" aria-live="polite" tabindex="-1">
            <div class="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto text-3xl">
              <iconify-icon icon="solar:chat-round-dots-bold"></iconify-icon>
            </div>
            <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400">Brief Prepared</span>
            <h3 class="text-2xl md:text-3xl font-bold text-white font-display">Opening WhatsApp…</h3>
            <p class="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">Your message has been compiled with all project details. If WhatsApp did not open automatically, click the button below to continue directly with the atelier.</p>
            <span id="enquiry-ticket-number" class="hidden"></span>
            <span id="enquiry-email-status" class="hidden"></span>
            <div class="pt-4 flex flex-wrap justify-center gap-4">
              <a id="enquiry-whatsapp-link" href="#" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-gold-gradient text-neutral-950 font-bold px-8 py-3.5 rounded-full hover:scale-105 transition-transform text-xs uppercase tracking-wider">
                <span>Continue on WhatsApp</span>
                <iconify-icon icon="solar:arrow-right-linear" class="text-lg"></iconify-icon>
              </a>
              <button id="enquiry-start-again" type="button" class="inline-flex items-center gap-2 border border-white/20 text-white hover:border-amber-400 hover:text-amber-400 font-bold px-6 py-3.5 rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer">
                <span>Start New Enquiry</span>
              </button>
            </div>
          </section>
        </div>

      </div>

    </section>
`;

// PAGE: TERMS & CONDITIONS Section
const termsSection = `
    <!-- PAGE: TERMS & CONDITIONS -->
    <section id="page-terms" class="spa-page">
      <div class="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 mb-3">
            <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0"></span>
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono header-eyebrow-text">Contract &amp; Settlement Policy</span>
          </div>
          <h2 class="h2-editorial font-extrabold uppercase text-white mt-2 header-title-text text-3xl sm:text-4xl lg:text-5xl">Terms &amp; Conditions</h2>
          <p class="text-neutral-400 text-sm md:text-base mt-4 max-w-2xl mx-auto font-light leading-relaxed header-body-text">Please read carefully before making payment. By making payment for any service provided by Olympus Atelier, the client confirms that they have read, understood, and agreed to the following terms.</p>
        </div>

        <div class="glass-card border-gold-gradient rounded-3xl p-6 sm:p-8 mb-10 bg-amber-500/5 border-amber-400/30">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xl flex-shrink-0 mt-0.5">
              <iconify-icon icon="solar:shield-warning-bold"></iconify-icon>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">Binding Agreement</h3>
              <p class="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed">
                By making payment for any service provided by Olympus Atelier, the client confirms that they have read, understood, and agreed to the terms outlined below.
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-6">

          <!-- 01 BOOKING -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">01</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Booking</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>A booking is only confirmed after payment of the required booking fee/deposit.</p>
              <p>The booking fee secures your date and is non-refundable.</p>
              <p>Until payment is received, your requested date remains available to other clients.</p>
            </div>
          </article>

          <!-- 02 PAYMENT -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">02</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Payment</h3>
            </div>
            <ul class="space-y-2.5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>70% booking fee is required to secure a date.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>The remaining 30% balance must be paid before filming begins.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>No final video will be delivered until full payment has been received.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Additional services requested after confirmation may attract additional charges.</span>
              </li>
            </ul>
          </article>

          <!-- 03 CANCELLATION & RESCHEDULING -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">03</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Cancellation &amp; Rescheduling</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Cancellation by the client does not qualify for a refund of the booking fee.</p>
              <p>Rescheduling may be allowed once, subject to our availability, provided at least 7 days’ notice is given.</p>
              <p>If the requested new date is unavailable, the booking may be treated as cancelled.</p>
            </div>
          </article>

          <!-- 04 SHOOTING TIME -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">04</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Shooting Time</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Your package covers only the agreed shooting period.</p>
              <p>Client delays do not automatically extend the booking.</p>
              <p>Additional shooting time will attract an overtime charge of <strong class="text-amber-400 font-bold">₦30,000/hour</strong>.</p>
              <p>The client is responsible for ensuring that the videographer/crew has access to the location at the agreed call time.</p>
            </div>
          </article>

          <!-- 05 TRAVEL & EXTRA EXPENSES -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">05</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Travel &amp; Extra Expenses</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Transportation within the agreed service area is specified in your package quote.</p>
              <p>Travel outside the agreed service area, accommodation, parking, location fees, permits, special equipment, or other project-related expenses may be charged separately.</p>
              <p>The client will be informed of applicable additional costs before they are incurred whenever reasonably possible.</p>
            </div>
          </article>

          <!-- 06 EDITING & DELIVERY -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">06</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Editing &amp; Delivery</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Final edited videos are delivered within <strong class="text-white font-semibold">7–21 working days</strong>, depending on the project.</p>
              <p>Delivery time begins after:</p>
              <ul class="space-y-2 pl-4">
                <li class="flex items-start gap-2">
                  <span class="text-amber-400">•</span>
                  <span>The shoot has been completed; and</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-400">•</span>
                  <span>All required materials/information have been provided by the client.</span>
                </li>
              </ul>
              <p>Urgent/express delivery may be available at an additional fee.</p>
            </div>
          </article>

          <!-- 07 REVISIONS -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">07</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Revisions</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Your package includes agreed rounds of revisions (typically 1–2 rounds as outlined in your brief).</p>
              <p>Revision requests must be submitted within 7 days of receiving the first draft.</p>
              <p>Changes that significantly alter the original creative brief or require extensive re-editing may attract additional charges.</p>
            </div>
          </article>

          <!-- 08 RAW FOOTAGE -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">08</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Raw Footage</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Raw footage is not included in standard packages.</p>
              <p>If the client requires the raw footage, this must be requested and agreed upon before delivery. Additional charges may apply.</p>
            </div>
          </article>

          <!-- 09 CREATIVE DIRECTION -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">09</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Creative Direction</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Videography is a creative service.</p>
              <p>The videographer retains reasonable creative control over cinematography, framing, editing, colour grading, transitions, music selection, and storytelling, while taking the client’s agreed creative brief into consideration.</p>
              <p>Specific references or creative expectations should be communicated before production begins.</p>
            </div>
          </article>

          <!-- 10 COPYRIGHT & USAGE -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">10</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Copyright &amp; Usage</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>The videographer retains copyright and ownership of the original footage and creative work unless otherwise agreed in writing.</p>
              <p>After full payment, the client receives the agreed right to use the final delivered video for the purpose stated in the booking.</p>
              <p>The client may not resell, redistribute, sublicense, or substantially modify the work without prior written permission.</p>
            </div>
          </article>

          <!-- 11 PORTFOLIO USE -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">11</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Portfolio Use</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>Unless the client requests confidentiality before the project begins, Olympus reserves the right to use selected footage from completed projects for its portfolio, website, social media, showreels, advertising, and promotional purposes.</p>
            </div>
          </article>

          <!-- 12 UNFORESEEN CIRCUMSTANCES -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">12</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Unforeseen Circumstances</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>We will make every reasonable effort to fulfil your booking.</p>
              <p>However, circumstances beyond our reasonable control including accidents, severe weather, equipment failure, venue restrictions, emergencies, government restrictions, or other unforeseen events may affect production.</p>
              <p>Where possible, the booking will be rescheduled or an alternative arrangement will be made.</p>
            </div>
          </article>

          <!-- 13 CLIENT RESPONSIBILITY -->
          <article class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-amber-400/30 transition-colors">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">13</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Client Responsibility</h3>
            </div>
            <ul class="space-y-2.5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Providing accurate booking information.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Obtaining necessary venue/filming permissions.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Ensuring access to the filming location.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Making key participants available when required.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Communicating special requirements in advance.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-amber-400 mt-1 flex-shrink-0">•</span>
                <span>Providing a safe working environment for the videographer and crew.</span>
              </li>
            </ul>
          </article>

          <!-- 14 ACCEPTANCE -->
          <article class="glass-card border-gold-gradient rounded-3xl p-6 sm:p-8 bg-neutral-900/60 shadow-xl">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">14</span>
              <h3 class="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-display">Acceptance</h3>
            </div>
            <div class="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p class="font-medium text-white">Payment of the booking fee constitutes the client’s acceptance of these Terms &amp; Conditions.</p>
              <p>By paying, you confirm that you have read and agreed to our Terms &amp; Conditions.</p>
            </div>
          </article>

        </div>

        <!-- Atelier Sign-Off & Official Contacts -->
        <div class="glass-card border-gold-gradient rounded-3xl p-8 sm:p-10 mt-12 bg-neutral-900/40 text-center">
          <span class="text-xs font-mono font-bold uppercase tracking-[0.2em] text-amber-400 block mb-2">Olympus Atelier</span>
          <h3 class="text-2xl font-bold text-white font-display">Stories. Frames. Memories.</h3>
          <div class="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs sm:text-sm font-mono text-neutral-300">
            <a href="mailto:ceo@theolympusatelier.com" class="hover:text-amber-400 transition-colors flex items-center gap-2">
              <iconify-icon icon="solar:letter-linear" class="text-amber-400"></iconify-icon>
              <span>ceo@theolympusatelier.com</span>
            </a>
            <a href="https://wa.me/2347026456357" target="_blank" rel="noopener noreferrer" class="hover:text-amber-400 transition-colors flex items-center gap-2">
              <iconify-icon icon="solar:phone-linear" class="text-amber-400"></iconify-icon>
              <span>07026456357 / 08087172313</span>
            </a>
            <a href="https://instagram.com/theolympus001" target="_blank" rel="noopener noreferrer" class="hover:text-amber-400 transition-colors flex items-center gap-2">
              <iconify-icon icon="ri:instagram-line" class="text-amber-400"></iconify-icon>
              <span>@theolympus001</span>
            </a>
          </div>
          <div class="mt-8 pt-6 border-t border-white/5 flex justify-center">
            <a href="#home" data-page="home" class="spa-nav-link inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-xs uppercase tracking-wider text-white hover:border-amber-400 hover:text-amber-400 font-bold transition-colors">
              <span>← Back to Atelier</span>
            </a>
          </div>
        </div>

      </div>
    </section>
`;

// Interactive Showcase with Landing Page Copy, Prompts & Verified Visible Assets
const showcaseSectionHtml = `
      <!-- Interactive Showcase: Cinematic Works in Motion (3-Card WebGL Interactive Reel) -->
      <div class="max-w-7xl mx-auto px-6 py-24 border-y border-white/5 relative" id="portfolio-slider-section">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 mb-4">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Curated Reel · Direct From The Atelier</span>
          </div>
          <h2 class="h2-editorial font-extrabold uppercase text-white mt-1 text-3xl sm:text-4xl lg:text-5xl">Cinematic Works in Motion</h2>
          <p class="text-neutral-400 text-sm md:text-base mt-4 max-w-2xl mx-auto font-light leading-relaxed">
            Experience our intentional pacing, cinema-grade color, and high-impact visual direction in real-time motion.
          </p>

          <!-- Interactive Click-to-Preview Prompt -->
          <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" class="group slider-play-trigger inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-card border-gold-gradient text-xs font-mono text-amber-300 shadow-xl shadow-amber-500/10 hover:bg-amber-400/15 hover:border-amber-400 transition-all hover:scale-105 active:scale-95 cursor-pointer" onclick="window.openActiveSliderProject?.()" aria-label="Click to watch featured cinema preview">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              </span>
              <span class="font-bold tracking-wide text-white group-hover:text-amber-300">Click Any Card to Preview Works</span>
              <iconify-icon icon="solar:play-circle-bold" class="text-base text-amber-400 transition-transform group-hover:scale-110"></iconify-icon>
            </button>
            <span class="text-[11px] font-mono text-neutral-500 hidden sm:inline-flex items-center gap-1">
              <span>Drag or click arrows to switch</span>
              <iconify-icon icon="solar:round-alt-arrow-right-linear" class="text-neutral-400"></iconify-icon>
            </span>
          </div>
        </div>

        <!-- 3-Card Slider Track Wrapper -->
        <div class="relative w-full h-[500px] overflow-hidden flex items-center justify-center">
          
          <!-- Left/Right Faded Edge Overlays to signal more work exists -->
          <div class="absolute left-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent z-20 pointer-events-none"></div>
          <div class="absolute right-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-l from-neutral-950 via-neutral-950/70 to-transparent z-20 pointer-events-none"></div>

          <!-- Carousel Track -->
          <div class="relative w-full h-[450px] flex items-center justify-center" id="carousel-track">
            
            <!-- Left Card -->
            <div class="carousel-card absolute w-[260px] md:w-[480px] h-[300px] md:h-[380px] rounded-3xl overflow-hidden border border-white/10 hover:border-amber-400/40 transition-all duration-500 scale-90 opacity-40 z-10 cursor-pointer pointer-events-auto group" id="card-left" title="Click to view previous work">
              <img src="assets/portfolio/1xOWqFVhUX5DXtpUGuhOxdA_pxGL2ZnNO.webp" alt="Chuks Ezimadu Interview - Olympus Atelier" class="w-full h-full object-cover filter brightness-75 group-hover:brightness-90 transition-all" id="img-left" loading="lazy">
              <div class="absolute inset-0 bg-neutral-950/20 group-hover:bg-transparent transition-colors"></div>
              <div class="absolute bottom-3 left-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-neutral-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                ← Previous
              </div>
            </div>

            <!-- Center Card (WebGL Canvas with ripple effects, focal point) -->
            <div class="carousel-card absolute w-[300px] md:w-[560px] h-[340px] md:h-[430px] rounded-3xl overflow-hidden border border-amber-400/30 shadow-[0_0_60px_rgba(0,0,0,0.9)] transition-all duration-500 scale-100 opacity-100 z-30 cursor-pointer group" id="card-center" title="Click to open cinema video preview">
              <canvas id="liquid-slider-canvas" class="w-full h-full object-cover"></canvas>
              
              <!-- Center Card details overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8 pointer-events-none">
                <span class="text-xs font-mono text-gold-gradient uppercase tracking-widest" id="slider-project-category">Weddings</span>
                <h3 class="text-2xl md:text-3xl font-extrabold uppercase text-white mt-1 font-display leading-tight" id="slider-project-title">Bride Shoot — TheGoodWill '26</h3>
                <p class="text-neutral-300 text-xs md:text-sm font-light max-w-md mt-1.5 leading-relaxed" id="slider-project-desc">
                  Luxury bridal visual story, portrait pacing, and bespoke cinema color grading.
                </p>

                <!-- Interactive CTA Button inside Center Card -->
                <div class="mt-4 flex items-center gap-3">
                  <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-gradient text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
                    <iconify-icon icon="solar:play-bold" class="text-sm"></iconify-icon>
                    <span>Watch Cinema Preview</span>
                  </span>
                  <span class="text-[10px] font-mono text-amber-400/80 hidden sm:inline-flex items-center gap-1">
                    <span>Full Theater Mode</span>
                    <iconify-icon icon="solar:arrow-right-up-linear"></iconify-icon>
                  </span>
                </div>
              </div>

              <!-- Top-right Click to Watch prompt badge -->
              <div class="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-amber-400/40 px-3.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5 shadow-xl shadow-black/80 pointer-events-none">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                <span>Click to Preview</span>
                <iconify-icon icon="solar:play-bold" class="text-xs text-amber-400 ml-0.5"></iconify-icon>
              </div>
            </div>

            <!-- Right Card -->
            <div class="carousel-card absolute w-[260px] md:w-[480px] h-[300px] md:h-[380px] rounded-3xl overflow-hidden border border-white/10 hover:border-amber-400/40 transition-all duration-500 scale-90 opacity-40 z-10 cursor-pointer pointer-events-auto group" id="card-right" title="Click to view next work">
              <img src="assets/portfolio/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly.webp" alt="Kida Metroprime Brand Film - Olympus Atelier" class="w-full h-full object-cover filter brightness-75 group-hover:brightness-90 transition-all" id="img-right" loading="lazy">
              <div class="absolute inset-0 bg-neutral-950/20 group-hover:bg-transparent transition-colors"></div>
              <div class="absolute bottom-3 right-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-neutral-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Next →
              </div>
            </div>

          </div>

          <!-- Navigation Arrows -->
          <button id="slider-prev-btn" class="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-card border border-white/10 hover:border-amber-400/40 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 z-40 focus:outline-none" aria-label="Previous production">
            <iconify-icon icon="solar:arrow-left-linear" class="text-xl"></iconify-icon>
          </button>
          <button id="slider-next-btn" class="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-card border border-white/10 hover:border-amber-400/40 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 z-40 focus:outline-none" aria-label="Next production">
            <iconify-icon icon="solar:arrow-right-linear" class="text-xl"></iconify-icon>
          </button>
        </div>

        <!-- View Full Portfolio Button -->
        <div class="text-center mt-8">
          <a href="#portfolio" class="inline-flex items-center justify-center bg-white/5 border border-white/10 hover:border-amber-400/40 text-white px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 spa-nav-link" data-page="portfolio">
            <span>Explore Complete Atelier Archive (200+ Works)</span>
            <iconify-icon icon="solar:arrow-right-linear" class="text-sm ml-2 text-gold-gradient"></iconify-icon>
          </a>
        </div>
      </div>
`;

// Replace Interactive Showcase in baseHtml
html = html.replace(/<!-- Interactive Showcase: Liquid 3-Card Carousel Slider -->[\s\S]*?<!-- Ready to Scale/, `${showcaseSectionHtml.trim()}\n\n      <!-- Ready to Scale`);

// Replace PAGE 2 in baseHtml
html = html.replace(/<!-- PAGE 2: SERVICES -->[\s\S]*?<\/section>/, servicesSection.trim());

// Replace PAGE 3 in baseHtml
html = html.replace(/<!-- PAGE 3: PORTFOLIO -->[\s\S]*?<\/section>/, portfolioSection.trim());

// Replace PAGE 4 in baseHtml
html = html.replace(/<!-- PAGE 4: ABOUT -->[\s\S]*?<\/section>/, aboutSection.trim());

// Replace PAGE 5 in baseHtml
html = html.replace(/<!-- PAGE 5: BOOK NOW -->[\s\S]*?<\/section>/, bookSection.trim());

// Replace PAGE 6 in baseHtml
html = html.replace(/<!-- PAGE 6: CONTACT[^>]*-->[\s\S]*?<\/section>/, `${contactSection.trim()}\n\n${termsSection.trim()}`);

// Remove Partners / Collaborators section completely
html = html.replace(/<!-- Partners Grid Section[\s\S]*?<\/section>/, '');

// Update Footer Atelier Links
html = html.replace(
  /<div class="col-span-6 md:col-span-2">\s*<h5 class="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-5 font-mono">Atelier<\/h5>[\s\S]*?<\/ul>\s*<\/div>/,
  `<div class="col-span-6 md:col-span-2">
          <h5 class="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-5 font-mono">Atelier</h5>
          <ul class="space-y-3 text-xs md:text-sm text-neutral-400">
            <li><a href="#home" class="hover:text-white transition-colors spa-nav-link" data-page="home">Home</a></li>
            <li><a href="#services" class="hover:text-white transition-colors spa-nav-link" data-page="services">Services</a></li>
            <li><a href="#portfolio" class="hover:text-white transition-colors spa-nav-link" data-page="portfolio">Portfolio</a></li>
            <li><a href="#about" class="hover:text-white transition-colors spa-nav-link" data-page="about">About Us</a></li>
            <li><a href="#terms" class="hover:text-white transition-colors spa-nav-link" data-page="terms">Terms &amp; Conditions</a></li>
          </ul>
        </div>`
);

html = html.replace(
  /<div class="border-t border-white\/5 pt-6 text-\[11px\] text-neutral-500 font-mono">[\s\S]*?<\/div>|<div class="flex flex-wrap items-center justify-between gap-4 border-t border-white\/5 pt-6 text-\[11px\] text-neutral-500 font-mono">[\s\S]*?<\/div>/,
  `<div class="border-t border-white/5 pt-6 text-[11px] text-neutral-500 font-mono flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <span>&copy; 2026 Olympus Atelier. All rights reserved. &middot; <a href="#terms" class="hover:text-white transition-colors underline underline-offset-4 spa-nav-link" data-page="terms">Terms &amp; Conditions</a></span>
        <span>Designed by <a href="https://ayodsgn.com/" target="_blank" rel="noopener noreferrer" class="hover:text-amber-400 transition-colors font-bold text-amber-400/90">Ayo.dsgn</a></span>
      </div>`
);

// Remove all logos:whatsapp-icon instances completely
html = html.replace(/<iconify-icon icon="logos:whatsapp-icon"[^>]*><\/iconify-icon>/g, '');

fs.writeFileSync('index.html', html);
console.log('Successfully pre-rendered pristine index.html with interactive onclick triggers!');
