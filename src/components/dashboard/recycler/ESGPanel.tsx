import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Leaf, Factory, Droplets, Zap, TrendingUp, Download, CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { PDF_COLORS, loadImageAsBase64 } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

// ── Logo cache ──
let _duaraFlowLogoCache: string | null = null;
let _duaraIntelLogoCache: string | null = null;

const loadSvgAsBase64Cached = (url: string, width: number, height: number, cache: { val: string | null }): Promise<string | null> => {
  if (cache.val) return Promise.resolve(cache.val);
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
      const result = canvas.toDataURL("image/png");
      cache.val = result;
      resolve(result);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const flowLogoCache = { val: null as string | null };
const intelLogoCache = { val: null as string | null };
const getDuaraFlowLogo = () => loadSvgAsBase64Cached("/images/duara-flow-logo.svg", 400, 160, flowLogoCache);
const getDuaraIntelLogo = () => loadSvgAsBase64Cached("/images/duara-intelligence-logo.svg", 300, 160, intelLogoCache);

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(340,50%,50%)"];

type PeriodOption = "7d" | "30d" | "90d" | "6m" | "1y" | "all" | "custom";

// ── PDF Helper: draw a rounded rect ──
const drawRoundedRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: "F" | "S" | "FD" = "F") => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

// ── PDF Helper: draw a progress bar ──
const drawProgressBar = (doc: jsPDF, x: number, y: number, w: number, h: number, pct: number, fg: [number, number, number], bg: [number, number, number] = [230, 235, 230]) => {
  doc.setFillColor(...bg);
  drawRoundedRect(doc, x, y, w, h, h / 2, "F");
  if (pct > 0) {
    doc.setFillColor(...fg);
    drawRoundedRect(doc, x, y, Math.max(w * (pct / 100), h), h, h / 2, "F");
  }
};

// ── PDF Helper: draw a metric card ──
const drawMetricCard = (doc: jsPDF, x: number, y: number, w: number, value: string, label: string, accent: [number, number, number]) => {
  doc.setFillColor(248, 250, 248);
  drawRoundedRect(doc, x, y, w, 32, 3, "F");
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.line(x, y, x, y + 32);

  doc.setFontSize(16);
  doc.setTextColor(...accent);
  doc.text(value, x + 6, y + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(label, x + 6, y + 22);
};

// ── PDF Helper: add org header with Duara Flow logo ──
const addOrgHeader = async (doc: jsPDF, orgName: string, logoBase64: string | null, contactDetails: string[]) => {
  const pw = doc.internal.pageSize.getWidth();
  const duaraLogo = await getDuaraFlowLogo();

  // Top accent band
  doc.setFillColor(...PDF_COLORS.forest);
  doc.rect(0, 0, pw, 6, "F");
  doc.setFillColor(...PDF_COLORS.gold);
  doc.rect(0, 6, pw, 1.5, "F");

  // Duara Flow logo (right side)
  if (duaraLogo) {
    try { doc.addImage(duaraLogo, "PNG", pw - 60, 10, 46, 18); } catch {}
  }

  let leftX = 15;
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 15, 12, 24, 18); leftX = 44; } catch {}
  }

  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.forestDeep);
  doc.text(orgName, leftX, 22);

  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.mutedText);
  let cy = 27;
  contactDetails.filter(Boolean).forEach(line => {
    doc.text(line, leftX, cy);
    cy += 4;
  });

  return Math.max(cy + 2, 36);
};

// ── PDF Helper: add footer with Duara Intelligence branding ──
const addReportFooter = async (doc: jsPDF, orgName: string) => {
  const pages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const intelLogo = await getDuaraIntelLogo();

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Separator line
    const footerY = ph - 20;
    doc.setDrawColor(...PDF_COLORS.lightGray);
    doc.setLineWidth(0.3);
    doc.line(15, footerY, pw - 15, footerY);

    // Duara Intelligence logo (left)
    if (intelLogo) {
      try { doc.addImage(intelLogo, "PNG", 15, footerY + 2, 25, 13); } catch {}
    }

    // Contact info (center)
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${orgName}  •  Powered by Duara Flow`, pw / 2, footerY + 6, { align: "center" });
    doc.text("www.duaraflow.co.ke  •  info@duaraflow.co.ke  •  +254 741 027 140", pw / 2, footerY + 10, { align: "center" });

    // Page number (right)
    doc.setFontSize(7);
    doc.text(`Page ${i} of ${pages}`, pw - 15, footerY + 8, { align: "right" });

    // Bottom accent band
    doc.setFillColor(...PDF_COLORS.forest);
    doc.rect(0, ph - 4, pw, 4, "F");
  }
};

const ESGPanel = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const [period, setPeriod] = useState<PeriodOption>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "7d": return { from: subDays(now, 7), to: now };
      case "30d": return { from: subDays(now, 30), to: now };
      case "90d": return { from: subDays(now, 90), to: now };
      case "6m": return { from: subMonths(now, 6), to: now };
      case "1y": return { from: subYears(now, 1), to: now };
      case "custom": return { from: customFrom || subYears(now, 5), to: customTo || now };
      default: return null;
    }
  }, [period, customFrom, customTo]);

  const { data: transformations } = useQuery({
    queryKey: ["recycler_esg_transformations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_transformations")
        .select("*, transformation_inputs(*), transformation_outputs(*)")
        .eq("user_id", user!.id)
        .order("transformation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: cleanups } = useQuery({
    queryKey: ["recycler_esg_cleanups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cleanup_exercises")
        .select("*")
        .eq("user_id", user!.id)
        .order("cleanup_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: communityTrainings } = useQuery({
    queryKey: ["recycler_esg_community_trainings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_training_logs" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("training_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const filteredTransformations = useMemo(() => {
    if (!transformations) return [];
    if (!dateRange) return transformations;
    return transformations.filter((t) => {
      const d = new Date(t.transformation_date);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    });
  }, [transformations, dateRange]);

  const filteredCleanups = useMemo(() => {
    if (!cleanups) return [];
    if (!dateRange) return cleanups;
    return cleanups.filter((c) => {
      const d = new Date(c.cleanup_date);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    });
  }, [cleanups, dateRange]);

  const filteredTrainings = useMemo(() => {
    if (!communityTrainings) return [];
    if (!dateRange) return communityTrainings;
    return communityTrainings.filter((t: any) => {
      const d = new Date(t.training_date);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    });
  }, [communityTrainings, dateRange]);

  const transformationInputKg = filteredTransformations.reduce((sum, t) =>
    sum + ((t.transformation_inputs as any[])?.reduce((s: number, inp: any) => s + Number(inp.quantity), 0) || 0), 0);
  const transformationOutputKg = filteredTransformations.reduce((sum, t) =>
    sum + ((t.transformation_outputs as any[])?.reduce((s: number, out: any) => s + Number(out.quantity), 0) || 0), 0);

  const cleanupWasteKg = filteredCleanups.reduce((s, c) => s + Number(c.total_waste_kg || 0), 0);
  const cleanupRecyclableKg = filteredCleanups.reduce((s, c) => s + Number(c.recyclable_waste_kg || 0), 0);
  const cleanupVolunteers = filteredCleanups.reduce((s, c) => s + Number(c.num_volunteers || 0), 0);

  const trainingParticipants = filteredTrainings.reduce((s: number, t: any) => s + Number(t.num_participants || 0), 0);
  const trainingWomen = filteredTrainings.reduce((s: number, t: any) => s + Number(t.num_women || 0), 0);
  const trainingYouth = filteredTrainings.reduce((s: number, t: any) => s + Number(t.num_youth || 0), 0);
  const trainingWasteKg = filteredTrainings.reduce((s: number, t: any) => s + Number(t.waste_collected_kg || 0), 0);
  const trainingTrees = filteredTrainings.reduce((s: number, t: any) => s + Number(t.trees_planted || 0), 0);

  const totalKg = transformationInputKg + cleanupWasteKg + trainingWasteKg;
  const co2Saved = totalKg * 2.5;
  const waterSaved = totalKg * 18;
  const energySaved = totalKg * 5.8;
  const landfillDiverted = totalKg;
  const avgYield = filteredTransformations.length
    ? filteredTransformations.reduce((s, t) => s + (Number(t.yield_percentage) || 0), 0) / filteredTransformations.length
    : 0;

  const materialMap = new Map<string, number>();
  filteredTransformations.forEach((t) => {
    (t.transformation_inputs as any[])?.forEach((inp: any) => {
      const name = inp.material_name || "Unknown";
      materialMap.set(name, (materialMap.get(name) || 0) + Number(inp.quantity));
    });
  });
  filteredCleanups.forEach((c) => {
    if (Number(c.pet_bottles_kg) > 0) materialMap.set("PET Bottles", (materialMap.get("PET Bottles") || 0) + Number(c.pet_bottles_kg));
    if (Number(c.hdpe_kg) > 0) materialMap.set("HDPE", (materialMap.get("HDPE") || 0) + Number(c.hdpe_kg));
    if (Number(c.glass_kg) > 0) materialMap.set("Glass", (materialMap.get("Glass") || 0) + Number(c.glass_kg));
    if (Number(c.metal_kg) > 0) materialMap.set("Metal", (materialMap.get("Metal") || 0) + Number(c.metal_kg));
    if (Number(c.sachets_kg) > 0) materialMap.set("Sachets", (materialMap.get("Sachets") || 0) + Number(c.sachets_kg));
    if (Number(c.fishing_nets_kg) > 0) materialMap.set("Fishing Nets", (materialMap.get("Fishing Nets") || 0) + Number(c.fishing_nets_kg));
    if (Number(c.other_materials_kg) > 0) materialMap.set("Other", (materialMap.get("Other") || 0) + Number(c.other_materials_kg));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  const esgScore = Math.min(Math.round((totalKg / 1000) * 25 + ((cleanupVolunteers + trainingParticipants) / 50) * 10 + (trainingTrees * 0.5) + 40), 100);

  const periodLabel = () => {
    if (!dateRange) return "All Time";
    return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  const getOrgDetails = async () => {
    const name = orgInfo?.orgName || profile?.full_name || "Recycler";
    let logo: string | null = null;
    const logoUrl = orgInfo?.orgLogoUrl;
    if (logoUrl) logo = await loadImageAsBase64(logoUrl);
    const contact = [
      [orgInfo?.contactPhone, orgInfo?.contactEmail].filter(Boolean).join("  •  "),
      [orgInfo?.physicalAddress, orgInfo?.county].filter(Boolean).join(", "),
      orgInfo?.website || "",
      [orgInfo?.kraPin ? `KRA: ${orgInfo.kraPin}` : "", orgInfo?.companyRegistration ? `Reg: ${orgInfo.companyRegistration}` : ""].filter(Boolean).join("  •  "),
    ];
    return { name, logo, contact };
  };

  const downloadESGReport = async () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const today = format(new Date(), "MMMM d, yyyy");
    const org = await getOrgDetails();

    // ── Page 1: Cover ──
    let y = await addOrgHeader(doc, org.name, org.logo, org.contact);

    // Title block
    y += 4;
    doc.setFillColor(245, 248, 245);
    drawRoundedRect(doc, 15, y, pw - 30, 28, 4, "F");
    doc.setFontSize(20);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("ESG & SUSTAINABILITY", 20, y + 12);
    doc.text("IMPACT REPORT", 20, y + 22);
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`Period: ${periodLabel()}`, pw - 20, y + 12, { align: "right" });
    doc.text(`Generated: ${today}`, pw - 20, y + 18, { align: "right" });
    y += 36;

    // ESG Score section
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("OVERALL ESG SCORE", 15, y);
    y += 4;
    drawProgressBar(doc, 15, y, pw - 30, 6, esgScore, PDF_COLORS.forest);
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.forest);
    doc.text(`${esgScore}/100`, pw - 15, y + 5, { align: "right" });
    y += 14;

    // Pillar scores
    const envScore = Math.min(Math.round((totalKg / 5000) * 50 + 30), 100);
    const socScore = Math.min(Math.round(((cleanupVolunteers + trainingParticipants) / 100) * 40 + 40), 100);
    const govScore = 75;
    const pillars = [
      { label: "Environmental", score: envScore, color: PDF_COLORS.forest },
      { label: "Social", score: socScore, color: [195, 130, 50] as [number, number, number] },
      { label: "Governance", score: govScore, color: [60, 120, 160] as [number, number, number] },
    ];
    const pillarW = (pw - 40) / 3;
    pillars.forEach((p, i) => {
      const px = 15 + i * (pillarW + 5);
      doc.setFillColor(248, 250, 248);
      drawRoundedRect(doc, px, y, pillarW, 22, 3, "F");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(p.label, px + 5, y + 7);
      drawProgressBar(doc, px + 5, y + 10, pillarW - 10, 4, p.score, p.color);
      doc.setFontSize(9);
      doc.setTextColor(...p.color);
      doc.text(`${p.score}`, px + pillarW - 6, y + 7, { align: "right" });
    });
    y += 30;

    // Key Metrics (2x2 grid)
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("KEY ENVIRONMENTAL METRICS", 15, y);
    y += 6;
    const metricW = (pw - 35) / 2;
    const metricsData = [
      { value: `${co2Saved.toFixed(0)} kg`, label: "CO₂ Emissions Avoided", accent: PDF_COLORS.forest },
      { value: `${waterSaved.toLocaleString()} L`, label: "Water Resources Saved", accent: [60, 140, 180] as [number, number, number] },
      { value: `${energySaved.toFixed(0)} kWh`, label: "Energy Conserved", accent: PDF_COLORS.gold },
      { value: `${landfillDiverted.toFixed(0)} kg`, label: "Landfill Diversion", accent: [100, 60, 40] as [number, number, number] },
    ];
    metricsData.forEach((m, i) => {
      const mx = 15 + (i % 2) * (metricW + 5);
      const my = y + Math.floor(i / 2) * 38;
      drawMetricCard(doc, mx, my, metricW, m.value, m.label, m.accent);
    });
    y += 80;

    // Transformation Summary
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("RECYCLING & TRANSFORMATION", 15, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.darkText);
    const txRows = [
      ["Material Processed", `${transformationInputKg.toFixed(1)} kg`],
      ["Output Produced", `${transformationOutputKg.toFixed(1)} kg`],
      ["Average Yield", `${avgYield.toFixed(1)}%`],
      ["Transformations", `${filteredTransformations.length}`],
    ];
    txRows.forEach(([lbl, val]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(lbl, 20, y);
      doc.setTextColor(...PDF_COLORS.darkText);
      doc.text(val, 100, y);
      y += 7;
    });

    // ── Page 2: Material breakdown & cleanups ──
    doc.addPage();
    y = await addOrgHeader(doc, org.name, org.logo, org.contact);
    y += 4;

    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("MATERIAL RECOVERY BREAKDOWN", 15, y);
    y += 8;

    if (pieData.length) {
      const barColors: [number, number, number][] = [
        PDF_COLORS.forest, PDF_COLORS.gold, [60, 150, 180], [100, 60, 40], [180, 60, 80]
      ];
      const maxVal = Math.max(...pieData.map(d => d.value), 1);
      pieData.forEach((d, i) => {
        doc.setFillColor(248, 248, 248);
        drawRoundedRect(doc, 15, y, pw - 30, 12, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text(d.name, 20, y + 8);
        const barW = (pw - 120) * (d.value / maxVal);
        const bc = barColors[i % barColors.length];
        doc.setFillColor(...bc);
        drawRoundedRect(doc, 80, y + 3, Math.max(barW, 4), 6, 3, "F");
        doc.setTextColor(...bc);
        doc.text(`${d.value} kg`, pw - 20, y + 8, { align: "right" });
        y += 16;
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.text("No material data available for the selected period.", 20, y);
      y += 10;
    }

    // Cleanup Section
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("COMMUNITY CLEANUP EXERCISES", 15, y);
    y += 8;

    const cleanupMetrics = [
      { value: `${filteredCleanups.length}`, label: "Exercises Conducted", accent: PDF_COLORS.forest },
      { value: `${cleanupWasteKg.toFixed(0)} kg`, label: "Waste Collected", accent: PDF_COLORS.gold },
      { value: `${cleanupRecyclableKg.toFixed(0)} kg`, label: "Recyclable Material", accent: [60, 140, 180] as [number, number, number] },
      { value: `${cleanupVolunteers}`, label: "Volunteers Engaged", accent: [100, 60, 40] as [number, number, number] },
    ];
    cleanupMetrics.forEach((m, i) => {
      const mx = 15 + (i % 2) * (metricW + 5);
      const my = y + Math.floor(i / 2) * 38;
      drawMetricCard(doc, mx, my, metricW, m.value, m.label, m.accent);
    });
    y += 82;

    // Methodology
    doc.setFillColor(248, 250, 248);
    drawRoundedRect(doc, 15, y, pw - 30, 36, 4, "F");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("METHODOLOGY & STANDARDS", 20, y + 8);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("CO₂ savings: 2.5 kg CO₂/kg recycled (EPA/IPCC factors)", 20, y + 16);
    doc.text("Water savings: 18 liters/kg recycled material", 20, y + 22);
    doc.text("Energy savings: 5.8 kWh/kg recycled material", 20, y + 28);

    await addReportFooter(doc, org.name);
    doc.save(`esg-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("ESG Report downloaded");
  };

  const downloadSustainabilityReport = async () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const today = format(new Date(), "MMMM d, yyyy");
    const org = await getOrgDetails();

    // ── Ornate border ──
    doc.setDrawColor(...PDF_COLORS.forest);
    doc.setLineWidth(2.5);
    doc.rect(8, 8, pw - 16, ph - 16);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, pw - 24, ph - 24);

    // Corner ornaments
    const corners = [[12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12]];
    corners.forEach(([cx, cy]) => {
      doc.setFillColor(...PDF_COLORS.gold);
      doc.circle(cx, cy, 3, "F");
      doc.setFillColor(...PDF_COLORS.forest);
      doc.circle(cx, cy, 1.5, "F");
    });

    // Top accent band
    doc.setFillColor(...PDF_COLORS.forest);
    doc.rect(16, 16, pw - 32, 3, "F");
    doc.setFillColor(...PDF_COLORS.gold);
    doc.rect(16, 19, pw - 32, 1, "F");

    let y = 30;

    // Org logo centered
    if (org.logo) {
      try { doc.addImage(org.logo, "PNG", pw / 2 - 15, y, 30, 22); y += 28; } catch { y += 4; }
    }

    // Certificate title
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.gold);
    doc.text("CERTIFICATE OF", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(26);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text("SUSTAINABILITY", pw / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(14);
    doc.text("IMPACT", pw / 2, y, { align: "center" });

    // Decorative line
    y += 6;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(pw / 2 - 40, y, pw / 2 + 40, y);
    doc.setFillColor(...PDF_COLORS.gold);
    doc.circle(pw / 2, y, 2, "F");

    y += 12;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("This is to certify that", pw / 2, y, { align: "center" });

    y += 12;
    doc.setFontSize(20);
    doc.setTextColor(...PDF_COLORS.forestDeep);
    doc.text(org.name, pw / 2, y, { align: "center" });

    // Underline
    y += 3;
    const nameWidth = doc.getTextWidth(org.name);
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(pw / 2 - nameWidth / 2, y, pw / 2 + nameWidth / 2, y);

    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("has demonstrated measurable environmental stewardship", pw / 2, y, { align: "center" });
    y += 5;
    doc.text("through the following verified sustainability outcomes:", pw / 2, y, { align: "center" });

    // Big metric highlight
    y += 14;
    doc.setFillColor(245, 250, 245);
    drawRoundedRect(doc, 40, y, pw - 80, 20, 4, "F");
    doc.setDrawColor(...PDF_COLORS.forest);
    doc.setLineWidth(0.5);
    drawRoundedRect(doc, 40, y, pw - 80, 20, 4, "S");
    doc.setFontSize(22);
    doc.setTextColor(...PDF_COLORS.forest);
    doc.text(`${totalKg.toFixed(0)} kg`, pw / 2, y + 13, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("OF WASTE DIVERTED FROM LANDFILL", pw / 2, y + 18, { align: "center" });

    // Impact items with checkmarks
    y += 30;
    const impacts = [
      `Prevented ${co2Saved.toFixed(0)} kg of CO₂ greenhouse gas emissions`,
      `Conserved ${waterSaved.toLocaleString()} liters of water resources`,
      `Saved ${energySaved.toFixed(0)} kWh of energy`,
      `Completed ${filteredTransformations.length} material transformations`,
      `Conducted ${filteredCleanups.length} cleanup exercises with ${cleanupVolunteers} volunteers`,
      `Achieved average transformation yield of ${avgYield.toFixed(1)}%`,
      ...(filteredTrainings.length > 0 ? [`Trained ${trainingParticipants} community members across ${filteredTrainings.length} sessions`] : []),
      ...(trainingWomen > 0 ? [`Reached ${trainingWomen} women and ${trainingYouth} youth through community trainings`] : []),
      ...(trainingTrees > 0 ? [`Planted ${trainingTrees} trees through community impact programs`] : []),
    ];
    doc.setFontSize(9);
    impacts.forEach((imp) => {
      doc.setFillColor(...PDF_COLORS.forest);
      doc.circle(28, y - 1, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text("✓", 26.8, y);
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(imp, 34, y);
      y += 9;
    });

    // Period and date
    y += 6;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.3);
    doc.line(40, y, pw - 40, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Period: ${periodLabel()}`, pw / 2, y, { align: "center" });
    y += 5;
    doc.text(`Certificate Date: ${today}`, pw / 2, y, { align: "center" });

    // Signature area
    y += 12;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(pw / 2 - 30, y, pw / 2 + 30, y);
    y += 5;
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Authorized Signatory", pw / 2, y, { align: "center" });

    // Duara Flow + Intelligence branding at bottom
    const duaraLogo = await getDuaraFlowLogo();
    const intelLogo = await getDuaraIntelLogo();

    if (duaraLogo) {
      try { doc.addImage(duaraLogo, "PNG", pw / 2 - 22, ph - 38, 44, 17); } catch {}
    }
    if (intelLogo) {
      try { doc.addImage(intelLogo, "PNG", 18, ph - 28, 22, 11); } catch {}
    }

    // Bottom accent
    doc.setFillColor(...PDF_COLORS.gold);
    doc.rect(16, ph - 20, pw - 32, 1, "F");
    doc.setFillColor(...PDF_COLORS.forest);
    doc.rect(16, ph - 19, pw - 32, 3, "F");

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("Verified by Duara Flow  •  www.duaraflow.co.ke  •  Powered by Duara Intelligence", pw / 2, ph - 24, { align: "center" });

    doc.save(`sustainability-certificate-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Sustainability certificate downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Report Period:</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last 1 Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left text-xs", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {customFrom ? format(customFrom, "MMM d, yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left text-xs", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {customTo ? format(customTo, "MMM d, yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          {dateRange && <p className="text-xs text-muted-foreground mt-2">{periodLabel()}</p>}
        </CardContent>
      </Card>

      {/* Download buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadESGReport} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Download ESG Report
        </Button>
        <Button onClick={downloadSustainabilityReport} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Sustainability Certificate
        </Button>
      </div>

      {/* ESG Score */}
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">ESG Score</p>
              <p className="text-xs text-muted-foreground">Based on recycling volume, cleanups, community training, and environmental impact</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={esgScore} className="flex-1 h-3" />
            <span className="text-lg font-bold text-primary">{esgScore}/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Impact metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Factory className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{co2Saved.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg CO₂ Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Droplets className="w-7 h-7 text-sky mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{waterSaved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Liters Water Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Zap className="w-7 h-7 text-secondary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{energySaved.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kWh Energy Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{landfillDiverted.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg Landfill Diverted</p>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup summary */}
      {filteredCleanups.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Cleanup Exercises Impact</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{filteredCleanups.length}</p>
                <p className="text-xs text-muted-foreground">Cleanups</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cleanupWasteKg.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg Collected</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cleanupRecyclableKg.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg Recyclable</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cleanupVolunteers}</p>
                <p className="text-xs text-muted-foreground">Volunteers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredTrainings.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Community Training Impact</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{filteredTrainings.length}</p>
                <p className="text-xs text-muted-foreground">Trainings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trainingParticipants}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trainingWomen}</p>
                <p className="text-xs text-muted-foreground">Women</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trainingYouth}</p>
                <p className="text-xs text-muted-foreground">Youth</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trainingTrees}</p>
                <p className="text-xs text-muted-foreground">Trees Planted</p>
              </div>
            </div>
            {(trainingWasteKg > 0 || trainingTrees > 0) && (
              <div className="grid grid-cols-2 gap-4 text-center mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-2xl font-bold text-foreground">{trainingWasteKg.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">kg Waste Collected</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{trainingTrees}</p>
                  <p className="text-xs text-muted-foreground">Trees Planted</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Material breakdown */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Material Recovery Breakdown</CardTitle></CardHeader>
        <CardContent>
          {!pieData.length ? (
            <p className="text-sm text-muted-foreground">No data yet for the selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}kg`}>
                  {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} kg`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ESGPanel;
