import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

const CountyReportsPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["county-reports-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["county-reports-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["county-reports-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getMonthData = (monthOffset: number) => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const monthName = targetMonth.toLocaleString("default", { month: "long", year: "numeric" });

    const monthCollections = collections?.filter((c) => {
      const d = new Date(c.collected_at);
      return d >= targetMonth && d <= monthEnd;
    }) || [];

    const monthPayments = payments?.filter((p) => {
      const d = new Date(p.created_at);
      return d >= targetMonth && d <= monthEnd;
    }) || [];

    const totalKg = monthCollections.reduce((s, c) => s + Number(c.quantity), 0);
    const totalPaid = monthPayments.reduce((s, p) => s + Number(p.amount), 0);

    const materialBreakdown: Record<string, number> = {};
    monthCollections.forEach((c) => {
      const name = (c as any).material_types?.name || "Unknown";
      materialBreakdown[name] = (materialBreakdown[name] || 0) + Number(c.quantity);
    });

    const locationBreakdown: Record<string, number> = {};
    monthCollections.forEach((c) => {
      const loc = c.location_name || "Unknown";
      locationBreakdown[loc] = (locationBreakdown[loc] || 0) + Number(c.quantity);
    });

    return { monthName, monthCollections, monthPayments, totalKg, totalPaid, materialBreakdown, locationBreakdown, targetMonth, monthEnd };
  };

  const generateMonthlyReport = (monthOffset: number) => {
    const { monthName, monthCollections, totalKg, totalPaid, materialBreakdown, locationBreakdown } = getMonthData(monthOffset);

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("County Waste Management Report", 20, 20);
    doc.setFontSize(12);
    doc.text(monthName, 20, 30);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 38);

    let y = 55;
    doc.setFontSize(12);
    doc.text("Summary", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Total Collections: ${monthCollections.length}`, 25, y); y += 7;
    doc.text(`Total Weight: ${totalKg.toFixed(1)} kg (${(totalKg / 1000).toFixed(2)} tons)`, 25, y); y += 7;
    doc.text(`CO₂ Offset: ${(totalKg * 2.5).toFixed(1)} kg`, 25, y); y += 7;
    doc.text(`Water Saved: ${(totalKg * 18).toFixed(0)} liters`, 25, y); y += 7;
    doc.text(`Active Collectors: ${new Set(monthCollections.map((c) => c.user_id)).size}`, 25, y); y += 7;
    doc.text(`Total Payments: KES ${totalPaid.toLocaleString()}`, 25, y); y += 15;

    doc.setFontSize(12);
    doc.text("Material Breakdown", 20, y); y += 10;
    doc.setFontSize(10);
    Object.entries(materialBreakdown).forEach(([name, kg]) => {
      doc.text(`${name}: ${kg.toFixed(1)} kg (${totalKg > 0 ? ((kg / totalKg) * 100).toFixed(1) : 0}%)`, 25, y);
      y += 7;
    });

    y += 5;
    doc.setFontSize(12);
    doc.text("Location Breakdown", 20, y); y += 10;
    doc.setFontSize(10);
    Object.entries(locationBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, kg]) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${name}: ${kg.toFixed(1)} kg`, 25, y);
      y += 7;
    });

    y += 5;
    doc.setFontSize(12);
    doc.text("Platform Users", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Total Registered: ${profiles?.length || 0}`, 25, y); y += 7;
    doc.text(`Approved: ${profiles?.filter((p) => p.approval_status === "approved").length || 0}`, 25, y); y += 7;
    doc.text(`Pending: ${profiles?.filter((p) => p.approval_status === "pending").length || 0}`, 25, y);

    doc.save(`county-report-${monthName.replace(" ", "-").toLowerCase()}.pdf`);
    toast.success(`${monthName} report downloaded`);
  };

  const exportCSV = (monthOffset: number) => {
    const { monthName, monthCollections, monthPayments } = getMonthData(monthOffset);

    const rows = [
      ["County Waste Report - " + monthName],
      [],
      ["=== COLLECTIONS ==="],
      ["Date", "Material", "Quantity (kg)", "Location", "Batch ID"],
      ...monthCollections.map((c) => [
        new Date(c.collected_at).toLocaleDateString(),
        (c as any).material_types?.name || "Unknown",
        String(Number(c.quantity).toFixed(1)),
        c.location_name || "—",
        c.batch_id,
      ]),
      [],
      ["=== PAYMENTS ==="],
      ["Date", "Phone", "Amount (KES)", "Status", "Receipt"],
      ...monthPayments.map((p) => [
        new Date(p.created_at).toLocaleDateString(),
        p.phone_number,
        String(p.amount),
        p.status,
        p.mpesa_receipt_number || "—",
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `county-report-${monthName.replace(" ", "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${monthName} CSV exported`);
  };

  const months = [0, 1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Monthly County Waste Reports</h2>
        <p className="text-muted-foreground">Download comprehensive monthly waste management reports with collections, payments, and environmental data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((offset) => {
          const d = new Date();
          d.setMonth(d.getMonth() - offset);
          const label = d.toLocaleString("default", { month: "long", year: "numeric" });
          return (
            <Card key={offset} className="hover:shadow-soft transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">County Waste Report</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => generateMonthlyReport(offset)} className="gap-1 flex-1">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportCSV(offset)} className="gap-1 flex-1">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CountyReportsPanel;
