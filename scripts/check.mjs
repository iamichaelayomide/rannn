import { readFile, access } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "admin.html",
  "portal.html",
  "dashboard.css",
  "dashboard.js",
  "portal.js",
  "supabase/migrations/202607240001_operations_platform.sql",
  "supabase/migrations/202607270003_complete_admin_flows.sql",
  "supabase/migrations/202607270004_crm_navigation_cms_repair.sql",
  "supabase/migrations/202607270005_archived_project_read_only.sql",
  "supabase/migrations/202607270006_services_page_cms.sql",
  "supabase/migrations/202607270007_repair_published_page_snapshots.sql",
  "supabase/migrations/202607270008_atelier_standalone_invoices.sql",
  "supabase/migrations/202607270009_correct_atelier_eyebrow.sql",
  "api/invoice-pdf.js",
];

for (const file of requiredFiles) await access(file);

const htmlFiles = ["index.html", "admin.html", "portal.html"];
for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  if (!source.includes("<title>") || !source.includes("</html>")) {
    throw new Error(`${file} is missing required document structure`);
  }
}

const config = await readFile("api/config.js", "utf8");
if (config.includes("service_role")) {
  throw new Error("The public configuration endpoint must not expose a service role key");
}

const dashboard = await readFile("dashboard.js", "utf8");
const portal = await readFile("portal.js", "utf8");
const bootstrap = await readFile("site-bootstrap.js", "utf8");
const admin = await readFile("admin.html", "utf8");
const publicContentApi = await readFile("api/content.js", "utf8");
const contentApp = await readFile("content-app.js", "utf8");
const siteBootstrap = await readFile("site-bootstrap.js", "utf8");

if (/window\.(prompt|alert|confirm)\s*\(/.test(`${dashboard}\n${portal}`)) {
  throw new Error("Native browser prompts are not allowed in the admin or client portal");
}
if (/previewMarkup|\.srcdoc\s*=/.test(dashboard)) {
  throw new Error("CMS preview must use the real public website, not generated mock markup");
}
for (const route of ["clients/new", "projects/new", "invoices/new", "services/new", "portfolio/new", "media/new"]) {
  if (!dashboard.includes(route)) throw new Error(`Missing routed creation flow: ${route}`);
}
for (const message of ["olympus-preview-ready", "olympus-preview-content"]) {
  if (!dashboard.includes(message) || !bootstrap.includes(message)) {
    throw new Error(`The private preview bridge is incomplete: ${message}`);
  }
}
if (admin.includes('id="entity-dialog"') || admin.includes('id="project-dialog"')) {
  throw new Error("Operational creation and project details must not use modal dialogs");
}
if (/openDialog|entityConfigs|pageFields\(record\)/.test(dashboard)) {
  throw new Error("Forms must be built only for their routed record type");
}
if (dashboard.includes("Image URL") || dashboard.includes("Logo URL")) {
  throw new Error("Managed images must not be exposed as technical URL fields");
}
if (dashboard.includes("Internal identifier") || /field\([^)]*"slug"/.test(dashboard)) {
  throw new Error("CMS slugs must stay automatic and hidden from normal editors");
}
if (/s-maxage|stale-while-revalidate/.test(publicContentApi) || !publicContentApi.includes("Vercel-CDN-Cache-Control")) {
  throw new Error("Published CMS content must bypass stale browser and edge caches");
}
if (!dashboard.includes("verifyPublishedCollection")) {
  throw new Error("Site-wide publishing must verify the public payload before reporting success");
}
if (!dashboard.includes("verifyPublishedEntity")) {
  throw new Error("Page, Service, and Portfolio publishing must verify the public payload");
}
for (const required of ["managed-contact-details", "lightbox-description"]) {
  if (!admin.includes(required) && !(await readFile("index.html", "utf8")).includes(required)) {
    throw new Error(`The public template is missing managed content target: ${required}`);
  }
}
for (const required of ["service.description", "siteConfig.socials", "hydrateContactDetails", "hydrateMetadata"]) {
  if (!contentApp.includes(required)) throw new Error(`A CMS field is not connected to the public renderer: ${required}`);
}
if (contentApp.includes("service.image") || (await readFile("index.html", "utf8")).includes("Olympus service showcase")) {
  throw new Error("The public Services section must remain text-led without service imagery");
}
if (!siteBootstrap.includes("hasManagedServices") || !siteBootstrap.includes("hasManagedGlobal")) {
  throw new Error("Empty published CMS collections must not fall back to removed placeholder content");
}
const crmMigration = await readFile("supabase/migrations/202607270004_crm_navigation_cms_repair.sql", "utf8");
for (const required of ["get_crm_dashboard", "set_project_archived", "save_sitewide_collection", "mark_page_draft_change", "mark_service_draft_change", "mark_portfolio_draft_change"]) {
  if (!crmMigration.includes(required)) throw new Error(`CRM/CMS migration is missing ${required}`);
}
if (/create\s+or\s+replace\s+function\s+public\.mark_cms_draft_change/i.test(crmMigration)) {
  throw new Error("The cross-table CMS trigger must not be recreated");
}
for (const required of ["?tab=${value}", "data-archive-project", "data-publish-collection"]) {
  if (!dashboard.includes(required)) throw new Error(`Missing routed CRM/CMS interaction: ${required}`);
}

for (const required of ["No project", "target_client_id", "target_new_client", "data-download-invoice"]) {
  if (!dashboard.includes(required)) throw new Error(`Missing standalone invoice behavior: ${required}`);
}
const invoiceMigration = await readFile("supabase/migrations/202607270008_atelier_standalone_invoices.sql", "utf8");
for (const required of ["alter column project_id drop not null", "client_id set not null", "target_new_client", "invoices_client_id_idx"]) {
  if (!invoiceMigration.includes(required)) throw new Error(`Standalone invoice migration is missing ${required}`);
}
const invoicePdf = await readFile("api/invoice-pdf.js", "utf8");
for (const required of ["PDFDocument", "DejaVuSans", "Olympus-Atelier-Invoice"]) {
  if (!invoicePdf.includes(required)) throw new Error(`Invoice PDF is missing ${required}`);
}
for (const file of ["index.html", "admin.html", "portal.html", "dashboard.js", "portal.js", "content.js"]) {
  const source = await readFile(file, "utf8");
  if (/Olympus Studio|Premium Media House/i.test(source)) {
    throw new Error(`${file} still contains obsolete Olympus branding`);
  }
}

console.log("Static structure, interaction, preview, and secret-safety checks passed.");
