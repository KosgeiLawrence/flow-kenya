import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, Download, CheckCircle2, AlertTriangle } from "lucide-react";
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

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const approvedUsers = profiles?.filter((p) => p.approval_status === "approved").length || 0;
  const totalUsers = profiles?.length || 0;
  const complianceRate = totalUsers > 0 ? ((approvedUsers / totalUsers) * 100).toFixed(1) : "0";

  // Regulatory compliance checklist
  const checks = [
    { item: "Waste collection tracking active", status: (collections?.length || 0) > 0 },
    { item: "User verification system operational", status: totalUsers > 0 },
    { item: "Material traceability (batch IDs)", status: collections?.every((c) => c.batch_id) || false },
    { item: "User approval rate > 50%", status: Number(complianceRate) > 50 },
    { item: "Environmental impact tracking", status: totalKg > 0 },
  ];

  const exportRegulatoryReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Regulatory Compliance Report", 20, 20);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);

    let y = 45;
    doc.setFontSize(12);
    doc.text("Compliance Overview", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Total Registered Operators: ${totalUsers}`, 25, y); y += 7;
    doc.text(`Verified Operators: ${approvedUsers}`, 25, y); y += 7;
    doc.text(`Compliance Rate: ${complianceRate}%`, 25, y); y += 7;
    doc.text(`Total Waste Tracked: ${totalKg.toFixed(1)} kg`, 25, y); y += 7;
    doc.text(`Collections Logged: ${collections?.length || 0}`, 25, y); y += 15;

    doc.setFontSize(12);
    doc.text("Compliance Checklist", 20, y); y += 10;
    doc.setFontSize(10);
    checks.forEach((c) => {
      doc.text(`${c.status ? "✓" : "✗"} ${c.item}`, 25, y);
      y += 7;
    });

    doc.save("regulatory-compliance-report.pdf");
    toast.success("Regulatory report downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Regulatory Reporting Module</h2>
          <p className="text-muted-foreground">Compliance tracking and regulatory documentation</p>
        </div>
        <Button onClick={exportRegulatoryReport} className="gap-2">
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{complianceRate}%</p>
              <p className="text-xs text-muted-foreground">Compliance Rate</p>
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
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Compliance Checklist</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requirement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.map((c) => (
                <TableRow key={c.item}>
                  <TableCell>{c.item}</TableCell>
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
