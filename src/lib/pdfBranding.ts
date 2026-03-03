import jsPDF from "jspdf";

// ── Brand Colors ──
export const PDF_COLORS = {
  forest: [31, 107, 69] as [number, number, number],       // #1F6B45
  forestDeep: [26, 58, 42] as [number, number, number],     // #1A3A2A
  gold: [212, 168, 67] as [number, number, number],         // #D4A843
  darkText: [30, 30, 30] as [number, number, number],
  mutedText: [120, 120, 120] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  tableHeaderBg: [31, 107, 69] as [number, number, number],
};

// ── Contact Info ──
const CONTACT = {
  phone: "+254 741 027 140",
  email: "info@duaraflow.co.ke",
  website: "www.duaraflow.co.ke",
  location: "Mombasa, Kenya",
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

/**
 * Adds a professional branded header to the PDF.
 * Returns the Y position after the header for content to start.
 */
export const addBrandedHeader = async (
  doc: jsPDF,
  documentTitle: string,
  documentSubtitle?: string,
  options?: { orgLogoBase64?: string | null }
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await getDuaraFlowLogo();

  // ── Top accent bar (gold) ──
  doc.setFillColor(...PDF_COLORS.gold);
  doc.rect(0, 0, pageWidth, 4, "F");

  // ── Logo ──
  if (logo) {
    doc.addImage(logo, "PNG", 15, 10, 52, 20);
  } else {
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.forest);
    doc.text("DUARA FLOW", 15, 24);
  }

  // ── Org logo (right side) ──
  if (options?.orgLogoBase64) {
    doc.addImage(options.orgLogoBase64, "PNG", pageWidth - 45, 10, 30, 20);
  }

  // ── Contact info (right-aligned) ──
  const contactX = options?.orgLogoBase64 ? pageWidth - 50 : pageWidth - 15;
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(CONTACT.phone, contactX, 12, { align: "right" });
  doc.text(CONTACT.email, contactX, 16, { align: "right" });
  doc.text(CONTACT.website, contactX, 20, { align: "right" });
  doc.text(CONTACT.location, contactX, 24, { align: "right" });

  // ── Separator line ──
  doc.setDrawColor(...PDF_COLORS.forest);
  doc.setLineWidth(0.8);
  doc.line(15, 33, pageWidth - 15, 33);

  // ── Document Title ──
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.forestDeep);
  doc.text(documentTitle.toUpperCase(), 15, 42);

  let y = 46;
  if (documentSubtitle) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(documentSubtitle, 15, y);
    y += 6;
  }

  // ── Thin gold accent under title ──
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(15, y, 60, y);
  y += 8;

  doc.setTextColor(...PDF_COLORS.darkText);
  return y;
};

/**
 * Adds a branded footer to every page of the PDF.
 */
export const addBrandedFooter = async (doc: jsPDF) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const intelligenceLogo = await getDuaraIntelligenceLogo();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 18;

    // ── Separator ──
    doc.setDrawColor(...PDF_COLORS.lightGray);
    doc.setLineWidth(0.3);
    doc.line(15, footerY, pageWidth - 15, footerY);

    // ── Intelligence logo (left) ──
    if (intelligenceLogo) {
      doc.addImage(intelligenceLogo, "PNG", 15, footerY + 2, 25, 13);
    }

    // ── Contact info (center) ──
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.mutedText);
    const centerX = pageWidth / 2;
    doc.text(`${CONTACT.phone}  •  ${CONTACT.email}  •  ${CONTACT.website}`, centerX, footerY + 6, { align: "center" });
    doc.text(`${CONTACT.location}  •  System-generated document — Duara Flow`, centerX, footerY + 10, { align: "center" });

    // ── Page number (right) ──
    doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, footerY + 8, { align: "right" });
  }
};

/**
 * Draw a styled table header row.
 */
export const drawTableHeader = (
  doc: jsPDF,
  columns: { label: string; x: number }[],
  y: number,
  width: number = 170
) => {
  doc.setFillColor(...PDF_COLORS.forest);
  doc.rect(15, y - 5, width, 8, "F");
  doc.setTextColor(...PDF_COLORS.white);
  doc.setFontSize(8);
  columns.forEach((col) => {
    doc.text(col.label, col.x, y);
  });
  doc.setTextColor(...PDF_COLORS.darkText);
  return y + 8;
};

/**
 * Draw alternating row background for table readability.
 */
export const drawTableRow = (
  doc: jsPDF,
  y: number,
  index: number,
  width: number = 170
) => {
  if (index % 2 === 0) {
    doc.setFillColor(248, 248, 248);
    doc.rect(15, y - 4, width, 7, "F");
  }
};

/**
 * Add a section title with forest color.
 */
export const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.forest);
  doc.text(title, 15, y);
  doc.setTextColor(...PDF_COLORS.darkText);
  return y + 10;
};

/**
 * Draw a totals line with separator.
 */
export const drawTotalLine = (doc: jsPDF, label: string, y: number): number => {
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.forestDeep);
  doc.text(label, 110, y);
  doc.setTextColor(...PDF_COLORS.darkText);
  return y + 8;
};

/**
 * Add document metadata (date, reference, entity, etc.)
 */
export const addDocMeta = (
  doc: jsPDF,
  fields: { label: string; value: string }[],
  startY: number
): number => {
  let y = startY;
  doc.setFontSize(9);
  fields.forEach((f) => {
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${f.label}:`, 15, y);
    doc.setTextColor(...PDF_COLORS.darkText);
    doc.text(f.value, 55, y);
    y += 7;
  });
  return y + 4;
};

/**
 * Complete PDF generation with header + footer.
 * Call this at the very end before doc.save().
 */
export const finalizePdf = async (doc: jsPDF) => {
  await addBrandedFooter(doc);
};
