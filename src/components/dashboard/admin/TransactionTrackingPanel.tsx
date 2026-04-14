import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Clock, CheckCircle2, Download } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { addBrandedHeader, addDocMeta, addSectionTitle, drawTableHeader, drawTableRow, finalizePdf } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const TransactionTrackingPanel = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => { const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const filtered = payments?.filter((p) => statusFilter === "all" || p.status === statusFilter) || [];
  const total = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const completed = payments?.filter((p) => p.status === "completed") || [];
  const pending = payments?.filter((p) => p.status === "pending") || [];
  const failed = payments?.filter((p) => p.status === "failed") || [];
  const completedTotal = completed.reduce((s, p) => s + Number(p.amount), 0);
  const commission = completedTotal * 0.025;

  const dailyRevenue = (() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days[d.toISOString().split("T")[0]] = 0; }
    payments?.forEach((p) => { if (p.status === "completed") { const day = p.created_at.split("T")[0]; if (days[day] !== undefined) days[day] += Number(p.amount); } });
    return Object.entries(days).map(([date, amount]) => ({ date: date.slice(5), amount: Math.round(amount) }));
  })();

  const chartConfig = { amount: { label: "KES", color: "hsl(152,45%,22%)" } };
  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: "bg-secondary/20 text-secondary", completed: "bg-primary/20 text-primary", failed: "bg-destructive/20 text-destructive" };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  const exportTransactionReport = async () => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "Transaction & Commission Report", "Platform financial activity overview");
    y = addDocMeta(doc, [{ label: "Generated", value: new Date().toLocaleString() }], y);

    y = addSectionTitle(doc, "Financial Summary", y);
    doc.setFontSize(10);
    [`Total Volume: KES ${total.toLocaleString()}`, `Completed: KES ${completedTotal.toLocaleString()} (${completed.length} txns)`, `Pending: ${pending.length} transactions`, `Failed: ${failed.length} transactions`, `Platform Commission (2.5%): KES ${commission.toLocaleString()}`].forEach(l => { doc.text(l, 20, y); y += 7; });
    y += 8;

    y = addSectionTitle(doc, "Recent Transactions", y);
    y = drawTableHeader(doc, [
      { label: "Date", x: 17 }, { label: "Phone", x: 55 }, { label: "Amount", x: 95 }, { label: "Status", x: 130 }, { label: "Receipt", x: 160 },
    ], y, 180);

    filtered.slice(0, 50).forEach((p, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(7);
      doc.text(new Date(p.created_at).toLocaleDateString(), 17, y);
      doc.text(p.phone_number, 55, y);
      doc.text(`KES ${Number(p.amount).toLocaleString()}`, 95, y);
      doc.text(p.status, 130, y);
      doc.text(p.mpesa_receipt_number || "—", 160, y);
      y += 5;
    });

    await finalizePdf(doc);
    doc.save("transaction-report.pdf");
    toast.success("Transaction report downloaded");
  };

  const exportCSV = () => {
    const rows = [["Date", "Phone", "Amount", "Status", "M-Pesa Receipt", "Description"]];
    (filtered || []).forEach((p) => { rows.push([new Date(p.created_at).toLocaleString(), p.phone_number, String(p.amount), p.status, p.mpesa_receipt_number || "", p.description || ""]); });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-display font-bold text-foreground">Transaction & Commission Tracking</h2><p className="text-muted-foreground">Monitor all platform financial activity</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" /> CSV</Button>
          <Button onClick={exportTransactionReport} className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total Volume", value: `KES ${total.toLocaleString()}`, icon: DollarSign },
          { label: "Completed", value: `KES ${completedTotal.toLocaleString()}`, icon: CheckCircle2 },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Failed", value: failed.length, icon: Clock },
          { label: "Platform Commission", value: `KES ${Math.round(commission).toLocaleString()}`, icon: TrendingUp },
        ].map((s) => (<Card key={s.label}><CardContent className="p-4 flex items-center gap-3"><s.icon className="w-8 h-8 text-primary" /><div><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>))}
      </div>

      <Card><CardHeader><CardTitle className="text-base">Daily Revenue (14 days)</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[220px]"><LineChart data={dailyRevenue}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="amount" stroke="hsl(152,45%,22%)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ChartContainer></CardContent></Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Transactions</CardTitle><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Phone</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>M-Pesa Receipt</TableHead><TableHead>Description</TableHead></TableRow></TableHeader><TableBody>{filtered.slice(0, 50).map((p) => (<TableRow key={p.id}><TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</TableCell><TableCell>{p.phone_number}</TableCell><TableCell className="font-medium">KES {Number(p.amount).toLocaleString()}</TableCell><TableCell>{statusBadge(p.status)}</TableCell><TableCell className="text-xs text-muted-foreground">{p.mpesa_receipt_number || "—"}</TableCell><TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.description || "—"}</TableCell></TableRow>))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionTrackingPanel;
