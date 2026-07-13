(() => {
  const content = window.OLYMPUS_CONTENT;
  if (!content) return;

  const fallbackImage = 'assets/portfolio-fallback.svg';
  const iconNames = [
    'solar:camera-bold-duotone',
    'solar:palette-bold-duotone',
    'solar:notebook-bold-duotone',
    'solar:videocamera-record-bold-duotone',
    'solar:calendar-bold-duotone'
  ];
  const deliverables = [
    ['Editorial photography', 'Interview & campaign film', 'Colour-graded delivery'],
    ['Campaign design systems', 'Social & event posters', 'Brand-ready exports'],
    ['Magazine systems', 'Print-ready layouts', 'Certificates & publications'],
    ['Animated visual assets', 'Launch & brand motion', 'Platform-ready exports'],
    ['Conference coverage', 'Event highlight films', 'People & atmosphere']
  ];

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const whatsappUrl = message =>
    `https://wa.me/${content.siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;

  const openWhatsapp = (message, sourceForm = null) => {
    const url = whatsappUrl(message);
    if (sourceForm) sourceForm.dataset.whatsappUrl = url;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderServices = () => {
    const grid = document.getElementById('service-grid');
    if (!grid) return;
    grid.innerHTML = content.services.map((service, index) => `
      <article class="service-card glass-card border-gold-gradient rounded-3xl p-7 flex flex-col min-h-[310px]">
        <div class="service-card-icon"><iconify-icon icon="${iconNames[index]}"></iconify-icon></div>
        <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400 mt-8">Service ${String(index + 1).padStart(2, '0')}</span>
        <h3 class="text-2xl font-bold text-white mt-3">${escapeHtml(service.title)}</h3>
        <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(service.summary)}</p>
        <ul class="mt-6 space-y-2 text-xs text-neutral-300">
          ${deliverables[index].map(item => `<li class="flex items-center gap-2"><span class="text-amber-400">✓</span>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <a href="#book" data-page="book" class="spa-nav-link text-xs font-bold uppercase tracking-wider text-amber-400 mt-auto pt-7">Brief this service →</a>
      </article>
    `).join('');
  };

  const renderTeam = () => {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    grid.innerHTML = content.teamMembers.map((member, index) => `
      <article class="team-card glass-card rounded-3xl overflow-hidden border border-white/10">
        <div class="aspect-[4/5] overflow-hidden bg-neutral-900">
          <img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.name)} — ${escapeHtml(member.role)} at Olympus Studio" class="w-full h-full object-cover" loading="lazy" decoding="async">
        </div>
        <div class="p-6">
          <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${index === 0 ? 'Creative leadership' : 'Studio team'}</span>
          <h3 class="text-2xl font-bold text-white mt-2">${escapeHtml(member.name)}</h3>
          <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">${escapeHtml(member.role)}</p>
          <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(member.bio)}</p>
        </div>
      </article>
    `).join('');
  };

  const hydrateHomepage = () => {
    const heroBody = document.querySelector('#page-home > div:first-of-type p');
    if (heroBody) heroBody.textContent = 'We direct, capture, edit, and design visual stories for events, institutions, campaigns, and ambitious brands.';

    const vision = document.getElementById('word-reveal-paragraph');
    if (vision) vision.textContent = 'Olympus Studio brings film, photography, visual design, motion, and editorial production into one focused creative practice. We turn real moments and clear ideas into work built to travel across screens, spaces, campaigns, and publications.';

    const manifesto = document.getElementById('manifesto-word-reveal');
    if (manifesto) manifesto.textContent = 'We reject forgettable creative. Olympus exists to make moments feel intentional—combining strong direction, human photography, cinematic film, disciplined layouts, and thoughtful post-production into work that endures.';

    const capabilityIndexes = [0, 1, 2, 4];
    document.querySelectorAll('.capabilities-card').forEach((card, cardIndex) => {
      const serviceIndex = capabilityIndexes[cardIndex] ?? cardIndex;
      const service = content.services[serviceIndex];
      if (!service) return;
      const title = card.querySelector('h3');
      const body = card.querySelector('.primary-content-block p');
      if (title) title.textContent = service.title;
      if (body) body.textContent = service.summary;
      card.querySelectorAll('.deliverables-content-block li').forEach((li, liIndex) => {
        const icon = li.querySelector('iconify-icon')?.outerHTML || '';
        li.innerHTML = `${icon}${escapeHtml(deliverables[serviceIndex][liIndex] || '')}`;
      });
    });

    const whyCards = document.querySelectorAll('#homepage-whychooseus-section h4');
    const whyCopy = [
      ['Production-led thinking', 'Creative direction and capture are planned together, so every frame has a clear purpose.'],
      ['One visual system', 'Film, photography, motion, graphics, and editorial layouts stay coherent across every delivery.'],
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
    const closeButton = document.getElementById('lightbox-close-btn');
    const previousButton = document.getElementById('lightbox-prev-btn');
    const nextButton = document.getElementById('lightbox-next-btn');
    const title = document.getElementById('lightbox-title');
    const category = document.getElementById('lightbox-category');
    const original = document.getElementById('lightbox-original-link');
    if (!modal || !image || !video || !closeButton) return;

    let activeIndex = 0;
    let previousFocus = null;

    const showItem = index => {
      activeIndex = (index + portfolioItems.length) % portfolioItems.length;
      const item = portfolioItems[activeIndex];
      title.textContent = item.title;
      category.textContent = `${item.collection} · ${item.year}`;
      image.classList.add('hidden');
      video.classList.add('hidden');
      video.pause();
      video.removeAttribute('src');

      if (item.mediaType === 'video' && item.previewSrc) {
        video.src = item.previewSrc;
        video.poster = item.thumbnailSrc;
        video.classList.remove('hidden');
        video.load();
      } else {
        image.src = item.thumbnailSrc || fallbackImage;
        image.alt = item.alt;
        image.onerror = () => { image.src = fallbackImage; };
        image.classList.remove('hidden');
      }

      if (item.originalUrl) {
        original.href = item.originalUrl;
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
        const focusable = [...modal.querySelectorAll('button:not([disabled]), a:not(.hidden), video[controls]')];
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

    const items = [...new Map(content.portfolioItems.map(item => [item.id, item])).values()];
    let activeFilter = 'all';
    let visibleCount = 12;

    const filteredItems = () => items.filter(item => activeFilter === 'all' || item.category === activeFilter);
    const render = () => {
      const matches = filteredItems();
      const visible = matches.slice(0, visibleCount);
      grid.innerHTML = visible.map(item => `
        <button type="button" class="portfolio-item archive-card text-left group" data-item-id="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.title)}">
          <span class="archive-card-media">
            <img src="${escapeHtml(item.thumbnailSrc)}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackImage}'">
            <span class="archive-card-overlay"></span>
            <span class="archive-card-type"><iconify-icon icon="${item.mediaType === 'video' ? 'solar:play-circle-bold' : item.mediaType === 'pdf' ? 'solar:document-bold' : 'solar:gallery-bold'}"></iconify-icon>${escapeHtml(item.mediaType)}</span>
          </span>
          <span class="archive-card-copy">
            <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${escapeHtml(item.collection)} · ${escapeHtml(item.year)}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </span>
        </button>
      `).join('');
      grid.querySelectorAll('[data-item-id]').forEach(card => card.addEventListener('click', () => window.openOlympusPortfolioItem(card.dataset.itemId)));
      loadMore.classList.toggle('hidden', visible.length >= matches.length);
      status.textContent = `Showing ${visible.length} of ${matches.length}`;
      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(grid.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.025, ease: 'power2.out' });
      }
    };

    filters.innerHTML = content.filters.map(filter => `<button type="button" class="archive-filter${filter.id === 'all' ? ' active' : ''}" data-filter="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>`).join('');
    filters.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      visibleCount = 12;
      filters.querySelectorAll('.archive-filter').forEach(item => item.classList.toggle('active', item === button));
      render();
    }));
    loadMore.addEventListener('click', () => { visibleCount += 12; render(); });
    initPortfolioLightbox(items);
    render();
  };

  const initWhatsAppForms = () => {
    const serviceSelect = document.getElementById('booking-service');
    if (serviceSelect) {
      serviceSelect.insertAdjacentHTML('beforeend', content.services.map(service => `<option value="${escapeHtml(service.title)}">${escapeHtml(service.title)}</option>`).join(''));
    }

    document.getElementById('booking-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      openWhatsapp([
        'Hello Olympus Studio, I would like to discuss a project.',
        '',
        `Name: ${form.get('name')}`,
        `Email: ${form.get('email') || 'Not provided'}`,
        `Service: ${form.get('service')}`,
        `Preferred date: ${form.get('date') || 'Flexible'}`,
        `Budget: ${form.get('budget') || 'To discuss'}`,
        `Location: ${form.get('location') || 'To discuss'}`,
        '',
        `Brief: ${form.get('details')}`
      ].join('\n'), event.currentTarget);
    });

    document.getElementById('contact-form')?.addEventListener('submit', event => {
      event.preventDefault();
      openWhatsapp([
        'Hello Olympus Studio, I have an enquiry.',
        '',
        `Name: ${document.getElementById('contact-name')?.value.trim()}`,
        `Email: ${document.getElementById('contact-email')?.value.trim()}`,
        '',
        document.getElementById('contact-message')?.value.trim()
      ].join('\n'), event.currentTarget);
    });

    document.getElementById('scale-proposal-form')?.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const isEvent = typeof scaleFormPath === 'undefined' || scaleFormPath === 'event';
      const details = [
        'Hello Olympus Studio, I would like to start a project.',
        '',
        `Name: ${document.getElementById('proposal-name')?.value.trim()}`,
        `Email: ${document.getElementById('proposal-email')?.value.trim()}`,
        `Project type: ${isEvent ? 'Event / production coverage' : 'Design / creative project'}`,
        isEvent ? `Date: ${document.getElementById('event-date')?.value || 'Flexible'}` : `Budget: ${document.getElementById('project-budget')?.value.trim() || 'To discuss'}`,
        isEvent ? `Location: ${document.getElementById('event-location')?.value.trim() || 'To discuss'}` : `Timeline: ${document.getElementById('project-timeline')?.value || 'Flexible'}`,
        '',
        `Brief: ${document.getElementById('proposal-details')?.value.trim()}`
      ];
      openWhatsapp(details.join('\n'), event.currentTarget);
    }, true);
  };

  const hydrateFooter = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const intro = footer.querySelector('p');
    if (intro) intro.textContent = 'A creative media studio for film, photography, campaign graphics, editorial publications, motion design, and event coverage.';
    const expertiseHeading = [...footer.querySelectorAll('h5')].find(item => item.textContent.trim() === 'Expertise');
    const expertiseList = expertiseHeading?.nextElementSibling;
    if (expertiseList) expertiseList.innerHTML = content.services.map(service => `<li><a href="#services" class="hover:text-white transition-colors spa-nav-link" data-page="services">${escapeHtml(service.title)}</a></li>`).join('');

    const connectHeading = [...footer.querySelectorAll('h5')].find(item => item.textContent.trim() === 'Connect');
    const connectRow = connectHeading?.nextElementSibling;
    if (connectRow) connectRow.innerHTML = `<a href="${whatsappUrl('Hello Olympus Studio, I would like to discuss a project.')}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-full border border-amber-400/30 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-400/10"><iconify-icon icon="logos:whatsapp-icon"></iconify-icon>${escapeHtml(content.siteConfig.whatsappDisplay)}</a>`;
    footer.querySelectorAll('a[href="#"]').forEach(link => link.hidden = true);
  };

  window.addEventListener('DOMContentLoaded', () => {
    renderServices();
    renderTeam();
    hydrateHomepage();
    hydrateSocialProof();
    renderPortfolio();
    initWhatsAppForms();
    hydrateFooter();
  });
})();
