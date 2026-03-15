import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { addCleanHeader, addDocMeta, drawTableHeader, drawTableRow, drawTotalLine, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo } from "@/lib/pdfBranding";

const BulkReceiptsPanel = () => {
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();

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

  const getOrgPdfInfo = async () => {
    if (!orgInfo) return null;
    let logoBase64: string | null = null;
    if (orgInfo.orgLogoUrl) logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
    return buildPdfOrgInfo(orgInfo, logoBase64);
  };

  const entityName = orgInfo?.orgName || profile?.full_name || "Aggregator";

  const downloadBulkReceipt = async () => {
    if (!payments?.length) return;
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, "Bulk Payment Receipt", "Combined receipt for all completed payments", pdfOrg);

    y = addDocMeta(doc, [
      { label: "Date", value: today },
      { label: "Aggregator", value: entityName },
      ...(orgInfo?.contactPhone ? [{ label: "Phone", value: orgInfo.contactPhone }] : []),
    ], y);

    y = drawTableHeader(doc, [
      { label: "Date", x: 17 },
      { label: "Phone", x: 55 },
      { label: "Receipt #", x: 95 },
      { label: "Amount (KES)", x: 145 },
    ], y, 180);

    let totalAmount = 0;
    payments.forEach((p, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(format(new Date(p.created_at), "MMM d, yy"), 17, y);
      doc.text(p.phone_number, 55, y);
      doc.text(p.mpesa_receipt_number || "—", 95, y);
      doc.text(Number(p.amount).toLocaleString(), 145, y);
      totalAmount += Number(p.amount);
      y += 7;
    });

    y += 4;
    drawTotalLine(doc, `Total: KES ${totalAmount.toLocaleString()}`, y);

    finalizeCleanPdf(doc);
    doc.save(`bulk-receipt-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const downloadSingleReceipt = async (payment: any) => {
    const doc = new jsPDF();
    const pdfOrg = await getOrgPdfInfo();

    let y = addCleanHeader(doc, "Payment Receipt", undefined, pdfOrg);

    y = addDocMeta(doc, [
      { label: "Date", value: format(new Date(payment.created_at), "MMM d, yyyy") },
      { label: "Amount", value: `KES ${Number(payment.amount).toLocaleString()}` },
      { label: "Phone", value: payment.phone_number },
      { label: "Receipt #", value: payment.mpesa_receipt_number || "N/A" },
      { label: "Status", value: payment.status },
      ...(payment.description ? [{ label: "Description", value: payment.description }] : []),
    ], y);

    finalizeCleanPdf(doc);
    doc.save(`receipt-${payment.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
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