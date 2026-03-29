import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, User, FileText, ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import {
  PDF_COLORS, addCleanHeader, addDocMeta, drawTableHeader,
  drawTableRow, drawVatTotalBlock, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo,
} from "@/lib/pdfBranding";
import VatOptions, { DEFAULT_VAT, type VatConfig } from "@/components/dashboard/shared/VatOptions";

interface Props {
  onBack: () => void;
}

const STATUS_FLOW = ["draft", "quotation", "invoiced", "paid"] as const;
type DocStatus = typeof STATUS_FLOW[number];

const statusLabels: Record<DocStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  quotation: { label: "Quotation Sent", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  invoiced: { label: "Invoiced", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

const ClientCollectionFlow = ({ onBack }: Props) => {
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [vat, setVat] = useState<VatConfig>(DEFAULT_VAT);

  const { data: customers } = useQuery({
    queryKey: ["customers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user!.id)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: collections, isLoading } = useQuery({
    queryKey: ["client_collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_collections")
        .select("*")
        .eq("waste_picker_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addCollection = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantityKg);
      const price = parseFloat(unitPrice);
      const { error } = await supabase.from("client_collections").insert({
        waste_picker_id: user!.id,
        client_name: clientName,
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
        material_type: materialType,
        quantity_kg: qty,
        unit_price: price,
        total_amount: qty * price,
        location_name: locationName || null,
        notes: notes || null,
        status: "draft",
      });
      if (error) throw error;

      // Auto-add new client to customers table
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user!.id)
        .ilike("full_name", clientName.trim())
        .maybeSingle();

      if (!existingCustomer) {
        await supabase.from("customers").insert({
          user_id: user!.id,
          full_name: clientName.trim(),
          phone: clientPhone || null,
          email: clientEmail || null,
          location: locationName || null,
          category: "general",
        });
      }

      // Also log into the main collections table so it appears in Log Collection history
      const { data: matchingType } = await supabase
        .from("material_types")
        .select("id")
        .ilike("name", materialType.trim())
        .maybeSingle();

      if (matchingType) {
        await supabase.from("collections").insert({
          user_id: user!.id,
          material_type_id: matchingType.id,
          quantity: qty,
          location_name: locationName || null,
          notes: `Client: ${clientName}${notes ? ` • ${notes}` : ""}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Collection recorded as draft!");
      setSelectedCustomerId(""); setIsNewClient(false);
      setClientName(""); setClientPhone(""); setClientEmail("");
      setMaterialType(""); setQuantityKg(""); setUnitPrice("");
      setLocationName(""); setNotes(""); setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("client_collections")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      return { id, newStatus };
    },
    onSuccess: async ({ id, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["client_collections"] });

      // When marked as paid, log income in financial_transactions
      if (newStatus === "paid") {
        const item = collections?.find(c => c.id === id);
        if (item) {
          await supabase.from("financial_transactions").insert({
            user_id: user!.id,
            type: "income",
            amount: Number(item.total_amount),
            description: `Client collection: ${item.material_type} from ${item.client_name}`,
            payment_method: "cash",
            reference_number: `CC-${item.id.slice(0, 8).toUpperCase()}`,
          });
          queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
          toast.success("Payment recorded & income logged to My Earnings!");
        }
      } else {
        toast.success(`Status updated to ${statusLabels[newStatus as DocStatus]?.label || newStatus}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const generateDocument = async (type: "quotation" | "invoice" | "receipt", item: any) => {
    const doc = new jsPDF();
    const title = type === "quotation" ? "Quotation" : type === "invoice" ? "Invoice" : "Receipt";
    const pdfOrg = await getOrgPdfInfo();
    const refPrefix = type === "quotation" ? "QTN" : type === "invoice" ? "INV" : "RCT";

    let y = addCleanHeader(doc, title, `Ref: ${refPrefix}-${item.id.slice(0, 8).toUpperCase()}`, pdfOrg);

    y = addDocMeta(doc, [
      { label: "From", value: orgInfo?.orgName || profile?.full_name || "Waste Picker" },
      { label: "Phone", value: orgInfo?.contactPhone || profile?.phone_number || "N/A" },
      { label: "Email", value: orgInfo?.contactEmail || profile?.email || "N/A" },
    ], y);

    y = addDocMeta(doc, [
      { label: "To", value: item.client_name },
      { label: "Phone", value: item.client_phone || "N/A" },
      { label: "Email", value: item.client_email || "N/A" },
    ], y);

    y += 4;
    y = addDocMeta(doc, [
      { label: "Date", value: format(new Date(item.collection_date), "MMM d, yyyy") },
      { label: "Location", value: item.location_name || "N/A" },
    ], y);

    const cols = [
      { label: "Material", x: 17 },
      { label: "Qty (kg)", x: 80 },
      { label: "Unit Price", x: 110 },
      { label: "Total (KES)", x: 150 },
    ];
    y = drawTableHeader(doc, cols, y, 178);
    drawTableRow(doc, y, 0, 178);
    doc.setFontSize(8);
    doc.text(item.material_type, 17, y);
    doc.text(String(item.quantity_kg), 80, y);
    doc.text(`KES ${Number(item.unit_price).toLocaleString()}`, 110, y);
    doc.text(`KES ${Number(item.total_amount).toLocaleString()}`, 150, y);
    y += 10;

    y = drawVatTotalBlock(doc, Number(item.total_amount), vat.vatPercent, vat.includeVat, y);

    if (item.notes) {
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.mutedText);
      doc.text(`Notes: ${item.notes}`, 15, y);
      y += 8;
    }

    if (type === "receipt") {
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.darkText);
      doc.text("Payment Status: PAID", 15, y);
      y += 14;
      doc.text("Received by: ____________________________", 15, y);
      y += 12;
      doc.text("Signature:    ____________________________", 15, y);
      y += 12;
      doc.text("Date:            ____________________________", 15, y);
    }

    finalizeCleanPdf(doc);
    doc.save(`${title}-${item.id.slice(0, 8)}.pdf`);
    toast.success(`${title} downloaded`);
  };

  const handleGenerateAndAdvance = async (type: "quotation" | "invoice" | "receipt", item: any) => {
    await generateDocument(type, item);
    const nextStatus = type === "quotation" ? "quotation" : type === "invoice" ? "invoiced" : "paid";
    if (item.status !== nextStatus) {
      updateStatus.mutate({ id: item.id, newStatus: nextStatus });
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case "draft":
        return { actions: ["quotation", "invoice"] as const, skipLabel: "Skip to Invoice" };
      case "quotation":
        return { actions: ["invoice"] as const };
      case "invoiced":
        return { actions: ["receipt"] as const };
      case "paid":
        return { actions: [] as const };
      default:
        return { actions: ["quotation"] as const };
    }
  };

  const canSubmit = (selectedCustomerId && selectedCustomerId !== "__new__" ? true : clientName) && materialType && quantityKg && unitPrice;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground">Collect From Client</p>
          <p className="text-xs text-muted-foreground">
            Record waste collected → Generate Quotation (optional) → Invoice → Receipt when paid.
            Paid collections are logged to your earnings automatically.
          </p>
        </CardContent>
      </Card>

      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Collection
        </Button>
      )}

      {showForm && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Record Collection</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {/* Client selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Select value={selectedCustomerId} onValueChange={(val) => {
                  if (val === "__new__") {
                    setIsNewClient(true);
                    setSelectedCustomerId("__new__");
                    setClientName(""); setClientPhone(""); setClientEmail("");
                  } else {
                    setIsNewClient(false);
                    setSelectedCustomerId(val);
                    const c = customers?.find(cu => cu.id === val);
                    if (c) {
                      setClientName(c.full_name);
                      setClientPhone(c.phone || "");
                      setClientEmail(c.email || "");
                      setLocationName(c.location || "");
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client *" /></SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}{c.phone ? ` • ${c.phone}` : ""}</SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Add New Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isNewClient && (
                <>
                  <Input placeholder="Client Name *" value={clientName} onChange={e => setClientName(e.target.value)} />
                  <Input placeholder="Client Phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                  <Input placeholder="Client Email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={materialType} onValueChange={(val) => {
                setMaterialType(val);
                const mt = materialTypes?.find(m => m.name === val);
                if (mt) setUnitPrice(String(mt.price_per_unit));
              }}>
                <SelectTrigger><SelectValue placeholder="Select material type *" /></SelectTrigger>
                <SelectContent>
                  {materialTypes?.map(mt => (
                    <SelectItem key={mt.id} value={mt.name}>{mt.name} (KES {mt.price_per_unit}/{mt.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Quantity (kg) *" type="number" value={quantityKg} onChange={e => setQuantityKg(e.target.value)} />
              <Input placeholder="Unit Price (KES) *" type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
              <Input placeholder="Location" value={locationName} onChange={e => setLocationName(e.target.value)} />
              <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {quantityKg && unitPrice && (
              <p className="text-sm font-medium text-primary">
                Total: KES {(parseFloat(quantityKg || "0") * parseFloat(unitPrice || "0")).toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => addCollection.mutate()} disabled={!canSubmit || addCollection.isPending}>
                {addCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Collection"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <VatOptions value={vat} onChange={setVat} />

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Collection History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !collections?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No collections recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {collections.map(c => {
                const status = (c.status || "draft") as DocStatus;
                const { actions } = getNextAction(status);
                const sLabel = statusLabels[status] || statusLabels.draft;

                return (
                  <div key={c.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-sm font-medium">{c.client_name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.material_type} • {c.quantity_kg} kg • KES {Number(c.total_amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(c.collection_date), "MMM d, yyyy")}
                          {c.location_name && ` • ${c.location_name}`}
                        </p>
                      </div>
                      <Badge className={sLabel.color}>{sLabel.label}</Badge>
                    </div>

                    {/* Document workflow actions */}
                    <div className="flex gap-2 flex-wrap items-center">
                      {status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleGenerateAndAdvance("quotation", c)}>
                            <FileText className="w-3 h-3 mr-1" /> Quotation
                          </Button>
                          <span className="text-xs text-muted-foreground">or</span>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleGenerateAndAdvance("invoice", c)}>
                            <ArrowRight className="w-3 h-3 mr-1" /> Skip to Invoice
                          </Button>
                        </>
                      )}
                      {status === "quotation" && (
                        <Button size="sm" variant="default" className="text-xs h-7" onClick={() => handleGenerateAndAdvance("invoice", c)}>
                          <FileText className="w-3 h-3 mr-1" /> Generate Invoice
                        </Button>
                      )}
                      {status === "invoiced" && (
                        <Button size="sm" variant="default" className="text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => handleGenerateAndAdvance("receipt", c)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Paid & Receipt
                        </Button>
                      )}
                      {status === "paid" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => generateDocument("receipt", c)}>
                          <FileText className="w-3 h-3 mr-1" /> Re-download Receipt
                        </Button>
                      )}

                      {/* Always allow re-downloading previous docs */}
                      {(status === "quotation" || status === "invoiced" || status === "paid") && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => generateDocument("quotation", c)}>
                          Quotation
                        </Button>
                      )}
                      {(status === "invoiced" || status === "paid") && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => generateDocument("invoice", c)}>
                          Invoice
                        </Button>
                      )}
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

export default ClientCollectionFlow;
