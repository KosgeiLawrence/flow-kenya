import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Download, Trash2, ShoppingBag, ShoppingCart, FileText, Receipt, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawVatTotalBlock, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo } from "@/lib/pdfBranding";
import VatOptions, { DEFAULT_VAT, type VatConfig } from "@/components/dashboard/shared/VatOptions";

type SaleStep = "details" | "quotation_sent" | "invoice_sent" | "receipt_done";

interface SaleState {
  productId: string;
  step: SaleStep;
  client_name: string;
  client_email: string;
  client_phone: string;
  quantity: string;
  notes: string;
  refNo: string;
}

const initialSale: SaleState = {
  productId: "",
  step: "details",
  client_name: "",
  client_email: "",
  client_phone: "",
  quantity: "",
  notes: "",
  refNo: "",
};

const ProductCatalogPanel = () => {
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleDialog, setSaleDialog] = useState(false);
  const [sale, setSale] = useState<SaleState>(initialSale);
  const [pendingSales, setPendingSales] = useState<(SaleState & { vat: VatConfig })[]>([]);
  const [form, setForm] = useState({ name: "", description: "", material_source: "", stock_quantity: "", unit: "kg", price_per_unit: "" });
  const [vat, setVat] = useState<VatConfig>(DEFAULT_VAT);

  const { data: products } = useQuery({
    queryKey: ["recycler_products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recycler_products").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recycler_products").insert({
        user_id: user!.id, name: form.name, description: form.description || null, material_source: form.material_source || null,
        stock_quantity: Number(form.stock_quantity), unit: form.unit, price_per_unit: Number(form.price_per_unit),
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recycler_products"] }); toast.success("Product added"); setDialogOpen(false); setForm({ name: "", description: "", material_source: "", stock_quantity: "", unit: "kg", price_per_unit: "" }); },
    onError: () => toast.error("Failed to add product"),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("recycler_products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recycler_products"] }); toast.success("Product removed"); },
  });

  const selectedProduct = products?.find((p) => p.id === sale.productId);

  const openSale = (productId: string) => {
    const ref = `SL-${Date.now().toString(36).toUpperCase()}`;
    setSale({ ...initialSale, productId, refNo: ref });
    setVat(DEFAULT_VAT);
    setSaleDialog(true);
  };

  const resumeSale = (pending: SaleState & { vat: VatConfig }) => {
    setSale({ productId: pending.productId, step: pending.step, client_name: pending.client_name, client_email: pending.client_email, client_phone: pending.client_phone, quantity: pending.quantity, notes: pending.notes, refNo: pending.refNo });
    setVat(pending.vat);
    setSaleDialog(true);
  };

  const closeSale = () => {
    // Save to pending if sale is in progress (not done, and has client info)
    if (sale.step !== "details" && sale.step !== "receipt_done" && sale.client_name) {
      setPendingSales((prev) => {
        const filtered = prev.filter((s) => s.refNo !== sale.refNo);
        return [...filtered, { ...sale, vat }];
      });
      toast.info("Sale saved. You can resume from Pending Sales.");
    }
    setSaleDialog(false);
    setSale(initialSale);
    setVat(DEFAULT_VAT);
  };

  const removePending = (refNo: string) => {
    setPendingSales((prev) => prev.filter((s) => s.refNo !== refNo));
  };

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const calcSubtotal = () => {
    if (!selectedProduct) return 0;
    return (Number(sale.quantity) || 1) * Number(selectedProduct.price_per_unit);
  };

  const calcVatAmount = () => {
    if (!vat.includeVat) return 0;
    return calcSubtotal() * (vat.vatPercent / 100);
  };

  const calcTotal = () => calcSubtotal() + calcVatAmount();

  const generatePdf = async (docType: "Quotation" | "Invoice" | "Receipt") => {
    if (!selectedProduct) return;
    const qty = Number(sale.quantity) || 1;
    const subtotal = calcSubtotal();
    const doc = new jsPDF();
    const pdfOrg = await getOrgPdfInfo();
    const prefix = docType === "Quotation" ? "QT" : docType === "Invoice" ? "INV" : "RCT";
    const docNo = `${prefix}-${sale.refNo.replace("SL-", "")}`;

    let y = addCleanHeader(doc, docType, undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: `${docType} #`, value: docNo },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Ref", value: sale.refNo },
      { label: docType === "Quotation" ? "From" : "Seller", value: orgInfo?.orgName || profile?.full_name || "Recycler" },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
      { label: docType === "Quotation" ? "To" : "Client", value: sale.client_name || "—" },
      ...(sale.client_phone ? [{ label: "Client Phone", value: sale.client_phone }] : []),
      ...(sale.client_email ? [{ label: "Client Email", value: sale.client_email }] : []),
    ], y);

    y = drawTableHeader(doc, [
      { label: "Product", x: 17 }, { label: "Qty", x: 95 }, { label: "Unit Price (KES)", x: 120 }, { label: "Total (KES)", x: 165 },
    ], y, 180);

    drawTableRow(doc, y, 0, 180);
    doc.setFontSize(8);
    doc.text(selectedProduct.name, 17, y);
    doc.text(`${qty} ${selectedProduct.unit}`, 95, y);
    doc.text(Number(selectedProduct.price_per_unit).toFixed(2), 120, y);
    doc.text(subtotal.toLocaleString(), 165, y);
    y += 10;

    y = drawVatTotalBlock(doc, subtotal, vat.vatPercent, vat.includeVat, y);

    if (docType === "Quotation") {
      doc.setFontSize(9);
      doc.text("This quotation is valid for 30 days from the date of issue.", 15, y);
      y += 6;
    }
    if (docType === "Receipt") {
      doc.setFontSize(9);
      doc.setTextColor(34, 139, 34);
      doc.text("PAID IN FULL", 15, y);
      doc.setTextColor(0);
      y += 6;
    }
    if (sale.notes) { doc.setFontSize(9); doc.text(`Notes: ${sale.notes}`, 15, y); }

    finalizeCleanPdf(doc);
    doc.save(`${docType.toLowerCase()}-${docNo}.pdf`);
    toast.success(`${docType} downloaded`);
  };

  // Step handlers
  const handleSendQuotation = async () => {
    await generatePdf("Quotation");
    setSale((s) => ({ ...s, step: "quotation_sent" }));
  };

  const handleClientAccepts = async () => {
    await generatePdf("Invoice");
    setSale((s) => ({ ...s, step: "invoice_sent" }));
  };

  const handleGenerateReceipt = async () => {
    if (!selectedProduct || !user) return;
    const qty = Number(sale.quantity) || 1;
    const total = calcTotal();

    // Generate receipt PDF
    await generatePdf("Receipt");

    // Deduct stock
    const newStock = Math.max(0, Number(selectedProduct.stock_quantity) - qty);
    await supabase.from("recycler_products").update({ stock_quantity: newStock }).eq("id", selectedProduct.id);

    // Log as income in financial_transactions
    const { data: incomeCats } = await supabase.from("financial_categories").select("id").eq("name", "Plastic Sales").eq("is_system", true).limit(1);
    const categoryId = incomeCats?.[0]?.id || null;

    await supabase.from("financial_transactions").insert({
      user_id: user.id,
      type: "income",
      amount: total,
      description: `Sale: ${qty} ${selectedProduct.unit} of ${selectedProduct.name} to ${sale.client_name}`,
      category_id: categoryId,
      payment_method: "cash",
      reference_number: sale.refNo,
      transaction_date: new Date().toISOString().split("T")[0],
    });

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ["recycler_products"] });
    queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });

    setSale((s) => ({ ...s, step: "receipt_done" }));
    toast.success("Sale completed! Stock updated & income recorded.");
  };

  const totalStock = products?.reduce((s, p) => s + Number(p.stock_quantity), 0) || 0;
  const totalValue = products?.reduce((s, p) => s + Number(p.stock_quantity) * Number(p.price_per_unit), 0) || 0;

  const stepLabels: Record<SaleStep, string> = {
    details: "Client & Quantity",
    quotation_sent: "Quotation Sent",
    invoice_sent: "Invoice Sent",
    receipt_done: "Sale Complete",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingBag className="w-7 h-7 text-primary" />
            <div><p className="text-xl font-bold text-foreground">{products?.length || 0}</p><p className="text-xs text-muted-foreground">Products</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-accent" />
            <div><p className="text-xl font-bold text-foreground">{totalStock.toFixed(0)}</p><p className="text-xs text-muted-foreground">Total Stock</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-primary" />
            <div><p className="text-xl font-bold text-foreground">KES {totalValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Stock Value</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Product Catalog & Pricing</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Product</Button></DialogTrigger>
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
                        <SelectItem value="kg">kg</SelectItem><SelectItem value="tonnes">tonnes</SelectItem>
                        <SelectItem value="pieces">pieces</SelectItem><SelectItem value="bags">bags</SelectItem>
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
                    <Button size="sm" onClick={() => openSale(p.id)} disabled={Number(p.stock_quantity) <= 0}>
                      <ShoppingCart className="w-3 h-3 mr-1" /> Sell
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

      {/* Sales Flow Dialog */}
      <Dialog open={saleDialog} onOpenChange={(open) => { if (!open) closeSale(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Sell Product
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Progress Steps */}
              <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
                {(["details", "quotation_sent", "invoice_sent", "receipt_done"] as SaleStep[]).map((step, i) => {
                  const steps: SaleStep[] = ["details", "quotation_sent", "invoice_sent", "receipt_done"];
                  const currentIdx = steps.indexOf(sale.step);
                  const stepIdx = i;
                  const isDone = stepIdx < currentIdx;
                  const isCurrent = stepIdx === currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isDone ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground font-medium">{stepLabels[sale.step]}</p>

              {/* Product info */}
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">KES {Number(selectedProduct.price_per_unit).toFixed(2)}/{selectedProduct.unit} • Stock: {Number(selectedProduct.stock_quantity).toFixed(0)} {selectedProduct.unit}</p>
                </CardContent>
              </Card>

              {/* Step 1: Client Details */}
              {sale.step === "details" && (
                <div className="space-y-3">
                  <div><Label>Client Name *</Label><Input value={sale.client_name} onChange={(e) => setSale({ ...sale, client_name: e.target.value })} placeholder="Client / company name" /></div>
                  <div><Label>Client Phone</Label><Input value={sale.client_phone} onChange={(e) => setSale({ ...sale, client_phone: e.target.value })} placeholder="0712 345 678" /></div>
                  <div><Label>Client Email</Label><Input type="email" value={sale.client_email} onChange={(e) => setSale({ ...sale, client_email: e.target.value })} placeholder="client@email.com" /></div>
                  <div><Label>Quantity ({selectedProduct.unit}) *</Label><Input type="number" value={sale.quantity} onChange={(e) => setSale({ ...sale, quantity: e.target.value })} max={Number(selectedProduct.stock_quantity)} /></div>
                  <div><Label>Notes</Label><Textarea value={sale.notes} onChange={(e) => setSale({ ...sale, notes: e.target.value })} rows={2} /></div>
                  <VatOptions value={vat} onChange={setVat} />

                  {sale.quantity && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">KES {calcSubtotal().toLocaleString()}</span></div>
                        {vat.includeVat && <div className="flex justify-between"><span className="text-muted-foreground">VAT ({vat.vatPercent}%)</span><span className="text-foreground">KES {calcVatAmount().toLocaleString()}</span></div>}
                        <div className="flex justify-between font-bold border-t border-border mt-1 pt-1"><span>Total</span><span className="text-primary">KES {calcTotal().toLocaleString()}</span></div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleSendQuotation} disabled={!sale.client_name || !sale.quantity || Number(sale.quantity) <= 0}>
                      <FileText className="w-4 h-4 mr-1" /> Generate Quotation
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleSkipToInvoice} disabled={!sale.client_name || !sale.quantity || Number(sale.quantity) <= 0}>
                      <ArrowRight className="w-4 h-4 mr-1" /> Skip to Invoice
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Quotation Sent - Client accepts? */}
              {sale.step === "quotation_sent" && (
                <div className="space-y-3">
                  <Card className="bg-accent/10 border-accent/30">
                    <CardContent className="p-4 text-center space-y-2">
                      <FileText className="w-8 h-8 text-accent mx-auto" />
                      <p className="text-sm font-medium text-foreground">Quotation sent to {sale.client_name}</p>
                      <p className="text-xs text-muted-foreground">KES {calcTotal().toLocaleString()} for {sale.quantity} {selectedProduct.unit}</p>
                    </CardContent>
                  </Card>
                  <p className="text-sm text-center text-muted-foreground">Did the client accept the quotation?</p>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleClientAccepts}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Yes, Generate Invoice
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => { generatePdf("Quotation"); toast.info("Revised quotation downloaded"); }}>
                      Resend Quotation
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full text-destructive" onClick={closeSale}>Cancel Sale</Button>
                </div>
              )}

              {/* Step 3: Invoice Sent - Generate Receipt */}
              {sale.step === "invoice_sent" && (
                <div className="space-y-3">
                  <Card className="bg-primary/10 border-primary/30">
                    <CardContent className="p-4 text-center space-y-2">
                      <FileText className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm font-medium text-foreground">Invoice sent to {sale.client_name}</p>
                      <p className="text-xs text-muted-foreground">Amount: KES {calcTotal().toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <p className="text-sm text-center text-muted-foreground">Has the client paid?</p>
                  <Button className="w-full" onClick={handleGenerateReceipt}>
                    <Receipt className="w-4 h-4 mr-1" /> Confirm Payment & Generate Receipt
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { generatePdf("Invoice"); toast.info("Invoice re-downloaded"); }}>
                    Re-download Invoice
                  </Button>
                  <Button variant="ghost" className="w-full text-destructive" onClick={closeSale}>Cancel Sale</Button>
                </div>
              )}

              {/* Step 4: Done */}
              {sale.step === "receipt_done" && (
                <div className="space-y-3">
                  <Card className="bg-primary/10 border-primary/30">
                    <CardContent className="p-6 text-center space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                      <p className="text-lg font-bold text-foreground">Sale Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.quantity} {selectedProduct.unit} of {selectedProduct.name} sold to {sale.client_name} for KES {calcTotal().toLocaleString()}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>✅ Stock deducted automatically</p>
                        <p>✅ Income recorded in Business Insights</p>
                        <p>✅ Receipt generated</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Button className="w-full" onClick={closeSale}>Done</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCatalogPanel;
