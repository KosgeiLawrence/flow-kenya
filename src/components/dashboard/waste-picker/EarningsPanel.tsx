import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Download, Smartphone, FileText, Leaf } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { calculateImpact, formatImpactMessage } from "@/lib/impactUtils";
import { addBrandedHeader, addCleanHeader, addDocMeta, addSectionTitle, drawTableHeader, drawTableRow, drawTotalLine, finalizePdf, finalizeCleanPdf } from "@/lib/pdfBranding";

const EarningsPanel = () => {
  const { user, profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["collections_earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name, unit, price_per_unit)").eq("user_id", user!.id).order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const impact = calculateImpact((collections || []).map(c => ({ quantity: c.quantity, material_types: (c as any).material_types })));
  const totalPaid = payments?.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const downloadReceipt = async (payment: any) => {
    const doc = new jsPDF();
    let y = addCleanHeader(doc, "Payment Receipt");
    y = addDocMeta(doc, [
      { label: "Receipt #", value: payment.mpesa_receipt_number || payment.id.slice(0, 8) },
      { label: "Date", value: format(new Date(payment.created_at), "MMM d, yyyy h:mm a") },
      { label: "Amount", value: `KES ${Number(payment.amount).toFixed(2)}` },
      { label: "Phone", value: payment.phone_number },
      { label: "Status", value: payment.status },
      ...(payment.description ? [{ label: "Description", value: payment.description }] : []),
    ], y);
    finalizeCleanPdf(doc);
    doc.save(`receipt-${payment.id.slice(0, 8)}.pdf`);
  };

  const downloadImpactReport = async () => {
    if (!collections?.length) return;
    const doc = new jsPDF();

    let y = await addBrandedHeader(doc, "Personal Sustainability Impact Report");
    y = addDocMeta(doc, [
      { label: "Name", value: profile?.full_name || "Waste Picker" },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      ...(profile?.phone_number ? [{ label: "Phone", value: profile.phone_number }] : []),
    ], y);

    y = addSectionTitle(doc, "Environmental Impact Summary", y);
    doc.setFontSize(10);
    const impactLines = [
      `Total Materials Collected: ${impact.totalKg.toFixed(1)} kg`,
      `Carbon Emissions Avoided: ${impact.co2Avoided.toFixed(1)} kg CO₂`,
      `Water Saved: ${impact.waterSaved.toFixed(0)} liters`,
      `Landfill Space Reduced: ${impact.landfillReduced.toFixed(3)} m³`,
      `Total Earnings: KES ${impact.totalEarnings.toFixed(2)}`,
    ];
    impactLines.forEach(l => { doc.text(l, 17, y); y += 8; });

    y += 6;
    y = addSectionTitle(doc, "Material Breakdown", y);

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Quantity (kg)", x: 90 }, { label: "CO₂ Avoided (kg)", x: 140 },
    ], y, 180);

    impact.materialBreakdown.forEach((m, i) => {
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(m.name, 17, y); doc.text(m.kg.toFixed(1), 90, y); doc.text(m.co2.toFixed(1), 140, y);
      y += 8;
    });

    await finalizePdf(doc);
    doc.save(`impact-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const downloadQuotation = async () => {
    if (!collections?.length) return;
    const doc = new jsPDF();
    const quoteId = `Q-${Date.now().toString(36).toUpperCase()}`;

    let y = addCleanHeader(doc, "Waste Collection Quotation");
    y = addDocMeta(doc, [
      { label: "Quotation #", value: quoteId },
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Prepared for", value: profile?.full_name || "Waste Picker" },
      ...(profile?.phone_number ? [{ label: "Phone", value: profile.phone_number }] : []),
    ], y);

    y = drawTableHeader(doc, [
      { label: "Material", x: 17 }, { label: "Qty", x: 90 }, { label: "Unit Price (KES)", x: 115 }, { label: "Total (KES)", x: 160 },
    ], y, 180);

    const materialMap = new Map<string, { name: string; qty: number; price: number; unit: string }>();
    collections.forEach((c) => {
      const mt = (c as any).material_types;
      const key = c.material_type_id;
      const existing = materialMap.get(key);
      if (existing) { existing.qty += Number(c.quantity); }
      else { materialMap.set(key, { name: mt?.name || "Unknown", qty: Number(c.quantity), price: Number(mt?.price_per_unit || 0), unit: mt?.unit || "kg" }); }
    });

    let grandTotal = 0; let i = 0;
    materialMap.forEach((m) => {
      const lineTotal = m.qty * m.price; grandTotal += lineTotal;
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(m.name, 17, y); doc.text(`${m.qty.toFixed(1)} ${m.unit}`, 90, y);
      doc.text(m.price.toFixed(2), 115, y); doc.text(lineTotal.toFixed(2), 160, y);
      y += 8; i++;
    });

    y += 4;
    drawTotalLine(doc, `Grand Total: KES ${grandTotal.toFixed(2)}`, y);
    y += 10;
    doc.setFontSize(8);
    doc.text("This quotation is valid for 7 days from the date of issue.", 15, y);

    finalizeCleanPdf(doc);
    doc.save(`quotation-${quoteId}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p><p className="text-2xl font-display font-bold text-primary">KES {impact.totalEarnings.toFixed(0)}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid Out</p><p className="text-2xl font-display font-bold text-foreground">KES {totalPaid.toFixed(0)}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p><p className="text-2xl font-display font-bold text-gold">KES {(impact.totalEarnings - totalPaid).toFixed(0)}</p></CardContent></Card>
        <Card className="shadow-soft border-primary/20"><CardContent className="p-4"><div className="flex items-center gap-1.5 mb-1"><Leaf className="w-3.5 h-3.5 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wider">CO₂ Avoided</p></div><p className="text-2xl font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)} kg</p></CardContent></Card>
      </div>

      {collections && collections.length > 0 && (
        <Card className="shadow-soft bg-primary/5 border-primary/20">
          <CardContent className="flex items-start gap-3 p-4">
            <Leaf className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Your Sustainability Impact</p>
              <p className="text-sm text-muted-foreground">{formatImpactMessage(impact.totalKg)} You've also saved {impact.waterSaved.toFixed(0)} liters of water and diverted {impact.landfillReduced.toFixed(3)} m³ from landfills.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-soft"><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-primary" /><div><p className="text-sm font-medium text-foreground">Collection Quotation</p><p className="text-xs text-muted-foreground">Materials & value summary</p></div></div><Button size="sm" variant="outline" onClick={downloadQuotation} disabled={!collections?.length}><Download className="w-4 h-4 mr-1" /> PDF</Button></CardContent></Card>
        <Card className="shadow-soft border-primary/20"><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><Leaf className="w-5 h-5 text-primary" /><div><p className="text-sm font-medium text-foreground">Impact Report</p><p className="text-xs text-muted-foreground">CO₂, water, landfill metrics</p></div></div><Button size="sm" variant="outline" onClick={downloadImpactReport} disabled={!collections?.length}><Download className="w-4 h-4 mr-1" /> PDF</Button></CardContent></Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">M-Pesa Payment History</CardTitle><Smartphone className="w-5 h-5 text-primary" /></div></CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !payments?.length ? (
            <div className="text-center py-8 text-muted-foreground"><DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No payments yet.</p></div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">KES {Number(p.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy • h:mm a")} • {p.phone_number}</p>
                    {p.mpesa_receipt_number && <p className="text-xs text-muted-foreground">Ref: {p.mpesa_receipt_number}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => downloadReceipt(p)} title="Download receipt"><Download className="w-4 h-4" /></Button>
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

export default EarningsPanel;
