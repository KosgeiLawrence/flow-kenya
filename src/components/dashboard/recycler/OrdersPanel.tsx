import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Plus, FileText, CheckCircle2, Clock, XCircle, Truck, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawTotalLine, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const statusMap: Record<string, { icon: React.ElementType; variant: "default" | "secondary" | "destructive"; label: string }> = {
  pending: { icon: Clock, variant: "secondary", label: "Pending" },
  confirmed: { icon: CheckCircle2, variant: "default", label: "Confirmed" },
  delivered: { icon: Truck, variant: "default", label: "Delivered" },
  cancelled: { icon: XCircle, variant: "destructive", label: "Cancelled" },
};

const OrdersPanel = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ supplier_name: "", material_type: "", quantity: "", unit: "kg", unit_price: "", delivery_date: "", notes: "" });
  const [supplierMode, setSupplierMode] = useState<"existing" | "manual">("existing");

  // Fetch user's suppliers
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("user_id", user!.id).order("supplier_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("recycler_orders").update({ status }).eq("id", id); if (error) throw error; return { id, status }; },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recycler_orders"] });
      if (variables.status === "delivered") {
        queryClient.invalidateQueries({ queryKey: ["recycler_delivered_orders"] });
        queryClient.invalidateQueries({ queryKey: ["recycler_inventory"] });

        // Auto-log expense in financial_transactions
        const order = orders?.find(o => o.id === variables.id);
        if (order && user) {
          try {
            const { data: expCats } = await supabase.from("financial_categories").select("id").eq("name", "Material Purchases").eq("is_system", true).limit(1);
            let categoryId = expCats?.[0]?.id || null;
            if (!categoryId) {
              const { data: anyCats } = await supabase.from("financial_categories").select("id").eq("type", "expense").eq("is_system", true).limit(1);
              categoryId = anyCats?.[0]?.id || null;
            }
            await supabase.from("financial_transactions").insert({
              user_id: user.id,
              type: "expense",
              amount: Number(order.total_amount) || 0,
              description: `Order delivered: ${order.quantity} ${order.unit} of ${order.material_type} from ${order.supplier_name}`,
              category_id: categoryId,
              payment_method: "cash",
              reference_number: order.id.slice(0, 8).toUpperCase(),
              transaction_date: new Date().toISOString().split("T")[0],
            });
          } catch (e) {
            console.error("Failed to log expense:", e);
          }
          queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
        }
      }
      toast.success("Status updated");
    },
  });

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const generateOrderPDF = async (o: any) => {
    const doc = new jsPDF();
    const pdfOrg = await getOrgPdfInfo();
    const entityName = orgInfo?.orgName || profile?.full_name || "Recycler";

    let y = addCleanHeader(doc, "Purchase Order / Contract", undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: "Order Date", value: format(new Date(o.order_date), "MMM d, yyyy") },
      { label: "Buyer", value: entityName },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
      ...(orgInfo?.contactEmail ? [{ label: "Email", value: orgInfo.contactEmail }] : []),
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

  const generateGRN = async (o: any) => {
    const doc = new jsPDF();
    const pdfOrg = await getOrgPdfInfo();
    const entityName = orgInfo?.orgName || profile?.full_name || "Recycler";

    let y = addCleanHeader(doc, "Goods Received Note (GRN)", undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: "GRN Date", value: format(new Date(o.updated_at || o.order_date), "MMM d, yyyy") },
      { label: "Order Date", value: format(new Date(o.order_date), "MMM d, yyyy") },
      { label: "Received By", value: entityName },
      ...(orgInfo?.physicalAddress ? [{ label: "Address", value: orgInfo.physicalAddress }] : []),
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
      ...(orgInfo?.contactEmail ? [{ label: "Email", value: orgInfo.contactEmail }] : []),
      { label: "Supplier", value: o.supplier_name },
    ], y);

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Qty Received", x: 80 }, { label: "Unit", x: 110 }, { label: "Unit Price", x: 135 }, { label: "Total (KES)", x: 165 },
    ], y, 180);

    drawTableRow(doc, y, 0, 180);
    doc.setFontSize(8);
    doc.text(o.material_type, 17, y);
    doc.text(Number(o.quantity).toFixed(1), 80, y);
    doc.text(o.unit, 110, y);
    doc.text(Number(o.unit_price).toFixed(2), 135, y);
    doc.text(Number(o.total_amount).toLocaleString(), 165, y);
    y += 10;

    drawTotalLine(doc, `Total Value: KES ${Number(o.total_amount).toLocaleString()}`, y);

    if (o.delivery_date) { y += 10; doc.setFontSize(9); doc.text(`Delivery Date: ${format(new Date(o.delivery_date), "MMM d, yyyy")}`, 15, y); }
    if (o.notes) { y += 8; doc.setFontSize(9); doc.text(`Notes: ${o.notes}`, 15, y); }

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Condition of Goods: ___________________", 15, y);
    y += 12;
    doc.text("Received By (Sign): ___________________          Date: _______________", 15, y);
    y += 12;
    doc.text("Delivered By (Sign): ___________________          Date: _______________", 15, y);

    finalizeCleanPdf(doc);
    doc.save(`grn-${o.id.slice(0, 8)}.pdf`);
  };

  const active = orders?.filter((o) => o.status !== "cancelled" && o.status !== "delivered") || [];
  const completed = orders?.filter((o) => o.status === "delivered") || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4"><ClipboardList className="w-7 h-7 text-primary" /><div><p className="text-xl font-bold text-foreground">{orders?.length || 0}</p><p className="text-xs text-muted-foreground">Total Orders</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4"><Clock className="w-7 h-7 text-secondary" /><div><p className="text-xl font-bold text-foreground">{active.length}</p><p className="text-xs text-muted-foreground">Active</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="w-7 h-7 text-primary" /><div><p className="text-xl font-bold text-foreground">{completed.length}</p><p className="text-xs text-muted-foreground">Completed</p></div></CardContent></Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Orders & Contracts</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Order</Button></DialogTrigger>
            <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-4">
              <DialogHeader><DialogTitle className="text-base">Create New Order</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Supplier</Label>
                  <Tabs value={supplierMode} onValueChange={(v) => setSupplierMode(v as "existing" | "manual")} className="mt-1">
                    <TabsList className="grid w-full grid-cols-2 h-7">
                      <TabsTrigger value="existing" className="text-[11px]"><Users className="w-3 h-3 mr-1" />From List</TabsTrigger>
                      <TabsTrigger value="manual" className="text-[11px]">New Supplier</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {supplierMode === "existing" ? (
                    <Select value={form.supplier_name} onValueChange={(v) => setForm({ ...form, supplier_name: v })}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((s) => (
                          <SelectItem key={s.id} value={s.supplier_name}>{s.supplier_name}{s.location ? ` · ${s.location}` : ""}</SelectItem>
                        ))}
                        {(!suppliers || suppliers.length === 0) && <SelectItem value="_none" disabled>No suppliers yet</SelectItem>}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input className="h-8 text-sm mt-1" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="e.g. Kibera Aggregators" />
                  )}
                </div>
                <div><Label className="text-xs">Material Type</Label><Input className="h-8 text-sm" value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })} placeholder="e.g. PET Bottles" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Quantity</Label><Input className="h-8 text-sm" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div><Label className="text-xs">Unit</Label><Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="tonnes">tonnes</SelectItem><SelectItem value="pieces">pieces</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label className="text-xs">Unit Price (KES)</Label><Input className="h-8 text-sm" type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div><Label className="text-xs">Delivery Date</Label><Input className="h-8 text-sm" type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
                <div><Label className="text-xs">Notes</Label><Textarea className="text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contract terms..." rows={1} /></div>
                <Button className="w-full h-8 text-sm" onClick={() => createOrder.mutate()} disabled={!form.supplier_name || !form.material_type || !form.quantity || !form.unit_price || createOrder.isPending}>
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
                      {o.status === "delivered" && <Button variant="ghost" size="sm" onClick={() => generateGRN(o)} className="text-xs" title="Download Goods Received Note"><FileText className="w-3 h-3 mr-1" />GRN</Button>}
                      <Button variant="ghost" size="icon" onClick={() => generateOrderPDF(o)} title="Download Order PDF"><Download className="w-4 h-4" /></Button>
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
