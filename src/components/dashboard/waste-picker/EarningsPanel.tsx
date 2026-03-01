import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Download, Smartphone } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const EarningsPanel = () => {
  const { user } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["collections_earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .eq("user_id", user!.id)
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalEarnings = collections?.reduce((sum, c) => {
    const price = Number((c as any).material_types?.price_per_unit || 0);
    return sum + Number(c.quantity) * price;
  }, 0) || 0;

  const totalPaid = payments?.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const downloadReceipt = (payment: any) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Duara Flow - Payment Receipt", 20, 25);
    doc.setFontSize(11);
    doc.text(`Receipt #: ${payment.mpesa_receipt_number || payment.id.slice(0, 8)}`, 20, 40);
    doc.text(`Date: ${format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}`, 20, 48);
    doc.text(`Amount: KES ${Number(payment.amount).toFixed(2)}`, 20, 56);
    doc.text(`Phone: ${payment.phone_number}`, 20, 64);
    doc.text(`Status: ${payment.status}`, 20, 72);
    if (payment.description) doc.text(`Description: ${payment.description}`, 20, 80);
    doc.setFontSize(9);
    doc.text("This is a system-generated receipt from Duara Flow.", 20, 100);
    doc.save(`receipt-${payment.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p>
            <p className="text-2xl font-display font-bold text-primary">KES {totalEarnings.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid Out</p>
            <p className="text-2xl font-display font-bold text-foreground">KES {totalPaid.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
            <p className="text-2xl font-display font-bold text-gold">KES {(totalEarnings - totalPaid).toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">M-Pesa Payment History</CardTitle>
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !payments?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payments yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">KES {Number(p.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "MMM d, yyyy • h:mm a")} • {p.phone_number}
                    </p>
                    {p.mpesa_receipt_number && (
                      <p className="text-xs text-muted-foreground">Ref: {p.mpesa_receipt_number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                      {p.status}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => downloadReceipt(p)} title="Download receipt">
                      <Download className="w-4 h-4" />
                    </Button>
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

export default EarningsPanel;
