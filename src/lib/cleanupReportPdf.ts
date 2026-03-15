import jsPDF from "jspdf";
import { format } from "date-fns";
import {
  PDF_COLORS,
  addBrandedHeader,
  addBrandedFooter,
  addSectionTitle,
  addDocMeta,
} from "./pdfBranding";

interface PartnerOrg {
  name: string;
  type?: string;
}

interface CleanupData {
  id: string;
  title: string;
  cleanup_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  location_type: string;
  lead_organizer: string;
  num_volunteers: number;
  num_waste_pickers: number;
  num_partner_orgs: number;
  total_waste_kg: number;
  plastic_waste_kg: number;
  recyclable_waste_kg: number;
  non_recyclable_waste_kg: number;
  num_bags: number;
  pet_bottles_kg: number;
  hdpe_kg: number;
  fishing_nets_kg: number;
  sachets_kg: number;
  glass_kg: number;
  metal_kg: number;
  other_materials_kg: number;
  waste_destination: string | null;
  transport_method: string | null;
  waste_sorted: boolean;
  observations: string | null;
  environmental_issues: string | null;
  recommendations: string | null;
  status: string;
  created_at: string;
  partner_organizations?: PartnerOrg[];
}

const LOCATION_LABELS: Record<string, string> = {
  beach: "Beach", river: "River", community: "Community",
  public_space: "Public Space", forest: "Forest", roadside: "Roadside",
  market: "Market", industrial: "Industrial Zone", other: "Other",
};

// ── Drawing helpers ──

const drawRoundedRect = (
  doc: jsPDF, x: number, y: number, w: number, h: number,
  r: number, fill: [number, number, number], stroke?: [number, number, number]
) => {
  if (stroke) { doc.setDrawColor(...stroke); doc.setLineWidth(0.3); }
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
};

const drawHorizBar = (
  doc: jsPDF, x: number, y: number, maxW: number, h: number,
  pct: number, barColor: [number, number, number], bgColor: [number, number, number]
) => {
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y, maxW, h, h / 2, h / 2, "F");
  if (pct > 0) {
    doc.setFillColor(...barColor);
    doc.roundedRect(x, y, Math.max(maxW * pct, h), h, h / 2, h / 2, "F");
  }
};

const drawStatCard = (
  doc: jsPDF, x: number, y: number, w: number,
  value: string, label: string, accent: [number, number, number]
) => {
  drawRoundedRect(doc, x, y, w, 28, 3, [250, 250, 248]);
  // Accent top strip
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, w, 4, 3, 3, "F");
  doc.rect(x, y + 2, w, 2, "F"); // fill bottom corners
  // Value
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text(value, x + w / 2, y + 16, { align: "center" });
  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(label, x + w / 2, y + 23, { align: "center" });
};

const drawWasteBarRow = (
  doc: jsPDF, y: number, label: string, value: number,
  maxVal: number, color: [number, number, number]
) => {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.darkText);
  doc.text(label, 20, y + 3);
  const barX = 65;
  const barW = 95;
  const pct = maxVal > 0 ? value / maxVal : 0;
  drawHorizBar(doc, barX, y - 1, barW, 5, pct, color, [235, 235, 235]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  doc.text(`${value} kg`, barX + barW + 3, y + 3);
};

const ensurePage = (doc: jsPDF, y: number, needed: number): number => {
  if (y + needed > 268) { doc.addPage(); return 20; }
  return y;
};

// ── Main generator ──

export const generateCleanupReportPDF = async (cleanup: CleanupData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Branded header ──
  let y = await addBrandedHeader(
    doc,
    "Cleanup Exercise Report",
    `${cleanup.title} — ${format(new Date(cleanup.cleanup_date), "PPP")}`
  );

  // ── Meta info panel ──
  drawRoundedRect(doc, 15, y, pageWidth - 30, 30, 3, [245, 248, 245], PDF_COLORS.forest);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const metaCol1 = [
    { l: "Reference", v: cleanup.id.slice(0, 8).toUpperCase() },
    { l: "Date", v: format(new Date(cleanup.cleanup_date), "PPP") },
    { l: "Time", v: `${cleanup.start_time} – ${cleanup.end_time}` },
  ];
  const metaCol2 = [
    { l: "Location", v: `${cleanup.location_name}` },
    { l: "Type", v: LOCATION_LABELS[cleanup.location_type] || cleanup.location_type },
    { l: "Organizer", v: cleanup.lead_organizer },
  ];
  let my = y + 8;
  metaCol1.forEach((m) => {
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${m.l}:`, 20, my);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.setFont("helvetica", "bold");
    doc.text(m.v, 48, my);
    doc.setFont("helvetica", "normal");
    my += 8;
  });
  my = y + 8;
  metaCol2.forEach((m) => {
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${m.l}:`, pageWidth / 2 + 5, my);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.setFont("helvetica", "bold");
    doc.text(m.v, pageWidth / 2 + 33, my);
    doc.setFont("helvetica", "normal");
    my += 8;
  });
  if (cleanup.location_lat && cleanup.location_lng) {
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`GPS: ${cleanup.location_lat.toFixed(5)}, ${cleanup.location_lng.toFixed(5)}`, pageWidth - 20, y + 28, { align: "right" });
  }
  y += 36;

  // ── Key Metrics Cards ──
  y = ensurePage(doc, y, 38);
  y = addSectionTitle(doc, "Key Metrics", y);
  const cardW = (pageWidth - 30 - 12) / 4; // 4 cards, 4px gap
  const metrics = [
    { v: `${cleanup.total_waste_kg}`, l: "Total Waste (kg)", c: PDF_COLORS.forest },
    { v: `${cleanup.num_bags}`, l: "Bags Collected", c: PDF_COLORS.gold },
    { v: `${cleanup.num_volunteers + cleanup.num_waste_pickers}`, l: "Total Participants", c: [59, 130, 186] as [number, number, number] },
    { v: `${cleanup.num_partner_orgs}`, l: "Partner Orgs", c: [168, 85, 156] as [number, number, number] },
  ];
  metrics.forEach((m, i) => {
    drawStatCard(doc, 15 + i * (cardW + 4), y, cardW, m.v, m.l, m.c);
  });
  y += 36;

  // ── Participation breakdown ──
  y = ensurePage(doc, y, 30);
  y = addSectionTitle(doc, "Participation", y);
  const partItems = [
    { l: "Volunteers", v: cleanup.num_volunteers, c: [59, 130, 186] as [number, number, number] },
    { l: "Waste Pickers", v: cleanup.num_waste_pickers, c: PDF_COLORS.forest },
    { l: "Partner Organizations", v: cleanup.num_partner_orgs, c: PDF_COLORS.gold },
  ];
  const totalPart = Math.max(cleanup.num_volunteers + cleanup.num_waste_pickers + cleanup.num_partner_orgs, 1);
  partItems.forEach((item) => {
    const pct = item.v / totalPart;
    drawHorizBar(doc, 60, y - 2, 90, 5, pct, item.c, [235, 235, 235]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.darkText);
    doc.text(item.l, 20, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...item.c);
    doc.text(`${item.v}`, 155, y + 2);
    y += 10;
  });
  y += 4;

  // ── Waste Collection Summary ──
  y = ensurePage(doc, y, 40);
  y = addSectionTitle(doc, "Waste Collection Summary", y);

  // Summary row with colored badges
  const summaryItems = [
    { l: "Plastic", v: cleanup.plastic_waste_kg, c: [0, 150, 136] as [number, number, number] },
    { l: "Recyclable", v: cleanup.recyclable_waste_kg, c: PDF_COLORS.forest },
    { l: "Non-Recyclable", v: cleanup.non_recyclable_waste_kg, c: [183, 28, 28] as [number, number, number] },
  ];
  const badgeW = 50;
  summaryItems.forEach((s, i) => {
    const bx = 15 + i * (badgeW + 8);
    drawRoundedRect(doc, bx, y, badgeW, 16, 3, s.c);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(`${s.v} kg`, bx + badgeW / 2, y + 7, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(s.l, bx + badgeW / 2, y + 13, { align: "center" });
  });
  y += 24;

  // ── Detailed Waste Breakdown (bar chart) ──
  y = ensurePage(doc, y, 70);
  y = addSectionTitle(doc, "Waste Breakdown by Material", y);

  const wasteItems = [
    { l: "PET Bottles", v: cleanup.pet_bottles_kg, c: [0, 150, 136] as [number, number, number] },
    { l: "HDPE", v: cleanup.hdpe_kg, c: [56, 142, 60] as [number, number, number] },
    { l: "Sachets", v: cleanup.sachets_kg, c: [255, 152, 0] as [number, number, number] },
    { l: "Fishing Nets", v: cleanup.fishing_nets_kg, c: [33, 150, 243] as [number, number, number] },
    { l: "Glass", v: cleanup.glass_kg, c: [121, 85, 72] as [number, number, number] },
    { l: "Metal", v: cleanup.metal_kg, c: [96, 125, 139] as [number, number, number] },
    { l: "Other Materials", v: cleanup.other_materials_kg, c: [158, 158, 158] as [number, number, number] },
  ];
  const maxWaste = Math.max(...wasteItems.map((w) => w.v), 1);
  wasteItems.forEach((w) => {
    y = ensurePage(doc, y, 12);
    drawWasteBarRow(doc, y, w.l, w.v, maxWaste, w.c);
    y += 10;
  });
  y += 4;

  // ── Donut-style waste composition (circle segments) ──
  y = ensurePage(doc, y, 50);
  const totalMaterialKg = wasteItems.reduce((s, w) => s + w.v, 0) || 1;
  // Draw a simple pie legend alongside percentages
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.forestDeep);
  doc.text("Composition (%)", 20, y);
  y += 6;
  wasteItems.filter(w => w.v > 0).forEach((w) => {
    const pct = ((w.v / totalMaterialKg) * 100).toFixed(1);
    // Color swatch
    doc.setFillColor(...w.c);
    doc.roundedRect(20, y - 3, 4, 4, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.darkText);
    doc.text(`${w.l}: ${pct}%`, 27, y);
    y += 6;
  });
  y += 4;

  // ── Logistics & Operations ──
  y = ensurePage(doc, y, 36);
  y = addSectionTitle(doc, "Logistics & Operations", y);
  drawRoundedRect(doc, 15, y, pageWidth - 30, 24, 3, [248, 248, 248]);
  const logItems = [
    { l: "Waste Destination", v: cleanup.waste_destination || "N/A" },
    { l: "Transport Method", v: cleanup.transport_method || "N/A" },
    { l: "Waste Sorted", v: cleanup.waste_sorted ? "✓ Yes" : "✗ No" },
  ];
  let lx = 20;
  logItems.forEach((item) => {
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(item.l, lx, y + 8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text(item.v, lx, y + 15);
    doc.setFont("helvetica", "normal");
    lx += 55;
  });
  y += 32;

  // ── Observations & Narrative ──
  const narratives = [
    { title: "Observations", text: cleanup.observations },
    { title: "Environmental Issues", text: cleanup.environmental_issues },
    { title: "Recommendations", text: cleanup.recommendations },
  ].filter((n) => n.text);

  if (narratives.length > 0) {
    y = ensurePage(doc, y, 20);
    y = addSectionTitle(doc, "Observations & Recommendations", y);
    narratives.forEach((n) => {
      y = ensurePage(doc, y, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_COLORS.forest);
      doc.text(n.title, 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.darkText);
      const lines = doc.splitTextToSize(n.text!, 165);
      lines.forEach((line: string) => {
        y = ensurePage(doc, y, 6);
        doc.text(line, 20, y);
        y += 5;
      });
      y += 4;
    });
  }

  // ── Environmental Impact Estimates ──
  y = ensurePage(doc, y, 44);
  y = addSectionTitle(doc, "Estimated Environmental Impact", y);
  const co2Saved = (cleanup.recyclable_waste_kg * 1.2).toFixed(1);
  const treesEquiv = Math.round(cleanup.recyclable_waste_kg * 0.06);
  const oceanPlastic = (cleanup.plastic_waste_kg * 0.8).toFixed(1);
  const impactCards = [
    { v: `${co2Saved} kg`, l: "CO₂ Emissions Avoided", c: PDF_COLORS.forest },
    { v: `${treesEquiv}`, l: "Trees Equivalent", c: [56, 142, 60] as [number, number, number] },
    { v: `${oceanPlastic} kg`, l: "Ocean Plastic Diverted", c: [33, 150, 243] as [number, number, number] },
  ];
  const impW = (pageWidth - 30 - 8) / 3;
  impactCards.forEach((ic, i) => {
    drawStatCard(doc, 15 + i * (impW + 4), y, impW, ic.v, ic.l, ic.c);
  });
  y += 36;

  // ── Status badge ──
  y = ensurePage(doc, y, 16);
  const statusColor = cleanup.status === "completed" ? PDF_COLORS.forest : PDF_COLORS.gold;
  drawRoundedRect(doc, 15, y, 40, 10, 3, statusColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(cleanup.status.toUpperCase(), 35, y + 6.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(`Report generated on ${format(new Date(), "PPPp")}`, 60, y + 6.5);
  y += 16;

  // ── Footer ──
  await addBrandedFooter(doc);

  doc.save(`cleanup-report-${cleanup.title.replace(/\s+/g, "-")}.pdf`);
};
