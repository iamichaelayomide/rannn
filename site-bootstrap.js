const fallback = window.OLYMPUS_CONTENT;

const toPortfolioItem = (item) => ({
  id: item.legacy_id || item.id,
  title: item.title,
  description: item.description || "",
  category: item.category,
  collection: item.collection || "",
  mediaType: item.media_type,
  thumbnailSrc: item.thumbnail_src,
  previewSrc: item.preview_src || null,
  originalUrl: item.original_url || null,
  alt: item.alt_text || item.title,
  year: String(item.year || ""),
  featured: Boolean(item.featured),
});

const mergePublishedContent = (published) => {
  const pages = published?.pages || {};
  const globalContent = pages.global?.content || {};
  const managedServices = Array.isArray(published?.services) ? published.services : [];
  const managedPortfolio = Array.isArray(published?.portfolioItems) ? published.portfolioItems : [];

  return {
    ...fallback,
    pages,
    siteConfig: {
      ...fallback.siteConfig,
      brandName: globalContent.site?.brand_name || fallback.siteConfig.brandName,
      whatsappNumber: globalContent.site?.whatsapp_number || fallback.siteConfig.whatsappNumber,
      whatsappDisplay: globalContent.site?.whatsapp || fallback.siteConfig.whatsappDisplay,
      email: globalContent.site?.email || fallback.siteConfig.email,
      location: globalContent.site?.location || fallback.siteConfig.location,
      socials: {
        instagram: globalContent.site?.instagram || fallback.siteConfig.socials?.instagram,
        tiktok: globalContent.site?.tiktok || fallback.siteConfig.socials?.tiktok,
        x: globalContent.site?.x || fallback.siteConfig.socials?.x,
        linkedin: globalContent.site?.linkedin || fallback.siteConfig.socials?.linkedin,
      },
    },
    services: managedServices.length
      ? managedServices.map((service) => ({
          id: service.slug || service.id,
          title: service.title,
          summary: service.summary || service.description || "",
          description: service.description || "",
          image: service.image_url || null,
        }))
      : fallback.services,
    portfolioItems: managedPortfolio.length
      ? managedPortfolio.map(toPortfolioItem)
      : fallback.portfolioItems,
    teamMembers: globalContent.team?.length ? globalContent.team : fallback.teamMembers,
    socialProof: {
      ...fallback.socialProof,
      testimonials: globalContent.testimonials?.length
        ? globalContent.testimonials
        : fallback.socialProof.testimonials,
    },
    faqs: globalContent.faqs || [],
    partners: globalContent.partners || [],
  };
};

try {
  const response = await fetch("/api/content", { cache: "no-store" });
  if (!response.ok) throw new Error("Managed content is unavailable");
  window.OLYMPUS_CONTENT = mergePublishedContent(await response.json());
  window.OLYMPUS_CONTENT_SOURCE = "supabase";
} catch {
  window.OLYMPUS_CONTENT = fallback;
  window.OLYMPUS_CONTENT_SOURCE = "fallback";
}

await import("./index.js");
await import("./content-app.js");
