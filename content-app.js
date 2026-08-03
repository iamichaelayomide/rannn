(() => {
  const content = window.OLYMPUS_CONTENT;
  if (!content) return;

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
        <div class="service-card-icon"><iconify-icon icon="${iconNames[index % iconNames.length]}"></iconify-icon></div>
        <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400 mt-8">Service ${String(index + 1).padStart(2, '0')}</span>
        <h3 class="text-2xl font-bold text-white mt-3">${escapeHtml(service.title)}</h3>
        <p class="text-sm text-neutral-400 leading-relaxed mt-4">${escapeHtml(service.summary)}</p>
        ${service.description ? `<p class="text-xs text-neutral-500 leading-relaxed mt-3">${escapeHtml(service.description)}</p>` : ''}
        <ul class="mt-6 space-y-2 text-xs text-neutral-300">
          ${(service.deliverables || deliverables[index] || []).map(item => `<li class="flex items-center gap-2"><span class="text-amber-400">✓</span>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <a href="#contact?intent=project&service=${encodeURIComponent(service.title)}&source_cta=Service%20card" data-page="contact" class="spa-nav-link text-xs font-bold uppercase tracking-wider text-amber-400 mt-auto pt-7">Brief this service →</a>
      </article>
    `).join('');
  };

  const renderTeam = () => {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    grid.innerHTML = content.teamMembers.map((member, index) => `
      <article class="team-card glass-card rounded-3xl overflow-hidden border border-white/10">
        <div class="aspect-[4/5] overflow-hidden bg-neutral-900">
          <img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.name)} — ${escapeHtml(member.role)} at Olympus Atelier" class="w-full h-full object-cover" loading="lazy" decoding="async">
        </div>
        <div class="p-6">
          <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">${index === 0 ? 'Creative leadership' : 'Atelier team'}</span>
          <h3 class="text-2xl font-bold text-white mt-2">${escapeHtml(member.name)}</h3>
          <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">${escapeHtml(member.role)}</p>
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

    const capabilityIndexes = [0, 1, 2, 5];
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
        const icon = li.querySelector('iconify-icon')?.outerHTML || '';
        li.innerHTML = `${icon}${escapeHtml(deliverables[serviceIndex][liIndex] || '')}`;
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
      const eyebrow = container.querySelector('span');
      const title = container.querySelector('h2');
      const body = container.querySelector('p');
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
    const contact = content.pages?.contact?.content?.contact || {};
    const details = [
      contact.email || content.siteConfig.email
        ? ['solar:letter-linear', 'Email', contact.email || content.siteConfig.email, `mailto:${contact.email || content.siteConfig.email}`]
        : null,
      contact.phone || content.siteConfig.whatsappDisplay
        ? ['solar:phone-linear', 'Phone', contact.phone || content.siteConfig.whatsappDisplay, `tel:${String(contact.phone || content.siteConfig.whatsappDisplay).replace(/[^\d+]/g, '')}`]
        : null,
      contact.location || content.siteConfig.location
        ? ['solar:map-point-linear', 'Location', contact.location || content.siteConfig.location, '']
        : null,
    ].filter(Boolean);
    const container = document.getElementById('managed-contact-details');
    if (!container) return;
    container.classList.toggle('hidden', !details.length);
    container.innerHTML = details.map(([iconName, label, value, href]) => {
      const body = `<iconify-icon icon="${iconName}" class="text-xl text-amber-400"></iconify-icon><span><small class="block text-[9px] uppercase tracking-widest text-neutral-500">${escapeHtml(label)}</small><strong class="block text-sm text-white mt-1">${escapeHtml(value)}</strong></span>`;
      return href
        ? `<a href="${escapeHtml(href)}" class="glass-card border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-amber-400/30">${body}</a>`
        : `<div class="glass-card border border-white/10 rounded-2xl p-4 flex items-center gap-3">${body}</div>`;
    }).join('');
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

      if (item.mediaType === 'video' && item.previewSrc) {
        video.src = item.previewSrc;
        video.poster = item.thumbnailSrc;
        video.classList.remove('hidden');
        video.load();
      } else if (item.mediaType === 'video' && item.originalUrl) {
        const driveId = item.originalUrl.match(/\/file\/d\/([^/]+)/)?.[1];
        if (driveId) {
          driveFrame.src = `https://drive.google.com/file/d/${driveId}/preview`;
          driveFrame.title = `${item.title} video player`;
          driveFrame.classList.remove('hidden');
        }
      } else if (item.mediaType === 'pdf' && item.previewSrc) {
        driveFrame.src = `${item.previewSrc}#page=1&view=FitH`;
        driveFrame.title = `${item.title} PDF reader`;
        driveFrame.classList.remove('hidden');
      } else if (item.mediaType === 'pdf' && item.originalUrl) {
        const driveId = item.originalUrl.match(/\/file\/d\/([^/]+)/)?.[1];
        if (driveId) {
          driveFrame.src = `https://drive.google.com/file/d/${driveId}/preview`;
          driveFrame.title = `${item.title} PDF reader`;
          driveFrame.classList.remove('hidden');
        }
      } else {
        image.src = item.thumbnailSrc || fallbackImage;
        image.alt = item.alt;
        image.onerror = () => { image.src = fallbackImage; };
        image.classList.remove('hidden');
      }

      if (item.originalUrl) {
        original.href = item.downloadUrl || item.originalUrl;
        original.textContent = item.mediaType === 'pdf'
          ? 'Download full PDF ↗'
          : item.mediaType === 'video'
            ? 'Open full video in Drive ↗'
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
      persistIntake({
        kind: 'project',
        name: form.get('name'),
        email: form.get('email') || '',
        title: `${form.get('service')} enquiry`,
        service: form.get('service'),
        budget: form.get('budget') || null,
        timeline: form.get('date') || null,
        message: form.get('details'),
        payload: { location: form.get('location') || null }
      }, 'booking-form-status');
      openWhatsapp([
        'Hello Olympus Atelier, I would like to discuss a project.',
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
      persistIntake({
        kind: 'contact',
        name: document.getElementById('contact-name')?.value.trim(),
        email: document.getElementById('contact-email')?.value.trim(),
        message: document.getElementById('contact-message')?.value.trim()
      }, 'contact-form-status');
      openWhatsapp([
        'Hello Olympus Atelier, I have an enquiry.',
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
        'Hello Olympus Atelier, I would like to start a project.',
        '',
        `Name: ${document.getElementById('proposal-name')?.value.trim()}`,
        `Email: ${document.getElementById('proposal-email')?.value.trim()}`,
        `Project type: ${isEvent ? 'Event / production coverage' : 'Design / creative project'}`,
        isEvent ? `Date: ${document.getElementById('event-date')?.value || 'Flexible'}` : `Budget: ${document.getElementById('project-budget')?.value.trim() || 'To discuss'}`,
        isEvent ? `Location: ${document.getElementById('event-location')?.value.trim() || 'To discuss'}` : `Timeline: ${document.getElementById('project-timeline')?.value || 'Flexible'}`,
        '',
        `Brief: ${document.getElementById('proposal-details')?.value.trim()}`
      ];
      persistIntake({
        kind: isEvent ? 'event' : 'project',
        name: document.getElementById('proposal-name')?.value.trim(),
        email: document.getElementById('proposal-email')?.value.trim(),
        title: isEvent ? 'Event coverage request' : 'Design project request',
        service: isEvent ? 'Event / production coverage' : document.getElementById('project-area')?.value,
        budget: isEvent ? null : document.getElementById('project-budget')?.value.trim(),
        timeline: isEvent ? document.getElementById('event-date')?.value : document.getElementById('project-timeline')?.value,
        message: document.getElementById('proposal-details')?.value.trim(),
        payload: isEvent ? {
          event_hours: document.getElementById('event-hours')?.value,
          event_location: document.getElementById('event-location')?.value.trim()
        } : {}
      }, 'proposal-form-status');
      openWhatsapp(details.join('\n'), event.currentTarget);
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

    if (serviceSelect) {
      serviceSelect.insertAdjacentHTML(
        'beforeend',
        content.services.map(service => `<option value="${escapeHtml(service.title)}">${escapeHtml(service.title)}</option>`).join('')
      );
    }

    const selectIntent = value => {
      const intent = ['general', 'project', 'event'].includes(value) ? value : 'general';
      if (intentInput) intentInput.value = intent;
      intentButtons.forEach(button => {
        const active = button.dataset.enquiryIntent === intent;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (projectFields) projectFields.classList.toggle('hidden', intent === 'general');
      if (intent === 'event' && serviceSelect && !serviceSelect.value) serviceSelect.value = 'Event coverage';
    };

    const hydrateContext = () => {
      const params = paramsForHash();
      selectIntent(params.get('intent') || intentInput?.value || 'general');
      const service = params.get('service');
      if (serviceSelect && service) {
        const matchingOption = [...serviceSelect.options].find(option => option.value.toLowerCase() === service.toLowerCase());
        if (matchingOption) serviceSelect.value = matchingOption.value;
      }
      const preferred = params.get('preferred_channel');
      const preferredSelect = document.getElementById('enquiry-channel');
      if (preferredSelect && ['email', 'whatsapp', 'phone'].includes(preferred)) preferredSelect.value = preferred;
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
    loadTurnstile();

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = new FormData(form);
      const email = String(values.get('email') || '').trim();
      const phone = String(values.get('phone') || '').trim();
      if (!email && !phone) {
        status.textContent = 'Please add an email address or phone/WhatsApp number so we can reply.';
        status.classList.remove('hidden');
        document.getElementById('enquiry-email')?.focus();
        return;
      }

      if (!idempotencyInput.value) idempotencyInput.value = makeIdempotencyKey();
      status.classList.add('hidden');
      submitButton.disabled = true;
      submitButton.textContent = 'Creating your ticket…';

      try {
        const result = await window.submitInquiry({
          site_key: 'olympus-atelier',
          intent: values.get('intent'),
          name: values.get('name'),
          email,
          phone,
          preferred_channel: values.get('preferred_channel'),
          service: values.get('service') || null,
          budget: values.get('budget') || null,
          preferred_date: values.get('preferred_date') || null,
          timeline: values.get('timeline') || null,
          location: values.get('location') || null,
          message: values.get('message'),
          consent: values.get('consent') === 'on',
          source_page: window.location.hash.split('?')[0].replace(/^#/, '') || 'contact',
          source_cta: values.get('source_cta') || null,
          source_url: window.location.href,
          referrer: document.referrer || null,
          utm: Object.fromEntries([...new URL(window.location.href).searchParams.entries()].filter(([key]) => key.startsWith('utm_'))),
          idempotency_key: values.get('idempotency_key'),
          turnstile_token: values.get('cf-turnstile-response') || null,
          website: values.get('website') || ''
        });
        successTicket.textContent = result.ticketNumber;
        successEmail.textContent = result.acknowledgementState === 'sent'
          ? 'A confirmation email is on its way.'
          : email
            ? 'Your ticket is saved. Email confirmation is temporarily unavailable, but the atelier can still see your enquiry.'
            : 'Your ticket is saved and the atelier can now respond through your preferred channel.';
        if (result.whatsappUrl) {
          continueWhatsapp.href = result.whatsappUrl;
          continueWhatsapp.classList.remove('hidden');
        } else {
          continueWhatsapp.classList.add('hidden');
        }
        formPanel.classList.add('hidden');
        successPanel.classList.remove('hidden');
        successPanel.focus();
      } catch (error) {
        status.textContent = error.message || 'We could not create your ticket. Your details are still here—please try again.';
        status.classList.remove('hidden');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create enquiry ticket';
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
    if (expertiseList) expertiseList.innerHTML = content.services.map(service => `<li><a href="#services" class="hover:text-white transition-colors spa-nav-link" data-page="services">${escapeHtml(service.title)}</a></li>`).join('');

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
      connectRow.innerHTML = `${whatsappLink}${content.siteConfig.email ? `<a href="mailto:${escapeHtml(content.siteConfig.email)}" class="text-xs text-neutral-400 hover:text-white">${escapeHtml(content.siteConfig.email)}</a>` : ''}${content.siteConfig.location ? `<span class="text-xs text-neutral-500">${escapeHtml(content.siteConfig.location)}</span>` : ''}${socialLinks ? `<span class="flex gap-2">${socialLinks}</span>` : ''}`;
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

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initializeManagedContent, { once: true });
  } else {
    initializeManagedContent();
  }
})();
