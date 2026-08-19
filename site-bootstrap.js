const fallback = window.OLYMPUS_CONTENT;

const toPortfolioItem = (item) => ({
  id: item.legacy_id || item.id,
  title: item.title,
  description: item.description || "",
  category: item.category,
  collection: item.collection || "",
  mediaType: item.mediaType || item.media_type || "image",
  thumbnailSrc: item.thumbnailSrc || item.thumbnail_src || "assets/portfolio-fallback.svg",
  previewSrc: item.previewSrc || item.preview_src || null,
  originalUrl: item.originalUrl || item.original_url || null,
  alt: item.alt || item.alt_text || item.title,
  year: String(item.year || ""),
  featured: Boolean(item.featured),
});

const mergePublishedContent = (published) => {
  const pages = published?.pages || {};
  const globalContent = pages.global?.content || {};
  const managedServices = Array.isArray(published?.services) ? published.services : [];
  const managedPortfolio = Array.isArray(published?.portfolioItems) ? published.portfolioItems : [];
  const hasManagedServices = Array.isArray(published?.services);
  const hasManagedPortfolio = Array.isArray(published?.portfolioItems);
  const hasManagedGlobal = Boolean(pages.global?.content);
  const managedTeam = hasManagedGlobal && Array.isArray(globalContent.team)
    ? globalContent.team
    : fallback.teamMembers;
  const teamMembers = managedTeam.filter((member) => {
    const name = (member.name || "").toLowerCase();
    return !name.includes("kojo") && !name.includes("akinola") && !name.includes("coming soon");
  }).map((member) => {
    if (!/^john\b/i.test(member.name || "")) return member;
    return {
      ...member,
      qualification: /r\.MRTB/i.test(member.qualification || "")
        ? member.qualification
        : [member.qualification, "r.MRTB"].filter(Boolean).join(" · "),
    };
  });

  const servicesList = hasManagedServices
    ? managedServices.map((service, index) => ({
        id: service.slug || service.id,
        title: service.title,
        summary: service.summary || service.description || "",
        description: service.description || "",
        deliverables: service.deliverables || fallback.services.find((s) => s.id === (service.slug || service.id))?.deliverables || fallback.services[index]?.deliverables || [],
      }))
    : [...fallback.services];

  fallback.services.forEach((fs) => {
    if (!servicesList.some((s) => s.id === fs.id)) {
      servicesList.push(fs);
    }
  });

  const portfolioList = hasManagedPortfolio
    ? managedPortfolio.map(toPortfolioItem)
    : [...fallback.portfolioItems];

  fallback.portfolioItems.forEach((fp) => {
    if (!portfolioList.some((p) => p.id === fp.id)) {
      portfolioList.push(fp);
    }
  });

  return {
    ...fallback,
    pages,
    siteConfig: {
      ...fallback.siteConfig,
      brandName: globalContent.site?.brand_name ?? fallback.siteConfig.brandName,
      whatsappNumber: globalContent.site?.whatsapp_number ?? fallback.siteConfig.whatsappNumber,
      whatsappDisplay: globalContent.site?.whatsapp ?? fallback.siteConfig.whatsappDisplay,
      email: globalContent.site?.email ?? fallback.siteConfig.email,
      location: globalContent.site?.location ?? fallback.siteConfig.location,
      socials: {
        instagram: globalContent.site?.instagram ?? fallback.siteConfig.socials?.instagram,
        tiktok: globalContent.site?.tiktok ?? fallback.siteConfig.socials?.tiktok,
        x: globalContent.site?.x ?? fallback.siteConfig.socials?.x,
        linkedin: globalContent.site?.linkedin ?? fallback.siteConfig.socials?.linkedin,
      },
    },
    services: servicesList,
    portfolioItems: portfolioList,
    teamMembers,
    socialProof: {
      ...fallback.socialProof,
      testimonials: hasManagedGlobal && Array.isArray(globalContent.testimonials)
        ? globalContent.testimonials
        : fallback.socialProof.testimonials,
    },
    faqs: globalContent.faqs || [],
    partners: globalContent.partners || [],
  };
};

const isPrivatePreview = new URLSearchParams(window.location.search).get("cmsPreview") === "1"
  && window.parent !== window;

if (isPrivatePreview) {
  const previewPayload = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10000);
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== "olympus-preview-content") return;
      clearTimeout(timeout);
      resolve(event.data.payload);
    }, { once: false });
    window.parent.postMessage({ type: "olympus-preview-ready" }, window.location.origin);
  });
  window.OLYMPUS_CONTENT = previewPayload ? mergePublishedContent(previewPayload) : fallback;
  window.OLYMPUS_CONTENT_SOURCE = previewPayload ? "private-preview" : "fallback";
  document.documentElement.dataset.cmsPreview = "true";
} else {
  try {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) throw new Error("Managed content is unavailable");
    window.OLYMPUS_CONTENT = mergePublishedContent(await response.json());
    window.OLYMPUS_CONTENT_SOURCE = "supabase";
  } catch {
    window.OLYMPUS_CONTENT = fallback;
    window.OLYMPUS_CONTENT_SOURCE = "fallback";
  }
}

await import("./index.js");
await import("./content-app.js");
window.initOlympusContentApp?.();
