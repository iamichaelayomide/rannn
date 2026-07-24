import { readFile, access } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "admin.html",
  "portal.html",
  "dashboard.css",
  "dashboard.js",
  "portal.js",
  "supabase/migrations/202607240001_operations_platform.sql",
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

console.log("Static structure and secret-safety checks passed.");
