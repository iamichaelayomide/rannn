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

console.log("Static structure, interaction, preview, and secret-safety checks passed.");
