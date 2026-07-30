const SUPPORTED_CURRENCIES = ["USD", "NGN", "GBP"];
const SOURCE_URL = "https://api.frankfurter.dev/v2/rates?base=USD&quotes=NGN,GBP";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!upstream.ok) throw new Error(`Rate provider returned ${upstream.status}`);
    const rows = await upstream.json();
    const rates = { USD: 1 };
    let rateDate = null;
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!SUPPORTED_CURRENCIES.includes(row.quote)) continue;
      const rate = Number(row.rate);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      rates[row.quote] = rate;
      rateDate ||= row.date;
    }
    if (!rates.NGN || !rates.GBP || !rateDate) throw new Error("The rate provider response was incomplete");

    return response.status(200).json({
      base: "USD",
      currencies: SUPPORTED_CURRENCIES,
      rates,
      date: rateDate,
      source: "Frankfurter",
      sourceUrl: "https://frankfurter.dev/",
      reportingOnly: true,
    });
  } catch (error) {
    console.error("Exchange-rate refresh failed", error instanceof Error ? error.message : error);
    return response.status(503).json({
      error: "Live exchange rates are temporarily unavailable.",
      reportingOnly: true,
    });
  }
}
