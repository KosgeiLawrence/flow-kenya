import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, BookOpen } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { addBrandedHeader, addDocMeta, addSectionTitle, drawTableHeader, drawTableRow, drawTotalLine, finalizePdf } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const SustainabilityReportPanel = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data: collections } = useQuery({ queryKey: ["corp_report_collections"], queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name, unit, price_per_unit)").order("collected_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: pickers } = useQuery({ queryKey: ["corp_report_pickers"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id, user_roles!inner(role)").eq("user_roles.role", "waste_picker"); if (error) throw error; return data; } });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = (totalKg * 2.5).toFixed(1);
  const waterSaved = (totalKg * 18).toLocaleString();
  const energySaved = (totalKg * 5.8).toFixed(0);
  const totalValue = collections?.reduce((s, c) => { const mt = (c as any).material_types; return s + Number(c.quantity) * Number(mt?.price_per_unit || 0); }, 0) || 0;

  const generateAnnualReport = async () => {
    const doc = new jsPDF();
    const year = new Date().getFullYear();

    // Cover page
    let y = await addBrandedHeader(doc, "Annual Sustainability Report", `${year} — ${profile?.full_name || "Corporate Entity"}`);
    y += 20;
    doc.setFontSize(10);
    doc.text(`Prepared via Twende Green Ecocycle | ${format(new Date(), "MMM d, yyyy")}`, 15, y);

    // Page 2
    doc.addPage();
    y = await addBrandedHeader(doc, "Executive Summary");
    doc.setFontSize(10);
    [
      `This report covers the environmental and social impact of ${profile?.full_name || "our organization"}'s`,
      `waste management and circular economy initiatives for the year ${year}.`,
      "",
      "Through our partnership with the Twende Green Ecocycle platform, we have successfully",
      "diverted waste from landfills, offset carbon emissions, and supported",
      "community livelihoods through the formal waste collection value chain.",
    ].forEach((line) => { doc.text(line, 15, y); y += 8; });

    y += 6;
    y = addSectionTitle(doc, "Environmental Impact", y);
    doc.setFontSize(10);
    [`Total Waste Diverted from Landfill: ${totalKg.toFixed(0)} kg`, `CO₂ Offset: ${co2Saved} kg`, `Water Conservation: ${waterSaved} liters`, `Energy Conservation: ${energySaved} kWh`, `Collection Records: ${collections?.length || 0} verified entries`]
      .forEach((m) => { doc.text(`• ${m}`, 20, y); y += 10; });

    y += 4;
    y = addSectionTitle(doc, "Social Impact", y);
    doc.setFontSize(10);
    [`Waste Pickers Supported: ${pickers?.length || 0}`, `Economic Value Generated: KES ${totalValue.toLocaleString()}`, `Collection Locations Active: ${new Set(collections?.map((c) => c.location_name).filter(Boolean)).size}`]
      .forEach((m) => { doc.text(`• ${m}`, 20, y); y += 10; });

    // Material breakdown page
    doc.addPage();
    y = await addBrandedHeader(doc, "Material Breakdown");

    const materialMap = new Map<string, { qty: number; value: number; unit: string }>();
    collections?.forEach((c) => { const mt = (c as any).material_types; const name = mt?.name || "Unknown"; const existing = materialMap.get(name); if (existing) { existing.qty += Number(c.quantity); existing.value += Number(c.quantity) * Number(mt?.price_per_unit || 0); } else { materialMap.set(name, { qty: Number(c.quantity), value: Number(c.quantity) * Number(mt?.price_per_unit || 0), unit: mt?.unit || "kg" }); } });

    y = drawTableHeader(doc, [{ label: "Material", x: 17 }, { label: "Quantity", x: 90 }, { label: "Value (KES)", x: 140 }], y, 180);
    let i = 0;
    materialMap.forEach((m, name) => {
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(name, 17, y); doc.text(`${m.qty.toFixed(1)} ${m.unit}`, 90, y); doc.text(m.value.toLocaleString(), 140, y);
      y += 8; i++;
    });

    y += 4;
    drawTotalLine(doc, `Total Value: KES ${totalValue.toLocaleString()}`, y);

    await finalizePdf(doc);
    doc.save(`sustainability-report-${year}.pdf`);
  };

  const downloadCSV = () => {
    if (!collections?.length) return;
    const header = "Batch ID,Material,Quantity,Unit,Value (KES),Location,Date\n";
    const rows = collections.map((c) => { const mt = (c as any).material_types; return [c.batch_id, mt?.name || "", Number(c.quantity).toFixed(1), mt?.unit || "kg", (Number(c.quantity) * Number(mt?.price_per_unit || 0)).toFixed(2), c.location_name || "", format(new Date(c.collected_at), "yyyy-MM-dd")].join(","); }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `sustainability-data-${format(new Date(), "yyyy")}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-soft"><CardContent className="p-5 space-y-3"><div className="flex items-center gap-3"><BookOpen className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium text-foreground">Annual Sustainability Report</p><p className="text-xs text-muted-foreground">Multi-page PDF with executive summary, environmental & social impact, and material breakdown</p></div></div><Button size="sm" onClick={generateAnnualReport} className="w-full"><Download className="w-4 h-4 mr-1" /> Download PDF</Button></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5 space-y-3"><div className="flex items-center gap-3"><FileSpreadsheet className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium text-foreground">Raw Data Export</p><p className="text-xs text-muted-foreground">Download all collection data as CSV for custom analysis and reporting</p></div></div><Button size="sm" variant="outline" onClick={downloadCSV} disabled={!collections?.length} className="w-full"><Download className="w-4 h-4 mr-1" /> Download CSV</Button></CardContent></Card>
      </div>

      <Card className="shadow-soft"><CardHeader><CardTitle className="text-lg">Report Highlights</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-5 gap-4">{[{ v: `${totalKg.toFixed(0)} kg`, l: "Waste Diverted" }, { v: `${co2Saved} kg`, l: "CO₂ Offset" }, { v: `${pickers?.length || 0}`, l: "Livelihoods" }, { v: `${collections?.length || 0}`, l: "Records" }, { v: `KES ${totalValue.toLocaleString()}`, l: "Value" }].map(s => (<div key={s.l} className="text-center p-3 rounded-lg bg-muted/30"><p className="text-lg font-bold text-foreground">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></div>))}</div></CardContent></Card>
    </div>
  );
};

export default SustainabilityReportPanel;
