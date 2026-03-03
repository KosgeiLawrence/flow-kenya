import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Leaf, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { format, differenceInYears } from "date-fns";
import { loadImageAsBase64 } from "@/lib/pdfLogoUtils";
import { addBrandedHeader, addDocMeta, addSectionTitle, finalizePdf } from "@/lib/pdfBranding";

const CO2_FACTORS: Record<string, number> = { PET: 3.1, HDPE: 1.9, LDPE: 2.0, PP: 1.7, PS: 3.3, Aluminium: 9.1, Glass: 0.6 };

const ReportsPanel = () => {
  const { profile } = useAuth();

  const { data: collections } = useQuery({ queryKey: ["ngo_report_collections"], queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name, unit, price_per_unit)").order("collected_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: pickers } = useQuery({ queryKey: ["ngo_report_pickers"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*, user_roles!inner(role)").eq("user_roles.role", "waste_picker"); if (error) throw error; return data; } });
  const { data: programs } = useQuery({ queryKey: ["ngo_report_programs"], queryFn: async () => { const { data, error } = await supabase.from("ngo_programs").select("*"); if (error) throw error; return data; } });
  const { data: org } = useQuery({ queryKey: ["ngo_org", profile?.organization_id], enabled: !!profile?.organization_id, queryFn: async () => { const { data, error } = await supabase.from("organizations").select("name, logo_url").eq("id", profile!.organization_id!).single(); if (error) throw error; return data; } });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = collections?.reduce((s, c) => { const name = (c as any).material_types?.name || ""; return s + Number(c.quantity) * (CO2_FACTORS[name] || 2.5); }, 0) || 0;
  const totalValue = collections?.reduce((s, c) => { const mt = (c as any).material_types; return s + Number(c.quantity) * Number(mt?.price_per_unit || 0); }, 0) || 0;
  const women = pickers?.filter(p => p.gender?.toLowerCase() === "female") || [];
  const youth = pickers?.filter(p => { if (!p.date_of_birth) return false; return differenceInYears(new Date(), new Date(p.date_of_birth)) < 35; }) || [];

  const orgName = org?.name || profile?.full_name || "NGO";
  const reportId = `RPT-${(profile?.id || "").slice(0, 6).toUpperCase()}-${format(new Date(), "yyyyMM")}`;
  const verifyUrl = `https://duaraflow.com/verify/${reportId}`;

  const generateDonorReport = async () => {
    const doc = new jsPDF();
    const orgLogo = org?.logo_url ? await loadImageAsBase64(org.logo_url) : null;
    let y = await addBrandedHeader(doc, "Donor Impact Report", "Verified Impact Monitoring", { orgLogoBase64: orgLogo });

    y = addDocMeta(doc, [
      { label: "Organization", value: orgName },
      { label: "Report ID", value: reportId },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Period", value: "Last 12 months" },
    ], y);

    y = addSectionTitle(doc, "Key Impact Metrics", y);
    doc.setFontSize(10);
    [
      `Total Waste Collected: ${totalKg.toFixed(0)} kg`,
      `CO₂ Emissions Avoided: ${co2Saved.toFixed(0)} kg`,
      `Income Generated: KES ${totalValue.toLocaleString()}`,
      `Waste Pickers Supported: ${pickers?.length || 0}`,
      `Women Participants: ${women.length}`,
      `Youth Participants (<35): ${youth.length}`,
      `Active Programs: ${programs?.filter(p => p.status === "active").length || 0}`,
      `Collection Sites: ${new Set(collections?.map(c => c.location_name).filter(Boolean)).size}`,
    ].forEach(o => { doc.text(`• ${o}`, 20, y); y += 9; });

    if (programs?.length) {
      y += 4;
      y = addSectionTitle(doc, "Active Programs", y);
      doc.setFontSize(9);
      programs.forEach(p => {
        const progress = p.target_kg > 0 ? ((Number(p.recovered_kg) / Number(p.target_kg)) * 100).toFixed(0) : "N/A";
        doc.text(`• ${p.name} — Budget: KES ${Number(p.budget).toLocaleString()} — Target: ${progress}%`, 20, y);
        y += 7;
        if (y > 250) { doc.addPage(); y = 20; }
      });
    }

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Verification: ${verifyUrl}`, 105, 250, { align: "center" });

    await finalizePdf(doc);
    doc.save(`donor-report-${reportId}.pdf`);
  };

  const generateProgramReport = async () => {
    if (!programs?.length) return;
    const doc = new jsPDF();
    const orgLogo = org?.logo_url ? await loadImageAsBase64(org.logo_url) : null;
    let y = await addBrandedHeader(doc, "Program Report", "Budget & target tracking per program", { orgLogoBase64: orgLogo });

    y = addDocMeta(doc, [
      { label: "Organization", value: orgName },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
    ], y);

    programs.forEach(p => {
      if (y > 230) { doc.addPage(); y = 20; }
      y = addSectionTitle(doc, p.name, y);
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      [
        `Funder: ${p.funder || "Self-funded"} | County: ${p.county || "National"}`,
        `Period: ${format(new Date(p.start_date), "MMM yyyy")} — ${format(new Date(p.end_date), "MMM yyyy")}`,
        `Budget: KES ${Number(p.budget).toLocaleString()} | Spent: KES ${Number(p.spent).toLocaleString()} (${p.budget > 0 ? ((Number(p.spent) / Number(p.budget)) * 100).toFixed(0) : 0}%)`,
        `Target: ${Number(p.target_kg).toLocaleString()} kg | Recovered: ${Number(p.recovered_kg).toLocaleString()} kg (${p.target_kg > 0 ? ((Number(p.recovered_kg) / Number(p.target_kg)) * 100).toFixed(0) : 0}%)`,
      ].forEach(l => { doc.text(l, 20, y); y += 7; });
      y += 6;
    });

    await finalizePdf(doc);
    doc.save(`program-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const downloadCSV = () => {
    if (!collections?.length) return;
    const header = "Batch ID,Material,Quantity,Unit,Value (KES),Location,Date\n";
    const rows = collections.map(c => { const mt = (c as any).material_types; return [c.batch_id, mt?.name || "", Number(c.quantity).toFixed(1), mt?.unit || "kg", (Number(c.quantity) * Number(mt?.price_per_unit || 0)).toFixed(2), c.location_name || "", format(new Date(c.collected_at), "yyyy-MM-dd")].join(","); }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `collection-data-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-soft"><CardContent className="p-5 space-y-3"><div className="flex items-center gap-3"><Leaf className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium text-foreground">Donor Impact Report</p><p className="text-xs text-muted-foreground">Full impact summary with metrics & QR verification</p></div></div><Button size="sm" onClick={generateDonorReport} className="w-full"><Download className="w-4 h-4 mr-1" /> Download PDF</Button></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5 space-y-3"><div className="flex items-center gap-3"><FileText className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium text-foreground">Program Report</p><p className="text-xs text-muted-foreground">Budget & target tracking per program</p></div></div><Button size="sm" variant="outline" onClick={generateProgramReport} disabled={!programs?.length} className="w-full"><Download className="w-4 h-4 mr-1" /> Download PDF</Button></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5 space-y-3"><div className="flex items-center gap-3"><Users className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium text-foreground">Community Breakdown</p><p className="text-xs text-muted-foreground">Impact by location & demographics</p></div></div><Button size="sm" variant="outline" onClick={generateDonorReport} className="w-full"><Download className="w-4 h-4 mr-1" /> Download PDF</Button></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5 space-y-3"><div className="flex items-center gap-3"><FileText className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium text-foreground">Raw Data Export</p><p className="text-xs text-muted-foreground">All collection data as CSV for analysis</p></div></div><Button size="sm" variant="outline" onClick={downloadCSV} disabled={!collections?.length} className="w-full"><Download className="w-4 h-4 mr-1" /> Download CSV</Button></CardContent></Card>
      </div>

      <Card className="shadow-soft"><CardHeader><CardTitle className="text-lg">Report Verification</CardTitle></CardHeader><CardContent className="flex items-center gap-6"><QRCodeSVG value={verifyUrl} size={80} fgColor="hsl(152,45%,22%)" /><div><p className="text-sm font-medium text-foreground">Report ID: {reportId}</p><p className="text-xs text-muted-foreground mt-1">All downloadable reports include this QR code for third-party verification of reported impact data.</p></div></CardContent></Card>

      <Card className="shadow-soft"><CardHeader><CardTitle className="text-lg">Report Summary</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><div className="text-center p-3 rounded-lg bg-muted/30"><p className="text-lg font-bold text-foreground">{totalKg.toFixed(0)} kg</p><p className="text-xs text-muted-foreground">Waste Collected</p></div><div className="text-center p-3 rounded-lg bg-muted/30"><p className="text-lg font-bold text-foreground">{co2Saved.toFixed(0)} kg</p><p className="text-xs text-muted-foreground">CO₂ Avoided</p></div><div className="text-center p-3 rounded-lg bg-muted/30"><p className="text-lg font-bold text-foreground">{pickers?.length || 0}</p><p className="text-xs text-muted-foreground">Pickers ({women.length} women)</p></div><div className="text-center p-3 rounded-lg bg-muted/30"><p className="text-lg font-bold text-foreground">KES {totalValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Income Generated</p></div></div></CardContent></Card>
    </div>
  );
};

export default ReportsPanel;
