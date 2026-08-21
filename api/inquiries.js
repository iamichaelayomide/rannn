import { createHash } from "node:crypto";

const ALLOWED_INTENTS = new Set(["general", "project", "event"]);
const ALLOWED_CHANNELS = new Set(["email", "whatsapp", "phone"]);
const DEFAULT_WHATSAPP_NUMBER = "2348087172313";

function text(value, maxLength = 5000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function nullableText(value, maxLength = 5000) {
  const normalized = text(value, maxLength);
  return normalized || null;
}

function email(value) {
  const normalized = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function phone(value) {
  const normalized = text(value, 40).replace(/[^\d+]/g, "");
  return normalized.length >= 7 ? normalized : null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function publicUrl(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers["x-forwarded-host"] || request.headers.host || "rannn-phi.vercel.app";
  return `${protocol}://${host}`;
}

async function supabaseRequest(path, { method = "GET", body, prefer } = {}) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("The enquiry service is not configured");

  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error_description || "The enquiry service could not complete the request");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  return result.success === true;
}

async function ownerEmails() {
  const configured = text(process.env.INQUIRY_NOTIFICATION_EMAIL, 1000)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length) return [...new Set(configured)];

  try {
    const profiles = await supabaseRequest("/rest/v1/profiles?select=id&role=eq.owner");
    const ownerIds = new Set((profiles || []).map((profile) => profile.id));
    if (!ownerIds.size) return [];
    const users = await supabaseRequest("/auth/v1/admin/users?page=1&per_page=1000");
    return [...new Set((users.users || [])
      .filter((user) => ownerIds.has(user.id) && user.email)
      .map((user) => user.email.toLowerCase()))];
  } catch {
    return [];
  }
}

async function createDelivery({ inquiryId, channel, recipient, provider }) {
  const path = "/rest/v1/notification_deliveries?on_conflict=inquiry_id,channel,recipient&select=*";
  const rows = await supabaseRequest(path, {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      inquiry_id: inquiryId,
      channel,
      recipient,
      provider,
      status: "pending",
      attempts: 0,
    },
  });
  if (rows[0]) return { record: rows[0], shouldSend: true };
  const existing = await supabaseRequest(
    `/rest/v1/notification_deliveries?inquiry_id=eq.${encodeURIComponent(inquiryId)}&channel=eq.${encodeURIComponent(channel)}&recipient=eq.${encodeURIComponent(recipient)}&select=*&limit=1`,
  );
  return { record: existing[0], shouldSend: false };
}

async function finishDelivery(id, values) {
  if (!id) return;
  await supabaseRequest(`/rest/v1/notification_deliveries?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: values,
  });
}

async function sendEmail({ inquiryId, recipient, subject, html }) {
  const { record: delivery, shouldSend } = await createDelivery({
    inquiryId,
    channel: "email",
    recipient,
    provider: "resend",
  });
  if (!shouldSend) return { sent: delivery?.status === "sent", duplicate: true };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await finishDelivery(delivery.id, {
      status: "skipped",
      attempts: 0,
      last_error: "Resend is not configured",
    });
    return { sent: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Olympus Atelier <onboarding@resend.dev>",
        to: [recipient],
        subject,
        html,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Resend rejected the email");
    await finishDelivery(delivery.id, {
      status: "sent",
      attempts: 1,
      provider_message_id: result.id || null,
      sent_at: new Date().toISOString(),
      last_error: null,
    });
    return { sent: true };
  } catch (error) {
    await finishDelivery(delivery.id, {
      status: "failed",
      attempts: 1,
      last_error: String(error.message || error).slice(0, 500),
      next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    return { sent: false };
  }
}

async function sendOwnerWhatsApp({ inquiryId, ticketNumber, name, intent }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.INQUIRY_WHATSAPP_RECIPIENT;
  const templateName = process.env.WHATSAPP_ALERT_TEMPLATE;
  if (!recipient) return { sent: false, skipped: true };

  const { record: delivery, shouldSend } = await createDelivery({
    inquiryId,
    channel: "whatsapp",
    recipient,
    provider: "meta",
  });
  if (!shouldSend) return { sent: delivery?.status === "sent", duplicate: true };
  if (!accessToken || !phoneNumberId || !templateName) {
    await finishDelivery(delivery.id, {
      status: "skipped",
      last_error: "WhatsApp Business Platform is not configured",
    });
    return { sent: false, skipped: true };
  }

  try {
    const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_ALERT_LANGUAGE || "en" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: ticketNumber },
              { type: "text", text: name },
              { type: "text", text: intent },
            ],
          }],
        },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error?.message || "WhatsApp rejected the alert");
    await finishDelivery(delivery.id, {
      status: "sent",
      attempts: 1,
      provider_message_id: result.messages?.[0]?.id || null,
      sent_at: new Date().toISOString(),
      last_error: null,
    });
    return { sent: true };
  } catch (error) {
    await finishDelivery(delivery.id, {
      status: "failed",
      attempts: 1,
      last_error: String(error.message || error).slice(0, 500),
      next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    return { sent: false };
  }
}

function confirmationEmail({ ticketNumber, name, intent, dashboardUrl }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:620px;margin:auto">
      <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8a6b13">Olympus Atelier</p>
      <h1 style="font-size:28px;line-height:1.2">We received your enquiry.</h1>
      <p>Hello ${escapeHtml(name)}, thank you for contacting Olympus Atelier.</p>
      <p>Your reference is <strong>${escapeHtml(ticketNumber)}</strong>. We normally respond within one business day.</p>
      <p style="color:#666">Enquiry type: ${escapeHtml(intent)}</p>
      <p>You can reply to this email if you need to add anything else.</p>
      <p><a href="${escapeHtml(dashboardUrl)}" style="color:#8a6b13">Visit Olympus Atelier</a></p>
    </div>`;
}

function ownerAlertEmail({ ticketNumber, name, intent, service, message, adminUrl }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:620px;margin:auto">
      <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8a6b13">Olympus Atelier enquiry</p>
      <h1 style="font-size:28px;line-height:1.2">${escapeHtml(ticketNumber)}</h1>
      <p><strong>${escapeHtml(name)}</strong> submitted a ${escapeHtml(intent)} enquiry.</p>
      ${service ? `<p>Service: ${escapeHtml(service)}</p>` : ""}
      <blockquote style="margin:20px 0;padding:16px;border-left:3px solid #d4a72c;background:#f7f7f7">${escapeHtml(message)}</blockquote>
      <p><a href="${escapeHtml(adminUrl)}" style="color:#8a6b13">Open this enquiry</a></p>
    </div>`;
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = request.body && typeof request.body === "object"
      ? request.body
      : JSON.parse(request.body || "{}");
    if (JSON.stringify(rawBody).length > 25000) {
      return response.status(413).json({ error: "This enquiry is too large" });
    }
    if (text(rawBody.website || rawBody.company_website, 200)) {
      return response.status(201).json({ accepted: true, ticketNumber: "OLY-INQ-RECEIVED" });
    }

    const normalizedName = text(rawBody.name, 120);
    const normalizedEmail = email(rawBody.email);
    const normalizedPhone = phone(rawBody.phone);
    const normalizedMessage = text(rawBody.message, 5000);
    const intent = ALLOWED_INTENTS.has(rawBody.intent) ? rawBody.intent : null;
    const preferredChannel = ALLOWED_CHANNELS.has(rawBody.preferred_channel)
      ? rawBody.preferred_channel
      : normalizedPhone ? "whatsapp" : "email";
    if (
      normalizedName.length < 2
      || normalizedMessage.length < 10
      || !intent
      || (!normalizedEmail && !normalizedPhone)
      || rawBody.consent !== true
    ) {
      return response.status(422).json({
        error: "Add your name, a message, consent, and at least one valid contact method.",
      });
    }

    const remoteIp = text(
      String(request.headers["x-forwarded-for"] || "").split(",")[0],
      80,
    );
    const turnstileValid = await verifyTurnstile(text(rawBody.turnstile_token, 3000), remoteIp);
    if (!turnstileValid) {
      return response.status(422).json({ error: "Please complete the security check and try again." });
    }

    const fingerprint = createHash("sha256")
      .update([
        remoteIp || "unknown",
        text(request.headers["user-agent"], 300),
        process.env.INQUIRY_RATE_LIMIT_SALT || "olympus-enquiry-v1",
      ].join("|"))
      .digest("hex");
    const requestedSiteKey = text(rawBody.site_key, 80).toLowerCase();
    const payload = {
      site_key: /^[a-z0-9-]+$/.test(requestedSiteKey) ? requestedSiteKey : "olympus-atelier",
      intent,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      preferred_channel: preferredChannel,
      title: nullableText(rawBody.title, 180) || `${intent === "general" ? "General" : intent === "event" ? "Event" : "Project"} enquiry`,
      service: nullableText(rawBody.service, 180),
      budget: nullableText(rawBody.budget, 120),
      timeline: nullableText(rawBody.timeline, 120),
      message: normalizedMessage,
      consent: true,
      source_page: nullableText(rawBody.source_page, 120),
      source_cta: nullableText(rawBody.source_cta, 180),
      source_url: nullableText(rawBody.source_url, 1000),
      referrer: nullableText(rawBody.referrer, 1000),
      utm: typeof rawBody.utm === "object" && rawBody.utm ? rawBody.utm : {},
      payload: {
        location: nullableText(rawBody.location, 240),
        preferred_date: nullableText(rawBody.preferred_date, 80),
        event_hours: nullableText(rawBody.event_hours, 80),
        portfolio_reference: nullableText(rawBody.portfolio_reference, 240),
      },
      idempotency_key: nullableText(rawBody.idempotency_key, 120),
    };

    const rpcResult = await supabaseRequest("/rest/v1/rpc/create_public_inquiry", {
      method: "POST",
      body: {
        target_payload: payload,
        target_fingerprint: fingerprint,
      },
    });
    const result = rpcResult[0] || {};
    if (!result.accepted) {
      if (result.error_code === "rate_limited") {
        return response.status(429).json({ error: "Too many enquiries were sent. Please wait 15 minutes and try again." });
      }
      return response.status(422).json({ error: "Please check the enquiry details and try again." });
    }

    const ticketNumber = result.ticket_number;
    const baseUrl = publicUrl(request);
    const adminUrl = `${baseUrl}/admin#inbox/${result.inquiry_id}`;
    const whatsappNumber = process.env.WHATSAPP_PUBLIC_NUMBER || DEFAULT_WHATSAPP_NUMBER;
    const whatsappLines = [
      `Hi Olympus Atelier, I am ${normalizedName || "a client"}.`,
      "",
      payload.service
        ? `I would like to make an enquiry regarding *${payload.service}*.`
        : "I would like to make an enquiry regarding a creative visual project with the atelier.",
      "",
      "Here are the details of my request:",
      payload.service ? `• *Service:* ${payload.service}` : null,
      payload.budget ? `• *Budget / Selected Package:* ${payload.budget}` : null,
      payload.timeline || payload.preferred_date ? `• *Preferred Date / Timeline:* ${payload.timeline || payload.preferred_date}` : null,
      payload.location ? `• *Location / Venue:* ${payload.location}` : null,
      normalizedPhone ? `• *Phone / WhatsApp:* ${normalizedPhone}` : null,
      normalizedEmail ? `• *Email:* ${normalizedEmail}` : null,
      ticketNumber ? `• *Enquiry Reference:* ${ticketNumber}` : null,
    ].filter(Boolean);

    if (normalizedMessage) {
      whatsappLines.push("");
      whatsappLines.push("📝 *Project Brief & Details:*");
      whatsappLines.push(normalizedMessage);
    }
    const whatsappMessage = whatsappLines.join("\n");
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    let acknowledgement = normalizedEmail ? "queued" : "not_requested";
    if (normalizedEmail) {
      const acknowledgementResult = await sendEmail({
        inquiryId: result.inquiry_id,
        recipient: normalizedEmail,
        subject: `We received ${ticketNumber}`,
        html: confirmationEmail({
          ticketNumber,
          name: normalizedName,
          intent,
          dashboardUrl: baseUrl,
        }),
      });
      acknowledgement = acknowledgementResult.sent ? "sent" : acknowledgementResult.skipped ? "unavailable" : "failed";
    }

    const recipients = await ownerEmails();
    await Promise.all(recipients.map((recipient) => sendEmail({
      inquiryId: result.inquiry_id,
      recipient,
      subject: `New enquiry ${ticketNumber} from ${normalizedName}`,
      html: ownerAlertEmail({
        ticketNumber,
        name: normalizedName,
        intent,
        service: payload.service,
        message: normalizedMessage,
        adminUrl,
      }),
    })));
    await sendOwnerWhatsApp({
      inquiryId: result.inquiry_id,
      ticketNumber,
      name: normalizedName,
      intent,
    });

    return response.status(201).json({
      accepted: true,
      inquiryId: result.inquiry_id,
      ticketNumber,
      acknowledgementState: acknowledgement,
      whatsappUrl,
      expectedResponse: "within one business day",
    });
  } catch (error) {
    console.error("Enquiry submission failed", error instanceof Error ? error.message : error);
    return response.status(error.status === 401 ? 503 : 500).json({
      error: "We could not save your enquiry. Your details are still here—please try again.",
    });
  }
}
