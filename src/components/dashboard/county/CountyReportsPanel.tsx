import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
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

  const generateMonthlyReport = (monthOffset: number) => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const monthName = targetMonth.toLocaleString("default", { month: "long", year: "numeric" });

    const monthCollections = collections?.filter((c) => {
      const d = new Date(c.collected_at);
      return d >= targetMonth && d <= monthEnd;
    }) || [];

    const totalKg = monthCollections.reduce((s, c) => s + Number(c.quantity), 0);
    const materialBreakdown: Record<string, number> = {};
    monthCollections.forEach((c) => {
      const name = (c as any).material_types?.name || "Unknown";
      materialBreakdown[name] = (materialBreakdown[name] || 0) + Number(c.quantity);
    });

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
    doc.text(`Active Collectors: ${new Set(monthCollections.map((c) => c.user_id)).size}`, 25, y); y += 15;

    doc.setFontSize(12);
    doc.text("Material Breakdown", 20, y); y += 10;
    doc.setFontSize(10);
    Object.entries(materialBreakdown).forEach(([name, kg]) => {
      doc.text(`${name}: ${kg.toFixed(1)} kg (${totalKg > 0 ? ((kg / totalKg) * 100).toFixed(1) : 0}%)`, 25, y);
      y += 7;
    });

    y += 10;
    doc.setFontSize(12);
    doc.text("Registered Users", 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Total Registered: ${profiles?.length || 0}`, 25, y); y += 7;
    doc.text(`Approved: ${profiles?.filter((p) => p.approval_status === "approved").length || 0}`, 25, y); y += 7;
    doc.text(`Pending: ${profiles?.filter((p) => p.approval_status === "pending").length || 0}`, 25, y);

    doc.save(`county-report-${monthName.replace(" ", "-").toLowerCase()}.pdf`);
    toast.success(`${monthName} report downloaded`);
  };

  const months = [0, 1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Monthly County Waste Reports</h2>
        <p className="text-muted-foreground">Download comprehensive monthly waste management reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((offset) => {
          const d = new Date();
          d.setMonth(d.getMonth() - offset);
          const label = d.toLocaleString("default", { month: "long", year: "numeric" });
          return (
            <Card key={offset} className="hover:shadow-soft transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">County Waste Report</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => generateMonthlyReport(offset)} className="gap-1">
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CountyReportsPanel;
