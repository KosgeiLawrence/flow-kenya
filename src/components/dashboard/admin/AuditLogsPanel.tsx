import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Download, Search } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { addBrandedHeader, addDocMeta, drawTableHeader, drawTableRow, finalizePdf } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const AuditLogsPanel = () => {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: collections } = useQuery({ queryKey: ["admin-audit-collections"], queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name)").order("created_at", { ascending: false }).limit(200); if (error) throw error; return data; } });
  const { data: payments } = useQuery({ queryKey: ["admin-audit-payments"], queryFn: async () => { const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200); if (error) throw error; return data; } });
  const { data: profiles } = useQuery({ queryKey: ["admin-audit-profiles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("full_name, user_id, created_at, approval_status").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data; } });

  const logs = [
    ...(collections?.map((c) => ({ timestamp: c.created_at, type: "Collection", detail: `${Number(c.quantity).toFixed(1)} kg of ${(c as any).material_types?.name || "material"} — Batch ${c.batch_id}`, actor: c.user_id.slice(0, 8) })) || []),
    ...(payments?.map((p) => ({ timestamp: p.created_at, type: "Payment", detail: `KES ${Number(p.amount).toLocaleString()} to ${p.phone_number} — ${p.status}`, actor: p.user_id.slice(0, 8) })) || []),
    ...(profiles?.map((p) => ({ timestamp: p.created_at, type: "Registration", detail: `${p.full_name} registered — Status: ${p.approval_status}`, actor: p.user_id.slice(0, 8) })) || []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .filter((l) => typeFilter === "all" || l.type === typeFilter)
   .filter((l) => !searchQuery || l.detail.toLowerCase().includes(searchQuery.toLowerCase()));

  const exportPDF = async () => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "Audit Log Report", `${logs.length} events captured`);
    y = addDocMeta(doc, [{ label: "Generated", value: new Date().toLocaleString() }], y);

    y = drawTableHeader(doc, [
      { label: "Timestamp", x: 17 }, { label: "Type", x: 65 }, { label: "Detail", x: 90 },
    ], y, 180);

    logs.slice(0, 80).forEach((l, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(7);
      doc.text(new Date(l.timestamp).toLocaleString(), 17, y);
      doc.text(l.type, 65, y);
      doc.text(l.detail.slice(0, 55), 90, y);
      y += 6;
    });

    await finalizePdf(doc);
    doc.save("audit-log.pdf");
    toast.success("Audit log exported");
  };

  const exportCSV = () => {
    const rows = [["Timestamp", "Type", "Detail", "Actor"]];
    logs.forEach((l) => { rows.push([new Date(l.timestamp).toLocaleString(), l.type, l.detail, l.actor]); });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-display font-bold text-foreground">{t("adminPanels.auditLogs")}</h2><p className="text-muted-foreground">Complete activity trail across the platform</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" /> CSV</Button>
          <Button onClick={exportPDF} className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="Collection">Collections</SelectItem><SelectItem value="Payment">Payments</SelectItem><SelectItem value="Registration">Registrations</SelectItem></SelectContent></Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Activity Log ({logs.length} events)</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Type</TableHead><TableHead>Detail</TableHead><TableHead>User</TableHead></TableRow></TableHeader><TableBody>{logs.slice(0, 100).map((l, i) => (<TableRow key={i}><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</TableCell><TableCell><Badge variant="outline" className={l.type === "Payment" ? "border-secondary text-secondary" : l.type === "Registration" ? "border-accent text-secondary-foreground" : "border-primary text-primary"}>{l.type}</Badge></TableCell><TableCell className="text-sm max-w-[400px] truncate">{l.detail}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{l.actor}…</TableCell></TableRow>))}</TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPanel;
