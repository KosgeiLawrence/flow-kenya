import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, FileText, Receipt, CheckCircle2, ArrowRight, Users, Search, History, Trash2, Download, Package, Plus } from "lucide-react";
import MaterialIcon from "@/components/dashboard/shared/MaterialIcon";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawVatTotalBlock, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo } from "@/lib/pdfBranding";
import VatOptions, { DEFAULT_VAT, type VatConfig } from "@/components/dashboard/shared/VatOptions";
import { useTranslation } from "react-i18next";

type SaleStep = "details" | "quotation_sent" | "invoice_sent" | "receipt_done";

interface SaleState {
  materialTypeId: string;
  step: SaleStep;
  client_name: string;
  client_email: string;
  client_phone: string;
  quantity: string;
  notes: string;
  refNo: string;
}

const initialSale: SaleState = {
  materialTypeId: "",
  step: "details",
  client_name: "",
  client_email: "",
  client_phone: "",
  quantity: "",
  notes: "",
  refNo: "",
};

const stepLabels: Record<SaleStep, string> = {
  details: "Client & Quantity",
  quotation_sent: "Quotation Sent",
  invoice_sent: "Invoice Sent",
  receipt_done: "Sale Complete",
};

const AggregatorSalesPanel = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [saleDialog, setSaleDialog] = useState(false);
  const [sale, setSale] = useState<SaleState>(initialSale);
  const [vat, setVat] = useState<VatConfig>(DEFAULT_VAT);
  const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
  const [showCrmPicker, setShowCrmPicker] = useState(false);
  const [crmSearch, setCrmSearch] = useState("");
  const [customerSource, setCustomerSource] = useState<"crm" | "recyclers">("crm");
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [pendingSales, setPendingSales] = useState<(SaleState & { vat: VatConfig })[]>(() => {
    try {
      const saved = localStorage.getItem(`pending_agg_sales_${user?.id || "anon"}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`pending_agg_sales_${user.id}`, JSON.stringify(pendingSales));
  }, [pendingSales, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("customers").select("*").eq("user_id", user.id).order("full_name")
      .then(({ data }) => { if (data) setCrmCustomers(data); });
  }, [user]);

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch platform recyclers
  const { data: platformRecyclers } = useQuery({
    queryKey: ["platform_recyclers_for_sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_number, email, county")
        .order("full_name");
      if (error) throw error;
      // Filter to only recyclers by checking user_roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "recycler");
      const recyclerIds = new Set(roles?.map(r => r.user_id) || []);
      return (data || []).filter(p => recyclerIds.has(p.user_id) && p.user_id !== user?.id);
    },
    enabled: !!user,
  });

  const { data: collections } = useQuery({
    queryKey: ["aggregator_inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit, icon)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: salesHistory } = useQuery({
    queryKey: ["agg_sales_history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("type", "income")
        .ilike("description", "Material Sale:%")
        .order("transaction_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build material stock from collections
  const materialStock = new Map<string, { name: string; qty: number; unit: string; pricePerUnit: number; icon: string }>();
  collections?.forEach((c) => {
    const mt = (c as any).material_types;
    const key = c.material_type_id;
    const existing = materialStock.get(key);
    if (existing) {
      existing.qty += Number(c.quantity);
    } else {
      materialStock.set(key, {
        name: mt?.name || "Unknown",
        qty: Number(c.quantity),
        unit: mt?.unit || "kg",
        pricePerUnit: Number(mt?.price_per_unit || 0),
        icon: mt?.icon || "♻️",
      });
    }
  });

  const selectedMaterial = sale.materialTypeId ? materialStock.get(sale.materialTypeId) : null;

  const openSale = (materialTypeId: string) => {
    const ref = `AS-${Date.now().toString(36).toUpperCase()}`;
    setSale({ ...initialSale, materialTypeId, refNo: ref });
    setVat(DEFAULT_VAT);
    setSaleDialog(true);
  };

  const resumeSale = (pending: SaleState & { vat: VatConfig }) => {
    setSale({ ...pending });
    setVat(pending.vat);
    setSaleDialog(true);
  };

  const closeSale = () => {
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

  const calcSubtotal = () => {
    if (!selectedMaterial) return 0;
    return (Number(sale.quantity) || 0) * selectedMaterial.pricePerUnit;
  };

  const calcVatAmount = () => {
    if (!vat.includeVat) return 0;
    return calcSubtotal() * (vat.vatPercent / 100);
  };

  const calcTotal = () => calcSubtotal() + calcVatAmount();

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const generatePdf = async (docType: "Quotation" | "Invoice" | "Receipt") => {
    if (!selectedMaterial) return;
    const qty = Number(sale.quantity) || 1;
    const subtotal = calcSubtotal();
    const doc = new jsPDF();
    const pdfOrg = await getOrgPdfInfo();
    const prefix = docType === "Quotation" ? "QT" : docType === "Invoice" ? "INV" : "RCT";
    const docNo = `${prefix}-${sale.refNo.replace("AS-", "")}`;

    let y = addCleanHeader(doc, docType, undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: `${docType} #`, value: docNo },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Ref", value: sale.refNo },
      { label: docType === "Quotation" ? "From" : "Seller", value: orgInfo?.orgName || profile?.full_name || "Aggregator" },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
      { label: docType === "Quotation" ? "To" : "Client", value: sale.client_name || "—" },
      ...(sale.client_phone ? [{ label: "Client Phone", value: sale.client_phone }] : []),
      ...(sale.client_email ? [{ label: "Client Email", value: sale.client_email }] : []),
    ], y);

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Qty", x: 95 }, { label: "Unit Price (KES)", x: 120 }, { label: "Total (KES)", x: 165 },
    ], y, 180);

    drawTableRow(doc, y, 0, 180);
    doc.setFontSize(8);
    doc.text(selectedMaterial.name, 17, y);
    doc.text(`${qty} ${selectedMaterial.unit}`, 95, y);
    doc.text(selectedMaterial.pricePerUnit.toFixed(2), 120, y);
    doc.text(subtotal.toLocaleString(), 165, y);
    y += 10;

    y = drawVatTotalBlock(doc, subtotal, vat.vatPercent, vat.includeVat, y);

    if (docType === "Quotation") {
      doc.setFontSize(9);
      doc.text("This quotation is valid for 30 days from the date of issue.", 15, y);
    }
    if (docType === "Receipt") {
      doc.setFontSize(9);
      doc.setTextColor(34, 139, 34);
      doc.text("PAID IN FULL", 15, y);
      doc.setTextColor(0);
    }
    if (sale.notes) { doc.setFontSize(9); doc.text(`Notes: ${sale.notes}`, 15, y + 6); }

    finalizeCleanPdf(doc);
    doc.save(`${docType.toLowerCase()}-${docNo}.pdf`);
    toast.success(`${docType} downloaded`);
  };

  const handleSendQuotation = async () => {
    await generatePdf("Quotation");
    setSale((s) => ({ ...s, step: "quotation_sent" }));
  };

  const handleSkipToInvoice = async () => {
    await generatePdf("Invoice");
    setSale((s) => ({ ...s, step: "invoice_sent" }));
  };

  const handleClientAccepts = async () => {
    await generatePdf("Invoice");
    setSale((s) => ({ ...s, step: "invoice_sent" }));
  };

  const handleGenerateReceipt = async () => {
    if (!selectedMaterial || !user) return;
    const qty = Number(sale.quantity) || 1;
    const total = calcTotal();

    await generatePdf("Receipt");

    // Log as income
    const { data: incomeCats } = await supabase.from("financial_categories").select("id").eq("name", "Material Sales").eq("is_system", true).limit(1);
    const categoryId = incomeCats?.[0]?.id || null;

    await supabase.from("financial_transactions").insert({
      user_id: user.id,
      type: "income",
      amount: total,
      description: `Material Sale: ${qty} ${selectedMaterial.unit} of ${selectedMaterial.name} to ${sale.client_name}`,
      category_id: categoryId,
      payment_method: "cash",
      reference_number: sale.refNo,
      transaction_date: new Date().toISOString().split("T")[0],
    });

    // Update CRM
    if (sale.client_name) {
      const existing = crmCustomers.find(c => c.full_name.toLowerCase() === sale.client_name.toLowerCase());
      if (existing) {
        await supabase.from("customers").update({
          total_transactions: (existing.total_transactions || 0) + 1,
          total_revenue: (Number(existing.total_revenue) || 0) + total,
          last_transaction_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          user_id: user.id, full_name: sale.client_name,
          phone: sale.client_phone || null, email: sale.client_email || null,
          total_transactions: 1, total_revenue: total,
          last_transaction_date: new Date().toISOString(),
        });
      }
      const { data: refreshed } = await supabase.from("customers").select("*").eq("user_id", user.id).order("full_name");
      if (refreshed) setCrmCustomers(refreshed);
    }

    queryClient.invalidateQueries({ queryKey: ["aggregator_inventory"] });
    queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    queryClient.invalidateQueries({ queryKey: ["agg_sales_history"] });

    setSale((s) => ({ ...s, step: "receipt_done" }));
    setPendingSales((prev) => prev.filter((s) => s.refNo !== sale.refNo));
    toast.success("Sale completed! Income recorded.");
  };

  const exportSalesExcel = () => {
    if (!salesHistory?.length) { toast.error("No sales to export"); return; }
    const header = "Date,Reference,Description,Amount (KES)\n";
    const rows = salesHistory.map(tx =>
      `${tx.transaction_date},"${tx.reference_number || ""}","${(tx.description || "").replace(/"/g, '""')}",${tx.amount}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `aggregator-sales-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Sales exported as CSV");
  };

  const exportSalesPdf = async () => {
    if (!salesHistory?.length) { toast.error("No sales to export"); return; }
    const doc = new jsPDF();
    const pdfOrg = await getOrgPdfInfo();
    let y = addCleanHeader(doc, "Sales Report", undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: "Generated", value: format(new Date(), "MMM d, yyyy") },
      { label: "Total Sales", value: `${salesHistory.length}` },
      { label: "Total Revenue", value: `KES ${salesHistory.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}` },
    ], y);
    y = drawTableHeader(doc, [
      { label: "Date", x: 17 }, { label: "Reference", x: 50 }, { label: "Description", x: 85 }, { label: "Amount (KES)", x: 165 },
    ], y, 180);
    salesHistory.forEach((tx, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(7);
      doc.text(tx.transaction_date, 17, y);
      doc.text(tx.reference_number || "", 50, y);
      doc.text((tx.description || "").substring(0, 40), 85, y);
      doc.text(Number(tx.amount).toLocaleString(), 165, y);
      y += 7;
    });
    finalizeCleanPdf(doc);
    doc.save(`aggregator-sales-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Sales report PDF downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Material Stock for Sale */}
      <div className={`grid gap-6 ${pendingSales.length > 0 ? "grid-cols-1 lg:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Sell from Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Material picker dialog for new sale */}
            <Dialog open={showMaterialPicker} onOpenChange={setShowMaterialPicker}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Select Material to Sell</DialogTitle></DialogHeader>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {materialStock.size > 0 ? (
                    Array.from(materialStock.entries()).map(([id, m]) => (
                      <button
                        key={id}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-primary/10 transition-colors"
                        onClick={() => { setShowMaterialPicker(false); openSale(id); }}
                        disabled={m.qty <= 0}
                      >
                        <p className="text-sm font-medium inline-flex items-center gap-1.5"><MaterialIcon iconName={m.icon} className="w-4 h-4" /> {m.name}</p>
                        <p className="text-xs text-muted-foreground">Stock: {m.qty.toFixed(1)} {m.unit} • KES {m.pricePerUnit.toFixed(2)}/{m.unit}</p>
                      </button>
                    ))
                  ) : materialTypes?.length ? (
                    materialTypes.map((mt) => (
                      <button
                        key={mt.id}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-primary/10 transition-colors"
                        onClick={() => { setShowMaterialPicker(false); openSale(mt.id); }}
                      >
                        <p className="text-sm font-medium inline-flex items-center gap-1.5"><MaterialIcon iconName={mt.icon} className="w-4 h-4" /> {mt.name}</p>
                        <p className="text-xs text-muted-foreground">KES {mt.price_per_unit}/{mt.unit}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No materials available.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {!materialStock.size ? (
              <p className="text-sm text-muted-foreground">No materials in inventory yet. Add collections in the Stock tab first.</p>
            ) : (
              <div className="divide-y divide-border">
                {Array.from(materialStock.entries()).map(([id, m]) => (
                  <div key={id} className="flex items-center justify-between py-3 gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground inline-flex items-center gap-1.5"><MaterialIcon iconName={m.icon} className="w-4 h-4" /> {m.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Stock: {m.qty.toFixed(1)} {m.unit}</span>
                          <span className="text-xs font-semibold text-foreground">KES {m.pricePerUnit.toFixed(2)}/{m.unit}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openSale(id)} disabled={m.qty <= 0}>
                      <ShoppingCart className="w-3 h-3 mr-1" /> Sell
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Sales sidebar */}
        {pendingSales.length > 0 && (
          <Card className="shadow-soft border-accent/30 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-secondary" /> Pending Sales ({pendingSales.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {pendingSales.map((ps) => {
                  const mat = materialStock.get(ps.materialTypeId);
                  const stepLabel = ps.step === "quotation_sent" ? "Awaiting client response" : ps.step === "invoice_sent" ? "Awaiting payment" : ps.step;
                  return (
                    <div key={ps.refNo} className="py-3 space-y-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ps.client_name}</p>
                        <p className="text-xs text-muted-foreground">{mat?.name || "Material"} • {ps.quantity} {mat?.unit || "kg"}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">{stepLabel}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="flex-1" onClick={() => resumeSale(ps)}>
                          <ArrowRight className="w-3 h-3 mr-1" /> Continue
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removePending(ps.refNo)} title="Remove">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales History */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Sales History
          </CardTitle>
          {salesHistory && salesHistory.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportSalesExcel}><Download className="w-3 h-3 mr-1" /> CSV</Button>
              <Button variant="outline" size="sm" onClick={exportSalesPdf}><Download className="w-3 h-3 mr-1" /> PDF</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!salesHistory?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sales recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {salesHistory.map((tx) => {
                const desc = tx.description?.replace("Material Sale: ", "") || "";
                const parts = desc.split(" to ");
                const productInfo = parts[0] || "";
                const customerName = parts[1] || "Unknown";
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Receipt className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{productInfo}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">KES {Number(tx.amount).toLocaleString()}</p>
                      {tx.reference_number && <p className="text-[10px] text-muted-foreground">Ref: {tx.reference_number}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Flow Dialog */}
      <Dialog open={saleDialog} onOpenChange={(open) => { if (!open) closeSale(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Sell Material
            </DialogTitle>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4">
              {/* Progress Steps */}
              <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
                {(["details", "quotation_sent", "invoice_sent", "receipt_done"] as SaleStep[]).map((step, i) => {
                  const steps: SaleStep[] = ["details", "quotation_sent", "invoice_sent", "receipt_done"];
                  const currentIdx = steps.indexOf(sale.step);
                  const isDone = i < currentIdx;
                  const isCurrent = i === currentIdx;
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

              {/* Material info */}
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground">{selectedMaterial.icon} {selectedMaterial.name}</p>
                  <p className="text-xs text-muted-foreground">KES {selectedMaterial.pricePerUnit.toFixed(2)}/{selectedMaterial.unit} • Stock: {selectedMaterial.qty.toFixed(1)} {selectedMaterial.unit}</p>
                </CardContent>
              </Card>

              {/* Step 1: Details */}
              {sale.step === "details" && (
                <div className="space-y-3">
                  {!showCrmPicker && (
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { setShowCrmPicker(true); setCustomerSource("crm"); }}>
                      <Users className="w-4 h-4" /> Select Existing Customer or Recycler
                    </Button>
                  )}
                  {showCrmPicker && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <Button variant={customerSource === "crm" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => setCustomerSource("crm")}>
                              My Customers
                            </Button>
                            <Button variant={customerSource === "recyclers" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => setCustomerSource("recyclers")}>
                              Platform Recyclers
                            </Button>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setShowCrmPicker(false); setCrmSearch(""); }}>New Client</Button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input placeholder={customerSource === "crm" ? "Search customers..." : "Search recyclers..."} value={crmSearch} onChange={e => setCrmSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {customerSource === "crm" ? (
                            crmCustomers.length > 0 ? crmCustomers
                              .filter(c => !crmSearch || c.full_name.toLowerCase().includes(crmSearch.toLowerCase()))
                              .map(c => (
                                <button key={c.id} className="w-full text-left p-2 rounded-md hover:bg-primary/10 transition-colors text-sm" onClick={() => {
                                  setSale(s => ({ ...s, client_name: c.full_name, client_phone: c.phone || "", client_email: c.email || "" }));
                                  setShowCrmPicker(false); setCrmSearch("");
                                }}>
                                  <p className="font-medium text-xs">{c.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" • ")}</p>
                                </button>
                              )) : <p className="text-xs text-muted-foreground text-center py-2">No customers yet</p>
                          ) : (
                            platformRecyclers && platformRecyclers.length > 0 ? platformRecyclers
                              .filter(r => !crmSearch || r.full_name.toLowerCase().includes(crmSearch.toLowerCase()) || r.county?.toLowerCase().includes(crmSearch.toLowerCase()))
                              .map(r => (
                                <button key={r.user_id} className="w-full text-left p-2 rounded-md hover:bg-primary/10 transition-colors text-sm" onClick={() => {
                                  setSale(s => ({ ...s, client_name: r.full_name, client_phone: r.phone_number || "", client_email: r.email || "" }));
                                  setShowCrmPicker(false); setCrmSearch("");
                                }}>
                                  <p className="font-medium text-xs">{r.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{[r.phone_number, r.email, r.county].filter(Boolean).join(" • ")}</p>
                                  <Badge variant="outline" className="text-[9px] mt-0.5">Recycler</Badge>
                                </button>
                              )) : <p className="text-xs text-muted-foreground text-center py-2">No recyclers found</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div><Label>Client Name *</Label><Input value={sale.client_name} onChange={(e) => setSale({ ...sale, client_name: e.target.value })} placeholder="Client / company name" /></div>
                  <div><Label>Client Phone</Label><Input value={sale.client_phone} onChange={(e) => setSale({ ...sale, client_phone: e.target.value })} placeholder="0712 345 678" /></div>
                  <div><Label>Client Email</Label><Input type="email" value={sale.client_email} onChange={(e) => setSale({ ...sale, client_email: e.target.value })} placeholder="client@email.com" /></div>
                  {sale.client_name && !crmCustomers.some(c => c.full_name.toLowerCase() === sale.client_name.toLowerCase()) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-primary/30 text-primary"
                      onClick={async () => {
                        if (!user || !sale.client_name) return;
                        const { error } = await supabase.from("customers").insert({
                          user_id: user.id,
                          full_name: sale.client_name,
                          phone: sale.client_phone || null,
                          email: sale.client_email || null,
                          total_transactions: 0,
                          total_revenue: 0,
                        });
                        if (error) { toast.error("Failed to add customer"); return; }
                        const { data: refreshed } = await supabase.from("customers").select("*").eq("user_id", user.id).order("full_name");
                        if (refreshed) setCrmCustomers(refreshed);
                        toast.success(`${sale.client_name} added to your customers`);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add "{sale.client_name}" to Customers
                    </Button>
                  )}
                  <div><Label>Quantity ({selectedMaterial.unit}) *</Label><Input type="number" value={sale.quantity} onChange={(e) => setSale({ ...sale, quantity: e.target.value })} max={selectedMaterial.qty} /></div>
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

              {/* Step 2: Quotation Sent */}
              {sale.step === "quotation_sent" && (
                <div className="space-y-3">
                  <Card className="bg-secondary/10 border-accent/30">
                    <CardContent className="p-4 text-center space-y-2">
                      <FileText className="w-8 h-8 text-secondary mx-auto" />
                      <p className="text-sm font-medium text-foreground">Quotation sent to {sale.client_name}</p>
                      <p className="text-xs text-muted-foreground">KES {calcTotal().toLocaleString()} for {sale.quantity} {selectedMaterial.unit}</p>
                    </CardContent>
                  </Card>
                  <p className="text-sm text-center text-muted-foreground">Did the client accept?</p>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleClientAccepts}><CheckCircle2 className="w-4 h-4 mr-1" /> Yes, Generate Invoice</Button>
                    <Button variant="outline" className="flex-1" onClick={() => { generatePdf("Quotation"); }}>Resend Quotation</Button>
                  </div>
                  <Button variant="ghost" className="w-full text-destructive" onClick={closeSale}>Close & Save</Button>
                </div>
              )}

              {/* Step 3: Invoice Sent */}
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
                  <Button variant="outline" className="w-full" onClick={() => { generatePdf("Invoice"); }}>Re-download Invoice</Button>
                  <Button variant="ghost" className="w-full text-destructive" onClick={closeSale}>Close & Save</Button>
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
                        {sale.quantity} {selectedMaterial.unit} of {selectedMaterial.name} sold to {sale.client_name} for KES {calcTotal().toLocaleString()}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>✅ Income recorded in Earnings & Expenses</p>
                        <p>✅ Customer record updated</p>
                        <p>✅ Receipt generated</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Button className="w-full" onClick={() => { setSaleDialog(false); setSale(initialSale); }}>Done</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AggregatorSalesPanel;
