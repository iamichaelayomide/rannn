(() => {
  const content = new Proxy({}, {
    get: (_, prop) => (window.OLYMPUS_CONTENT || {})[prop]
  });

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
  const serviceChoices = [...new Map([
    { id: 'videography-editing', title: 'Videography/Video Editing' },
    { id: 'video-editing', title: 'Video Editing Alone' },
    { id: 'photography', title: 'Photography' },
    ...(content.services || []).filter(service => service.id !== 'photo-film')
  ].map(service => [service.title.toLowerCase(), service])).values()];

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const whatsappUrl = message => {
    const number = content.siteConfig?.whatsappNumber || '2348087172313';
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  const buildEnquiryWhatsappMessage = ({ name, email, phone, service, budget, timeline, location, message, intent, preferred_channel }) => {
    const lines = [];
    const clientName = name && name.trim() ? name.trim() : 'a client';
    lines.push(`Hi Olympus Atelier, I am ${clientName}.`);
    lines.push('');
    if (service && service.trim()) {
      lines.push(`I would like to make an enquiry regarding *${service.trim()}*.`);
    } else {
      lines.push('I would like to make an enquiry regarding a creative project with the atelier.');
    }
    lines.push('');
    lines.push('Here are the details of my request:');
    if (service && service.trim()) lines.push(`• *Service:* ${service.trim()}`);
    if (budget && budget.trim()) lines.push(`• *Budget / Selected Package:* ${budget.trim()}`);
    if (timeline && timeline.trim()) lines.push(`• *Preferred Date / Timeline:* ${timeline.trim()}`);
    if (location && location.trim()) lines.push(`• *Location / Venue:* ${location.trim()}`);
    if (phone && phone.trim()) lines.push(`• *Phone / WhatsApp:* ${phone.trim()}`);
    if (email && email.trim()) lines.push(`• *Email:* ${email.trim()}`);
    if (preferred_channel && preferred_channel.trim() && preferred_channel.trim().toLowerCase() !== 'whatsapp') {
      lines.push(`• *Preferred Reply Channel:* ${preferred_channel.trim()}`);
    }
    if (intent && !['general', 'project', 'event'].includes(intent.toLowerCase().trim())) {
      lines.push(`• *Request Type:* ${intent.trim()}`);
    }
    if (message && message.trim()) {
      lines.push('');
      lines.push('📝 *Project Brief & Details:*');
      lines.push(message.trim());
    }
    return lines.join('\n');
  };

  const openWhatsapp = (message, sourceForm = null) => {
    const url = typeof message === 'string' && message.startsWith('https://wa.me/')
      ? message
      : whatsappUrl(message);
    if (sourceForm) sourceForm.dataset.whatsappUrl = url;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderWeddingPackages = () => {
    const existing = document.getElementById('wedding-packages-modal');
    if (existing) return existing;

    const modal = document.createElement('div');
    modal.id = 'wedding-packages-modal';
    modal.className = 'wedding-packages-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'wedding-packages-title');
    modal.innerHTML = `
      <div class="wedding-packages-backdrop" data-wedding-close></div>
      <div class="wedding-packages-panel" role="document">
        <button type="button" class="wedding-packages-close" data-wedding-close aria-label="Close wedding packages">
          <iconify-icon icon="solar:close-circle-linear"></iconify-icon>
        </button>
        <span class="wedding-packages-eyebrow">Wedding videography</span>
        <h2 id="wedding-packages-title">Choose your coverage.</h2>
        <p class="wedding-packages-intro">Three clear packages for capturing the full day, the moments between, and a polished final film.</p>
        <div class="wedding-packages-grid">
          ${(content.weddingPackages || []).map((item, index) => `
            <article class="wedding-package${index === 1 ? ' wedding-package-featured' : ''}">
              ${index === 1 ? '<span class="wedding-package-badge">Most popular</span>' : ''}
              <span class="wedding-package-number">0${index + 1}</span>
              <h3>${escapeHtml(item.name)}</h3>
              <strong>${escapeHtml(item.price)}</strong>
              <ul>
                ${item.features.map(feature => `<li><iconify-icon icon="solar:check-circle-bold"></iconify-icon><span>${escapeHtml(feature)}</span></li>`).join('')}
              </ul>
              <a href="#contact?intent=project&service=${encodeURIComponent(`${item.name} Wedding Package`)}&budget=${encodeURIComponent(item.price)}&message=${encodeURIComponent(`I would like to book the ${item.name} Wedding Package (${item.price}) for full-day wedding videography coverage.`)}&source_cta=Wedding%20packages" data-page="contact" class="spa-nav-link wedding-package-cta">Book ${escapeHtml(item.name)} (${escapeHtml(item.price)})</a>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    document.body.append(modal);

    let previousFocus = null;
    const close = () => {
      modal.classList.add('hidden');
      document.documentElement.style.overflow = '';
      previousFocus?.focus?.();
    };
    const open = () => {
      previousFocus = document.activeElement;
      modal.classList.remove('hidden');
      document.documentElement.style.overflow = 'hidden';
      modal.querySelector('.wedding-packages-close')?.focus();
    };
    modal.querySelectorAll('[data-wedding-close]').forEach(button => button.addEventListener('click', close));
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button, a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    modal.querySelectorAll('.spa-nav-link').forEach(link => link.addEventListener('click', close));
    modal.openWeddingPackages = open;
    return modal;
  };

  const serviceToCategoryMap = {
    'wedding': 'wedding',
    'wedding-highlights': 'wedding',
    'editing-alone': 'editing-alone',
    'video-editing': 'editing-alone',
    'videography-editing': 'editing-alone',
    'photo-film': 'film',
    'graphics': 'graphics',
    'graphics-branding': 'graphics',
    'editorial': 'editorial',
    'editorial-magazines': 'editorial',
    'motion': 'motion',
    'motion-design': 'motion',
    'events': 'events',
    'events-conferences': 'events',
    'web': 'graphics',
    'interactive-web': 'graphics',
    'ads-commercial': 'film',
    'commercials': 'film'
  };

  const renderServices = () => {
    const grid = document.getElementById('service-grid');
    if (!grid) return;

    grid.innerHTML = (content.services || []).map((service, index) => {
      const cat = service.portfolioCategory || serviceToCategoryMap[service.id] || 'all';
      return `
      <article class="service-card glass-card border-gold-gradient rounded-3xl p-7 flex flex-col min-h-[340px] reveal-on-scroll stagger-${(index % 3) + 1}">
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
        <div class="mt-auto pt-7 flex flex-col gap-2 border-t border-white/5">
          <a href="#portfolio?category=${encodeURIComponent(cat)}" data-page="portfolio" class="spa-nav-link text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-white transition-colors flex items-center justify-between">
            <span>View ${escapeHtml(service.title)} Work</span>
            <span>→</span>
          </a>
          <a href="#contact?intent=project&service=${encodeURIComponent(service.title)}&source_cta=Service%20card" data-page="contact" class="spa-nav-link text-[11px] uppercase tracking-wider text-neutral-400 hover:text-amber-400 transition-colors">
            Brief this service
          </a>
        </div>
      </article>
      `;
    }).join('');

    const renderWeddingSection = () => {
      const container = document.getElementById('wedding-packages-grid');
      if (!container) return;
      container.innerHTML = (content.weddingPackages || []).map((item, index) => `
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
          <a href="#contact?intent=project&service=${encodeURIComponent(`${item.name} Wedding Package`)}&budget=${encodeURIComponent(item.price)}&message=${encodeURIComponent(`I would like to book the ${item.name} Wedding Package (${item.price}) for full-day wedding videography coverage.`)}&source_cta=Wedding%20packages%20section" data-page="contact" class="spa-nav-link inline-flex items-center justify-center bg-gold-gradient text-neutral-950 font-bold px-6 py-3.5 rounded-full text-xs uppercase tracking-wider mt-8 hover:scale-105 transition-transform w-full text-center">Book ${escapeHtml(item.name)} (${escapeHtml(item.price)})</a>
        </article>
      `).join('');
    };

    renderWeddingSection();

    const weddingModal = renderWeddingPackages();
    grid.querySelectorAll('[data-open-wedding-modal]').forEach(btn => {
      btn.addEventListener('click', () => weddingModal.openWeddingPackages());
    });
  };

  const renderTeam = () => {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    grid.innerHTML = (content.teamMembers || []).map((member, index) => `
      <article class="team-card glass-card rounded-3xl overflow-hidden border border-white/10">
        <div class="aspect-[4/5] overflow-hidden bg-neutral-900">
          <img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.name)} — ${escapeHtml(member.role)} at Olympus Atelier" class="w-full h-full object-cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/team/photographer.webp'">
        </div>
        <div class="p-6">
          <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${index < 2 ? 'Creative leadership' : 'Atelier team'}</span>
          <h3 class="text-2xl font-bold text-white mt-2">${escapeHtml(member.name)}</h3>
          <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">${escapeHtml(member.role)}</p>
          ${member.qualification ? `<p class="text-[11px] font-mono uppercase tracking-wider text-amber-400/80 mt-2">${escapeHtml(member.qualification)}</p>` : ''}
          <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(member.bio)}</p>
        </div>
      </article>
    `).join('');
  };

  const hydrateHomepage = () => {
    const homeContent = content.pages?.home?.content || {};
    const heroBody = document.querySelector('#page-home > div:first-of-type p');
    if (heroBody && homeContent.hero?.body) heroBody.textContent = homeContent.hero.body;

    const vision = document.getElementById('word-reveal-paragraph');
    if (vision && homeContent.vision?.body) vision.textContent = homeContent.vision.body;

    const manifesto = document.getElementById('manifesto-word-reveal');
    if (manifesto && homeContent.manifesto?.body) manifesto.textContent = homeContent.manifesto.body;

    const capabilityIndexes = [0, 1, 2, 3];
    document.querySelectorAll('.capabilities-card').forEach((card, cardIndex) => {
      const serviceIndex = capabilityIndexes[cardIndex] ?? cardIndex;
      const service = content.services[serviceIndex];
      card.hidden = !service;
      if (!service) return;
      const title = card.querySelector('h3');
      const body = card.querySelector('.primary-content-block p');
      if (title) title.textContent = service.title;
      if (body) body.textContent = service.summary;
      card.querySelectorAll('.deliverables-content-block li').forEach((li, liIndex) => {
        const icon = li.querySelector('iconify-icon')?.outerHTML || '<iconify-icon icon="solar:check-circle-bold" class="text-amber-400"></iconify-icon>';
        if (service.deliverables?.[liIndex]) {
          li.innerHTML = `${icon}${escapeHtml(service.deliverables[liIndex])}`;
        }
      });
    });

    const whyCards = document.querySelectorAll('#homepage-whychooseus-section h4');
    const whyCopy = [
      ['Production-led thinking', 'Creative direction and capture are planned together, so every frame has a clear purpose.'],
      ['One visual system', 'Film, photography, motion, graphics, editorial layouts, and websites stay coherent across every delivery.'],
      ['Built around real moments', 'We preserve the people, atmosphere, and detail that make events and campaigns feel credible.'],
      ['From brief to final export', 'A compact team manages production and post without fragmented creative handoffs.']
    ];
    whyCards.forEach((heading, index) => {
      const pair = whyCopy[index];
      if (!pair) return;
      heading.textContent = pair[0];
      const paragraph = heading.nextElementSibling;
      if (paragraph?.tagName === 'P') paragraph.textContent = pair[1];
    });
  };

  const hydratePageHeaders = () => {
    const targets = {
      services: '#page-services > div > div:first-child',
      portfolio: '#page-portfolio > div > div:first-child > div:first-child',
      about: '#page-about > div > div:first-child > div:first-child',
      book: '#page-book > div > div:first-child',
      contact: '#page-contact > div > div:first-child',
    };

    Object.entries(targets).forEach(([slug, selector]) => {
      const header = content.pages?.[slug]?.content?.header;
      const container = document.querySelector(selector);
      if (!header || !container) return;
      const eyebrow = container.querySelector('.header-eyebrow-text') || container.querySelector('span.font-mono') || container.querySelector('span');
      const title = container.querySelector('.header-title-text') || container.querySelector('h2');
      const body = container.querySelector('.header-body-text') || container.querySelector('p');
      if (eyebrow && header.eyebrow) eyebrow.textContent = header.eyebrow;
      if (title && header.title) title.textContent = header.title;
      if (body && header.body) body.textContent = header.body;

      if (slug === 'about' && header.image) {
        const image = document.querySelector('#page-about img');
        if (image) image.src = header.image;
      }
    });
  };

  const hydrateContactDetails = () => {
    const container = document.getElementById('managed-contact-details');
    if (container) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  };

  const hydrateFaqs = () => {
    if (!Array.isArray(content.faqs) || !content.faqs.length) return;
    const list = document.querySelector('#global-faqs .space-y-4');
    if (!list) return;
    list.innerHTML = content.faqs.map((item, index) => `
      <div class="glass-card border-gold-gradient rounded-2xl overflow-hidden faq-item">
        <button type="button" class="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none faq-btn" aria-expanded="false" aria-controls="cms-faq-${index}">
          <span class="text-sm font-bold uppercase text-white">${escapeHtml(item.question)}</span>
          <iconify-icon icon="solar:alt-arrow-down-linear" class="text-amber-400 text-lg transition-transform duration-300 faq-icon"></iconify-icon>
        </button>
        <div id="cms-faq-${index}" class="max-h-0 overflow-hidden transition-all duration-300 faq-content">
          <div class="px-6 pb-5 text-xs md:text-sm text-neutral-400 font-light leading-relaxed">${escapeHtml(item.answer)}</div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.faq-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        const panel = item.querySelector('.faq-content');
        const iconNode = item.querySelector('.faq-icon');
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isOpen));
        panel.style.maxHeight = isOpen ? '0px' : `${panel.scrollHeight}px`;
        iconNode?.classList.toggle('rotate-180', !isOpen);
      });
    });
  };

  const hydratePartners = () => {
    if (!Array.isArray(content.partners) || !content.partners.length) return;
    const grid = document.getElementById('partners-magnetic-container');
    if (!grid) return;
    grid.innerHTML = content.partners.map((partner) => {
      const body = partner.logo
        ? `<img src="${escapeHtml(partner.logo)}" alt="${escapeHtml(partner.name)} logo" class="max-w-[7rem] max-h-12 object-contain" loading="lazy">`
        : `<span class="text-xs font-bold uppercase tracking-wider text-neutral-300 text-center px-3">${escapeHtml(partner.name)}</span>`;
      const contentNode = `<div class="w-36 h-20 bg-neutral-950 border border-white/5 rounded-2xl flex items-center justify-center hover:border-amber-400/20 transition-all duration-300 magnetic-logo-wrap">${body}</div>`;
      return partner.url
        ? `<a href="${escapeHtml(partner.url)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(partner.name)}">${contentNode}</a>`
        : contentNode;
    }).join('');
  };

  const hydrateSocialProof = () => {
    const stats = document.querySelectorAll('#trust-stats-section .stat-roll-number');
    stats.forEach((stat, index) => {
      const item = content.socialProof.stats[index];
      if (!item) return;
      stat.dataset.target = item.value;
      stat.dataset.decimals = item.value.includes('.') ? '1' : '0';
      const label = stat.closest('.flex.flex-col')?.querySelector('.text-xs');
      if (label) label.textContent = item.label;
    });

    const testimonials = content.socialProof.testimonials;
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (testimonialGrid) {
      testimonialGrid.innerHTML = testimonials.map(item => `
        <article class="glass-card border-gold-gradient p-6 rounded-2xl testimonial-card" data-placeholder-content="true">
          <div class="flex items-center gap-1 mb-4 text-amber-400" aria-label="Five stars">
            ${Array.from({ length: 5 }, () => '<iconify-icon icon="solar:star-bold" class="text-sm"></iconify-icon>').join('')}
          </div>
          <p class="text-neutral-300 font-light text-sm leading-relaxed mb-6">“${escapeHtml(item.quote)}”</p>
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-bold" aria-hidden="true">${escapeHtml(item.name.charAt(0))}</span>
            <div><h5 class="text-xs font-bold text-white">${escapeHtml(item.name)}</h5><span class="text-[9px] text-neutral-500 uppercase font-mono">${escapeHtml(item.role)}</span></div>
          </div>
        </article>
      `).join('');
    }
    document.querySelectorAll('.testimonial-card').forEach((card, index) => {
      const item = testimonials[index % testimonials.length];
      const quote = card.querySelector('p');
      const name = card.querySelector('h5');
      const role = card.querySelector('h5 + span');
      const avatar = card.querySelector('img');
      if (quote) quote.textContent = `“${item.quote}”`;
      if (name) name.textContent = item.name;
      if (role) role.textContent = item.role;
      if (avatar) {
        avatar.src = fallbackImage;
        avatar.alt = '';
      }
      card.dataset.placeholderContent = 'true';
    });
  };

  const initPortfolioLightbox = portfolioItems => {
    const modal = document.getElementById('lightbox-modal');
    const image = document.getElementById('lightbox-img');
    const video = document.getElementById('lightbox-video');
    const driveFrame = document.getElementById('lightbox-drive-frame');
    const closeButton = document.getElementById('lightbox-close-btn');
    const previousButton = document.getElementById('lightbox-prev-btn');
    const nextButton = document.getElementById('lightbox-next-btn');
    const title = document.getElementById('lightbox-title');
    const category = document.getElementById('lightbox-category');
    const description = document.getElementById('lightbox-description');
    const original = document.getElementById('lightbox-original-link');
    if (!modal || !image || !video || !driveFrame || !closeButton) return;

    let activeIndex = 0;
    let previousFocus = null;

    const showItem = index => {
      activeIndex = (index + portfolioItems.length) % portfolioItems.length;
      const item = portfolioItems[activeIndex];
      title.textContent = item.title;
      category.textContent = `${item.collection} · ${item.year}`;
      if (description) {
        description.textContent = item.description || '';
        description.classList.toggle('hidden', !item.description);
      }
      image.classList.add('hidden');
      video.classList.add('hidden');
      driveFrame.classList.add('hidden');
      video.pause();
      video.removeAttribute('src');
      driveFrame.removeAttribute('src');

      const isMp4 = item.mediaType === 'video' && item.previewSrc && item.previewSrc.endsWith('.mp4');
      const isPdf = item.mediaType === 'pdf' && item.previewSrc && item.previewSrc.endsWith('.pdf');
      const driveFileId = item.originalUrl ? (item.originalUrl.match(/\/file\/d\/([^/]+)/)?.[1] || item.originalUrl.match(/id=([^&]+)/)?.[1]) : null;
      const driveFolderId = item.originalUrl ? item.originalUrl.match(/\/folders\/([^/?]+)/)?.[1] : null;

      if (isMp4) {
        video.src = item.previewSrc;
        video.poster = item.thumbnailSrc;
        video.classList.remove('hidden');
        video.load();
      } else if (isPdf) {
        driveFrame.src = `${item.previewSrc}#page=1&view=FitH`;
        driveFrame.title = `${item.title} PDF reader`;
        driveFrame.classList.remove('hidden');
      } else if (item.mediaType === 'video' && driveFileId) {
        driveFrame.src = `https://drive.google.com/file/d/${driveFileId}/preview`;
        driveFrame.title = `${item.title} video player`;
        driveFrame.classList.remove('hidden');
      } else if (driveFolderId) {
        driveFrame.src = `https://drive.google.com/embeddedfolderview?id=${driveFolderId}#grid`;
        driveFrame.title = `${item.title} Google Drive Folder`;
        driveFrame.classList.remove('hidden');
      } else if (item.mediaType === 'pdf' && driveFileId) {
        driveFrame.src = `https://drive.google.com/file/d/${driveFileId}/preview`;
        driveFrame.title = `${item.title} PDF document`;
        driveFrame.classList.remove('hidden');
      } else {
        image.src = item.previewSrc || item.thumbnailSrc || fallbackImage;
        image.alt = item.alt || item.title;
        image.onerror = () => { image.src = fallbackImage; };
        image.classList.remove('hidden');
      }

      if (item.originalUrl) {
        original.href = item.downloadUrl || item.originalUrl;
        original.textContent = item.mediaType === 'pdf'
          ? 'Download full PDF ↗'
          : item.mediaType === 'video'
            ? 'Open full video in Drive ↗'
            : driveFolderId
              ? 'Open folder in Google Drive ↗'
              : 'Open original in Drive ↗';
        original.classList.remove('hidden');
        original.classList.add('inline-flex');
      } else {
        original.classList.add('hidden');
        original.classList.remove('inline-flex');
      }
    };

    const open = index => {
      previousFocus = document.activeElement;
      showItem(index);
      modal.classList.remove('hidden');
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => { modal.style.opacity = '1'; });
      closeButton.focus();
    };

    const close = () => {
      modal.style.opacity = '0';
      video.pause();
      driveFrame.removeAttribute('src');
      window.setTimeout(() => modal.classList.add('hidden'), 220);
      document.documentElement.style.overflow = '';
      previousFocus?.focus?.();
    };

    window.openOlympusPortfolioItem = itemId => {
      const index = portfolioItems.findIndex(item => item.id === itemId);
      if (index >= 0) open(index);
    };

    closeButton.addEventListener('click', close);
    previousButton?.addEventListener('click', () => showItem(activeIndex - 1));
    nextButton?.addEventListener('click', () => showItem(activeIndex + 1));
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    window.addEventListener('keydown', event => {
      if (modal.classList.contains('hidden')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') showItem(activeIndex - 1);
      if (event.key === 'ArrowRight') showItem(activeIndex + 1);
      if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button:not([disabled]), a:not(.hidden), video[controls], iframe:not(.hidden)')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    document.getElementById('card-center')?.addEventListener('click', event => {
      if (event.target.closest('a,button')) return;
      const project = typeof sliderProjects !== 'undefined' ? sliderProjects[currentSliderIndex] : null;
      if (project?.id) window.openOlympusPortfolioItem(project.id);
    });
  };

  const renderPortfolio = () => {
    const grid = document.getElementById('portfolio-grid');
    const filters = document.getElementById('portfolio-filters');
    const loadMore = document.getElementById('portfolio-load-more');
    const status = document.getElementById('portfolio-result-status');
    if (!grid || !filters || !loadMore) return;

    const items = [...new Map((content.portfolioItems || []).map(item => [item.id, item])).values()];
    let activeFilter = 'all';
    let visibleCount = 12;

    const filteredItems = () => items.filter(item => activeFilter === 'all' || item.category === activeFilter);
    const render = () => {
      const matches = filteredItems();
      const visible = matches.slice(0, visibleCount);
      grid.innerHTML = visible.map(item => {
        const thumb = item.thumbnailSrc || item.thumbnail_src || fallbackImage;
        const mediaType = item.mediaType || item.media_type || 'image';
        const altText = item.alt || item.alt_text || item.title || '';
        return `
        <button type="button" class="portfolio-item archive-card text-left group" data-item-id="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.title)}">
          <span class="archive-card-media">
            <img src="${escapeHtml(thumb)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackImage}'">
            <span class="archive-card-overlay"></span>
            <span class="archive-card-type"><iconify-icon icon="${mediaType === 'video' ? 'solar:play-circle-bold' : mediaType === 'pdf' ? 'solar:document-bold' : 'solar:gallery-bold'}"></iconify-icon>${escapeHtml(mediaType)}</span>
          </span>
          <span class="archive-card-copy">
            <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${escapeHtml(item.collection || '')} · ${escapeHtml(item.year || '')}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </span>
        </button>
      `;
      }).join('');
      grid.querySelectorAll('[data-item-id]').forEach(card => card.addEventListener('click', () => window.openOlympusPortfolioItem(card.dataset.itemId)));
      loadMore.classList.toggle('hidden', visible.length >= matches.length);
      if (status) status.textContent = '';
      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(grid.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.025, ease: 'power2.out' });
      }
    };

    const filterList = content.filters || [
      { id: 'all', label: 'All Work' },
      { id: 'wedding', label: 'Weddings' },
      { id: 'editing-alone', label: 'Video Editing Alone' },
      { id: 'film', label: 'Film & Photography' },
      { id: 'events', label: 'Events & Conferences' },
      { id: 'graphics', label: 'Graphics & Branding' },
      { id: 'editorial', label: 'Editorial' },
      { id: 'motion', label: 'Motion Design' }
    ];

    const getInitialFilter = () => {
      const rawHash = window.location.hash.substring(1);
      const query = rawHash.includes('?') ? rawHash.split('?')[1] : window.location.search;
      const params = new URLSearchParams(query);
      const catParam = params.get('category') || params.get('tab');
      if (catParam) {
        if (catParam === 'wedding-highlights' || catParam === 'wedding') return 'wedding';
        const found = filterList.find(f => f.id === catParam || f.id.includes(catParam));
        if (found) return found.id;
      }
      return 'all';
    };

    activeFilter = getInitialFilter();

    filters.innerHTML = filterList.map(filter => `
      <button type="button" class="archive-filter${filter.id === activeFilter ? ' active' : ''}" data-filter="${escapeHtml(filter.id)}">
        <span>${escapeHtml(filter.label)}</span>
      </button>
    `).join('');

    const setFilter = (newFilter, updateHash = false) => {
      activeFilter = newFilter;
      visibleCount = 12;
      filters.querySelectorAll('.archive-filter').forEach(item => {
        const isActive = item.dataset.filter === newFilter;
        item.classList.toggle('active', isActive);
        if (isActive) {
          item.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
      render();
      window.observeScrollReveals?.();
      if (updateHash) {
        const targetHash = newFilter === 'all' ? 'portfolio' : `portfolio?category=${encodeURIComponent(newFilter)}`;
        if (window.location.hash.substring(1) !== targetHash) {
          history.replaceState(null, '', `#${targetHash}`);
        }
      }
    };

    window.setPortfolioCategory = (cat) => setFilter(cat, true);

    window.addEventListener('hashchange', () => {
      const currentCategory = getInitialFilter();
      if (currentCategory !== activeFilter) {
        setFilter(currentCategory, false);
      }
    });

    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      e.preventDefault();
      setFilter(btn.dataset.filter, true);
    });

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-item-id]');
      if (!card) return;
      e.preventDefault();
      window.openOlympusPortfolioItem(card.dataset.itemId);
    });

    loadMore.addEventListener('click', () => {
      visibleCount += 12;
      render();
      window.observeScrollReveals?.();
    });
    initPortfolioLightbox(items);
    render();
    window.observeScrollReveals?.();
  };

  const initWhatsAppForms = () => {
    const serviceSelect = document.getElementById('booking-service');
    if (serviceSelect) {
      serviceSelect.insertAdjacentHTML('beforeend', serviceChoices.map(service => `<option value="${escapeHtml(service.title)}">${escapeHtml(service.title)}</option>`).join(''));
    }

    const persistIntake = (payload, statusId) => {
      const status = document.getElementById(statusId);
      if (status) status.textContent = 'Saving your request…';
      if (typeof window.submitIntake !== 'function') return;
      window.submitIntake(payload)
        .then(() => {
          if (status) status.textContent = 'Request saved. Continue in WhatsApp to speak with the atelier.';
        })
        .catch(error => {
          if (status) status.textContent = error.message;
        });
    };

    document.getElementById('booking-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get('name') || '').trim();
      const email = String(form.get('email') || '').trim();
      const service = String(form.get('service') || '').trim();
      const date = String(form.get('date') || '').trim();
      const budget = String(form.get('budget') || '').trim();
      const location = String(form.get('location') || '').trim();
      const details = String(form.get('details') || '').trim();

      persistIntake({
        kind: 'project',
        name,
        email,
        title: `${service || 'Creative'} enquiry`,
        service,
        budget: budget || null,
        timeline: date || null,
        message: details,
        payload: { location: location || null }
      }, 'booking-form-status');

      const waMessage = buildEnquiryWhatsappMessage({
        name,
        email,
        phone: '',
        service,
        budget,
        timeline: date,
        location,
        message: details,
        intent: 'project'
      });
      openWhatsapp(waMessage, event.currentTarget);
    });

    document.getElementById('contact-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('contact-name')?.value.trim() || '';
      const email = document.getElementById('contact-email')?.value.trim() || '';
      const message = document.getElementById('contact-message')?.value.trim() || '';

      persistIntake({
        kind: 'contact',
        name,
        email,
        message
      }, 'contact-form-status');

      const waMessage = buildEnquiryWhatsappMessage({
        name,
        email,
        phone: '',
        message,
        intent: 'general'
      });
      openWhatsapp(waMessage, event.currentTarget);
    });

    document.getElementById('scale-proposal-form')?.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const isEvent = typeof scaleFormPath === 'undefined' || scaleFormPath === 'event';
      const name = document.getElementById('proposal-name')?.value.trim() || '';
      const email = document.getElementById('proposal-email')?.value.trim() || '';
      const message = document.getElementById('proposal-details')?.value.trim() || '';
      const eventDate = document.getElementById('event-date')?.value || '';
      const eventLocation = document.getElementById('event-location')?.value.trim() || '';
      const projectBudget = document.getElementById('project-budget')?.value.trim() || '';
      const projectArea = document.querySelector('#select-area-container .select-label')?.textContent.trim()
        || document.getElementById('project-area')?.value
        || (isEvent ? 'Event / production coverage' : 'Design / creative project');
      const projectTimeline = document.querySelector('#select-timeline-container .select-label')?.textContent.trim()
        || document.getElementById('project-timeline')?.value
        || (isEvent ? eventDate : '');

      const waMessage = buildEnquiryWhatsappMessage({
        name,
        email,
        phone: '',
        service: projectArea,
        budget: projectBudget,
        timeline: projectTimeline,
        location: eventLocation,
        message,
        intent: isEvent ? 'event' : 'project'
      });

      persistIntake({
        kind: isEvent ? 'event' : 'project',
        name,
        email,
        title: isEvent ? 'Event coverage request' : 'Design project request',
        service: projectArea,
        budget: isEvent ? null : projectBudget,
        timeline: isEvent ? eventDate : projectTimeline,
        message,
        payload: isEvent ? {
          event_hours: document.getElementById('event-hours')?.value,
          event_location: eventLocation
        } : {}
      }, 'proposal-form-status');

      openWhatsapp(waMessage, event.currentTarget);
    }, true);
  };

  const initUnifiedEnquiryFlow = () => {
    const form = document.getElementById('unified-enquiry-form');
    if (!form) return;

    const intentInput = document.getElementById('enquiry-intent');
    const intentButtons = [...document.querySelectorAll('[data-enquiry-intent]')];
    const projectFields = document.getElementById('enquiry-project-fields');
    const serviceSelect = document.getElementById('enquiry-service');
    const status = document.getElementById('enquiry-form-error');
    const submitButton = document.getElementById('enquiry-submit');
    const formPanel = form;
    const successPanel = document.getElementById('enquiry-success');
    const successTicket = document.getElementById('enquiry-ticket-number');
    const successEmail = document.getElementById('enquiry-email-status');
    const continueWhatsapp = document.getElementById('enquiry-whatsapp-link');
    const sourceCtaInput = document.getElementById('enquiry-source-cta');
    const idempotencyInput = document.getElementById('enquiry-idempotency-key');
    let turnstileWidgetId = null;

    const makeIdempotencyKey = () => window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `inq-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const paramsForHash = () => {
      const raw = window.location.hash.replace(/^#/, '');
      const [, query = ''] = raw.split('?');
      return new URLSearchParams(query);
    };

    const bookingServiceSelect = document.getElementById('booking-service');
    if (bookingServiceSelect && bookingServiceSelect.options.length <= 1) {
      bookingServiceSelect.insertAdjacentHTML(
        'beforeend',
        serviceChoices.map(service => `<option value="${escapeHtml(service.title)}">${escapeHtml(service.title)}</option>`).join('')
      );
    }

    if (serviceSelect && serviceSelect.options.length <= 1) {
      serviceSelect.insertAdjacentHTML(
        'beforeend',
        serviceChoices.map(service => `<option value="${escapeHtml(service.title)}">${escapeHtml(service.title)}</option>`).join('')
      );
    }

    const selectIntent = value => {
      const intent = ['general', 'project', 'event'].includes(value) ? value : 'project';
      if (intentInput) intentInput.value = intent;
      intentButtons.forEach(button => {
        const active = button.dataset.enquiryIntent === intent;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (intent === 'event' && serviceSelect && !serviceSelect.value) {
        serviceSelect.value = 'Events & Conferences';
      }
    };

    const hydrateContext = () => {
      const params = paramsForHash();
      const service = params.get('service');
      const budget = params.get('budget');
      const message = params.get('message') || params.get('details');
      const timeline = params.get('timeline') || params.get('date');

      selectIntent(params.get('intent') || (service || budget ? 'project' : intentInput?.value || 'project'));

      if (serviceSelect && service) {
        let matchingOption = [...serviceSelect.options].find(option => option.value.toLowerCase() === service.toLowerCase());
        if (!matchingOption) {
          serviceSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`);
          matchingOption = serviceSelect.options[serviceSelect.options.length - 1];
        }
        serviceSelect.value = matchingOption.value;
      }

      if (bookingServiceSelect && service) {
        let matchingOption = [...bookingServiceSelect.options].find(option => option.value.toLowerCase() === service.toLowerCase());
        if (!matchingOption) {
          bookingServiceSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`);
          matchingOption = bookingServiceSelect.options[bookingServiceSelect.options.length - 1];
        }
        bookingServiceSelect.value = matchingOption.value;
      }

      const enquiryBudget = document.getElementById('enquiry-budget');
      if (enquiryBudget && budget) enquiryBudget.value = budget;

      const bookingBudget = document.getElementById('booking-budget');
      if (bookingBudget && budget) bookingBudget.value = budget;

      const enquiryMessage = document.getElementById('enquiry-message');
      if (enquiryMessage && message) enquiryMessage.value = message;

      const bookingDetails = document.getElementById('booking-details');
      if (bookingDetails && message) bookingDetails.value = message;

      const enquiryTimeline = document.getElementById('enquiry-timeline');
      if (enquiryTimeline && timeline) enquiryTimeline.value = timeline;

      const bookingDate = document.getElementById('booking-date');
      if (bookingDate && timeline) bookingDate.value = timeline;

      if (sourceCtaInput) sourceCtaInput.value = params.get('source_cta') || '';
    };

    intentButtons.forEach(button => button.addEventListener('click', () => selectIntent(button.dataset.enquiryIntent)));
    window.addEventListener('hashchange', hydrateContext);
    hydrateContext();

    document.querySelectorAll('a[href^="#book"]').forEach(link => {
      link.href = '#contact?intent=project&source_cta=Legacy%20booking%20CTA';
      link.dataset.page = 'contact';
    });

    const proposalForm = document.getElementById('scale-proposal-form');
    if (proposalForm && !proposalForm.dataset.ticketFlowReady) {
      proposalForm.dataset.ticketFlowReady = 'true';
      proposalForm.dataset.idempotencyKey = makeIdempotencyKey();
      proposalForm.addEventListener('submit', async event => {
        event.preventDefault();
        const statusNode = document.getElementById('proposal-form-status');
        const proposalSubmit = document.getElementById('proposal-submit-btn');
        const proposalSubmitText = document.getElementById('submit-btn-text');
        const eventMode = !document.getElementById('form-block-event')?.classList.contains('hidden');
        const name = document.getElementById('proposal-name')?.value.trim() || '';
        const email = document.getElementById('proposal-email')?.value.trim() || '';
        const message = document.getElementById('proposal-details')?.value.trim() || '';
        const consent = document.getElementById('proposal-consent')?.checked === true;
        const eventDate = document.getElementById('event-date')?.value || '';
        const eventLocation = document.getElementById('event-location')?.value.trim() || '';
        const projectBudget = document.getElementById('project-budget')?.value.trim() || '';
        const projectArea = document.querySelector('#select-area-container .select-label')?.textContent.trim()
          || document.getElementById('project-area')?.value
          || 'Creative project';
        const projectTimeline = document.querySelector('#select-timeline-container .select-label')?.textContent.trim()
          || document.getElementById('project-timeline')?.value
          || '';

        if (!proposalForm.checkValidity() || !consent || message.length < 10) {
          proposalForm.reportValidity();
          statusNode.textContent = 'Please complete the required details and consent before sending.';
          statusNode.classList.add('error');
          return;
        }

        statusNode.textContent = 'Creating your enquiry ticket…';
        statusNode.classList.remove('error', 'success');
        proposalSubmit.disabled = true;
        proposalSubmitText.textContent = 'Sending enquiry…';

        try {
          const values = new FormData(proposalForm);
          const result = await window.submitInquiry({
            site_key: 'olympus-atelier',
            intent: eventMode ? 'event' : 'project',
            name,
            email,
            phone: '',
            preferred_channel: 'email',
            title: eventMode ? 'Event coverage enquiry' : `${projectArea} enquiry`,
            service: eventMode ? 'Event coverage' : projectArea,
            budget: eventMode ? null : projectBudget,
            preferred_date: eventMode ? eventDate : null,
            timeline: eventMode ? null : projectTimeline,
            location: eventMode ? eventLocation : null,
            event_hours: eventMode ? document.getElementById('event-hours')?.value || null : null,
            message,
            consent,
            source_page: window.location.hash.split('?')[0].replace(/^#/, '') || 'home',
            source_cta: eventMode ? 'Embedded event form' : 'Embedded project form',
            source_url: window.location.href,
            referrer: document.referrer || null,
            utm: Object.fromEntries([...new URL(window.location.href).searchParams.entries()].filter(([key]) => key.startsWith('utm_'))),
            idempotency_key: proposalForm.dataset.idempotencyKey,
            turnstile_token: values.get('cf-turnstile-response') || null,
            website: document.getElementById('proposal-website')?.value || ''
          });

          statusNode.replaceChildren();
          const confirmation = document.createElement('span');
          confirmation.textContent = `Enquiry saved. Your reference is ${result.ticketNumber}. `;
          statusNode.append(confirmation);
          if (result.whatsappUrl) {
            const whatsappLink = document.createElement('a');
            whatsappLink.href = result.whatsappUrl;
            whatsappLink.target = '_blank';
            whatsappLink.rel = 'noopener noreferrer';
            whatsappLink.textContent = 'Continue on WhatsApp';
            statusNode.append(whatsappLink);
          }
          statusNode.classList.add('success');
          proposalSubmitText.textContent = 'Enquiry sent';
          proposalForm.dataset.idempotencyKey = makeIdempotencyKey();
        } catch (error) {
          statusNode.textContent = error.message || 'We could not create your ticket. Your details are still here—please try again.';
          statusNode.classList.add('error');
          proposalSubmit.disabled = false;
          proposalSubmitText.textContent = eventMode ? 'Book Event Call' : 'Start Project';
        }
      });
    }

    const loadTurnstile = async () => {
      const container = document.getElementById('turnstile-container');
      const scaleContainer = document.getElementById('scale-turnstile-container');
      if (!container && !scaleContainer) return;
      const config = await fetch('/api/config', { cache: 'no-store' }).then(response => response.json()).catch(() => ({}));
      if (!config.turnstileSiteKey) return;
      const renderWidget = () => {
        if (!window.turnstile) return;
        if (container && turnstileWidgetId === null) {
          turnstileWidgetId = window.turnstile.render(container, {
            sitekey: config.turnstileSiteKey,
            theme: 'dark'
          });
        }
        if (scaleContainer && scaleContainer.dataset.turnstileRendered !== 'true') {
          window.turnstile.render(scaleContainer, {
            sitekey: config.turnstileSiteKey,
            theme: 'dark'
          });
          scaleContainer.dataset.turnstileRendered = 'true';
        }
      };
      if (window.turnstile) return renderWidget();
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      document.head.append(script);
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = new FormData(form);
      const name = String(values.get('name') || '').trim();
      const email = String(values.get('email') || '').trim();
      const phone = String(values.get('phone') || '').trim();
      const service = String(values.get('service') || '').trim();
      const budget = String(values.get('budget') || '').trim();
      const timeline = String(values.get('timeline') || values.get('preferred_date') || '').trim();
      const location = String(values.get('location') || '').trim();
      const message = String(values.get('message') || '').trim();
      const intent = String(values.get('intent') || 'general');
      const preferred_channel = String(values.get('preferred_channel') || 'whatsapp');

      if (!name) {
        status.textContent = 'Please enter your name.';
        status.classList.remove('hidden');
        document.getElementById('enquiry-name')?.focus();
        return;
      }

      if (!email && !phone) {
        status.textContent = 'Please add an email address or phone/WhatsApp number so we can reply.';
        status.classList.remove('hidden');
        document.getElementById('enquiry-phone')?.focus();
        return;
      }

      status.classList.add('hidden');

      // 1. Build formatted WhatsApp message with customer intro and selected details
      const waMessage = buildEnquiryWhatsappMessage({
        name,
        email,
        phone,
        service,
        budget,
        timeline,
        location,
        message,
        intent,
        preferred_channel
      });
      const waUrl = whatsappUrl(waMessage);

      // 2. Immediately launch WhatsApp
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      // 3. Switch to confirmation screen
      if (continueWhatsapp) {
        continueWhatsapp.href = waUrl;
        continueWhatsapp.classList.remove('hidden');
      }
      formPanel.classList.add('hidden');
      successPanel.classList.remove('hidden');
      successPanel.focus();

      // 4. Save ticket in background (non-blocking)
      if (!idempotencyInput.value) idempotencyInput.value = makeIdempotencyKey();
      try {
        const result = await window.submitInquiry({
          site_key: 'olympus-atelier',
          intent,
          name,
          email,
          phone,
          preferred_channel: values.get('preferred_channel') || 'whatsapp',
          service: service || null,
          budget: budget || null,
          preferred_date: values.get('preferred_date') || null,
          timeline: timeline || null,
          location: location || null,
          message,
          consent: values.get('consent') === 'on',
          source_page: window.location.hash.split('?')[0].replace(/^#/, '') || 'contact',
          source_cta: values.get('source_cta') || 'WhatsApp Enquiry Form',
          source_url: window.location.href,
          referrer: document.referrer || null,
          utm: Object.fromEntries([...new URL(window.location.href).searchParams.entries()].filter(([key]) => key.startsWith('utm_'))),
          idempotency_key: values.get('idempotency_key'),
          turnstile_token: values.get('cf-turnstile-response') || null,
          website: values.get('website') || ''
        });
        if (result?.ticketNumber) {
          successTicket.textContent = result.ticketNumber;
        }
      } catch (err) {
        console.warn('Background ticket save notice:', err.message);
      }
    });

    document.getElementById('enquiry-start-again')?.addEventListener('click', () => {
      form.reset();
      idempotencyInput.value = makeIdempotencyKey();
      formPanel.classList.remove('hidden');
      successPanel.classList.add('hidden');
      status.classList.add('hidden');
      hydrateContext();
      if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
      document.getElementById('enquiry-name')?.focus();
    });
  };

  const hydrateFooter = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const intro = footer.querySelector('p');
    const footerIntro = content.pages?.global?.content?.site?.footer_intro;
    if (intro && footerIntro) intro.textContent = footerIntro;
    const expertiseHeading = [...footer.querySelectorAll('h5')].find(item => item.textContent.trim() === 'Expertise');
    const expertiseList = expertiseHeading?.nextElementSibling;
    if (expertiseList) expertiseList.innerHTML = serviceChoices.map(service => `<li><a href="#services" class="hover:text-white transition-colors spa-nav-link" data-page="services">${escapeHtml(service.title)}</a></li>`).join('');

    document.querySelectorAll('.site-logo-link').forEach(link => {
      link.setAttribute('aria-label', `${content.siteConfig.brandName} home`);
      const image = link.querySelector('img');
      if (image) image.alt = content.siteConfig.brandName;
    });
    document.title = `${content.siteConfig.brandName} — Film, Photography & Visual Design`;

    const connectHeading = [...footer.querySelectorAll('h5')].find(item => item.textContent.trim() === 'Connect');
    const connectRow = connectHeading?.nextElementSibling;
    if (connectRow) {
      const socialIcons = { instagram: 'ri:instagram-fill', tiktok: 'ri:tiktok-fill', x: 'ri:twitter-x-fill', linkedin: 'ri:linkedin-fill' };
      const socialLinks = Object.entries(content.siteConfig.socials || {})
        .filter(([, url]) => Boolean(url))
        .map(([network, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(titleCase(network))}" class="w-9 h-9 rounded-full border border-white/10 inline-flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:border-amber-400/30"><iconify-icon icon="${socialIcons[network]}"></iconify-icon></a>`)
        .join('');
      const whatsappLink = content.siteConfig.whatsappNumber && content.siteConfig.whatsappDisplay
        ? `<a href="#contact?intent=general&preferred_channel=whatsapp&source_cta=Footer%20WhatsApp" data-page="contact" class="spa-nav-link inline-flex items-center gap-2 rounded-full border border-amber-400/30 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-400/10"><iconify-icon icon="logos:whatsapp-icon"></iconify-icon>${escapeHtml(content.siteConfig.whatsappDisplay)}</a>`
        : '';
      const callLink = content.siteConfig.callNumber && content.siteConfig.callDisplay
        ? `<a href="tel:${escapeHtml(content.siteConfig.callNumber)}" class="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-neutral-300 hover:border-amber-400/30 hover:text-amber-400"><iconify-icon icon="solar:phone-calling-linear"></iconify-icon>${escapeHtml(content.siteConfig.callDisplay)}</a>`
        : '';
      connectRow.innerHTML = `${whatsappLink}${callLink}${content.siteConfig.email ? `<a href="mailto:${escapeHtml(content.siteConfig.email)}" class="text-xs text-neutral-400 hover:text-white">${escapeHtml(content.siteConfig.email)}</a>` : ''}${content.siteConfig.location ? `<span class="text-xs text-neutral-500">${escapeHtml(content.siteConfig.location)}</span>` : ''}${socialLinks ? `<span class="flex gap-2">${socialLinks}</span>` : ''}`;
    }
    const copyright = connectHeading?.parentElement?.querySelector('p');
    if (copyright) copyright.textContent = `© ${new Date().getFullYear()} ${content.siteConfig.brandName}. All rights reserved.`;
    footer.querySelectorAll('a[href="#"]').forEach(link => link.hidden = true);
  };

  const titleCase = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

  const hydrateMetadata = () => {
    const slug = (window.location.hash.replace(/^#/, '').split('?')[0] || 'home');
    const page = content.pages?.[slug];
    document.title = page?.seo_title || `${content.siteConfig.brandName} — Film, Photography & Visual Design`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = page?.seo_description || page?.content?.header?.body || page?.content?.hero?.body || '';
  };

  const initializeManagedContent = () => {
    renderServices();
    renderTeam();
    hydrateHomepage();
    hydratePageHeaders();
    hydrateContactDetails();
    hydrateSocialProof();
    hydrateFaqs();
    hydratePartners();
    renderPortfolio();
    document.getElementById('view-cac-certificate')?.addEventListener('click', () => {
      window.openOlympusPortfolioItem?.('157ouUK40lbUfM4xSL2Sc0E0gPQ4wnqcd');
    });
    initUnifiedEnquiryFlow();
    hydrateFooter();
    hydrateMetadata();
    window.addEventListener('hashchange', hydrateMetadata);
  };

  window.initOlympusContentApp = initializeManagedContent;

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initializeManagedContent, { once: true });
  } else {
    initializeManagedContent();
  }
})();
