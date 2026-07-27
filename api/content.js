export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response.status(503).json({ error: "Content service is unavailable" });
  }

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

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Public content request failed", upstream.status, detail.slice(0, 300));
      return response.status(502).json({ error: "Published content could not be loaded" });
    }

    const content = await upstream.json();
    response.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    return response.status(200).json(content);
  } catch (error) {
    console.error("Public content service error", error instanceof Error ? error.message : error);
    return response.status(502).json({ error: "Published content could not be loaded" });
  }
}
