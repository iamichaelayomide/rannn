export default function handler(_request, response) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response.status(503).json({
      configured: false,
      message: "The workspace database has not been configured.",
    });
  }

  response.setHeader("Cache-Control", "no-store");
  return response.status(200).json({ configured: true, url, anonKey });
}
