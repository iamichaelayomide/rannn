import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const state = {
  supabase: null,
  session: null,
  profile: null,
  data: {
    projects: [], clients: [], invoices: [], invoiceItems: [], payments: [],
    adjustments: [], adjustmentItems: [], billingSettings: null, intake: [],
    milestones: [], invitations: [], members: [], activities: [],
    pages: [], services: [], media: [], portfolio: [], profiles: [], revisions: [], crm: null,
  },
  view: "overview",
  route: ["overview"],
  collectionTab: "team",
  portfolioVisible: 24,
  previewPayload: null,
  dirty: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[character]);
const titleCase = (value = "") => String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const icon = (name) => `<iconify-icon icon="${name}"></iconify-icon>`;
const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
  : "Not set";
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
  : "Not set";
const money = (value, currency = "NGN") => new Intl.NumberFormat("en-NG", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Number(value || 0));
const badge = (status) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(titleCase(status))}</span>`;
const demoBadge = (record) => record?.is_demo ? '<span class="demo-badge">Demo</span>' : "";
const emptyState = (title, body, action = "") => `<div class="empty">${icon("solar:inbox-line-linear")}<strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p>${action}</div>`;
const inlineError = (message, retry = "") => `<div class="inline-error" role="alert">${icon("solar:danger-triangle-linear")}<div><strong>We could not complete that action</strong><p>${escapeHtml(message)}</p>${retry ? `<button class="button secondary" type="button" data-action="${retry}">Try again</button>` : ""}</div></div>`;
const routeButton = (route, label, style = "secondary", iconName = "") => `<button type="button" class="button ${style}" data-route="${escapeHtml(route)}">${iconName ? icon(iconName) : ""}${escapeHtml(label)}</button>`;
const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const setPath = (object, path, value) => {
  const keys = path.split(".");
  let target = object;
  keys.slice(0, -1).forEach((key) => {
    target[key] ||= {};
    target = target[key];
  });
  target[keys.at(-1)] = value;
};

const pageSchemas = {
  home: [
    ["Small heading above the title (optional)", "hero.eyebrow"],
    ["First title line", "hero.title_line_one"],
    ["Highlighted title line", "hero.title_line_two"],
    ["Introduction", "hero.body", "textarea"],
    ["Hero image", "hero.background_image", "image"],
    ["Vision statement", "vision.body", "textarea"],
    ["Manifesto statement", "manifesto.body", "textarea"],
  ],
  about: [
    ["Small heading above the title (optional)", "header.eyebrow"],
    ["Page heading", "header.title"],
    ["Introduction", "header.body", "textarea"],
    ["Feature image", "header.image", "image"],
  ],
  contact: [
    ["Small heading above the title (optional)", "header.eyebrow"],
    ["Page heading", "header.title"],
    ["Introduction", "header.body", "textarea"],
    ["Public email", "contact.email", "email", "contact"],
    ["Phone number", "contact.phone", "tel", "contact"],
    ["Atelier location", "contact.location", "text", "contact"],
  ],
  book: [
    ["Small heading above the title (optional)", "header.eyebrow"],
    ["Page heading", "header.title"],
    ["Introduction", "header.body", "textarea"],
  ],
  portfolio: [
    ["Small heading above the title (optional)", "header.eyebrow"],
    ["Page heading", "header.title"],
    ["Introduction", "header.body", "textarea"],
  ],
  services: [
    ["Small heading above the title (optional)", "header.eyebrow"],
    ["Page heading", "header.title"],
    ["Introduction", "header.body", "textarea"],
  ],
  global: [
    ["Brand name", "site.brand_name"],
    ["WhatsApp display number", "site.whatsapp"],
    ["WhatsApp number", "site.whatsapp_number"],
    ["Public email", "site.email", "email", "contact"],
    ["Location", "site.location", "text", "contact"],
    ["Footer introduction", "site.footer_intro", "textarea"],
    ["Instagram address", "site.instagram", "text", "advanced"],
    ["TikTok address", "site.tiktok", "text", "advanced"],
    ["X address", "site.x", "text", "advanced"],
    ["LinkedIn address", "site.linkedin", "text", "advanced"],
  ],
};

const collectionSchemas = {
  team: [
    ["Name", "name"], ["Role", "role"], ["Biography", "bio", "textarea"], ["Photo", "image", "image"],
  ],
  testimonials: [
    ["Client name", "name"], ["Role or company", "role"], ["What they said", "quote", "textarea"],
  ],
  faqs: [["Question", "question"], ["Answer", "answer", "textarea"]],
  partners: [["Partner name", "name"], ["Website address", "url"], ["Logo", "logo", "image"]],
};

function cmsState(record) {
  if (record?.status === "archived") return "archived";
  if (!record?.published_snapshot) return "draft";
  return record.has_unpublished_changes ? "changes" : "published";
}

function cmsBadge(record) {
  const current = cmsState(record);
  const labels = { draft: "Draft", changes: "Changes to publish", published: "Published", archived: "Archived" };
  return `<span class="badge ${current}">${labels[current]}</span>`;
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${icon("solar:check-circle-linear")}<span>${escapeHtml(message)}</span>`;
  $("#toast-region").append(node);
  setTimeout(() => node.remove(), 3500);
}

function setScreenError(message) {
  const target = $("#screen-message") || $("#record-screen");
  if (target) target.innerHTML = inlineError(message);
}

function parseRoute() {
  const raw = window.location.hash.replace(/^#/, "") || "overview";
  const [path, query = ""] = raw.split("?");
  return { segments: path.split("/").filter(Boolean), params: new URLSearchParams(query) };
}

function go(route) {
  if (state.dirty && !window.confirmNavigationRequested) {
    confirmAction("Discard unsaved changes?", "Your edits have not been saved.", "Discard").then((discard) => {
      if (!discard) return;
      state.dirty = false;
      window.confirmNavigationRequested = true;
      window.location.hash = route;
      window.confirmNavigationRequested = false;
    });
    return;
  }
  window.location.hash = route;
}

function showListView(view) {
  state.view = view;
  state.route = [view];
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#view-title").textContent = ({ invoices: "Billing", pages: "Pages", media: "Media library" })[view] || titleCase(view);
  $("#view-eyebrow").textContent = ["pages", "portfolio", "services", "media", "team"].includes(view) ? "Administration" : "Workspace";
  renderTopAction();
  closeSidebar();
}

function showRecordView(title, eyebrow = "Workspace") {
  state.view = "record";
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === "record"));
  $$(".nav-item").forEach((button) => button.classList.remove("active"));
  $("#view-title").textContent = title;
  $("#view-eyebrow").textContent = eyebrow;
  $("#top-actions").innerHTML = "";
  closeSidebar();
}

function recordHeader(parentRoute, parentLabel, title, body = "", actions = "") {
  return `<div class="record-header">
    <button class="back-link" type="button" data-route="${escapeHtml(parentRoute)}">${icon("solar:arrow-left-linear")}${escapeHtml(parentLabel)}</button>
    <div class="record-heading"><div><h2>${escapeHtml(title)}</h2>${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}</div><div class="inline-actions">${actions}</div></div>
  </div>`;
}

function field(label, name, type = "text", options = {}) {
  const classes = options.wide ? "wide" : "";
  const help = options.help ? `<small>${escapeHtml(options.help)}</small>` : "";
  const required = options.required ? "required" : "";
  if (type === "select") {
    return `<label class="${classes}">${escapeHtml(label)}${help}<select name="${escapeHtml(name)}" ${required}>${options.items.map((item) => `<option value="${escapeHtml(item.value)}" ${String(item.value) === String(options.value ?? "") ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>`;
  }
  if (type === "textarea") return `<label class="${classes}">${escapeHtml(label)}${help}<textarea name="${escapeHtml(name)}" ${required}>${escapeHtml(options.value || "")}</textarea></label>`;
  if (type === "checkbox") return `<label class="check-field ${classes}"><input name="${escapeHtml(name)}" type="checkbox" ${options.value ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`;
  return `<label class="${classes}">${escapeHtml(label)}${help}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(options.value ?? "")}" ${required} ${options.min != null ? `min="${options.min}"` : ""} ${options.max != null ? `max="${options.max}"` : ""}></label>`;
}

function imageField(label, name, value = "", alt = "") {
  const media = state.data.media.filter((item) => item.mime_type?.startsWith("image/"));
  return `<section class="image-field wide" data-image-field="${escapeHtml(name)}">
    <div class="image-field-head"><div><strong>${escapeHtml(label)}</strong><small>Keep this image, or replace it only when you want to.</small></div></div>
    <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">
    <div class="current-image ${value ? "" : "empty-image"}">
      ${value ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(alt)}">` : icon("solar:gallery-linear")}
      <div><strong>${value ? "Current image" : "No image selected"}</strong><small>${value ? "This image will stay unless you replace it." : "Choose an existing image or upload a new one."}</small></div>
    </div>
    <div class="image-actions">
      <button class="button secondary" type="button" data-toggle-library="${escapeHtml(name)}">${icon("solar:gallery-wide-linear")}Choose from library</button>
      <label class="button secondary upload-button">${icon("solar:upload-linear")}Upload new<input type="file" name="${escapeHtml(name)}_file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
      <button class="button ghost ${value ? "" : "hidden"}" type="button" data-restore-image="${escapeHtml(name)}" data-original="${escapeHtml(value)}">Restore current image</button>
    </div>
    <div class="inline-library hidden" data-library="${escapeHtml(name)}">
      ${media.length ? media.map((item) => `<button type="button" class="library-choice" data-choose-image="${escapeHtml(name)}" data-image-value="${escapeHtml(item.public_url)}"><img src="${escapeHtml(item.public_url)}" alt="${escapeHtml(item.alt_text)}"><span>${escapeHtml(item.internal_name)}</span></button>`).join("") : `<p class="muted">The media library has no images yet.</p>`}
    </div>
  </section>`;
}

function formShell(kind, title, description, fields, backRoute, submitLabel = "Save") {
  return `<form class="record-form" data-record-form="${escapeHtml(kind)}">
    ${recordHeader(backRoute, "Back", title, description)}
    <div class="form-section"><div class="form-grid">${fields}</div></div>
    <div class="upload-progress hidden" id="upload-progress"><span></span></div>
    <div id="screen-message" class="screen-message" role="alert"></div>
    <div class="sticky-actions">${routeButton(backRoute, "Cancel", "secondary")}<button class="button primary" type="submit">${escapeHtml(submitLabel)}</button></div>
  </form>`;
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
  const { data: profile, error } = await state.supabase.from("profiles").select("*").eq("id", state.session.user.id).single();
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
  if (profile.must_change_password) $("#password-dialog").showModal();
}

function applyRoleVisibility() {
  const role = state.profile.role;
  const canFinance = ["owner", "finance"].includes(role);
  const canContent = ["owner", "content_manager"].includes(role);
  $$('[data-view="invoices"], [data-view-panel="invoices"]').forEach((element) => element.classList.toggle("hidden", !canFinance));
  $$('[data-view="pages"], [data-view="portfolio"], [data-view="services"], [data-view="media"], [data-view-panel="pages"], [data-view-panel="portfolio"], [data-view-panel="services"], [data-view-panel="media"]')
    .forEach((element) => element.classList.toggle("hidden", !canContent));
  $$('[data-view="team"], [data-view-panel="team"]').forEach((element) => element.classList.toggle("hidden", role !== "owner"));
}

async function refreshData({ preserveRoute = true } = {}) {
  const queries = [
    state.supabase.from("projects").select("*, clients(id,name,email,company), milestones(id,title,description,status,due_date,position,requires_approval,deliverables(id,title,description,file_url,version,status,client_note))").order("created_at", { ascending: false }),
    state.supabase.from("clients").select("*").order("created_at", { ascending: false }),
    state.supabase.from("invoices").select("*, clients(id,name,email,company,phone), projects(id,title,client_id)").order("created_at", { ascending: false }),
    state.supabase.from("invoice_items").select("*").order("position"),
    state.supabase.from("invoice_payments").select("*, invoices(id,invoice_number,client_id,project_id,clients(id,name),projects(id,title))").order("paid_at", { ascending: false }),
    state.supabase.from("invoice_adjustments").select("*, invoices(id,invoice_number,currency,client_id,project_id,clients(id,name),projects(id,title))").order("created_at", { ascending: false }),
    state.supabase.from("invoice_adjustment_items").select("*").order("position"),
    state.supabase.from("billing_settings").select("*").eq("id", true).maybeSingle(),
    state.supabase.from("intake_submissions").select("*").order("created_at", { ascending: false }),
    state.supabase.from("milestones").select("*, projects(id,title,clients(name))").order("due_date", { ascending: true }),
    state.supabase.from("project_invites").select("*").order("created_at", { ascending: false }),
    state.supabase.from("project_members").select("*, profiles(id,full_name,role)").order("created_at"),
    state.supabase.from("activities").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(250),
    state.supabase.from("pages").select("*").order("slug"),
    state.supabase.from("services").select("*").order("position"),
    state.supabase.from("media_assets").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    state.supabase.from("portfolio_items").select("*").order("position"),
    state.supabase.from("profiles").select("*").order("created_at"),
    state.supabase.from("content_revisions").select("*, profiles(full_name)").order("published_at", { ascending: false }).limit(100),
    state.supabase.rpc("get_crm_dashboard", { months_back: 12 }),
  ];
  const keys = ["projects", "clients", "invoices", "invoiceItems", "payments", "adjustments", "adjustmentItems", "billingSettings", "intake", "milestones", "invitations", "members", "activities", "pages", "services", "media", "portfolio", "profiles", "revisions", "crm"];
  const results = await Promise.all(queries);
  const errors = [];
  results.forEach((result, index) => {
    if (result.error) errors.push(result.error.message);
    else state.data[keys[index]] = result.data || [];
  });
  renderLists();
  if (preserveRoute) renderRoute();
  if (errors.length) setScreenError(errors[0]);
}

function renderLists() {
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
}

function renderOverview() {
  const active = state.data.projects.filter((project) => !project.archived_at && project.status === "active").length;
  const awaiting = state.data.milestones.filter((milestone) => milestone.status === "awaiting_approval").length;
  const openInvoices = state.data.invoices.filter((invoice) => !["draft", "paid", "void"].includes(invoice.status) && invoiceBalance(invoice).outstanding > 0);
  const enquiries = state.data.intake.filter((item) => item.status === "new").length;
  const metrics = [
    ["Active projects", active, `${state.data.projects.filter((project) => !project.archived_at).length} current projects`, "projects?status=active"],
    ["Awaiting approval", awaiting, awaiting ? "Client action required" : "Nothing waiting", "projects"],
    ["Outstanding invoices", moneyTotals(totalsByCurrency(openInvoices.map((invoice) => ({ currency: invoice.currency, total: invoiceBalance(invoice).outstanding }))), "Nothing due"), `${openInvoices.length} due`, "invoices?status=open"],
    ["New enquiries", enquiries, enquiries ? "Review the inbox" : "Inbox is clear", "inbox?status=new"],
  ];
  $("#metrics").innerHTML = metrics.map(([label, value, note, route]) => `<button class="metric clickable-card" type="button" data-route="${route}"><span>${label}</span><strong>${value}</strong><small>${note}</small></button>`).join("");
  const attention = [
    ...state.data.intake.filter((item) => item.status === "new").slice(0, 3).map((item) => ({ title: `New enquiry from ${item.name}`, detail: item.title || item.service || "Project request", status: "new", route: `inbox/${item.id}` })),
    ...state.data.milestones.filter((item) => item.status === "awaiting_approval").slice(0, 3).map((item) => ({ title: item.title, detail: item.projects?.title || "Milestone", status: item.status, route: `projects/${item.projects?.id}` })),
    ...openInvoices.filter((item) => item.due_date && new Date(item.due_date) < new Date()).slice(0, 3).map((item) => ({ title: `${item.invoice_number} is overdue`, detail: item.projects?.title || "Invoice", status: "open", route: `invoices/${item.id}` })),
  ];
  $("#attention-list").innerHTML = attention.length
    ? attention.map((item) => `<button class="item-row clickable-row" type="button" data-route="${item.route}"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>${badge(item.status)}</button>`).join("")
    : emptyState("Nothing needs attention", "New enquiries, overdue invoices, and approval requests will appear here.");
  const upcoming = state.data.milestones.filter((milestone) => milestone.due_date && !["approved", "completed"].includes(milestone.status)).slice(0, 5);
  $("#milestone-list").innerHTML = upcoming.length
    ? upcoming.map((milestone) => `<button class="item-row clickable-row" type="button" data-route="projects/${milestone.projects?.id}"><div><strong>${escapeHtml(milestone.title)}</strong><small>${escapeHtml(milestone.projects?.title || "")} · ${formatDate(milestone.due_date)}</small></div>${badge(milestone.status)}</button>`).join("")
    : emptyState("No upcoming milestones", "Add milestones to an active project to build the delivery schedule.");
  const recentProjects = state.data.projects.filter((project) => !project.archived_at);
  $("#recent-projects").innerHTML = recentProjects.length
    ? recentProjects.slice(0, 5).map((project) => `<button class="item-row clickable-row" type="button" data-route="projects/${project.id}"><div><strong>${escapeHtml(project.title)}${demoBadge(project)}</strong><small>${escapeHtml(project.clients?.name || "No client")} · ${escapeHtml(project.service || "General")}</small></div>${badge(project.status)}</button>`).join("")
    : emptyState("No projects yet", "Create the first project to start tracking milestones, files, and billing.", routeButton("projects/new", "New project", "primary"));
}

function syncFilterFromRoute(id, name) {
  const value = parseRoute().params.get(name);
  if (value != null && $(`#${id}`)) $(`#${id}`).value = value;
}

function persistListFilters(section, fields) {
  const params = new URLSearchParams();
  for (const [id, name] of fields) {
    const value = $(`#${id}`)?.value?.trim();
    if (value) params.set(name, value);
  }
  const next = `${section}${params.size ? `?${params}` : ""}`;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
}

function renderInbox() {
  syncFilterFromRoute("inbox-search", "search");
  syncFilterFromRoute("inbox-filter", "status");
  const term = $("#inbox-search").value.trim().toLowerCase();
  const status = $("#inbox-filter").value;
  const items = state.data.intake.filter((item) => (!status || item.status === status)
    && [item.name, item.email, item.title, item.service].some((value) => String(value || "").toLowerCase().includes(term)));
  $("#inbox-table").innerHTML = items.length ? items.map((item) => `<tr class="clickable-table-row" tabindex="0" data-route="inbox/${item.id}"><td><strong>${escapeHtml(item.name)}${demoBadge(item)}</strong><small>${escapeHtml(item.email)}</small></td><td>${escapeHtml(item.title || item.service || "General enquiry")}</td><td>${formatDate(item.created_at)}</td><td>${badge(item.status)}</td><td>${icon("solar:arrow-right-linear")}</td></tr>`).join("") : `<tr><td colspan="5">${emptyState("No enquiries match", "New website enquiries will appear here automatically.")}</td></tr>`;
}

function projectProgress(project) {
  const milestones = project.milestones || [];
  if (!milestones.length) return 0;
  return Math.round((milestones.filter((item) => ["approved", "completed"].includes(item.status)).length / milestones.length) * 100);
}

function renderProjects() {
  syncFilterFromRoute("project-search", "search");
  syncFilterFromRoute("project-filter", "status");
  const term = $("#project-search").value.trim().toLowerCase();
  const status = $("#project-filter").value;
  const projects = state.data.projects.filter((project) => (status === "archived" ? Boolean(project.archived_at) : !project.archived_at && (!status || project.status === status))
    && [project.title, project.clients?.name, project.service].some((value) => String(value || "").toLowerCase().includes(term)));
  $("#project-grid").innerHTML = projects.length ? projects.map((project) => {
    const progress = projectProgress(project);
    return `<button class="project-card clickable-card" type="button" data-route="projects/${project.id}">${project.archived_at ? badge("archived") : badge(project.status)}${demoBadge(project)}<h3>${escapeHtml(project.title)}</h3><p class="muted">${escapeHtml(project.clients?.name || "No client")} · ${escapeHtml(project.service || "General project")}</p><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%"></span></div><div class="meta"><span>${progress}% complete</span><span>Due ${formatDate(project.due_date)}</span></div><span class="button secondary wide-button">Open project</span></button>`;
  }).join("") : emptyState("No projects match", "Adjust the filters or create a new client project.", routeButton("projects/new", "New project", "primary"));
}

function clientProjects(clientId) {
  return state.data.projects.filter((project) => project.client_id === clientId);
}

function clientInvoices(clientId) {
  return state.data.invoices.filter((invoice) => invoice.client_id === clientId);
}

function totalsByCurrency(invoices) {
  return invoices.reduce((totals, invoice) => {
    totals[invoice.currency] = (totals[invoice.currency] || 0) + Number(invoice.total || 0);
    return totals;
  }, {});
}

function moneyTotals(totals, empty = "None") {
  const values = Object.entries(totals);
  return values.length ? values.map(([currency, total]) => money(total, currency)).join(" · ") : empty;
}

function clientPaidTotals(clientId) {
  const invoiceIds = new Set(clientInvoices(clientId).map((invoice) => invoice.id));
  return totalsByCurrency(state.data.payments.filter((payment) => invoiceIds.has(payment.invoice_id) && payment.status === "recorded").map((payment) => ({ currency: payment.currency, total: payment.amount })));
}

function clientOutstandingTotals(clientId) {
  return totalsByCurrency(clientInvoices(clientId).map((invoice) => ({ currency: invoice.currency, total: invoiceBalance(invoice).outstanding })).filter((invoice) => invoice.total > 0));
}

function crmCurrencies() {
  return [...new Set(state.data.invoices.map((invoice) => invoice.currency).filter(Boolean))].sort();
}

function crmCurrencyEntries(value) {
  if (Array.isArray(value)) return value;
  return Object.entries(value || {}).map(([currency, total]) => ({ currency, total }));
}

function syncSelectOptions(select, options, defaultLabel) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>${options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderCrmChart() {
  const months = state.data.crm?.months || state.data.crm?.monthly || [];
  const select = $("#crm-chart-currency");
  const currencies = crmCurrencies();
  syncSelectOptions(select, currencies, "Clients only");
  const currency = select.value;
  const clientMax = Math.max(1, ...months.map((item) => Number(item.clientsWorked || 0)));
  const revenueValues = months.map((item) => Number(crmCurrencyEntries(item.revenue).find((entry) => entry.currency === currency)?.total || 0));
  const revenueMax = Math.max(1, ...revenueValues);
  $("#crm-chart").innerHTML = months.length ? months.map((item, index) => {
    const label = new Intl.DateTimeFormat("en-NG", { month: "short" }).format(new Date(`${item.month}T00:00:00`));
    const clients = Number(item.clientsWorked ?? item.clients ?? 0);
    const revenue = revenueValues[index];
    return `<button class="crm-month" type="button" data-route="clients?worked=${escapeHtml(item.month)}" aria-label="${label}: ${clients} clients${currency ? `, ${money(revenue, currency)} paid` : ""}"><div class="crm-bars"><span class="client-bar" style="height:${Math.max(4, clients / clientMax * 100)}%"></span>${currency ? `<span class="revenue-bar" style="height:${Math.max(revenue ? 4 : 0, revenue / revenueMax * 100)}%"></span>` : ""}</div><strong>${clients}</strong><small>${label}</small>${currency ? `<em>${money(revenue, currency)}</em>` : ""}</button>`;
  }).join("") : emptyState("No monthly activity yet", "Projects and paid invoices will build this chart over time.");
}

function renderClients() {
  syncSelectOptions($("#client-service-filter"), [...new Set(state.data.projects.map((project) => project.service).filter(Boolean))].sort(), "All services");
  syncSelectOptions($("#client-currency-filter"), crmCurrencies(), "Any currency");
  syncFilterFromRoute("client-search", "search");
  syncFilterFromRoute("client-stage-filter", "stage");
  syncFilterFromRoute("client-smart-filter", "filter");
  syncFilterFromRoute("client-service-filter", "service");
  syncFilterFromRoute("client-currency-filter", "currency");
  syncFilterFromRoute("client-min-paid", "minPaid");
  const term = $("#client-search").value.trim().toLowerCase();
  const stage = $("#client-stage-filter").value;
  const smart = $("#client-smart-filter").value;
  const service = $("#client-service-filter").value;
  const currency = $("#client-currency-filter").value;
  const minPaid = Number($("#client-min-paid").value || 0);
  const crm = state.data.crm || {};
  $("#crm-metrics").innerHTML = [
    ["Active clients", crm.activeClients ?? crm.active_clients ?? 0, "With current work", "clients?filter=active"],
    ["Worked with this month", crm.clientsWorkedThisMonth ?? crm.worked_this_month ?? 0, `${crm.newClientsThisMonth || 0} new`, `clients?worked=${new Date().toISOString().slice(0, 7)}-01`],
    ["Paid this month", moneyTotals(Object.fromEntries(crmCurrencyEntries(crm.paidThisMonth ?? crm.paid_this_month).map((item) => [item.currency, item.total])), "No payments"), "Separated by currency", "invoices?status=paid"],
    ["Outstanding", moneyTotals(Object.fromEntries(crmCurrencyEntries(crm.outstanding).map((item) => [item.currency, item.total])), "Nothing due"), "Open and uncollectible", "clients?filter=outstanding"],
  ].map(([label, value, note, route]) => `<button class="metric clickable-card" type="button" data-route="${route}"><span>${label}</span><strong>${escapeHtml(value)}</strong><small>${note}</small></button>`).join("");
  renderCrmChart();
  const workedMonth = parseRoute().params.get("worked");
  const clients = state.data.clients.filter((client) => {
    const projects = clientProjects(client.id);
    const invoices = clientInvoices(client.id);
    const paid = clientPaidTotals(client.id);
    const searchable = [client.name, client.email, client.company, ...(client.tags || []), ...projects.map((project) => project.service)];
    const isActive = projects.some((project) => !project.archived_at && ["active", "on_hold"].includes(project.status));
    const hasOutstanding = invoices.some((invoice) => invoiceBalance(invoice).outstanding > 0 && !["draft", "void"].includes(invoice.status));
    const followUpDue = client.next_follow_up_at && new Date(client.next_follow_up_at) <= new Date();
    const overlapsMonth = !workedMonth || projects.some((project) => {
      const monthStart = new Date(`${workedMonth}T00:00:00`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const start = new Date(project.start_date || project.created_at);
      const end = new Date(project.due_date || project.start_date || project.created_at);
      return start < monthEnd && end >= monthStart;
    });
    return searchable.some((value) => String(value || "").toLowerCase().includes(term))
      && (!stage || client.relationship_stage === stage)
      && (!service || projects.some((project) => project.service === service))
      && (!currency || paid[currency] != null && Number(paid[currency]) >= minPaid)
      && (currency || !minPaid || Object.values(paid).some((value) => Number(value) >= minPaid))
      && overlapsMonth
      && (smart === "archived" ? Boolean(client.archived_at) : !client.archived_at)
      && (smart !== "active" || isActive)
      && (smart !== "repeat" || projects.length > 1)
      && (smart !== "outstanding" || hasOutstanding)
      && (smart !== "follow_up" || followUpDue);
  });
  $("#client-table").innerHTML = clients.length ? clients.map((client) => {
    const projects = clientProjects(client.id);
    const paid = clientPaidTotals(client.id);
    return `<tr class="clickable-table-row" tabindex="0" data-route="clients/${client.id}"><td><strong>${escapeHtml(client.name)}${demoBadge(client)}</strong><small>${escapeHtml(client.company || client.email || "No company added")}</small></td><td>${badge(client.archived_at ? "archived" : client.relationship_stage || "lead")}<small>${(client.tags || []).map((tag) => `#${escapeHtml(tag)}`).join(" ")}</small></td><td>${projects.length} project${projects.length === 1 ? "" : "s"}<small>${escapeHtml([...new Set(projects.map((project) => project.service).filter(Boolean))].join(", ") || "No work yet")}</small></td><td>${escapeHtml(moneyTotals(paid, "No payments"))}</td><td>${formatDate(client.next_follow_up_at)} ${icon("solar:arrow-right-linear")}</td></tr>`;
  }).join("") : `<tr><td colspan="5">${emptyState("No clients match", "Adjust the CRM filters or add a new client.", routeButton("clients/new", "Add client", "primary"))}</td></tr>`;
}

function renderInvoices() {
  syncFilterFromRoute("invoice-search", "search");
  syncFilterFromRoute("invoice-filter", "status");
  const term = $("#invoice-search").value.trim().toLowerCase();
  const status = $("#invoice-filter").value;
  const invoices = state.data.invoices.filter((invoice) => (!status || invoice.status === status)
    && [invoice.invoice_number, invoice.projects?.title, invoice.job_reference, invoice.clients?.name].some((value) => String(value || "").toLowerCase().includes(term)));
  $("#invoice-table").innerHTML = invoices.length ? invoices.map((invoice) => `<tr class="clickable-table-row" tabindex="0" data-route="invoices/${invoice.id}"><td><strong>${escapeHtml(invoice.invoice_number)}${demoBadge(invoice)}</strong><small>${escapeHtml(invoice.clients?.name || "")}</small></td><td>${escapeHtml(invoice.projects?.title || invoice.job_reference || "No project")}</td><td>${formatDate(invoice.due_date)}</td><td>${money(invoice.total, invoice.currency)}</td><td>${badge(invoice.status)}</td><td>${icon("solar:arrow-right-linear")}</td></tr>`).join("") : `<tr><td colspan="6">${emptyState("No invoices match", "Create an invoice for project or standalone work.", routeButton("invoices/new", "New invoice", "primary"))}</td></tr>`;
}

function renderPages() {
  syncFilterFromRoute("page-search", "search");
  syncFilterFromRoute("page-status", "status");
  const term = $("#page-search").value.trim().toLowerCase();
  const status = $("#page-status").value;
  const pages = state.data.pages.filter((page) => page.title.toLowerCase().includes(term) && (!status || cmsState(page) === status));
  const published = state.data.pages.filter((page) => cmsState(page) === "published").length;
  const changes = state.data.pages.filter((page) => cmsState(page) === "changes").length;
  $("#cms-status").textContent = `${published} published · ${changes} with changes to publish`;
  $("#page-grid").innerHTML = pages.length ? pages.map((page) => `<button class="cms-card clickable-card" type="button" data-route="pages/${page.id}">${cmsBadge(page)}<h3>${escapeHtml(page.slug === "global" ? "Site-wide content" : page.title)}</h3><p class="muted">${page.slug === "global" ? "Navigation, footer, team and shared sections" : `/${escapeHtml(page.slug)}`}</p><div class="meta"><span>Edited ${formatDate(page.updated_at)}</span><span>Published ${formatDate(page.published_at)}</span></div><span class="text-button">Open editor ${icon("solar:arrow-right-linear")}</span></button>`).join("") : emptyState("No pages match", "Try another search or publishing status.");
  renderCollections();
}

function globalPage() {
  return state.data.pages.find((page) => page.slug === "global");
}

function renderCollections() {
  const page = globalPage();
  const items = page?.content?.[state.collectionTab] || [];
  const singular = titleCase(state.collectionTab).replace(/s$/, "");
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.collectionTab === state.collectionTab));
  $("#collection-list").innerHTML = `<div class="section-tools">${routeButton(`collections/${state.collectionTab}/new`, `Add ${singular}`, "secondary", "solar:add-circle-linear")}</div>${items.length ? items.map((item, index) => `<button class="collection-item clickable-row" type="button" data-route="collections/${state.collectionTab}/${index}"><div class="collection-thumb">${item.image || item.logo ? `<img src="${escapeHtml(item.image || item.logo)}" alt="">` : icon("solar:document-text-linear")}</div><div class="collection-copy"><strong>${escapeHtml(item.name || item.question || `Untitled ${singular}`)}</strong><small>${escapeHtml(item.role || item.quote || item.answer || item.url || "")}</small></div>${icon("solar:arrow-right-linear")}</button>`).join("") : emptyState(`No ${state.collectionTab} yet`, `Add the first ${singular.toLowerCase()} to Site-wide content.`)}`;
}

function renderPortfolio() {
  syncFilterFromRoute("portfolio-search", "search");
  syncFilterFromRoute("portfolio-filter", "category");
  syncFilterFromRoute("portfolio-status", "status");
  const term = $("#portfolio-search").value.trim().toLowerCase();
  const category = $("#portfolio-filter").value;
  const status = $("#portfolio-status").value;
  const items = state.data.portfolio.filter((item) => (!category || item.category === category)
    && (!status || cmsState(item) === status)
    && [item.title, item.collection].some((value) => String(value || "").toLowerCase().includes(term)));
  $("#portfolio-summary").textContent = `${Math.min(items.length, state.portfolioVisible)} shown · ${items.length} matching · ${state.data.portfolio.length} total`;
  $("#portfolio-grid").innerHTML = items.length ? items.slice(0, state.portfolioVisible).map((item) => `<button class="portfolio-admin-card clickable-card" type="button" data-route="portfolio/${item.id}"><div class="portfolio-admin-media"><img src="${escapeHtml(item.thumbnail_src)}" alt="${escapeHtml(item.alt_text || item.title)}" loading="lazy" onerror="this.src='/assets/portfolio-fallback.svg'">${cmsBadge(item)}</div><div class="portfolio-admin-body"><p class="eyebrow">${escapeHtml(item.category)} · ${escapeHtml(item.year || "")}</p><h3>${escapeHtml(item.title)}</h3><p class="muted">${escapeHtml(item.collection || "No collection")}</p><span class="text-button">Open editor ${icon("solar:arrow-right-linear")}</span></div></button>`).join("") : emptyState("No portfolio items match", "Adjust the filters or add a portfolio item.", routeButton("portfolio/new", "Add portfolio item", "primary"));
  $("#portfolio-load-more").classList.toggle("hidden", items.length <= state.portfolioVisible);
}

function renderServices() {
  const published = state.data.services.filter((item) => cmsState(item) === "published").length;
  $("#service-status").textContent = `${published} published · ${state.data.services.length - published} drafts or changes`;
  $("#service-grid").innerHTML = state.data.services.length ? state.data.services.map((service) => `<button class="cms-card clickable-card" type="button" data-route="services/${service.id}">${cmsBadge(service)}<h3>${escapeHtml(service.title)}</h3><p class="muted">${escapeHtml(service.summary || "No summary")}</p><div class="meta"><span>Position ${service.position + 1}</span><span>Edited ${formatDate(service.updated_at)}</span></div><span class="text-button">Open editor ${icon("solar:arrow-right-linear")}</span></button>`).join("") : emptyState("No services yet", "Add the services that should appear on the website.", routeButton("services/new", "Add service", "primary"));
}

function renderMedia() {
  $("#media-grid").innerHTML = state.data.media.length ? state.data.media.map((asset) => {
    const isImage = asset.mime_type?.startsWith("image/");
    return `<button class="media-card clickable-card" type="button" data-route="media/${asset.id}"><div class="media-preview">${isImage ? `<img src="${escapeHtml(asset.public_url)}" alt="${escapeHtml(asset.alt_text)}" loading="lazy">` : icon(asset.mime_type === "application/pdf" ? "solar:document-text-linear" : "solar:videocamera-record-linear")}</div><div class="media-body"><strong>${escapeHtml(asset.internal_name)}</strong><small>${escapeHtml(asset.mime_type || "Unknown file")} · ${asset.size_bytes ? `${Math.round(asset.size_bytes / 1024)} KB` : "Size unknown"}</small><span class="text-button">Open details ${icon("solar:arrow-right-linear")}</span></div></button>`;
  }).join("") : emptyState("Media library is empty", "Upload an image, PDF, or short video.", routeButton("media/new", "Upload media", "primary"));
}

function renderTeam() {
  $("#team-table").innerHTML = state.data.profiles.length ? state.data.profiles.map((profile) => `<tr class="clickable-table-row" tabindex="0" data-route="team/${profile.id}"><td><strong>${escapeHtml(profile.full_name || "Unnamed account")}</strong><small>${escapeHtml(profile.id === state.profile.id ? "This is you" : "")}</small></td><td>${badge(profile.role)}</td><td>${profile.role === "client" ? "Assigned projects" : "Workspace"} ${icon("solar:arrow-right-linear")}</td></tr>`).join("") : `<tr><td colspan="3">${emptyState("No team profiles", "Team accounts appear after sign in or invitation.")}</td></tr>`;
}

const topActionMap = {
  projects: ["projects/new", "New project", "solar:add-circle-linear"],
  clients: ["clients/new", "Add client", "solar:user-plus-linear"],
  invoices: ["invoices/new", "New invoice", "solar:add-circle-linear"],
  portfolio: ["portfolio/new", "Add portfolio", "solar:gallery-add-linear"],
  services: ["services/new", "Add service", "solar:add-circle-linear"],
  media: ["media/new", "Upload media", "solar:upload-linear"],
};

function renderTopAction() {
  const config = topActionMap[state.view];
  const canManageProjects = ["owner", "project_manager"].includes(state.profile.role);
  if (["projects", "clients"].includes(state.view) && !canManageProjects) {
    $("#top-actions").innerHTML = "";
    return;
  }
  $("#top-actions").innerHTML = config ? routeButton(config[0], config[1], "primary", config[2]) : "";
}

function renderNotFound(parent, label) {
  showRecordView("Not found");
  $("#record-screen").innerHTML = recordHeader(parent, `Back to ${label}`, "This record is unavailable", "It may have been removed, or your account may not have access.") + emptyState("Nothing to show", "Return to the list and choose another record.");
}

function renderClientRoute(segments, params) {
  const id = segments[1];
  const action = segments[2];
  if (id === "new") {
    const intake = state.data.intake.find((item) => item.id === params.get("intake"));
    return renderClientForm(null, intake ? { name: intake.name, email: intake.email, phone: intake.phone, notes: intake.message } : null);
  }
  const client = state.data.clients.find((item) => item.id === id);
  if (!client) return renderNotFound("clients", "clients");
  if (action === "edit") return renderClientForm(client);
  showRecordView(client.name);
  const projects = clientProjects(client.id);
  const invoices = clientInvoices(client.id);
  const activity = state.data.activities.filter((item) => (item.entity_type === "client" && item.entity_id === client.id)
    || projects.some((project) => project.id === item.project_id));
  const tabs = ["overview", "projects", "billing", "activity", "notes"];
  const tab = tabs.includes(params.get("tab")) ? params.get("tab") : "overview";
  const paid = clientPaidTotals(client.id);
  const outstanding = clientOutstandingTotals(client.id);
  const datedProjects = [...projects].sort((a, b) => new Date(a.start_date || a.created_at) - new Date(b.start_date || b.created_at));
  const tabMarkup = tabs.map((value) => `<button type="button" class="${tab === value ? "active" : ""}" ${tab === value ? 'aria-current="page"' : ""} data-route="clients/${client.id}?tab=${value}">${value === "notes" ? "Notes & follow-up" : titleCase(value)}</button>`).join("");
  let panel = "";
  if (tab === "overview") {
    panel = `<div class="crm-profile-summary"><article><span>Lifetime paid</span><strong>${escapeHtml(moneyTotals(paid, "No payments"))}</strong></article><article><span>Outstanding</span><strong>${escapeHtml(moneyTotals(outstanding, "Nothing due"))}</strong></article><article><span>First project</span><strong>${datedProjects[0] ? formatDate(datedProjects[0].start_date || datedProjects[0].created_at) : "No projects"}</strong></article><article><span>Latest project</span><strong>${datedProjects.at(-1) ? formatDate(datedProjects.at(-1).start_date || datedProjects.at(-1).created_at) : "No projects"}</strong></article></div><div class="detail-grid"><section class="panel"><p class="eyebrow">Contact</p><h3>Client information</h3><dl class="detail-list"><div><dt>Email</dt><dd>${escapeHtml(client.email || "Not provided")}</dd></div><div><dt>Phone</dt><dd>${escapeHtml(client.phone || "Not provided")}</dd></div><div><dt>Company</dt><dd>${escapeHtml(client.company || "Not provided")}</dd></div><div><dt>Relationship</dt><dd>${badge(client.relationship_stage || "lead")}</dd></div></dl></section><section class="panel"><p class="eyebrow">Services delivered</p><h3>${projects.length} project${projects.length === 1 ? "" : "s"}</h3><div class="tag-list">${[...new Set(projects.map((project) => project.service).filter(Boolean))].map((service) => `<span class="tag">${escapeHtml(service)}</span>`).join("") || '<span class="muted">No services recorded yet.</span>'}</div></section></div>`;
  } else if (tab === "projects") {
    panel = `<section class="panel"><div class="panel-head"><div><p class="eyebrow">Work history</p><h3>Projects</h3></div>${routeButton(`projects/new?client=${client.id}`, "Create project", "primary")}</div>${projects.length ? projects.map((project) => `<button class="item-row clickable-row" type="button" data-route="projects/${project.id}"><div><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.service || "General project")} · ${formatDate(project.start_date)} to ${formatDate(project.due_date)} · ${money(project.budget, project.currency)}</small></div>${project.archived_at ? badge("archived") : badge(project.status)}</button>`).join("") : emptyState("No projects yet", "Create a project when this client is ready.")}</section>`;
  } else if (tab === "billing") {
    panel = `<div class="crm-profile-summary"><article><span>Paid</span><strong>${escapeHtml(moneyTotals(paid, "No payments"))}</strong></article><article><span>Outstanding</span><strong>${escapeHtml(moneyTotals(outstanding, "Nothing due"))}</strong></article></div><section class="panel"><div class="panel-head"><div><p class="eyebrow">Billing history</p><h3>Invoices</h3></div></div>${invoices.length ? invoices.map((invoice) => `<button class="item-row clickable-row" type="button" data-route="invoices/${invoice.id}"><div><strong>${escapeHtml(invoice.invoice_number)}</strong><small>${escapeHtml(invoice.projects?.title || "Project")} · ${money(invoice.total, invoice.currency)} · ${formatDate(invoice.paid_at || invoice.due_date)}</small></div>${badge(invoice.status)}</button>`).join("") : emptyState("No invoices", "Invoices linked to this client will appear here.")}</section>`;
  } else if (tab === "activity") {
    panel = activityMarkup(activity);
  } else {
    panel = `<section class="panel"><p class="eyebrow">Relationship management</p><h3>Notes and follow-up</h3><dl class="detail-list"><div><dt>Last contact</dt><dd>${formatDate(client.last_contacted_at)}</dd></div><div><dt>Next follow-up</dt><dd>${formatDate(client.next_follow_up_at)}</dd></div><div><dt>Tags</dt><dd>${(client.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(" ") || "No tags"}</dd></div><div><dt>Notes</dt><dd>${escapeHtml(client.notes || "No notes yet.")}</dd></div></dl>${routeButton(`clients/${client.id}/edit`, "Update relationship", "primary")}</section>`;
  }
  const archived = Boolean(client.archived_at);
  $("#record-screen").innerHTML = recordHeader("clients", "Clients", client.name, `${client.company || "Client profile"} · ${titleCase(client.relationship_stage || "lead")}`, `${!archived ? routeButton(`projects/new?client=${client.id}`, "Create project", "primary", "solar:add-circle-linear") : ""}${routeButton(`clients/${client.id}/edit`, "Edit client")}<button class="button ${archived ? "secondary" : "destructive"}" type="button" data-archive-client="${client.id}" data-archived="${archived}">${archived ? "Restore client" : "Archive client"}</button>`)
    + `${archived ? `<div class="archive-banner">${icon("solar:archive-linear")}<div><strong>Archived client</strong><p>This history remains available for reporting. Restore the client to start new work.</p></div></div>` : ""}<div class="record-tabs">${tabMarkup}</div>${panel}`;
}

function renderClientForm(client = null, prefill = null) {
  const values = client || prefill || {};
  showRecordView(client ? "Edit client" : "Add client");
  const fields = field("Client name", "name", "text", { required: true, value: values.name })
    + field("Company", "company", "text", { value: values.company })
    + field("Email", "email", "email", { value: values.email })
    + field("Phone", "phone", "tel", { value: values.phone })
    + field("Relationship", "relationship_stage", "select", { value: values.relationship_stage || "lead", items: ["lead", "current", "past", "on_hold"].map((value) => ({ value, label: titleCase(value) })) })
    + field("Tags", "tags", "text", { value: (values.tags || []).join(", "), placeholder: "retainer, events, repeat" })
    + field("Last contact", "last_contacted_at", "date", { value: values.last_contacted_at?.slice?.(0, 10) })
    + field("Next follow-up", "next_follow_up_at", "date", { value: values.next_follow_up_at?.slice?.(0, 10) })
    + field("Notes", "notes", "textarea", { wide: true, value: values.notes });
  $("#record-screen").innerHTML = formShell("client", client ? "Edit client" : "Add a client", "Only the client name is required. Add the rest whenever it is available.", fields, client ? `clients/${client.id}` : "clients", client ? "Save changes" : "Add client");
  const form = $("[data-record-form]");
  form.dataset.id = client?.id || "";
}

function renderProjectRoute(segments, params) {
  const id = segments[1];
  const action = segments[2];
  if (id === "new") {
    const intake = state.data.intake.find((item) => item.id === params.get("intake"));
    const matchedClient = intake ? state.data.clients.find((client) => client.email?.toLowerCase() === intake.email?.toLowerCase()) : null;
    return renderProjectForm(null, params.get("client") || matchedClient?.id || "", intake || null);
  }
  const project = state.data.projects.find((item) => item.id === id);
  if (!project) return renderNotFound("projects", "projects");
  if (!project.archived_at && action === "edit") return renderProjectForm(project);
  if (!project.archived_at && action === "milestones" && segments[3] === "new") return renderMilestoneForm(project);
  if (!project.archived_at && action === "milestones" && segments[4] === "edit") {
    const milestone = state.data.milestones.find((item) => item.id === segments[3] && item.project_id === project.id);
    return milestone ? renderMilestoneForm(project, milestone) : renderNotFound(`projects/${project.id}`, "project");
  }
  if (!project.archived_at && action === "deliverables" && segments[3] === "new") return renderDeliverableForm(project, params.get("milestone"));
  if (!project.archived_at && action === "deliverables" && segments[4] === "edit") {
    const milestone = state.data.milestones.find((item) => item.project_id === project.id && item.deliverables?.some((deliverable) => deliverable.id === segments[3]));
    const deliverable = milestone?.deliverables?.find((item) => item.id === segments[3]);
    return deliverable ? renderDeliverableForm(project, milestone.id, deliverable) : renderNotFound(`projects/${project.id}`, "project");
  }
  showRecordView(project.title);
  const isArchived = Boolean(project.archived_at);
  const tabs = ["overview", "delivery", "billing", "access", "activity"];
  const tab = tabs.includes(params.get("tab")) ? params.get("tab") : "overview";
  const invoices = state.data.invoices.filter((item) => item.project_id === project.id);
  const invites = state.data.invitations.filter((item) => item.project_id === project.id);
  const members = state.data.members.filter((item) => item.project_id === project.id);
  const activity = state.data.activities.filter((item) => item.project_id === project.id);
  const progress = projectProgress(project);
  const milestones = [...(project.milestones || [])].sort((a, b) => a.position - b.position);
  const tabMarkup = tabs.map((value) => `<button type="button" class="${tab === value ? "active" : ""}" ${tab === value ? 'aria-current="page"' : ""} data-route="projects/${project.id}?tab=${value}">${value === "access" ? "Client access" : titleCase(value)}</button>`).join("");
  let panel = "";
  if (tab === "overview") {
    panel = `<section class="panel"><p class="eyebrow">Overview</p><h3>${escapeHtml(project.service || "General project")}</h3><p class="muted">${escapeHtml(project.description || "No project description yet.")}</p><div class="progress"><span style="width:${progress}%"></span></div></section>`;
  } else if (tab === "delivery") {
    panel = `<section class="panel"><div class="panel-head"><div><p class="eyebrow">Delivery plan</p><h3>Milestones and deliverables</h3></div>${!isArchived ? routeButton(`projects/${project.id}/milestones/new`, "Add milestone", "primary") : ""}</div>${milestones.length ? milestones.map((milestone) => `<article class="timeline-item"><div class="timeline-top"><div><strong>${escapeHtml(milestone.title)}</strong><small class="muted">Due ${formatDate(milestone.due_date)}</small></div><div class="inline-actions">${badge(milestone.status)}${!isArchived ? routeButton(`projects/${project.id}/milestones/${milestone.id}/edit`, "Edit", "ghost") : ""}</div></div>${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ""}${(milestone.deliverables || []).map((item) => `<div class="deliverable"><div class="timeline-top"><a href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener"><strong>${escapeHtml(item.title)}</strong></a><div class="inline-actions">${badge(item.status)}${!isArchived ? routeButton(`projects/${project.id}/deliverables/${item.id}/edit`, "Edit", "ghost") : ""}</div></div><small class="muted">Version ${item.version}${item.client_note ? ` · Client: ${escapeHtml(item.client_note)}` : ""}</small></div>`).join("")}${!isArchived ? routeButton(`projects/${project.id}/deliverables/new?milestone=${milestone.id}`, "Share deliverable", "ghost") : ""}</article>`).join("") : emptyState("No milestones yet", isArchived ? "This archived project has no delivery plan." : "Add the first milestone to create the delivery plan.")}</section>`;
  } else if (tab === "billing") {
    panel = `<section class="panel"><div class="panel-head"><div><p class="eyebrow">Billing</p><h3>Invoices</h3></div>${!isArchived ? routeButton(`invoices/new?project=${project.id}`, "New invoice", "secondary") : ""}</div>${invoices.length ? invoices.map((invoice) => `<button class="item-row clickable-row" type="button" data-route="invoices/${invoice.id}"><div><strong>${escapeHtml(invoice.invoice_number)}</strong><small>${money(invoice.total, invoice.currency)}</small></div>${badge(invoice.status)}</button>`).join("") : emptyState("No invoices", "No invoices have been created for this project.")}</section>`;
  } else if (tab === "access") {
    panel = `<section class="panel"><div class="panel-head"><div><p class="eyebrow">Client access</p><h3>Invitations and members</h3></div></div>${!isArchived ? inviteForm(project.id) : ""}${inviteList(invites)}${members.length ? `<div class="member-list">${members.map((member) => `<div class="item-row"><div><strong>${escapeHtml(member.profiles?.full_name || "Member")}</strong><small>${escapeHtml(member.member_role)}</small></div>${badge("active")}</div>`).join("")}</div>` : ""}</section>`;
  } else {
    panel = activityMarkup(activity);
  }
  const actions = `${!isArchived ? routeButton(`projects/${project.id}/edit`, "Edit project") : ""}<button class="button ${isArchived ? "secondary" : "destructive"}" type="button" data-archive-project="${project.id}" data-archived="${isArchived}">${isArchived ? "Restore project" : "Archive project"}</button>`;
  $("#record-screen").innerHTML = recordHeader("projects", "Projects", project.title, `${project.clients?.name || "No client"} · ${progress}% complete`, actions)
    + `${isArchived ? `<div class="archive-banner">${icon("solar:archive-linear")}<div><strong>Archived project</strong><p>This record is read-only but remains in client history and financial reports.</p></div></div>` : ""}`
    + `<div class="project-summary"><button type="button" class="clickable-card" data-route="clients/${project.client_id}"><span class="muted">Client</span><strong>${escapeHtml(project.clients?.name || "Not assigned")}</strong></button><div><span class="muted">Due</span><strong>${formatDate(project.due_date)}</strong></div><div><span class="muted">Budget</span><strong>${money(project.budget, project.currency)}</strong></div><div><span class="muted">Status</span>${badge(project.status)}</div></div>`
    + `<div class="record-tabs">${tabMarkup}</div>${panel}`;
}

function renderProjectForm(project = null, clientId = "", intake = null) {
  showRecordView(project ? "Edit project" : "New project");
  const selectedClient = project?.client_id || clientId;
  const fields = field("Project title", "title", "text", { required: true, value: project?.title || intake?.title || (intake ? `${intake.name} project` : ""), wide: true })
    + field("Client", "client_id", "select", { value: selectedClient, items: [{ value: "", label: "Select a client or add one below" }, ...state.data.clients.filter((client) => !client.archived_at || client.id === selectedClient).map((client) => ({ value: client.id, label: client.name }))] })
    + field("Service", "service", "text", { value: project?.service || intake?.service })
    + field("Budget", "budget", "number", { min: 0, value: project?.budget || String(intake?.budget || "").replace(/[^0-9.]/g, "") })
    + field("Currency", "currency", "select", { value: project?.currency || "NGN", items: [{ value: "NGN", label: "Nigerian naira (NGN)" }, { value: "USD", label: "US dollar (USD)" }, { value: "GBP", label: "British pound (GBP)" }] })
    + field("Start date", "start_date", "date", { value: project?.start_date })
    + field("Due date", "due_date", "date", { value: project?.due_date })
    + field("Status", "status", "select", { value: project?.status || "draft", items: ["draft", "active", "on_hold", "completed", "cancelled"].map((value) => ({ value, label: titleCase(value) })) })
    + field("Description", "description", "textarea", { wide: true, value: project?.description || intake?.message });
  const inlineClient = !project ? `<details class="form-section collapsible-section" ${intake && !selectedClient ? "open" : ""}><summary>Client not listed? Add them here</summary><div class="form-grid">${field("Client name", "new_client_name", "text", { value: intake?.name })}${field("Client email", "new_client_email", "email", { value: intake?.email })}${field("Client phone", "new_client_phone", "tel", { value: intake?.phone })}${field("Company", "new_client_company", "text")}</div></details>` : "";
  $("#record-screen").innerHTML = formShell("project", project ? "Edit project" : "Create a project", "Choose an existing client or add a new client in the same flow.", fields, project ? `projects/${project.id}` : "projects", project ? "Save changes" : "Create project").replace('<div class="upload-progress', `${inlineClient}<div class="upload-progress`);
  const form = $("[data-record-form]");
  form.dataset.id = project?.id || "";
  form.dataset.intakeId = intake?.id || "";
}

function renderMilestoneForm(project, milestone = null) {
  showRecordView(milestone ? "Edit milestone" : "Add milestone");
  const fields = field("Milestone title", "title", "text", { required: true, value: milestone?.title, wide: true })
    + field("Due date", "due_date", "date", { value: milestone?.due_date })
    + field("Status", "status", "select", { value: milestone?.status || "not_started", items: ["not_started", "in_progress", "awaiting_approval", "changes_requested", "approved", "completed"].map((value) => ({ value, label: titleCase(value) })) })
    + field("Description", "description", "textarea", { value: milestone?.description, wide: true })
    + field("Requires client approval", "requires_approval", "checkbox", { value: milestone?.requires_approval ?? true, wide: true });
  $("#record-screen").innerHTML = formShell("milestone", milestone ? "Edit milestone" : "Add a milestone", `Manage a delivery step for ${project.title}.`, fields, `projects/${project.id}`, milestone ? "Save milestone" : "Add milestone");
  const form = $("[data-record-form]");
  form.dataset.projectId = project.id;
  form.dataset.id = milestone?.id || "";
}

function renderDeliverableForm(project, milestoneId, deliverable = null) {
  const milestone = state.data.milestones.find((item) => item.id === milestoneId);
  showRecordView(deliverable ? "Edit deliverable" : "Share deliverable");
  if (!milestone) return renderNotFound(`projects/${project.id}`, "project");
  const fields = field("Deliverable title", "title", "text", { required: true, value: deliverable?.title, wide: true })
    + field("Version", "version", "number", { required: true, min: 1, value: deliverable?.version || 1 })
    + field("Status", "status", "select", { value: deliverable?.status || "shared", items: ["draft", "shared", "approved", "changes_requested", "archived"].map((value) => ({ value, label: titleCase(value) })) })
    + field("Secure file address", "file_url", "text", { required: true, value: deliverable?.file_url, wide: true })
    + field("Description", "description", "textarea", { value: deliverable?.description, wide: true });
  $("#record-screen").innerHTML = formShell("deliverable", deliverable ? "Edit deliverable" : "Share a deliverable", `Manage a file in ${milestone.title}.`, fields, `projects/${project.id}`, deliverable ? "Save deliverable" : "Share deliverable");
  const form = $("[data-record-form]");
  form.dataset.projectId = project.id;
  form.dataset.milestoneId = milestone.id;
  form.dataset.id = deliverable?.id || "";
}

function inviteForm(projectId) {
  return `<form class="compact-form" data-invite-form="${projectId}"><label>Client email<input type="email" name="email" required placeholder="client@example.com"></label><button class="button secondary" type="submit">${icon("solar:link-circle-linear")}Create secure link</button><div class="screen-message" role="alert"></div></form><div class="copy-fallback hidden" data-copy-fallback><label>Secure link<input readonly></label><small>Select and copy this link.</small></div>`;
}

function inviteList(invites) {
  if (!invites.length) return `<p class="muted">No invitation links have been created.</p>`;
  return `<div class="invite-list">${invites.map((invite) => {
    const status = invite.revoked_at ? "revoked" : invite.accepted_at ? "accepted" : new Date(invite.expires_at) < new Date() ? "expired" : "active";
    const url = `${window.location.origin}/portal?invite=${invite.token}`;
    return `<div class="item-row"><div><strong>${escapeHtml(invite.email)}</strong><small>${titleCase(status)} · Expires ${formatDate(invite.expires_at)}</small></div><div class="inline-actions">${status === "active" ? `<button class="text-button" type="button" data-copy-invite="${escapeHtml(url)}">Copy link</button><button class="text-button danger" type="button" data-revoke-invite="${invite.id}">Revoke</button>` : ""}${badge(status)}</div></div>`;
  }).join("")}</div>`;
}

function activityMarkup(activity) {
  return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">History</p><h3>Recent activity</h3></div></div>${activity.length ? activity.slice(0, 12).map((item) => `<div class="item-row"><div><strong>${escapeHtml(`${titleCase(item.entity_type)} ${titleCase(item.action)}`)}</strong><small>${escapeHtml(item.profiles?.full_name || "Workspace member")} · ${formatDateTime(item.created_at)}</small></div></div>`).join("") : emptyState("No activity yet", "Important changes will appear here.")}</section>`;
}

function revisionHistory(type, id) {
  const revisions = state.data.revisions.filter((item) => item.entity_type === type && item.entity_id === id);
  return `<details class="form-section collapsible-section revision-history"><summary>Published versions (${revisions.length})</summary>${revisions.length ? revisions.map((item) => `<div class="item-row"><div><strong>Version ${item.revision_number}</strong><small>${escapeHtml(item.profiles?.full_name || "Workspace member")} · ${formatDateTime(item.published_at)}</small></div>${badge("published")}</div>`).join("") : `<p class="muted">The first published version will appear here.</p>`}</details>`;
}

function intakePayload(payload = {}) {
  const entries = Object.entries(payload).filter(([, value]) => value != null && value !== "");
  if (!entries.length) return "";
  return `<section class="panel"><p class="eyebrow">Submitted details</p><dl class="detail-list">${entries.map(([key, value]) => `<div><dt>${escapeHtml(titleCase(key))}</dt><dd>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</dd></div>`).join("")}</dl></section>`;
}

function renderInboxRoute(segments) {
  const item = state.data.intake.find((entry) => entry.id === segments[1]);
  if (!item) return renderNotFound("inbox", "inbox");
  showRecordView("Enquiry");
  const archive = item.status !== "archived" && item.status !== "converted"
    ? `<button class="button destructive" type="button" data-archive-intake="${item.id}">Archive</button>`
    : "";
  const action = item.status === "new"
    ? `<button class="button primary" type="button" data-intake-status="${item.id}" data-next-status="reviewing">Start review</button>${archive}`
    : item.status === "reviewing"
      ? `${routeButton(`clients/new?intake=${item.id}`, "Create client", "secondary")}${routeButton(`projects/new?intake=${item.id}`, "Convert to project", "primary")}${archive}`
      : "";
  $("#record-screen").innerHTML = recordHeader("inbox", "Inbox", item.title || item.service || "Project enquiry", `${item.name} · Received ${formatDate(item.created_at)}`, action)
    + `<div class="detail-grid"><section class="panel"><p class="eyebrow">Contact</p><dl class="detail-list"><div><dt>Name</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>Email</dt><dd>${escapeHtml(item.email)}</dd></div><div><dt>Phone</dt><dd>${escapeHtml(item.phone || "Not provided")}</dd></div><div><dt>Status</dt><dd>${badge(item.status)}</dd></div></dl></section><section class="panel"><p class="eyebrow">Request</p><dl class="detail-list"><div><dt>Service</dt><dd>${escapeHtml(item.service || "Not specified")}</dd></div><div><dt>Budget</dt><dd>${escapeHtml(item.budget || "Not specified")}</dd></div><div><dt>Timeline</dt><dd>${escapeHtml(item.timeline || "Not specified")}</dd></div></dl></section></div><section class="panel"><p class="eyebrow">Message</p><p class="muted">${escapeHtml(item.message || "No additional message was provided.")}</p></section>${intakePayload(item.payload)}`;
}

function invoiceItemsFor(id) {
  return state.data.invoiceItems.filter((item) => item.invoice_id === id).sort((a, b) => a.position - b.position);
}

function adjustmentItemsFor(id) {
  return state.data.adjustmentItems.filter((item) => item.adjustment_id === id).sort((a, b) => a.position - b.position);
}

function invoiceBalance(invoice) {
  const debits = state.data.adjustments.filter((item) => item.invoice_id === invoice.id && item.kind === "debit" && item.status === "issued").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const credits = state.data.adjustments.filter((item) => item.invoice_id === invoice.id && item.kind === "credit" && item.status === "issued").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const paid = state.data.payments.filter((item) => item.invoice_id === invoice.id && item.status === "recorded").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const adjusted = Number(invoice.total || 0) + debits - credits;
  return { original: Number(invoice.total || 0), debits, credits, adjusted, paid, outstanding: Math.max(adjusted - paid, 0) };
}

function billingTabs(active) {
  return `<nav class="billing-tabs" aria-label="Billing sections">${[
    ["invoices", "Invoices"], ["receipts", "Receipts"], ["debit-notes", "Debit Notes"],
    ["credit-notes", "Credit Notes"], ["billing/settings", "Settings"],
  ].map(([route, label]) => `<button type="button" class="${active === route ? "active" : ""}" data-route="${route}">${label}</button>`).join("")}</nav>`;
}

function billingDocumentMarkup(type, record) {
  const liveInvoice = type === "invoice" ? record : state.data.invoices.find((item) => item.id === record.invoice_id);
  if (!liveInvoice) return inlineError("The linked invoice is unavailable.");
  const invoiceSnapshot = type === "invoice" ? record.document_snapshot : record.document_snapshot?.invoice_snapshot;
  const invoice = invoiceSnapshot?.invoice
    ? { ...liveInvoice, ...invoiceSnapshot.invoice, clients: invoiceSnapshot.client || liveInvoice.clients, projects: invoiceSnapshot.project || liveInvoice.projects }
    : liveInvoice;
  const settings = invoiceSnapshot?.settings || state.data.billingSettings || {};
  const documentTitle = ({ invoice: "INVOICE", receipt: "RECEIPT", debit: "DEBIT NOTE", credit: "CREDIT NOTE" })[type];
  const number = type === "invoice" ? invoice.invoice_number : type === "receipt" ? record.receipt_number : record.note_number || "DRAFT";
  const items = type === "invoice" ? invoiceSnapshot?.items || invoiceItemsFor(invoice.id)
    : type === "receipt" ? [{ description: `${record.method}${record.reference ? ` · ${record.reference}` : ""}`, quantity: 1, unit_price: record.amount }]
      : adjustmentItemsFor(record.id);
  const vat = type === "invoice" ? Number(invoice.tax || 0) : type === "receipt" ? 0 : Number(record.tax || 0);
  const total = type === "invoice" ? Number(invoice.total || 0) : type === "receipt" ? Number(record.amount || 0) : Number(record.total || 0);
  const client = invoice.clients || {};
  const dateValue = type === "invoice" ? invoice.issued_at || invoice.created_at : type === "receipt" ? record.paid_at : record.issued_at || record.created_at;
  const balance = invoiceBalance(liveInvoice);
  return `<section class="accounting-document" aria-label="${documentTitle} ${escapeHtml(number)}">
    <div class="document-watermark" aria-hidden="true">OLYMPUS</div>
    <header class="document-head"><div class="document-wordmark"><strong>OLYMPUS</strong><small>ATELIER</small></div><div><p>${escapeHtml(settings.address || "")}</p><p>Payer ID: ${escapeHtml(settings.payer_id || "—")}</p><p>TIN: ${escapeHtml(settings.tin || "—")}</p></div><h2>${documentTitle}</h2></header>
    <div class="document-parties"><div><span>CLIENT</span><strong>${escapeHtml(client.name || "Client")}</strong><small>${escapeHtml(client.company || client.email || "")}</small></div><div><span>DOCUMENT NO.</span><strong>${escapeHtml(number)}</strong><small>${formatDate(dateValue)}</small></div></div>
    ${type !== "invoice" && record.reason ? `<p class="document-reason"><strong>Reason:</strong> ${escapeHtml(record.reason)}</p>` : ""}
    <table class="document-lines"><thead><tr><th>ITEM</th><th>DELIVERABLES</th><th>PRICE</th></tr></thead><tbody>
      ${items.map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td><strong>${escapeHtml(item.description)}</strong>${Number(item.quantity) !== 1 ? `<small>${item.quantity} × ${money(item.unit_price, invoice.currency)}</small>` : ""}</td><td>${money(Number(item.quantity || 1) * Number(item.unit_price || 0), invoice.currency)}</td></tr>`).join("")}
      ${type !== "receipt" ? `<tr class="vat-row"><td></td><td>VAT ${type === "invoice" ? Number(invoice.vat_rate || 7.5) : Number(record.vat_rate || 7.5)}%</td><td>${money(vat, invoice.currency)}</td></tr>` : ""}
    </tbody></table>
    <div class="document-total"><span>${type === "receipt" ? "AMOUNT RECEIVED" : "TOTAL"}</span><strong>${money(total, invoice.currency)}</strong></div>
    ${type === "receipt" ? `<div class="document-balance"><span>Invoice</span><strong>${escapeHtml(invoice.invoice_number)}</strong><span>Remaining balance</span><strong>${money(record.document_snapshot?.balance_after ?? balance.outstanding, invoice.currency)}</strong></div>` : ""}
    <footer class="document-footer"><div><span>BANK DETAILS</span><strong>${escapeHtml(settings.bank_name || "")} / ${escapeHtml(settings.account_name || "")}</strong><small>${escapeHtml(settings.account_number || "")}</small></div><div><span>PAYMENT POLICY</span><strong>${Number(settings.deposit_percent || 70)}% deposit</strong><small>${escapeHtml(settings.policy_text || "")}</small></div><div><span>CONTACT</span><strong>${escapeHtml(settings.contact_phone || "")}</strong><small>${escapeHtml(settings.contact_email || "")}</small></div></footer>
  </section>`;
}

function renderBillingList(kind) {
  showRecordView(titleCase(kind.replace("-", " ")), "Billing");
  const isReceipt = kind === "receipts";
  const adjustmentKind = kind === "debit-notes" ? "debit" : kind === "credit-notes" ? "credit" : null;
  const records = isReceipt ? state.data.payments : state.data.adjustments.filter((item) => item.kind === adjustmentKind);
  const rows = records.map((record) => {
    const number = isReceipt ? record.receipt_number : record.note_number || "Draft note";
    const invoice = record.invoices || {};
    return `<tr class="clickable-table-row" tabindex="0" data-route="${isReceipt ? "receipts" : `${record.kind}-notes`}/${record.id}"><td><strong>${escapeHtml(number)}</strong><small>${escapeHtml(invoice.clients?.name || "")}</small></td><td>${escapeHtml(invoice.invoice_number || "")}</td><td>${formatDate(isReceipt ? record.paid_at : record.issued_at || record.created_at)}</td><td>${money(isReceipt ? record.amount : record.total, isReceipt ? record.currency : invoice.currency)}</td><td>${badge(record.status)}</td><td>${icon("solar:arrow-right-linear")}</td></tr>`;
  }).join("");
  $("#record-screen").innerHTML = billingTabs(kind) + `<section class="panel table-wrap"><table><thead><tr><th>Document</th><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6">${emptyState(`No ${kind.replace("-", " ")} yet`, isReceipt ? "Receipts are created automatically when a payment is recorded." : "Create a note from a finalized invoice.")}</td></tr>`}</tbody></table></section>`;
}

function renderPaymentRoute(segments) {
  const id = segments[1];
  if (segments[0] === "receipts") {
    const payment = state.data.payments.find((item) => item.id === id);
    if (!payment) return renderNotFound("receipts", "receipt");
    const invoice = state.data.invoices.find((item) => item.id === payment.invoice_id);
    showRecordView(payment.receipt_number, "Billing");
    $("#record-screen").innerHTML = recordHeader("receipts", "Receipts", payment.receipt_number, `${invoice?.clients?.name || "Client"} · ${titleCase(payment.status)}`, `<button class="button secondary" type="button" data-download-document="receipt" data-document-id="${payment.id}">${icon("solar:download-linear")}Download PDF</button>${payment.status === "recorded" ? `<button class="button destructive" type="button" data-void-payment="${payment.id}">Void receipt</button>` : ""}`) + billingDocumentMarkup("receipt", payment);
    return;
  }
  const invoice = state.data.invoices.find((item) => item.id === id);
  if (!invoice || segments[2] !== "payments" || segments[3] !== "new") return renderNotFound("invoices", "invoice");
  const balance = invoiceBalance(invoice);
  showRecordView("Record payment", "Billing");
  const fields = field("Amount received", "amount", "number", { required: true, min: .01, max: balance.outstanding, value: balance.outstanding, help: `Outstanding: ${money(balance.outstanding, invoice.currency)}` })
    + field("Payment date", "paid_at", "date", { required: true, value: new Date().toISOString().slice(0, 10) })
    + field("Payment method", "method", "select", { required: true, items: ["Bank transfer", "Card", "Cash", "Cheque", "Other"].map((value) => ({ value, label: value })) })
    + field("Reference (optional)", "reference") + field("Notes (optional)", "notes", "textarea", { wide: true });
  $("#record-screen").innerHTML = `<form class="record-form" data-record-form="payment" data-invoice-id="${invoice.id}">${recordHeader(`invoices/${invoice.id}`, "Invoice", "Record payment", `${invoice.invoice_number} · ${invoice.clients?.name || "Client"}`)}<section class="form-section"><div class="form-grid">${fields}</div></section><div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton(`invoices/${invoice.id}`, "Cancel", "secondary")}<button class="button primary" type="submit">Record payment & create receipt</button></div></form>`;
}

function renderAdjustmentRoute(kind, segments, params) {
  const routeName = `${kind}-notes`;
  const id = segments[1];
  if (id === "new") return renderAdjustmentForm(kind, null, params.get("invoice"));
  const adjustment = state.data.adjustments.find((item) => item.id === id && item.kind === kind);
  if (!adjustment) return renderNotFound(routeName, `${kind} note`);
  if (segments[2] === "edit" && adjustment.status === "draft") return renderAdjustmentForm(kind, adjustment, adjustment.invoice_id);
  const invoice = state.data.invoices.find((item) => item.id === adjustment.invoice_id);
  showRecordView(adjustment.note_number || `Draft ${titleCase(kind)} note`, "Billing");
  const actions = `${adjustment.status === "draft" ? routeButton(`${routeName}/${adjustment.id}/edit`, "Edit draft") + `<button class="button primary" type="button" data-issue-adjustment="${adjustment.id}">Issue note</button>` : `<button class="button secondary" type="button" data-download-document="${kind}" data-document-id="${adjustment.id}">${icon("solar:download-linear")}Download PDF</button>`}${adjustment.status === "issued" ? `<button class="button destructive" type="button" data-void-adjustment="${adjustment.id}">Void note</button>` : ""}`;
  $("#record-screen").innerHTML = recordHeader(routeName, titleCase(routeName.replace("-", " ")), adjustment.note_number || "Draft note", `${invoice?.invoice_number || ""} · ${titleCase(adjustment.status)}`, actions) + billingDocumentMarkup(kind, adjustment);
}

function renderAdjustmentForm(kind, adjustment, invoiceId) {
  const invoice = state.data.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return renderNotFound("invoices", "invoice");
  const items = adjustment ? adjustmentItemsFor(adjustment.id) : [{ description: "", quantity: 1, unit_price: 0 }];
  showRecordView(`${adjustment ? "Edit" : "Create"} ${titleCase(kind)} note`, "Billing");
  const fields = field("Reason", "reason", "text", { required: true, value: adjustment?.reason, wide: true })
    + field("VAT rate (%)", "vat_rate", "number", { min: 0, max: 100, value: adjustment?.vat_rate ?? state.data.billingSettings?.default_vat_rate ?? 7.5 })
    + field("Notes (optional)", "notes", "textarea", { value: adjustment?.notes, wide: true });
  $("#record-screen").innerHTML = `<form class="record-form" data-record-form="adjustment" data-id="${adjustment?.id || ""}" data-kind="${kind}" data-invoice-id="${invoice.id}">${recordHeader(`invoices/${invoice.id}`, "Invoice", `${adjustment ? "Edit" : "Create"} ${titleCase(kind)} note`, `${invoice.invoice_number} · ${invoice.clients?.name || "Client"}`)}<section class="form-section"><div class="form-grid">${fields}</div></section><section class="form-section"><div class="panel-head"><div><p class="eyebrow">Line items</p><h3>Adjustment details</h3></div><button class="button secondary" type="button" data-add-line-item>${icon("solar:add-circle-linear")}Add item</button></div><div id="invoice-line-items">${items.map(invoiceLineItem).join("")}</div></section><div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton(`invoices/${invoice.id}`, "Cancel", "secondary")}<button class="button secondary" type="submit">Save draft</button>${adjustment ? `<button class="button primary" type="button" data-issue-adjustment="${adjustment.id}">Issue note</button>` : ""}</div></form>`;
}

function renderBillingSettings() {
  const settings = state.data.billingSettings || {};
  showRecordView("Billing settings", "Billing");
  const fields = field("Business name", "business_name", "text", { required: true, value: settings.business_name })
    + field("Address", "address", "textarea", { required: true, value: settings.address, wide: true })
    + field("Payer ID", "payer_id", "text", { value: settings.payer_id }) + field("TIN", "tin", "text", { value: settings.tin })
    + field("Bank", "bank_name", "text", { value: settings.bank_name }) + field("Account name", "account_name", "text", { value: settings.account_name })
    + field("Account number", "account_number", "text", { value: settings.account_number }) + field("Contact phone", "contact_phone", "tel", { value: settings.contact_phone })
    + field("Contact email", "contact_email", "email", { value: settings.contact_email })
    + field("Default VAT rate (%)", "default_vat_rate", "number", { min: 0, max: 100, value: settings.default_vat_rate })
    + field("Deposit (%)", "deposit_percent", "number", { min: 0, max: 100, value: settings.deposit_percent })
    + field("Payment policy", "policy_text", "textarea", { value: settings.policy_text, wide: true })
    + field("Logo address (optional)", "logo_url", "text", { value: settings.logo_url }) + field("Watermark address (optional)", "watermark_url", "text", { value: settings.watermark_url });
  $("#record-screen").innerHTML = billingTabs("billing/settings") + `<form class="record-form" data-record-form="billing-settings">${recordHeader("invoices", "Billing", "Billing settings", "Changes affect drafts and future documents. Finalized documents keep their original snapshot.")}<section class="form-section"><div class="form-grid">${fields}</div></section><div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton("invoices", "Cancel", "secondary")}<button class="button primary" type="submit">Save billing settings</button></div></form>`;
}

function renderInvoiceRoute(segments, params) {
  const id = segments[1];
  const action = segments[2];
  if (id === "new") return renderInvoiceForm(null, params.get("project") || "");
  const invoice = state.data.invoices.find((item) => item.id === id);
  if (!invoice) return renderNotFound("invoices", "billing");
  if (action === "edit" && invoice.status === "draft") return renderInvoiceForm(invoice);
  showRecordView(invoice.invoice_number);
  const items = invoiceItemsFor(invoice.id);
  const activity = state.data.activities.filter((item) => item.entity_type === "invoice" && item.entity_id === invoice.id);
  const transitions = invoice.status === "draft"
    ? `<button class="button primary" type="button" data-transition-invoice="${invoice.id}" data-next-status="open">Finalize invoice</button>`
    : invoice.status === "open"
      ? `<button class="button primary" type="button" data-show-payment>Mark paid</button><button class="button destructive" type="button" data-transition-invoice="${invoice.id}" data-next-status="void">Void</button><button class="button secondary" type="button" data-transition-invoice="${invoice.id}" data-next-status="uncollectible">Uncollectible</button>`
      : invoice.status === "uncollectible"
        ? `<button class="button primary" type="button" data-show-payment>Mark paid</button><button class="button destructive" type="button" data-transition-invoice="${invoice.id}" data-next-status="void">Void</button>`
      : "";
  const workReference = invoice.projects?.title || invoice.job_reference || "";
  const workMarkup = workReference
    ? `<div><span>${invoice.project_id ? "Project" : "Work reference"}</span>${invoice.project_id ? `<button class="text-link" type="button" data-route="projects/${invoice.project_id}">${escapeHtml(workReference)}</button>` : `<strong>${escapeHtml(workReference)}</strong>`}<small>Due ${formatDate(invoice.due_date)}</small></div>`
    : `<div><span>Due date</span><strong>${formatDate(invoice.due_date)}</strong></div>`;
  $("#record-screen").innerHTML = recordHeader("invoices", "Billing", invoice.invoice_number, `${invoice.clients?.name || "Client"} · ${titleCase(invoice.status)}`, `${invoice.status === "draft" ? routeButton(`invoices/${invoice.id}/edit`, "Edit draft") : ""}${invoice.project_id ? `<a class="button secondary" href="/portal?project=${invoice.project_id}" target="_blank" rel="noopener">Open client view</a>` : ""}<button class="button secondary" type="button" data-download-invoice="${invoice.id}">${icon("solar:download-linear")}Download PDF</button>`)
    + `<section class="invoice-sheet"><div class="invoice-brand"><img src="/assets/olympus-logo.svg" alt="Olympus Atelier"><div><strong>Olympus Atelier</strong><small>Creative production and design</small></div></div><div class="invoice-meta"><div><span>Bill to</span><strong>${escapeHtml(invoice.clients?.name || "Client")}</strong><small>${escapeHtml(invoice.clients?.email || "")}</small></div>${workMarkup}</div><table class="invoice-lines"><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money(item.unit_price, invoice.currency)}</td><td>${money(Number(item.quantity) * Number(item.unit_price), invoice.currency)}</td></tr>`).join("")}</tbody></table><div class="invoice-totals"><div><span>Subtotal</span><strong>${money(invoice.subtotal, invoice.currency)}</strong></div><div><span>Tax</span><strong>${money(invoice.tax, invoice.currency)}</strong></div><div class="total"><span>Total</span><strong>${money(invoice.total, invoice.currency)}</strong></div></div>${invoice.notes ? `<p class="invoice-notes">${escapeHtml(invoice.notes)}</p>` : ""}${invoice.payment_reference ? `<p class="payment-reference"><strong>Payment reference:</strong> ${escapeHtml(invoice.payment_reference)}</p>` : ""}</section>`
    + `<div class="record-actions">${transitions}</div><form class="compact-form payment-form hidden" data-payment-form="${invoice.id}"><label>Payment reference or method<input name="payment_reference" required placeholder="Bank transfer, receipt number, etc."></label><button class="button primary" type="submit">Confirm payment</button><div class="screen-message"></div></form>`
    + activityMarkup(activity);
}

function renderInvoiceRouteV2(segments, params) {
  const id = segments[1];
  const action = segments[2];
  if (id === "new") return renderInvoiceForm(null, params.get("project") || "");
  if (action === "payments") return renderPaymentRoute(segments);
  const invoice = state.data.invoices.find((item) => item.id === id);
  if (!invoice) return renderNotFound("invoices", "billing");
  if (action === "edit" && invoice.status === "draft") return renderInvoiceForm(invoice);
  showRecordView(invoice.invoice_number);
  const activity = state.data.activities.filter((item) => item.entity_type === "invoice" && item.entity_id === invoice.id);
  const balance = invoiceBalance(invoice);
  const transitions = invoice.status === "draft"
    ? `<button class="button primary" type="button" data-transition-invoice="${invoice.id}" data-next-status="open">Finalize invoice</button>`
    : !["paid", "void"].includes(invoice.status)
      ? `${routeButton(`invoices/${invoice.id}/payments/new`, "Record payment", "primary")}${routeButton(`debit-notes/new?invoice=${invoice.id}`, "Debit note")}${routeButton(`credit-notes/new?invoice=${invoice.id}`, "Credit note")}<button class="button destructive" type="button" data-transition-invoice="${invoice.id}" data-next-status="void">Void</button>${invoice.status !== "uncollectible" ? `<button class="button secondary" type="button" data-transition-invoice="${invoice.id}" data-next-status="uncollectible">Uncollectible</button>` : ""}`
      : "";
  const ledgerRows = state.data.payments.filter((item) => item.invoice_id === invoice.id).map((item) => `<button class="item-row clickable-row" type="button" data-route="receipts/${item.id}"><div><strong>${escapeHtml(item.receipt_number)}</strong><small>${formatDate(item.paid_at)} · ${escapeHtml(item.method)}</small></div><div><strong>${money(item.amount, item.currency)}</strong>${badge(item.status)}</div></button>`).join("")
    + state.data.adjustments.filter((item) => item.invoice_id === invoice.id).map((item) => `<button class="item-row clickable-row" type="button" data-route="${item.kind}-notes/${item.id}"><div><strong>${escapeHtml(item.note_number || `Draft ${item.kind} note`)}</strong><small>${escapeHtml(item.reason)}</small></div><div><strong>${money(item.total, invoice.currency)}</strong>${badge(item.status)}</div></button>`).join("");
  const ledger = `<section class="panel ledger-panel"><div class="panel-head"><div><p class="eyebrow">Balance</p><h3>Invoice ledger</h3></div></div><div class="balance-grid"><div><span>Original</span><strong>${money(balance.original, invoice.currency)}</strong></div><div><span>Debits</span><strong>${money(balance.debits, invoice.currency)}</strong></div><div><span>Credits</span><strong>${money(balance.credits, invoice.currency)}</strong></div><div><span>Paid</span><strong>${money(balance.paid, invoice.currency)}</strong></div><div class="balance-due"><span>Outstanding</span><strong>${money(balance.outstanding, invoice.currency)}</strong></div></div>${ledgerRows || `<p class="muted">No payments or adjustments have been recorded.</p>`}</section>`;
  $("#record-screen").innerHTML = recordHeader("invoices", "Billing", invoice.invoice_number, `${invoice.clients?.name || "Client"} · ${titleCase(invoice.status)}`, `${invoice.status === "draft" ? routeButton(`invoices/${invoice.id}/edit`, "Edit draft") : ""}${invoice.project_id ? `<a class="button secondary" href="/portal?project=${invoice.project_id}" target="_blank" rel="noopener">Open client view</a>` : ""}<button class="button secondary" type="button" data-download-document="invoice" data-document-id="${invoice.id}">${icon("solar:download-linear")}Download PDF</button>`)
    + billingDocumentMarkup("invoice", invoice) + ledger + `<div class="record-actions">${transitions}</div>` + activityMarkup(activity);
}

function renderInvoiceForm(invoice = null, projectId = "") {
  showRecordView(invoice ? "Edit invoice" : "New invoice");
  const items = invoice ? invoiceItemsFor(invoice.id) : [{ description: "", quantity: 1, unit_price: 0 }];
  const fields = field("Invoice number", "invoice_number", "text", { required: true, value: invoice?.invoice_number || `OLY-${new Date().getFullYear()}-${String(state.data.invoices.length + 1).padStart(3, "0")}` })
    + field("Project", "project_id", "select", { value: invoice?.project_id || projectId, help: "Choose No project for standalone work.", items: [{ value: "", label: "No project" }, ...state.data.projects.filter((project) => !project.archived_at || project.id === invoice?.project_id).map((project) => ({ value: project.id, label: `${project.title} — ${project.clients?.name || "No client"}` }))] })
    + field("Currency", "currency", "select", { value: invoice?.currency || "NGN", items: ["NGN", "USD", "GBP"].map((value) => ({ value, label: value })) })
    + field("Due date", "due_date", "date", { required: true, value: invoice?.due_date })
    + field(`VAT amount (${Number(invoice?.vat_rate || state.data.billingSettings?.default_vat_rate || 7.5)}% default)`, "tax", "number", { min: 0, value: invoice?.tax || 0 })
    + field("Notes", "notes", "textarea", { wide: true, value: invoice?.notes });
  const standaloneFields = field("Client", "client_id", "select", { value: invoice?.client_id || "", items: [{ value: "", label: "Choose a client or add one below" }, ...state.data.clients.filter((client) => !client.archived_at || client.id === invoice?.client_id).map((client) => ({ value: client.id, label: client.name }))] })
    + field("Job or work reference (optional)", "job_reference", "text", { value: invoice?.job_reference || "" })
    + `<div class="wide form-divider"><span>Or add a new client</span></div>`
    + field("Client name", "new_client_name", "text")
    + field("Company (optional)", "new_client_company", "text")
    + field("Email (optional)", "new_client_email", "email")
    + field("Phone (optional)", "new_client_phone", "tel");
  $("#record-screen").innerHTML = `<form class="record-form" data-record-form="invoice" data-id="${invoice?.id || ""}">${recordHeader(invoice ? `invoices/${invoice.id}` : "invoices", "Back", invoice ? "Edit draft invoice" : "Create an invoice", "Create an invoice for a project or for standalone work.")}<div class="form-section"><div class="form-grid">${fields}</div></div><section class="form-section" data-standalone-invoice><p class="eyebrow">Client and work</p><div class="form-grid">${standaloneFields}</div></section><section class="form-section"><div class="panel-head"><div><p class="eyebrow">Line items</p><h3>What are you billing for?</h3></div><button class="button secondary" type="button" data-add-line-item>${icon("solar:add-circle-linear")}Add item</button></div><div id="invoice-line-items">${items.map(invoiceLineItem).join("")}</div><div class="live-total"><span>Estimated subtotal</span><strong id="invoice-live-total">${money(invoice?.subtotal || 0, invoice?.currency || "NGN")}</strong></div></section><div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton(invoice ? `invoices/${invoice.id}` : "invoices", "Cancel", "secondary")}<button class="button primary" type="submit">Save draft</button></div></form>`;
  if (!invoice) $('[data-record-form="invoice"]').dataset.autoVat = "true";
  syncInvoiceProjectFields();
  updateInvoiceTotal();
}

function syncInvoiceProjectFields() {
  const form = $('[data-record-form="invoice"]');
  if (!form) return;
  const projectId = $('[name="project_id"]', form)?.value || "";
  $("[data-standalone-invoice]", form)?.classList.toggle("hidden", Boolean(projectId));
  if (projectId) {
    const project = state.data.projects.find((item) => item.id === projectId);
    if (project && $('[name="client_id"]', form)) $('[name="client_id"]', form).value = project.client_id;
  }
}

function invoiceLineItem(item = {}) {
  return `<div class="invoice-line-item"><label class="line-description">Description<input name="line_description" required value="${escapeHtml(item.description || "")}" placeholder="Event photography, design work…"></label><label>Quantity<input name="line_quantity" type="number" min=".01" step=".01" required value="${Number(item.quantity || 1)}"></label><label>Unit price<input name="line_price" type="number" min="0" step=".01" required value="${Number(item.unit_price || 0)}"></label><button class="icon-button" type="button" data-remove-line-item aria-label="Remove line item">${icon("solar:trash-bin-trash-linear")}</button></div>`;
}

function updateInvoiceTotal() {
  const form = $('[data-record-form="invoice"]');
  if (!form) return;
  const quantities = $$('[name="line_quantity"]', form);
  const prices = $$('[name="line_price"]', form);
  const total = quantities.reduce((sum, input, index) => sum + Number(input.value || 0) * Number(prices[index]?.value || 0), 0);
  if (form.dataset.autoVat === "true" && $('[name="tax"]', form)) {
    $('[name="tax"]', form).value = (total * Number(state.data.billingSettings?.default_vat_rate || 7.5) / 100).toFixed(2);
  }
  if ($("#invoice-live-total")) $("#invoice-live-total").textContent = money(total, $('[name="currency"]', form)?.value || "NGN");
}

function renderPageRoute(segments) {
  const page = state.data.pages.find((item) => item.id === segments[1]);
  if (!page) return renderNotFound("pages", "pages");
  showRecordView(page.slug === "global" ? "Site-wide content" : page.title, "Website");
  const schema = pageSchemas[page.slug] || [];
  const main = schema.filter(([, , , group]) => !group);
  const contact = schema.filter(([, , , group]) => group === "contact");
  const advanced = schema.filter(([, , , group]) => group === "advanced");
  const renderFields = (items) => items.map(([label, path, type = "text"]) => type === "image"
    ? imageField(label, path, getPath(page.content || {}, path), page.title)
    : field(label, path, type, { value: getPath(page.content || {}, path), wide: type === "textarea" })).join("");
  $("#record-screen").innerHTML = `<form class="record-form cms-editor" data-record-form="page" data-id="${page.id}">${recordHeader("pages", "Pages", page.slug === "global" ? "Site-wide content" : page.title, "Make changes privately, preview the real website, then publish when ready.", `${cmsBadge(page)}`)}<section class="form-section"><p class="eyebrow">Main content</p><div class="form-grid">${renderFields(main)}</div></section>${contact.length ? `<details class="form-section collapsible-section" open><summary>Contact details</summary><div class="form-grid">${renderFields(contact)}</div></details>` : ""}<details class="form-section collapsible-section"><summary>Search and more options</summary><div class="form-grid">${renderFields(advanced)}${field("Google result title", "seo_title", "text", { value: page.seo_title, wide: true })}${field("Google result description", "seo_description", "textarea", { value: page.seo_description, wide: true })}</div></details>${revisionHistory("page", page.id)}<div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton("pages", "Cancel", "secondary")}<button class="button ghost" type="button" data-preview-current="page">${icon("solar:eye-linear")}Preview</button><button class="button secondary" type="submit">Save draft</button><button class="button primary" type="button" data-publish-current="page" data-id="${page.id}">Publish</button></div></form>`;
}

function renderServiceRoute(segments) {
  const id = segments[1];
  const service = id === "new" ? null : state.data.services.find((item) => item.id === id);
  if (id !== "new" && !service) return renderNotFound("services", "services");
  showRecordView(service ? service.title : "Add service", "Website");
  const fields = field("Service name", "title", "text", { required: true, value: service?.title, wide: true })
    + field("Short description", "summary", "textarea", { required: true, value: service?.summary, wide: true })
    + field("Full description", "description", "textarea", { value: service?.description, wide: true });
  $("#record-screen").innerHTML = `<form class="record-form cms-editor" data-record-form="service" data-id="${service?.id || ""}">${recordHeader("services", "Services", service ? service.title : "Add a service", "Use clear language clients will understand.", service ? cmsBadge(service) : "")}<section class="form-section"><div class="form-grid">${fields}</div></section>${service ? revisionHistory("service", service.id) : ""}<div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton("services", "Cancel", "secondary")}${service ? `<button class="button ghost" type="button" data-duplicate-current="service" data-id="${service.id}">Duplicate</button><button class="button ghost" type="button" data-move-current="service" data-id="${service.id}" data-direction="-1">Move up</button><button class="button ghost" type="button" data-move-current="service" data-id="${service.id}" data-direction="1">Move down</button>` : ""}<button class="button ghost" type="button" data-preview-current="service">Preview</button><button class="button secondary" type="submit">Save draft</button>${service ? `<button class="button primary" type="button" data-publish-current="service" data-id="${service.id}">Publish</button><button class="button destructive" type="button" data-archive-current="service" data-id="${service.id}">Archive</button>` : ""}</div></form>`;
}

function renderPortfolioRoute(segments) {
  const id = segments[1];
  const item = id === "new" ? null : state.data.portfolio.find((entry) => entry.id === id);
  if (id !== "new" && !item) return renderNotFound("portfolio", "portfolio");
  showRecordView(item ? item.title : "Add portfolio item", "Website");
  const fields = field("Project title", "title", "text", { required: true, value: item?.title, wide: true })
    + field("Category", "category", "select", { required: true, value: item?.category || "graphics", items: ["film", "events", "graphics", "editorial", "motion"].map((value) => ({ value, label: titleCase(value) })) })
    + field("Collection", "collection", "text", { value: item?.collection })
    + field("Year", "year", "number", { min: 2000, max: 2100, value: item?.year || new Date().getFullYear() })
    + field("Media type", "media_type", "select", { value: item?.media_type || "image", items: ["image", "video", "pdf"].map((value) => ({ value, label: titleCase(value) })) })
    + field("Description", "description", "textarea", { value: item?.description, wide: true })
    + field("Image description", "alt_text", "textarea", { required: true, value: item?.alt_text, wide: true })
    + imageField("Thumbnail", "thumbnail_src", item?.thumbnail_src, item?.alt_text || item?.title)
    + field("Feature this project", "featured", "checkbox", { value: item?.featured, wide: true });
  $("#record-screen").innerHTML = `<form class="record-form cms-editor" data-record-form="portfolio" data-id="${item?.id || ""}">${recordHeader("portfolio", "Portfolio", item ? item.title : "Add portfolio item", "The current image stays unless you deliberately replace it.", item ? cmsBadge(item) : "")}<section class="form-section"><div class="form-grid">${fields}</div></section><details class="form-section collapsible-section"><summary>Video, document and advanced options</summary><div class="form-grid">${field("Preview file address", "preview_src", "text", { value: item?.preview_src, wide: true })}${field("Original or external address", "original_url", "text", { value: item?.original_url, wide: true })}</div></details>${item ? revisionHistory("portfolio", item.id) : ""}<div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton("portfolio", "Cancel", "secondary")}${item ? `<button class="button ghost" type="button" data-duplicate-current="portfolio" data-id="${item.id}">Duplicate</button><button class="button ghost" type="button" data-move-current="portfolio" data-id="${item.id}" data-direction="-1">Move up</button><button class="button ghost" type="button" data-move-current="portfolio" data-id="${item.id}" data-direction="1">Move down</button>` : ""}<button class="button ghost" type="button" data-preview-current="portfolio">Preview</button><button class="button secondary" type="submit">Save draft</button>${item ? `<button class="button primary" type="button" data-publish-current="portfolio" data-id="${item.id}">Publish</button><button class="button destructive" type="button" data-archive-current="portfolio" data-id="${item.id}">Archive</button>` : ""}</div></form>`;
}

function renderMediaRoute(segments) {
  const id = segments[1];
  const asset = id === "new" ? null : state.data.media.find((item) => item.id === id);
  if (id !== "new" && !asset) return renderNotFound("media", "media");
  showRecordView(asset ? asset.internal_name : "Upload media", "Website");
  const preview = asset ? `<div class="media-detail-preview">${asset.mime_type?.startsWith("image/") ? `<img src="${escapeHtml(asset.public_url)}" alt="${escapeHtml(asset.alt_text)}">` : icon("solar:document-text-linear")}</div>` : "";
  const fields = field("Name in the library", "internal_name", "text", { required: true, value: asset?.internal_name, wide: true })
    + (!asset ? `<label class="wide">Choose file<input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,video/mp4,video/webm"></label>` : "")
    + field("Image description", "alt_text", "textarea", { required: true, value: asset?.alt_text, wide: true })
    + field("Caption (optional)", "caption", "textarea", { value: asset?.caption, wide: true });
  $("#record-screen").innerHTML = `<form class="record-form" data-record-form="media" data-id="${asset?.id || ""}">${recordHeader("media", "Media", asset ? asset.internal_name : "Upload media", "Give files clear names so they are easy to reuse.")}${preview}<section class="form-section"><div class="form-grid">${fields}</div></section><div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton("media", "Cancel", "secondary")}${asset ? `<button class="button ghost" type="button" data-copy-media="${escapeHtml(asset.public_url || "")}">Copy address</button>` : ""}<button class="button primary" type="submit">${asset ? "Save details" : "Upload file"}</button>${asset ? `<button class="button destructive" type="button" data-archive-media="${asset.id}">Archive</button>` : ""}</div></form>`;
}

function renderTeamRoute(segments) {
  const profile = state.data.profiles.find((item) => item.id === segments[1]);
  if (!profile) return renderNotFound("team", "team");
  showRecordView(profile.full_name || "Team member", "Administration");
  const roles = [
    ["owner", "Owner — full workspace access"],
    ["content_manager", "Content manager — website and media"],
    ["project_manager", "Project manager — clients and projects"],
    ["finance", "Finance — billing"],
    ["contributor", "Contributor — assigned work"],
    ["client", "Client — assigned projects only"],
  ];
  const fields = field("Name", "full_name", "text", { required: true, value: profile.full_name, wide: true })
    + field("Access role", "role", "select", { required: true, value: profile.role, items: roles.map(([value, label]) => ({ value, label })) });
  $("#record-screen").innerHTML = formShell("team", profile.full_name || "Team member", "Choose the access level that matches this person’s responsibilities.", fields, "team", "Save access");
  $("[data-record-form]").dataset.id = profile.id;
}

function renderCollectionRoute(segments) {
  const type = segments[1];
  const index = segments[2] === "new" ? -1 : Number(segments[2]);
  const page = globalPage();
  const existing = index >= 0 ? page?.content?.[type]?.[index] : null;
  const schema = collectionSchemas[type];
  if (!schema || !page || (index >= 0 && !existing)) return renderNotFound("pages", "pages");
  showRecordView(`${existing ? "Edit" : "Add"} ${titleCase(type).replace(/s$/, "")}`, "Website");
  const fields = schema.map(([label, name, fieldType = "text"]) => fieldType === "image"
    ? imageField(label, name, existing?.[name], existing?.name)
    : field(label, name, fieldType, { required: ["name", "question", "quote"].includes(name), value: existing?.[name], wide: fieldType === "textarea" })).join("");
  $("#record-screen").innerHTML = `<form class="record-form cms-editor" data-record-form="collection" data-collection-type="${type}" data-collection-index="${index}">${recordHeader("pages", "Pages", `${existing ? "Edit" : "Add"} ${titleCase(type).replace(/s$/, "")}`, "Save privately, preview on the real website, or publish this change live.")}<section class="form-section"><div class="form-grid">${fields}</div></section><div class="upload-progress hidden" id="upload-progress"><span></span></div><div id="screen-message" class="screen-message"></div><div class="sticky-actions">${routeButton("pages", "Cancel", "secondary")}<button class="button ghost" type="button" data-preview-current="collection">${icon("solar:eye-linear")}Preview</button><button class="button secondary" type="submit">Save draft</button><button class="button primary" type="button" data-publish-collection>Publish live</button>${existing ? `<button class="button destructive" type="button" data-remove-collection="${type}" data-index="${index}">Remove</button>` : ""}</div></form>`;
}

async function renderRoute() {
  const { segments, params } = parseRoute();
  state.route = segments;
  const section = segments[0] || "overview";
  const listSections = ["overview", "inbox", "projects", "clients", "invoices", "pages", "portfolio", "services", "media", "team"];
  if (segments.length === 1 && listSections.includes(section)) return showListView(section);
  if (section === "clients") return renderClientRoute(segments, params);
  if (section === "projects") return renderProjectRoute(segments, params);
  if (section === "inbox") return renderInboxRoute(segments);
  if (section === "invoices") return renderInvoiceRouteV2(segments, params);
  if (section === "receipts") return segments.length === 1 ? renderBillingList("receipts") : renderPaymentRoute(segments);
  if (section === "debit-notes") return segments.length === 1 ? renderBillingList("debit-notes") : renderAdjustmentRoute("debit", segments, params);
  if (section === "credit-notes") return segments.length === 1 ? renderBillingList("credit-notes") : renderAdjustmentRoute("credit", segments, params);
  if (section === "billing" && segments[1] === "settings") return renderBillingSettings();
  if (section === "pages") return renderPageRoute(segments);
  if (section === "services") return renderServiceRoute(segments);
  if (section === "portfolio") return renderPortfolioRoute(segments);
  if (section === "media") return renderMediaRoute(segments);
  if (section === "team") return renderTeamRoute(segments);
  if (section === "collections") return renderCollectionRoute(segments);
  showListView("overview");
}

async function uploadAsset(file, internalName, altText) {
  if (!file?.size) return null;
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await state.supabase.storage.from("site-media").upload(storagePath, file, { cacheControl: "31536000", upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicFile } = state.supabase.storage.from("site-media").getPublicUrl(storagePath);
  const { data: asset, error } = await state.supabase.from("media_assets").insert({
    storage_path: storagePath, public_url: publicFile.publicUrl,
    internal_name: internalName || file.name, alt_text: altText || "",
    mime_type: file.type, size_bytes: file.size, uploaded_by: state.profile.id,
  }).select("*").single();
  if (error) {
    await state.supabase.storage.from("site-media").remove([storagePath]);
    throw error;
  }
  return asset;
}

async function resolveImage(form, formData, name, title, alt) {
  const file = formData.get(`${name}_file`);
  if (file?.size) {
    $("#upload-progress")?.classList.remove("hidden");
    const asset = await uploadAsset(file, title, alt);
    return asset.public_url;
  }
  return formData.get(name) || "";
}

async function verifyPublishedCollection(type, index, item) {
  const response = await fetch(`/api/content?published=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("The change was published, but the live website could not be verified. Refresh and try once more.");
  }
  const payload = await response.json();
  const liveItems = payload?.pages?.global?.content?.[type] || [];
  const liveItem = index >= 0 ? liveItems[index] : liveItems.at(-1);
  const fields = (collectionSchemas[type] || []).map(([, name]) => name);
  const matches = liveItem && fields.every((name) => String(liveItem[name] || "") === String(item[name] || ""));
  if (!matches) {
    throw new Error("The draft was saved, but the public website has not received this change yet. Please publish again.");
  }
}

async function verifyPublishedEntity(type, id) {
  const response = await fetch(`/api/content?published=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("The change was published, but the live website could not be verified.");
  const payload = await response.json();
  let source;
  let live;
  if (type === "page") {
    source = state.data.pages.find((item) => item.id === id);
    live = payload?.pages?.[source?.slug];
    if (!source || !live
      || JSON.stringify(live.content || {}) !== JSON.stringify(source.content || {})
      || String(live.seo_title || "") !== String(source.seo_title || "")
      || String(live.seo_description || "") !== String(source.seo_description || "")) live = null;
  } else if (type === "service") {
    source = state.data.services.find((item) => item.id === id);
    live = payload?.services?.find((item) => item.id === id || item.slug === source?.slug);
    if (!source || !live || ["title", "summary", "description"].some((key) => String(live[key] || "") !== String(source[key] || ""))) live = null;
  } else if (type === "portfolio") {
    source = state.data.portfolio.find((item) => item.id === id);
    live = payload?.portfolioItems?.find((item) => item.id === id);
    if (!source || !live || ["title", "description", "thumbnail_src", "alt_text"].some((key) => String(live[key] || "") !== String(source[key] || ""))) live = null;
  }
  if (!live) throw new Error("The draft was saved, but the public website has not received this change yet. Please publish again.");
}

async function logActivity(projectId, action, entityType, entityId, metadata = {}) {
  await state.supabase.from("activities").insert({
    actor_id: state.profile.id, project_id: projectId || null,
    action, entity_type: entityType, entity_id: String(entityId || ""), metadata,
  });
}

async function saveRecordForm(form, { publishCollection = false } = {}) {
  const kind = form.dataset.recordForm;
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  const id = form.dataset.id || null;
  const submit = $('button[type="submit"]', form);
  submit.disabled = true;
  $("#screen-message").innerHTML = "";
  try {
    let destination;
    if (kind === "client") {
      const payload = {
        name: values.name.trim(), company: values.company || null, email: values.email || null,
        phone: values.phone || null, notes: values.notes || null,
        relationship_stage: values.relationship_stage || "lead",
        tags: String(values.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        last_contacted_at: values.last_contacted_at ? `${values.last_contacted_at}T00:00:00Z` : null,
        next_follow_up_at: values.next_follow_up_at ? `${values.next_follow_up_at}T00:00:00Z` : null,
      };
      const query = id ? state.supabase.from("clients").update(payload).eq("id", id).select("*").single() : state.supabase.from("clients").insert({ ...payload, created_by: state.profile.id }).select("*").single();
      const { data, error } = await query;
      if (error) throw error;
      await logActivity(null, id ? "updated" : "created", "client", data.id);
      const intakeId = parseRoute().params.get("intake");
      if (intakeId) await state.supabase.from("intake_submissions").update({ status: "reviewing" }).eq("id", intakeId);
      destination = `clients/${data.id}`;
      toast(id ? "Client changes saved." : "Client added.");
    } else if (kind === "project") {
      let resolvedClientId = values.client_id;
      if (!resolvedClientId && values.new_client_name?.trim()) {
        const { data: client, error: clientError } = await state.supabase.from("clients").insert({
          name: values.new_client_name.trim(),
          email: values.new_client_email || null,
          phone: values.new_client_phone || null,
          company: values.new_client_company || null,
          created_by: state.profile.id,
        }).select("*").single();
        if (clientError) throw clientError;
        resolvedClientId = client.id;
      }
      if (!resolvedClientId) throw new Error("Choose a client or add a new client below.");
      const payload = { title: values.title.trim(), client_id: resolvedClientId, service: values.service || null, description: values.description || null, budget: values.budget || null, currency: values.currency, start_date: values.start_date || null, due_date: values.due_date || null, status: values.status };
      const query = id ? state.supabase.from("projects").update(payload).eq("id", id).select("*").single() : state.supabase.from("projects").insert({ ...payload, intake_submission_id: form.dataset.intakeId || null, created_by: state.profile.id }).select("*").single();
      const { data, error } = await query;
      if (error) throw error;
      await logActivity(data.id, id ? "updated" : "created", "project", data.id);
      destination = `projects/${data.id}`;
      toast(id ? "Project changes saved." : "Project created.");
    } else if (kind === "milestone") {
      const payload = { project_id: form.dataset.projectId, title: values.title.trim(), due_date: values.due_date || null, description: values.description || null, status: values.status, requires_approval: formData.get("requires_approval") === "on", position: state.data.milestones.filter((item) => item.project_id === form.dataset.projectId).length };
      if (id) delete payload.position;
      const query = id ? state.supabase.from("milestones").update(payload).eq("id", id).select("*").single() : state.supabase.from("milestones").insert(payload).select("*").single();
      const { data, error } = await query;
      if (error) throw error;
      await logActivity(form.dataset.projectId, id ? "updated" : "created", "milestone", data.id);
      destination = `projects/${form.dataset.projectId}`;
      toast(id ? "Milestone saved." : "Milestone added.");
    } else if (kind === "deliverable") {
      const payload = { milestone_id: form.dataset.milestoneId, title: values.title.trim(), version: Number(values.version), file_url: values.file_url, description: values.description || null, status: values.status || "shared", uploaded_by: state.profile.id };
      const query = id ? state.supabase.from("deliverables").update(payload).eq("id", id).select("*").single() : state.supabase.from("deliverables").insert(payload).select("*").single();
      const { data, error } = await query;
      if (error) throw error;
      await logActivity(form.dataset.projectId, id ? "updated" : "shared", "deliverable", data.id);
      destination = `projects/${form.dataset.projectId}`;
      toast(id ? "Deliverable saved." : "Deliverable shared.");
    } else if (kind === "invoice") {
      const descriptions = $$('[name="line_description"]', form);
      const quantities = $$('[name="line_quantity"]', form);
      const prices = $$('[name="line_price"]', form);
      const items = descriptions.map((input, index) => ({ description: input.value, quantity: Number(quantities[index].value), unit_price: Number(prices[index].value) }));
      const newClient = values.new_client_name?.trim() ? {
        name: values.new_client_name.trim(),
        company: values.new_client_company || null,
        email: values.new_client_email || null,
        phone: values.new_client_phone || null,
      } : null;
      const { data, error } = await state.supabase.rpc("save_invoice_draft", {
        target_invoice_id: id, target_project_id: values.project_id || null,
        target_client_id: values.client_id || null, target_new_client: newClient,
        target_job_reference: values.job_reference || null,
        target_invoice_number: values.invoice_number, target_due_date: values.due_date,
        target_currency: values.currency || "NGN", target_tax: Number(values.tax || 0),
        target_notes: values.notes || "", target_items: items,
      });
      if (error) throw error;
      destination = `invoices/${data}`;
      toast("Invoice draft saved.");
    } else if (kind === "payment") {
      const paidAt = values.paid_at ? `${values.paid_at}T12:00:00Z` : new Date().toISOString();
      const { data, error } = await state.supabase.rpc("record_invoice_payment", {
        target_invoice_id: form.dataset.invoiceId,
        target_amount: Number(values.amount),
        target_paid_at: paidAt,
        target_method: values.method,
        target_reference: values.reference || null,
        target_notes: values.notes || null,
      });
      if (error) throw error;
      destination = `receipts/${data}`;
      toast("Payment recorded and receipt created.");
    } else if (kind === "adjustment") {
      const descriptions = $$('[name="line_description"]', form);
      const quantities = $$('[name="line_quantity"]', form);
      const prices = $$('[name="line_price"]', form);
      const items = descriptions.map((input, index) => ({
        description: input.value,
        quantity: Number(quantities[index].value),
        unit_price: Number(prices[index].value),
      }));
      const { data, error } = await state.supabase.rpc("save_invoice_adjustment_draft", {
        target_adjustment_id: id,
        target_invoice_id: form.dataset.invoiceId,
        target_kind: form.dataset.kind,
        target_reason: values.reason,
        target_vat_rate: Number(values.vat_rate || 0),
        target_notes: values.notes || null,
        target_items: items,
      });
      if (error) throw error;
      destination = `${form.dataset.kind}-notes/${data}`;
      toast(`${titleCase(form.dataset.kind)} note draft saved.`);
    } else if (kind === "billing-settings") {
      const payload = {
        business_name: values.business_name.trim(),
        address: values.address.trim(),
        payer_id: values.payer_id || null,
        tin: values.tin || null,
        bank_name: values.bank_name || null,
        account_name: values.account_name || null,
        account_number: values.account_number || null,
        contact_phone: values.contact_phone || null,
        contact_email: values.contact_email || null,
        default_vat_rate: Number(values.default_vat_rate || 0),
        deposit_percent: Number(values.deposit_percent || 0),
        policy_text: values.policy_text || null,
        logo_url: values.logo_url || null,
        watermark_url: values.watermark_url || null,
        updated_by: state.profile.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await state.supabase.from("billing_settings").update(payload).eq("id", true);
      if (error) throw error;
      await logActivity(null, "updated", "billing_settings", "singleton");
      destination = "billing/settings";
      toast("Billing settings saved.");
    } else if (kind === "page") {
      const page = state.data.pages.find((item) => item.id === id);
      const content = structuredClone(page.content || {});
      for (const [, path, type = "text"] of pageSchemas[page.slug] || []) {
        const value = type === "image" ? await resolveImage(form, formData, path, page.title, page.title) : values[path] || "";
        setPath(content, path, value);
      }
      const nextTitle = getPath(content, "header.title") || getPath(content, "hero.title_line_one") || page.title;
      const { error } = await state.supabase.from("pages").update({ title: nextTitle, content, seo_title: values.seo_title || null, seo_description: values.seo_description || null, updated_by: state.profile.id }).eq("id", id);
      if (error) throw error;
      destination = `pages/${id}`;
      toast("Draft changes saved.");
    } else if (kind === "service") {
      const existing = id ? state.data.services.find((item) => item.id === id) : null;
      const payload = { title: values.title.trim(), slug: existing?.slug || values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), summary: values.summary, description: values.description || null, image_url: existing?.image_url || null };
      const query = id ? state.supabase.from("services").update(payload).eq("id", id).select("*").single() : state.supabase.from("services").insert({ ...payload, status: "draft", position: state.data.services.length, has_unpublished_changes: true }).select("*").single();
      const { data, error } = await query;
      if (error) throw error;
      destination = `services/${data.id}`;
      toast("Service draft saved.");
    } else if (kind === "portfolio") {
      const existing = id ? state.data.portfolio.find((item) => item.id === id) : null;
      const image = await resolveImage(form, formData, "thumbnail_src", values.title, values.alt_text);
      if (!image) throw new Error("Choose a thumbnail image before saving.");
      const payload = { title: values.title.trim(), slug: existing?.slug || values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), category: values.category, collection: values.collection || null, year: Number(values.year), media_type: values.media_type, description: values.description || null, alt_text: values.alt_text, thumbnail_src: image, preview_src: values.preview_src || null, original_url: values.original_url || null, featured: formData.get("featured") === "on", updated_by: state.profile.id };
      const query = id ? state.supabase.from("portfolio_items").update(payload).eq("id", id).select("*").single() : state.supabase.from("portfolio_items").insert({ ...payload, status: "draft", position: state.data.portfolio.length, created_by: state.profile.id, has_unpublished_changes: true }).select("*").single();
      const { data, error } = await query;
      if (error) throw error;
      destination = `portfolio/${data.id}`;
      toast("Portfolio draft saved.");
    } else if (kind === "media") {
      if (id) {
        const { error } = await state.supabase.from("media_assets").update({ internal_name: values.internal_name, alt_text: values.alt_text, caption: values.caption || null }).eq("id", id);
        if (error) throw error;
        destination = `media/${id}`;
        toast("Media details saved.");
      } else {
        $("#upload-progress")?.classList.remove("hidden");
        const asset = await uploadAsset(formData.get("file"), values.internal_name, values.alt_text);
        destination = `media/${asset.id}`;
        toast("File uploaded.");
      }
    } else if (kind === "team") {
      const { error } = await state.supabase.from("profiles").update({ full_name: values.full_name, role: values.role }).eq("id", id);
      if (error) throw error;
      destination = `team/${id}`;
      toast("Team access saved.");
    } else if (kind === "collection") {
      const page = globalPage();
      const type = form.dataset.collectionType;
      const index = Number(form.dataset.collectionIndex);
      const item = {};
      for (const [, name, typeName = "text"] of collectionSchemas[type]) {
        item[name] = typeName === "image" ? await resolveImage(form, formData, name, values.name || type, values.name || type) : values[name] || "";
      }
      const { error } = await state.supabase.rpc("save_sitewide_collection", {
        target_page_id: page.id,
        target_collection: type,
        target_index: index,
        target_item: item,
        target_publish: publishCollection,
      });
      if (error) throw error;
      if (publishCollection) await verifyPublishedCollection(type, index, item);
      destination = index >= 0 ? `collections/${type}/${index}` : "pages";
      toast(publishCollection ? "Site-wide content published live." : "Site-wide draft saved.");
    }
    state.dirty = false;
    await refreshData({ preserveRoute: false });
    go(destination);
  } catch (error) {
    $("#screen-message").innerHTML = inlineError(error.message || "Please check the form and try again.");
  } finally {
    submit.disabled = false;
    $("#upload-progress")?.classList.add("hidden");
  }
}

async function publishEntity(type, id) {
  const { error } = await state.supabase.rpc("publish_cms_entity", { target_type: type, target_id: id });
  if (error) {
    setScreenError(error.message);
    return;
  }
  try {
    await verifyPublishedEntity(type, id);
  } catch (error) {
    setScreenError(error.message);
    return;
  }
  toast(`${titleCase(type)} published.`);
  await refreshData();
}

async function transitionInvoice(id, status, reference = null) {
  const { error } = await state.supabase.rpc("transition_invoice", { target_invoice_id: id, target_status: status, target_payment_reference: reference });
  if (error) {
    setScreenError(error.message);
    return;
  }
  toast(status === "paid" ? "Payment recorded." : `Invoice marked ${titleCase(status)}.`);
  await refreshData();
}

async function downloadInvoicePdf(id, button) {
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = "Preparing PDF…";
  try {
    const response = await fetch(`/api/invoice-pdf?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${state.session.access_token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "The invoice PDF could not be created.");
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "Olympus-Atelier-Invoice.pdf";
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Invoice PDF downloaded.");
  } catch (error) {
    setScreenError(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function downloadBillingDocument(type, id, button) {
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = "Preparing PDF…";
  try {
    const response = await fetch(`/api/billing-document?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${state.session.access_token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "The document PDF could not be created.");
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `Olympus-Atelier-${titleCase(type)}.pdf`;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`${titleCase(type)} PDF downloaded.`);
  } catch (error) {
    setScreenError(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function issueAdjustment(id) {
  const adjustment = state.data.adjustments.find((item) => item.id === id);
  if (!adjustment) return;
  const approved = await confirmAction(`Issue this ${adjustment.kind} note?`, "Issuing creates an immutable accounting document and updates the invoice balance.", "Issue note");
  if (!approved) return;
  const { error } = await state.supabase.rpc("issue_invoice_adjustment", { target_adjustment_id: id });
  if (error) return setScreenError(error.message);
  toast(`${titleCase(adjustment.kind)} note issued.`);
  await refreshData();
}

async function voidPayment(id) {
  const reason = await askForReason("Void this receipt?", "The payment will be removed from the invoice balance, but its receipt and audit history remain.");
  if (!reason) return;
  const { error } = await state.supabase.rpc("void_invoice_payment", { target_payment_id: id, target_reason: reason });
  if (error) return setScreenError(error.message);
  toast("Receipt voided.");
  await refreshData();
}

async function voidAdjustment(id) {
  const adjustment = state.data.adjustments.find((item) => item.id === id);
  const reason = await askForReason(`Void this ${adjustment?.kind || ""} note?`, "The invoice balance will be recalculated and the note will remain in the audit history.");
  if (!reason) return;
  const { error } = await state.supabase.rpc("void_invoice_adjustment", { target_adjustment_id: id, target_reason: reason });
  if (error) return setScreenError(error.message);
  toast("Note voided.");
  await refreshData();
}

async function askForReason(title, message) {
  const approved = await confirmAction(title, `${message} Select continue, then enter the reason in the inline field.`, "Continue");
  if (!approved) return "";
  const existing = $("#void-reason-panel");
  if (existing) existing.remove();
  const panel = document.createElement("form");
  panel.id = "void-reason-panel";
  panel.className = "panel compact-form";
  panel.innerHTML = `<label>Reason<input name="reason" required autofocus placeholder="Why is this being voided?"></label><button class="button primary" type="submit">Confirm</button><button class="button secondary" type="button" data-cancel-reason>Cancel</button>`;
  $("#record-screen").append(panel);
  return new Promise((resolve) => {
    panel.addEventListener("submit", (event) => {
      event.preventDefault();
      const reason = new FormData(panel).get("reason").trim();
      if (!reason) return;
      panel.remove();
      resolve(reason);
    });
    $("[data-cancel-reason]", panel).addEventListener("click", () => {
      panel.remove();
      resolve("");
    });
  });
}

function confirmAction(title, message, actionLabel = "Continue") {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-action").textContent = actionLabel;
  const dialog = $("#confirm-dialog");
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true }));
}

async function archiveEntity(type, id) {
  const approved = await confirmAction("Archive this content?", "It will leave the public site but remain available in the workspace.", "Archive");
  if (!approved) return;
  const table = type === "portfolio" ? "portfolio_items" : "services";
  const { error } = await state.supabase.from(table).update({ status: "archived" }).eq("id", id);
  if (error) setScreenError(error.message);
  else {
    toast("Content archived.");
    await refreshData({ preserveRoute: false });
    go(type === "portfolio" ? "portfolio" : "services");
  }
}

async function setProjectArchived(id, archived) {
  const approved = await confirmAction(
    archived ? "Restore this project?" : "Archive this project?",
    archived
      ? "The project will become editable and return to active project views."
      : "It will become read-only and leave active views, while its client and billing history stays intact.",
    archived ? "Restore" : "Archive",
  );
  if (!approved) return;
  const { error } = await state.supabase.rpc("set_project_archived", {
    target_project_id: id,
    target_archived: !archived,
  });
  if (error) return setScreenError(error.message);
  toast(archived ? "Project restored." : "Project archived.");
  await refreshData();
}

async function setClientArchived(id, archived) {
  const approved = await confirmAction(
    archived ? "Restore this client?" : "Archive this client?",
    archived
      ? "The client will return to active CRM views."
      : "Their projects, invoices and history will remain available.",
    archived ? "Restore" : "Archive",
  );
  if (!approved) return;
  const { error } = await state.supabase.from("clients").update({
    archived_at: archived ? null : new Date().toISOString(),
  }).eq("id", id);
  if (error) return setScreenError(error.message);
  await logActivity(null, archived ? "restored" : "archived", "client", id);
  toast(archived ? "Client restored." : "Client archived.");
  await refreshData();
}

async function duplicateEntity(type, id) {
  const source = (type === "portfolio" ? state.data.portfolio : state.data.services).find((item) => item.id === id);
  if (!source) return;
  const table = type === "portfolio" ? "portfolio_items" : "services";
  const payload = { ...source };
  ["id", "legacy_id", "published_snapshot", "published_at", "created_at", "updated_at"].forEach((key) => delete payload[key]);
  payload.title = `${source.title} copy`;
  payload.slug = `${source.slug}-copy-${Date.now().toString().slice(-5)}`;
  payload.position = (type === "portfolio" ? state.data.portfolio : state.data.services).length;
  payload.status = "draft";
  payload.has_unpublished_changes = true;
  if (type === "portfolio") {
    payload.created_by = state.profile.id;
    payload.updated_by = state.profile.id;
  }
  const { data, error } = await state.supabase.from(table).insert(payload).select("*").single();
  if (error) setScreenError(error.message);
  else {
    toast("Draft copy created.");
    await refreshData({ preserveRoute: false });
    go(`${type}/${data.id}`);
  }
}

async function moveEntity(type, id, direction) {
  const list = type === "portfolio" ? state.data.portfolio : state.data.services;
  const currentIndex = list.findIndex((item) => item.id === id);
  const nextIndex = currentIndex + Number(direction);
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= list.length) return;
  const table = type === "portfolio" ? "portfolio_items" : "services";
  const current = list[currentIndex];
  const next = list[nextIndex];
  const first = await state.supabase.from(table).update({ position: next.position }).eq("id", current.id);
  if (first.error) return setScreenError(first.error.message);
  const second = await state.supabase.from(table).update({ position: current.position }).eq("id", next.id);
  if (second.error) return setScreenError(second.error.message);
  toast(direction < 0 ? "Moved earlier." : "Moved later.");
  await refreshData();
}

async function archiveMedia(id) {
  const { data: usage, error: usageError } = await state.supabase.rpc("media_asset_usage_details", { target_id: id });
  if (usageError) return setScreenError(usageError.message);
  if (usage?.length) {
    const locations = usage.slice(0, 4).map((item) => `${item.source_label}: ${item.record_title}`).join(", ");
    const more = usage.length > 4 ? ` and ${usage.length - 4} more` : "";
    return setScreenError(`This file is still used by ${locations}${more}. Replace it there before archiving.`);
  }
  const approved = await confirmAction("Archive this media file?", "The file stays in storage but is hidden from the active library.", "Archive");
  if (!approved) return;
  const { error } = await state.supabase.from("media_assets").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) setScreenError(error.message);
  else {
    toast("Media archived.");
    await refreshData({ preserveRoute: false });
    go("media");
  }
}

function previewRecordFromForm() {
  const form = $(".cms-editor");
  if (!form) return null;
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  const kind = form.dataset.recordForm;
  if (kind === "page") {
    const page = state.data.pages.find((item) => item.id === form.dataset.id);
    const content = structuredClone(page.content || {});
    for (const [, path] of pageSchemas[page.slug] || []) setPath(content, path, values[path] || getPath(content, path) || "");
    return { kind, id: page.id, slug: page.slug, record: { ...page, content } };
  }
  if (kind === "service") {
    const existing = state.data.services.find((item) => item.id === form.dataset.id) || {};
    return { kind, id: existing.id, slug: "services", record: { ...existing, ...values } };
  }
  if (kind === "portfolio") {
    const existing = state.data.portfolio.find((item) => item.id === form.dataset.id) || {};
    return { kind, id: existing.id, slug: "portfolio", record: { ...existing, ...values, thumbnail_src: values.thumbnail_src || existing.thumbnail_src } };
  }
  if (kind === "collection") {
    const page = globalPage();
    const type = form.dataset.collectionType;
    const index = Number(form.dataset.collectionIndex);
    const content = structuredClone(page.content || {});
    const item = {};
    for (const [, name] of collectionSchemas[type]) item[name] = values[name] || "";
    content[type] ||= [];
    if (index >= 0) content[type][index] = item;
    else content[type].push(item);
    return { kind: "page", id: page.id, slug: "global", record: { ...page, content } };
  }
  return null;
}

function buildPreviewPayload(preview) {
  const pages = Object.fromEntries(state.data.pages.filter((item) => item.published_snapshot).map((item) => [item.slug, item.published_snapshot]));
  const services = state.data.services.filter((item) => item.published_snapshot && item.status === "published").map((item) => item.published_snapshot);
  const portfolioItems = state.data.portfolio.filter((item) => item.published_snapshot && item.status === "published").map((item) => item.published_snapshot);
  if (preview.kind === "page") pages[preview.slug] = { title: preview.record.title, slug: preview.slug, content: preview.record.content, seo_title: preview.record.seo_title, seo_description: preview.record.seo_description };
  if (preview.kind === "service") {
    const index = services.findIndex((item) => item.id === preview.id || item.slug === preview.record.slug);
    if (index >= 0) services[index] = preview.record; else services.push(preview.record);
  }
  if (preview.kind === "portfolio") {
    const index = portfolioItems.findIndex((item) => item.id === preview.id);
    if (index >= 0) portfolioItems[index] = preview.record; else portfolioItems.unshift(preview.record);
  }
  return { pages, services, portfolioItems, generatedAt: new Date().toISOString() };
}

function openExactPreview() {
  const preview = previewRecordFromForm();
  if (!preview) return;
  state.previewPayload = buildPreviewPayload(preview);
  $("#preview-title").textContent = `${titleCase(preview.slug)} preview`;
  $("#preview-frame").className = "";
  $("#preview-frame").src = `/?cmsPreview=1#${encodeURIComponent(preview.slug === "global" ? "home" : preview.slug)}`;
  $("#preview-dialog").showModal();
}

function sendPreviewPayload() {
  if (!state.previewPayload) return;
  $("#preview-frame").contentWindow?.postMessage({ type: "olympus-preview-content", payload: state.previewPayload }, window.location.origin);
}

function restoreSidebar() {
  $("#app").classList.toggle("sidebar-hidden", localStorage.getItem("olympus-sidebar-hidden") === "true");
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

document.addEventListener("click", async (event) => {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    event.preventDefault();
    go(routeTarget.dataset.route);
    return;
  }
  const nav = event.target.closest("[data-view]");
  if (nav) {
    go(nav.dataset.view);
    return;
  }
  const row = event.target.closest("[data-route]");
  if (row) return go(row.dataset.route);
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "retry") await refreshData();
  if (action === "load-more-portfolio") {
    state.portfolioVisible += 24;
    renderPortfolio();
  }
  const tab = event.target.closest("[data-collection-tab]")?.dataset.collectionTab;
  if (tab) {
    state.collectionTab = tab;
    renderCollections();
  }
  const toggleLibrary = event.target.closest("[data-toggle-library]")?.dataset.toggleLibrary;
  if (toggleLibrary) $(`[data-library="${CSS.escape(toggleLibrary)}"]`)?.classList.toggle("hidden");
  const choice = event.target.closest("[data-choose-image]");
  if (choice) {
    const name = choice.dataset.chooseImage;
    const wrapper = $(`[data-image-field="${CSS.escape(name)}"]`);
    $('[name="' + CSS.escape(name) + '"]', wrapper).value = choice.dataset.imageValue;
    $(".current-image", wrapper).innerHTML = `<img src="${escapeHtml(choice.dataset.imageValue)}" alt=""><div><strong>Selected image</strong><small>This will replace the current image after you save.</small></div>`;
    $(`[data-library="${CSS.escape(name)}"]`).classList.add("hidden");
    state.dirty = true;
  }
  const restore = event.target.closest("[data-restore-image]");
  if (restore) {
    const name = restore.dataset.restoreImage;
    const wrapper = $(`[data-image-field="${CSS.escape(name)}"]`);
    $('[name="' + CSS.escape(name) + '"]', wrapper).value = restore.dataset.original;
    $(".current-image", wrapper).innerHTML = `<img src="${escapeHtml(restore.dataset.original)}" alt=""><div><strong>Current image</strong><small>This image will stay unless you replace it.</small></div>`;
  }
  if (event.target.closest("[data-add-line-item]")) {
    $("#invoice-line-items").insertAdjacentHTML("beforeend", invoiceLineItem());
    updateInvoiceTotal();
  }
  const removeLine = event.target.closest("[data-remove-line-item]");
  if (removeLine && $$(".invoice-line-item").length > 1) {
    removeLine.closest(".invoice-line-item").remove();
    updateInvoiceTotal();
  }
  if (event.target.closest("[data-preview-current]")) openExactPreview();
  const publishCollection = event.target.closest("[data-publish-collection]");
  if (publishCollection) {
    const form = publishCollection.closest("[data-record-form='collection']");
    if (form?.reportValidity()) await saveRecordForm(form, { publishCollection: true });
  }
  const publish = event.target.closest("[data-publish-current]");
  if (publish) await publishEntity(publish.dataset.publishCurrent, publish.dataset.id);
  const archive = event.target.closest("[data-archive-current]");
  if (archive) await archiveEntity(archive.dataset.archiveCurrent, archive.dataset.id);
  const duplicate = event.target.closest("[data-duplicate-current]");
  if (duplicate) await duplicateEntity(duplicate.dataset.duplicateCurrent, duplicate.dataset.id);
  const move = event.target.closest("[data-move-current]");
  if (move) await moveEntity(move.dataset.moveCurrent, move.dataset.id, move.dataset.direction);
  const archiveMediaButton = event.target.closest("[data-archive-media]");
  if (archiveMediaButton) await archiveMedia(archiveMediaButton.dataset.archiveMedia);
  const archiveProject = event.target.closest("[data-archive-project]");
  if (archiveProject) await setProjectArchived(archiveProject.dataset.archiveProject, archiveProject.dataset.archived === "true");
  const archiveClient = event.target.closest("[data-archive-client]");
  if (archiveClient) await setClientArchived(archiveClient.dataset.archiveClient, archiveClient.dataset.archived === "true");
  const copyMedia = event.target.closest("[data-copy-media]")?.dataset.copyMedia;
  if (copyMedia) {
    try { await navigator.clipboard.writeText(copyMedia); toast("Media address copied."); }
    catch { setScreenError("Copying is unavailable in this browser. Select the address from the media record instead."); }
  }
  if (event.target.closest("[data-show-payment]")) $(".payment-form").classList.remove("hidden");
  const transition = event.target.closest("[data-transition-invoice]");
  if (transition) {
    const destructive = ["void", "uncollectible"].includes(transition.dataset.nextStatus);
    if (!destructive || await confirmAction(`${titleCase(transition.dataset.nextStatus)} this invoice?`, "This changes the invoice lifecycle and may not be reversible.", titleCase(transition.dataset.nextStatus))) {
      await transitionInvoice(transition.dataset.transitionInvoice, transition.dataset.nextStatus);
    }
  }
  const downloadInvoice = event.target.closest("[data-download-invoice]");
  if (downloadInvoice) await downloadInvoicePdf(downloadInvoice.dataset.downloadInvoice, downloadInvoice);
  const downloadDocument = event.target.closest("[data-download-document]");
  if (downloadDocument) await downloadBillingDocument(downloadDocument.dataset.downloadDocument, downloadDocument.dataset.documentId, downloadDocument);
  const issueNote = event.target.closest("[data-issue-adjustment]");
  if (issueNote) await issueAdjustment(issueNote.dataset.issueAdjustment);
  const voidReceipt = event.target.closest("[data-void-payment]");
  if (voidReceipt) await voidPayment(voidReceipt.dataset.voidPayment);
  const voidNote = event.target.closest("[data-void-adjustment]");
  if (voidNote) await voidAdjustment(voidNote.dataset.voidAdjustment);
  const copyInvite = event.target.closest("[data-copy-invite]")?.dataset.copyInvite;
  if (copyInvite) {
    try { await navigator.clipboard.writeText(copyInvite); toast("Secure client link copied."); }
    catch {
      const fallback = $("[data-copy-fallback]");
      fallback.classList.remove("hidden");
      $("input", fallback).value = copyInvite;
      $("input", fallback).select();
    }
  }
  const revoke = event.target.closest("[data-revoke-invite]")?.dataset.revokeInvite;
  if (revoke && await confirmAction("Revoke this invitation?", "The client will no longer be able to use this link.", "Revoke")) {
    const invite = state.data.invitations.find((item) => item.id === revoke);
    const { error } = await state.supabase.from("project_invites").update({ revoked_at: new Date().toISOString() }).eq("id", revoke);
    if (error) setScreenError(error.message);
    else {
      await logActivity(invite.project_id, "revoked", "invitation", revoke);
      toast("Invitation revoked.");
      await refreshData();
    }
  }
  const intakeStatus = event.target.closest("[data-intake-status]");
  if (intakeStatus) {
    const { error } = await state.supabase.from("intake_submissions").update({ status: intakeStatus.dataset.nextStatus }).eq("id", intakeStatus.dataset.intakeStatus);
    if (error) setScreenError(error.message);
    else {
      toast("Enquiry moved to review.");
      await refreshData();
    }
  }
  const archiveIntake = event.target.closest("[data-archive-intake]");
  if (archiveIntake && await confirmAction("Archive this enquiry?", "It will leave the active inbox but remain in the workspace history.", "Archive")) {
    const { error } = await state.supabase.from("intake_submissions").update({ status: "archived" }).eq("id", archiveIntake.dataset.archiveIntake);
    if (error) setScreenError(error.message);
    else {
      toast("Enquiry archived.");
      await refreshData({ preserveRoute: false });
      go("inbox");
    }
  }
  const removeCollection = event.target.closest("[data-remove-collection]");
  if (removeCollection && await confirmAction("Remove this item?", "It remains on the live website until Site-wide content is published.", "Remove")) {
    const page = globalPage();
    const content = structuredClone(page.content || {});
    content[removeCollection.dataset.removeCollection].splice(Number(removeCollection.dataset.index), 1);
    const { error } = await state.supabase.from("pages").update({ content, updated_by: state.profile.id }).eq("id", page.id);
    if (error) setScreenError(error.message);
    else {
      toast("Draft item removed.");
      await refreshData({ preserveRoute: false });
      go("pages");
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("tr[data-route]")) go(event.target.dataset.route);
  if (event.key === "Escape") closeSidebar();
});

document.addEventListener("input", (event) => {
  if (event.target.closest(".record-form")) state.dirty = true;
  if (event.target.matches('[data-record-form="invoice"] [name="tax"]')) event.target.form.dataset.autoVat = "false";
  if (event.target.matches('[name="line_quantity"], [name="line_price"], [name="currency"]')) updateInvoiceTotal();
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches('[data-record-form="invoice"] [name="project_id"]')) syncInvoiceProjectFields();
  if (input.type === "file" && input.name.endsWith("_file") && input.files?.[0]) {
    const name = input.name.replace(/_file$/, "");
    const wrapper = $(`[data-image-field="${CSS.escape(name)}"]`);
    if (!wrapper) return;
    const previewUrl = URL.createObjectURL(input.files[0]);
    $(`[name="${CSS.escape(name)}"]`, wrapper).value = previewUrl;
    $(".current-image", wrapper).innerHTML = `<img src="${previewUrl}" alt=""><div><strong>New image selected</strong><small>Save the draft to upload this replacement.</small></div>`;
    state.dirty = true;
  }
});

document.addEventListener("submit", async (event) => {
  const recordForm = event.target.closest("[data-record-form]");
  if (recordForm) {
    event.preventDefault();
    await saveRecordForm(recordForm);
    return;
  }
  const inviteFormNode = event.target.closest("[data-invite-form]");
  if (inviteFormNode) {
    event.preventDefault();
    const email = new FormData(inviteFormNode).get("email").trim().toLowerCase();
    const { data, error } = await state.supabase.from("project_invites").insert({ project_id: inviteFormNode.dataset.inviteForm, email, created_by: state.profile.id }).select("*").single();
    if (error) $(".screen-message", inviteFormNode).innerHTML = inlineError(error.message);
    else {
      await logActivity(data.project_id, "created", "invitation", data.id, { email });
      toast("Secure client link created.");
      await refreshData();
    }
    return;
  }
  const paymentForm = event.target.closest("[data-payment-form]");
  if (paymentForm) {
    event.preventDefault();
    await transitionInvoice(paymentForm.dataset.paymentForm, "paid", new FormData(paymentForm).get("payment_reference"));
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
  else {
    state.session = data.session;
    await enterWorkspace();
  }
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
  if (passwordError) $("#password-message").textContent = passwordError.message;
  else {
    const { error } = await state.supabase.from("profiles").update({ must_change_password: false }).eq("id", state.profile.id);
    if (error) $("#password-message").textContent = error.message;
    else {
      state.profile.must_change_password = false;
      $("#password-dialog").close();
      toast("Your private password is active.");
    }
  }
  button.disabled = false;
});

$("#password-dialog").addEventListener("cancel", (event) => event.preventDefault());
$("#sign-out").addEventListener("click", () => state.supabase.auth.signOut());
$("#menu-button").addEventListener("click", openSidebar);
$("#collapse-sidebar").addEventListener("click", toggleDesktopSidebar);
$("#sidebar-backdrop").addEventListener("click", closeSidebar);
$("#preview-dialog").addEventListener("click", (event) => {
  const width = event.target.closest("[data-preview-width]")?.dataset.previewWidth;
  if (width) {
    $("#preview-frame").className = width;
    $$("[data-preview-width]").forEach((button) => button.classList.toggle("active", button.dataset.previewWidth === width));
  }
  if (event.target.closest("[data-refresh-preview]")) {
    $("#preview-frame").src = $("#preview-frame").src;
  }
  if (event.target.closest("[data-close-preview]")) $("#preview-dialog").close();
});

window.addEventListener("message", (event) => {
  if (event.origin === window.location.origin && event.data?.type === "olympus-preview-ready") sendPreviewPayload();
});
window.addEventListener("hashchange", renderRoute);
window.addEventListener("beforeunload", (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

["inbox-search", "inbox-filter"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  persistListFilters("inbox", [["inbox-search", "search"], ["inbox-filter", "status"]]);
  renderInbox();
}));
["project-search", "project-filter"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  persistListFilters("projects", [["project-search", "search"], ["project-filter", "status"]]);
  renderProjects();
}));
["client-search", "client-stage-filter", "client-smart-filter", "client-service-filter", "client-currency-filter", "client-min-paid"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  persistListFilters("clients", [
    ["client-search", "search"], ["client-stage-filter", "stage"], ["client-smart-filter", "filter"],
    ["client-service-filter", "service"], ["client-currency-filter", "currency"], ["client-min-paid", "minPaid"],
  ]);
  renderClients();
}));
$("#crm-chart-currency").addEventListener("change", renderCrmChart);
["invoice-search", "invoice-filter"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  persistListFilters("invoices", [["invoice-search", "search"], ["invoice-filter", "status"]]);
  renderInvoices();
}));
["page-search", "page-status"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  persistListFilters("pages", [["page-search", "search"], ["page-status", "status"]]);
  renderPages();
}));
["portfolio-search", "portfolio-filter", "portfolio-status"].forEach((id) => $(`#${id}`).addEventListener("input", () => {
  state.portfolioVisible = 24;
  persistListFilters("portfolio", [["portfolio-search", "search"], ["portfolio-filter", "category"], ["portfolio-status", "status"]]);
  renderPortfolio();
}));

bootstrap();
