import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths, subWeeks } from "date-fns";
import jsPDF from "jspdf";
import { addBrandedHeader, addSectionTitle, addDocMeta, drawTableHeader, drawTableRow, drawTotalLine, finalizePdf, PDF_COLORS } from "@/lib/pdfBranding";

type UserRole = "waste_picker" | "aggregator" | "recycler";

interface Props {
  role: UserRole;
}

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const FinancialReportsPanel = ({ role }: Props) => {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["financial_transactions_reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*, financial_categories(name, icon, type)")
        .eq("user_id", user!.id)
        .order("transaction_date", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const now = new Date();

  const dateRange = useMemo(() => {
    if (period === "daily") return { start: startOfDay(now), end: endOfDay(now), label: format(now, "MMM d, yyyy") };
    if (period === "weekly") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now, label: `Week of ${format(startOfWeek(now, { weekStartsOn: 1 }), "MMM d")}` };
    if (period === "monthly") return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, "MMMM yyyy") };
    if (period === "yearly") return { start: startOfYear(now), end: endOfYear(now), label: format(now, "yyyy") };
    return { start: new Date(customFrom), end: endOfDay(new Date(customTo)), label: `${format(new Date(customFrom), "MMM d")} – ${format(new Date(customTo), "MMM d, yyyy")}` };
  }, [period, customFrom, customTo]);

  const filteredTxs = useMemo(() => {
    return (transactions || []).filter(t => {
      const d = new Date(t.transaction_date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // P&L data
  const pnl = useMemo(() => {
    const incomeByCategory = new Map<string, number>();
    const expenseByCategory = new Map<string, number>();
    let totalIncome = 0, totalExpenses = 0;

    filteredTxs.forEach(t => {
      const catName = t.financial_categories?.name || "Uncategorized";
      const amount = Number(t.amount);
      if (t.type === "income") {
        incomeByCategory.set(catName, (incomeByCategory.get(catName) || 0) + amount);
        totalIncome += amount;
      } else {
        expenseByCategory.set(catName, (expenseByCategory.get(catName) || 0) + amount);
        totalExpenses += amount;
      }
    });

    return {
      incomeLines: Array.from(incomeByCategory.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
      expenseLines: Array.from(expenseByCategory.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    };
  }, [filteredTxs]);

  // Cash Flow data
  const cashFlow = useMemo(() => {
    const byMethod = new Map<string, { inflow: number; outflow: number }>();
    filteredTxs.forEach(t => {
      const method = t.payment_method || "cash";
      const entry = byMethod.get(method) || { inflow: 0, outflow: 0 };
      if (t.type === "income") entry.inflow += Number(t.amount);
      else entry.outflow += Number(t.amount);
      byMethod.set(method, entry);
    });

    // Get opening balance (all txs before period start)
    const priorTxs = (transactions || []).filter(t => new Date(t.transaction_date) < dateRange.start);
    const openingBalance = priorTxs.reduce((sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

    return {
      methods: Array.from(byMethod.entries()).map(([method, data]) => ({ method: method === "mpesa" ? "M-Pesa" : method === "bank" ? "Bank Transfer" : method === "cash" ? "Cash" : method, ...data, net: data.inflow - data.outflow })),
      totalInflow: pnl.totalIncome,
      totalOutflow: pnl.totalExpenses,
      netCashFlow: pnl.netProfit,
      openingBalance,
      closingBalance: openingBalance + pnl.netProfit,
    };
  }, [filteredTxs, transactions, dateRange, pnl]);

  // Balance Sheet data
  const balanceSheet = useMemo(() => {
    const allTxs = transactions || [];
    const totalIncome = allTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = allTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const cashBalance = totalIncome - totalExpenses;

    // Break down by payment method for assets
    const cashByMethod = new Map<string, number>();
    allTxs.forEach(t => {
      const method = t.payment_method || "cash";
      const current = cashByMethod.get(method) || 0;
      cashByMethod.set(method, current + (t.type === "income" ? Number(t.amount) : -Number(t.amount)));
    });

    return {
      assets: Array.from(cashByMethod.entries()).map(([method, amount]) => ({
        name: method === "mpesa" ? "M-Pesa Balance" : method === "bank" ? "Bank Balance" : method === "cash" ? "Cash in Hand" : `${method} Balance`,
        amount: Math.max(0, amount),
      })),
      totalAssets: Math.max(0, cashBalance),
      retainedEarnings: cashBalance,
      totalEquity: cashBalance,
    };
  }, [transactions]);

  const methodLabel = (m: string) => m === "mpesa" ? "📱 M-Pesa" : m === "bank" ? "🏦 Bank" : m === "cash" ? "💵 Cash" : m;

  // ── PDF Generation ──
  const generatePDF = async (reportType: "pnl" | "cashflow" | "balance") => {
    setGenerating(`pdf-${reportType}`);
    try {
      const doc = new jsPDF();
      const titleMap = { pnl: "Profit & Loss Statement", cashflow: "Cash Flow Statement", balance: "Balance Sheet" };
      let y = await addBrandedHeader(doc, titleMap[reportType], dateRange.label);
      y = addDocMeta(doc, [
        { label: "Prepared for", value: profile?.full_name || "User" },
        { label: "Period", value: dateRange.label },
        { label: "Generated", value: format(new Date(), "MMM d, yyyy h:mm a") },
      ], y);

      if (reportType === "pnl") {
        y = addSectionTitle(doc, "Revenue / Income", y);
        y = drawTableHeader(doc, [{ label: "Category", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
        pnl.incomeLines.forEach((line, i) => {
          drawTableRow(doc, y, i, 180);
          doc.setFontSize(9); doc.text(line.name, 17, y); doc.text(line.amount.toLocaleString(), 150, y);
          y += 8;
        });
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        y += 2; doc.text(`Total Income: KES ${pnl.totalIncome.toLocaleString()}`, 120, y); y += 12;

        doc.setTextColor(...PDF_COLORS.darkText);
        y = addSectionTitle(doc, "Expenses", y);
        y = drawTableHeader(doc, [{ label: "Category", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
        pnl.expenseLines.forEach((line, i) => {
          drawTableRow(doc, y, i, 180);
          doc.setFontSize(9); doc.text(line.name, 17, y); doc.text(line.amount.toLocaleString(), 150, y);
          y += 8;
        });
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        y += 2; doc.text(`Total Expenses: KES ${pnl.totalExpenses.toLocaleString()}`, 120, y); y += 10;

        y = drawTotalLine(doc, `Net Profit: KES ${pnl.netProfit.toLocaleString()}`, y);
      }

      if (reportType === "cashflow") {
        y = addSectionTitle(doc, "Cash Flow Summary", y);
        doc.setFontSize(9);
        doc.text(`Opening Balance: KES ${cashFlow.openingBalance.toLocaleString()}`, 17, y); y += 10;

        y = drawTableHeader(doc, [{ label: "Payment Method", x: 17 }, { label: "Inflow", x: 90 }, { label: "Outflow", x: 130 }, { label: "Net", x: 165 }], y, 180);
        cashFlow.methods.forEach((m, i) => {
          drawTableRow(doc, y, i, 180);
          doc.setFontSize(9);
          doc.text(m.method, 17, y); doc.text(m.inflow.toLocaleString(), 90, y);
          doc.text(m.outflow.toLocaleString(), 130, y); doc.text(m.net.toLocaleString(), 165, y);
          y += 8;
        });
        y += 4;
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        doc.text(`Total Inflow: KES ${cashFlow.totalInflow.toLocaleString()}`, 17, y); y += 7;
        doc.text(`Total Outflow: KES ${cashFlow.totalOutflow.toLocaleString()}`, 17, y); y += 10;
        y = drawTotalLine(doc, `Closing Balance: KES ${cashFlow.closingBalance.toLocaleString()}`, y);
      }

      if (reportType === "balance") {
        y = addSectionTitle(doc, "Assets", y);
        y = drawTableHeader(doc, [{ label: "Asset", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
        balanceSheet.assets.forEach((a, i) => {
          drawTableRow(doc, y, i, 180);
          doc.setFontSize(9); doc.text(a.name, 17, y); doc.text(a.amount.toLocaleString(), 150, y);
          y += 8;
        });
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        y += 2; doc.text(`Total Assets: KES ${balanceSheet.totalAssets.toLocaleString()}`, 120, y); y += 14;

        doc.setTextColor(...PDF_COLORS.darkText);
        y = addSectionTitle(doc, "Equity", y);
        doc.setFontSize(9);
        doc.text(`Retained Earnings: KES ${balanceSheet.retainedEarnings.toLocaleString()}`, 17, y); y += 10;
        y = drawTotalLine(doc, `Total Equity: KES ${balanceSheet.totalEquity.toLocaleString()}`, y);
      }

      await finalizePdf(doc);
      doc.save(`${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } finally {
      setGenerating(null);
    }
  };

  // ── Excel/CSV Generation ──
  const generateCSV = (reportType: "pnl" | "cashflow" | "balance") => {
    setGenerating(`csv-${reportType}`);
    try {
      let csv = "";
      const titleMap = { pnl: "Profit & Loss Statement", cashflow: "Cash Flow Statement", balance: "Balance Sheet" };
      csv += `${titleMap[reportType]}\n`;
      csv += `Period: ${dateRange.label}\n`;
      csv += `Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}\n\n`;

      if (reportType === "pnl") {
        csv += "INCOME\nCategory,Amount (KES)\n";
        pnl.incomeLines.forEach(l => { csv += `${l.name},${l.amount}\n`; });
        csv += `Total Income,${pnl.totalIncome}\n\n`;
        csv += "EXPENSES\nCategory,Amount (KES)\n";
        pnl.expenseLines.forEach(l => { csv += `${l.name},${l.amount}\n`; });
        csv += `Total Expenses,${pnl.totalExpenses}\n\n`;
        csv += `NET PROFIT,${pnl.netProfit}\n`;
      }

      if (reportType === "cashflow") {
        csv += `Opening Balance,${cashFlow.openingBalance}\n\n`;
        csv += "Payment Method,Inflow,Outflow,Net\n";
        cashFlow.methods.forEach(m => { csv += `${m.method},${m.inflow},${m.outflow},${m.net}\n`; });
        csv += `\nTotal Inflow,${cashFlow.totalInflow}\nTotal Outflow,${cashFlow.totalOutflow}\n`;
        csv += `Net Cash Flow,${cashFlow.netCashFlow}\nClosing Balance,${cashFlow.closingBalance}\n`;
      }

      if (reportType === "balance") {
        csv += "ASSETS\nAsset,Amount (KES)\n";
        balanceSheet.assets.forEach(a => { csv += `${a.name},${a.amount}\n`; });
        csv += `Total Assets,${balanceSheet.totalAssets}\n\n`;
        csv += "EQUITY\n";
        csv += `Retained Earnings,${balanceSheet.retainedEarnings}\n`;
        csv += `Total Equity,${balanceSheet.totalEquity}\n`;
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <Card className="shadow-soft">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap gap-1 bg-muted rounded-lg p-1">
            {(["daily", "weekly", "monthly", "yearly", "custom"] as PeriodType[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors min-w-[60px] ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {p === "daily" ? "📅 Day" : p === "weekly" ? "📆 Week" : p === "monthly" ? "🗓️ Month" : p === "yearly" ? "📊 Year" : "🔧 Custom"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">From</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm" /></div>
              <div><Label className="text-xs">To</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm" /></div>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">{dateRange.label} • {filteredTxs.length} transactions</p>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pnl" className="text-xs gap-1"><TrendingUp className="w-3.5 h-3.5" /> P&L</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs gap-1"><DollarSign className="w-3.5 h-3.5" /> Cash Flow</TabsTrigger>
          <TabsTrigger value="balance" className="text-xs gap-1"><FileText className="w-3.5 h-3.5" /> Balance</TabsTrigger>
        </TabsList>

        {/* ── Profit & Loss ── */}
        <TabsContent value="pnl">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Profit & Loss Statement</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generatePDF("pnl")} disabled={!!generating}>
                    {generating === "pdf-pnl" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generateCSV("pnl")} disabled={!!generating}>
                    <FileSpreadsheet className="w-3 h-3" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Income section */}
              <div>
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Revenue / Income
                </h4>
                {pnl.incomeLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No income recorded</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs h-8">Category</TableHead><TableHead className="text-xs h-8 text-right">Amount (KES)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pnl.incomeLines.map(l => (
                        <TableRow key={l.name}><TableCell className="text-xs py-1.5">{l.name}</TableCell><TableCell className="text-xs py-1.5 text-right font-medium">{l.amount.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="bg-primary/5 font-semibold"><TableCell className="text-xs py-2">Total Income</TableCell><TableCell className="text-xs py-2 text-right text-primary">{pnl.totalIncome.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Expenses section */}
              <div>
                <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" /> Expenses
                </h4>
                {pnl.expenseLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No expenses recorded</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs h-8">Category</TableHead><TableHead className="text-xs h-8 text-right">Amount (KES)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pnl.expenseLines.map(l => (
                        <TableRow key={l.name}><TableCell className="text-xs py-1.5">{l.name}</TableCell><TableCell className="text-xs py-1.5 text-right font-medium">{l.amount.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="bg-destructive/5 font-semibold"><TableCell className="text-xs py-2">Total Expenses</TableCell><TableCell className="text-xs py-2 text-right text-destructive">{pnl.totalExpenses.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Net Profit */}
              <Card className={`border-2 ${pnl.netProfit >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Net Profit / (Loss)</span>
                  <span className={`text-lg font-bold ${pnl.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                    KES {pnl.netProfit.toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cash Flow ── */}
        <TabsContent value="cashflow">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Cash Flow Statement</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generatePDF("cashflow")} disabled={!!generating}>
                    {generating === "pdf-cashflow" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generateCSV("cashflow")} disabled={!!generating}>
                    <FileSpreadsheet className="w-3 h-3" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Opening balance */}
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-xs font-medium">Opening Balance</span>
                <span className="text-sm font-bold">KES {cashFlow.openingBalance.toLocaleString()}</span>
              </div>

              {/* By method */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-8">Method</TableHead>
                    <TableHead className="text-xs h-8 text-right">Inflow</TableHead>
                    <TableHead className="text-xs h-8 text-right">Outflow</TableHead>
                    <TableHead className="text-xs h-8 text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashFlow.methods.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-xs text-center text-muted-foreground py-4">No transactions</TableCell></TableRow>
                  ) : cashFlow.methods.map(m => (
                    <TableRow key={m.method}>
                      <TableCell className="text-xs py-1.5">{m.method}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right text-primary">+{m.inflow.toLocaleString()}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right text-destructive">-{m.outflow.toLocaleString()}</TableCell>
                      <TableCell className={`text-xs py-1.5 text-right font-medium ${m.net >= 0 ? "text-primary" : "text-destructive"}`}>{m.net.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-md bg-primary/5 text-center">
                  <p className="text-[10px] text-muted-foreground">Inflow</p>
                  <p className="text-sm font-bold text-primary">+{cashFlow.totalInflow.toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-md bg-destructive/5 text-center">
                  <p className="text-[10px] text-muted-foreground">Outflow</p>
                  <p className="text-sm font-bold text-destructive">-{cashFlow.totalOutflow.toLocaleString()}</p>
                </div>
                <div className={`p-2 rounded-md text-center ${cashFlow.netCashFlow >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                  <p className="text-[10px] text-muted-foreground">Net</p>
                  <p className={`text-sm font-bold ${cashFlow.netCashFlow >= 0 ? "text-primary" : "text-destructive"}`}>{cashFlow.netCashFlow.toLocaleString()}</p>
                </div>
              </div>

              {/* Closing balance */}
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Closing Balance</span>
                  <span className="text-lg font-bold text-primary">KES {cashFlow.closingBalance.toLocaleString()}</span>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Balance Sheet ── */}
        <TabsContent value="balance">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Balance Sheet</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generatePDF("balance")} disabled={!!generating}>
                    {generating === "pdf-balance" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generateCSV("balance")} disabled={!!generating}>
                    <FileSpreadsheet className="w-3 h-3" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[10px] text-muted-foreground">As at {format(new Date(), "MMM d, yyyy")}</p>

              {/* Assets */}
              <div>
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Assets</h4>
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs h-8">Account</TableHead><TableHead className="text-xs h-8 text-right">Amount (KES)</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {balanceSheet.assets.map(a => (
                      <TableRow key={a.name}><TableCell className="text-xs py-1.5">{a.name}</TableCell><TableCell className="text-xs py-1.5 text-right font-medium">{a.amount.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-semibold"><TableCell className="text-xs py-2">Total Assets</TableCell><TableCell className="text-xs py-2 text-right text-primary">{balanceSheet.totalAssets.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Equity */}
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Equity</h4>
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs h-8">Account</TableHead><TableHead className="text-xs h-8 text-right">Amount (KES)</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="text-xs py-1.5">Retained Earnings</TableCell><TableCell className="text-xs py-1.5 text-right font-medium">{balanceSheet.retainedEarnings.toLocaleString()}</TableCell></TableRow>
                    <TableRow className="bg-muted/50 font-semibold"><TableCell className="text-xs py-2">Total Equity</TableCell><TableCell className="text-xs py-2 text-right">{balanceSheet.totalEquity.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Balance check */}
              <div className={`p-3 rounded-lg text-center ${balanceSheet.totalAssets === balanceSheet.totalEquity ? "bg-primary/5" : "bg-destructive/5"}`}>
                <Badge variant={balanceSheet.totalAssets === balanceSheet.totalEquity ? "default" : "destructive"}>
                  {balanceSheet.totalAssets === balanceSheet.totalEquity ? "✅ Balanced" : "⚠️ Imbalanced"}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1">Assets = Equity</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsPanel;
