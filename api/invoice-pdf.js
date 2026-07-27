import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const black = rgb(0.04, 0.04, 0.04);
const grey = rgb(0.38, 0.38, 0.38);
const line = rgb(0.86, 0.86, 0.86);
const pageSize = [595.28, 841.89];

function safeFilename(value) {
  return String(value || "Invoice").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
}

function money(value, currency) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function wrap(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function supabaseGet(url, key, token, resource) {
  const upstream = await fetch(`${url}/rest/v1/${resource}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!upstream.ok) throw new Error(`Database request failed (${upstream.status})`);
  return upstream.json();
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const id = String(request.query?.id || "");
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!id || !token) return response.status(401).json({ error: "Sign in to download this invoice." });
  if (!url || !key) return response.status(503).json({ error: "The invoice service is unavailable." });

  try {
    const select = encodeURIComponent("*,clients(name,email,company,phone),projects(title)");
    const [invoice] = await supabaseGet(url, key, token, `invoices?id=eq.${encodeURIComponent(id)}&select=${select}`);
    if (!invoice) return response.status(404).json({ error: "Invoice not found or access denied." });
    const items = await supabaseGet(url, key, token, `invoice_items?invoice_id=eq.${encodeURIComponent(id)}&select=*&order=position.asc`);

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fontBytes = await readFile(path.join(
      process.cwd(),
      "node_modules",
      "dejavu-fonts-ttf",
      "ttf",
      "DejaVuSans.ttf",
    ));
    const font = await pdf.embedFont(fontBytes, { subset: true });

    let page;
    let y;
    const left = 54;
    const right = 541;
    const addPage = () => {
      page = pdf.addPage(pageSize);
      y = 788;
      page.drawText("OLYMPUS", { x: left, y, size: 14, font, color: black });
      page.drawText("ATELIER", { x: left, y: y - 17, size: 8, font, color: black });
      page.drawText("INVOICE", { x: right - font.widthOfTextAtSize("INVOICE", 18), y: y - 2, size: 18, font, color: black });
      y -= 58;
    };
    addPage();

    page.drawText(invoice.invoice_number, { x: left, y, size: 10, font, color: grey });
    page.drawText(`Due ${date(invoice.due_date)}`, { x: right - font.widthOfTextAtSize(`Due ${date(invoice.due_date)}`, 10), y, size: 10, font, color: grey });
    y -= 45;

    page.drawText("BILL TO", { x: left, y, size: 8, font, color: grey });
    page.drawText(invoice.project_id ? "PROJECT" : invoice.job_reference ? "WORK REFERENCE" : "DUE DATE", { x: 330, y, size: 8, font, color: grey });
    y -= 18;
    page.drawText(invoice.clients?.name || "Client", { x: left, y, size: 13, font, color: black });
    const work = invoice.projects?.title || invoice.job_reference || date(invoice.due_date);
    wrap(work, font, 11, 210).slice(0, 2).forEach((text, index) => page.drawText(text, { x: 330, y: y - index * 15, size: 11, font, color: black }));
    y -= 17;
    if (invoice.clients?.email) page.drawText(invoice.clients.email, { x: left, y, size: 9, font, color: grey });
    y -= 47;

    const drawTableHead = () => {
      page.drawText("DESCRIPTION", { x: left, y, size: 8, font, color: grey });
      page.drawText("QTY", { x: 355, y, size: 8, font, color: grey });
      page.drawText("PRICE", { x: 405, y, size: 8, font, color: grey });
      page.drawText("AMOUNT", { x: 490, y, size: 8, font, color: grey });
      y -= 13;
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.7, color: line });
      y -= 22;
    };
    drawTableHead();

    for (const item of items) {
      const descriptionLines = wrap(item.description, font, 9, 275);
      const rowHeight = Math.max(32, descriptionLines.length * 13 + 12);
      if (y - rowHeight < 120) {
        addPage();
        drawTableHead();
      }
      descriptionLines.forEach((text, index) => page.drawText(text, { x: left, y: y - index * 13, size: 9, font, color: black }));
      page.drawText(String(Number(item.quantity)), { x: 355, y, size: 9, font, color: black });
      page.drawText(money(item.unit_price, invoice.currency), { x: 405, y, size: 9, font, color: black });
      const amount = money(Number(item.quantity) * Number(item.unit_price), invoice.currency);
      page.drawText(amount, { x: right - font.widthOfTextAtSize(amount, 9), y, size: 9, font, color: black });
      y -= rowHeight;
      page.drawLine({ start: { x: left, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 0.5, color: line });
    }

    if (y < 205) addPage();
    y -= 12;
    for (const [label, value, strong] of [
      ["Subtotal", money(invoice.subtotal, invoice.currency), false],
      ["Tax", money(invoice.tax, invoice.currency), false],
      ["Total", money(invoice.total, invoice.currency), true],
    ]) {
      page.drawText(label, { x: 365, y, size: strong ? 12 : 9, font, color: strong ? black : grey });
      page.drawText(value, { x: right - font.widthOfTextAtSize(value, strong ? 12 : 9), y, size: strong ? 12 : 9, font, color: black });
      y -= strong ? 26 : 20;
    }

    if (invoice.notes) {
      y -= 10;
      page.drawText("NOTES", { x: left, y, size: 8, font, color: grey });
      y -= 16;
      wrap(invoice.notes, font, 9, 470).slice(0, 6).forEach((text, index) => page.drawText(text, { x: left, y: y - index * 13, size: 9, font, color: grey }));
    }

    const bytes = await pdf.save();
    const filename = `Olympus-Atelier-Invoice-${safeFilename(invoice.invoice_number)}.pdf`;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error("Invoice PDF error", error instanceof Error ? error.message : error);
    return response.status(500).json({ error: "The invoice PDF could not be created. Please try again." });
  }
}
