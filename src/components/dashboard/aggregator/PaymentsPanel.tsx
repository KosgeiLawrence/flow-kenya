import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { format } from "date-fns";

const PaymentsPanel = () => {
  const { user } = useAuth();

  const { data: payments } = useQuery({
    queryKey: ["aggregator_payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalPaid = payments?.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0) || 0;
  const totalPending = payments?.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0) || 0;

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const s = map[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <ArrowUpRight className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">KES {totalPaid.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="w-8 h-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-foreground">KES {totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground">{payments?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Transaction History</CardTitle></CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{p.phone_number} · {format(new Date(p.created_at), "MMM d, yyyy")}</p>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.mpesa_receipt_number && (
                      <span className="text-xs font-mono text-muted-foreground">{p.mpesa_receipt_number}</span>
                    )}
                    {statusBadge(p.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPanel;
