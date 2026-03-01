import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const PurchaseInvoicesPanel = () => {
  const { user, profile } = useAuth();

  const { data: payments } = useQuery({
    queryKey: ["recycler_purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: collections } = useQuery({
    queryKey: ["recycler_invoice_collections", user?.id],
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

  const generatePurchaseInvoice = () => {
    if (!collections?.length) return;
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");
    const invNo = `PI-${Date.now().toString(36).toUpperCase()}`;

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Purchase Invoice", 20, 30);
    doc.setTextColor(0);

    doc.text(`Invoice #: ${invNo}`, 20, 44);
    doc.text(`Date: ${today}`, 20, 51);
    doc.text(`Buyer: ${profile?.full_name || "Recycler"}`, 20, 58);
    if (profile?.phone_number) doc.text(`Phone: ${profile.phone_number}`, 20, 65);

    const materialMap = new Map<string, { name: string; qty: number; price: number; unit: string }>();
    collections.forEach((c) => {
      const mt = (c as any).material_types;
      const key = c.material_type_id;
      const existing = materialMap.get(key);
      if (existing) {
        existing.qty += Number(c.quantity);
      } else {
        materialMap.set(key, {
          name: mt?.name || "Unknown",
          qty: Number(c.quantity),
          price: Number(mt?.price_per_unit || 0),
          unit: mt?.unit || "kg",
        });
      }
    });

    let y = 80;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text("Material", 22, y);
    doc.text("Quantity", 85, y);
    doc.text("Unit Price", 120, y);
    doc.text("Total (KES)", 155, y);
    doc.setTextColor(0);

    let grandTotal = 0;
    y += 10;
    materialMap.forEach((m) => {
      const total = m.qty * m.price;
      grandTotal += total;
      doc.text(m.name, 22, y);
      doc.text(`${m.qty.toFixed(1)} ${m.unit}`, 85, y);
      doc.text(m.price.toFixed(2), 120, y);
      doc.text(total.toLocaleString(), 155, y);
      y += 8;
    });

    y += 4;
    doc.line(20, y - 3, 190, y - 3);
    doc.setFontSize(12);
    doc.text(`Total: KES ${grandTotal.toLocaleString()}`, 110, y + 5);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated purchase invoice — Duara Flow", 20, 280);
    doc.save(`purchase-invoice-${invNo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Purchase Invoice</p>
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
                  {p.mpesa_receipt_number && (
                    <span className="text-xs font-mono text-muted-foreground">{p.mpesa_receipt_number}</span>
                  )}
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
