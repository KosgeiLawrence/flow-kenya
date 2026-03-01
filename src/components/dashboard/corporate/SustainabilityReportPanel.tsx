import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, BookOpen } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const SustainabilityReportPanel = () => {
  const { profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["corp_report_collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pickers } = useQuery({
    queryKey: ["corp_report_pickers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_roles!inner(role)")
        .eq("user_roles.role", "waste_picker");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = (totalKg * 2.5).toFixed(1);
  const waterSaved = (totalKg * 18).toLocaleString();
  const energySaved = (totalKg * 5.8).toFixed(0);
  const totalValue = collections?.reduce((s, c) => {
    const mt = (c as any).material_types;
    return s + Number(c.quantity) * Number(mt?.price_per_unit || 0);
  }, 0) || 0;

  const generateAnnualReport = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");
    const year = new Date().getFullYear();

    // Cover page
    doc.setFontSize(28);
    doc.setTextColor(34, 87, 62);
    doc.text("Annual Sustainability", 105, 70, { align: "center" });
    doc.text("Report", 105, 85, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`${year}`, 105, 100, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(profile?.full_name || "Corporate Entity", 105, 120, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Prepared via Duara Flow | ${today}`, 105, 132, { align: "center" });

    // Page 2 - Executive Summary
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(34, 87, 62);
    doc.text("Executive Summary", 20, 30);
    doc.setTextColor(0);
    doc.setFontSize(11);

    const summaryLines = [
      `This report covers the environmental and social impact of ${profile?.full_name || "our organization"}'s`,
      `waste management and circular economy initiatives for the year ${year}.`,
      "",
      "Through our partnership with the Duara Flow platform, we have successfully",
      "diverted waste from landfills, offset carbon emissions, and supported",
      "community livelihoods through the formal waste collection value chain.",
    ];
    let y = 44;
    summaryLines.forEach((line) => { doc.text(line, 20, y); y += 8; });

    // Environmental Impact
    y += 10;
    doc.setFontSize(16);
    doc.setTextColor(34, 87, 62);
    doc.text("Environmental Impact", 20, y);
    doc.setTextColor(0);
    doc.setFontSize(11);
    y += 14;

    const envMetrics = [
      `Total Waste Diverted from Landfill: ${totalKg.toFixed(0)} kg`,
      `Carbon Dioxide (CO₂) Offset: ${co2Saved} kg`,
      `Water Conservation: ${waterSaved} liters`,
      `Energy Conservation: ${energySaved} kWh`,
      `Collection Records: ${collections?.length || 0} verified entries`,
    ];
    envMetrics.forEach((m) => { doc.text(`• ${m}`, 25, y); y += 10; });

    // Social Impact
    y += 8;
    doc.setFontSize(16);
    doc.setTextColor(34, 87, 62);
    doc.text("Social Impact", 20, y);
    doc.setTextColor(0);
    doc.setFontSize(11);
    y += 14;

    const socMetrics = [
      `Waste Pickers Supported: ${pickers?.length || 0}`,
      `Economic Value Generated: KES ${totalValue.toLocaleString()}`,
      `Collection Locations Active: ${new Set(collections?.map((c) => c.location_name).filter(Boolean)).size}`,
    ];
    socMetrics.forEach((m) => { doc.text(`• ${m}`, 25, y); y += 10; });

    // Material breakdown
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(34, 87, 62);
    doc.text("Material Breakdown", 20, 30);
    doc.setTextColor(0);

    const materialMap = new Map<string, { qty: number; value: number; unit: string }>();
    collections?.forEach((c) => {
      const mt = (c as any).material_types;
      const name = mt?.name || "Unknown";
      const existing = materialMap.get(name);
      if (existing) {
        existing.qty += Number(c.quantity);
        existing.value += Number(c.quantity) * Number(mt?.price_per_unit || 0);
      } else {
        materialMap.set(name, {
          qty: Number(c.quantity),
          value: Number(c.quantity) * Number(mt?.price_per_unit || 0),
          unit: mt?.unit || "kg",
        });
      }
    });

    y = 44;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text("Material", 22, y);
    doc.text("Quantity", 90, y);
    doc.text("Value (KES)", 140, y);
    doc.setTextColor(0);

    y += 10;
    materialMap.forEach((m, name) => {
      doc.text(name, 22, y);
      doc.text(`${m.qty.toFixed(1)} ${m.unit}`, 90, y);
      doc.text(m.value.toLocaleString(), 140, y);
      y += 8;
    });

    y += 6;
    doc.line(20, y - 3, 190, y - 3);
    doc.setFontSize(11);
    doc.text(`Total Value: KES ${totalValue.toLocaleString()}`, 110, y + 4);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("Confidential — Annual Sustainability Report — Duara Flow Platform", 105, 280, { align: "center" });

    doc.save(`sustainability-report-${year}.pdf`);
  };

  const downloadCSV = () => {
    if (!collections?.length) return;
    const header = "Batch ID,Material,Quantity,Unit,Value (KES),Location,Date\n";
    const rows = collections.map((c) => {
      const mt = (c as any).material_types;
      return [
        c.batch_id,
        mt?.name || "",
        Number(c.quantity).toFixed(1),
        mt?.unit || "kg",
        (Number(c.quantity) * Number(mt?.price_per_unit || 0)).toFixed(2),
        c.location_name || "",
        format(new Date(c.collected_at), "yyyy-MM-dd"),
      ].join(",");
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sustainability-data-${format(new Date(), "yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Annual Sustainability Report</p>
                <p className="text-xs text-muted-foreground">Multi-page PDF with executive summary, environmental & social impact, and material breakdown</p>
              </div>
            </div>
            <Button size="sm" onClick={generateAnnualReport} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Raw Data Export</p>
                <p className="text-xs text-muted-foreground">Download all collection data as CSV for custom analysis and reporting</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={downloadCSV} disabled={!collections?.length} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Report Highlights</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{totalKg.toFixed(0)} kg</p>
              <p className="text-[10px] text-muted-foreground">Waste Diverted</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{co2Saved} kg</p>
              <p className="text-[10px] text-muted-foreground">CO₂ Offset</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{pickers?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground">Livelihoods</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{collections?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground">Records</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SustainabilityReportPanel;
