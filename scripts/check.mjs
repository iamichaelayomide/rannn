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
  "supabase/migrations/202607290001_accounting_documents.sql",
  "supabase/migrations/202607290003_repair_adjustment_draft_rpc.sql",
  "supabase/migrations/202607290005_preserve_crm_dashboard_interface.sql",
  "supabase/migrations/202607300001_unified_enquiry_engine.sql",
  "supabase/migrations/202607300002_dedupe_inquiry_deliveries.sql",
  "api/invoice-pdf.js",
  "api/billing-document.js",
  "api/inquiries.js",
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
const publicIndex = await readFile("index.js", "utf8");
const inquiryApi = await readFile("api/inquiries.js", "utf8");
const inquiryMigration = await readFile("supabase/migrations/202607300001_unified_enquiry_engine.sql", "utf8");
const inquiryDeliveryMigration = await readFile("supabase/migrations/202607300002_dedupe_inquiry_deliveries.sql", "utf8");

if (/window\.(prompt|alert|confirm)\s*\(/.test(`${dashboard}\n${portal}`)) {
  throw new Error("Native browser prompts are not allowed in the admin or client portal");
}
if (!publicIndex.includes("fetch('/api/inquiries'") || publicIndex.includes("/rest/v1/intake_submissions")) {
  throw new Error("Public enquiries must use the validated server endpoint rather than direct Supabase inserts");
}
for (const required of ["unified-enquiry-form", "enquiry-ticket-number", "enquiry-whatsapp-link"]) {
  if (!(await readFile("index.html", "utf8")).includes(required)) throw new Error(`Unified public enquiry flow is missing ${required}`);
}
if (contentApp.includes("initWhatsAppForms();")) {
  throw new Error("Legacy forms must not auto-open WhatsApp or submit independently");
}
for (const required of ["verifyTurnstile", "idempotency_key", "create_public_inquiry", "acknowledgementState"]) {
  if (!inquiryApi.includes(required)) throw new Error(`The enquiry API is missing ${required}`);
}
if (!inquiryApi.includes("resolution=ignore-duplicates") || !inquiryDeliveryMigration.includes("notification_deliveries_inquiry_recipient_key")) {
  throw new Error("Enquiry notification retries must not duplicate provider deliveries");
}
for (const required of ["inquiry_messages", "inquiry_events", "notifications", "notification_deliveries", "create_public_inquiry", "set_inquiry_status", "assign_inquiry", "get_inquiry_metrics"]) {
  if (!inquiryMigration.includes(required)) throw new Error(`The enquiry migration is missing ${required}`);
}
for (const required of ["subscribeToEnquiries", "renderNotifications", "data-inquiry-message", "mark_inquiry_notifications_read"]) {
  if (!dashboard.includes(required)) throw new Error(`The dashboard enquiry workspace is missing ${required}`);
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

for (const required of ["No project", "target_client_id", "target_new_client", "data-download-document"]) {
  if (!dashboard.includes(required)) throw new Error(`Missing standalone invoice behavior: ${required}`);
}
const invoiceMigration = await readFile("supabase/migrations/202607270008_atelier_standalone_invoices.sql", "utf8");
for (const required of ["alter column project_id drop not null", "client_id set not null", "target_new_client", "invoices_client_id_idx"]) {
  if (!invoiceMigration.includes(required)) throw new Error(`Standalone invoice migration is missing ${required}`);
}
const accountingMigration = await readFile("supabase/migrations/202607290001_accounting_documents.sql", "utf8");
for (const required of ["billing_settings", "invoice_payments", "invoice_adjustments", "record_invoice_payment", "get_invoice_balance", "document_snapshot"]) {
  if (!accountingMigration.includes(required)) throw new Error(`Accounting migration is missing ${required}`);
}
const billingPdf = await readFile("api/billing-document.js", "utf8");
for (const required of ["PDFDocument", "DejaVuSansCondensed-Bold", "RECEIPT", "DEBIT NOTE", "CREDIT NOTE", "roundedBorder"]) {
  if (!billingPdf.includes(required)) throw new Error(`Billing PDF is missing ${required}`);
}
for (const file of ["index.html", "admin.html", "portal.html", "dashboard.js", "portal.js", "content.js"]) {
  const source = await readFile(file, "utf8");
  if (/Olympus Studio|Premium Media House/i.test(source)) {
    throw new Error(`${file} still contains obsolete Olympus branding`);
  }
}

console.log("Static structure, interaction, preview, and secret-safety checks passed.");
