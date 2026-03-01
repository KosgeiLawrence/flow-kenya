import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const TransactionTrackingPanel = () => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const completed = payments?.filter((p) => p.status === "completed") || [];
  const pending = payments?.filter((p) => p.status === "pending") || [];
  const completedTotal = completed.reduce((s, p) => s + Number(p.amount), 0);

  // Simulated commission (2.5% platform fee)
  const commission = completedTotal * 0.025;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-secondary/20 text-secondary",
      completed: "bg-primary/20 text-primary",
      failed: "bg-destructive/20 text-destructive",
    };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Transaction & Commission Tracking</h2>
        <p className="text-muted-foreground">Monitor all platform financial activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: `KES ${total.toLocaleString()}`, icon: DollarSign },
          { label: "Completed", value: `KES ${completedTotal.toLocaleString()}`, icon: CheckCircle2 },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Platform Commission", value: `KES ${commission.toLocaleString()}`, icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>M-Pesa Receipt</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.slice(0, 50).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</TableCell>
                    <TableCell>{p.phone_number}</TableCell>
                    <TableCell className="font-medium">KES {Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.mpesa_receipt_number || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionTrackingPanel;
