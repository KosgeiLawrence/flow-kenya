import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Leaf, Users } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const ReportsPanel = () => {
  const { profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["ngo_report_collections"],
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
    queryKey: ["ngo_report_pickers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role)")
        .eq("user_roles.role", "waste_picker");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = (totalKg * 2.5).toFixed(1);
  const totalValue = collections?.reduce((s, c) => {
    const mt = (c as any).material_types;
    return s + Number(c.quantity) * Number(mt?.price_per_unit || 0);
  }, 0) || 0;

  const generateImpactReport = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Impact Report", 20, 32);
    doc.setTextColor(0);

    doc.setFontSize(10);
    doc.text(`Prepared by: ${profile?.full_name || "NGO"}`, 20, 46);
    doc.text(`Date: ${today}`, 20, 53);

    doc.setFontSize(14);
    doc.text("Summary", 20, 68);
    doc.setFontSize(10);
    doc.text(`Total Waste Collected: ${totalKg.toFixed(1)} kg`, 25, 78);
    doc.text(`CO₂ Offset: ${co2Saved} kg`, 25, 86);
    doc.text(`Economic Value Generated: KES ${totalValue.toLocaleString()}`, 25, 94);
    doc.text(`Waste Pickers Supported: ${pickers?.length || 0}`, 25, 102);
    doc.text(`Verified Pickers: ${pickers?.filter((p) => p.approval_status === "approved").length || 0}`, 25, 110);

    // Material breakdown
    doc.setFontSize(14);
    doc.text("Material Breakdown", 20, 128);

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

    let y = 138;
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

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated impact report — Duara Flow", 20, 280);
    doc.save(`impact-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const generateDonorReport = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Donor Report", 20, 32);
    doc.setTextColor(0);

    doc.setFontSize(10);
    doc.text(`Organization: ${profile?.full_name || "NGO"}`, 20, 46);
    doc.text(`Report Date: ${today}`, 20, 53);
    doc.text(`Reporting Period: Last 12 months`, 20, 60);

    doc.setFontSize(14);
    doc.text("Key Outcomes", 20, 78);
    doc.setFontSize(10);

    const outcomes = [
      `${totalKg.toFixed(0)} kg of waste collected and diverted from landfills`,
      `${co2Saved} kg of CO₂ emissions prevented`,
      `${pickers?.length || 0} waste pickers enrolled in the platform`,
      `${pickers?.filter((p) => p.approval_status === "approved").length || 0} pickers verified and active`,
      `KES ${totalValue.toLocaleString()} in economic value generated for communities`,
      `${new Set(collections?.map((c) => c.location_name).filter(Boolean)).size} collection sites active`,
    ];

    let y = 88;
    outcomes.forEach((o) => {
      doc.text(`• ${o}`, 25, y);
      y += 9;
    });

    y += 10;
    doc.setFontSize(14);
    doc.text("Sustainability Impact", 20, y);
    y += 12;
    doc.setFontSize(10);
    doc.text(`Water Saved: ${(totalKg * 18).toLocaleString()} liters (estimated)`, 25, y);
    y += 9;
    doc.text(`Energy Saved: ${(totalKg * 5.8).toFixed(1)} kWh (estimated)`, 25, y);
    y += 9;
    doc.text(`Plastic diverted: ${totalKg.toFixed(1)} kg`, 25, y);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("Confidential — Prepared for donor review — Duara Flow", 20, 280);
    doc.save(`donor-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
    a.download = `collection-data-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Leaf className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Impact Report</p>
                <p className="text-xs text-muted-foreground">Environmental & social impact summary with material breakdown</p>
              </div>
            </div>
            <Button size="sm" onClick={generateImpactReport} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Donor Report</p>
                <p className="text-xs text-muted-foreground">Key outcomes and sustainability metrics for funders</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={generateDonorReport} className="w-full">
              <FileText className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Raw Data Export</p>
                <p className="text-xs text-muted-foreground">Download all collection data as CSV for analysis</p>
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
        <CardHeader><CardTitle className="text-lg">Report Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{totalKg.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">Waste Collected</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{co2Saved} kg</p>
              <p className="text-xs text-muted-foreground">CO₂ Offset</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{pickers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Pickers</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Value Generated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPanel;
