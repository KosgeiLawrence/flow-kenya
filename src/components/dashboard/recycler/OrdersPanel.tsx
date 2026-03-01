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
      const { data, error } = await supabase
        .from("recycler_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const qty = Number(form.quantity);
      const price = Number(form.unit_price);
      const { error } = await supabase.from("recycler_orders").insert({
        user_id: user!.id,
        supplier_name: form.supplier_name,
        material_type: form.material_type,
        quantity: qty,
        unit: form.unit,
        unit_price: price,
        total_amount: qty * price,
        delivery_date: form.delivery_date || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycler_orders"] });
      toast.success("Order created successfully");
      setDialogOpen(false);
      setForm({ supplier_name: "", material_type: "", quantity: "", unit: "kg", unit_price: "", delivery_date: "", notes: "" });
    },
    onError: () => toast.error("Failed to create order"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("recycler_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycler_orders"] });
      toast.success("Status updated");
    },
  });

  const generateOrderPDF = (o: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Purchase Order / Contract", 20, 30);
    doc.setTextColor(0);

    doc.text(`Order Date: ${format(new Date(o.order_date), "MMM d, yyyy")}`, 20, 44);
    doc.text(`Buyer: ${profile?.full_name || "Recycler"}`, 20, 51);
    if (profile?.phone_number) doc.text(`Phone: ${profile.phone_number}`, 20, 58);
    doc.text(`Supplier: ${o.supplier_name}`, 20, 68);

    let y = 84;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text("Material", 22, y);
    doc.text("Quantity", 85, y);
    doc.text("Unit Price", 120, y);
    doc.text("Total (KES)", 155, y);
    doc.setTextColor(0);
    y += 10;
    doc.text(o.material_type, 22, y);
    doc.text(`${Number(o.quantity).toFixed(1)} ${o.unit}`, 85, y);
    doc.text(Number(o.unit_price).toFixed(2), 120, y);
    doc.text(Number(o.total_amount).toLocaleString(), 155, y);
    y += 14;
    doc.line(20, y - 3, 190, y - 3);
    doc.setFontSize(12);
    doc.text(`Total: KES ${Number(o.total_amount).toLocaleString()}`, 110, y + 5);
    if (o.delivery_date) {
      y += 16;
      doc.setFontSize(9);
      doc.text(`Expected Delivery: ${format(new Date(o.delivery_date), "MMM d, yyyy")}`, 20, y);
    }
    if (o.notes) {
      y += 10;
      doc.text(`Notes: ${o.notes}`, 20, y);
    }
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated order document — Duara Flow", 20, 280);
    doc.save(`order-${o.id.slice(0, 8)}.pdf`);
  };

  const active = orders?.filter((o) => o.status !== "cancelled" && o.status !== "delivered") || [];
  const completed = orders?.filter((o) => o.status === "delivered") || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{orders?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{active.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Orders & Contracts</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create New Order</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Supplier Name</Label><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="e.g. Kibera Aggregators" /></div>
                <div><Label>Material Type</Label><Input value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })} placeholder="e.g. PET Bottles" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="tonnes">tonnes</SelectItem>
                        <SelectItem value="pieces">pieces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Unit Price (KES)</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div><Label>Expected Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contract terms, special conditions..." rows={2} /></div>
                <Button className="w-full" onClick={() => createOrder.mutate()} disabled={!form.supplier_name || !form.material_type || !form.quantity || !form.unit_price || createOrder.isPending}>
                  {createOrder.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!orders?.length ? (
            <p className="text-sm text-muted-foreground">No orders yet. Create your first order above.</p>
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
                      {o.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: o.id, status: "confirmed" })} className="text-xs">Confirm</Button>
                      )}
                      {o.status === "confirmed" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })} className="text-xs">Delivered</Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => generateOrderPDF(o)} title="Download PDF">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Badge variant={s.variant} className="flex items-center gap-1">
                        <SIcon className="w-3 h-3" /> {s.label}
                      </Badge>
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
