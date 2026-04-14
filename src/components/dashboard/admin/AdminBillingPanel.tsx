import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, Receipt, FileBarChart, Download, Send, Eye, Trash2, Edit2 } from "lucide-react";
import jsPDF from "jspdf";
import { addBrandedHeader, addDocMeta, addSectionTitle, finalizePdf, drawTableHeader, drawTableRow, drawVatTotalBlock, PDF_COLORS } from "@/lib/pdfBranding";
import { format } from "date-fns";
import { ROLE_PRICING, type BillingPeriod } from "@/lib/stripePlans";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

const DUARA_SERVICES = [
  { label: "Waste Picker Subscription (Monthly)", price: 250 },
  { label: "Waste Picker Subscription (Yearly)", price: 2550 },
  { label: "Waste Picker Subscription (Lifetime)", price: 5800 },
  { label: "Aggregator Subscription (Monthly)", price: 250 },
  { label: "Aggregator Subscription (Yearly)", price: 2550 },
  { label: "Aggregator Subscription (Lifetime)", price: 5800 },
  { label: "Recycler Subscription (Monthly)", price: 300 },
  { label: "Recycler Subscription (Yearly)", price: 3060 },
  { label: "Recycler Subscription (Lifetime)", price: 7000 },
  { label: "NGO Subscription (Monthly)", price: 650 },
  { label: "NGO Subscription (Yearly)", price: 6600 },
  { label: "NGO Subscription (Lifetime)", price: 14500 },
  { label: "Corporate Subscription (Monthly)", price: 1300 },
  { label: "Corporate Subscription (Yearly)", price: 13200 },
  { label: "Corporate Subscription (Lifetime)", price: 29000 },
  { label: "County Government Subscription (Monthly)", price: 25000 },
  { label: "County Government Subscription (Yearly)", price: 255000 },
  { label: "County Government Subscription (Lifetime)", price: 510000 },
  { label: "Platform Consulting", price: 0 },
  { label: "Data Analytics Service", price: 0 },
  { label: "Custom Integration", price: 0 },
  { label: "Training & Onboarding", price: 0 },
];

const AdminBillingPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docType, setDocType] = useState<"invoice" | "quotation" | "receipt">("invoice");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientOrg, setClientOrg] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [vatPercent, setVatPercent] = useState(16);
  const [includeVat, setIncludeVat] = useState(true);
  const [paymentRef, setPaymentRef] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0, amount: 0 }]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["admin_invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_invoices" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (invoice: any) => {
      const { error } = await supabase.from("admin_invoices" as any).insert(invoice);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin_invoices_insights"] });
      toast.success(`${docType.charAt(0).toUpperCase() + docType.slice(1)} created!`);
      resetForm();
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paid_at }: { id: string; status: string; paid_at?: string }) => {
      const update: any = { status };
      if (paid_at) update.paid_at = paid_at;
      const { error } = await supabase.from("admin_invoices" as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin_invoices_insights"] });
      toast.success("Status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_invoices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
      toast.success("Deleted");
    },
  });

  const resetForm = () => {
    setClientName(""); setClientEmail(""); setClientPhone(""); setClientOrg(""); setNotes("");
    setDueDate(""); setPaymentRef(""); setItems([{ description: "", quantity: 1, unit_price: 0, amount: 0 }]);
    setIncludeVat(true); setVatPercent(16);
  };

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      updated[idx].amount = Number(updated[idx].quantity) * Number(updated[idx].unit_price);
      return updated;
    });
  };

  const addItem = () => setItems(prev => [...prev, { description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const vatAmount = includeVat ? subtotal * (vatPercent / 100) : 0;
  const total = subtotal + vatAmount;

  const handleServiceSelect = (idx: number, label: string) => {
    const svc = DUARA_SERVICES.find(s => s.label === label);
    if (svc) {
      updateItem(idx, "description", svc.label);
      if (svc.price > 0) {
        updateItem(idx, "unit_price", svc.price);
      }
    }
  };

  const handleCreate = () => {
    if (!clientName.trim()) { toast.error("Client name required"); return; }
    if (items.every(i => !i.description)) { toast.error("Add at least one item"); return; }

    createMutation.mutate({
      document_type: docType,
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      client_organization: clientOrg || null,
      items: items.filter(i => i.description),
      subtotal,
      vat_percent: includeVat ? vatPercent : 0,
      vat_amount: vatAmount,
      total_amount: total,
      notes: notes || null,
      due_date: dueDate || null,
      payment_reference: paymentRef || null,
      status: docType === "receipt" ? "paid" : "draft",
      paid_at: docType === "receipt" ? new Date().toISOString() : null,
      created_by: user?.id,
    });
  };

  const generatePdf = async (inv: any) => {
    const doc = new jsPDF();
    const typeLabel = inv.document_type === "invoice" ? "INVOICE" : inv.document_type === "quotation" ? "QUOTATION" : "RECEIPT";

    let y = await addBrandedHeader(doc, typeLabel, `Duara Flow — ${typeLabel}`);

    y = addDocMeta(doc, [
      { label: "Document No", value: inv.invoice_number },
      { label: "Date", value: format(new Date(inv.created_at), "dd MMM yyyy") },
      { label: "Client", value: inv.client_name },
      ...(inv.client_organization ? [{ label: "Organization", value: inv.client_organization }] : []),
      ...(inv.client_email ? [{ label: "Email", value: inv.client_email }] : []),
      ...(inv.client_phone ? [{ label: "Phone", value: inv.client_phone }] : []),
      ...(inv.due_date ? [{ label: "Due Date", value: format(new Date(inv.due_date), "dd MMM yyyy") }] : []),
      ...(inv.payment_reference ? [{ label: "Payment Ref", value: inv.payment_reference }] : []),
    ], y);

    y += 4;
    y = addSectionTitle(doc, "Items", y);

    const cols = [
      { label: "#", x: 17 },
      { label: "Description", x: 25 },
      { label: "Qty", x: 130 },
      { label: "Unit Price", x: 145 },
      { label: "Amount", x: 170 },
    ];
    y = drawTableHeader(doc, cols, y);

    const lineItems = (inv.items || []) as LineItem[];
    lineItems.forEach((item, idx) => {
      drawTableRow(doc, y, idx);
      doc.setFontSize(8);
      doc.text(String(idx + 1), 17, y);
      doc.text(item.description || "", 25, y);
      doc.text(String(item.quantity), 130, y);
      doc.text(`KES ${Number(item.unit_price).toLocaleString()}`, 145, y);
      doc.text(`KES ${Number(item.amount).toLocaleString()}`, 170, y);
      y += 7;
    });

    y += 4;
    y = drawVatTotalBlock(doc, Number(inv.subtotal), Number(inv.vat_percent), Number(inv.vat_percent) > 0, y);

    if (inv.notes) {
      y += 4;
      y = addSectionTitle(doc, "Notes", y);
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.mutedText);
      const lines = doc.splitTextToSize(inv.notes, 170);
      doc.text(lines, 15, y);
      y += lines.length * 5;
    }

    if (inv.document_type === "receipt") {
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(...PDF_COLORS.forest);
      doc.text("✓ PAID", 15, y);
      if (inv.paid_at) {
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.mutedText);
        doc.text(`Paid on: ${format(new Date(inv.paid_at), "dd MMM yyyy HH:mm")}`, 35, y);
      }
    }

    await finalizePdf(doc);
    doc.save(`${typeLabel}-${inv.invoice_number}.pdf`);
  };

  const typeFilter = (type: string) => invoices.filter((i: any) => i.document_type === type);

  const renderTable = (list: any[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 font-medium">No.</th>
            <th className="text-left py-2 font-medium">Client</th>
            <th className="text-left py-2 font-medium">Amount</th>
            <th className="text-left py-2 font-medium">Status</th>
            <th className="text-left py-2 font-medium">Date</th>
            <th className="text-right py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((inv: any) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="py-2 font-mono text-xs">{inv.invoice_number}</td>
              <td className="py-2">
                <div>{inv.client_name}</div>
                {inv.client_organization && <div className="text-xs text-muted-foreground">{inv.client_organization}</div>}
              </td>
              <td className="py-2 font-medium">KES {Number(inv.total_amount).toLocaleString()}</td>
              <td className="py-2">
                <Badge variant={inv.status === "paid" ? "default" : inv.status === "sent" ? "secondary" : inv.status === "cancelled" ? "destructive" : "outline"} className="text-xs">
                  {inv.status}
                </Badge>
              </td>
              <td className="py-2 text-muted-foreground">{format(new Date(inv.created_at), "dd MMM yyyy")}</td>
              <td className="py-2">
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => generatePdf(inv)}><Download className="w-3.5 h-3.5" /></Button>
                  {inv.status === "draft" && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "sent" })}><Send className="w-3.5 h-3.5" /></Button>
                  )}
                  {(inv.status === "draft" || inv.status === "sent") && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "paid", paid_at: new Date().toISOString() })} className="text-emerald-600"><Receipt className="w-3.5 h-3.5" /></Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(inv.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No documents yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Duara Flow Billing</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create {docType.charAt(0).toUpperCase() + docType.slice(1)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Document type */}
              <div>
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={(v: any) => setDocType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="quotation">Quotation</SelectItem>
                    <SelectItem value="receipt">Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Client info */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Client Name *</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" /></div>
                <div><Label>Organization</Label><Input value={clientOrg} onChange={e => setClientOrg(e.target.value)} placeholder="Company name" /></div>
                <div><Label>Email</Label><Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></div>
              </div>

              {/* Line items */}
              <div>
                <Label>Items</Label>
                <div className="space-y-2 mt-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select onValueChange={v => handleServiceSelect(idx, v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select service..." /></SelectTrigger>
                          <SelectContent>
                            {DUARA_SERVICES.map(s => (
                              <SelectItem key={s.label} value={s.label} className="text-xs">{s.label} {s.price > 0 ? `(KES ${s.price.toLocaleString()})` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input className="mt-1 text-xs" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Or type custom description" />
                      </div>
                      <div className="w-16"><Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} className="text-xs" /></div>
                      <div className="w-24"><Input type="number" min={0} value={item.unit_price} onChange={e => updateItem(idx, "unit_price", Number(e.target.value))} className="text-xs" placeholder="Price" /></div>
                      <div className="w-24 text-right text-sm font-medium">KES {item.amount.toLocaleString()}</div>
                      {items.length > 1 && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" /> Add Item</Button>
                </div>
              </div>

              {/* VAT */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} />
                  Include VAT
                </label>
                {includeVat && <Input type="number" value={vatPercent} onChange={e => setVatPercent(Number(e.target.value))} className="w-20" />}
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
                {includeVat && <div className="flex justify-between text-muted-foreground"><span>VAT ({vatPercent}%)</span><span>KES {vatAmount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>KES {total.toLocaleString()}</span></div>
              </div>

              {/* Extra fields */}
              <div className="grid grid-cols-2 gap-3">
                {docType !== "receipt" && <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>}
                {docType === "receipt" && <div><Label>Payment Reference</Label><Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="M-Pesa code, etc." /></div>}
              </div>

              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} /></div>

              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : `Create ${docType.charAt(0).toUpperCase() + docType.slice(1)}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices" className="gap-1"><FileText className="w-3.5 h-3.5" /> Invoices ({typeFilter("invoice").length})</TabsTrigger>
          <TabsTrigger value="quotations" className="gap-1"><FileBarChart className="w-3.5 h-3.5" /> Quotations ({typeFilter("quotation").length})</TabsTrigger>
          <TabsTrigger value="receipts" className="gap-1"><Receipt className="w-3.5 h-3.5" /> Receipts ({typeFilter("receipt").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">{renderTable(typeFilter("invoice"))}</TabsContent>
        <TabsContent value="quotations">{renderTable(typeFilter("quotation"))}</TabsContent>
        <TabsContent value="receipts">{renderTable(typeFilter("receipt"))}</TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBillingPanel;
