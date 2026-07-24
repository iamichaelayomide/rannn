import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const state = {
  supabase: null,
  session: null,
  profile: null,
  data: {
    projects: [], clients: [], invoices: [], intake: [], milestones: [],
    pages: [], services: [], media: [], profiles: [],
  },
  view: "overview",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[char]);
const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
  : "Not set";
const money = (value, currency = "NGN") => new Intl.NumberFormat("en-NG", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Number(value || 0));
const badge = (status) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(titleCase(status))}</span>`;
const empty = (message) => `<div class="empty">${escapeHtml(message)}</div>`;

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  $("#toast-region").append(node);
  setTimeout(() => node.remove(), 3800);
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
    $("#setup-banner").textContent = `${error.message} Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel to activate the workspace.`;
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
  await refreshData();
}

function applyRoleVisibility() {
  const role = state.profile.role;
  const canFinance = ["owner", "finance"].includes(role);
  const canContent = ["owner", "content_manager"].includes(role);
  const canManageProjects = ["owner", "project_manager"].includes(role);
  $$('[data-view="invoices"], [data-view-panel="invoices"]').forEach((el) => el.classList.toggle("hidden", !canFinance));
  $$('[data-view="website"], [data-view-panel="website"]').forEach((el) => el.classList.toggle("hidden", !canContent));
  $$('[data-view="team"], [data-view-panel="team"]').forEach((el) => el.classList.toggle("hidden", role !== "owner"));
  $$('[data-action="new-project"], [data-action="new-client"]').forEach((el) => el.classList.toggle("hidden", !canManageProjects));
}

async function refreshData() {
  const queries = [
    state.supabase.from("projects").select("*, clients(id,name,email,company), milestones(id,title,description,status,due_date,position,requires_approval,deliverables(id,title,description,file_url,version,status,client_note))").order("created_at", { ascending: false }),
    state.supabase.from("clients").select("*, projects(id)").order("created_at", { ascending: false }),
    state.supabase.from("invoices").select("*, projects(id,title,clients(name))").order("created_at", { ascending: false }),
    state.supabase.from("intake_submissions").select("*").order("created_at", { ascending: false }),
    state.supabase.from("milestones").select("*, projects(id,title,clients(name))").order("due_date", { ascending: true }),
    state.supabase.from("pages").select("*").order("slug"),
    state.supabase.from("services").select("*").order("position"),
    state.supabase.from("media_assets").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    state.supabase.from("profiles").select("*").order("created_at"),
  ];
  const keys = ["projects", "clients", "invoices", "intake", "milestones", "pages", "services", "media", "profiles"];
  const results = await Promise.all(queries);
  results.forEach((result, index) => {
    if (!result.error) state.data[keys[index]] = result.data || [];
  });
  renderAll();
}

function renderAll() {
  $("#current-date").textContent = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("#welcome-title").textContent = `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${escapeHtml((state.profile.full_name || "team").split(" ")[0])}.`;
  $("#inbox-count").textContent = state.data.intake.filter((item) => item.status === "new").length;
  renderOverview();
  renderInbox();
  renderProjects();
  renderClients();
  renderInvoices();
  renderWebsite();
  renderTeam();
}

function renderOverview() {
  const active = state.data.projects.filter((p) => p.status === "active").length;
  const awaiting = state.data.milestones.filter((m) => m.status === "awaiting_approval").length;
  const openInvoices = state.data.invoices.filter((i) => i.status === "open");
  const outstanding = openInvoices.reduce((total, item) => total + Number(item.total || 0), 0);
  const newIntake = state.data.intake.filter((item) => item.status === "new").length;
  const values = [
    [active, `${state.data.projects.length} total`],
    [awaiting, "Client decisions needed"],
    [money(outstanding), `${openInvoices.length} open`],
    [newIntake, "Unreviewed requests"],
  ];
  $$(".metric", $("#metrics")).forEach((card, index) => {
    $("strong", card).textContent = values[index][0];
    $("small", card).textContent = values[index][1];
  });

  const attention = [
    ...state.data.intake.filter((i) => i.status === "new").slice(0, 3).map((i) => ({
      title: `New enquiry from ${i.name}`, detail: i.title || i.service || "Project request", status: "new",
    })),
    ...state.data.milestones.filter((m) => m.status === "awaiting_approval").slice(0, 3).map((m) => ({
      title: m.title, detail: `${m.projects?.title || "Project"} · awaiting client`, status: "awaiting_approval",
    })),
  ];
  $("#attention-list").innerHTML = attention.length
    ? attention.map((item) => `<div class="item-row"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>${badge(item.status)}</div>`).join("")
    : empty("Nothing urgent right now.");

  const upcoming = state.data.milestones.filter((m) => m.due_date && !["completed", "approved"].includes(m.status)).slice(0, 5);
  $("#milestone-list").innerHTML = upcoming.length
    ? upcoming.map((m) => `<div class="item-row"><div><strong>${escapeHtml(m.title)}</strong><small>${escapeHtml(m.projects?.title || "Project")}</small></div><small>${formatDate(m.due_date)}</small></div>`).join("")
    : empty("No upcoming milestones.");

  $("#recent-projects").innerHTML = state.data.projects.length
    ? state.data.projects.slice(0, 5).map((p) => `<div class="item-row"><div><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.clients?.name || "No client")} · ${escapeHtml(p.service || "General")}</small></div>${badge(p.status)}</div>`).join("")
    : empty("Create your first project to start tracking delivery.");
}

function renderInbox() {
  const term = ($("#inbox-search")?.value || "").toLowerCase();
  const status = $("#inbox-filter")?.value || "";
  const rows = state.data.intake.filter((i) =>
    (!status || i.status === status) &&
    [i.name, i.email, i.title, i.service].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#inbox-table").innerHTML = rows.length ? rows.map((i) => `
    <tr>
      <td><strong>${escapeHtml(i.name)}</strong><small>${escapeHtml(i.email)}</small></td>
      <td>${escapeHtml(i.title || i.service || "General enquiry")}</td>
      <td>${formatDate(i.created_at)}</td>
      <td>${badge(i.status)}</td>
      <td><button class="text-button" data-review-intake="${i.id}">${i.status === "new" ? "Start review" : i.status === "reviewing" ? "Convert to project" : "Open"}</button></td>
    </tr>`).join("") : `<tr><td colspan="5">${empty("No enquiries match this view.")}</td></tr>`;
}

function renderProjects() {
  const term = ($("#project-search")?.value || "").toLowerCase();
  const status = $("#project-filter")?.value || "";
  const projects = state.data.projects.filter((p) =>
    (!status || p.status === status) &&
    [p.title, p.code, p.clients?.name].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#project-grid").innerHTML = projects.length ? projects.map((p) => {
    const milestones = p.milestones || [];
    const completed = milestones.filter((m) => ["approved", "completed"].includes(m.status)).length;
    const progress = milestones.length ? Math.round((completed / milestones.length) * 100) : 0;
    return `<article class="project-card">
      <div>${badge(p.status)}</div>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="muted">${escapeHtml(p.clients?.name || "No client")} · ${escapeHtml(p.service || "General project")}</p>
      <div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%"></span></div>
      <div class="meta"><span>${completed}/${milestones.length} milestones</span><span>Due ${formatDate(p.due_date)}</span></div>
      <button class="button secondary wide-button" data-open-project="${p.id}">Open project</button>
    </article>`;
  }).join("") : empty("No projects match this view.");
}

function renderClients() {
  const term = ($("#client-search")?.value || "").toLowerCase();
  const clients = state.data.clients.filter((c) =>
    [c.name, c.email, c.company].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#client-table").innerHTML = clients.length ? clients.map((c) => `
    <tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.email || c.phone || "—")}</td><td>${escapeHtml(c.company || "—")}</td><td>${c.projects?.length || 0}</td></tr>
  `).join("") : `<tr><td colspan="4">${empty("No clients found.")}</td></tr>`;
}

function renderInvoices() {
  const term = ($("#invoice-search")?.value || "").toLowerCase();
  const status = $("#invoice-filter")?.value || "";
  const invoices = state.data.invoices.filter((i) =>
    (!status || i.status === status) &&
    [i.invoice_number, i.projects?.title, i.projects?.clients?.name].some((value) => String(value || "").toLowerCase().includes(term))
  );
  $("#invoice-table").innerHTML = invoices.length ? invoices.map((i) => `
    <tr><td><strong>${escapeHtml(i.invoice_number)}</strong><small>${escapeHtml(i.projects?.clients?.name || "")}</small></td><td>${escapeHtml(i.projects?.title || "—")}</td><td>${formatDate(i.due_date)}</td><td>${money(i.total, i.currency)}</td><td>${badge(i.status)}</td><td>${invoiceActions(i)}</td></tr>
  `).join("") : `<tr><td colspan="5">${empty("No invoices match this view.")}</td></tr>`;
}

function invoiceActions(invoice) {
  if (invoice.status === "draft") return `<button class="text-button" data-invoice-status="${invoice.id}" data-next-status="open">Finalize</button>`;
  if (invoice.status === "open") return `<button class="text-button" data-invoice-status="${invoice.id}" data-next-status="paid">Mark paid</button>`;
  return "";
}

function renderWebsite(tab = "pages") {
  $$(".tab").forEach((button) => button.classList.toggle("active", button.dataset.contentTab === tab));
  if (tab === "pages") {
    $("#content-pages").innerHTML = `<section class="panel table-wrap"><table><thead><tr><th>Page</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${
      state.data.pages.length ? state.data.pages.map((page) => `<tr><td><strong>${escapeHtml(page.title)}</strong><small>/${escapeHtml(page.slug)}</small></td><td>${badge(page.status)}</td><td>${formatDate(page.updated_at)}</td><td><button class="text-button" data-edit-page="${page.id}">Edit</button></td></tr>`).join("") : `<tr><td colspan="4">${empty("No editable pages yet.")}</td></tr>`
    }</tbody></table></section>`;
  } else if (tab === "services") {
    $("#content-pages").innerHTML = `<div class="section-tools"><button class="button primary" data-action="new-service">Add service</button></div>${state.data.services.length
      ? `<div class="card-grid">${state.data.services.map((service) => `<article class="project-card">${badge(service.status)}<h3>${escapeHtml(service.title)}</h3><p class="muted">${escapeHtml(service.summary || "No summary")}</p></article>`).join("")}</div>`
      : empty("No services have been added.")}`;
  } else {
    $("#content-pages").innerHTML = `<div class="section-tools"><button class="button primary" data-action="new-media">Register asset</button></div>${state.data.media.length
      ? `<div class="card-grid">${state.data.media.map((asset) => `<article class="project-card"><p class="eyebrow">${escapeHtml(asset.mime_type || "Asset")}</p><h3>${escapeHtml(asset.internal_name)}</h3><p class="muted">${escapeHtml(asset.alt_text || "Alt text is missing")}</p></article>`).join("")}</div>`
      : empty("No managed media assets yet.")}`;
  }
}

function renderTeam() {
  $("#team-table").innerHTML = state.data.profiles.length ? state.data.profiles.map((profile) => `
    <tr><td><strong>${escapeHtml(profile.full_name || "Unnamed account")}</strong></td><td>${badge(profile.role)}</td><td>${profile.role === "client" ? "Assigned projects" : "Workspace"}</td></tr>
  `).join("") : `<tr><td colspan="3">${empty("No team profiles found.")}</td></tr>`;
}

function openProject(projectId) {
  const project = state.data.projects.find((item) => item.id === projectId);
  if (!project) return;
  $("#project-dialog").dataset.projectId = projectId;
  $("#project-dialog-title").textContent = project.title;
  const milestones = [...(project.milestones || [])].sort((a, b) => a.position - b.position);
  $("#project-dialog-content").innerHTML = `
    <div class="project-summary">
      <div><span class="muted">Client</span><strong>${escapeHtml(project.clients?.name || "—")}</strong></div>
      <div><span class="muted">Due</span><strong>${formatDate(project.due_date)}</strong></div>
      <div><span class="muted">Budget</span><strong>${money(project.budget, project.currency)}</strong></div>
      <div><span class="muted">Status</span>${badge(project.status)}</div>
    </div>
    <div class="panel-head project-detail-head"><div><p class="eyebrow">Delivery plan</p><h3>Milestones</h3></div><div class="inline-actions"><button class="button secondary" data-invite-client="${project.id}">Invite client</button><button class="button primary" data-add-milestone="${project.id}">Add milestone</button></div></div>
    <div class="timeline">${milestones.length ? milestones.map((milestone) => `
      <article class="timeline-item">
        <div class="timeline-top"><div><strong>${escapeHtml(milestone.title)}</strong><small class="muted">Due ${formatDate(milestone.due_date)}</small></div>${badge(milestone.status)}</div>
        ${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ""}
        ${(milestone.deliverables || []).map((item) => `<div class="deliverable"><div class="timeline-top"><a href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener"><strong>${escapeHtml(item.title)}</strong></a><span>${badge(item.status)}</span></div><small class="muted">Version ${item.version}${item.client_note ? ` · Client: ${escapeHtml(item.client_note)}` : ""}</small></div>`).join("")}
        <button class="text-button detail-action" data-add-deliverable="${milestone.id}">Share deliverable</button>
      </article>`).join("") : empty("Add the first milestone to create the client delivery plan.")}
    </div>`;
  $("#project-dialog").showModal();
}

function setView(view) {
  state.view = view;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $("#view-title").textContent = titleCase(view);
  $("#view-eyebrow").textContent = ["website", "team"].includes(view) ? "Administration" : "Workspace";
  $(".sidebar").classList.remove("open");
}

const field = (label, name, type = "text", options = {}) => {
  const wide = options.wide ? "wide" : "";
  if (type === "select") return `<label class="${wide}">${label}<select name="${name}" ${options.required ? "required" : ""}>${options.items.map((item) => `<option value="${escapeHtml(item.value)}" ${String(options.value) === String(item.value) ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>`;
  if (type === "textarea") return `<label class="${wide}">${label}<textarea name="${name}" ${options.required ? "required" : ""}>${escapeHtml(options.value || "")}</textarea></label>`;
  return `<label class="${wide}">${label}<input name="${name}" type="${type}" ${type !== "file" ? `value="${escapeHtml(options.value || "")}"` : ""} ${options.required ? "required" : ""} ${options.min != null ? `min="${options.min}"` : ""} ${options.accept ? `accept="${escapeHtml(options.accept)}"` : ""}></label>`;
};

function openDialog(kind, record = null) {
  const fields = $("#dialog-fields");
  const form = $("#entity-form");
  form.dataset.kind = kind;
  form.dataset.id = record?.id || "";
  form.dataset.projectId = record?.project_id || "";
  form.dataset.milestoneId = record?.milestone_id || "";
  form.dataset.intakeId = record?.intake_submission_id || "";
  $("#dialog-eyebrow").textContent = record ? "Update" : "Create";
  const configs = {
    client: {
      title: record ? "Edit client" : "Add client",
      html: field("Client name", "name", "text", { required: true, value: record?.name }) +
        field("Company", "company", "text", { value: record?.company }) +
        field("Email", "email", "email", { value: record?.email }) +
        field("Phone", "phone", "tel", { value: record?.phone }) +
        field("Notes", "notes", "textarea", { wide: true, value: record?.notes }),
    },
    project: {
      title: "New project",
      html: field("Project title", "title", "text", { required: true, value: record?.title }) +
        field("Client", "client_id", "select", { required: true, value: record?.client_id, items: [{ value: "", label: "Select a client" }, ...state.data.clients.map((c) => ({ value: c.id, label: c.name }))] }) +
        field("Service", "service", "text", { value: record?.service }) +
        field("Budget", "budget", "number", { min: 0, value: record?.budget }) +
        field("Start date", "start_date", "date") +
        field("Due date", "due_date", "date") +
        field("Description", "description", "textarea", { wide: true, value: record?.description }),
    },
    invoice: {
      title: "New invoice",
      html: field("Invoice number", "invoice_number", "text", { required: true, value: `OLY-${new Date().getFullYear()}-${String(state.data.invoices.length + 1).padStart(3, "0")}` }) +
        field("Project", "project_id", "select", { required: true, items: [{ value: "", label: "Select a project" }, ...state.data.projects.map((p) => ({ value: p.id, label: p.title }))] }) +
        field("Subtotal", "subtotal", "number", { required: true, min: 0 }) +
        field("Tax", "tax", "number", { min: 0 }) +
        field("Due date", "due_date", "date", { required: true }) +
        field("Notes", "notes", "textarea", { wide: true }),
    },
    page: {
      title: `Edit ${record?.title || "page"}`,
      html: field("Page title", "title", "text", { required: true, value: record?.title }) +
        field("Status", "status", "select", { items: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }], value: record?.status }) +
        field("SEO title", "seo_title", "text", { wide: true, value: record?.seo_title }) +
        field("SEO description", "seo_description", "textarea", { wide: true, value: record?.seo_description }) +
        field("Content (JSON)", "content", "textarea", { wide: true, value: JSON.stringify(record?.content || {}, null, 2) }),
    },
    milestone: {
      title: "Add milestone",
      html: field("Milestone title", "title", "text", { required: true }) +
        field("Due date", "due_date", "date") +
        field("Description", "description", "textarea", { wide: true }) +
        field("Requires client approval", "requires_approval", "select", { items: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] }),
    },
    deliverable: {
      title: "Share deliverable",
      html: field("Deliverable title", "title", "text", { required: true }) +
        field("Version", "version", "number", { required: true, min: 1, value: 1 }) +
        field("Secure file URL", "file_url", "url", { required: true, wide: true }) +
        field("Description", "description", "textarea", { wide: true }),
    },
    service: {
      title: "Add service",
      html: field("Service title", "title", "text", { required: true }) +
        field("Slug", "slug", "text", { required: true }) +
        field("Status", "status", "select", { items: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }] }) +
        field("Image URL", "image_url", "url") +
        field("Summary", "summary", "textarea", { wide: true }),
    },
    media: {
      title: "Upload media asset",
      html: field("Internal name", "internal_name", "text", { required: true }) +
        field("Image file", "file", "file", { required: true, accept: "image/jpeg,image/png,image/webp,image/gif,image/svg+xml" }) +
        field("Alternative text", "alt_text", "textarea", { wide: true, required: true }),
    },
  };
  const config = configs[kind];
  $("#dialog-title").textContent = config.title;
  fields.innerHTML = config.html;
  $("#dialog-message").textContent = "";
  $("#entity-dialog").showModal();
}

async function saveEntity(event) {
  event.preventDefault();
  const submit = $("#dialog-submit");
  submit.disabled = true;
  $("#dialog-message").textContent = "";
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const kind = form.dataset.kind;
  let uploadedPath = null;
  try {
    let query;
    if (kind === "client") {
      query = state.supabase.from("clients").insert({ ...values, created_by: state.profile.id });
    } else if (kind === "project") {
      query = state.supabase.from("projects").insert({
        ...values, budget: values.budget || null, created_by: state.profile.id,
        status: "draft", currency: "NGN", intake_submission_id: form.dataset.intakeId || null,
      }).select("id").single();
    } else if (kind === "invoice") {
      query = state.supabase.from("invoices").insert({
        ...values, subtotal: Number(values.subtotal), tax: Number(values.tax || 0),
        created_by: state.profile.id, status: "draft", currency: "NGN",
      });
    } else if (kind === "page") {
      let content;
      try { content = JSON.parse(values.content); } catch { throw new Error("Content must be valid JSON."); }
      query = state.supabase.from("pages").update({
        title: values.title, status: values.status, seo_title: values.seo_title || null,
        seo_description: values.seo_description || null, content,
        published_at: values.status === "published" ? new Date().toISOString() : null,
        updated_by: state.profile.id,
      }).eq("id", form.dataset.id);
    } else if (kind === "milestone") {
      const project = state.data.projects.find((item) => item.id === form.dataset.projectId);
      query = state.supabase.from("milestones").insert({
        project_id: form.dataset.projectId,
        title: values.title,
        due_date: values.due_date || null,
        description: values.description || null,
        requires_approval: values.requires_approval === "true",
        position: project?.milestones?.length || 0,
      });
    } else if (kind === "deliverable") {
      query = state.supabase.from("deliverables").insert({
        milestone_id: form.dataset.milestoneId,
        title: values.title,
        version: Number(values.version),
        file_url: values.file_url,
        description: values.description || null,
        status: "shared",
        uploaded_by: state.profile.id,
      });
    } else if (kind === "service") {
      query = state.supabase.from("services").insert({
        title: values.title, slug: values.slug, status: values.status,
        image_url: values.image_url || null, summary: values.summary || null,
        position: state.data.services.length,
      });
    } else if (kind === "media") {
      const file = values.file;
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await state.supabase.storage.from("site-media").upload(storagePath, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploadedPath = storagePath;
      const { data: publicFile } = state.supabase.storage.from("site-media").getPublicUrl(storagePath);
      query = state.supabase.from("media_assets").insert({
        storage_path: storagePath,
        public_url: publicFile.publicUrl,
        internal_name: values.internal_name,
        alt_text: values.alt_text,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: state.profile.id,
      });
    }
    const { error } = await query;
    if (error) throw error;
    $("#entity-dialog").close();
    toast(`${titleCase(kind)} saved.`);
    await refreshData();
  } catch (error) {
    if (uploadedPath) await state.supabase.storage.from("site-media").remove([uploadedPath]);
    $("#dialog-message").textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) setView(nav.dataset.view);
  const jump = event.target.closest("[data-view-jump]");
  if (jump) setView(jump.dataset.viewJump);
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "new-client") openDialog("client");
  if (action === "new-project") openDialog("project");
  if (action === "new-invoice") openDialog("invoice");
  if (action === "new-service") openDialog("service");
  if (action === "new-media") openDialog("media");
  const projectId = event.target.closest("[data-open-project]")?.dataset.openProject;
  if (projectId) openProject(projectId);
  const milestoneProjectId = event.target.closest("[data-add-milestone]")?.dataset.addMilestone;
  if (milestoneProjectId) {
    $("#project-dialog").close();
    openDialog("milestone", { project_id: milestoneProjectId });
  }
  const deliverableMilestoneId = event.target.closest("[data-add-deliverable]")?.dataset.addDeliverable;
  if (deliverableMilestoneId) {
    $("#project-dialog").close();
    openDialog("deliverable", { milestone_id: deliverableMilestoneId });
  }
  const inviteProjectId = event.target.closest("[data-invite-client]")?.dataset.inviteClient;
  if (inviteProjectId) {
    const email = window.prompt("Client email address");
    if (!email) return;
    const { data, error } = await state.supabase.from("project_invites").insert({
      project_id: inviteProjectId,
      email: email.trim().toLowerCase(),
      created_by: state.profile.id,
    }).select("token").single();
    if (error) toast(error.message);
    else {
      const inviteUrl = `${window.location.origin}/portal?invite=${data.token}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast("Secure client link copied. It expires in 7 days.");
      } catch {
        window.prompt("Copy this secure client link", inviteUrl);
      }
    }
  }
  if (event.target.closest("[data-close-project]")) $("#project-dialog").close();
  const pageId = event.target.closest("[data-edit-page]")?.dataset.editPage;
  if (pageId) openDialog("page", state.data.pages.find((page) => page.id === pageId));
  const reviewId = event.target.closest("[data-review-intake]")?.dataset.reviewIntake;
  if (reviewId) {
    const item = state.data.intake.find((entry) => entry.id === reviewId);
    if (item?.status === "new") {
      const { error } = await state.supabase.from("intake_submissions").update({ status: "reviewing" }).eq("id", reviewId);
      if (error) toast(error.message); else { toast("Enquiry moved to review."); await refreshData(); }
    } else if (item?.status === "reviewing") {
      let client = state.data.clients.find((entry) => entry.email?.toLowerCase() === item.email.toLowerCase());
      if (!client) {
        const { data, error } = await state.supabase.from("clients").insert({
          name: item.name,
          email: item.email,
          phone: item.phone || null,
          created_by: state.profile.id,
        }).select("*").single();
        if (error) { toast(error.message); return; }
        client = { ...data, projects: [] };
        state.data.clients.unshift(client);
      }
      openDialog("project", {
        title: item.title || `${item.name} project`,
        service: item.service,
        budget: String(item.budget || "").replace(/[^0-9.]/g, ""),
        description: item.message,
        client_id: client.id,
        intake_submission_id: item.id,
      });
    } else toast(item?.message || "No additional message was provided.");
  }
  const tab = event.target.closest("[data-content-tab]")?.dataset.contentTab;
  if (tab) renderWebsite(tab);
  const invoiceId = event.target.closest("[data-invoice-status]")?.dataset.invoiceStatus;
  const nextStatus = event.target.closest("[data-invoice-status]")?.dataset.nextStatus;
  if (invoiceId && nextStatus) {
    const patch = { status: nextStatus };
    if (nextStatus === "paid") {
      const reference = window.prompt("Payment reference or method");
      if (!reference) return;
      patch.payment_reference = reference;
    }
    const { error } = await state.supabase.from("invoices").update(patch).eq("id", invoiceId);
    if (error) toast(error.message);
    else { toast(nextStatus === "paid" ? "Invoice marked paid." : "Invoice finalized and ready to send."); await refreshData(); }
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
$("#entity-form").addEventListener("submit", saveEntity);
$("#sign-out").addEventListener("click", () => state.supabase.auth.signOut());
$("#menu-button").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
["inbox-search", "inbox-filter"].forEach((id) => $(`#${id}`).addEventListener("input", renderInbox));
["project-search", "project-filter"].forEach((id) => $(`#${id}`).addEventListener("input", renderProjects));
$("#client-search").addEventListener("input", renderClients);
["invoice-search", "invoice-filter"].forEach((id) => $(`#${id}`).addEventListener("input", renderInvoices));

bootstrap();
