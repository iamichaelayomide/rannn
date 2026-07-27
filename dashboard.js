import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const state = {
  supabase: null,
  session: null,
  profile: null,
  data: {
    projects: [], clients: [], invoices: [], intake: [], milestones: [],
    pages: [], services: [], media: [], portfolio: [], profiles: [], revisions: [],
  },
  view: "overview",
  collectionTab: "team",
  portfolioVisible: 24,
  loading: true,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[character]);
const titleCase = (value = "") => String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
  : "Not set";
const money = (value, currency = "NGN") => new Intl.NumberFormat("en-NG", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Number(value || 0));
const badge = (status) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(titleCase(status))}</span>`;
const demoBadge = (record) => record?.is_demo ? '<span class="demo-badge">Demo</span>' : "";
const icon = (name) => `<iconify-icon icon="${name}"></iconify-icon>`;
const emptyState = (title, body, action = "") => `<div class="empty">${icon("solar:inbox-line-linear")}<strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p>${action}</div>`;
const errorState = (message) => `<div class="empty error-state">${icon("solar:danger-triangle-linear")}<strong>Something went wrong</strong><p>${escapeHtml(message)}</p><button class="button secondary" data-action="retry">Retry</button></div>`;

const pageSchemas = {
  home: [
    ["Hero eyebrow", "hero.eyebrow"],
    ["Hero title — first line", "hero.title_line_one"],
    ["Hero title — second line", "hero.title_line_two"],
    ["Hero description", "hero.body", "textarea"],
    ["Hero background image URL", "hero.background_image", "url"],
    ["Vision statement", "vision.body", "textarea"],
    ["Manifesto statement", "manifesto.body", "textarea"],
  ],
  about: [
    ["Eyebrow", "header.eyebrow"],
    ["Page title", "header.title"],
    ["Introduction", "header.body", "textarea"],
    ["Feature image URL", "header.image", "url"],
  ],
  contact: [
    ["Eyebrow", "header.eyebrow"],
    ["Page title", "header.title"],
    ["Introduction", "header.body", "textarea"],
    ["Public email", "contact.email", "email"],
    ["Phone number", "contact.phone"],
    ["Studio location", "contact.location"],
  ],
  book: [
    ["Eyebrow", "header.eyebrow"],
    ["Page title", "header.title"],
    ["Introduction", "header.body", "textarea"],
  ],
  portfolio: [
    ["Eyebrow", "header.eyebrow"],
    ["Page title", "header.title"],
    ["Introduction", "header.body", "textarea"],
  ],
  global: [
    ["Brand name", "site.brand_name"],
    ["WhatsApp display number", "site.whatsapp"],
    ["WhatsApp international number", "site.whatsapp_number"],
    ["Public email", "site.email", "email"],
    ["Location", "site.location"],
    ["Footer introduction", "site.footer_intro", "textarea"],
    ["Instagram URL", "site.instagram", "url"],
    ["TikTok URL", "site.tiktok", "url"],
    ["X URL", "site.x", "url"],
    ["LinkedIn URL", "site.linkedin", "url"],
  ],
};

const collectionSchemas = {
  team: [
    ["Name", "name"], ["Role", "role"], ["Biography", "bio", "textarea"], ["Image URL", "image", "url"],
  ],
  testimonials: [
    ["Client name", "name"], ["Role / company", "role"], ["Testimonial", "quote", "textarea"],
  ],
  faqs: [
    ["Question", "question"], ["Answer", "answer", "textarea"],
  ],
  partners: [
    ["Partner name", "name"], ["Website URL", "url", "url"], ["Logo URL", "logo", "url"],
  ],
};

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  let target = object;
  keys.slice(0, -1).forEach((key) => {
    target[key] ||= {};
    target = target[key];
  });
  target[keys.at(-1)] = value;
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type === "error" ? "error" : ""}`;
  node.innerHTML = `${icon(type === "error" ? "solar:danger-circle-linear" : "solar:check-circle-linear")}<span>${escapeHtml(message)}</span>`;
  $("#toast-region").append(node);
  setTimeout(() => node.remove(), 4300);
}

async function getConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  const config = await response.json().catch(() => ({}));
  if (!response.ok || !config.configured) throw new Error(config.message || "Database configuration is unavailable.");
  return config;
}

async function bootstrap() {
  try {
    const config = await getConfig();
    state.supabase = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data: { session } } = await state.supabase.auth.getSession();
    state.session = session;
    state.supabase.auth.onAuthStateChange((_event, nextSession) => {
      state.session = nextSession;
      if (!nextSession) showLogin();
    });
    if (session) await enterWorkspace();
    else showLogin();
  } catch (error) {
    $("#setup-banner").textContent = `${error.message} Add the Supabase environment variables to activate the workspace.`;
    $("#setup-banner").classList.remove("hidden");
    showLogin();
    $("#login-form button").disabled = true;
  }
}

function showLogin() {
  $("#auth-shell").classList.remove("hidden");
  $("#app").classList.add("hidden");
}

async function enterWorkspace() {
  const { data: profile, error } = await state.supabase
    .from("profiles").select("*").eq("id", state.session.user.id).single();
  if (error) {
    $("#login-message").textContent = "Your account exists but has not been provisioned for this workspace.";
    await state.supabase.auth.signOut();
    return;
  }
  if (profile.role === "client") {
    window.location.assign("/portal");
    return;
  }
  state.profile = profile;
  $("#user-name").textContent = profile.full_name || state.session.user.email;
  $("#user-role").textContent = titleCase(profile.role);
  $("#user-avatar").textContent = (profile.full_name || state.session.user.email || "O").slice(0, 1).toUpperCase();
  $("#auth-shell").classList.add("hidden");
  $("#app").classList.remove("hidden");
  applyRoleVisibility();
  restoreSidebar();
  await refreshData();
  if (profile.must_change_password) {
    $("#password-dialog").showModal();
  }
}

function applyRoleVisibility() {
  const role = state.profile.role;
  const canFinance = ["owner", "finance"].includes(role);
  const canContent = ["owner", "content_manager"].includes(role);
  const canManageProjects = ["owner", "project_manager"].includes(role);
  $$('[data-view="invoices"], [data-view-panel="invoices"]').forEach((element) => element.classList.toggle("hidden", !canFinance));
  $$('[data-view="pages"], [data-view="portfolio"], [data-view="services"], [data-view="media"], [data-view-panel="pages"], [data-view-panel="portfolio"], [data-view-panel="services"], [data-view-panel="media"]')
    .forEach((element) => element.classList.toggle("hidden", !canContent));
  $$('[data-view="team"], [data-view-panel="team"]').forEach((element) => element.classList.toggle("hidden", role !== "owner"));
  document.body.dataset.canManageProjects = String(canManageProjects);
}

async function refreshData() {
  state.loading = true;
  const queries = [
    state.supabase.from("projects").select("*, clients(id,name,email,company), milestones(id,title,description,status,due_date,position,requires_approval,deliverables(id,title,description,file_url,version,status,client_note))").order("created_at", { ascending: false }),
    state.supabase.from("clients").select("*, projects(id)").order("created_at", { ascending: false }),
    state.supabase.from("invoices").select("*, projects(id,title,clients(name))").order("created_at", { ascending: false }),
    state.supabase.from("intake_submissions").select("*").order("created_at", { ascending: false }),
    state.supabase.from("milestones").select("*, projects(id,title,clients(name))").order("due_date", { ascending: true }),
    state.supabase.from("pages").select("*").order("slug"),
    state.supabase.from("services").select("*").order("position"),
    state.supabase.from("media_assets").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    state.supabase.from("portfolio_items").select("*").order("position"),
    state.supabase.from("profiles").select("*").order("created_at"),
    state.supabase.from("content_revisions").select("*").order("published_at", { ascending: false }).limit(100),
  ];
  const keys = ["projects", "clients", "invoices", "intake", "milestones", "pages", "services", "media", "portfolio", "profiles", "revisions"];
  const results = await Promise.all(queries);
  const errors = [];
  results.forEach((result, index) => {
    if (result.error) errors.push(result.error.message);
    else state.data[keys[index]] = result.data || [];
  });
  state.loading = false;
  renderAll();
  if (errors.length) toast(`Some workspace data could not load: ${errors[0]}`, "error");
}

function renderAll() {
  $("#current-date").textContent = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("#welcome-title").textContent = `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${(state.profile.full_name || "team").split(" ")[0]}.`;
  $("#inbox-count").textContent = state.data.intake.filter((item) => item.status === "new").length;
  renderOverview();
  renderInbox();
  renderProjects();
  renderClients();
  renderInvoices();
  renderPages();
  renderPortfolio();
  renderServices();
  renderMedia();
  renderTeam();
  renderTopAction();
}

function renderOverview() {
  const active = state.data.projects.filter((project) => project.status === "active").length;
  const awaiting = state.data.milestones.filter((milestone) => milestone.status === "awaiting_approval").length;
  const openInvoices = state.data.invoices.filter((invoice) => invoice.status === "open");
  const enquiries = state.data.intake.filter((item) => item.status === "new").length;
  $("#metrics").innerHTML = [
    ["Active projects", active, `${state.data.projects.length} total projects`],
    ["Awaiting approval", awaiting, awaiting ? "Client action required" : "Nothing waiting"],
    ["Outstanding invoices", money(openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)), `${openInvoices.length} open`],
    ["New enquiries", enquiries, enquiries ? "Review the inbox" : "Inbox is clear"],
  ].map(([label, value, note]) => `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");

  const attention = [
    ...state.data.intake.filter((item) => item.status === "new").slice(0, 3).map((item) => ({ title: `New enquiry from ${item.name}`, detail: item.title || item.service || "Project request", status: "new" })),
    ...state.data.milestones.filter((item) => item.status === "awaiting_approval").slice(0, 3).map((item) => ({ title: item.title, detail: item.projects?.title || "Milestone", status: item.status })),
    ...openInvoices.filter((item) => item.due_date && new Date(item.due_date) < new Date()).slice(0, 3).map((item) => ({ title: `${item.invoice_number} is overdue`, detail: item.projects?.title || "Invoice", status: "open" })),
  ];
  $("#attention-list").innerHTML = attention.length
    ? attention.map((item) => `<div class="item-row"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>${badge(item.status)}</div>`).join("")
    : emptyState("Nothing needs attention", "New enquiries, overdue invoices, and approval requests will appear here.");

  const upcoming = state.data.milestones.filter((milestone) => milestone.due_date && !["approved", "completed"].includes(milestone.status)).slice(0, 5);
  $("#milestone-list").innerHTML = upcoming.length
    ? upcoming.map((milestone) => `<div class="item-row"><div><strong>${escapeHtml(milestone.title)}</strong><small>${escapeHtml(milestone.projects?.title || "")} · ${formatDate(milestone.due_date)}</small></div>${badge(milestone.status)}</div>`).join("")
    : emptyState("No upcoming milestones", "Add milestones to an active project to build the delivery schedule.");

  $("#recent-projects").innerHTML = state.data.projects.length
    ? state.data.projects.slice(0, 5).map((project) => `<div class="item-row"><div><strong>${escapeHtml(project.title)}${demoBadge(project)}</strong><small>${escapeHtml(project.clients?.name || "No client")} · ${escapeHtml(project.service || "General")}</small></div>${badge(project.status)}</div>`).join("")
    : emptyState("No projects yet", "Create the first project to start tracking milestones, files, and billing.", '<button class="button primary" data-action="new-project">New project</button>');
}

function renderInbox() {
  const term = $("#inbox-search").value.trim().toLowerCase();
  const status = $("#inbox-filter").value;
  const items = state.data.intake.filter((item) =>
    (!status || item.status === status)
    && [item.name, item.email, item.title, item.service].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#inbox-table").innerHTML = items.length ? items.map((item) => `
    <tr><td><strong>${escapeHtml(item.name)}${demoBadge(item)}</strong><small>${escapeHtml(item.email)}</small></td>
    <td>${escapeHtml(item.title || item.service || "General enquiry")}</td><td>${formatDate(item.created_at)}</td><td>${badge(item.status)}</td>
    <td><button class="text-button" data-review-intake="${item.id}">${item.status === "new" ? "Start review" : item.status === "reviewing" ? "Convert to project" : "Open"}</button></td></tr>
  `).join("") : `<tr><td colspan="5">${emptyState("No enquiries match", "New website enquiries will appear here automatically.")}</td></tr>`;
}

function projectProgress(project) {
  const milestones = project.milestones || [];
  if (!milestones.length) return 0;
  return Math.round((milestones.filter((item) => ["approved", "completed"].includes(item.status)).length / milestones.length) * 100);
}

function renderProjects() {
  const term = $("#project-search").value.trim().toLowerCase();
  const status = $("#project-filter").value;
  const projects = state.data.projects.filter((project) =>
    (!status || project.status === status)
    && [project.title, project.clients?.name, project.service].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#project-grid").innerHTML = projects.length ? projects.map((project) => {
    const progress = projectProgress(project);
    return `<article class="project-card">${badge(project.status)}${demoBadge(project)}<h3>${escapeHtml(project.title)}</h3><p class="muted">${escapeHtml(project.clients?.name || "No client")} · ${escapeHtml(project.service || "General project")}</p><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%"></span></div><div class="meta"><span>${progress}% complete</span><span>Due ${formatDate(project.due_date)}</span></div><button class="button secondary wide-button" data-open-project="${project.id}">Open project</button></article>`;
  }).join("") : emptyState("No projects match", "Adjust the filters or create a new client project.", '<button class="button primary" data-action="new-project">New project</button>');
}

function renderClients() {
  const term = $("#client-search").value.trim().toLowerCase();
  const clients = state.data.clients.filter((client) => [client.name, client.email, client.company].some((value) => String(value || "").toLowerCase().includes(term)));
  $("#client-table").innerHTML = clients.length ? clients.map((client) => `
    <tr><td><strong>${escapeHtml(client.name)}${demoBadge(client)}</strong><small>${escapeHtml(client.notes || "")}</small></td><td>${escapeHtml(client.email || "—")}<small>${escapeHtml(client.phone || "")}</small></td><td>${escapeHtml(client.company || "—")}</td><td>${client.projects?.length || 0}</td></tr>
  `).join("") : `<tr><td colspan="4">${emptyState("No clients match", "Clients created from enquiries or projects will appear here.")}</td></tr>`;
}

function invoiceActions(invoice) {
  if (invoice.status === "draft") return `<button class="text-button" data-invoice-status="${invoice.id}" data-next-status="open">Finalize</button>`;
  if (invoice.status === "open") return `<button class="text-button" data-invoice-status="${invoice.id}" data-next-status="paid">Mark paid</button>`;
  return "";
}

function renderInvoices() {
  const term = $("#invoice-search").value.trim().toLowerCase();
  const status = $("#invoice-filter").value;
  const invoices = state.data.invoices.filter((invoice) =>
    (!status || invoice.status === status)
    && [invoice.invoice_number, invoice.projects?.title, invoice.projects?.clients?.name].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#invoice-table").innerHTML = invoices.length ? invoices.map((invoice) => `
    <tr><td><strong>${escapeHtml(invoice.invoice_number)}${demoBadge(invoice)}</strong><small>${escapeHtml(invoice.projects?.clients?.name || "")}</small></td><td>${escapeHtml(invoice.projects?.title || "—")}</td><td>${formatDate(invoice.due_date)}</td><td>${money(invoice.total, invoice.currency)}</td><td>${badge(invoice.status)}</td><td>${invoiceActions(invoice)}</td></tr>
  `).join("") : `<tr><td colspan="6">${emptyState("No invoices match", "Draft and issued invoices will appear here.")}</td></tr>`;
}

function revisionLabel(type, id) {
  const revisions = state.data.revisions.filter((revision) => revision.entity_type === type && revision.entity_id === id);
  return revisions.length ? `Revision ${revisions[0].revision_number} · ${formatDate(revisions[0].published_at)}` : "Not published from this CMS yet";
}

function renderPages() {
  $("#cms-status").textContent = `${state.data.pages.filter((page) => page.status === "published").length} published pages · drafts remain private until published`;
  $("#page-grid").innerHTML = state.data.pages.length ? state.data.pages.map((page) => `
    <article class="cms-card">${badge(page.status)}<h3>${escapeHtml(page.title)}</h3><p class="muted">/${escapeHtml(page.slug)}</p><div class="meta"><span>${escapeHtml(revisionLabel("page", page.id))}</span><span>Updated ${formatDate(page.updated_at)}</span></div><div class="cms-card-actions"><button class="text-button" data-edit-page="${page.id}">Edit</button><button class="text-button" data-preview-page="${page.id}">Preview</button><button class="text-button" data-publish-type="page" data-publish-id="${page.id}">Publish</button></div>
    </article>
  `).join("") : emptyState("No page templates", "Page templates will appear after the CMS migration is applied.");
  renderCollections();
}

function globalPage() {
  return state.data.pages.find((page) => page.slug === "global");
}

function renderCollections() {
  $$(".collection-tabs .tab").forEach((button) => button.classList.toggle("active", button.dataset.collectionTab === state.collectionTab));
  const page = globalPage();
  const items = page?.content?.[state.collectionTab] || [];
  const singular = { team: "team member", testimonials: "testimonial", faqs: "FAQ", partners: "partner" }[state.collectionTab];
  $("#collection-list").innerHTML = `
    <div class="section-tools"><button class="button secondary" data-add-collection="${state.collectionTab}">${icon("solar:add-circle-linear")}Add ${singular}</button></div>
    ${items.length ? items.map((item, index) => `
      <div class="collection-item"><div class="collection-thumb">${item.image || item.logo ? `<img src="${escapeHtml(item.image || item.logo)}" alt="">` : icon("solar:document-text-linear")}</div><div class="collection-copy"><strong>${escapeHtml(item.name || item.question || `Untitled ${singular}`)}</strong><small>${escapeHtml(item.role || item.quote || item.answer || item.url || "")}</small></div><div><button class="text-button" data-edit-collection="${state.collectionTab}" data-collection-index="${index}">Edit</button><button class="text-button danger" data-remove-collection="${state.collectionTab}" data-collection-index="${index}">Remove</button></div></div>
    `).join("") : emptyState(`No ${state.collectionTab} yet`, `Add the first ${singular}; it will remain private until Global content is published.`)}
  `;
}

function renderPortfolio() {
  const term = $("#portfolio-search").value.trim().toLowerCase();
  const category = $("#portfolio-filter").value;
  const status = $("#portfolio-status").value;
  const items = state.data.portfolio.filter((item) =>
    (!category || item.category === category)
    && (!status || item.status === status)
    && [item.title, item.collection, item.category].some((value) => String(value || "").toLowerCase().includes(term))
  );
  const visibleItems = items.slice(0, state.portfolioVisible);
  $("#portfolio-summary").textContent = `${visibleItems.length} shown · ${items.length} matching · ${state.data.portfolio.filter((item) => item.status === "published").length} published`;
  $("#portfolio-load-more").classList.toggle("hidden", visibleItems.length >= items.length);
  $("#portfolio-grid").innerHTML = items.length ? visibleItems.map((item) => `
    <article class="portfolio-admin-card"><div class="portfolio-admin-media"><img src="${escapeHtml(item.thumbnail_src)}" alt="${escapeHtml(item.alt_text || item.title)}" loading="lazy" onerror="this.src='/assets/portfolio-fallback.svg'">${badge(item.status)}</div><div class="portfolio-admin-body"><p class="eyebrow">${escapeHtml(item.category)} · ${escapeHtml(item.year || "")}</p><h3 title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3><p class="muted">${escapeHtml(item.collection || "No collection")}</p><div class="portfolio-admin-actions"><button class="text-button" data-edit-portfolio="${item.id}">Edit</button><button class="text-button" data-duplicate-portfolio="${item.id}">Duplicate</button><button class="text-button" data-publish-type="portfolio" data-publish-id="${item.id}">Publish</button><button class="icon-button" data-move-type="portfolio" data-move-id="${item.id}" data-direction="-1" title="Move earlier">${icon("solar:arrow-up-linear")}</button><button class="icon-button" data-move-type="portfolio" data-move-id="${item.id}" data-direction="1" title="Move later">${icon("solar:arrow-down-linear")}</button><button class="icon-button" data-archive-type="portfolio" data-archive-id="${item.id}" title="Archive">${icon("solar:archive-linear")}</button></div></div></article>
  `).join("") : emptyState("No portfolio items match", "Adjust the filters or add a new portfolio item.", '<button class="button primary" data-action="new-portfolio">Add portfolio item</button>');
}

function renderServices() {
  $("#service-status").textContent = `${state.data.services.length} services · ${state.data.services.filter((service) => service.status === "published").length} published`;
  $("#service-grid").innerHTML = state.data.services.length ? state.data.services.map((service) => `
    <article class="cms-card">${badge(service.status)}<h3>${escapeHtml(service.title)}</h3><p class="muted">${escapeHtml(service.summary || "No summary")}</p><div class="meta"><span>${escapeHtml(revisionLabel("service", service.id))}</span><span>Position ${service.position + 1}</span></div><div class="cms-card-actions"><button class="text-button" data-edit-service="${service.id}">Edit</button><button class="text-button" data-duplicate-service="${service.id}">Duplicate</button><button class="text-button" data-publish-type="service" data-publish-id="${service.id}">Publish</button><button class="icon-button" data-move-type="service" data-move-id="${service.id}" data-direction="-1" title="Move earlier">${icon("solar:arrow-up-linear")}</button><button class="icon-button" data-move-type="service" data-move-id="${service.id}" data-direction="1" title="Move later">${icon("solar:arrow-down-linear")}</button><button class="icon-button" data-archive-type="service" data-archive-id="${service.id}" title="Archive">${icon("solar:archive-linear")}</button></div></article>
  `).join("") : emptyState("No services yet", "Add the studio services that should appear on the public website.", '<button class="button primary" data-action="new-service">Add service</button>');
}

function renderMedia() {
  $("#media-grid").innerHTML = state.data.media.length ? state.data.media.map((asset) => {
    const isImage = asset.mime_type?.startsWith("image/");
    return `<article class="media-card"><div class="media-preview">${isImage ? `<img src="${escapeHtml(asset.public_url)}" alt="${escapeHtml(asset.alt_text)}" loading="lazy">` : icon(asset.mime_type === "application/pdf" ? "solar:document-text-linear" : "solar:videocamera-record-linear")}</div><div class="media-body"><strong title="${escapeHtml(asset.internal_name)}">${escapeHtml(asset.internal_name)}</strong><small>${escapeHtml(asset.mime_type || "Unknown file")} · ${asset.size_bytes ? `${Math.round(asset.size_bytes / 1024)} KB` : "Size unknown"}</small><div class="media-actions"><button class="text-button" data-edit-media="${asset.id}">Edit</button><button class="text-button" data-copy-url="${escapeHtml(asset.public_url || "")}">Copy URL</button><button class="text-button danger" data-archive-media="${asset.id}">Archive</button></div></div></article>`;
  }).join("") : emptyState("Media library is empty", "Upload an image, PDF, or short video and reuse it across website content.", '<button class="button primary" data-action="new-media">Upload media</button>');
}

function renderTeam() {
  $("#team-table").innerHTML = state.data.profiles.length ? state.data.profiles.map((profile) => `
    <tr><td><strong>${escapeHtml(profile.full_name || "Unnamed account")}</strong></td><td>${badge(profile.role)}</td><td>${profile.role === "client" ? "Assigned projects" : "Workspace"}</td></tr>
  `).join("") : `<tr><td colspan="3">${emptyState("No team profiles", "Team accounts will appear after they sign in or are invited.")}</td></tr>`;
}

const topActionMap = {
  projects: ["new-project", "New project", "solar:add-circle-linear"],
  clients: ["new-client", "Add client", "solar:user-plus-linear"],
  invoices: ["new-invoice", "New invoice", "solar:add-circle-linear"],
  portfolio: ["new-portfolio", "Add portfolio", "solar:gallery-add-linear"],
  services: ["new-service", "Add service", "solar:add-circle-linear"],
  media: ["new-media", "Upload media", "solar:upload-linear"],
};

function renderTopAction() {
  const config = topActionMap[state.view];
  const canManageProjects = ["owner", "project_manager"].includes(state.profile.role);
  if (["projects", "clients"].includes(state.view) && !canManageProjects) {
    $("#top-actions").innerHTML = "";
    return;
  }
  $("#top-actions").innerHTML = config
    ? `<button class="button primary" type="button" data-action="${config[0]}">${icon(config[2])}<span>${config[1]}</span></button>`
    : "";
}

function openProject(projectId) {
  const project = state.data.projects.find((item) => item.id === projectId);
  if (!project) return;
  $("#project-dialog").dataset.projectId = projectId;
  $("#project-dialog-title").textContent = project.title;
  const milestones = [...(project.milestones || [])].sort((a, b) => a.position - b.position);
  $("#project-dialog-content").innerHTML = `
    <div class="project-summary"><div><span class="muted">Client</span><strong>${escapeHtml(project.clients?.name || "—")}</strong></div><div><span class="muted">Due</span><strong>${formatDate(project.due_date)}</strong></div><div><span class="muted">Budget</span><strong>${money(project.budget, project.currency)}</strong></div><div><span class="muted">Status</span>${badge(project.status)}</div></div>
    <div class="panel-head project-detail-head"><div><p class="eyebrow">Delivery plan</p><h3>Milestones</h3></div><div class="inline-actions"><button class="button secondary" data-invite-client="${project.id}">Invite client</button><button class="button primary" data-add-milestone="${project.id}">Add milestone</button></div></div>
    <div class="timeline">${milestones.length ? milestones.map((milestone) => `<article class="timeline-item"><div class="timeline-top"><div><strong>${escapeHtml(milestone.title)}</strong><small class="muted">Due ${formatDate(milestone.due_date)}</small></div>${badge(milestone.status)}</div>${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ""}${(milestone.deliverables || []).map((item) => `<div class="deliverable"><div class="timeline-top"><a href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener"><strong>${escapeHtml(item.title)}</strong></a>${badge(item.status)}</div><small class="muted">Version ${item.version}${item.client_note ? ` · Client: ${escapeHtml(item.client_note)}` : ""}</small></div>`).join("")}<button class="text-button detail-action" data-add-deliverable="${milestone.id}">Share deliverable</button></article>`).join("") : emptyState("No milestones yet", "Add the first milestone to create the client delivery plan.")}</div>`;
  $("#project-dialog").showModal();
}

function setView(view) {
  state.view = view;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $("#view-title").textContent = ({ invoices: "Billing", pages: "Pages", portfolio: "Portfolio", services: "Services", media: "Media library" })[view] || titleCase(view);
  $("#view-eyebrow").textContent = ["pages", "portfolio", "services", "media", "team"].includes(view) ? "Administration" : "Workspace";
  renderTopAction();
  closeSidebar();
  window.location.hash = view;
}

function restoreSidebar() {
  const hidden = localStorage.getItem("olympus-sidebar-hidden") === "true";
  $("#app").classList.toggle("sidebar-hidden", hidden);
}

function toggleDesktopSidebar() {
  const hidden = !$("#app").classList.contains("sidebar-hidden");
  $("#app").classList.toggle("sidebar-hidden", hidden);
  localStorage.setItem("olympus-sidebar-hidden", String(hidden));
}

function openSidebar() {
  if (matchMedia("(max-width: 800px)").matches) $("#app").classList.add("sidebar-open");
  else {
    $("#app").classList.remove("sidebar-hidden");
    localStorage.setItem("olympus-sidebar-hidden", "false");
  }
  $("#menu-button").setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  $("#app").classList.remove("sidebar-open");
  $("#menu-button").setAttribute("aria-expanded", "false");
}

const field = (label, name, type = "text", options = {}) => {
  const wide = options.wide ? "wide" : "";
  const help = options.help ? `<small>${escapeHtml(options.help)}</small>` : "";
  if (type === "select") return `<label class="${wide}">${label}${help}<select name="${name}" ${options.required ? "required" : ""}>${options.items.map((item) => `<option value="${escapeHtml(item.value)}" ${String(options.value) === String(item.value) ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>`;
  if (type === "textarea") return `<label class="${wide}">${label}${help}<textarea name="${name}" ${options.required ? "required" : ""}>${escapeHtml(options.value || "")}</textarea></label>`;
  if (type === "checkbox") return `<label class="check-field ${wide}"><input name="${name}" type="checkbox" ${options.value ? "checked" : ""}><span>${label}</span></label>`;
  return `<label class="${wide}">${label}${help}<input name="${name}" type="${type}" ${type !== "file" ? `value="${escapeHtml(options.value ?? "")}"` : ""} ${options.required ? "required" : ""} ${options.min != null ? `min="${options.min}"` : ""} ${options.max != null ? `max="${options.max}"` : ""} ${options.accept ? `accept="${escapeHtml(options.accept)}"` : ""}></label>`;
};

function pageFields(page) {
  const schema = pageSchemas[page.slug] || [["Page introduction", "body", "textarea"]];
  return field("Page title", "page_title", "text", { value: page.title, wide: true })
    + schema.map(([label, path, type = "text"]) => field(label, path, type, {
    value: getPath(page.content || {}, path),
    wide: type === "textarea" || type === "url",
  })).join("")
    + field("SEO title", "seo_title", "text", { value: page.seo_title, wide: true })
    + field("SEO description", "seo_description", "textarea", { value: page.seo_description, wide: true });
}

function openDialog(kind, record = null, options = {}) {
  const form = $("#entity-form");
  form.reset();
  form.dataset.dirty = "false";
  form.dataset.kind = kind;
  form.dataset.id = record?.id || "";
  form.dataset.projectId = record?.project_id || "";
  form.dataset.milestoneId = record?.milestone_id || "";
  form.dataset.intakeId = record?.intake_submission_id || "";
  form.dataset.collectionType = options.collectionType || "";
  form.dataset.collectionIndex = options.collectionIndex ?? "";
  $("#dialog-eyebrow").textContent = record ? "Update" : "Create";
  $("#dialog-message").textContent = "";
  $("#upload-progress").classList.add("hidden");
  $("#dialog-preview").classList.toggle("hidden", !["page", "service", "portfolio"].includes(kind));

  const configs = {
    client: {
      title: record ? "Edit client" : "Add client", description: "Keep contact details and project context together.",
      html: field("Client name", "name", "text", { required: true, value: record?.name }) + field("Company", "company", "text", { value: record?.company }) + field("Email", "email", "email", { value: record?.email }) + field("Phone", "phone", "tel", { value: record?.phone }) + field("Notes", "notes", "textarea", { wide: true, value: record?.notes }),
    },
    project: {
      title: record?.id ? "Edit project" : "New project", description: "Create the project record before adding milestones, files, and billing.",
      html: field("Project title", "title", "text", { required: true, value: record?.title }) + field("Client", "client_id", "select", { required: true, value: record?.client_id, items: [{ value: "", label: "Select a client" }, ...state.data.clients.map((client) => ({ value: client.id, label: client.name }))] }) + field("Service", "service", "text", { value: record?.service }) + field("Budget", "budget", "number", { min: 0, value: record?.budget }) + field("Start date", "start_date", "date", { value: record?.start_date }) + field("Due date", "due_date", "date", { value: record?.due_date }) + field("Description", "description", "textarea", { wide: true, value: record?.description }),
    },
    invoice: {
      title: "New invoice", description: "Draft financial details remain editable until the invoice is finalized.",
      html: field("Invoice number", "invoice_number", "text", { required: true, value: `OLY-${new Date().getFullYear()}-${String(state.data.invoices.length + 1).padStart(3, "0")}` }) + field("Project", "project_id", "select", { required: true, items: [{ value: "", label: "Select a project" }, ...state.data.projects.map((project) => ({ value: project.id, label: project.title }))] }) + field("Subtotal", "subtotal", "number", { required: true, min: 0 }) + field("Tax", "tax", "number", { min: 0 }) + field("Due date", "due_date", "date", { required: true }) + field("Notes", "notes", "textarea", { wide: true }),
    },
    page: { title: `Edit ${record?.title || "page"}`, description: "Save changes as a private draft. Publish only after previewing.", html: pageFields(record) },
    milestone: { title: "Add milestone", description: "Milestones become the delivery timeline shared with the client.", html: field("Milestone title", "title", "text", { required: true }) + field("Due date", "due_date", "date") + field("Description", "description", "textarea", { wide: true }) + field("Requires client approval", "requires_approval", "select", { items: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] }) },
    deliverable: { title: "Share deliverable", description: "Use a secure file URL and version each client-facing delivery.", html: field("Deliverable title", "title", "text", { required: true }) + field("Version", "version", "number", { required: true, min: 1, value: 1 }) + field("Secure file URL", "file_url", "url", { required: true, wide: true }) + field("Description", "description", "textarea", { wide: true }) },
    service: {
      title: record ? "Edit service" : "Add service", description: "Edit the public service card, then preview and publish.",
      html: field("Service title", "title", "text", { required: true, value: record?.title }) + field("Slug", "slug", "text", { required: true, value: record?.slug }) + field("Image URL", "image_url", "url", { value: record?.image_url, wide: true }) + field("Summary", "summary", "textarea", { required: true, value: record?.summary, wide: true }) + field("Full description", "description", "textarea", { value: record?.description, wide: true }),
    },
    portfolio: {
      title: record ? "Edit portfolio item" : "Add portfolio item", description: "Upload managed media or link to a large externally hosted video or document.",
      html: field("Title", "title", "text", { required: true, value: record?.title }) + field("Slug", "slug", "text", { required: true, value: record?.slug }) + field("Category", "category", "select", { required: true, value: record?.category || "graphics", items: ["film", "events", "graphics", "editorial", "motion"].map((value) => ({ value, label: titleCase(value) })) }) + field("Collection", "collection", "text", { value: record?.collection }) + field("Year", "year", "number", { min: 2000, max: 2100, value: record?.year || new Date().getFullYear() }) + field("Media type", "media_type", "select", { value: record?.media_type || "image", items: ["image", "video", "pdf"].map((value) => ({ value, label: titleCase(value) })) }) + field("Description", "description", "textarea", { value: record?.description, wide: true }) + field("Alternative text", "alt_text", "textarea", { required: true, value: record?.alt_text, wide: true }) + field("Thumbnail URL", "thumbnail_src", "url", { value: record?.thumbnail_src, wide: true, help: "Keep the current URL or upload a replacement below." }) + field("Upload thumbnail", "thumbnail_file", "file", { accept: "image/jpeg,image/png,image/webp,image/gif", wide: true }) + field("Preview URL", "preview_src", "url", { value: record?.preview_src, wide: true }) + field("Original / external URL", "original_url", "url", { value: record?.original_url, wide: true }) + field("Upload main file", "main_file", "file", { accept: "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm", wide: true, help: "Use an external URL for large video files." }) + field("Feature this item", "featured", "checkbox", { value: record?.featured }),
    },
    media: {
      title: record ? "Edit media details" : "Upload media", description: "Managed files can be reused by page, service, and portfolio content.",
      html: field("Internal name", "internal_name", "text", { required: true, value: record?.internal_name }) + (!record ? field("File", "file", "file", { required: true, accept: "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,video/mp4,video/webm" }) : "") + field("Alternative text", "alt_text", "textarea", { wide: true, required: true, value: record?.alt_text }) + field("Caption", "caption", "textarea", { wide: true, value: record?.caption }),
    },
    collection: {
      title: `${record ? "Edit" : "Add"} ${titleCase(options.collectionType).replace(/s$/, "")}`, description: "This item remains in the Global content draft until Global content is published.",
      html: (collectionSchemas[options.collectionType] || []).map(([label, name, type = "text"]) => field(label, name, type, { required: ["name", "question", "quote"].includes(name), value: record?.[name], wide: type === "textarea" || type === "url" })).join(""),
    },
  };
  const config = configs[kind];
  $("#dialog-title").textContent = config.title;
  $("#dialog-description").textContent = config.description;
  $("#dialog-fields").innerHTML = config.html;
  $("#dialog-submit").textContent = ["page", "service", "portfolio", "collection"].includes(kind) ? "Save draft" : "Save";
  $("#entity-dialog").showModal();
}

async function uploadAsset(file, internalName, altText) {
  if (!file?.size) return null;
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await state.supabase.storage.from("site-media").upload(storagePath, file, { cacheControl: "31536000", upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicFile } = state.supabase.storage.from("site-media").getPublicUrl(storagePath);
  const { data: asset, error } = await state.supabase.from("media_assets").insert({
    storage_path: storagePath,
    public_url: publicFile.publicUrl,
    internal_name: internalName || file.name,
    alt_text: altText || "",
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: state.profile.id,
  }).select("*").single();
  if (error) {
    await state.supabase.storage.from("site-media").remove([storagePath]);
    throw error;
  }
  return asset;
}

async function saveEntity(event) {
  event.preventDefault();
  const submit = $("#dialog-submit");
  submit.disabled = true;
  $("#dialog-message").textContent = "";
  const form = event.currentTarget;
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  const kind = form.dataset.kind;
  try {
    let query;
    if (kind === "client") {
      query = state.supabase.from("clients").insert({ ...values, created_by: state.profile.id });
    } else if (kind === "project") {
      query = state.supabase.from("projects").insert({ ...values, budget: values.budget || null, created_by: state.profile.id, status: "draft", currency: "NGN", intake_submission_id: form.dataset.intakeId || null }).select("id").single();
    } else if (kind === "invoice") {
      query = state.supabase.from("invoices").insert({ ...values, subtotal: Number(values.subtotal), tax: Number(values.tax || 0), created_by: state.profile.id, status: "draft", currency: "NGN" });
    } else if (kind === "page") {
      const page = state.data.pages.find((item) => item.id === form.dataset.id);
      const content = structuredClone(page.content || {});
      (pageSchemas[page.slug] || []).forEach(([, path]) => setPath(content, path, values[path] || ""));
      query = state.supabase.from("pages").update({ title: values.page_title, content, seo_title: values.seo_title || null, seo_description: values.seo_description || null, updated_by: state.profile.id }).eq("id", page.id);
    } else if (kind === "milestone") {
      const project = state.data.projects.find((item) => item.id === form.dataset.projectId);
      query = state.supabase.from("milestones").insert({ project_id: form.dataset.projectId, title: values.title, due_date: values.due_date || null, description: values.description || null, requires_approval: values.requires_approval === "true", position: project?.milestones?.length || 0 });
    } else if (kind === "deliverable") {
      query = state.supabase.from("deliverables").insert({ milestone_id: form.dataset.milestoneId, title: values.title, version: Number(values.version), file_url: values.file_url, description: values.description || null, status: "shared", uploaded_by: state.profile.id });
    } else if (kind === "service") {
      const payload = { title: values.title, slug: values.slug, image_url: values.image_url || null, summary: values.summary || null, description: values.description || null };
      query = form.dataset.id
        ? state.supabase.from("services").update(payload).eq("id", form.dataset.id)
        : state.supabase.from("services").insert({ ...payload, status: "draft", position: state.data.services.length });
    } else if (kind === "portfolio") {
      $("#upload-progress").classList.remove("hidden");
      const existing = state.data.portfolio.find((item) => item.id === form.dataset.id);
      const thumbnailAsset = await uploadAsset(formData.get("thumbnail_file"), `${values.title} thumbnail`, values.alt_text);
      const mainAsset = await uploadAsset(formData.get("main_file"), values.title, values.alt_text);
      const thumbnailSrc = thumbnailAsset?.public_url || values.thumbnail_src || existing?.thumbnail_src;
      if (!thumbnailSrc) throw new Error("Add a thumbnail URL or upload a thumbnail image.");
      const payload = {
        title: values.title,
        slug: values.slug,
        description: values.description || null,
        category: values.category,
        collection: values.collection || null,
        year: Number(values.year) || null,
        media_type: values.media_type,
        thumbnail_src: thumbnailSrc,
        preview_src: values.preview_src || (mainAsset?.mime_type.startsWith("image/") ? mainAsset.public_url : null),
        original_url: mainAsset?.public_url || values.original_url || null,
        alt_text: values.alt_text,
        featured: formData.get("featured") === "on",
        updated_by: state.profile.id,
      };
      query = form.dataset.id
        ? state.supabase.from("portfolio_items").update(payload).eq("id", form.dataset.id)
        : state.supabase.from("portfolio_items").insert({ ...payload, status: "draft", position: state.data.portfolio.length, created_by: state.profile.id });
    } else if (kind === "media") {
      if (form.dataset.id) {
        query = state.supabase.from("media_assets").update({ internal_name: values.internal_name, alt_text: values.alt_text, caption: values.caption || null }).eq("id", form.dataset.id);
      } else {
        $("#upload-progress").classList.remove("hidden");
        await uploadAsset(formData.get("file"), values.internal_name, values.alt_text);
        query = Promise.resolve({ error: null });
      }
    } else if (kind === "collection") {
      const page = globalPage();
      if (!page) throw new Error("Global content is unavailable.");
      const content = structuredClone(page.content || {});
      const type = form.dataset.collectionType;
      content[type] ||= [];
      const item = {};
      (collectionSchemas[type] || []).forEach(([, name]) => { item[name] = values[name] || ""; });
      const index = form.dataset.collectionIndex === "" ? -1 : Number(form.dataset.collectionIndex);
      if (index >= 0) content[type][index] = item;
      else content[type].push(item);
      query = state.supabase.from("pages").update({ content, updated_by: state.profile.id }).eq("id", page.id);
    }
    const { error } = await query;
    if (error) throw error;
    form.dataset.dirty = "false";
    $("#entity-dialog").close();
    toast(`${titleCase(kind)} saved${["page", "service", "portfolio", "collection"].includes(kind) ? " as a draft" : ""}.`);
    await refreshData();
  } catch (error) {
    $("#dialog-message").textContent = error.message;
  } finally {
    submit.disabled = false;
    $("#upload-progress").classList.add("hidden");
  }
}

async function publishEntity(type, id) {
  const button = document.querySelector(`[data-publish-type="${type}"][data-publish-id="${id}"]`);
  if (button) button.disabled = true;
  const { error } = await state.supabase.rpc("publish_cms_entity", { target_type: type, target_id: id });
  if (error) toast(error.message, "error");
  else {
    toast(`${titleCase(type)} published to the website.`);
    await refreshData();
  }
  if (button) button.disabled = false;
}

function confirmAction(title, message, actionLabel = "Continue") {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-action").textContent = actionLabel;
  const dialog = $("#confirm-dialog");
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}

async function archiveEntity(type, id) {
  const approved = await confirmAction("Archive this content?", "Archived content is removed from the public site but remains available in the workspace.", "Archive");
  if (!approved) return;
  const table = type === "portfolio" ? "portfolio_items" : "services";
  const { error } = await state.supabase.from(table).update({ status: "archived" }).eq("id", id);
  if (error) toast(error.message, "error");
  else { toast("Content archived."); await refreshData(); }
}

async function moveEntity(type, id, direction) {
  const list = type === "portfolio" ? state.data.portfolio : state.data.services;
  const currentIndex = list.findIndex((item) => item.id === id);
  const nextIndex = currentIndex + Number(direction);
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= list.length) return;
  const table = type === "portfolio" ? "portfolio_items" : "services";
  const current = list[currentIndex];
  const next = list[nextIndex];
  const [{ error: firstError }, { error: secondError }] = await Promise.all([
    state.supabase.from(table).update({ position: next.position }).eq("id", current.id),
    state.supabase.from(table).update({ position: current.position }).eq("id", next.id),
  ]);
  if (firstError || secondError) toast((firstError || secondError).message, "error");
  else await refreshData();
}

async function duplicateEntity(type, id) {
  const source = (type === "portfolio" ? state.data.portfolio : state.data.services).find((item) => item.id === id);
  if (!source) return;
  const table = type === "portfolio" ? "portfolio_items" : "services";
  const payload = { ...source };
  ["id", "legacy_id", "published_snapshot", "published_at", "created_at", "updated_at"].forEach((key) => delete payload[key]);
  payload.title = `${source.title} copy`;
  payload.slug = `${source.slug}-copy-${Date.now().toString().slice(-5)}`;
  payload.position = type === "portfolio" ? state.data.portfolio.length : state.data.services.length;
  payload.status = "draft";
  if (type === "portfolio") {
    payload.created_by = state.profile.id;
    payload.updated_by = state.profile.id;
  }
  const { error } = await state.supabase.from(table).insert(payload);
  if (error) toast(error.message, "error");
  else { toast("Draft copy created."); await refreshData(); }
}

function previewMarkup(kind, record) {
  const image = record.thumbnail_src || record.image_url || getPath(record.content || {}, "hero.background_image");
  const title = record.title || getPath(record.content || {}, "hero.title_line_one") || "Content preview";
  const secondaryTitle = getPath(record.content || {}, "hero.title_line_two") || "";
  const body = record.summary || record.description || getPath(record.content || {}, "hero.body") || getPath(record.content || {}, "header.body") || "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>*{box-sizing:border-box}body{margin:0;background:#080807;color:#f8f5ec;font-family:Inter,Arial,sans-serif}.shell{min-height:100vh;padding:8vw;background:${image ? `linear-gradient(#05050599,#050505e8),url('${String(image).replaceAll("'", "%27")}') center/cover` : "radial-gradient(circle at 70% 0,#2b2411,transparent 35%),#080807"}.eyebrow{color:#e8bb48;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:700}.content{max-width:780px;margin-top:18vh}h1{font-size:clamp(42px,9vw,96px);line-height:.94;letter-spacing:-.06em;margin:16px 0 24px}h1 span{color:#e8bb48}p{max-width:620px;color:#c3bfb4;line-height:1.75;font-size:16px}.card{max-width:520px;margin:12vh auto;padding:26px;border:1px solid #2d2e27;border-radius:24px;background:#11120f}.card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:17px}.card h1{font-size:38px}.pill{display:inline-flex;margin-top:22px;padding:12px 20px;border-radius:999px;background:#e8bb48;color:#151206;font-weight:700}</style></head><body>${kind === "page" ? `<main class="shell"><div class="content"><div class="eyebrow">${escapeHtml(getPath(record.content || {}, "hero.eyebrow") || getPath(record.content || {}, "header.eyebrow") || record.slug || "Olympus Studio")}</div><h1>${escapeHtml(title)} ${secondaryTitle ? `<span>${escapeHtml(secondaryTitle)}</span>` : ""}</h1><p>${escapeHtml(body)}</p><span class="pill">Primary action</span></div></main>` : `<main class="shell"><article class="card">${image ? `<img src="${escapeHtml(image)}" alt="">` : ""}<div class="eyebrow">${escapeHtml(record.category || kind)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><span class="pill">${kind === "service" ? "Brief this service" : "View project"}</span></article></main>`}</body></html>`;
}

function recordFromOpenForm() {
  const form = $("#entity-form");
  const values = Object.fromEntries(new FormData(form).entries());
  const kind = form.dataset.kind;
  if (kind === "page") {
    const page = state.data.pages.find((item) => item.id === form.dataset.id);
    const content = structuredClone(page.content || {});
    (pageSchemas[page.slug] || []).forEach(([, path]) => setPath(content, path, values[path] || ""));
    return { kind, record: { ...page, content } };
  }
  return { kind, record: values };
}

function showPreview(kind, record) {
  $("#preview-title").textContent = record.title || titleCase(kind);
  $("#preview-frame").srcdoc = previewMarkup(kind, record);
  $("#preview-frame").classList.remove("mobile");
  $("#preview-dialog").showModal();
}

async function removeCollection(type, index) {
  const approved = await confirmAction("Remove this draft item?", "The item will be removed from the Global content draft. The published website stays unchanged until Global content is published.", "Remove");
  if (!approved) return;
  const page = globalPage();
  const content = structuredClone(page.content || {});
  content[type] ||= [];
  content[type].splice(Number(index), 1);
  const { error } = await state.supabase.from("pages").update({ content, updated_by: state.profile.id }).eq("id", page.id);
  if (error) toast(error.message, "error");
  else { toast("Draft item removed."); await refreshData(); }
}

async function archiveMedia(id) {
  const { data: usage, error: usageError } = await state.supabase.rpc("media_asset_usage", { target_id: id });
  if (usageError) { toast(usageError.message, "error"); return; }
  if (Number(usage) > 0) {
    toast(`This file is used in ${usage} content record${usage === 1 ? "" : "s"}. Replace those references before archiving it.`, "error");
    return;
  }
  const approved = await confirmAction("Archive this media file?", "The file remains in storage but is hidden from the active media library.", "Archive");
  if (!approved) return;
  const { error } = await state.supabase.from("media_assets").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) toast(error.message, "error");
  else { toast("Media archived."); await refreshData(); }
}

function handleCreateAction(action) {
  const dialogs = {
    "new-client": "client",
    "new-project": "project",
    "new-invoice": "invoice",
    "new-service": "service",
    "new-portfolio": "portfolio",
    "new-media": "media",
  };
  const kind = dialogs[action];
  if (!kind) return false;
  try {
    openDialog(kind);
  } catch (error) {
    console.error(`Could not open ${kind} dialog`, error);
    toast(`The ${titleCase(kind)} form could not open. Refresh the page and try again.`, "error");
  }
  return true;
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) setView(nav.dataset.view);
  const jump = event.target.closest("[data-view-jump]");
  if (jump) setView(jump.dataset.viewJump);
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "retry") await refreshData();
  handleCreateAction(action);
  if (action === "load-more-portfolio") {
    state.portfolioVisible += 24;
    renderPortfolio();
  }

  const projectId = event.target.closest("[data-open-project]")?.dataset.openProject;
  if (projectId) openProject(projectId);
  const milestoneProjectId = event.target.closest("[data-add-milestone]")?.dataset.addMilestone;
  if (milestoneProjectId) { $("#project-dialog").close(); openDialog("milestone", { project_id: milestoneProjectId }); }
  const deliverableMilestoneId = event.target.closest("[data-add-deliverable]")?.dataset.addDeliverable;
  if (deliverableMilestoneId) { $("#project-dialog").close(); openDialog("deliverable", { milestone_id: deliverableMilestoneId }); }
  if (event.target.closest("[data-close-project]")) $("#project-dialog").close();

  const inviteProjectId = event.target.closest("[data-invite-client]")?.dataset.inviteClient;
  if (inviteProjectId) {
    const email = window.prompt("Client email address");
    if (!email) return;
    const { data, error } = await state.supabase.from("project_invites").insert({ project_id: inviteProjectId, email: email.trim().toLowerCase(), created_by: state.profile.id }).select("token").single();
    if (error) toast(error.message, "error");
    else {
      const inviteUrl = `${window.location.origin}/portal?invite=${data.token}`;
      try { await navigator.clipboard.writeText(inviteUrl); toast("Secure client link copied. It expires in 7 days."); }
      catch { window.prompt("Copy this secure client link", inviteUrl); }
    }
  }

  const pageId = event.target.closest("[data-edit-page]")?.dataset.editPage;
  if (pageId) openDialog("page", state.data.pages.find((page) => page.id === pageId));
  const previewPageId = event.target.closest("[data-preview-page]")?.dataset.previewPage;
  if (previewPageId) showPreview("page", state.data.pages.find((page) => page.id === previewPageId));
  const serviceId = event.target.closest("[data-edit-service]")?.dataset.editService;
  if (serviceId) openDialog("service", state.data.services.find((service) => service.id === serviceId));
  const portfolioId = event.target.closest("[data-edit-portfolio]")?.dataset.editPortfolio;
  if (portfolioId) openDialog("portfolio", state.data.portfolio.find((item) => item.id === portfolioId));
  const mediaId = event.target.closest("[data-edit-media]")?.dataset.editMedia;
  if (mediaId) openDialog("media", state.data.media.find((item) => item.id === mediaId));

  const publishButton = event.target.closest("[data-publish-type]");
  if (publishButton) await publishEntity(publishButton.dataset.publishType, publishButton.dataset.publishId);
  const archiveButton = event.target.closest("[data-archive-type]");
  if (archiveButton) await archiveEntity(archiveButton.dataset.archiveType, archiveButton.dataset.archiveId);
  const moveButton = event.target.closest("[data-move-type]");
  if (moveButton) await moveEntity(moveButton.dataset.moveType, moveButton.dataset.moveId, moveButton.dataset.direction);
  const duplicateService = event.target.closest("[data-duplicate-service]")?.dataset.duplicateService;
  if (duplicateService) await duplicateEntity("service", duplicateService);
  const duplicatePortfolio = event.target.closest("[data-duplicate-portfolio]")?.dataset.duplicatePortfolio;
  if (duplicatePortfolio) await duplicateEntity("portfolio", duplicatePortfolio);

  const collectionTab = event.target.closest("[data-collection-tab]")?.dataset.collectionTab;
  if (collectionTab) { state.collectionTab = collectionTab; renderCollections(); }
  const addCollection = event.target.closest("[data-add-collection]")?.dataset.addCollection;
  if (addCollection) openDialog("collection", null, { collectionType: addCollection });
  const editCollection = event.target.closest("[data-edit-collection]");
  if (editCollection) {
    const type = editCollection.dataset.editCollection;
    const index = Number(editCollection.dataset.collectionIndex);
    openDialog("collection", globalPage()?.content?.[type]?.[index], { collectionType: type, collectionIndex: index });
  }
  const removeCollectionButton = event.target.closest("[data-remove-collection]");
  if (removeCollectionButton) await removeCollection(removeCollectionButton.dataset.removeCollection, removeCollectionButton.dataset.collectionIndex);

  const copyUrl = event.target.closest("[data-copy-url]")?.dataset.copyUrl;
  if (copyUrl) {
    try { await navigator.clipboard.writeText(copyUrl); toast("Media URL copied."); }
    catch { toast("The URL could not be copied.", "error"); }
  }
  const archiveMediaId = event.target.closest("[data-archive-media]")?.dataset.archiveMedia;
  if (archiveMediaId) await archiveMedia(archiveMediaId);

  const reviewId = event.target.closest("[data-review-intake]")?.dataset.reviewIntake;
  if (reviewId) {
    const item = state.data.intake.find((entry) => entry.id === reviewId);
    if (item?.status === "new") {
      const { error } = await state.supabase.from("intake_submissions").update({ status: "reviewing" }).eq("id", reviewId);
      if (error) toast(error.message, "error"); else { toast("Enquiry moved to review."); await refreshData(); }
    } else if (item?.status === "reviewing") {
      let client = state.data.clients.find((entry) => entry.email?.toLowerCase() === item.email.toLowerCase());
      if (!client) {
        const { data, error } = await state.supabase.from("clients").insert({ name: item.name, email: item.email, phone: item.phone || null, created_by: state.profile.id }).select("*").single();
        if (error) { toast(error.message, "error"); return; }
        client = { ...data, projects: [] };
        state.data.clients.unshift(client);
      }
      openDialog("project", { title: item.title || `${item.name} project`, service: item.service, budget: String(item.budget || "").replace(/[^0-9.]/g, ""), description: item.message, client_id: client.id, intake_submission_id: item.id });
    } else toast(item?.message || "No additional message was provided.");
  }

  const invoiceButton = event.target.closest("[data-invoice-status]");
  if (invoiceButton) {
    const patch = { status: invoiceButton.dataset.nextStatus };
    if (patch.status === "paid") {
      const reference = window.prompt("Payment reference or method");
      if (!reference) return;
      patch.payment_reference = reference;
    }
    const { error } = await state.supabase.from("invoices").update(patch).eq("id", invoiceButton.dataset.invoiceStatus);
    if (error) toast(error.message, "error");
    else { toast(patch.status === "paid" ? "Invoice marked paid." : "Invoice finalized and ready to send."); await refreshData(); }
  }
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  $("#login-message").textContent = "";
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const { data, error } = await state.supabase.auth.signInWithPassword(values);
  if (error) $("#login-message").textContent = error.message;
  else { state.session = data.session; await enterWorkspace(); }
  button.disabled = false;
});

$("#password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  $("#password-message").textContent = "";
  if (values.password !== values.confirm_password) {
    $("#password-message").textContent = "The passwords do not match.";
    return;
  }
  const button = $("button", event.currentTarget);
  button.disabled = true;
  const { error: passwordError } = await state.supabase.auth.updateUser({ password: values.password });
  if (passwordError) {
    $("#password-message").textContent = passwordError.message;
    button.disabled = false;
    return;
  }
  const { error } = await state.supabase.from("profiles").update({ must_change_password: false }).eq("id", state.profile.id);
  if (error) $("#password-message").textContent = error.message;
  else {
    state.profile.must_change_password = false;
    $("#password-dialog").close();
    toast("Your private password is active.");
  }
  button.disabled = false;
});

$("#entity-form").addEventListener("submit", saveEntity);
$("#entity-form").addEventListener("input", () => {
  $("#entity-form").dataset.dirty = "true";
});
$("#entity-dialog").addEventListener("cancel", async (event) => {
  if ($("#entity-form").dataset.dirty !== "true") return;
  event.preventDefault();
  const discard = await confirmAction("Discard unsaved changes?", "The edits in this form have not been saved.", "Discard");
  if (discard) {
    $("#entity-form").dataset.dirty = "false";
    $("#entity-dialog").close();
  }
});
$("#entity-dialog").addEventListener("click", async (event) => {
  const cancelButton = event.target.closest('button[value="cancel"]');
  if (!cancelButton || $("#entity-form").dataset.dirty !== "true") return;
  event.preventDefault();
  const discard = await confirmAction("Discard unsaved changes?", "The edits in this form have not been saved.", "Discard");
  if (discard) {
    $("#entity-form").dataset.dirty = "false";
    $("#entity-dialog").close();
  }
});
$("#password-dialog").addEventListener("cancel", (event) => event.preventDefault());
$("#dialog-preview").addEventListener("click", () => {
  const { kind, record } = recordFromOpenForm();
  showPreview(kind, record);
});
$("#sign-out").addEventListener("click", () => state.supabase.auth.signOut());
$("#menu-button").addEventListener("click", openSidebar);
$("#collapse-sidebar").addEventListener("click", toggleDesktopSidebar);
$("#sidebar-backdrop").addEventListener("click", closeSidebar);
$("#preview-dialog").addEventListener("click", (event) => {
  const width = event.target.closest("[data-preview-width]")?.dataset.previewWidth;
  if (width) {
    $("#preview-frame").classList.toggle("mobile", width === "mobile");
    $$("[data-preview-width]").forEach((button) => button.classList.toggle("active", button.dataset.previewWidth === width));
  }
  if (event.target.closest("[data-close-preview]")) $("#preview-dialog").close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
});
["inbox-search", "inbox-filter"].forEach((id) => $(`#${id}`).addEventListener("input", renderInbox));
["project-search", "project-filter"].forEach((id) => $(`#${id}`).addEventListener("input", renderProjects));
$("#client-search").addEventListener("input", renderClients);
["invoice-search", "invoice-filter"].forEach((id) => $(`#${id}`).addEventListener("input", renderInvoices));
["portfolio-search", "portfolio-filter", "portfolio-status"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  state.portfolioVisible = 24;
  renderPortfolio();
}));

window.addEventListener("beforeunload", (event) => {
  if ($("#entity-dialog").open && $("#entity-form").dataset.dirty === "true") {
    event.preventDefault();
    event.returnValue = "";
  }
});

bootstrap();
