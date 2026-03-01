import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

const AuditLogsPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["admin-audit-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-audit-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Combine into audit trail
  const logs = [
    ...(collections?.map((c) => ({
      timestamp: c.created_at,
      type: "Collection",
      detail: `${Number(c.quantity).toFixed(1)} kg of ${(c as any).material_types?.name || "material"} — Batch ${c.batch_id}`,
      actor: c.user_id.slice(0, 8),
    })) || []),
    ...(payments?.map((p) => ({
      timestamp: p.created_at,
      type: "Payment",
      detail: `KES ${Number(p.amount).toLocaleString()} to ${p.phone_number} — ${p.status}`,
      actor: p.user_id.slice(0, 8),
    })) || []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Audit Log Report", 20, 20);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);

    let y = 40;
    doc.setFontSize(9);
    doc.text("Timestamp", 15, y);
    doc.text("Type", 65, y);
    doc.text("Detail", 90, y);
    y += 8;

    logs.slice(0, 60).forEach((l) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(new Date(l.timestamp).toLocaleString(), 15, y);
      doc.text(l.type, 65, y);
      doc.text(l.detail.slice(0, 60), 90, y);
      y += 6;
    });

    doc.save("audit-log.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Audit Logs</h2>
          <p className="text-muted-foreground">Complete activity trail across the platform</p>
        </div>
        <Button onClick={exportPDF} className="gap-2">
          <Download className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity ({logs.length} events)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 100).map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={l.type === "Payment" ? "border-secondary text-secondary" : "border-primary text-primary"}>
                      {l.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[400px] truncate">{l.detail}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{l.actor}…</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPanel;
