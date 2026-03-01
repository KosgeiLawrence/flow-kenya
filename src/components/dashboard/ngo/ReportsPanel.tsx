import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Leaf, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { format, differenceInYears } from "date-fns";
import { renderDuaraFlowLogo, loadImageAsBase64 } from "@/lib/pdfLogoUtils";

const CO2_FACTORS: Record<string, number> = {
  PET: 3.1, HDPE: 1.9, LDPE: 2.0, PP: 1.7, PS: 3.3, Aluminium: 9.1, Glass: 0.6,
};

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

  const { data: programs } = useQuery({
    queryKey: ["ngo_report_programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ngo_programs").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: org } = useQuery({
    queryKey: ["ngo_org", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", profile!.organization_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = collections?.reduce((s, c) => {
    const name = (c as any).material_types?.name || "";
    return s + Number(c.quantity) * (CO2_FACTORS[name] || 2.5);
  }, 0) || 0;
  const totalValue = collections?.reduce((s, c) => {
    const mt = (c as any).material_types;
    return s + Number(c.quantity) * Number(mt?.price_per_unit || 0);
  }, 0) || 0;
  const women = pickers?.filter(p => p.gender?.toLowerCase() === "female") || [];
  const youth = pickers?.filter(p => {
    if (!p.date_of_birth) return false;
    return differenceInYears(new Date(), new Date(p.date_of_birth)) < 35;
  }) || [];

  const orgName = org?.name || profile?.full_name || "NGO";
  const reportId = `RPT-${(profile?.id || "").slice(0, 6).toUpperCase()}-${format(new Date(), "yyyyMM")}`;
  const verifyUrl = `https://duaraflow.com/verify/${reportId}`;

  const addLogos = async (doc: jsPDF) => {
    const [duaraLogo, orgLogo] = await Promise.all([
      renderDuaraFlowLogo(200),
      org?.logo_url ? loadImageAsBase64(org.logo_url) : Promise.resolve(null),
    ]);
    if (duaraLogo) doc.addImage(duaraLogo, "PNG", 15, 12, 22, 22);
    if (orgLogo) doc.addImage(orgLogo, "PNG", 173, 12, 22, 22);
  };

  const generateDonorReport = async () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    await addLogos(doc);

    // Border
    doc.setDrawColor(34, 87, 62);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    doc.setFontSize(22);
    doc.setTextColor(34, 87, 62);
    doc.text("DONOR IMPACT REPORT", 105, 45, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Duara Flow — Verified Impact Monitoring", 105, 54, { align: "center" });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Organization: ${orgName}`, 20, 68);
    doc.text(`Report ID: ${reportId}`, 20, 76);
    doc.text(`Date: ${today}`, 20, 84);
    doc.text(`Period: Last 12 months`, 140, 68);

    // Key metrics
    doc.setFontSize(14);
    doc.setTextColor(34, 87, 62);
    doc.text("Key Impact Metrics", 20, 100);

    doc.setFontSize(11);
    doc.setTextColor(0);
    const outcomes = [
      `Total Waste Collected: ${totalKg.toFixed(0)} kg`,
      `CO₂ Emissions Avoided: ${co2Saved.toFixed(0)} kg`,
      `Income Generated: KES ${totalValue.toLocaleString()}`,
      `Waste Pickers Supported: ${pickers?.length || 0}`,
      `Women Participants: ${women.length}`,
      `Youth Participants (<35): ${youth.length}`,
      `Active Programs: ${programs?.filter(p => p.status === "active").length || 0}`,
      `Collection Sites: ${new Set(collections?.map(c => c.location_name).filter(Boolean)).size}`,
    ];
    let y = 112;
    outcomes.forEach(o => { doc.text(`• ${o}`, 25, y); y += 9; });

    // Program summary
    if (programs?.length) {
      y += 6;
      doc.setFontSize(14);
      doc.setTextColor(34, 87, 62);
      doc.text("Active Programs", 20, y);
      y += 10;
      doc.setFontSize(9);
      doc.setTextColor(0);
      programs.forEach(p => {
        const progress = p.target_kg > 0 ? ((Number(p.recovered_kg) / Number(p.target_kg)) * 100).toFixed(0) : "N/A";
        doc.text(`• ${p.name} — Budget: KES ${Number(p.budget).toLocaleString()} — Target: ${progress}%`, 25, y);
        y += 7;
        if (y > 260) { doc.addPage(); y = 20; }
      });
    }

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Verification: ${verifyUrl}`, 105, 260, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("This report is digitally generated and verifiable via QR code.", 105, 270, { align: "center" });

    doc.save(`donor-report-${reportId}.pdf`);
  };

  const generateProgramReport = async () => {
    if (!programs?.length) { return; }
    const doc = new jsPDF();
    await addLogos(doc);

    doc.setDrawColor(34, 87, 62);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    doc.setFontSize(22);
    doc.setTextColor(34, 87, 62);
    doc.text("PROGRAM REPORT", 105, 45, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Organization: ${orgName}`, 20, 60);
    doc.text(`Date: ${format(new Date(), "MMM d, yyyy")}`, 20, 68);

    let y = 84;
    programs.forEach(p => {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(34, 87, 62);
      doc.text(p.name, 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(0);
      const lines = [
        `Funder: ${p.funder || "Self-funded"} | County: ${p.county || "National"}`,
        `Period: ${format(new Date(p.start_date), "MMM yyyy")} — ${format(new Date(p.end_date), "MMM yyyy")}`,
        `Budget: KES ${Number(p.budget).toLocaleString()} | Spent: KES ${Number(p.spent).toLocaleString()} (${p.budget > 0 ? ((Number(p.spent) / Number(p.budget)) * 100).toFixed(0) : 0}%)`,
        `Target: ${Number(p.target_kg).toLocaleString()} kg | Recovered: ${Number(p.recovered_kg).toLocaleString()} kg (${p.target_kg > 0 ? ((Number(p.recovered_kg) / Number(p.target_kg)) * 100).toFixed(0) : 0}%)`,
      ];
      lines.forEach(l => { doc.text(l, 25, y); y += 7; });
      y += 6;
    });

    doc.save(`program-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const downloadCSV = () => {
    if (!collections?.length) return;
    const header = "Batch ID,Material,Quantity,Unit,Value (KES),Location,Date\n";
    const rows = collections.map(c => {
      const mt = (c as any).material_types;
      return [
        c.batch_id, mt?.name || "", Number(c.quantity).toFixed(1), mt?.unit || "kg",
        (Number(c.quantity) * Number(mt?.price_per_unit || 0)).toFixed(2),
        c.location_name || "", format(new Date(c.collected_at), "yyyy-MM-dd"),
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
      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Leaf className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Donor Impact Report</p>
                <p className="text-xs text-muted-foreground">Full impact summary with metrics & QR verification</p>
              </div>
            </div>
            <Button size="sm" onClick={generateDonorReport} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Program Report</p>
                <p className="text-xs text-muted-foreground">Budget & target tracking per program</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={generateProgramReport} disabled={!programs?.length} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Community Breakdown</p>
                <p className="text-xs text-muted-foreground">Impact by location & demographics</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={generateDonorReport} className="w-full">
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
                <p className="text-xs text-muted-foreground">All collection data as CSV for analysis</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={downloadCSV} disabled={!collections?.length} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* QR verification preview */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Report Verification</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          <QRCodeSVG value={verifyUrl} size={80} fgColor="hsl(152,45%,22%)" />
          <div>
            <p className="text-sm font-medium text-foreground">Report ID: {reportId}</p>
            <p className="text-xs text-muted-foreground mt-1">All downloadable reports include this QR code for third-party verification of reported impact data.</p>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-lg font-bold text-foreground">{co2Saved.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">CO₂ Avoided</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{pickers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Pickers ({women.length} women)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Income Generated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPanel;
