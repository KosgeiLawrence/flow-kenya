import jsPDF from "jspdf";
import { format } from "date-fns";
import {
  PDF_COLORS,
  addBrandedHeader,
  addBrandedFooter,
  addSectionTitle,
  addDocMeta,
  drawTableHeader,
  drawTableRow,
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

const M = 20; // page margin

// ── Drawing helpers ──

const drawMetricCard = (
  doc: jsPDF, x: number, y: number, w: number,
  value: string, label: string
) => {
  // Light card background
  doc.setFillColor(...PDF_COLORS.offWhite);
  doc.roundedRect(x, y, w, 24, 3, 3, "F");

  // Thin top accent
  doc.setFillColor(...PDF_COLORS.forest);
  doc.rect(x + 4, y, w - 8, 1.5, "F");

  // Value
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.black);
  doc.text(value, x + w / 2, y + 12, { align: "center" });

  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(label, x + w / 2, y + 19, { align: "center" });
};

const drawProgressBar = (
  doc: jsPDF, x: number, y: number, maxW: number, h: number,
  pct: number
) => {
  doc.setFillColor(...PDF_COLORS.lightGray);
  doc.roundedRect(x, y, maxW, h, h / 2, h / 2, "F");
  if (pct > 0) {
    doc.setFillColor(...PDF_COLORS.forest);
    doc.roundedRect(x, y, Math.max(maxW * pct, h), h, h / 2, h / 2, "F");
  }
};

const ensurePage = (doc: jsPDF, y: number, needed: number): number => {
  if (y + needed > 268) { doc.addPage(); return 24; }
  return y;
};

// ── Main generator ──

export const generateCleanupReportPDF = async (cleanup: CleanupData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // ── Header ──
  let y = await addBrandedHeader(
    doc,
    "Cleanup Exercise Report",
    `${cleanup.title} — ${format(new Date(cleanup.cleanup_date), "PPP")}`
  );

  // ── Metadata section ──
  y = addDocMeta(doc, [
    { label: "Reference", value: cleanup.id.slice(0, 8).toUpperCase() },
    { label: "Date", value: format(new Date(cleanup.cleanup_date), "PPP") },
    { label: "Time", value: `${cleanup.start_time} – ${cleanup.end_time}` },
    { label: "Location", value: cleanup.location_name },
    { label: "Type", value: LOCATION_LABELS[cleanup.location_type] || cleanup.location_type },
    { label: "Organizer", value: cleanup.lead_organizer },
    ...(cleanup.location_lat && cleanup.location_lng
      ? [{ label: "GPS", value: `${cleanup.location_lat.toFixed(5)}, ${cleanup.location_lng.toFixed(5)}` }]
      : []),
  ], y);

  // ── Key Metrics Cards ──
  y = ensurePage(doc, y, 38);
  y = addSectionTitle(doc, "Key Metrics", y);
  const cardW = (pw - M * 2 - 12) / 4;
  const metrics = [
    { v: `${cleanup.total_waste_kg}`, l: "Total Waste (kg)" },
    { v: `${cleanup.num_bags}`, l: "Bags Collected" },
    { v: `${cleanup.num_volunteers + cleanup.num_waste_pickers}`, l: "Total Participants" },
    { v: `${cleanup.num_partner_orgs}`, l: "Partner Orgs" },
  ];
  metrics.forEach((m, i) => {
    drawMetricCard(doc, M + i * (cardW + 4), y, cardW, m.v, m.l);
  });
  y += 32;

  // ── Participation ──
  y = ensurePage(doc, y, 40);
  y = addSectionTitle(doc, "Participation", y);
  const partItems = [
    { l: "Volunteers", v: cleanup.num_volunteers },
    { l: "Waste Pickers", v: cleanup.num_waste_pickers },
    { l: "Partner Organizations", v: cleanup.num_partner_orgs },
  ];
  const maxPart = Math.max(...partItems.map(p => p.v), 1);
  partItems.forEach((item) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.bodyText);
    doc.text(item.l, M, y + 2);

    const pct = item.v / maxPart;
    drawProgressBar(doc, M + 50, y - 1, 90, 4, pct);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.black);
    doc.text(`${item.v}`, M + 145, y + 2);
    y += 10;
  });
  y += 4;

  // ── Partner Organizations ──
  const partnerOrgs = cleanup.partner_organizations || [];
  if (partnerOrgs.length > 0) {
    y = ensurePage(doc, y, 16 + partnerOrgs.length * 7);
    y = addSectionTitle(doc, "Partner Organizations", y);
    partnerOrgs.forEach((org) => {
      y = ensurePage(doc, y, 7);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_COLORS.bodyText);
      doc.text(`·  ${org.name}`, M + 2, y);
      y += 7;
    });
    y += 4;
  }

  // ── Waste Collection Summary ──
  y = ensurePage(doc, y, 36);
  y = addSectionTitle(doc, "Waste Collection Summary", y);

  const summaryItems = [
    { l: "Plastic Waste", v: `${cleanup.plastic_waste_kg} kg` },
    { l: "Recyclable Waste", v: `${cleanup.recyclable_waste_kg} kg` },
    { l: "Non-Recyclable Waste", v: `${cleanup.non_recyclable_waste_kg} kg` },
  ];
  const sumCardW = (pw - M * 2 - 8) / 3;
  summaryItems.forEach((s, i) => {
    const bx = M + i * (sumCardW + 4);
    doc.setFillColor(...PDF_COLORS.offWhite);
    doc.roundedRect(bx, y, sumCardW, 18, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.black);
    doc.text(s.v, bx + sumCardW / 2, y + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(s.l, bx + sumCardW / 2, y + 14, { align: "center" });
  });
  y += 26;

  // ── Material Breakdown Table ──
  y = ensurePage(doc, y, 60);
  y = addSectionTitle(doc, "Waste Breakdown by Material", y);

  const wasteItems = [
    { l: "PET Bottles", v: cleanup.pet_bottles_kg },
    { l: "HDPE", v: cleanup.hdpe_kg },
    { l: "Sachets", v: cleanup.sachets_kg },
    { l: "Fishing Nets", v: cleanup.fishing_nets_kg },
    { l: "Glass", v: cleanup.glass_kg },
    { l: "Metal", v: cleanup.metal_kg },
    { l: "Other Materials", v: cleanup.other_materials_kg },
  ].filter(w => w.v > 0);

  if (wasteItems.length) {
    const totalMaterialKg = wasteItems.reduce((s, w) => s + w.v, 0) || 1;
    y = drawTableHeader(doc, [
      { label: "Material", x: M + 2 },
      { label: "Weight (kg)", x: pw / 2 },
      { label: "Share (%)", x: pw - M - 20 },
    ], y, pw - M * 2);

    wasteItems.forEach((w, i) => {
      drawTableRow(doc, y, i, pw - M * 2);
      const pct = ((w.v / totalMaterialKg) * 100).toFixed(1);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_COLORS.bodyText);
      doc.text(w.l, M + 2, y);
      doc.text(`${w.v}`, pw / 2, y);
      doc.text(`${pct}%`, pw - M - 20, y);
      y += 7;
    });
    y += 8;
  }

  // ── Logistics ──
  y = ensurePage(doc, y, 30);
  y = addSectionTitle(doc, "Logistics & Operations", y);

  const logItems = [
    { l: "Waste Destination", v: cleanup.waste_destination || "N/A" },
    { l: "Transport Method", v: cleanup.transport_method || "N/A" },
    { l: "Waste Sorted", v: cleanup.waste_sorted ? "Yes" : "No" },
  ];
  logItems.forEach((item) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(item.l, M, y);
    doc.setTextColor(...PDF_COLORS.darkText);
    doc.setFont("helvetica", "bold");
    doc.text(item.v, M + 45, y);
    doc.setFont("helvetica", "normal");
    y += 7;
  });
  y += 6;

  // ── Observations ──
  const narratives = [
    { title: "Observations", text: cleanup.observations },
    { title: "Environmental Issues", text: cleanup.environmental_issues },
    { title: "Recommendations", text: cleanup.recommendations },
  ].filter((n) => n.text);

  if (narratives.length > 0) {
    y = ensurePage(doc, y, 20);
    y = addSectionTitle(doc, "Observations & Recommendations", y);
    narratives.forEach((n) => {
      y = ensurePage(doc, y, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_COLORS.darkText);
      doc.text(n.title, M, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.bodyText);
      const lines = doc.splitTextToSize(n.text!, pw - M * 2 - 10);
      lines.forEach((line: string) => {
        y = ensurePage(doc, y, 5);
        doc.text(line, M + 2, y);
        y += 5;
      });
      y += 4;
    });
  }

  // ── Environmental Impact ──
  y = ensurePage(doc, y, 40);
  y = addSectionTitle(doc, "Estimated Environmental Impact", y);
  const co2Saved = (cleanup.recyclable_waste_kg * 1.2).toFixed(1);
  const treesEquiv = Math.round(cleanup.recyclable_waste_kg * 0.06);
  const oceanPlastic = (cleanup.plastic_waste_kg * 0.8).toFixed(1);
  const impactCards = [
    { v: `${co2Saved} kg`, l: "CO₂ Avoided" },
    { v: `${treesEquiv}`, l: "Trees Equivalent" },
    { v: `${oceanPlastic} kg`, l: "Ocean Plastic Diverted" },
  ];
  const impW = (pw - M * 2 - 8) / 3;
  impactCards.forEach((ic, i) => {
    drawMetricCard(doc, M + i * (impW + 4), y, impW, ic.v, ic.l);
  });
  y += 32;

  // ── Status ──
  y = ensurePage(doc, y, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.forest);
  doc.text(`Status: ${cleanup.status.toUpperCase()}`, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(`Report generated on ${format(new Date(), "PPPp")}`, M + 40, y);

  // ── Footer ──
  await addBrandedFooter(doc);

  doc.save(`cleanup-report-${cleanup.title.replace(/\s+/g, "-")}.pdf`);
};
