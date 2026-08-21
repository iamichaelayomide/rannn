import fs from "node:fs";
import path from "node:path";

function getFallbackContent() {
  try {
    const filePath = path.join(process.cwd(), "content.js");
    const code = fs.readFileSync(filePath, "utf8");
    const sandbox = {};
    new Function("window", code)(sandbox);
    return sandbox.OLYMPUS_CONTENT;
  } catch (err) {
    console.error("Failed to read content.js", err);
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const fallback = getFallbackContent();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  let upstreamPortfolio = null;
  if (url && key) {
    try {
      const upstream = await fetch(`${url}/rest/v1/rpc/get_public_site_content`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      if (upstream.ok) {
        const upstreamData = await upstream.json();
        if (Array.isArray(upstreamData?.portfolioItems) && upstreamData.portfolioItems.length > 0) {
          upstreamPortfolio = upstreamData.portfolioItems;
        }
      }
    } catch (error) {
      console.error("Public content service error", error instanceof Error ? error.message : error);
    }
  }

  if (!fallback) {
    return response.status(502).json({ error: "Published content could not be loaded" });
  }

  const fallbackPortfolio = fallback?.portfolioItems || [];
  const upstreamPortfolioList = Array.isArray(upstreamPortfolio) ? upstreamPortfolio : [];

  const mergedPortfolio = [...fallbackPortfolio];
  upstreamPortfolioList.forEach((up) => {
    const id = up.legacy_id || up.id;
    if (!mergedPortfolio.some((fp) => fp.id === id || fp.id === up.slug)) {
      mergedPortfolio.push(up);
    }
  });

  // Fallback content.js is the authoritative master for pages copy, services hierarchy, and curated portfolio
  const payload = {
    ...fallback,
    portfolioItems: mergedPortfolio,
  };

  response.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");
  return response.status(200).json(payload);
}
