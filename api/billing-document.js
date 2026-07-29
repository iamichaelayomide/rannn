import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument, appendBezierCurve, closePath, degrees, lineTo, moveTo, rgb,
  setLineWidth, setStrokingColor, stroke,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const PAGE = [595.28, 841.89];
const BLACK = rgb(0.025, 0.025, 0.025);
const GREY = rgb(0.29, 0.29, 0.29);
const LIGHT = rgb(0.72, 0.72, 0.72);
const WHITE = rgb(1, 1, 1);

function safeFilename(value) {
  return String(value || "Document").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(value));
}

function money(value, currency) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: currency || "NGN", minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function wrap(text, font, size, width) {
  const lines = [];
  let line = "";
  for (const word of String(text || "").split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function getRows(url, key, token, resource) {
  const response = await fetch(`${url}/rest/v1/${resource}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  return response.json();
}

async function loadDocument(url, key, token, type, id) {
  const invoiceSelect = encodeURIComponent("*,clients(id,name,email,company,phone),projects(id,title)");
  const settings = (await getRows(url, key, token, "billing_settings?id=eq.true&select=*"))[0] || {};
  if (type === "invoice") {
    const liveInvoice = (await getRows(url, key, token, `invoices?id=eq.${encodeURIComponent(id)}&select=${invoiceSelect}`))[0];
    if (!liveInvoice) return null;
    const liveItems = await getRows(url, key, token, `invoice_items?invoice_id=eq.${encodeURIComponent(id)}&select=*&order=position.asc`);
    const snapshot = liveInvoice.document_snapshot || null;
    const invoice = snapshot?.invoice
      ? { ...liveInvoice, ...snapshot.invoice, clients: snapshot.client || liveInvoice.clients, projects: snapshot.project || liveInvoice.projects }
      : liveInvoice;
    return normalize(type, invoice, invoice, snapshot?.items || liveItems, snapshot?.settings || settings, snapshot);
  }
  if (type === "receipt") {
    const payment = (await getRows(url, key, token, `invoice_payments?id=eq.${encodeURIComponent(id)}&select=*`))[0];
    if (!payment) return null;
    const liveInvoice = (await getRows(url, key, token, `invoices?id=eq.${encodeURIComponent(payment.invoice_id)}&select=${invoiceSelect}`))[0];
    if (!liveInvoice) return null;
    const snapshot = payment.document_snapshot || {};
    const invoiceSnapshot = snapshot.invoice_snapshot || {};
    const invoice = invoiceSnapshot.invoice
      ? { ...liveInvoice, ...invoiceSnapshot.invoice, clients: invoiceSnapshot.client || liveInvoice.clients, projects: invoiceSnapshot.project || liveInvoice.projects }
      : liveInvoice;
    const receiptItems = [{
      description: `${payment.method}${payment.reference ? ` · ${payment.reference}` : ""}`,
      quantity: 1,
      unit_price: payment.amount,
    }];
    return normalize(type, payment, invoice, receiptItems, invoiceSnapshot.settings || settings, snapshot);
  }
  const kind = type === "debit" ? "debit" : "credit";
  const adjustment = (await getRows(url, key, token, `invoice_adjustments?id=eq.${encodeURIComponent(id)}&kind=eq.${kind}&select=*`))[0];
  if (!adjustment) return null;
  const liveInvoice = (await getRows(url, key, token, `invoices?id=eq.${encodeURIComponent(adjustment.invoice_id)}&select=${invoiceSelect}`))[0];
  if (!liveInvoice) return null;
  const liveItems = await getRows(url, key, token, `invoice_adjustment_items?adjustment_id=eq.${encodeURIComponent(id)}&select=*&order=position.asc`);
  const snapshot = adjustment.document_snapshot || {};
  const invoiceSnapshot = snapshot.invoice_snapshot || {};
  const invoice = invoiceSnapshot.invoice
    ? { ...liveInvoice, ...invoiceSnapshot.invoice, clients: invoiceSnapshot.client || liveInvoice.clients, projects: invoiceSnapshot.project || liveInvoice.projects }
    : liveInvoice;
  return normalize(type, adjustment, invoice, snapshot.items || liveItems, snapshot.invoice_snapshot?.settings || settings, snapshot);
}

function normalize(type, record, invoice, items, settings, snapshot) {
  const title = { invoice: "INVOICE", receipt: "RECEIPT", debit: "DEBIT NOTE", credit: "CREDIT NOTE" }[type];
  const number = type === "invoice" ? invoice.invoice_number
    : type === "receipt" ? record.receipt_number : record.note_number || "DRAFT";
  const total = type === "invoice" ? Number(invoice.total || 0)
    : type === "receipt" ? Number(record.amount || 0) : Number(record.total || 0);
  const vat = type === "invoice" ? Number(invoice.tax || 0)
    : type === "receipt" ? 0 : Number(record.tax || 0);
  return {
    type, title, number, record, invoice, items, settings, snapshot,
    total, vat, currency: invoice.currency || record.currency || "NGN",
    client: invoice.clients || snapshot?.invoice_snapshot?.client || {},
    date: type === "invoice" ? invoice.issued_at || invoice.created_at
      : type === "receipt" ? record.paid_at : record.issued_at || record.created_at,
  };
}

function roundedBorder(page) {
  const x = 24;
  const y = 24;
  const width = PAGE[0] - 48;
  const height = PAGE[1] - 48;
  const radius = 18;
  const k = .5522848 * radius;
  page.pushOperators(
    setStrokingColor(BLACK),
    setLineWidth(1.35),
    moveTo(x + radius, y),
    lineTo(x + width - radius, y),
    appendBezierCurve(x + width - radius + k, y, x + width, y + radius - k, x + width, y + radius),
    lineTo(x + width, y + height - radius),
    appendBezierCurve(x + width, y + height - radius + k, x + width - radius + k, y + height, x + width - radius, y + height),
    lineTo(x + radius, y + height),
    appendBezierCurve(x + radius - k, y + height, x, y + height - radius + k, x, y + height - radius),
    lineTo(x, y + radius),
    appendBezierCurve(x, y + radius - k, x + radius - k, y, x + radius, y),
    closePath(),
    stroke(),
  );
}

function dottedLine(page, y, left = 55, right = 540) {
  for (let x = left; x < right; x += 7) {
    page.drawLine({ start: { x, y }, end: { x: Math.min(x + 2.5, right), y }, thickness: .45, color: LIGHT });
  }
}

function drawHeader(page, document, regular, bold, condensed, continued = false) {
  roundedBorder(page);
  page.drawText("OLYMPUS", { x: 56, y: 777, size: 12.5, font: bold, color: BLACK });
  page.drawText("ATELIER", { x: 57, y: 765, size: 5.5, font: bold, color: BLACK, characterSpacing: 2 });
  const address = wrap(document.settings.address || "", regular, 6.6, 175);
  address.slice(0, 3).forEach((line, index) => page.drawText(line, { x: 176, y: 782 - index * 9, size: 6.6, font: regular, color: GREY }));
  page.drawText(`Payer ID: ${document.settings.payer_id || "—"}`, { x: 176, y: 750, size: 6.4, font: regular, color: GREY });
  page.drawText(`TIN: ${document.settings.tin || "—"}`, { x: 176, y: 740, size: 6.4, font: regular, color: GREY });
  const titleSize = document.title.length > 10 ? 34 : 48;
  const title = continued ? `${document.title} · CONTINUED` : document.title;
  const titleWidth = condensed.widthOfTextAtSize(title, continued ? 18 : titleSize);
  page.drawText(title, {
    x: 538 - titleWidth, y: continued ? 763 : 746,
    size: continued ? 18 : titleSize, font: condensed, color: BLACK,
  });
  page.drawText("OLYMPUS", {
    x: 96, y: 166, size: 124, font: condensed, color: rgb(.94, .94, .94),
    rotate: degrees(58), opacity: .6,
  });
}

function drawParties(page, document, regular, bold) {
  page.drawText("CLIENT", { x: 56, y: 684, size: 6.4, font: bold, color: GREY });
  page.drawText("DOCUMENT NO.", { x: 376, y: 684, size: 6.4, font: bold, color: GREY });
  page.drawText(document.client.name || "Client", { x: 56, y: 665, size: 11, font: bold, color: BLACK });
  const clientLine = document.client.company || document.client.email || "";
  if (clientLine) page.drawText(clientLine, { x: 56, y: 650, size: 7.5, font: regular, color: GREY });
  page.drawText(document.number, { x: 376, y: 665, size: 9.5, font: bold, color: BLACK });
  page.drawText(formatDate(document.date), { x: 376, y: 650, size: 7.5, font: regular, color: GREY });
  if (document.record.reason) {
    page.drawText("REASON", { x: 56, y: 620, size: 6.4, font: bold, color: GREY });
    wrap(document.record.reason, regular, 7.5, 470).slice(0, 2).forEach((line, index) => page.drawText(line, { x: 56, y: 606 - index * 10, size: 7.5, font: regular, color: BLACK }));
  }
}

function drawTableHeader(page, y, regular, bold) {
  page.drawText("ITEM", { x: 56, y, size: 6.4, font: bold, color: GREY });
  page.drawText("DELIVERABLES", { x: 112, y, size: 6.4, font: bold, color: GREY });
  page.drawText("PRICE", { x: 505, y, size: 6.4, font: bold, color: GREY });
  dottedLine(page, y - 11);
  return y - 30;
}

function drawFooter(page, document, regular, bold, pageNumber, totalPages) {
  page.drawLine({ start: { x: 55, y: 98 }, end: { x: 540, y: 98 }, thickness: .8, color: BLACK });
  const columns = [
    [56, 135, "BANK DETAILS", `${document.settings.bank_name || ""} / ${document.settings.account_name || ""}`, document.settings.account_number || ""],
    [228, 184, "PAYMENT POLICY", `${Number(document.settings.deposit_percent || 70)}% deposit`, document.settings.policy_text || ""],
    [444, 94, "CONTACT", document.settings.contact_phone || "", document.settings.contact_email || ""],
  ];
  for (const [x, width, label, strong, detail] of columns) {
    page.drawText(label, { x, y: 84, size: 5.8, font: bold, color: GREY });
    wrap(strong, bold, 6.3, width).slice(0, 2).forEach((line, i) => page.drawText(line, { x, y: 71 - i * 8, size: 6.3, font: bold, color: BLACK }));
    wrap(detail, regular, 5.7, width).slice(0, 3).forEach((line, i) => page.drawText(line, { x, y: 52 - i * 7, size: 5.7, font: regular, color: GREY }));
  }
  if (totalPages > 1) {
    const label = `${pageNumber} / ${totalPages}`;
    page.drawText(label, { x: 538 - regular.widthOfTextAtSize(label, 5.5), y: 31, size: 5.5, font: regular, color: GREY });
  }
}

async function generatePdf(document) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontRoot = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  const [regularBytes, boldBytes, condensedBytes] = await Promise.all([
    readFile(path.join(fontRoot, "DejaVuSans.ttf")),
    readFile(path.join(fontRoot, "DejaVuSans-Bold.ttf")),
    readFile(path.join(fontRoot, "DejaVuSansCondensed-Bold.ttf")),
  ]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const condensed = await pdf.embedFont(condensedBytes, { subset: true });

  const chunks = [];
  let current = [];
  let available = 430;
  for (const item of document.items) {
    const lines = wrap(item.description, regular, 7.7, 300);
    const height = Math.max(34, lines.length * 10 + 16);
    if (current.length && height > available) {
      chunks.push(current);
      current = [];
      available = 575;
    }
    current.push({ ...item, lines, height });
    available -= height;
  }
  chunks.push(current);

  chunks.forEach((items, pageIndex) => {
    const page = pdf.addPage(PAGE);
    drawHeader(page, document, regular, bold, condensed, pageIndex > 0);
    let y;
    if (pageIndex === 0) {
      drawParties(page, document, regular, bold);
      y = drawTableHeader(page, document.record.reason ? 558 : 590, regular, bold);
    } else {
      y = drawTableHeader(page, 705, regular, bold);
    }
    items.forEach((item, index) => {
      page.drawText(String(chunks.slice(0, pageIndex).reduce((sum, chunk) => sum + chunk.length, 0) + index + 1).padStart(2, "0"), { x: 56, y, size: 7.4, font: regular, color: GREY });
      item.lines.forEach((line, lineIndex) => page.drawText(line, { x: 112, y: y - lineIndex * 10, size: 7.7, font: lineIndex ? regular : bold, color: BLACK }));
      if (Number(item.quantity || 1) !== 1) page.drawText(`${item.quantity} × ${money(item.unit_price, document.currency)}`, { x: 112, y: y - item.lines.length * 10 - 2, size: 6.4, font: regular, color: GREY });
      const amount = money(Number(item.quantity || 1) * Number(item.unit_price || 0), document.currency);
      page.drawText(amount, { x: 538 - regular.widthOfTextAtSize(amount, 7.3), y, size: 7.3, font: regular, color: BLACK });
      y -= item.height;
      dottedLine(page, y + 8);
    });
    if (pageIndex === chunks.length - 1) {
      if (document.type !== "receipt") {
        page.drawText(`VAT ${document.type === "invoice" ? Number(document.invoice.vat_rate || 7.5) : Number(document.record.vat_rate || 7.5)}%`, { x: 112, y: y - 5, size: 7.5, font: bold, color: BLACK });
        const vat = money(document.vat, document.currency);
        page.drawText(vat, { x: 538 - regular.widthOfTextAtSize(vat, 7.3), y: y - 5, size: 7.3, font: regular, color: BLACK });
        y -= 36;
        dottedLine(page, y + 8);
      }
      const totalLabel = document.type === "receipt" ? "AMOUNT RECEIVED" : "TOTAL";
      page.drawText(totalLabel, { x: 338, y: y - 18, size: 7.2, font: bold, color: GREY });
      const total = money(document.total, document.currency);
      page.drawText(total, { x: 538 - bold.widthOfTextAtSize(total, 13), y: y - 22, size: 13, font: bold, color: BLACK });
      if (document.type === "receipt") {
        const remaining = Number(document.snapshot?.balance_after || 0);
        page.drawText(`Invoice ${document.invoice.invoice_number} · Remaining ${money(remaining, document.currency)}`, { x: 338, y: y - 42, size: 6.5, font: regular, color: GREY });
      }
    }
    drawFooter(page, document, regular, bold, pageIndex + 1, chunks.length);
  });

  pdf.setTitle(`${document.title} ${document.number}`);
  pdf.setAuthor("Olympus Atelier");
  pdf.setCreator("Olympus Atelier Billing");
  return pdf.save();
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const type = String(request.query?.type || "invoice").toLowerCase();
  const id = String(request.query?.id || "");
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!["invoice", "receipt", "debit", "credit"].includes(type)) return response.status(400).json({ error: "Unsupported document type." });
  if (!id || !token) return response.status(401).json({ error: "Sign in to download this document." });
  if (!url || !key) return response.status(503).json({ error: "The document service is unavailable." });
  try {
    const document = await loadDocument(url, key, token, type, id);
    if (!document) return response.status(404).json({ error: "Document not found or access denied." });
    const bytes = await generatePdf(document);
    const typeName = { invoice: "Invoice", receipt: "Receipt", debit: "Debit-Note", credit: "Credit-Note" }[type];
    const filename = `Olympus-Atelier-${typeName}-${safeFilename(document.number)}.pdf`;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error("Billing document PDF error", error instanceof Error ? error.message : error);
    return response.status(500).json({ error: "The document PDF could not be created. Please try again." });
  }
}

export { generatePdf };
