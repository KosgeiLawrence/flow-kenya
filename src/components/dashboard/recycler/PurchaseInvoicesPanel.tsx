import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawVatTotalBlock, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo } from "@/lib/pdfBranding";
import VatOptions, { DEFAULT_VAT, type VatConfig } from "@/components/dashboard/shared/VatOptions";
import { useTranslation } from "react-i18next";

const PurchaseInvoicesPanel = () => {
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const [vat, setVat] = useState<VatConfig>(DEFAULT_VAT);

  const { data: payments } = useQuery({
    queryKey: ["recycler_purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments").select("*").eq("status", "completed").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: collections } = useQuery({
    queryKey: ["recycler_invoice_collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections").select("*, material_types(name, unit, price_per_unit)").order("collected_at", { ascending: false });
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

  const entityName = orgInfo?.orgName || profile?.full_name || "Recycler";

  const generatePurchaseInvoice = async () => {
    if (!collections?.length) return;
    const doc = new jsPDF();
    const invNo = `PI-${Date.now().toString(36).toUpperCase()}`;
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, "Purchase Invoice", undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: "Invoice #", value: invNo },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Buyer", value: entityName },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
    ], y);

    const materialMap = new Map<string, { name: string; qty: number; price: number; unit: string }>();
    collections.forEach((c) => {
      const mt = (c as any).material_types;
      const key = c.material_type_id;
      const existing = materialMap.get(key);
      if (existing) { existing.qty += Number(c.quantity); }
      else { materialMap.set(key, { name: mt?.name || "Unknown", qty: Number(c.quantity), price: Number(mt?.price_per_unit || 0), unit: mt?.unit || "kg" }); }
    });

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Quantity", x: 85 }, { label: "Unit Price", x: 120 }, { label: "Total (KES)", x: 155 },
    ], y, 180);

    let grandTotal = 0;
    let i = 0;
    materialMap.forEach((m) => {
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
    doc.save(`purchase-invoice-${invNo}.pdf`);
    toast.success("Purchase invoice downloaded");
  };

  const generateIndividualInvoice = async (payment: any) => {
    const doc = new jsPDF();
    const invNo = `PI-${payment.id.slice(0, 8).toUpperCase()}`;
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, "Purchase Invoice", undefined, pdfOrg);
    y = addDocMeta(doc, [
      { label: "Invoice #", value: invNo },
      { label: "Date", value: format(new Date(payment.created_at), "MMM d, yyyy") },
      { label: "Buyer", value: entityName },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
      { label: "Payment Phone", value: payment.phone_number },
    ], y);

    y = drawTableHeader(doc, [
      { label: "Description", x: 17 }, { label: "Amount (KES)", x: 150 },
    ], y, 180);

    drawTableRow(doc, y, 0, 180);
    doc.setFontSize(8);
    doc.text(payment.description || "Material Purchase", 17, y);
    doc.text(Number(payment.amount).toLocaleString(), 150, y);
    y += 10;

    y = drawVatTotalBlock(doc, Number(payment.amount), vat.vatPercent, vat.includeVat, y);

    if (payment.mpesa_receipt_number) {
      doc.setFontSize(9);
      doc.text(`M-Pesa Receipt: ${payment.mpesa_receipt_number}`, 15, y);
    }

    finalizeCleanPdf(doc);
    doc.save(`purchase-invoice-${invNo}.pdf`);
    toast.success("Invoice downloaded");
  };

  return (
    <div className="space-y-6">
      <VatOptions value={vat} onChange={setVat} />

      <Card className="shadow-soft">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Bulk Purchase Invoice</p>
              <p className="text-xs text-muted-foreground">Generate a PDF invoice for all purchased materials</p>
            </div>
          </div>
          <Button size="sm" onClick={generatePurchaseInvoice} disabled={!collections?.length}>
            <Download className="w-4 h-4 mr-1" /> Generate
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Payment History</CardTitle></CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground">No purchase payments recorded.</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{p.phone_number} · {format(new Date(p.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.mpesa_receipt_number && (
                      <span className="text-xs font-mono text-muted-foreground">{p.mpesa_receipt_number}</span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => generateIndividualInvoice(p)} title="Download Invoice">
                      <Download className="w-4 h-4" />
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

export default PurchaseInvoicesPanel;
