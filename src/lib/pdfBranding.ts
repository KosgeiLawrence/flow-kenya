import jsPDF from "jspdf";

// ── Modern Minimal Color Palette ──
export const PDF_COLORS = {
  // Primary text
  black: [20, 20, 20] as [number, number, number],
  darkText: [35, 35, 35] as [number, number, number],
  bodyText: [55, 55, 55] as [number, number, number],
  mutedText: [130, 130, 130] as [number, number, number],
  lightMuted: [170, 170, 170] as [number, number, number],

  // Backgrounds & dividers
  white: [255, 255, 255] as [number, number, number],
  offWhite: [250, 250, 250] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  divider: [225, 225, 225] as [number, number, number],
  tableRowAlt: [248, 249, 250] as [number, number, number],

  // Brand accent (used sparingly)
  forest: [31, 107, 69] as [number, number, number],
  forestDeep: [22, 78, 50] as [number, number, number],
  gold: [198, 155, 55] as [number, number, number],
  // Legacy aliases
  tableHeaderBg: [31, 107, 69] as [number, number, number],
};

// ── Contact Info ──
const CONTACT = {
  phone: "+254 741 027 140",
  email: "info@duaraflow.co.ke",
  website: "www.duaraflow.co.ke",
  location: "Mombasa, Kenya",
};

// ── Spacing Constants (8px system mapped to PDF mm) ──
const S = {
  margin: 20,      // page margin
  gutter: 4,       // small gap
  sectionGap: 12,  // between sections
  lineHeight: 5,   // body text line height
  rowHeight: 7,    // table row height
};

// Safe vertical bounds (A4 = 297mm). Footer occupies ph - 18 to ph - 4.
// Content must stop before the footer divider with a small breathing margin.
export const PDF_BOTTOM_LIMIT = 262;   // last safe Y for body content on A4
export const PDF_TOP_RESET = 24;       // Y to reset to after addPage()

/**
 * Ensure there's room for `needed` mm of content; otherwise add a page and
 * return the new top Y. Use before drawing any block of content.
 */
export const ensureSpace = (doc: jsPDF, y: number, needed: number): number => {
  if (y + needed > PDF_BOTTOM_LIMIT) {
    doc.addPage();
    return PDF_TOP_RESET;
  }
  return y;
};

/**
 * Draw text that auto-wraps to the available width and auto-paginates.
 * Returns the new Y after the last line. Use for any user-supplied or
 * variable-length string (names, notes, addresses, descriptions).
 */
export const safeText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    maxWidth?: number;     // wrap width in mm; defaults to right-margin
    lineHeight?: number;   // mm between lines
    align?: "left" | "right" | "center";
  }
): number => {
  if (!text) return y;
  const pw = doc.internal.pageSize.getWidth();
  const maxW = options?.maxWidth ?? pw - S.margin - x;
  const lh = options?.lineHeight ?? 5;
  const lines = doc.splitTextToSize(String(text), Math.max(maxW, 10)) as string[];
  for (const line of lines) {
    y = ensureSpace(doc, y, lh);
    if (options?.align && options.align !== "left") {
      doc.text(line, x, y, { align: options.align });
    } else {
      doc.text(line, x, y);
    }
    y += lh;
  }
  return y;
};

// ── Logo Cache ──
let _duaraLogoCache: string | null = null;
let _intelligenceLogoCache: string | null = null;

const loadSvgAsBase64 = (url: string, width: number, height: number): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, width * 2, height * 2);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const getDuaraFlowLogo = async (): Promise<string | null> => {
  if (_duaraLogoCache) return _duaraLogoCache;
  _duaraLogoCache = await loadSvgAsBase64("/images/duara-flow-logo.svg", 400, 160);
  return _duaraLogoCache;
};

const getDuaraIntelligenceLogo = async (): Promise<string | null> => {
  if (_intelligenceLogoCache) return _intelligenceLogoCache;
  _intelligenceLogoCache = await loadSvgAsBase64("/images/duara-intelligence-logo.svg", 300, 160);
  return _intelligenceLogoCache;
};

// ── Utility: thin horizontal divider ──
const drawDivider = (doc: jsPDF, y: number, x1?: number, x2?: number) => {
  const pw = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...PDF_COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(x1 ?? S.margin, y, x2 ?? (pw - S.margin), y);
};

/**
 * Premium branded header — Duara Flow logo + contact.
 * Clean, minimal layout inspired by Stripe invoices.
 */
export const addBrandedHeader = async (
  doc: jsPDF,
  documentTitle: string,
  documentSubtitle?: string,
  options?: { orgLogoBase64?: string | null }
): Promise<number> => {
  const pw = doc.internal.pageSize.getWidth();
  const logo = await getDuaraFlowLogo();

  // Logo (left)
  let y = 18;
  if (logo) {
    doc.addImage(logo, "PNG", S.margin, 12, 48, 18);
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.forest);
    doc.text("DUARA FLOW", S.margin, y + 4);
  }

  // Org logo (right side, if provided)
  if (options?.orgLogoBase64) {
    doc.addImage(options.orgLogoBase64, "PNG", pw - S.margin - 28, 12, 28, 18);
  }

  // Contact info — right aligned, small & muted.
  // Shift further left when org logo present so the two never collide.
  const contactX = options?.orgLogoBase64 ? pw - S.margin - 32 : pw - S.margin;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(CONTACT.phone, contactX, 14, { align: "right" });
  doc.text(CONTACT.email, contactX, 18, { align: "right" });
  doc.text(CONTACT.website, contactX, 22, { align: "right" });
  doc.text(CONTACT.location, contactX, 26, { align: "right" });

  y = 34;
  drawDivider(doc, y);
  y += 10;

  // Document title — large, bold, dark
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.black);
  doc.text(documentTitle, S.margin, y);
  y += 4;

  if (documentSubtitle) {
    y += 2;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(documentSubtitle, S.margin, y);
    y += 4;
  }

  y += 6;
  doc.setTextColor(...PDF_COLORS.darkText);
  doc.setFont("helvetica", "normal");
  return y;
};

/**
 * Clean branded footer — page numbers, subtle contact line, intelligence logo.
 */
export const addBrandedFooter = async (doc: jsPDF) => {
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const intelligenceLogo = await getDuaraIntelligenceLogo();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = ph - 18;

    drawDivider(doc, footerY);

    // Intelligence logo (left)
    if (intelligenceLogo) {
      doc.addImage(intelligenceLogo, "PNG", S.margin, footerY + 2, 22, 11);
    }

    // Contact line (center)
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.lightMuted);
    const cx = pw / 2;
    doc.text(`${CONTACT.phone}  ·  ${CONTACT.email}  ·  ${CONTACT.website}`, cx, footerY + 6, { align: "center" });
    doc.text(`${CONTACT.location}  ·  Generated by Duara Flow`, cx, footerY + 10, { align: "center" });

    // Page number (right)
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${i} / ${totalPages}`, pw - S.margin, footerY + 8, { align: "right" });
  }
};

/**
 * Modern table header — light background, no heavy fills.
 * Uses thin bottom border and muted uppercase labels.
 */
export const drawTableHeader = (
  doc: jsPDF,
  columns: { label: string; x: number }[],
  y: number,
  width: number = 170
) => {
  // Light gray background strip — aligned to match data row strips below
  doc.setFillColor(...PDF_COLORS.offWhite);
  doc.rect(S.margin, y - 5, width, 8, "F");

  // Bottom border of header
  doc.setDrawColor(...PDF_COLORS.divider);
  doc.setLineWidth(0.4);
  doc.line(S.margin, y + 3, S.margin + width, y + 3);

  // Labels — small, uppercase, muted
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.mutedText);
  columns.forEach((col) => {
    doc.text(col.label.toUpperCase(), col.x, y);
  });

  doc.setTextColor(...PDF_COLORS.darkText);
  doc.setFont("helvetica", "normal");
  return y + 8;
};

/**
 * Table row — subtle alternating background, no borders.
 * Background height matches the 8mm row stride used by callers so text
 * always sits visually inside the tinted strip.
 */
export const drawTableRow = (
  doc: jsPDF,
  y: number,
  index: number,
  width: number = 170,
  rowHeight: number = 8
) => {
  if (index % 2 === 0) {
    doc.setFillColor(...PDF_COLORS.tableRowAlt);
    // Center the strip vertically around the text baseline at `y`.
    // Text baseline at y, ascender ~3mm above => start strip at y - 5.
    doc.rect(S.margin, y - 5, width, rowHeight, "F");
  }
};

/**
 * Draw a text cell that is automatically truncated with an ellipsis if it
 * would overflow `maxWidth` (mm). Use for table columns so long values
 * (e.g. category names) never bleed into the next column or out of the
 * row background.
 */
export const drawTextCell = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: { align?: "left" | "right" | "center" }
) => {
  if (!text) return;
  let str = String(text);
  const tw = (s: string) => doc.getTextWidth(s);
  if (tw(str) > maxWidth) {
    // Trim until fits with ellipsis
    while (str.length > 1 && tw(str + "…") > maxWidth) {
      str = str.slice(0, -1);
    }
    str = str.trimEnd() + "…";
  }
  if (options?.align && options.align !== "left") {
    doc.text(str, x, y, { align: options.align });
  } else {
    doc.text(str, x, y);
  }
};

/**
 * Section title — clean, with a subtle bottom accent.
 */
export const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.black);
  doc.text(title, S.margin, y);

  // Thin accent underline
  doc.setDrawColor(...PDF_COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(S.margin, y + 2, S.margin + 40, y + 2);

  doc.setTextColor(...PDF_COLORS.darkText);
  doc.setFont("helvetica", "normal");
  return y + 10;
};

/**
 * Totals line — thin top divider + bold total in brand color.
 */
export const drawTotalLine = (doc: jsPDF, label: string, y: number): number => {
  const pw = doc.internal.pageSize.getWidth();
  drawDivider(doc, y);
  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.forest);
  doc.text(label, pw - S.margin, y, { align: "right" });
  doc.setTextColor(...PDF_COLORS.darkText);
  doc.setFont("helvetica", "normal");
  return y + 10;
};

/**
 * VAT total block — subtotal, VAT, grand total with clean alignment.
 */
export const drawVatTotalBlock = (
  doc: jsPDF,
  subtotal: number,
  vatPercent: number,
  includeVat: boolean,
  y: number,
  currency: string = "KES"
): number => {
  const pw = doc.internal.pageSize.getWidth();
  const rightX = pw - S.margin;

  drawDivider(doc, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.bodyText);
  doc.text("Subtotal", rightX - 55, y);
  doc.text(`${currency} ${subtotal.toLocaleString()}`, rightX, y, { align: "right" });
  y += 7;

  if (includeVat) {
    const vatAmount = subtotal * (vatPercent / 100);
    doc.text(`VAT (${vatPercent}%)`, rightX - 55, y);
    doc.text(`${currency} ${vatAmount.toLocaleString()}`, rightX, y, { align: "right" });
    y += 7;

    // Grand total — bold, slightly larger
    drawDivider(doc, y - 2, rightX - 60, rightX);
    y += 4;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.black);
    doc.text("Total", rightX - 55, y);
    doc.text(`${currency} ${(subtotal + vatAmount).toLocaleString()}`, rightX, y, { align: "right" });
  } else {
    drawDivider(doc, y - 2, rightX - 60, rightX);
    y += 4;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.black);
    doc.text("Total", rightX - 55, y);
    doc.text(`${currency} ${subtotal.toLocaleString()}`, rightX, y, { align: "right" });
  }

  doc.setTextColor(...PDF_COLORS.darkText);
  doc.setFont("helvetica", "normal");
  return y + 10;
};

/**
 * Document metadata — structured label:value pairs with clean spacing.
 */
export const addDocMeta = (
  doc: jsPDF,
  fields: { label: string; value: string }[],
  startY: number
): number => {
  let y = startY;
  const pw = doc.internal.pageSize.getWidth();
  const valueX = S.margin + 40;
  const valueMaxW = pw - S.margin - valueX; // stop at right margin
  doc.setFontSize(9);
  fields.forEach((f) => {
    y = ensureSpace(doc, y, 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${f.label}`, S.margin, y);
    doc.setTextColor(...PDF_COLORS.darkText);
    doc.setFont("helvetica", "bold");
    // Wrap long values (e.g. multi-line address) so they never bleed off page
    const lines = doc.splitTextToSize(String(f.value ?? ""), valueMaxW) as string[];
    lines.forEach((line, idx) => {
      if (idx > 0) y = ensureSpace(doc, y, 5);
      doc.text(line, valueX, y);
      if (idx < lines.length - 1) y += 5;
    });
    y += 6;
  });
  doc.setFont("helvetica", "normal");
  return y + 6;
};

/**
 * Finalize PDF — adds branded footer to every page.
 */
export const finalizePdf = async (doc: jsPDF) => {
  await addBrandedFooter(doc);
};

// ────────────────────────────────────────────
// Clean (org-branded) document utilities
// ────────────────────────────────────────────

export interface PdfOrgInfo {
  orgName: string;
  orgLogoBase64?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  physicalAddress?: string | null;
  county?: string | null;
  website?: string | null;
  kraPin?: string | null;
  companyRegistration?: string | null;
}

/**
 * Clean header — user/org branding, no Duara logos.
 * Stripe-like layout: logo left, contact right, title below.
 */
export const addCleanHeader = (
  doc: jsPDF,
  documentTitle: string,
  documentSubtitle?: string,
  orgInfo?: PdfOrgInfo | null
): number => {
  const pw = doc.internal.pageSize.getWidth();
  let y = 16;

  if (orgInfo) {
    // Org logo (left)
    if (orgInfo.orgLogoBase64) {
      try {
        doc.addImage(orgInfo.orgLogoBase64, "PNG", S.margin, y - 2, 26, 17);
      } catch { /* logo failed */ }
    }

    const textX = orgInfo.orgLogoBase64 ? S.margin + 30 : S.margin;

    // Org name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.black);
    doc.text(orgInfo.orgName, textX, y + 5);

    // Contact details — right column
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.mutedText);
    let ry = y;
    const rx = pw - S.margin;
    if (orgInfo.contactPhone) { doc.text(orgInfo.contactPhone, rx, ry, { align: "right" }); ry += 4; }
    if (orgInfo.contactEmail) { doc.text(orgInfo.contactEmail, rx, ry, { align: "right" }); ry += 4; }
    if (orgInfo.physicalAddress || orgInfo.county) {
      const addr = [orgInfo.physicalAddress, orgInfo.county].filter(Boolean).join(", ");
      doc.text(addr, rx, ry, { align: "right" }); ry += 4;
    }
    if (orgInfo.website) { doc.text(orgInfo.website, rx, ry, { align: "right" }); ry += 4; }
    const regParts: string[] = [];
    if (orgInfo.kraPin) regParts.push(`KRA: ${orgInfo.kraPin}`);
    if (orgInfo.companyRegistration) regParts.push(`Reg: ${orgInfo.companyRegistration}`);
    if (regParts.length) { doc.text(regParts.join("  ·  "), rx, ry, { align: "right" }); ry += 4; }

    y = Math.max(ry, y + 20) + 2;
  } else {
    y += 8;
  }

  // Divider
  drawDivider(doc, y);
  y += 10;

  // Document title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.black);
  doc.text(documentTitle, S.margin, y);
  y += 4;

  if (documentSubtitle) {
    y += 2;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(documentSubtitle, S.margin, y);
    y += 4;
  }

  y += 6;
  doc.setTextColor(...PDF_COLORS.darkText);
  doc.setFont("helvetica", "normal");
  return y;
};

/**
 * Clean footer — page numbers only, no branding.
 */
export const addCleanFooter = (doc: jsPDF) => {
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = ph - 14;
    drawDivider(doc, footerY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.lightMuted);
    doc.text(`Page ${i} of ${totalPages}`, pw - S.margin, footerY + 6, { align: "right" });
  }
};

/**
 * Finalize clean PDF — page numbers only.
 */
export const finalizeCleanPdf = (doc: jsPDF) => {
  addCleanFooter(doc);
};

/**
 * Load an image URL as base64 for PDF embedding.
 */
export const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Build PdfOrgInfo from useOrgInfo data.
 */
export const buildPdfOrgInfo = (
  orgInfo: { orgName: string; contactEmail?: string | null; contactPhone?: string | null; physicalAddress?: string | null; county?: string | null; website?: string | null; kraPin?: string | null; companyRegistration?: string | null },
  logoBase64?: string | null
): PdfOrgInfo => ({
  orgName: orgInfo.orgName,
  orgLogoBase64: logoBase64,
  contactEmail: orgInfo.contactEmail,
  contactPhone: orgInfo.contactPhone,
  physicalAddress: orgInfo.physicalAddress,
  county: orgInfo.county,
  website: orgInfo.website,
  kraPin: orgInfo.kraPin,
  companyRegistration: orgInfo.companyRegistration,
});
