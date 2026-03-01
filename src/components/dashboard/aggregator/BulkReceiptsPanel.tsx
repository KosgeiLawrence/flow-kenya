import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const BulkReceiptsPanel = () => {
  const { user, profile } = useAuth();

  const { data: payments } = useQuery({
    queryKey: ["aggregator_bulk_payments", user?.id],
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

  const downloadBulkReceipt = () => {
    if (!payments?.length) return;
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(20);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Bulk Payment Receipt", 20, 30);
    doc.setTextColor(0);

    doc.text(`Date: ${today}`, 20, 44);
    doc.text(`Aggregator: ${profile?.full_name || "Aggregator"}`, 20, 51);
    if (profile?.phone_number) doc.text(`Phone: ${profile.phone_number}`, 20, 58);

    // Table header
    let y = 72;
    doc.setFillColor(34, 87, 62);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(8);
    doc.text("Date", 22, y);
    doc.text("Phone", 55, y);
    doc.text("Receipt #", 95, y);
    doc.text("Amount (KES)", 145, y);
    doc.setTextColor(0);

    let totalAmount = 0;
    y += 8;
    payments.forEach((p) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(8);
      doc.text(format(new Date(p.created_at), "MMM d, yy"), 22, y);
      doc.text(p.phone_number, 55, y);
      doc.text(p.mpesa_receipt_number || "—", 95, y);
      doc.text(Number(p.amount).toLocaleString(), 145, y);
      totalAmount += Number(p.amount);
      y += 7;
    });

    y += 4;
    doc.setDrawColor(200);
    doc.line(20, y - 3, 190, y - 3);
    doc.setFontSize(11);
    doc.text(`Total: KES ${totalAmount.toLocaleString()}`, 120, y + 4);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated bulk receipt — Duara Flow", 20, 285);

    doc.save(`bulk-receipt-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const downloadSingleReceipt = (payment: any) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Payment Receipt", 20, 30);
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(payment.created_at), "MMM d, yyyy")}`, 20, 44);
    doc.text(`Amount: KES ${Number(payment.amount).toLocaleString()}`, 20, 52);
    doc.text(`Phone: ${payment.phone_number}`, 20, 60);
    doc.text(`Receipt #: ${payment.mpesa_receipt_number || "N/A"}`, 20, 68);
    doc.text(`Status: ${payment.status}`, 20, 76);
    if (payment.description) doc.text(`Description: ${payment.description}`, 20, 84);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text("System-generated receipt — Duara Flow", 20, 100);
    doc.save(`receipt-${payment.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Bulk download */}
      <Card className="shadow-soft">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <Printer className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Bulk Payment Receipt</p>
              <p className="text-xs text-muted-foreground">
                Download a combined PDF of all {payments?.length || 0} completed payments
              </p>
            </div>
          </div>
          <Button size="sm" onClick={downloadBulkReceipt} disabled={!payments?.length}>
            <Download className="w-4 h-4 mr-1" /> Download All
          </Button>
        </CardContent>
      </Card>

      {/* Individual receipts */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Individual Receipts</CardTitle></CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground">No completed payments.</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.phone_number} · {format(new Date(p.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => downloadSingleReceipt(p)}>
                    <FileText className="w-4 h-4 mr-1" /> PDF
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

export default BulkReceiptsPanel;
