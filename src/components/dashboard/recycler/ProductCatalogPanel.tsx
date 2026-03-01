import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Download, Edit2, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";

const ProductCatalogPanel = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quoteDialog, setQuoteDialog] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", material_source: "", stock_quantity: "", unit: "kg", price_per_unit: "" });
  const [quoteForm, setQuoteForm] = useState({ client_name: "", client_phone: "", quantity: "", notes: "" });

  const { data: products } = useQuery({
    queryKey: ["recycler_products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_products")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recycler_products").insert({
        user_id: user!.id,
        name: form.name,
        description: form.description || null,
        material_source: form.material_source || null,
        stock_quantity: Number(form.stock_quantity),
        unit: form.unit,
        price_per_unit: Number(form.price_per_unit),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycler_products"] });
      toast.success("Product added");
      setDialogOpen(false);
      setForm({ name: "", description: "", material_source: "", stock_quantity: "", unit: "kg", price_per_unit: "" });
    },
    onError: () => toast.error("Failed to add product"),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recycler_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycler_products"] });
      toast.success("Product removed");
    },
  });

  const generateInvoice = (product: any) => {
    const qty = Number(quoteForm.quantity) || 1;
    const total = qty * Number(product.price_per_unit);
    const doc = new jsPDF();
    const invNo = `INV-${Date.now().toString(36).toUpperCase()}`;
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Sales Invoice", 20, 30);
    doc.setTextColor(0);

    doc.text(`Invoice #: ${invNo}`, 20, 44);
    doc.text(`Date: ${today}`, 20, 51);
    doc.text(`Seller: ${profile?.full_name || "Recycler"}`, 20, 58);
    if (profile?.phone_number) doc.text(`Phone: ${profile.phone_number}`, 20, 65);
    doc.text(`Client: ${quoteForm.client_name || "—"}`, 20, 75);
    if (quoteForm.client_phone) doc.text(`Client Phone: ${quoteForm.client_phone}`, 20, 82);

    let y = 96;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text("Product", 22, y);
    doc.text("Quantity", 95, y);
    doc.text("Unit Price (KES)", 125, y);
    doc.text("Total (KES)", 165, y);
    doc.setTextColor(0);
    y += 10;
    doc.text(product.name, 22, y);
    doc.text(`${qty} ${product.unit}`, 95, y);
    doc.text(Number(product.price_per_unit).toFixed(2), 125, y);
    doc.text(total.toLocaleString(), 165, y);
    y += 14;
    doc.line(20, y - 3, 190, y - 3);
    doc.setFontSize(12);
    doc.text(`Total: KES ${total.toLocaleString()}`, 120, y + 5);
    if (quoteForm.notes) {
      y += 16;
      doc.setFontSize(9);
      doc.text(`Notes: ${quoteForm.notes}`, 20, y);
    }
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated invoice — Duara Flow", 20, 280);
    doc.save(`invoice-${invNo}.pdf`);
    toast.success("Invoice downloaded");
    setQuoteDialog(null);
    setQuoteForm({ client_name: "", client_phone: "", quantity: "", notes: "" });
  };

  const generateQuotation = (product: any) => {
    const qty = Number(quoteForm.quantity) || 1;
    const total = qty * Number(product.price_per_unit);
    const doc = new jsPDF();
    const qNo = `QT-${Date.now().toString(36).toUpperCase()}`;
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Quotation", 20, 30);
    doc.setTextColor(0);

    doc.text(`Quotation #: ${qNo}`, 20, 44);
    doc.text(`Date: ${today}`, 20, 51);
    doc.text(`From: ${profile?.full_name || "Recycler"}`, 20, 58);
    if (profile?.phone_number) doc.text(`Phone: ${profile.phone_number}`, 20, 65);
    doc.text(`To: ${quoteForm.client_name || "—"}`, 20, 75);
    if (quoteForm.client_phone) doc.text(`Client Phone: ${quoteForm.client_phone}`, 20, 82);

    let y = 96;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text("Product", 22, y);
    doc.text("Quantity", 95, y);
    doc.text("Unit Price (KES)", 125, y);
    doc.text("Total (KES)", 165, y);
    doc.setTextColor(0);
    y += 10;
    doc.text(product.name, 22, y);
    doc.text(`${qty} ${product.unit}`, 95, y);
    doc.text(Number(product.price_per_unit).toFixed(2), 125, y);
    doc.text(total.toLocaleString(), 165, y);
    y += 14;
    doc.line(20, y - 3, 190, y - 3);
    doc.setFontSize(12);
    doc.text(`Total: KES ${total.toLocaleString()}`, 120, y + 5);
    y += 16;
    doc.setFontSize(9);
    doc.text("This quotation is valid for 30 days from the date of issue.", 20, y);
    if (quoteForm.notes) {
      y += 8;
      doc.text(`Notes: ${quoteForm.notes}`, 20, y);
    }
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated quotation — Duara Flow", 20, 280);
    doc.save(`quotation-${qNo}.pdf`);
    toast.success("Quotation downloaded");
    setQuoteDialog(null);
    setQuoteForm({ client_name: "", client_phone: "", quantity: "", notes: "" });
  };

  const totalStock = products?.reduce((s, p) => s + Number(p.stock_quantity), 0) || 0;
  const totalValue = products?.reduce((s, p) => s + Number(p.stock_quantity) * Number(p.price_per_unit), 0) || 0;

  const selectedProduct = products?.find((p) => p.id === quoteDialog);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingBag className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{products?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalStock.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Stock Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Product Catalog & Pricing</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Product Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Recycled PET Flakes" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." rows={2} /></div>
                <div><Label>Material Source</Label><Input value={form.material_source} onChange={(e) => setForm({ ...form, material_source: e.target.value })} placeholder="e.g. Post-consumer PET" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Stock Quantity</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="tonnes">tonnes</SelectItem>
                        <SelectItem value="pieces">pieces</SelectItem>
                        <SelectItem value="bags">bags</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Price per Unit (KES)</Label><Input type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} /></div>
                <Button className="w-full" onClick={() => createProduct.mutate()} disabled={!form.name || !form.stock_quantity || !form.price_per_unit || createProduct.isPending}>
                  {createProduct.isPending ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!products?.length ? (
            <p className="text-sm text-muted-foreground">No products yet. Add your first product above.</p>
          ) : (
            <div className="divide-y divide-border">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Stock: {Number(p.stock_quantity).toFixed(0)} {p.unit}</span>
                        <span className="text-xs font-semibold text-foreground">KES {Number(p.price_per_unit).toFixed(2)}/{p.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => { setQuoteDialog(p.id); setQuoteForm({ client_name: "", client_phone: "", quantity: "", notes: "" }); }}>
                      <Download className="w-3 h-3 mr-1" /> Invoice
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)} title="Remove">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice / Quotation Dialog */}
      <Dialog open={!!quoteDialog} onOpenChange={(open) => { if (!open) setQuoteDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate Invoice / Quotation</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Product: <strong className="text-foreground">{selectedProduct.name}</strong> — KES {Number(selectedProduct.price_per_unit).toFixed(2)}/{selectedProduct.unit}</p>
              <div><Label>Client Name</Label><Input value={quoteForm.client_name} onChange={(e) => setQuoteForm({ ...quoteForm, client_name: e.target.value })} placeholder="Client / company name" /></div>
              <div><Label>Client Phone</Label><Input value={quoteForm.client_phone} onChange={(e) => setQuoteForm({ ...quoteForm, client_phone: e.target.value })} placeholder="0712 345 678" /></div>
              <div><Label>Quantity ({selectedProduct.unit})</Label><Input type="number" value={quoteForm.quantity} onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} rows={2} /></div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => generateInvoice(selectedProduct)} disabled={!quoteForm.client_name || !quoteForm.quantity}>
                  <Download className="w-4 h-4 mr-1" /> Invoice
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => generateQuotation(selectedProduct)} disabled={!quoteForm.client_name || !quoteForm.quantity}>
                  <Download className="w-4 h-4 mr-1" /> Quotation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCatalogPanel;
