import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Truck } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawVatTotalBlock, drawTotalLine, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo } from "@/lib/pdfBranding";
import VatOptions, { DEFAULT_VAT, type VatConfig } from "@/components/dashboard/shared/VatOptions";
import { useTranslation } from "react-i18next";

const InvoicesPanel = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const [vat, setVat] = useState<VatConfig>(DEFAULT_VAT);

  const { data: collections } = useQuery({
    queryKey: ["aggregator_invoice_data", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const entityName = orgInfo?.orgName || profile?.full_name || "Aggregator";

  const getMaterialMap = () => {
    const materialMap = new Map<string, { name: string; qty: number; price: number; unit: string }>();
    collections?.forEach((c) => {
      const mt = (c as any).material_types;
      const key = c.material_type_id;
      const existing = materialMap.get(key);
      if (existing) { existing.qty += Number(c.quantity); }
      else { materialMap.set(key, { name: mt?.name || "Unknown", qty: Number(c.quantity), price: Number(mt?.price_per_unit || 0), unit: mt?.unit || "kg" }); }
    });
    return materialMap;
  };

  const generateInvoice = async () => {
    if (!collections?.length) return;
    const doc = new jsPDF();
    const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}`;
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, "Sales Invoice", "Combined invoice for all materials", pdfOrg);
    y = addDocMeta(doc, [
      { label: "Invoice #", value: invoiceNo },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "From", value: entityName },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
    ], y);

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Quantity", x: 85 }, { label: "Unit Price", x: 120 }, { label: "Total (KES)", x: 155 },
    ], y, 180);

    let grandTotal = 0;
    let i = 0;
    getMaterialMap().forEach((m) => {
      const total = m.qty * m.price; grandTotal += total;
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(m.name, 17, y); doc.text(`${m.qty.toFixed(1)} ${m.unit}`, 85, y);
      doc.text(m.price.toFixed(2), 120, y); doc.text(total.toLocaleString(), 155, y);
      y += 8; i++;
    });

    y += 4;
    y = drawVatTotalBlock(doc, grandTotal, vat.vatPercent, vat.includeVat, y);

    finalizeCleanPdf(doc);
    doc.save(`invoice-${invoiceNo}.pdf`);
  };

  const generateDeliveryNote = async () => {
    if (!collections?.length) return;
    const doc = new jsPDF();
    const noteNo = `DN-${Date.now().toString(36).toUpperCase()}`;
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, "Delivery Note", "Batch details with signature block", pdfOrg);
    y = addDocMeta(doc, [
      { label: "Note #", value: noteNo },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Delivered by", value: entityName },
    ], y);

    y = drawTableHeader(doc, [
      { label: "Batch ID", x: 17 }, { label: "Material", x: 65 }, { label: "Quantity", x: 115 }, { label: "Date", x: 155 },
    ], y, 180);

    collections.slice(0, 30).forEach((c, i) => {
      if (y > 240) { doc.addPage(); y = 20; }
      const mt = (c as any).material_types;
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(c.batch_id, 17, y); doc.text(mt?.name || "—", 65, y);
      doc.text(`${Number(c.quantity).toFixed(1)} ${mt?.unit || "kg"}`, 115, y);
      doc.text(format(new Date(c.collected_at), "MMM d"), 155, y);
      y += 7;
    });

    y += 14;
    doc.setFontSize(9);
    doc.text("Received by: ____________________________", 15, y); y += 12;
    doc.text("Signature: ____________________________", 15, y); y += 12;
    doc.text("Date: ____________________________", 15, y);

    finalizeCleanPdf(doc);
    doc.save(`delivery-note-${noteNo}.pdf`);
  };

  const generateMaterialInvoice = async (materialTypeId: string) => {
    const items = collections?.filter(c => c.material_type_id === materialTypeId) || [];
    if (!items.length) return;
    const mt = (items[0] as any).material_types;
    const doc = new jsPDF();
    const invoiceNo = `INV-M-${Date.now().toString(36).toUpperCase()}`;
    const totalQty = items.reduce((s, c) => s + Number(c.quantity), 0);
    const totalVal = totalQty * Number(mt?.price_per_unit || 0);
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, `Material Invoice — ${mt?.name}`, "Single-material invoice with batch details", pdfOrg);
    y = addDocMeta(doc, [
      { label: "Invoice #", value: invoiceNo },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "From", value: entityName },
    ], y);

    y = drawTableHeader(doc, [
      { label: "Batch ID", x: 17 }, { label: "Quantity", x: 85 }, { label: "Location", x: 120 }, { label: "Date", x: 165 },
    ], y, 180);

    items.slice(0, 30).forEach((c, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(c.batch_id, 17, y); doc.text(`${Number(c.quantity).toFixed(1)} ${mt?.unit || "kg"}`, 85, y);
      doc.text(c.location_name || "—", 120, y); doc.text(format(new Date(c.collected_at), "MMM d"), 165, y);
      y += 7;
    });

    y += 4;
    y = drawVatTotalBlock(doc, totalVal, vat.vatPercent, vat.includeVat, y);

    finalizeCleanPdf(doc);
    doc.save(`invoice-${mt?.name?.replace(/\s/g, "-")}-${invoiceNo}.pdf`);
  };

  const materialGroups = new Map<string, { name: string; qty: number; value: number; unit: string }>();
  collections?.forEach(c => {
    const mt = (c as any).material_types;
    const existing = materialGroups.get(c.material_type_id);
    const qty = Number(c.quantity);
    const val = qty * Number(mt?.price_per_unit || 0);
    if (existing) { existing.qty += qty; existing.value += val; }
    else { materialGroups.set(c.material_type_id, { name: mt?.name || "Unknown", qty, value: val, unit: mt?.unit || "kg" }); }
  });

  return (
    <div className="space-y-6">
      <VatOptions value={vat} onChange={setVat} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Sales Invoice</p>
                <p className="text-xs text-muted-foreground">Combined invoice for all materials</p>
              </div>
            </div>
            <Button size="sm" onClick={generateInvoice} disabled={!collections?.length} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Generate Invoice
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Delivery Note</p>
                <p className="text-xs text-muted-foreground">Delivery note with batch details and signature</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={generateDeliveryNote} disabled={!collections?.length} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Generate Note
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Individual Material Invoices</CardTitle></CardHeader>
        <CardContent>
          {!materialGroups.size ? (
            <p className="text-sm text-muted-foreground">No collection data.</p>
          ) : (
            <div className="divide-y divide-border">
              {Array.from(materialGroups.entries()).map(([id, m]) => (
                <div key={id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.qty.toFixed(1)} {m.unit} · KES {m.value.toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => generateMaterialInvoice(id)}>
                    <Download className="w-4 h-4 mr-1" /> Invoice
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesPanel;
