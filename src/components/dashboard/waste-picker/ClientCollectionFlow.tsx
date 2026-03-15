import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, MapPin, User, Phone, Mail, FileText, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import {
  PDF_COLORS, addCleanHeader, addDocMeta, drawTableHeader,
  drawTableRow, drawTotalLine, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo,
} from "@/lib/pdfBranding";

interface Props {
  onBack: () => void;
}

const ClientCollectionFlow = ({ onBack }: Props) => {
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");

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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_collections"] });
      toast.success("Collection recorded!");
      setClientName(""); setClientPhone(""); setClientEmail("");
      setMaterialType(""); setQuantityKg(""); setUnitPrice("");
      setLocationName(""); setNotes(""); setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) {
      logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    }
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const generateDocument = async (type: "quotation" | "invoice" | "receipt", item: any) => {
    const doc = new jsPDF();
    const title = type === "quotation" ? "Quotation" : type === "invoice" ? "Invoice" : "Receipt";
    const pdfOrg = await getOrgPdfInfo();
    const entityName = orgInfo?.orgName || profile?.full_name || "Waste Picker";

    let y = addCleanHeader(doc, title, `Ref: ${type.toUpperCase().slice(0, 3)}-${item.id.slice(0, 8).toUpperCase()}`, pdfOrg);

    // From (organization / waste picker)
    y = addDocMeta(doc, [
      { label: "From", value: entityName },
      { label: "Phone", value: orgInfo?.contactPhone || profile?.phone_number || "N/A" },
      { label: "Email", value: orgInfo?.contactEmail || profile?.email || "N/A" },
    ], y);

    // To (client)
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

    // Table
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

    y = drawTotalLine(doc, `Total: KES ${Number(item.total_amount).toLocaleString()}`, y);

    if (item.notes) {
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.mutedText);
      doc.text(`Notes: ${item.notes}`, 15, y);
    }

    finalizeCleanPdf(doc);
    doc.save(`${title}-${item.id.slice(0, 8)}.pdf`);
    toast.success(`${title} downloaded`);
  };

  const canSubmit = clientName && materialType && quantityKg && unitPrice;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground">Collect From Client</p>
          <p className="text-xs text-muted-foreground">Record waste collected from clients in the field. Generate quotations, invoices, or receipts for them.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Client Name *" value={clientName} onChange={e => setClientName(e.target.value)} />
              <Input placeholder="Client Phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
              <Input placeholder="Client Email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
              <Input placeholder="Material Type *" value={materialType} onChange={e => setMaterialType(e.target.value)} />
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

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Collection History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !collections?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No collections recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {collections.map(c => (
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
                    <Badge variant="secondary">{c.status}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateDocument("quotation", c)}>
                      <FileText className="w-3 h-3 mr-1" /> Quotation
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateDocument("invoice", c)}>
                      <FileText className="w-3 h-3 mr-1" /> Invoice
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateDocument("receipt", c)}>
                      <FileText className="w-3 h-3 mr-1" /> Receipt
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

export default ClientCollectionFlow;