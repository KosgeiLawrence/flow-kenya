import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, AlertTriangle, Eye, TrendingUp } from "lucide-react";

const FraudDetectionPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["admin-fraud-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-fraud-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Flag anomalies: collections > 500kg or payments > 50000
  const suspiciousCollections = collections?.filter((c) => Number(c.quantity) > 500) || [];
  const suspiciousPayments = payments?.filter((p) => Number(p.amount) > 50000) || [];
  const failedPayments = payments?.filter((p) => p.status === "failed") || [];

  // Duplicate batch detection
  const batchCounts: Record<string, number> = {};
  collections?.forEach((c) => {
    batchCounts[c.batch_id] = (batchCounts[c.batch_id] || 0) + 1;
  });
  const duplicateBatches = Object.entries(batchCounts).filter(([, count]) => count > 1);

  const alerts = [
    { label: "High-Volume Collections", value: suspiciousCollections.length, icon: AlertTriangle, severity: suspiciousCollections.length > 0 ? "warning" : "ok" },
    { label: "Large Payments", value: suspiciousPayments.length, icon: TrendingUp, severity: suspiciousPayments.length > 0 ? "warning" : "ok" },
    { label: "Failed Transactions", value: failedPayments.length, icon: ShieldAlert, severity: failedPayments.length > 0 ? "critical" : "ok" },
    { label: "Duplicate Batches", value: duplicateBatches.length, icon: Eye, severity: duplicateBatches.length > 0 ? "critical" : "ok" },
  ];

  const severityColor = (s: string) => {
    if (s === "critical") return "text-destructive";
    if (s === "warning") return "text-secondary";
    return "text-primary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Fraud Detection & Monitoring</h2>
        <p className="text-muted-foreground">Automated anomaly detection across platform activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {alerts.map((a) => (
          <Card key={a.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <a.icon className={`w-8 h-8 ${severityColor(a.severity)}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{a.value}</p>
                <p className="text-xs text-muted-foreground">{a.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {suspiciousCollections.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">⚠️ High-Volume Collections (&gt;500 kg)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousCollections.slice(0, 20).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{new Date(c.collected_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{c.batch_id}</TableCell>
                    <TableCell>{(c as any).material_types?.name || "—"}</TableCell>
                    <TableCell><Badge className="bg-destructive/20 text-destructive">{Number(c.quantity).toFixed(1)} kg</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.location_name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {suspiciousPayments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">⚠️ Large Payments (&gt;KES 50,000)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousPayments.slice(0, 20).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{p.phone_number}</TableCell>
                    <TableCell className="font-medium">KES {Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className="bg-secondary/20 text-secondary">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {suspiciousCollections.length === 0 && suspiciousPayments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-3" />
            <p className="text-foreground font-medium">No anomalies detected</p>
            <p className="text-sm text-muted-foreground">All activity appears within normal thresholds</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FraudDetectionPanel;
