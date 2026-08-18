import { writeFile } from "node:fs/promises";

async function syncFallback() {
  console.log("Fetching live published content from Supabase API...");
  const response = await fetch("https://theolympusatelier.com/api/content");
  if (!response.ok) {
    throw new Error(`Failed to fetch published content: ${response.status} ${response.statusText}`);
  }

  const supabaseData = await response.json();

  // Extract content
  const pages = supabaseData.pages || {};
  const globalContent = pages.global?.content || {};
  const services = (supabaseData.services || []).map((s) => ({
    id: s.slug || s.id,
    title: s.title,
    summary: s.summary || "",
    description: s.description || ""
  }));

  // Ensure Kojo/Akinola Okikiola position #2 ordering as requested by user
  let teamMembers = globalContent.team || [];
  
  // Format team array cleanly
  const akinolaIndex = teamMembers.findIndex((m) => (m.name || "").includes("Akinola"));
  if (akinolaIndex > -1) {
    const akinola = teamMembers.splice(akinolaIndex, 1)[0];
    akinola.name = "Akinola Okikiola (Kojo)";
    akinola.image = "assets/team/akinola-okikiola.jpeg";
    teamMembers.splice(1, 0, akinola); // Position #2
  }

  // Remove redundant empty/placeholder team entries
  teamMembers = teamMembers.filter((m) => (m.name && m.name !== "Kojo") || m.image);

  const portfolioItems = (supabaseData.portfolioItems || []).map((item) => ({
    id: item.legacy_id || item.id,
    title: item.title,
    description: item.description || null,
    category: item.category,
    collection: item.collection || null,
    mediaType: item.media_type || "image",
    thumbnailSrc: item.thumbnail_src,
    previewSrc: item.preview_src || null,
    originalUrl: item.original_url || null,
    alt: item.alt_text || item.title,
    year: String(item.year || new Date().getFullYear()),
    featured: Boolean(item.featured)
  }));

  const faqs = globalContent.faqs || [
    { question: "What services do you provide?", answer: "Olympus Atelier provides end-to-end creative direction, photography, cinematography, motion design, editorial publications, graphics & branding, and website development." },
    { question: "How do we start a project?", answer: "Reach out via our booking form or WhatsApp with your project scope, timeline, and goals. We respond with a tailored proposal and project schedule." }
  ];

  const partners = globalContent.partners || [];
  const socialProof = globalContent.testimonials || {
    stats: [
      { value: "1.2", suffix: "M+", label: "Media Views" },
      { value: "240", suffix: "+", label: "Projects Delivered" },
      { value: "99.8", suffix: "%", label: "Client Success" },
      { value: "15", suffix: "+", label: "Global Awards" }
    ],
    testimonials: [
      { quote: "Olympus Atelier brought exceptional visual rigor and polish to our campaign.", name: "Ayo", role: "Creative Director" }
    ]
  };

  const weddingPackages = [
    {
      name: "Silver",
      price: "₦250,000",
      features: [
        "Full-day wedding videography coverage",
        "One videographer",
        "Highlight and full video"
      ]
    },
    {
      name: "Gold",
      price: "₦400,000",
      features: [
        "Full-day wedding videography coverage",
        "Two videographers",
        "Highlight and full video",
        "Online drive for viewing and sharing",
        "Regular flash drive"
      ]
    },
    {
      name: "Platinum",
      price: "₦800,000",
      features: [
        "Full-day wedding videography coverage",
        "Two videographers",
        "Highlight and full video",
        "Online drive for viewing and sharing",
        "Portrait reel and landscape highlight",
        "Customized flash drive"
      ]
    }
  ];

  const contentObject = {
    siteConfig: {
      brandName: globalContent.site?.brand_name || "Olympus Atelier",
      whatsappNumber: globalContent.site?.whatsapp_number || "2348087172313",
      whatsappDisplay: globalContent.site?.whatsapp || "+234 808 717 2313",
      callNumber: "2347026456357",
      callDisplay: "07026456357",
      email: globalContent.site?.email || "hello@theolympusatelier.com",
      location: globalContent.site?.address || "Lagos · London",
      socials: globalContent.site?.socials || {
        instagram: "https://instagram.com/theolympusatelier",
        tiktok: null,
        x: null,
        linkedin: null
      }
    },
    pages,
    services,
    weddingPackages,
    teamMembers,
    faqs,
    partners,
    socialProof: Array.isArray(globalContent.testimonials)
      ? { stats: socialProof.stats || [], testimonials: globalContent.testimonials }
      : socialProof,
    portfolioItems
  };

  const jsContent = `window.OLYMPUS_CONTENT = ${JSON.stringify(contentObject, null, 2)};\n`;

  await writeFile("content.js", jsContent, "utf8");
  console.log(`Successfully synced Supabase content to content.js! (${portfolioItems.length} portfolio items, ${services.length} services, ${teamMembers.length} team members)`);
}

syncFallback().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
