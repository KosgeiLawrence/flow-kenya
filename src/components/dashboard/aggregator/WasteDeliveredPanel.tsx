import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Truck, CheckCircle2, Clock, Package, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_phone: string | null;
  supplier_role: string | null;
  material_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  status: string;
  notes: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  grn_number: string | null;
  delivered_quantity: number | null;
  delivery_notes: string | null;
  created_at: string;
  user_id: string;
};

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "PO Sent", variant: "secondary" },
  delivered: { label: "Delivered", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const WasteDeliveredPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  const [form, setForm] = useState({
    supplier_name: "", supplier_phone: "", material_type: "", quantity: "",
    unit: "kg", unit_price: "", expected_delivery_date: "", notes: "",
  });

  const [grnForm, setGrnForm] = useState({ delivered_quantity: "", delivery_notes: "" });

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["aggregator_purchase_orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aggregator_purchase_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!user,
  });

  const createPO = useMutation({
    mutationFn: async () => {
      const qty = Number(form.quantity);
      const price = Number(form.unit_price);
      const { error } = await supabase.from("aggregator_purchase_orders").insert({
        user_id: user!.id,
        supplier_name: form.supplier_name,
        supplier_phone: form.supplier_phone || null,
        material_type: form.material_type,
        quantity: qty,
        unit: form.unit,
        unit_price: price,
        total_amount: qty * price,
        expected_delivery_date: form.expected_delivery_date || null,
        notes: form.notes || null,
        status: "sent",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_purchase_orders"] });
      setCreateOpen(false);
      setForm({ supplier_name: "", supplier_phone: "", material_type: "", quantity: "", unit: "kg", unit_price: "", expected_delivery_date: "", notes: "" });
      toast.success("Purchase Order created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const receiveGoods = useMutation({
    mutationFn: async () => {
      if (!selectedPO) return;
      const deliveredQty = Number(grnForm.delivered_quantity) || selectedPO.quantity;
      const grnNumber = "GRN-" + crypto.randomUUID().slice(0, 8);

      // Update PO status to delivered
      const { error: poErr } = await supabase.from("aggregator_purchase_orders").update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        grn_number: grnNumber,
        delivered_quantity: deliveredQty,
        delivery_notes: grnForm.delivery_notes || null,
      }).eq("id", selectedPO.id);
      if (poErr) throw poErr;

      // Find matching material_type_id
      const mt = materialTypes?.find(m => m.name === selectedPO.material_type);

      // Add to inventory (collections)
      if (mt) {
        const { error: colErr } = await supabase.from("collections").insert({
          user_id: user!.id,
          material_type_id: mt.id,
          quantity: deliveredQty,
          location_name: `PO: ${selectedPO.po_number} from ${selectedPO.supplier_name}`,
          notes: `GRN: ${grnNumber}`,
        });
        if (colErr) throw colErr;
      }

      // Log expense in financial_transactions
      const totalCost = deliveredQty * selectedPO.unit_price;
      const { error: finErr } = await supabase.from("financial_transactions").insert({
        user_id: user!.id,
        type: "expense",
        amount: totalCost,
        description: `Purchase: ${deliveredQty} ${selectedPO.unit} ${selectedPO.material_type} from ${selectedPO.supplier_name} (${grnNumber})`,
        payment_method: "cash",
        reference_number: grnNumber,
      });
      if (finErr) throw finErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["aggregator_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      setGrnOpen(false);
      setSelectedPO(null);
      setGrnForm({ delivered_quantity: "", delivery_notes: "" });
      toast.success("Goods received, inventory updated & expense logged");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pendingOrders = orders?.filter(o => o.status === "sent") || [];
  const deliveredOrders = orders?.filter(o => o.status === "delivered") || [];

  const generatePODocument = (po: PurchaseOrder) => {
    const content = [
      `PURCHASE ORDER`,
      `PO Number: ${po.po_number}`,
      `Date: ${format(new Date(po.order_date), "MMM d, yyyy")}`,
      ``,
      `Supplier: ${po.supplier_name}`,
      po.supplier_phone ? `Phone: ${po.supplier_phone}` : "",
      ``,
      `Material: ${po.material_type}`,
      `Quantity: ${po.quantity} ${po.unit}`,
      `Unit Price: KES ${Number(po.unit_price).toLocaleString()}`,
      `Total Amount: KES ${Number(po.total_amount).toLocaleString()}`,
      po.expected_delivery_date ? `Expected Delivery: ${format(new Date(po.expected_delivery_date), "MMM d, yyyy")}` : "",
      po.notes ? `\nNotes: ${po.notes}` : "",
    ].filter(Boolean).join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${po.po_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Purchase Order downloaded");
  };

  const generateGRNDocument = (po: PurchaseOrder) => {
    const content = [
      `GOODS RECEIVED NOTE`,
      `GRN Number: ${po.grn_number}`,
      `PO Number: ${po.po_number}`,
      `Date Received: ${po.delivered_at ? format(new Date(po.delivered_at), "MMM d, yyyy HH:mm") : "N/A"}`,
      ``,
      `Supplier: ${po.supplier_name}`,
      `Material: ${po.material_type}`,
      `Ordered Qty: ${po.quantity} ${po.unit}`,
      `Delivered Qty: ${po.delivered_quantity || po.quantity} ${po.unit}`,
      `Unit Price: KES ${Number(po.unit_price).toLocaleString()}`,
      `Total Cost: KES ${(Number(po.delivered_quantity || po.quantity) * Number(po.unit_price)).toLocaleString()}`,
      po.delivery_notes ? `\nDelivery Notes: ${po.delivery_notes}` : "",
    ].filter(Boolean).join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${po.grn_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GRN downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{orders?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total POs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="w-7 h-7 text-amber-500" />
            <div>
              <p className="text-xl font-bold text-foreground">{pendingOrders.length}</p>
              <p className="text-xs text-muted-foreground">Awaiting Delivery</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{deliveredOrders.length}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {deliveredOrders.reduce((s, o) => s + Number(o.delivered_quantity || o.quantity), 0).toFixed(0)} kg
              </p>
              <p className="text-xs text-muted-foreground">Total Received</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create PO */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button><Plus className="w-4 h-4 mr-1" /> Create Purchase Order</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Supplier name *" value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} />
            <Input placeholder="Supplier phone" value={form.supplier_phone} onChange={e => setForm({ ...form, supplier_phone: e.target.value })} />
            <Select value={form.material_type} onValueChange={v => setForm({ ...form, material_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select material type *" /></SelectTrigger>
              <SelectContent>
                {materialTypes?.map(mt => (
                  <SelectItem key={mt.id} value={mt.name}>{mt.icon || "♻️"} {mt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Quantity *" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              <Input type="number" placeholder="Price per unit (KES) *" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
            </div>
            {form.quantity && form.unit_price && (
              <p className="text-sm font-medium text-foreground">Total: KES {(Number(form.quantity) * Number(form.unit_price)).toLocaleString()}</p>
            )}
            <Input type="date" placeholder="Expected delivery date" value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} />
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button className="w-full" onClick={() => createPO.mutate()} disabled={!form.supplier_name || !form.material_type || !form.quantity || !form.unit_price || createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create & Send PO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={grnOpen} onOpenChange={(open) => { setGrnOpen(open); if (!open) setSelectedPO(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive Goods — GRN</DialogTitle></DialogHeader>
          {selectedPO && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-foreground">PO: {selectedPO.po_number}</p>
                <p className="text-muted-foreground">Supplier: {selectedPO.supplier_name}</p>
                <p className="text-muted-foreground">Material: {selectedPO.material_type} — {selectedPO.quantity} {selectedPO.unit}</p>
                <p className="text-muted-foreground">Expected cost: KES {Number(selectedPO.total_amount).toLocaleString()}</p>
              </div>
              <Input type="number" placeholder={`Delivered quantity (default: ${selectedPO.quantity} ${selectedPO.unit})`} value={grnForm.delivered_quantity} onChange={e => setGrnForm({ ...grnForm, delivered_quantity: e.target.value })} />
              <Textarea placeholder="Delivery notes (condition, discrepancies...)" value={grnForm.delivery_notes} onChange={e => setGrnForm({ ...grnForm, delivery_notes: e.target.value })} />
              <Button className="w-full" onClick={() => receiveGoods.mutate()} disabled={receiveGoods.isPending}>
                {receiveGoods.isPending ? "Processing..." : "Confirm Receipt & Generate GRN"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View PO/GRN Dialog */}
      <Dialog open={!!viewPO} onOpenChange={(open) => { if (!open) setViewPO(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewPO?.grn_number ? "Goods Received Note" : "Purchase Order"}</DialogTitle></DialogHeader>
          {viewPO && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1.5">
                <p className="font-bold text-foreground">{viewPO.grn_number ? `GRN: ${viewPO.grn_number}` : `PO: ${viewPO.po_number}`}</p>
                <p className="text-muted-foreground">Date: {format(new Date(viewPO.order_date), "MMM d, yyyy")}</p>
                <p className="text-muted-foreground">Supplier: {viewPO.supplier_name}</p>
                <p className="text-muted-foreground">Material: {viewPO.material_type}</p>
                <p className="text-muted-foreground">Ordered: {viewPO.quantity} {viewPO.unit} @ KES {Number(viewPO.unit_price).toLocaleString()}</p>
                <p className="font-medium text-foreground">Total: KES {Number(viewPO.total_amount).toLocaleString()}</p>
                {viewPO.delivered_quantity && <p className="text-muted-foreground">Delivered: {viewPO.delivered_quantity} {viewPO.unit}</p>}
                {viewPO.delivered_at && <p className="text-muted-foreground">Received: {format(new Date(viewPO.delivered_at), "MMM d, yyyy HH:mm")}</p>}
                {viewPO.delivery_notes && <p className="text-muted-foreground">Notes: {viewPO.delivery_notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => generatePODocument(viewPO)}>
                  <Download className="w-4 h-4 mr-1" /> Download PO
                </Button>
                {viewPO.grn_number && (
                  <Button variant="outline" className="flex-1" onClick={() => generateGRNDocument(viewPO)}>
                    <Download className="w-4 h-4 mr-1" /> Download GRN
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Deliveries */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Awaiting Delivery</CardTitle></CardHeader>
        <CardContent>
          {!pendingOrders.length ? (
            <p className="text-sm text-muted-foreground">No pending deliveries.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingOrders.map(po => (
                <div key={po.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{po.material_type} — {po.quantity} {po.unit}</p>
                    <p className="text-xs text-muted-foreground">{po.supplier_name} · {po.po_number}</p>
                    {po.expected_delivery_date && <p className="text-xs text-muted-foreground">Expected: {format(new Date(po.expected_delivery_date), "MMM d")}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setViewPO(po); }}>View</Button>
                    <Button size="sm" onClick={() => { setSelectedPO(po); setGrnForm({ delivered_quantity: String(po.quantity), delivery_notes: "" }); setGrnOpen(true); }}>
                      <Truck className="w-3.5 h-3.5 mr-1" /> Receive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivered / Completed */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Delivered (GRN Issued)</CardTitle></CardHeader>
        <CardContent>
          {!deliveredOrders.length ? (
            <p className="text-sm text-muted-foreground">No deliveries yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {deliveredOrders.slice(0, 15).map(po => (
                <div key={po.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{po.material_type} — {po.delivered_quantity || po.quantity} {po.unit}</p>
                    <p className="text-xs text-muted-foreground">{po.supplier_name} · {po.grn_number}</p>
                    <p className="text-xs text-muted-foreground">{po.delivered_at ? format(new Date(po.delivered_at), "MMM d, yyyy") : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="default">KES {(Number(po.delivered_quantity || po.quantity) * Number(po.unit_price)).toLocaleString()}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setViewPO(po)}>View</Button>
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

export default WasteDeliveredPanel;
