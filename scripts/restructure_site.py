#!/usr/bin/env python3
"""One-time structural migration for the Olympus static SPA."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    start_index = text.index(start)
    end_index = text.index(end, start_index)
    return text[:start_index] + replacement.rstrip() + "\n\n    " + text[end_index:]


services = '''<!-- PAGE 2: SERVICES -->
    <section id="page-services" class="spa-page">
      <div class="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div class="max-w-3xl mb-14">
          <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">What we make</span>
          <h2 class="h2-editorial font-extrabold text-white mt-3">Creative services grounded in real work.</h2>
          <p class="text-neutral-400 text-base md:text-lg mt-5 leading-relaxed">From the first frame to the final layout, Olympus brings production, post, and design together under one clear creative direction.</p>
        </div>
        <div id="service-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite"></div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14" aria-label="Olympus service showcase">
          <figure class="service-showcase-card md:col-span-2"><img src="assets/portfolio/1xOWqFVhUX5DXtpUGuhOxdA_pxGL2ZnNO.webp" alt="Conference guest speaking during Olympus Studio green-carpet coverage" loading="lazy"><figcaption>Events &amp; conferences</figcaption></figure>
          <figure class="service-showcase-card"><img src="assets/portfolio/1gJbVwUYB-8oPStbqAwxZ6Ja4nZmvvIY5.webp" alt="Campaign graphic designed by Olympus Studio" loading="lazy"><figcaption>Campaign graphics</figcaption></figure>
          <figure class="service-showcase-card"><img src="assets/team/photographer.webp" alt="Olympus Studio photographer" loading="lazy"><figcaption>Photography</figcaption></figure>
          <figure class="service-showcase-card md:col-span-2"><img src="assets/portfolio/1UWRIR8lmqtK_068iXv5AqqaowjnUjDNO.webp" alt="Conference interview filmed by Olympus Studio" loading="lazy"><figcaption>Film &amp; storytelling</figcaption></figure>
        </div>
      </div>
    </section>'''


portfolio = '''<!-- PAGE 3: PORTFOLIO -->
    <section id="page-portfolio" class="spa-page">
      <div class="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div class="max-w-3xl">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Full archive</span>
            <h2 class="selected-work-title text-white mt-4">Work built to be seen.</h2>
            <p class="text-neutral-400 mt-4 leading-relaxed">Explore films, event coverage, campaign graphics, publications, and motion work. Lightweight previews load here; original long-form files remain available in Drive.</p>
          </div>
          <p id="portfolio-result-status" class="text-xs font-mono uppercase tracking-widest text-neutral-500" aria-live="polite"></p>
        </div>
        <div id="portfolio-filters" class="flex flex-wrap gap-3 mb-10" aria-label="Filter portfolio"></div>
        <div id="portfolio-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite"></div>
        <div class="flex justify-center mt-12">
          <button id="portfolio-load-more" type="button" class="hidden bg-gold-gradient text-neutral-950 font-bold px-8 py-3.5 rounded-full hover:-translate-y-0.5 transition-transform">Load more work</button>
        </div>
      </div>
    </section>'''


about = '''<!-- PAGE 4: ABOUT -->
    <section id="page-about" class="spa-page">
      <div class="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end mb-16">
          <div class="lg:col-span-7">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">The studio</span>
            <h2 class="h2-editorial font-extrabold text-white mt-3">A compact team with an end-to-end visual practice.</h2>
          </div>
          <p class="lg:col-span-5 text-neutral-400 leading-relaxed">Olympus Studio brings creative direction, photography, cinematography, editing, visual design, motion, and editorial production into one collaborative workflow.</p>
        </div>
        <div id="team-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Olympus Studio team"></div>
        <div class="glass-card border-gold-gradient rounded-3xl p-8 md:p-12 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 aspect-[4/3] rounded-2xl overflow-hidden"><img src="assets/media/prefooter-stage.webp" alt="A professional conference stage covered by Olympus Studio" class="w-full h-full object-cover" loading="lazy"></div>
          <div class="lg:col-span-7">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">How we work</span>
            <h3 class="text-3xl md:text-4xl font-bold text-white mt-3">One visual language, from concept to delivery.</h3>
            <p class="text-neutral-400 mt-5 leading-relaxed">Every project begins with the audience and the moment that matters. We shape the concept, capture the material, refine it in post, and deliver a coherent system that works across screens, campaigns, events, and publications.</p>
          </div>
        </div>
      </div>
    </section>'''


booking = '''<!-- PAGE 5: BOOK NOW -->
    <section id="page-book" class="spa-page">
      <div class="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        <div class="text-center mb-12">
          <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Start a conversation</span>
          <h2 class="h2-editorial font-extrabold text-white mt-3">Brief Olympus on WhatsApp.</h2>
          <p class="text-neutral-400 text-sm md:text-base mt-4 max-w-2xl mx-auto">Complete the essentials and we will prepare a WhatsApp message you can review before sending.</p>
        </div>
        <form id="booking-form" class="glass-card border-gold-gradient p-6 md:p-8 rounded-3xl space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label for="booking-name" class="form-label">Name</label><input id="booking-name" name="name" type="text" class="glass-input form-control" required placeholder="Your name"></div>
            <div><label for="booking-email" class="form-label">Email <span class="text-neutral-600 normal-case">(optional)</span></label><input id="booking-email" name="email" type="email" class="glass-input form-control" placeholder="you@example.com"></div>
          </div>
          <div><label for="booking-service" class="form-label">Service</label><select id="booking-service" name="service" class="glass-input form-control" required><option value="">Choose a service</option></select></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label for="booking-date" class="form-label">Preferred date <span class="text-neutral-600 normal-case">(optional)</span></label><input id="booking-date" name="date" type="date" class="glass-input form-control"></div>
            <div><label for="booking-budget" class="form-label">Budget range <span class="text-neutral-600 normal-case">(optional)</span></label><input id="booking-budget" name="budget" type="text" class="glass-input form-control" placeholder="e.g. ₦500,000"></div>
          </div>
          <div><label for="booking-location" class="form-label">Location or venue <span class="text-neutral-600 normal-case">(optional)</span></label><input id="booking-location" name="location" type="text" class="glass-input form-control" placeholder="City, venue, or remote"></div>
          <div><label for="booking-details" class="form-label">Project brief</label><textarea id="booking-details" name="details" rows="6" class="glass-input form-control" required placeholder="Tell us what you need, who it is for, and what a successful result looks like."></textarea></div>
          <button type="submit" class="w-full bg-gold-gradient text-neutral-950 font-bold py-4 rounded-xl hover:scale-[1.01] transition-transform shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"><iconify-icon icon="logos:whatsapp-icon"></iconify-icon>Continue on WhatsApp</button>
          <p class="text-xs text-neutral-500 text-center">Nothing is sent until you confirm it in WhatsApp.</p>
        </form>
      </div>
    </section>'''


testimonials = '''<!-- Testimonials (placeholder content sourced from content.js) -->
    <section class="max-w-7xl mx-auto px-6 py-24 border-t border-white/5" id="testimonials-section" data-placeholder-content="true">
      <div class="text-center mb-12">
        <span class="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] font-mono">Endorsements</span>
        <h2 class="h2-editorial font-extrabold text-white mt-3">What our partners say</h2>
      </div>
      <div id="testimonial-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite"></div>
    </section>'''


text = HTML.read_text(encoding="utf-8")
text = replace_between(text, "<!-- PAGE 2:", "<!-- PAGE 3:", services)
text = replace_between(text, "<!-- PAGE 3:", "<!-- PAGE 4:", portfolio)
text = replace_between(text, "<!-- PAGE 4:", "<!-- PAGE 5:", about)
text = replace_between(text, "<!-- PAGE 5:", "<!-- PAGE 6:", booking)
text = replace_between(text, "<!-- Testimonials", "<!-- GLOBAL FAQS", testimonials)

text = text.replace("<title>Olympus Studio — Premium Creative Media House</title>", "<title>Olympus Studio — Film, Photography &amp; Visual Design</title>")
text = text.replace(
    '<meta name="description" content="Olympus Studio is a premium dark-themed media house and design agency delivering high-fidelity web, graphic branding, video production, and content storytelling.">',
    '<meta name="description" content="Olympus Studio creates films, photography, campaign graphics, editorial publications, motion design, and event coverage.">',
)

asset_replacements = {
    "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/357cb3d1-9f65-4810-884b-f0072a65193d_1600w.webp": "assets/media/prefooter-stage.webp",
    "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/2f999a94-8031-4c3e-b64e-836c1b4f5be0_320w.webp": "assets/portfolio/1gJbVwUYB-8oPStbqAwxZ6Ja4nZmvvIY5.webp",
    "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/d25a1767-0ea8-4aac-b981-6afd67dc79a6_800w.webp": "assets/portfolio/1qHAdquNAFo3xzKceDPG8qW0H8UdTwFh5.webp",
    "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/61cab6ed-0aeb-4671-824c-5b8a0cf236ca_320w.webp": "assets/team/john.webp",
    "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/08b00610-61b2-45b5-b8fc-e9305c15b460_320w.webp": "assets/team/photographer.webp",
    "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/4c9aa348-4474-47a8-8f1e-3fe52ac8d2b9_320w.webp": "assets/team/cinematographer-editor.webp",
}
for old, new in asset_replacements.items():
    text = text.replace(old, new)

text = text.replace('<form id="contact-form" class="space-y-6">', '<form id="contact-form" class="space-y-6">')
if 'id="contact-name"' not in text:
    text = text.replace('type="text" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600" placeholder="e.g. John Doe"', 'id="contact-name" type="text" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600" placeholder="e.g. John Doe"', 1)
if 'id="contact-email"' not in text:
    text = text.replace('type="email" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600" placeholder="e.g. john@example.com"', 'id="contact-email" type="email" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600" placeholder="e.g. john@example.com"', 1)
if 'id="contact-message"' not in text:
    text = text.replace('rows="5" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600" placeholder="Your questions, inquiries, or notes here..."', 'id="contact-message" rows="5" class="w-full glass-input px-4 py-3.5 rounded-xl text-sm placeholder-neutral-600" placeholder="Your questions, inquiries, or notes here..."', 1)
text = text.replace('Send Message\n            </button>', 'Continue on WhatsApp\n            </button>', 1)

text = text.replace('<div id="lightbox-modal" class=', '<div id="lightbox-modal" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" class=')
text = text.replace('<button id="lightbox-close-btn"', '<button id="lightbox-close-btn" aria-label="Close portfolio viewer"')
text = text.replace('<button id="lightbox-prev-btn"', '<button id="lightbox-prev-btn" aria-label="Previous portfolio item"')
text = text.replace('<button id="lightbox-next-btn"', '<button id="lightbox-next-btn" aria-label="Next portfolio item"')
text = text.replace('</h4>\n      </div>\n    </div>\n  </div>\n\n  <!-- SVG Filters', '</h4>\n        <a id="lightbox-original-link" href="#" target="_blank" rel="noopener noreferrer" class="hidden mt-4 text-xs font-bold text-amber-400 uppercase tracking-wider hover:text-amber-300">Open original in Drive ↗</a>\n      </div>\n    </div>\n  </div>\n\n  <!-- SVG Filters')
if '<script src="content.js"></script>' not in text:
    text = text.replace('  <script src="index.js"></script>', '  <script src="content.js"></script>\n  <script src="index.js"></script>')

HTML.write_text(text, encoding="utf-8")
print("restructured index.html")
