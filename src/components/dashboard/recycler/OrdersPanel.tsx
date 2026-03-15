import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Plus, FileText, CheckCircle2, Clock, XCircle, Truck, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawTotalLine, finalizeCleanPdf } from "@/lib/pdfBranding";

const statusMap: Record<string, { icon: React.ElementType; variant: "default" | "secondary" | "destructive"; label: string }> = {
  pending: { icon: Clock, variant: "secondary", label: "Pending" },
  confirmed: { icon: CheckCircle2, variant: "default", label: "Confirmed" },
  delivered: { icon: Truck, variant: "default", label: "Delivered" },
  cancelled: { icon: XCircle, variant: "destructive", label: "Cancelled" },
};

const OrdersPanel = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ supplier_name: "", material_type: "", quantity: "", unit: "kg", unit_price: "", delivery_date: "", notes: "" });

  const { data: orders } = useQuery({
    queryKey: ["recycler_orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recycler_orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const qty = Number(form.quantity); const price = Number(form.unit_price);
      const { error } = await supabase.from("recycler_orders").insert({
        user_id: user!.id, supplier_name: form.supplier_name, material_type: form.material_type,
        quantity: qty, unit: form.unit, unit_price: price, total_amount: qty * price,
        delivery_date: form.delivery_date || null, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recycler_orders"] }); toast.success("Order created"); setDialogOpen(false); setForm({ supplier_name: "", material_type: "", quantity: "", unit: "kg", unit_price: "", delivery_date: "", notes: "" }); },
    onError: () => toast.error("Failed to create order"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("recycler_orders").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recycler_orders"] });
      if (variables.status === "delivered") {
        queryClient.invalidateQueries({ queryKey: ["recycler_delivered_orders"] });
        queryClient.invalidateQueries({ queryKey: ["recycler_inventory"] });
      }
      toast.success("Status updated");
    },
  });

  const generateOrderPDF = async (o: any) => {
    const doc = new jsPDF();

    let y = addCleanHeader(doc, "Purchase Order / Contract");
    y = addDocMeta(doc, [
      { label: "Order Date", value: format(new Date(o.order_date), "MMM d, yyyy") },
      { label: "Buyer", value: profile?.full_name || "Recycler" },
      ...(profile?.phone_number ? [{ label: "Phone", value: profile.phone_number }] : []),
      { label: "Supplier", value: o.supplier_name },
    ], y);

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Quantity", x: 85 }, { label: "Unit Price", x: 120 }, { label: "Total (KES)", x: 155 },
    ], y, 180);

    drawTableRow(doc, y, 0, 180);
    doc.setFontSize(8);
    doc.text(o.material_type, 17, y);
    doc.text(`${Number(o.quantity).toFixed(1)} ${o.unit}`, 85, y);
    doc.text(Number(o.unit_price).toFixed(2), 120, y);
    doc.text(Number(o.total_amount).toLocaleString(), 155, y);
    y += 10;

    drawTotalLine(doc, `Total: KES ${Number(o.total_amount).toLocaleString()}`, y);

    if (o.delivery_date) { y += 10; doc.setFontSize(9); doc.text(`Expected Delivery: ${format(new Date(o.delivery_date), "MMM d, yyyy")}`, 15, y); }
    if (o.notes) { y += 8; doc.setFontSize(9); doc.text(`Notes: ${o.notes}`, 15, y); }

    finalizeCleanPdf(doc);
    doc.save(`order-${o.id.slice(0, 8)}.pdf`);
  };

  const active = orders?.filter((o) => o.status !== "cancelled" && o.status !== "delivered") || [];
  const completed = orders?.filter((o) => o.status === "delivered") || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4"><ClipboardList className="w-7 h-7 text-primary" /><div><p className="text-xl font-bold text-foreground">{orders?.length || 0}</p><p className="text-xs text-muted-foreground">Total Orders</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4"><Clock className="w-7 h-7 text-accent" /><div><p className="text-xl font-bold text-foreground">{active.length}</p><p className="text-xs text-muted-foreground">Active</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="w-7 h-7 text-primary" /><div><p className="text-xl font-bold text-foreground">{completed.length}</p><p className="text-xs text-muted-foreground">Completed</p></div></CardContent></Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Orders & Contracts</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Order</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create New Order</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Supplier Name</Label><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="e.g. Kibera Aggregators" /></div>
                <div><Label>Material Type</Label><Input value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })} placeholder="e.g. PET Bottles" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div><Label>Unit</Label><Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="tonnes">tonnes</SelectItem><SelectItem value="pieces">pieces</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label>Unit Price (KES)</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div><Label>Expected Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contract terms..." rows={2} /></div>
                <Button className="w-full" onClick={() => createOrder.mutate()} disabled={!form.supplier_name || !form.material_type || !form.quantity || !form.unit_price || createOrder.isPending}>
                  {createOrder.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!orders?.length ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((o) => {
                const s = statusMap[o.status] || statusMap.pending;
                const SIcon = s.icon;
                return (
                  <div key={o.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{o.material_type} — {Number(o.quantity).toFixed(0)} {o.unit}</p>
                        <p className="text-xs text-muted-foreground">{o.supplier_name} · {format(new Date(o.order_date), "MMM d, yyyy")}</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">KES {Number(o.total_amount).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {o.status === "pending" && <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: o.id, status: "confirmed" })} className="text-xs">Confirm</Button>}
                      {o.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })} className="text-xs">Delivered</Button>}
                      <Button variant="ghost" size="icon" onClick={() => generateOrderPDF(o)} title="Download PDF"><Download className="w-4 h-4" /></Button>
                      <Badge variant={s.variant} className="flex items-center gap-1"><SIcon className="w-3 h-3" /> {s.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPanel;
