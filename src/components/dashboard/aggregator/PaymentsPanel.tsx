import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, ArrowUpRight, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const PaymentsPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phone_number: "", amount: "", description: "" });

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

  const createPayment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payments").insert({
        user_id: user!.id,
        phone_number: form.phone_number,
        amount: Number(form.amount),
        description: form.description || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_payments"] });
      setOpen(false);
      setForm({ phone_number: "", amount: "", description: "" });
      toast.success("Payment recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markCompleted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        mpesa_receipt_number: `RCP${Date.now().toString(36).toUpperCase()}`,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_payments"] });
      toast.success("Payment marked as completed");
    },
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

      {/* Record Payment */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button><Plus className="w-4 h-4 mr-1" /> Record Payment</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment to Picker</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Phone number (e.g. 0712345678)"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Amount (KES)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Textarea
              placeholder="Description (e.g. Payment for 50kg PET)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Button
              className="w-full"
              onClick={() => createPayment.mutate()}
              disabled={!form.phone_number || !form.amount || createPayment.isPending}
            >
              {createPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    {p.status === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => markCompleted.mutate(p.id)}>
                        Mark Paid
                      </Button>
                    )}
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
