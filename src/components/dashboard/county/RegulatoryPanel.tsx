import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

const RegulatoryPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["county-regulatory-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["county-regulatory-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["county-regulatory-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const approvedUsers = profiles?.filter((p) => p.approval_status === "approved").length || 0;
  const totalUsers = profiles?.length || 0;
  const complianceRate = totalUsers > 0 ? ((approvedUsers / totalUsers) * 100).toFixed(1) : "0";
  const totalPayments = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  // Unique materials tracked
  const materialSet = new Set(collections?.map((c) => (c as any).material_types?.name).filter(Boolean));
  // Unique locations
  const locationSet = new Set(collections?.map((c) => c.location_name).filter(Boolean));

  const checks = [
    { item: "Waste collection tracking active", status: (collections?.length || 0) > 0, category: "Operations" },
    { item: "User verification system operational", status: totalUsers > 0, category: "Operations" },
    { item: "Material traceability (batch IDs)", status: collections?.every((c) => c.batch_id) || false, category: "Traceability" },
    { item: "User approval rate > 50%", status: Number(complianceRate) > 50, category: "Compliance" },
    { item: "Environmental impact tracking", status: totalKg > 0, category: "Environmental" },
    { item: "Payment system operational", status: (payments?.length || 0) > 0, category: "Financial" },
    { item: "Multi-material type tracking", status: materialSet.size >= 2, category: "Traceability" },
    { item: "Multi-location coverage", status: locationSet.size >= 2, category: "Operations" },
    { item: "CO₂ offset data available", status: totalKg > 0, category: "Environmental" },
    { item: "Waste diversion from landfill tracked", status: totalKg > 0, category: "Environmental" },
  ];

  const passedChecks = checks.filter((c) => c.status).length;

  const exportRegulatoryReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Regulatory Compliance Report", 20, 20);
    doc.setFontSize(10);
    doc.text("Environmental & Waste Management Compliance", 20, 28);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 36);

    let y = 52;
    doc.setFontSize(12);
    doc.text("Compliance Overview", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Compliance Score: ${passedChecks}/${checks.length} (${((passedChecks / checks.length) * 100).toFixed(0)}%)`, 25, y); y += 7;
    doc.text(`Total Registered Operators: ${totalUsers}`, 25, y); y += 7;
    doc.text(`Verified Operators: ${approvedUsers}`, 25, y); y += 7;
    doc.text(`Compliance Rate: ${complianceRate}%`, 25, y); y += 15;

    doc.setFontSize(12);
    doc.text("Environmental Data", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Total Waste Tracked: ${totalKg.toFixed(1)} kg (${(totalKg / 1000).toFixed(2)} tons)`, 25, y); y += 7;
    doc.text(`CO₂ Avoided: ${(totalKg * 2.5).toFixed(1)} kg`, 25, y); y += 7;
    doc.text(`Water Saved: ${(totalKg * 18).toFixed(0)} liters`, 25, y); y += 7;
    doc.text(`Landfill Diversion: ${(totalKg * 0.0012).toFixed(2)} m³`, 25, y); y += 7;
    doc.text(`Material Types Tracked: ${materialSet.size}`, 25, y); y += 7;
    doc.text(`Collection Locations: ${locationSet.size}`, 25, y); y += 15;

    doc.setFontSize(12);
    doc.text("Financial Summary", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Total Payments Processed: KES ${totalPayments.toLocaleString()}`, 25, y); y += 7;
    doc.text(`Collections Logged: ${collections?.length || 0}`, 25, y); y += 15;

    doc.setFontSize(12);
    doc.text("Compliance Checklist", 20, y); y += 10;
    doc.setFontSize(9);
    checks.forEach((c) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${c.status ? "✓ PASS" : "✗ FAIL"} | ${c.category} | ${c.item}`, 25, y);
      y += 6;
    });

    doc.save("regulatory-compliance-report.pdf");
    toast.success("Regulatory report downloaded");
  };

  const exportComplianceCSV = () => {
    const rows = [
      ["Regulatory Compliance Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["=== OVERVIEW ==="],
      ["Metric", "Value"],
      ["Compliance Score", `${passedChecks}/${checks.length}`],
      ["Registered Operators", String(totalUsers)],
      ["Verified Operators", String(approvedUsers)],
      ["Total Waste (kg)", String(totalKg.toFixed(1))],
      ["CO2 Avoided (kg)", String((totalKg * 2.5).toFixed(1))],
      ["Total Payments (KES)", String(totalPayments)],
      [],
      ["=== CHECKLIST ==="],
      ["Requirement", "Category", "Status"],
      ...checks.map((c) => [c.item, c.category, c.status ? "PASS" : "FAIL"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "regulatory-compliance.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Compliance CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Regulatory Reporting Module</h2>
          <p className="text-muted-foreground">Compliance tracking, environmental reporting, and regulatory documentation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportComplianceCSV} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={exportRegulatoryReport} className="gap-2">
            <Download className="w-4 h-4" /> PDF Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{passedChecks}/{checks.length}</p>
              <p className="text-xs text-muted-foreground">Compliance Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{approvedUsers}</p>
              <p className="text-xs text-muted-foreground">Verified Operators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalUsers - approvedUsers}</p>
              <p className="text-xs text-muted-foreground">Pending Verification</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{(totalKg * 2.5 / 1000).toFixed(1)} t</p>
              <p className="text-xs text-muted-foreground">CO₂ Offset</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Compliance Checklist</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requirement</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.map((c) => (
                <TableRow key={c.item}>
                  <TableCell>{c.item}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell>
                    <Badge className={c.status ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}>
                      {c.status ? "Compliant" : "Non-Compliant"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegulatoryPanel;
