import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[char]);
const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
const badge = (status) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(titleCase(status))}</span>`;
const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
  : "Not set";
const money = (value, currency = "NGN") => new Intl.NumberFormat("en-NG", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Number(value || 0));

let supabase;
let session;

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  $("#toast-region").append(node);
  setTimeout(() => node.remove(), 3600);
}

async function bootstrap() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = await response.json().catch(() => ({}));
    if (!response.ok || !config.configured) throw new Error(config.message || "Portal unavailable.");
    supabase = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    ({ data: { session } } = await supabase.auth.getSession());
    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      session = nextSession;
      if (session) await showPortal();
      else showLogin();
    });
    if (session) await showPortal();
    else showLogin();
  } catch (error) {
    $("#portal-login-message").textContent = error.message;
    $("#portal-login button").disabled = true;
  }
}

function showLogin() {
  $("#portal-auth").classList.remove("hidden");
  $("#portal-app").classList.add("hidden");
  $("#portal-sign-out").classList.add("hidden");
}

async function showPortal() {
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  if (inviteToken) {
    const { error: inviteError } = await supabase.rpc("claim_project_invite", { invite_token: inviteToken });
    if (inviteError) toast(inviteError.message);
    else {
      toast("Project invitation accepted.");
      history.replaceState({}, "", "/portal");
    }
  }
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      *,
      clients(name, company),
      milestones(
        id, title, description, due_date, position, status, requires_approval,
        deliverables(id, title, description, file_url, version, status, client_note, created_at)
      ),
      invoices(id, invoice_number, status, currency, total, due_date)
    `)
    .order("created_at", { ascending: false });
  if (error) {
    $("#portal-login-message").textContent = error.message;
    return;
  }
  $("#portal-auth").classList.add("hidden");
  $("#portal-app").classList.remove("hidden");
  $("#portal-sign-out").classList.remove("hidden");
  $("#portal-greeting").textContent = profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Your projects";
  renderProjects(projects || []);
}

function renderProjects(projects) {
  $("#portal-projects").innerHTML = projects.length ? projects.map((project) => {
    const milestones = [...(project.milestones || [])].sort((a, b) => a.position - b.position);
    const done = milestones.filter((m) => ["approved", "completed"].includes(m.status)).length;
    const progress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
    const openInvoices = (project.invoices || []).filter((invoice) => invoice.status === "open");
    return `<article class="portal-project">
      <header class="portal-project-head">
        <div><p class="eyebrow">${escapeHtml(project.clients?.company || project.clients?.name || "Project")}</p><h2>${escapeHtml(project.title)}</h2><p class="muted">${escapeHtml(project.description || "Your project details and delivery history appear here.")}</p></div>
        <div>${badge(project.status)}</div>
      </header>
      <div class="portal-project-body">
        <div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%"></span></div>
        <p class="muted">${progress}% complete · ${done} of ${milestones.length} milestones approved</p>
        <div class="portal-columns">
          <section><p class="eyebrow">Delivery plan</p><h3>Milestones & deliverables</h3>
            <div class="timeline">${milestones.length ? milestones.map((milestone) => milestoneMarkup(milestone)).join("") : '<p class="muted">The delivery plan is being prepared.</p>'}</div>
          </section>
          <aside><p class="eyebrow">Billing</p><h3>Invoices</h3>
            ${(project.invoices || []).length ? project.invoices.map((invoice) => `<div class="item-row"><div><strong>${escapeHtml(invoice.invoice_number)}</strong><small>Due ${formatDate(invoice.due_date)}</small></div><div><strong>${money(invoice.total, invoice.currency)}</strong><small>${badge(invoice.status)}</small></div></div>`).join("") : '<p class="muted">No invoices have been shared.</p>'}
            ${openInvoices.length ? '<p class="muted">Payment instructions are included on the invoice sent by the studio.</p>' : ""}
          </aside>
        </div>
      </div>
    </article>`;
  }).join("") : `<section class="panel empty">No projects are assigned to this account yet. Ask the studio to invite this email address.</section>`;
}

function milestoneMarkup(milestone) {
  const deliverables = milestone.deliverables || [];
  return `<article class="timeline-item">
    <div class="timeline-top"><div><strong>${escapeHtml(milestone.title)}</strong><small class="muted">Due ${formatDate(milestone.due_date)}</small></div>${badge(milestone.status)}</div>
    ${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ""}
    ${deliverables.map((item) => `<div class="deliverable">
      <div class="timeline-top"><a href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener"><strong>${escapeHtml(item.title)}</strong></a><small class="muted">v${item.version}</small></div>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      ${item.status === "shared" ? `<div class="deliverable-actions"><button class="button primary" data-review="${item.id}" data-status="approved">Approve</button><button class="button secondary" data-show-change-form="${item.id}">Request changes</button></div><form class="change-request-form hidden" data-change-request="${item.id}"><label>What should be changed?<textarea name="client_note" required placeholder="Describe the change clearly so the studio can act on it."></textarea></label><div class="inline-actions"><button class="button secondary" type="button" data-cancel-change-form>Cancel</button><button class="button primary" type="submit">Send request</button></div><p class="form-message" role="alert"></p></form>` : badge(item.status)}
    </div>`).join("")}
  </article>`;
}

$("#portal-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  const email = new FormData(event.currentTarget).get("email");
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  const redirectUrl = new URL("/portal", window.location.origin);
  if (inviteToken) redirectUrl.searchParams.set("invite", inviteToken);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl.toString() },
  });
  $("#portal-login-message").textContent = error ? error.message : "Check your inbox for the secure sign-in link.";
  button.disabled = false;
});

document.addEventListener("click", async (event) => {
  const showChange = event.target.closest("[data-show-change-form]");
  if (showChange) {
    const form = $(`[data-change-request="${showChange.dataset.showChangeForm}"]`);
    form.classList.remove("hidden");
    $("textarea", form).focus();
    return;
  }
  const cancelChange = event.target.closest("[data-cancel-change-form]");
  if (cancelChange) {
    cancelChange.closest("[data-change-request]").classList.add("hidden");
    return;
  }
  const review = event.target.closest("[data-review]");
  if (!review) return;
  const status = review.dataset.status;
  review.disabled = true;
  const { error } = await supabase.from("deliverables").update({ status, client_note: null }).eq("id", review.dataset.review);
  if (error) toast(error.message);
  else { toast("Deliverable approved."); await showPortal(); }
  review.disabled = false;
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-change-request]");
  if (!form) return;
  event.preventDefault();
  const clientNote = new FormData(form).get("client_note")?.trim();
  if (!clientNote) return;
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  const { error } = await supabase.from("deliverables").update({ status: "changes_requested", client_note: clientNote }).eq("id", form.dataset.changeRequest);
  if (error) $(".form-message", form).textContent = error.message;
  else {
    toast("Change request sent.");
    await showPortal();
  }
  button.disabled = false;
});

$("#portal-sign-out").addEventListener("click", () => supabase.auth.signOut());

bootstrap();
