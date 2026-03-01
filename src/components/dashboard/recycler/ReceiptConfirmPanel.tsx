import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ClipboardCheck, Truck } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const ReceiptConfirmPanel = () => {
  const { user, profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["recycler_receipts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .order("collected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generateReceiptConfirmation = (batch: typeof collections) => {
    if (!batch?.length) return;
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");
    const rcNo = `RC-${Date.now().toString(36).toUpperCase()}`;

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Material Receipt Confirmation", 20, 30);
    doc.setTextColor(0);

    doc.text(`Document #: ${rcNo}`, 20, 44);
    doc.text(`Date: ${today}`, 20, 51);
    doc.text(`Received by: ${profile?.full_name || "Recycler"}`, 20, 58);

    let y = 74;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text("Batch ID", 22, y);
    doc.text("Material", 65, y);
    doc.text("Quantity", 115, y);
    doc.text("Date Collected", 150, y);
    doc.setTextColor(0);

    y += 10;
    let totalQty = 0;
    batch.forEach((c) => {
      if (y > 260) { doc.addPage(); y = 20; }
      const mt = (c as any).material_types;
      doc.setFontSize(8);
      doc.text(c.batch_id, 22, y);
      doc.text(mt?.name || "—", 65, y);
      const qty = Number(c.quantity);
      totalQty += qty;
      doc.text(`${qty.toFixed(1)} ${mt?.unit || "kg"}`, 115, y);
      doc.text(format(new Date(c.collected_at), "MMM d, yy"), 150, y);
      y += 7;
    });

    y += 8;
    doc.setFontSize(10);
    doc.text(`Total received: ${totalQty.toFixed(1)} kg`, 20, y);

    y += 16;
    doc.setFontSize(9);
    doc.text("Condition: ☐ Good  ☐ Acceptable  ☐ Poor", 20, y);
    y += 12;
    doc.text("Received by: ____________________________", 20, y);
    y += 12;
    doc.text("Signature: ____________________________", 20, y);
    y += 12;
    doc.text("Date: ____________________________", 20, y);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated receipt confirmation — Duara Flow", 20, 285);
    doc.save(`receipt-confirmation-${rcNo}.pdf`);
  };

  // Group by batch
  const batchMap = new Map<string, typeof collections>();
  collections?.forEach((c) => {
    const arr = batchMap.get(c.batch_id) || [];
    arr.push(c);
    batchMap.set(c.batch_id, arr);
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Bulk Receipt Confirmation</p>
              <p className="text-xs text-muted-foreground">Generate a confirmation document for all recent deliveries</p>
            </div>
          </div>
          <Button size="sm" onClick={() => generateReceiptConfirmation(collections || [])} disabled={!collections?.length}>
            <Download className="w-4 h-4 mr-1" /> Download All
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Recent Batches</CardTitle></CardHeader>
        <CardContent>
          {!batchMap.size ? (
            <p className="text-sm text-muted-foreground">No deliveries to confirm.</p>
          ) : (
            <div className="divide-y divide-border">
              {Array.from(batchMap.entries()).slice(0, 15).map(([batchId, items]) => {
                const totalQty = items!.reduce((s, c) => s + Number(c.quantity), 0);
                return (
                  <div key={batchId} className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3">
                      <Truck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground font-mono">{batchId}</p>
                        <p className="text-xs text-muted-foreground">{items!.length} items · {totalQty.toFixed(1)} kg</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => generateReceiptConfirmation(items!)}>
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
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

export default ReceiptConfirmPanel;
