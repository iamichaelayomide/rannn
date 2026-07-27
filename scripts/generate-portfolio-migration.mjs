import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);

const items = sandbox.window.OLYMPUS_CONTENT?.portfolioItems || [];
const sourceContent = sandbox.window.OLYMPUS_CONTENT;
if (items.length !== 206) {
  throw new Error(`Expected 206 portfolio items, found ${items.length}.`);
}

const sqlString = (value) => value == null
  ? "null"
  : `'${String(value).replaceAll("'", "''")}'`;

const slugify = (value, index) => {
  const base = String(value || "portfolio-item")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 58) || "portfolio-item";
  return `${base}-${String(index + 1).padStart(3, "0")}`;
};

const values = items.map((item, index) => `  (
    ${sqlString(item.id)},
    ${sqlString(slugify(item.title, index))},
    ${sqlString(item.title)},
    ${sqlString(item.description || null)},
    ${sqlString(item.category || "graphics")},
    ${sqlString(item.collection || null)},
    ${Number.parseInt(item.year, 10) || "null"},
    ${sqlString(item.mediaType || "image")},
    ${sqlString(item.thumbnailSrc)},
    ${sqlString(item.previewSrc || null)},
    ${sqlString(item.originalUrl || null)},
    ${sqlString(item.alt || "")},
    ${item.featured ? "true" : "false"},
    ${index},
    'published',
    timezone('utc', now())
  )`).join(",\n");

const serviceValues = sourceContent.services.map((service, index) => `  (
    ${sqlString(service.title)},
    ${sqlString(service.id)},
    ${sqlString(service.summary || null)},
    ${sqlString(service.summary || null)},
    ${index},
    'published',
    timezone('utc', now())
  )`).join(",\n");

const globalContent = {
  site: {
    brand_name: sourceContent.siteConfig.brandName,
    whatsapp: sourceContent.siteConfig.whatsappDisplay,
    whatsapp_number: sourceContent.siteConfig.whatsappNumber,
    email: sourceContent.siteConfig.email || "",
    location: sourceContent.siteConfig.location || "",
    footer_intro: "A creative atelier for film, photography, campaign graphics, editorial publications, motion design, event coverage, and website development.",
    instagram: sourceContent.siteConfig.socials?.instagram || "",
    tiktok: sourceContent.siteConfig.socials?.tiktok || "",
    x: sourceContent.siteConfig.socials?.x || "",
    linkedin: sourceContent.siteConfig.socials?.linkedin || "",
  },
  team: sourceContent.teamMembers || [],
  testimonials: sourceContent.socialProof?.testimonials || [],
  faqs: [],
  partners: [],
};
const globalJson = JSON.stringify(globalContent).replaceAll("$cms$", "$c_ms$");

const migration = `begin;

insert into public.portfolio_items (
  legacy_id, slug, title, description, category, collection, year,
  media_type, thumbnail_src, preview_src, original_url, alt_text,
  featured, position, status, published_at
)
values
${values}
on conflict (legacy_id) do update set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  collection = excluded.collection,
  year = excluded.year,
  media_type = excluded.media_type,
  thumbnail_src = excluded.thumbnail_src,
  preview_src = excluded.preview_src,
  original_url = excluded.original_url,
  alt_text = excluded.alt_text,
  featured = excluded.featured,
  position = excluded.position,
  status = 'published',
  published_at = coalesce(public.portfolio_items.published_at, excluded.published_at);

update public.portfolio_items portfolio_row
set published_snapshot = to_jsonb(portfolio_row)
      - 'published_snapshot' - 'created_at' - 'updated_at'
      - 'created_by' - 'updated_by' - 'published_at'
where legacy_id is not null;

insert into public.services (
  title, slug, summary, description, position, status, published_at
)
values
${serviceValues}
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  position = excluded.position,
  status = 'published',
  published_at = coalesce(public.services.published_at, excluded.published_at);

update public.services service_row
set published_snapshot = to_jsonb(service_row)
      - 'published_snapshot' - 'created_at' - 'updated_at' - 'published_at'
where service_row.slug in (${sourceContent.services.map((service) => sqlString(service.id)).join(", ")});

update public.pages
set content = $cms$${globalJson}$cms$::jsonb,
    published_snapshot = jsonb_build_object(
      'title', title,
      'slug', slug,
      'content', $cms$${globalJson}$cms$::jsonb,
      'seo_title', seo_title,
      'seo_description', seo_description
    ),
    status = 'published',
    published_at = coalesce(published_at, timezone('utc', now()))
where slug = 'global';

commit;
`;

fs.writeFileSync(
  new URL("../supabase/migrations/202607270002_seed_portfolio.sql", import.meta.url),
  migration,
);

console.log(`Generated portfolio migration with ${items.length} items.`);
