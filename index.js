const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// lenis smooth scroll instance (disabled on touch devices to avoid rubber-banding and scroll fight issues)
let lenis = null;
if (!isTouchDevice) {
  lenis = new Lenis({
    duration: prefersReducedMotion ? 0 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !prefersReducedMotion
  });

  const raf = (time) => {
    if (lenis) lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Three.js Particle Backdrop Code
let backdropScene, backdropCamera, backdropRenderer, backdropParticles;

const initBackdropWebGL = () => {
  if (prefersReducedMotion) return;
  const canvas = document.getElementById('bg-webgl-canvas');
  if (!canvas) return;

  backdropScene = new THREE.Scene();
  backdropCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  backdropCamera.position.z = 5;

  backdropRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  backdropRenderer.setSize(window.innerWidth, window.innerHeight);
  backdropRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particle Geometry
  const particleCount = 100;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 12;
    positions[i + 1] = (Math.random() - 0.5) * 8;
    positions[i + 2] = (Math.random() - 0.5) * 6;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Particle Material (Shiny Gold points)
  const particleMat = new THREE.PointsMaterial({
    size: 0.04,
    color: 0xD4AF37,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  backdropParticles = new THREE.Points(particleGeo, particleMat);
  backdropScene.add(backdropParticles);

  // Resize handler
  window.addEventListener('resize', () => {
    backdropCamera.aspect = window.innerWidth / window.innerHeight;
    backdropCamera.updateProjectionMatrix();
    backdropRenderer.setSize(window.innerWidth, window.innerHeight);
  });
};

const animateBackdrop = () => {
  if (prefersReducedMotion) return;
  requestAnimationFrame(animateBackdrop);
  if (backdropParticles) {
    backdropParticles.rotation.y += 0.0012;
    backdropParticles.rotation.x += 0.0006;
  }
  if (backdropRenderer && backdropScene && backdropCamera) {
    backdropRenderer.render(backdropScene, backdropCamera);
  }
};

// Word-by-word reveal for mission statement (Image 1 style)
const initWordReveal = () => {
  const ids = ['word-reveal-paragraph', 'manifesto-word-reveal'];
  ids.forEach(id => {
    const paragraph = document.getElementById(id);
    if (!paragraph) return;

    const words = paragraph.textContent.trim().split(/\s+/);
    paragraph.innerHTML = words.map(word => `<span class="word-reveal-span">${word}</span>`).join(' ');

    const spans = paragraph.querySelectorAll('.word-reveal-span');

    gsap.registerPlugin(ScrollTrigger);

    const isMobileReveal = window.matchMedia('(max-width: 639px)').matches;
    gsap.timeline({
      scrollTrigger: {
        trigger: paragraph,
        start: isMobileReveal ? 'top 94%' : 'top 85%',
        end: isMobileReveal ? 'top 58%' : 'bottom 40%',
        scrub: isMobileReveal ? 0.12 : 0.4,
        invalidateOnRefresh: true
      }
    }).to(spans, {
      opacity: 1,
      y: 0,
      stagger: isMobileReveal ? 0.025 : 0.04,
      ease: 'power1.out',
      className: 'word-reveal-span revealed'
    });

    ScrollTrigger.refresh();
  });
};

// London Ticker Clock (GMT) (Image 7 style)
const initLondonClock = () => {
  const clockEl = document.getElementById('london-time');
  if (!clockEl) return;

  const updateTime = () => {
    const options = {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const formatter = new Intl.DateTimeFormat([], options);
    clockEl.textContent = formatter.format(new Date());
  };

  updateTime();
  setInterval(updateTime, 1000);
};

// CEO Portrait mouse parallax (Image 7 style)
const initCeoParallax = () => {
  const portrait = document.querySelector('.ceo-portrait');
  if (!portrait) return;

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX - window.innerWidth / 2) / 60;
    const y = (e.clientY - window.innerHeight / 2) / 60;
    
    gsap.to(portrait, {
      x: x,
      y: y,
      duration: 0.8,
      ease: 'power2.out'
    });
  });
};

// Capabilities Stack Dealer Animation (The Stacked Deck Dealer)
let isCapabilitiesDealt = false;
let currentExpandedIdx = null;

const initCapabilitiesStack = () => {
  const container = document.getElementById('capabilities-deck-container');
  const cards = document.querySelectorAll('.capabilities-card');
  const restackBtn = document.getElementById('restack-deck-btn');
  if (!container || cards.length === 0) return;

  const updateDeckLayout = (animate = true) => {
    const rect = container.getBoundingClientRect();
    const isCompact = window.innerWidth < 1024;
    const cardWidth = Math.min(280, Math.max(240, rect.width - 48));
    const compactX = Math.max(0, (rect.width - cardWidth) / 2);
    container.style.minHeight = isCompact && isCapabilitiesDealt ? `${cards.length * 380}px` : '';

    cards.forEach((card, idx) => {
      // Clear expansions
      card.classList.remove('mobile-active');
      const drawer = card.querySelector('.card-details-drawer');
      const expandText = card.querySelector('.select-none');
      const contentWrapper = card.querySelector('.card-content-wrapper');
      if (drawer) {
        drawer.style.maxHeight = '0px';
        drawer.style.opacity = '0';
      }
      if (expandText) expandText.textContent = "Click to expand";

      if (!isCapabilitiesDealt) {
        // Stacked state: Overlapping cards
        const rotation = (idx - 1.5) * 3.5; // Fan angles
        const tx = idx * 6; // Stack offsets
        const ty = idx * 3;
        
        if (contentWrapper) {
          gsap.to(contentWrapper, {
            opacity: idx === cards.length - 1 ? 1 : 0,
            duration: animate ? 0.2 : 0
          });
        }
        
        gsap.to(card, {
          x: isCompact ? compactX : 50,
          y: ty,
          rotation: rotation,
          scale: 0.94 + (idx * 0.02),
          zIndex: idx + 10,
          opacity: 1,
          duration: animate ? 0.45 : 0,
          ease: 'power3.out'
        });
      } else {
        // Dealt state: panned out
        if (contentWrapper) {
          gsap.to(contentWrapper, {
            opacity: 1,
            duration: animate ? 0.25 : 0,
            delay: idx * 0.03
          });
        }

        if (isCompact) {
          // Vertical layout stack - drop from top on deal
          if (animate) {
            gsap.fromTo(card,
              { y: -350, opacity: 0 },
              {
                x: compactX,
                y: idx * 380,
                rotation: 0,
                scale: 1,
                zIndex: 10,
                opacity: 1,
                duration: 0.65,
                delay: idx * 0.06,
                ease: 'power3.out'
              }
            );
          } else {
            gsap.to(card, {
              x: compactX,
              y: idx * 380,
              rotation: 0,
              scale: 1,
              zIndex: 10,
              opacity: 1,
              duration: 0
            });
          }
        } else {
          // Horizontal distributed layout
          const containerWidth = rect.width;
          const totalCardsWidth = 4 * cardWidth;
          const gap = Math.max(18, (containerWidth - totalCardsWidth) / 3);
          const xPos = idx * (cardWidth + gap);

          gsap.to(card, {
            x: xPos,
            y: 0,
            rotation: 0,
            scale: 1,
            zIndex: 10,
            opacity: 1,
            duration: animate ? 0.45 : 0,
            delay: idx * 0.04,
            ease: 'power4.out'
          });
        }
      }
    });

    if (isCapabilitiesDealt) {
      container.classList.add('dealt');
      restackBtn.classList.remove('hidden');
    } else {
      container.classList.remove('dealt');
      restackBtn.classList.add('hidden');
    }
  };

  // Dragging/Swiping gesture detection to deal card stack
  let dragStartX = 0;
  let dragStartY = 0;

  container.addEventListener('mousedown', (e) => {
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  });

  container.addEventListener('mouseup', (e) => {
    const dx = Math.abs(e.clientX - dragStartX);
    const dy = Math.abs(e.clientY - dragStartY);
    if ((dx > 40 || dy > 40) && !isCapabilitiesDealt) {
      isCapabilitiesDealt = true;
      updateDeckLayout(true);
    }
  });

  container.addEventListener('touchstart', (e) => {
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    const dx = Math.abs(e.changedTouches[0].clientX - dragStartX);
    const dy = Math.abs(e.changedTouches[0].clientY - dragStartY);
    if ((dx > 40 || dy > 40) && !isCapabilitiesDealt) {
      isCapabilitiesDealt = true;
      updateDeckLayout(true);
    }
  }, { passive: true });

  // Click on cards to deal or expand
  cards.forEach((card, idx) => {
    // Track cursor coordinates for golden magnetic spotlight glow
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;

      const isCompact = window.innerWidth < 1024;

      if (!isCapabilitiesDealt) {
        isCapabilitiesDealt = true;
        updateDeckLayout(true);
      } else {
        if (isCompact) {
          // Mobile touch support: First tap reveals, second tap navigates
          if (!card.classList.contains('mobile-active')) {
            cards.forEach(c => c.classList.remove('mobile-active'));
            card.classList.add('mobile-active');
          } else {
            const subtabs = ['photo', 'graphic', 'web', 'story'];
            window.location.hash = `services?tab=${subtabs[idx]}`;
          }
        } else {
          // Desktop: Direct click navigation
          const subtabs = ['photo', 'graphic', 'web', 'story'];
          window.location.hash = `services?tab=${subtabs[idx]}`;
        }
      }
    });
  });

  // Restack button listener
  restackBtn.addEventListener('click', () => {
    isCapabilitiesDealt = false;
    currentExpandedIdx = null;
    updateDeckLayout(true);
  });

  // Init layout
  updateDeckLayout(false);

  // Resize handler
  window.addEventListener('resize', () => {
    updateDeckLayout(false);
  });
};

// WebGL Image Slider 3-Card Carousel configurations
let sliderScene, sliderCamera, sliderRenderer, sliderPlane, sliderMaterial;
let currentSliderIndex = 0;
let isSliderTransitioning = false;

const sliderProjects = [
  {
    category: "Photography",
    title: "Ethereal Capture",
    desc: "Stylized editorial campaign shot with cinema-grade high-contrast lighting.",
    img: "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/61cab6ed-0aeb-4671-824c-5b8a0cf236ca_320w.webp",
    isVideo: false
  },
  {
    category: "Web Design",
    title: "Universal Matrix",
    desc: "Bespoke platform layout built with performance-optimized CSS structures.",
    img: "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/d25a1767-0ea8-4aac-b981-6afd67dc79a6_800w.webp",
    isVideo: false
  },
  {
    category: "Video Production",
    title: "Studio Collaborative",
    desc: "Creative documentary storytelling exploring modern workplace interactions.",
    img: "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/357cb3d1-9f65-4810-884b-f0072a65193d_1600w.webp",
    video: "https://assets.mixkit.co/videos/preview/mixkit-working-late-at-the-office-42354-large.mp4",
    isVideo: true
  },
  {
    category: "Graphic Design",
    title: "Branding Editorial",
    desc: "Clean poster visual paths, vector cards, and typography layout systems.",
    img: "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/2f999a94-8031-4c3e-b64e-836c1b4f5be0_320w.webp",
    isVideo: false
  }
];

const initLiquidSlider = () => {
  const container = document.getElementById('card-center');
  const canvas = document.getElementById('liquid-slider-canvas');
  if (!container || !canvas) return;

  // Setup Three Scene
  sliderScene = new THREE.Scene();
  sliderCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  sliderRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  sliderRenderer.setSize(container.clientWidth, container.clientHeight);
  sliderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Load textures
  const textureLoader = new THREE.TextureLoader();
  const textures = sliderProjects.map(p => {
    const tex = textureLoader.load(p.img);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  });

  // Displacement shader material
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D texture1;
    uniform sampler2D texture2;
    uniform float progress;
    uniform float time;
    uniform vec2 mouse;

    void main() {
      vec2 uv = vUv;
      
      // Compute liquid distortion only during active slide transition
      float distortion = sin(uv.y * 12.0 + time * 2.0) * 0.05 * (1.0 - progress) * progress;
      
      // Hover mouse coordinate ripples
      float distToMouse = distance(uv, mouse);
      float mouseRipple = sin(distToMouse * 35.0 - time * 6.0) * 0.015 * smoothstep(0.35, 0.0, distToMouse);

      vec2 distortedUv1 = vec2(uv.x + progress * 0.15 + distortion + mouseRipple, uv.y);
      vec2 distortedUv2 = vec2(uv.x - (1.0 - progress) * 0.15 + distortion + mouseRipple, uv.y);

      vec4 color1 = texture2D(texture1, distortedUv1);
      vec4 color2 = texture2D(texture2, distortedUv2);

      gl_FragColor = mix(color1, color2, progress);
    }
  `;

  sliderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      texture1: { value: textures[0] },
      texture2: { value: textures[1] },
      progress: { value: 0 },
      time: { value: 0 },
      mouse: { value: new THREE.Vector2(0.5, 0.5) }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  sliderPlane = new THREE.Mesh(geometry, sliderMaterial);
  sliderScene.add(sliderPlane);

  // Render loop
  const clock = new THREE.Clock();
  const render = () => {
    requestAnimationFrame(render);
    sliderMaterial.uniforms.time.value = clock.getElapsedTime();
    sliderRenderer.render(sliderScene, sliderCamera);
  };
  render();

  // Mouse move ripples
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - ((e.clientY - rect.top) / rect.height);
    sliderMaterial.uniforms.mouse.value.set(x, y);
  });

  const updateCardBorders = () => {
    const leftIdx = (currentSliderIndex - 1 + sliderProjects.length) % sliderProjects.length;
    const rightIdx = (currentSliderIndex + 1) % sliderProjects.length;

    // Set Left / Right images source
    document.getElementById('img-left').src = sliderProjects[leftIdx].img;
    document.getElementById('img-right').src = sliderProjects[rightIdx].img;

    // Update central detail overlays
    document.getElementById('slider-project-category').textContent = sliderProjects[currentSliderIndex].category;
    document.getElementById('slider-project-title').textContent = sliderProjects[currentSliderIndex].title;
    document.getElementById('slider-project-desc').textContent = sliderProjects[currentSliderIndex].desc;
  };

  const transitionTo = (nextIdx) => {
    if (isSliderTransitioning) return;
    isSliderTransitioning = true;

    // Set texture layers
    sliderMaterial.uniforms.texture1.value = textures[currentSliderIndex];
    sliderMaterial.uniforms.texture2.value = textures[nextIdx];
    sliderMaterial.uniforms.progress.value = 0;

    // Slide transition animation
    const tl = gsap.timeline();
    
    // Scale and fade cards during transition
    tl.to('.carousel-card', { opacity: 0.3, scale: 0.88, duration: 0.3, ease: 'power2.out' })
      .to(sliderMaterial.uniforms.progress, {
        value: 1,
        duration: 0.9,
        ease: 'power2.inOut',
        onComplete: () => {
          currentSliderIndex = nextIdx;
          sliderMaterial.uniforms.texture1.value = textures[nextIdx];
          sliderMaterial.uniforms.progress.value = 0;
          updateCardBorders();
        }
      }, "-=0.2")
      .to('#card-center', { opacity: 1, scale: 1.0, duration: 0.4, ease: 'power2.out' })
      .to(['#card-left', '#card-right'], { opacity: 0.4, scale: 0.9, duration: 0.4, ease: 'power2.out', onComplete: () => {
        isSliderTransitioning = false;
      } }, "-=0.4");
  };

  document.getElementById('slider-next-btn').addEventListener('click', () => {
    const next = (currentSliderIndex + 1) % sliderProjects.length;
    transitionTo(next);
  });

  document.getElementById('slider-prev-btn').addEventListener('click', () => {
    const prev = (currentSliderIndex - 1 + sliderProjects.length) % sliderProjects.length;
    transitionTo(prev);
  });

  // Left / Right card clicking triggers navigation directly
  document.getElementById('card-left').addEventListener('click', () => {
    const prev = (currentSliderIndex - 1 + sliderProjects.length) % sliderProjects.length;
    transitionTo(prev);
  });

  document.getElementById('card-right').addEventListener('click', () => {
    const next = (currentSliderIndex + 1) % sliderProjects.length;
    transitionTo(next);
  });

  // Swipe gesture tracking on center card
  let touchStartX = 0;
  let touchEndX = 0;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  });

  const handleSwipeGesture = () => {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe Left -> Next
      const next = (currentSliderIndex + 1) % sliderProjects.length;
      transitionTo(next);
    } else if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe Right -> Prev
      const prev = (currentSliderIndex - 1 + sliderProjects.length) % sliderProjects.length;
      transitionTo(prev);
    }
  };

  // Init border image displays
  updateCardBorders();

  // Resize handler
  window.addEventListener('resize', () => {
    sliderRenderer.setSize(container.clientWidth, container.clientHeight);
  });
};

// Fullscreen Lightbox Modal Multimedia player logic
let activeLightboxIndex = 0;
let isLightboxVideo = false;

const initLightboxModal = () => {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const video = document.getElementById('lightbox-video');
  const title = document.getElementById('lightbox-title');
  const category = document.getElementById('lightbox-category');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');
  
  if (!modal) return;

  const openLightbox = (index) => {
    activeLightboxIndex = index;
    const project = sliderProjects[index];
    
    category.textContent = project.category;
    title.textContent = project.title;

    if (project.isVideo) {
      img.classList.add('hidden');
      video.classList.remove('hidden');
      video.src = project.video;
      video.load();
      video.play().catch(err => console.log("Video auto-play block: ", err));
      isLightboxVideo = true;
    } else {
      video.classList.add('hidden');
      video.src = "";
      img.classList.remove('hidden');
      img.src = project.img;
      isLightboxVideo = false;
    }

    modal.classList.remove('hidden');
    gsap.to(modal, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    if (lenis) lenis.stop(); // Stop page scrolling
  };

  const closeLightbox = () => {
    gsap.to(modal, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        modal.classList.add('hidden');
        video.pause();
        video.src = "";
        img.src = "";
        if (lenis) lenis.start(); // Restore scrolling
      }
    });
  };

  const navigateLightbox = (direction) => {
    let nextIdx = activeLightboxIndex;
    if (direction === 'next') {
      nextIdx = (activeLightboxIndex + 1) % sliderProjects.length;
    } else {
      nextIdx = (activeLightboxIndex - 1 + sliderProjects.length) % sliderProjects.length;
    }
    openLightbox(nextIdx);
  };

  // Center card click opens lightbox
  document.getElementById('card-center').addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    openLightbox(currentSliderIndex);
  });

  // Portfolio items click opens lightbox
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  portfolioItems.forEach(item => {
    item.addEventListener('click', () => {
      const idxStr = item.getAttribute('data-idx');
      if (idxStr !== null) {
        const idx = parseInt(idxStr);
        // Map index directly to slider projects or construct custom project mappings
        openLightbox(idx % sliderProjects.length);
      }
    });
  });

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => navigateLightbox('prev'));
  nextBtn.addEventListener('click', () => navigateLightbox('next'));

  // Close on clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  // Keyboard navigation listeners
  window.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') navigateLightbox('next');
    if (e.key === 'ArrowLeft') navigateLightbox('prev');
  });
};

// Custom Selects Handler
const initCustomSelects = () => {
  const selects = document.querySelectorAll('.custom-select');

  selects.forEach(select => {
    const trigger = select.querySelector('.select-trigger');
    const list = select.querySelector('.select-options-list');
    const input = select.querySelector('input[type="hidden"]');
    const label = select.querySelector('.select-label');

    if (!trigger || !list) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other lists first
      document.querySelectorAll('.select-options-list').forEach(l => {
        if (l !== list) l.classList.add('hidden');
      });
      document.querySelectorAll('.select-arrow').forEach(a => {
        if (a !== trigger.querySelector('.select-arrow')) a.style.transform = 'rotate(0deg)';
      });

      // Toggle current list
      const isClosed = list.classList.contains('hidden');
      if (isClosed) {
        list.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
        trigger.querySelector('.select-arrow').style.transform = 'rotate(180deg)';
      } else {
        list.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.querySelector('.select-arrow').style.transform = 'rotate(0deg)';
      }
    });

    const options = list.querySelectorAll('[data-value]');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.getAttribute('data-value');
        const txt = opt.textContent;

        if (input) {
          input.value = val;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (label) label.textContent = txt.trim();

        list.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.querySelector('.select-arrow').style.transform = 'rotate(0deg)';

        // Trigger input validation check
        validateScaleForm();
      });
    });
  });

  // Clicking outside collapses selects
  document.addEventListener('click', () => {
    document.querySelectorAll('.select-options-list').forEach(l => l.classList.add('hidden'));
    document.querySelectorAll('.select-trigger').forEach(t => t.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.select-arrow').forEach(a => a.style.transform = 'rotate(0deg)');
  });
};

// Scale proposal Double-CTA Switching path Form logic
let scaleFormPath = 'event'; // 'event' or 'project'

const initScaleFormToggler = () => {
  const btnEvent = document.getElementById('toggle-path-event');
  const btnProject = document.getElementById('toggle-path-project');
  const blockEvent = document.getElementById('form-block-event');
  const blockProject = document.getElementById('form-block-project');
  const submitText = document.getElementById('submit-btn-text');
  const copyTitle = document.getElementById('scale-copy-title');
  const copyBody = document.getElementById('scale-copy-body');
  const benefitOne = document.getElementById('scale-benefit-one');
  const benefitTwo = document.getElementById('scale-benefit-two');
  const benefitThree = document.getElementById('scale-benefit-three');

  const copy = {
    event: {
      title: 'Ready to book your event?',
      body: 'Tell us about the date, venue, and coverage you need. We will respond within 24 hours with availability and the cleanest next step.',
      benefits: [
        'Direct access to senior creatives and event planners',
        'Clear coverage, pricing, and delivery expectations',
        'No commitment required for the first consultation'
      ],
      submit: 'Book Event Call'
    },
    project: {
      title: 'Ready to start your project?',
      body: 'Tell us what you are building. We will review the scope, shape the right creative path, and send a detailed proposal within 24 hours.',
      benefits: [
        'Direct access to senior developers and strategists',
        'Transparent pricing and timeline estimates',
        'No commitment required for initial consultation'
      ],
      submit: 'Start Project'
    }
  };

  const applyPathCopy = (path) => {
    const content = copy[path];
    if (!content) return;
    if (copyTitle) copyTitle.textContent = content.title;
    if (copyBody) copyBody.textContent = content.body;
    if (benefitOne) benefitOne.textContent = content.benefits[0];
    if (benefitTwo) benefitTwo.textContent = content.benefits[1];
    if (benefitThree) benefitThree.textContent = content.benefits[2];
    if (submitText) submitText.textContent = content.submit;
  };

  if (!btnEvent || !btnProject) return;

  btnEvent.addEventListener('click', () => {
    scaleFormPath = 'event';
    btnEvent.classList.add('active');
    btnProject.classList.remove('active');
    blockEvent.classList.remove('hidden');
    blockProject.classList.add('hidden');
    applyPathCopy('event');
    validateScaleForm();
  });

  btnProject.addEventListener('click', () => {
    scaleFormPath = 'project';
    btnProject.classList.add('active');
    btnEvent.classList.remove('active');
    blockProject.classList.remove('hidden');
    blockEvent.classList.add('hidden');
    applyPathCopy('project');
    validateScaleForm();
  });

  applyPathCopy(scaleFormPath);
};

// Inactive validation trigger: enables submit CTA button when all path inputs are valid
const validateScaleForm = () => {
  const form = document.getElementById('scale-proposal-form');
  const submitBtn = document.getElementById('proposal-submit-btn');
  if (!form || !submitBtn) return;

  const nameVal = document.getElementById('proposal-name').value.trim();
  const emailVal = document.getElementById('proposal-email').value.trim();
  const detailsVal = document.getElementById('proposal-details').value.trim();

  let isPathValid = false;

  if (scaleFormPath === 'event') {
    const dateVal = document.getElementById('event-date').value;
    const locationVal = document.getElementById('event-location').value.trim();
    isPathValid = (dateVal !== '' && locationVal !== '');
  } else {
    const budgetVal = document.getElementById('project-budget').value.trim();
    isPathValid = (budgetVal !== '');
  }

  const isFormValid = (nameVal !== '' && emailVal !== '' && detailsVal !== '' && isPathValid);

  if (isFormValid) {
    submitBtn.removeAttribute('disabled');
    submitBtn.className = "w-full bg-gold-gradient text-neutral-950 font-bold py-3.5 rounded-xl hover:scale-[1.01] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 opacity-100 cursor-pointer shadow-lg shadow-amber-500/10";
  } else {
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.className = "w-full bg-[#f3f4f6] text-[#050505] font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 opacity-40 cursor-not-allowed";
  }
};

const setupFormValidationListeners = () => {
  const form = document.getElementById('scale-proposal-form');
  if (!form) return;

  const inputs = [
    'proposal-name',
    'proposal-email',
    'proposal-details',
    'event-date',
    'event-location',
    'project-budget'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', validateScaleForm);
      el.addEventListener('change', validateScaleForm);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert(scaleFormPath === "event" ? "Event call request received. Olympus will respond within 24 hours." : "Project brief received. Olympus will respond within 24 hours.");
    form.reset();
    validateScaleForm();
  });
};

// FAQ Accordion functionality
const initFaqs = () => {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-btn');
    const content = item.querySelector('.faq-content');
    const icon = item.querySelector('.faq-icon');

    if (!btn || !content) return;

    btn.addEventListener('click', () => {
      const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';

      // Close other faqs
      document.querySelectorAll('.faq-content').forEach(c => c.style.maxHeight = '0px');
      document.querySelectorAll('.faq-icon').forEach(i => i.style.transform = 'rotate(0deg)');

      if (!isOpen) {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
      }
    });
  });
};

// Portfolio filter functionality (masonry filter cards)
const initPortfolioFilter = () => {
  const grid = document.getElementById('portfolio-grid');
  const items = document.querySelectorAll('.portfolio-item');
  const btns = document.querySelectorAll('.portfolio-filter-btn');
  if (!grid || items.length === 0) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      // Update button colors
      btns.forEach(b => {
        b.classList.remove('text-white');
        b.classList.add('text-neutral-500');
      });
      btn.classList.remove('text-neutral-500');
      btn.classList.add('text-white');

      // Show/Hide items with smooth fade scales
      items.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          item.classList.remove('hidden');
          gsap.to(item, {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.5,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        } else {
          gsap.to(item, {
            opacity: 0,
            scale: 0.9,
            y: 20,
            duration: 0.4,
            ease: 'power3.in',
            onComplete: () => item.classList.add('hidden'),
            overwrite: 'auto'
          });
        }
      });
    });
  });
};

// Sticky scroll services columns synchronization (IntersectionObserver based)
const initStickyScrollServices = () => {
  const scrollContainer = document.querySelector('#page-services');
  if (!scrollContainer) return;

  const sections = document.querySelectorAll('.scroll-service-section');
  const layers = document.querySelectorAll('.sticky-image-layer');

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -55% 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = entry.target.getAttribute('data-service-index');
        
        // Update active image layers
        layers.forEach(layer => {
          if (layer.id === `sticky-img-${index}`) {
            layer.classList.add('active');
          } else {
            layer.classList.remove('active');
          }
        });

        // Highlight active text sections
        sections.forEach(sec => {
          if (sec === entry.target) {
            sec.classList.add('opacity-100');
            sec.classList.remove('opacity-40');
            sec.querySelector('.process-connector-fill') ? sec.querySelector('.process-connector-fill').style.height = '100%' : null;
          } else {
            sec.classList.remove('opacity-100');
            sec.classList.add('opacity-40');
            sec.querySelector('.process-connector-fill') ? sec.querySelector('.process-connector-fill').style.height = '0%' : null;
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(sec => observer.observe(sec));
};

// Asymmetrical case study parallax shift on scroll
const initAsymmetricalParallax = () => {
  const img = document.querySelector('.parallax-img');
  if (!img) return;

  gsap.to(img, {
    y: '-10%',
    ease: 'none',
    scrollTrigger: {
      trigger: img,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
};

// Prefooter full width image zoom parallax
const initPrefooterParallax = () => {
  const bgImg = document.getElementById('prefooter-bg-img');
  if (!bgImg) return;

  gsap.to(bgImg, {
    y: '-20%',
    ease: 'none',
    scrollTrigger: {
      trigger: bgImg,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
};

// SPA Router for active sections
const initSPARouter = () => {
  const pages = document.querySelectorAll('.spa-page');
  const navLinks = document.querySelectorAll('.nav-link');

  const navigateTo = (pageId) => {
    pages.forEach(p => {
      if (p.id === `page-${pageId}`) {
        p.classList.add('active');
        gsap.fromTo(p, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', onComplete: () => { gsap.set(p, { clearProps: 'transform' }); } });
      } else {
        p.classList.remove('active');
      }
    });

    // Toggle global persistent marketing modules
    const globalModules = document.getElementById('global-persistent-modules');
    if (globalModules) {
      if (pageId === 'book') {
        globalModules.style.display = 'none';
      } else {
        globalModules.style.display = '';
        
        const modulesVisibility = {
          'homepage-whychooseus-section': ['home', 'services'],
          'homepage-process-section': ['home', 'services'],
          'homepage-manifesto-section': ['home', 'services'],
          'portfolio-slider-section': ['home', 'services'],
          'scale-block': ['home', 'services', 'portfolio'],
          'partners-section': ['home', 'services', 'about', 'contact'],
          'testimonials-section': ['home', 'services', 'about', 'contact'],
          'faq-section': ['home', 'services', 'about', 'contact'],
          'global-prefooter-banner': ['home', 'services', 'portfolio', 'about', 'contact']
        };

        Object.keys(modulesVisibility).forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            const allowedPages = modulesVisibility[id];
            el.style.display = allowedPages.includes(pageId) ? '' : 'none';
          }
        });
      }
    }

    // Update nav links indicator
    navLinks.forEach(link => {
      const linkPage = link.getAttribute('data-page');
      if (linkPage === pageId) {
        link.classList.add('active');
        link.classList.remove('text-neutral-400');
        link.classList.add('text-white');
      } else {
        link.classList.remove('active');
        link.classList.remove('text-white');
        link.classList.add('text-neutral-400');
      }
    });

    // Scroll back to top
    window.scrollTo(0, 0);
    if (typeof lenis !== 'undefined' && lenis) lenis.scrollTo(0, { duration: 0.4 });
  };

  // Nav links click triggers
  document.querySelectorAll('.spa-nav-link, .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetPage = link.getAttribute('data-page');
      if (targetPage) {
        e.preventDefault();
        window.location.hash = targetPage;
      }
    });
  });

  // Watch URL Hash shifts
  window.addEventListener('hashchange', () => {
    const rawHash = window.location.hash.substring(1);
    const hash = rawHash.split('?')[0] || 'home';
    navigateTo(hash);

    // Pre-populate service options if subtab passed in url parameters
    if (rawHash.includes('tab=')) {
      const val = rawHash.split('tab=')[1];
      const categorySelect = document.getElementById('booking-category');
      if (categorySelect) {
        categorySelect.value = val;
        const bookingSelect = document.getElementById('booking-category-container');
        const bookingLabel = bookingSelect ? bookingSelect.querySelector('.select-label') : null;
        const option = bookingSelect ? bookingSelect.querySelector(`[data-value="${val}"]`) : null;
        if (bookingLabel && option) bookingLabel.textContent = option.textContent.trim();
        categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // Load active hashes initially
  const rawHash = window.location.hash.substring(1);
  const initialHash = rawHash.split('?')[0] || 'home';
  navigateTo(initialHash);
};

// Scheduler Categories Toggler paths switcher
const initBookingPaths = () => {
  const selectCat = document.getElementById('booking-category');
  const pathWarning = document.getElementById('path-warning');
  const pathCalendar = document.getElementById('path-calendar');
  const pathQuote = document.getElementById('path-quote');

  if (!selectCat) return;

  selectCat.addEventListener('change', () => {
    const val = selectCat.value;
    pathWarning.classList.add('hidden');
    
    if (val === 'photo') {
      pathCalendar.classList.remove('hidden');
      pathQuote.classList.add('hidden');
    } else if (val !== '') {
      pathQuote.classList.remove('hidden');
      pathCalendar.classList.add('hidden');
    }
  });
};

// GSAP generic scroll reveals
const initScrollRevealClasses = () => {
  const elements = document.querySelectorAll('.gsap-reveal');
  elements.forEach(el => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none'
      }
    });
  });
};

// Hero Title Liquid Warp coordinates tracking
const initHeroLiquidWarp = () => {
  const heroTitle = document.querySelector('.liquid-hero-text');
  const dispMap = document.getElementById('hero-displacement-map');
  if (!heroTitle || !dispMap) return;
  
  heroTitle.addEventListener('mousemove', (e) => {
    gsap.to(dispMap, { attr: { scale: 15 }, duration: 0.35 });
  });
  heroTitle.addEventListener('mouseleave', () => {
    gsap.to(dispMap, { attr: { scale: 0 }, duration: 0.5 });
  });
};

// Mobile Hamburger Navigation Drawer
const initMobileDrawer = () => {
  const burgerBtn = document.getElementById('mobile-hamburger-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  if (!burgerBtn || !drawer) return;

  const setDrawerState = (open) => {
    drawer.classList.toggle('drawer-active', open);
    burgerBtn.classList.toggle('is-active', open);
    burgerBtn.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('mobile-menu-open', open);
    if (open) {
      if (lenis) lenis.stop();
      gsap.fromTo('.mobile-nav-link', { opacity: 0, y: 15 }, { opacity: 1, y: 0, stagger: 0.08, duration: prefersReducedMotion ? 0 : 0.4, ease: 'power2.out' });
    } else {
      if (lenis) lenis.start();
    }
  };
  
  burgerBtn.addEventListener('click', () => {
    setDrawerState(!drawer.classList.contains('drawer-active'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDrawerState(false);
  });
  
  // Close drawer on link click
  const links = drawer.querySelectorAll('.mobile-nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      setDrawerState(false);
    });
  });
};

// Magnetic Partners Logo attraction coordinates
const initMagneticLogos = () => {
  const wraps = document.querySelectorAll('.magnetic-logo-wrap');
  wraps.forEach(wrap => {
    const icon = wrap.querySelector('.hover-target-icon');
    if (!icon) return;
    
    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      gsap.to(icon, {
        x: (x - xc) * 0.35,
        y: (y - yc) * 0.35,
        color: '#D4AF37', // Golden color
        duration: 0.3
      });
    });
    
    wrap.addEventListener('mouseleave', () => {
      gsap.to(icon, {
        x: 0,
        y: 0,
        color: '#a3a3a3', // Dim neutral
        duration: 0.5,
        ease: 'power2.out'
      });
    });
  });
};

// Premium Scroll Parallax effects (Hero, process, and testimonial column scrolls)
const initExtraParallaxScroll = () => {
  // 1. Hero cursor parallax
  const heroSection = document.querySelector('#page-home .py-24');
  const heroBgGlow = document.querySelector('#page-home .blur-3xl');
  const heroTitle = document.querySelector('.liquid-hero-text');
  const heroDesc = document.querySelector('#page-home p');
  
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      if (heroBgGlow) {
        gsap.to(heroBgGlow, {
          x: -(x - xc) * 0.12,
          y: -(y - yc) * 0.12,
          duration: 0.6,
          ease: 'power2.out'
        });
      }
      if (heroTitle) {
        gsap.to(heroTitle, {
          x: (x - xc) * 0.04,
          y: (y - yc) * 0.04,
          duration: 0.6,
          ease: 'power2.out'
        });
      }
      if (heroDesc) {
        gsap.to(heroDesc, {
          x: (x - xc) * 0.02,
          y: (y - yc) * 0.02,
          duration: 0.6,
          ease: 'power2.out'
        });
      }
    });

    heroSection.addEventListener('mouseleave', () => {
      if (heroBgGlow) gsap.to(heroBgGlow, { x: 0, y: 0, duration: 0.8 });
      if (heroTitle) gsap.to(heroTitle, { x: 0, y: 0, duration: 0.8 });
      if (heroDesc) gsap.to(heroDesc, { x: 0, y: 0, duration: 0.8 });
    });
  }

  // 2. Process cards vertical scroll parallax (Desktop only: >= 768px to prevent vertical overlapping when stacked)
  const processCards = document.querySelectorAll('.process-grid-card');
  if (window.innerWidth >= 768) {
    processCards.forEach((card, idx) => {
      gsap.to(card, {
        y: (idx % 2 === 0) ? -25 : 25,
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });
  }

  // 3. Testimonials columns vertical parallax (Desktop only: >= 1024px to avoid vertical shift on mobile horizontal slider)
  const columns = document.querySelectorAll('.testimonial-ticker-column');
  if (window.innerWidth >= 1024) {
    columns.forEach((col, idx) => {
      const direction = (idx % 2 === 0) ? -60 : 60;
      gsap.to(col, {
        y: direction,
        scrollTrigger: {
          trigger: '#global-testimonials-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2
        }
      });
    });
  }
};

// Initialization entry point
// Rolling milestone numbers countup trigger
const initMilestoneRolls = () => {
  const statSpans = document.querySelectorAll('.stat-roll-number');
  if (statSpans.length === 0) return;

  statSpans.forEach(span => {
    const target = parseFloat(span.getAttribute('data-target'));
    const decimals = parseInt(span.getAttribute('data-decimals') || '0');
    const valObj = { value: 0 };

    gsap.to(valObj, {
      value: target,
      duration: 2.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: span,
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      onUpdate: () => {
        span.textContent = valObj.value.toFixed(decimals);
      }
    });
  });
};

// Horizontal swipe gesture velocity inertia scrolling for testimonials
const initTestimonialsSwipe = () => {
  const container = document.querySelector('.testimonial-ticker-container');
  if (!container) return;

  let isDown = false;
  let startX;
  let scrollLeft;
  let velocity = 0;
  let lastX = 0;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    velocity = 0;
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
  });

  container.addEventListener('mouseup', () => {
    isDown = false;
    // Apply scrolling inertia physics glide
    gsap.to(container, {
      scrollLeft: container.scrollLeft - velocity * 10,
      duration: 0.8,
      ease: 'power2.out'
    });
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
    velocity = x - lastX;
    lastX = x;
  });

  // Touch Support
  container.addEventListener('touchstart', (e) => {
    isDown = true;
    startX = e.touches[0].pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    velocity = 0;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isDown = false;
    gsap.to(container, {
      scrollLeft: container.scrollLeft - velocity * 10,
      duration: 0.8,
      ease: 'power2.out'
    });
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
    velocity = x - lastX;
    lastX = x;
  }, { passive: true });
};

// Initialization entry point
window.addEventListener('DOMContentLoaded', () => {
  initBackdropWebGL();
  animateBackdrop();
  initSPARouter();
  initWordReveal();
  initLondonClock();
  initCeoParallax();
  initCapabilitiesStack();
  initLiquidSlider();
  initLightboxModal();
  initCustomSelects();
  initScaleFormToggler();
  setupFormValidationListeners();
  initFaqs();
  initPortfolioFilter();
  initStickyScrollServices();
  initAsymmetricalParallax();
  initPrefooterParallax();
  initBookingPaths();
  initScrollRevealClasses();
  initHeroLiquidWarp();
  initMobileDrawer();
  initMagneticLogos();
  initExtraParallaxScroll();
  initMilestoneRolls();
  initTestimonialsSwipe();
});
