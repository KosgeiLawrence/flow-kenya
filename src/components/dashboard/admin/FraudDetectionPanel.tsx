import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, Eye, TrendingUp, Download } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { addBrandedHeader, addDocMeta, addSectionTitle, finalizePdf } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const FraudDetectionPanel = () => {
  const { t } = useTranslation();
  const { data: collections } = useQuery({
    queryKey: ["admin-fraud-collections"],
    queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name)").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-fraud-payments"],
    queryFn: async () => { const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const suspiciousCollections = collections?.filter((c) => Number(c.quantity) > 500) || [];
  const suspiciousPayments = payments?.filter((p) => Number(p.amount) > 50000) || [];
  const failedPayments = payments?.filter((p) => p.status === "failed") || [];

  const batchCounts: Record<string, number> = {};
  collections?.forEach((c) => { batchCounts[c.batch_id] = (batchCounts[c.batch_id] || 0) + 1; });
  const duplicateBatches = Object.entries(batchCounts).filter(([, count]) => count > 1);

  const rapidFire: string[] = [];
  if (collections) {
    const byUser: Record<string, Date[]> = {};
    collections.forEach((c) => { if (!byUser[c.user_id]) byUser[c.user_id] = []; byUser[c.user_id].push(new Date(c.created_at)); });
    Object.entries(byUser).forEach(([uid, dates]) => {
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) { if (dates[i].getTime() - dates[i - 1].getTime() < 5 * 60 * 1000) { if (!rapidFire.includes(uid)) rapidFire.push(uid); } }
    });
  }

  const alerts = [
    { label: "High-Volume Collections", value: suspiciousCollections.length, icon: AlertTriangle, severity: suspiciousCollections.length > 0 ? "warning" : "ok" },
    { label: "Large Payments", value: suspiciousPayments.length, icon: TrendingUp, severity: suspiciousPayments.length > 0 ? "warning" : "ok" },
    { label: "Failed Transactions", value: failedPayments.length, icon: ShieldAlert, severity: failedPayments.length > 0 ? "critical" : "ok" },
    { label: "Duplicate Batches", value: duplicateBatches.length, icon: Eye, severity: duplicateBatches.length > 0 ? "critical" : "ok" },
    { label: "Rapid-Fire Activity", value: rapidFire.length, icon: AlertTriangle, severity: rapidFire.length > 0 ? "warning" : "ok" },
  ];

  const severityColor = (s: string) => s === "critical" ? "text-destructive" : s === "warning" ? "text-secondary" : "text-primary";
  const totalFlags = alerts.reduce((s, a) => s + a.value, 0);

  const exportFraudReport = async () => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "Fraud Detection Report", "Automated anomaly detection across platform activity");
    y = addDocMeta(doc, [{ label: "Generated", value: new Date().toLocaleString() }], y);

    y = addSectionTitle(doc, "Anomaly Summary", y);
    doc.setFontSize(10);
    alerts.forEach((a) => { doc.text(`${a.label}: ${a.value} (${a.severity})`, 20, y); y += 7; });
    y += 3;
    doc.text(`Total Flags: ${totalFlags}`, 20, y); y += 12;

    if (suspiciousCollections.length > 0) {
      y = addSectionTitle(doc, "High-Volume Collections (>500 kg)", y);
      doc.setFontSize(8);
      suspiciousCollections.slice(0, 20).forEach((c) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.text(`${new Date(c.collected_at).toLocaleDateString()} | Batch ${c.batch_id} | ${Number(c.quantity).toFixed(1)} kg | ${c.location_name || "—"}`, 20, y);
        y += 5;
      });
      y += 5;
    }

    if (suspiciousPayments.length > 0) {
      y = addSectionTitle(doc, "Large Payments (>KES 50,000)", y);
      doc.setFontSize(8);
      suspiciousPayments.slice(0, 20).forEach((p) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.text(`${new Date(p.created_at).toLocaleDateString()} | ${p.phone_number} | KES ${Number(p.amount).toLocaleString()} | ${p.status}`, 20, y);
        y += 5;
      });
    }

    await finalizePdf(doc);
    doc.save("fraud-detection-report.pdf");
    toast.success("Fraud report downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Fraud Detection & Monitoring</h2>
          <p className="text-muted-foreground">Automated anomaly detection across platform activity</p>
        </div>
        <Button onClick={exportFraudReport} className="gap-2"><Download className="w-4 h-4" /> Export Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {alerts.map((a) => (
          <Card key={a.label}><CardContent className="p-4 flex items-center gap-3"><a.icon className={`w-8 h-8 ${severityColor(a.severity)}`} /><div><p className="text-2xl font-bold text-foreground">{a.value}</p><p className="text-xs text-muted-foreground">{a.label}</p></div></CardContent></Card>
        ))}
      </div>

      {suspiciousCollections.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">⚠️ High-Volume Collections (&gt;500 kg)</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Batch ID</TableHead><TableHead>Material</TableHead><TableHead>Quantity</TableHead><TableHead>Location</TableHead></TableRow></TableHeader><TableBody>{suspiciousCollections.slice(0, 20).map((c) => (<TableRow key={c.id}><TableCell className="text-xs">{new Date(c.collected_at).toLocaleDateString()}</TableCell><TableCell className="font-mono text-xs">{c.batch_id}</TableCell><TableCell>{(c as any).material_types?.name || "—"}</TableCell><TableCell><Badge className="bg-destructive/20 text-destructive">{Number(c.quantity).toFixed(1)} kg</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{c.location_name || "—"}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      )}

      {suspiciousPayments.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">⚠️ Large Payments (&gt;KES 50,000)</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Phone</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{suspiciousPayments.slice(0, 20).map((p) => (<TableRow key={p.id}><TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell><TableCell>{p.phone_number}</TableCell><TableCell className="font-medium">KES {Number(p.amount).toLocaleString()}</TableCell><TableCell><Badge className="bg-secondary/20 text-secondary">{p.status}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      )}

      {duplicateBatches.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">🔍 Duplicate Batch IDs</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Batch ID</TableHead><TableHead>Occurrences</TableHead></TableRow></TableHeader><TableBody>{duplicateBatches.map(([batch, count]) => (<TableRow key={batch}><TableCell className="font-mono text-sm">{batch}</TableCell><TableCell><Badge className="bg-destructive/20 text-destructive">{count}x</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      )}

      {totalFlags === 0 && (
        <Card><CardContent className="p-8 text-center"><ShieldAlert className="w-12 h-12 text-primary mx-auto mb-3" /><p className="text-foreground font-medium">No anomalies detected</p><p className="text-sm text-muted-foreground">All activity appears within normal thresholds</p></CardContent></Card>
      )}
    </div>
  );
};

export default FraudDetectionPanel;
