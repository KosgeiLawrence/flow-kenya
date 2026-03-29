import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, FileText, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import jsPDF from "jspdf";
import { addCleanHeader, addSectionTitle, addDocMeta, drawTableHeader, drawTableRow, drawTotalLine, finalizeCleanPdf, PDF_COLORS, buildPdfOrgInfo, loadImageAsBase64 } from "@/lib/pdfBranding";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import { toast } from "sonner";

type UserRole = "waste_picker" | "aggregator" | "recycler";

interface Props {
  role: UserRole;
}

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const SUB_SECTION_OPTIONS = [
  { value: "current_asset", label: "Current Asset", section: "asset" },
  { value: "non_current_asset", label: "Non-Current Asset", section: "asset" },
  { value: "current_liability", label: "Current Liability", section: "liability" },
  { value: "long_term_liability", label: "Long-Term Liability", section: "liability" },
  { value: "equity", label: "Equity", section: "equity" },
];

const FinancialReportsPanel = ({ role }: Props) => {
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generating, setGenerating] = useState<string | null>(null);
  const [bsDialogOpen, setBsDialogOpen] = useState(false);
  const [newBsItem, setNewBsItem] = useState({ sub_section: "current_asset", account_name: "", amount: "", notes: "" });

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

  // Fetch balance sheet manual items
  const { data: bsItems } = useQuery({
    queryKey: ["balance_sheet_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balance_sheet_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch inventory (recycler products) for stock valuation
  const { data: products } = useQuery({
    queryKey: ["recycler_products_bs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_products")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && role === "recycler",
  });

  // Fetch orders for accounts payable
  const { data: orders } = useQuery({
    queryKey: ["recycler_orders_bs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_orders")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && role === "recycler",
  });

  // Fetch customers for accounts receivable (pending sales)
  const { data: customers } = useQuery({
    queryKey: ["customers_bs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Add balance sheet item
  const addBsItemMutation = useMutation({
    mutationFn: async () => {
      const opt = SUB_SECTION_OPTIONS.find(o => o.value === newBsItem.sub_section);
      const { error } = await supabase.from("balance_sheet_items").insert({
        user_id: user!.id,
        section: opt?.section || "asset",
        sub_section: newBsItem.sub_section,
        account_name: newBsItem.account_name,
        amount: Number(newBsItem.amount),
        notes: newBsItem.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance_sheet_items"] });
      toast.success("Balance sheet item added");
      setBsDialogOpen(false);
      setNewBsItem({ sub_section: "current_asset", account_name: "", amount: "", notes: "" });
    },
    onError: () => toast.error("Failed to add item"),
  });

  const deleteBsItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("balance_sheet_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance_sheet_items"] });
      toast.success("Item removed");
    },
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

  // ── Comprehensive Balance Sheet ──
  const balanceSheet = useMemo(() => {
    const allTxs = transactions || [];
    const totalIncome = allTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = allTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const cashBalance = totalIncome - totalExpenses;

    // Cash by payment method
    const cashByMethod = new Map<string, number>();
    allTxs.forEach(t => {
      const method = t.payment_method || "cash";
      const current = cashByMethod.get(method) || 0;
      cashByMethod.set(method, current + (t.type === "income" ? Number(t.amount) : -Number(t.amount)));
    });

    // Auto-calculated current assets
    const autoCashAssets = Array.from(cashByMethod.entries()).map(([method, amount]) => ({
      name: method === "mpesa" ? "M-Pesa Balance" : method === "bank" ? "Bank Balance" : method === "cash" ? "Cash in Hand" : `${method} Balance`,
      amount: Math.max(0, amount),
      isAuto: true,
    }));

    // Inventory valuation (stock × price)
    const inventoryValue = (products || []).reduce((s, p) => s + (Number(p.stock_quantity) * Number(p.price_per_unit)), 0);

    // Accounts receivable - pending sales from localStorage
    let pendingSalesTotal = 0;
    try {
      const saved = localStorage.getItem(`pending_sales_${user?.id}`);
      if (saved) {
        const pending = JSON.parse(saved);
        pendingSalesTotal = pending.reduce((s: number, p: any) => s + (Number(p.totalAmount) || 0), 0);
      }
    } catch {}

    // Accounts payable - pending/confirmed orders not yet delivered
    const accountsPayable = (orders || [])
      .filter(o => o.status === "confirmed" || o.status === "pending")
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);

    // Manual items from DB
    const manualItems = bsItems || [];
    const manualCurrentAssets = manualItems.filter(i => i.sub_section === "current_asset");
    const manualNonCurrentAssets = manualItems.filter(i => i.sub_section === "non_current_asset");
    const manualCurrentLiabilities = manualItems.filter(i => i.sub_section === "current_liability");
    const manualLongTermLiabilities = manualItems.filter(i => i.sub_section === "long_term_liability");
    const manualEquity = manualItems.filter(i => i.sub_section === "equity");

    // Build sections
    const currentAssets = [
      ...autoCashAssets,
      ...(pendingSalesTotal > 0 ? [{ name: "Accounts Receivable", amount: pendingSalesTotal, isAuto: true }] : []),
      ...(inventoryValue > 0 ? [{ name: "Inventory (Stock Valuation)", amount: inventoryValue, isAuto: true }] : []),
      ...manualCurrentAssets.map(i => ({ name: i.account_name, amount: Number(i.amount), isAuto: false, id: i.id })),
    ];

    const nonCurrentAssets = [
      ...manualNonCurrentAssets.map(i => ({ name: i.account_name, amount: Number(i.amount), isAuto: false, id: i.id })),
    ];

    const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.amount, 0);
    const totalNonCurrentAssets = nonCurrentAssets.reduce((s, a) => s + a.amount, 0);
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const currentLiabilities = [
      ...(accountsPayable > 0 ? [{ name: "Accounts Payable (Pending Orders)", amount: accountsPayable, isAuto: true }] : []),
      ...manualCurrentLiabilities.map(i => ({ name: i.account_name, amount: Number(i.amount), isAuto: false, id: i.id })),
    ];

    const longTermLiabilities = [
      ...manualLongTermLiabilities.map(i => ({ name: i.account_name, amount: Number(i.amount), isAuto: false, id: i.id })),
    ];

    const totalCurrentLiabilities = currentLiabilities.reduce((s, a) => s + a.amount, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const retainedEarnings = cashBalance;
    const manualEquityTotal = manualEquity.reduce((s, i) => s + Number(i.amount), 0);
    const totalEquity = retainedEarnings + manualEquityTotal;

    const equityItems = [
      { name: "Retained Earnings", amount: retainedEarnings, isAuto: true },
      ...manualEquity.map(i => ({ name: i.account_name, amount: Number(i.amount), isAuto: false, id: i.id })),
    ];

    return {
      currentAssets, nonCurrentAssets, totalCurrentAssets, totalNonCurrentAssets, totalAssets,
      currentLiabilities, longTermLiabilities, totalCurrentLiabilities, totalLongTermLiabilities, totalLiabilities,
      equityItems, totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }, [transactions, products, orders, bsItems, user?.id]);

  // ── PDF Generation ──
  const generatePDF = async (reportType: "pnl" | "cashflow" | "balance") => {
    setGenerating(`pdf-${reportType}`);
    try {
      const doc = new jsPDF();
      const titleMap = { pnl: "Profit & Loss Statement", cashflow: "Cash Flow Statement", balance: "Balance Sheet" };

      // Build clean header with user/org branding
      let logoBase64: string | null = null;
      if (orgInfo?.orgLogoUrl) {
        logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
      }
      const pdfOrg = orgInfo ? buildPdfOrgInfo(orgInfo, logoBase64) : null;
      let y = addCleanHeader(doc, titleMap[reportType], dateRange.label, pdfOrg);

      y = addDocMeta(doc, [
        { label: "Prepared by", value: orgInfo?.orgName || profile?.full_name || "User" },
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
        // Assets
        y = addSectionTitle(doc, "ASSETS", y);
        y = addSectionTitle(doc, "Current Assets", y);
        y = drawTableHeader(doc, [{ label: "Account", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
        balanceSheet.currentAssets.forEach((a, i) => {
          drawTableRow(doc, y, i, 180);
          doc.setFontSize(9); doc.text(a.name, 17, y); doc.text(a.amount.toLocaleString(), 150, y);
          y += 8;
        });
        doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.forest);
        y += 2; doc.text(`Total Current Assets: KES ${balanceSheet.totalCurrentAssets.toLocaleString()}`, 110, y); y += 10;
        doc.setTextColor(...PDF_COLORS.darkText);

        if (balanceSheet.nonCurrentAssets.length > 0) {
          y = addSectionTitle(doc, "Non-Current Assets", y);
          y = drawTableHeader(doc, [{ label: "Account", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
          balanceSheet.nonCurrentAssets.forEach((a, i) => {
            drawTableRow(doc, y, i, 180);
            doc.setFontSize(9); doc.text(a.name, 17, y); doc.text(a.amount.toLocaleString(), 150, y);
            y += 8;
          });
          doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.forest);
          y += 2; doc.text(`Total Non-Current Assets: KES ${balanceSheet.totalNonCurrentAssets.toLocaleString()}`, 100, y); y += 10;
          doc.setTextColor(...PDF_COLORS.darkText);
        }
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        doc.text(`TOTAL ASSETS: KES ${balanceSheet.totalAssets.toLocaleString()}`, 110, y); y += 14;
        doc.setTextColor(...PDF_COLORS.darkText);

        // Liabilities
        y = addSectionTitle(doc, "LIABILITIES", y);
        if (balanceSheet.currentLiabilities.length > 0) {
          y = addSectionTitle(doc, "Current Liabilities", y);
          y = drawTableHeader(doc, [{ label: "Account", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
          balanceSheet.currentLiabilities.forEach((a, i) => {
            drawTableRow(doc, y, i, 180);
            doc.setFontSize(9); doc.text(a.name, 17, y); doc.text(a.amount.toLocaleString(), 150, y);
            y += 8;
          });
          doc.setFontSize(9); y += 2; doc.text(`Total Current Liabilities: KES ${balanceSheet.totalCurrentLiabilities.toLocaleString()}`, 100, y); y += 10;
        }
        if (balanceSheet.longTermLiabilities.length > 0) {
          y = addSectionTitle(doc, "Long-Term Liabilities", y);
          y = drawTableHeader(doc, [{ label: "Account", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
          balanceSheet.longTermLiabilities.forEach((a, i) => {
            drawTableRow(doc, y, i, 180);
            doc.setFontSize(9); doc.text(a.name, 17, y); doc.text(a.amount.toLocaleString(), 150, y);
            y += 8;
          });
          doc.setFontSize(9); y += 2; doc.text(`Total Long-Term Liabilities: KES ${balanceSheet.totalLongTermLiabilities.toLocaleString()}`, 95, y); y += 10;
        }
        if (balanceSheet.currentLiabilities.length === 0 && balanceSheet.longTermLiabilities.length === 0) {
          doc.setFontSize(9); doc.text("No liabilities recorded", 17, y); y += 10;
        }
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        doc.text(`TOTAL LIABILITIES: KES ${balanceSheet.totalLiabilities.toLocaleString()}`, 100, y); y += 14;
        doc.setTextColor(...PDF_COLORS.darkText);

        // Equity
        y = addSectionTitle(doc, "EQUITY", y);
        y = drawTableHeader(doc, [{ label: "Account", x: 17 }, { label: "Amount (KES)", x: 150 }], y, 180);
        balanceSheet.equityItems.forEach((a, i) => {
          drawTableRow(doc, y, i, 180);
          doc.setFontSize(9); doc.text(a.name, 17, y); doc.text(a.amount.toLocaleString(), 150, y);
          y += 8;
        });
        doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.forest);
        y += 2; doc.text(`TOTAL EQUITY: KES ${balanceSheet.totalEquity.toLocaleString()}`, 110, y); y += 12;

        y = drawTotalLine(doc, `Total Liabilities + Equity: KES ${(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()}`, y);
      }

      finalizeCleanPdf(doc);
      doc.save(`${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } finally {
      setGenerating(null);
    }
  };

  // ── CSV Generation ──
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
        csv += "CURRENT ASSETS\nAccount,Amount (KES)\n";
        balanceSheet.currentAssets.forEach(a => { csv += `${a.name},${a.amount}\n`; });
        csv += `Total Current Assets,${balanceSheet.totalCurrentAssets}\n\n`;
        csv += "NON-CURRENT ASSETS\nAccount,Amount (KES)\n";
        balanceSheet.nonCurrentAssets.forEach(a => { csv += `${a.name},${a.amount}\n`; });
        csv += `Total Non-Current Assets,${balanceSheet.totalNonCurrentAssets}\n`;
        csv += `TOTAL ASSETS,${balanceSheet.totalAssets}\n\n`;
        csv += "CURRENT LIABILITIES\nAccount,Amount (KES)\n";
        balanceSheet.currentLiabilities.forEach(a => { csv += `${a.name},${a.amount}\n`; });
        csv += `Total Current Liabilities,${balanceSheet.totalCurrentLiabilities}\n\n`;
        csv += "LONG-TERM LIABILITIES\nAccount,Amount (KES)\n";
        balanceSheet.longTermLiabilities.forEach(a => { csv += `${a.name},${a.amount}\n`; });
        csv += `Total Long-Term Liabilities,${balanceSheet.totalLongTermLiabilities}\n`;
        csv += `TOTAL LIABILITIES,${balanceSheet.totalLiabilities}\n\n`;
        csv += "EQUITY\nAccount,Amount (KES)\n";
        balanceSheet.equityItems.forEach(a => { csv += `${a.name},${a.amount}\n`; });
        csv += `TOTAL EQUITY,${balanceSheet.totalEquity}\n\n`;
        csv += `Total Liabilities + Equity,${balanceSheet.totalLiabilities + balanceSheet.totalEquity}\n`;
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

  const renderBsSection = (title: string, items: any[], total: number, colorClass: string) => (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${colorClass}`}>{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 pl-2">No items recorded</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs h-8">Account</TableHead>
              <TableHead className="text-xs h-8 text-right">Amount (KES)</TableHead>
              <TableHead className="text-xs h-8 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a: any, i: number) => (
              <TableRow key={a.id || a.name + i}>
                <TableCell className="text-xs py-1.5">
                  {a.name}
                  {a.isAuto && <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">Auto</Badge>}
                </TableCell>
                <TableCell className="text-xs py-1.5 text-right font-medium">{a.amount.toLocaleString()}</TableCell>
                <TableCell className="text-xs py-1 w-8">
                  {!a.isAuto && a.id && (
                    <button onClick={() => deleteBsItemMutation.mutate(a.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="text-xs py-2">Total {title}</TableCell>
              <TableCell className="text-xs py-2 text-right">{total.toLocaleString()}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );

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
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-xs font-medium">Opening Balance</span>
                <span className="text-sm font-bold">KES {cashFlow.openingBalance.toLocaleString()}</span>
              </div>

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
                  <Dialog open={bsDialogOpen} onOpenChange={setBsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" /> Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="text-base">Add Balance Sheet Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Category *</Label>
                          <Select value={newBsItem.sub_section} onValueChange={v => setNewBsItem(p => ({ ...p, sub_section: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SUB_SECTION_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Account Name *</Label>
                          <Input placeholder="e.g. Office Equipment, Bank Loan" value={newBsItem.account_name} onChange={e => setNewBsItem(p => ({ ...p, account_name: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Amount (KES) *</Label>
                          <Input type="number" placeholder="0" value={newBsItem.amount} onChange={e => setNewBsItem(p => ({ ...p, amount: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Notes (optional)</Label>
                          <Input placeholder="Depreciation, corrections etc." value={newBsItem.notes} onChange={e => setNewBsItem(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                        <Button className="w-full" onClick={() => addBsItemMutation.mutate()} disabled={!newBsItem.account_name || !newBsItem.amount || addBsItemMutation.isPending}>
                          {addBsItemMutation.isPending ? "Saving..." : "Add Item"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
              <Accordion type="multiple" defaultValue={["assets", "liabilities", "equity"]} className="space-y-2">
                <AccordionItem value="assets" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-bold text-primary py-2">ASSETS</AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-3">
                    {renderBsSection("Current Assets", balanceSheet.currentAssets, balanceSheet.totalCurrentAssets, "text-primary")}
                    {renderBsSection("Non-Current Assets", balanceSheet.nonCurrentAssets, balanceSheet.totalNonCurrentAssets, "text-primary/80")}
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="p-2 flex items-center justify-between">
                        <span className="text-xs font-bold">TOTAL ASSETS</span>
                        <span className="text-sm font-bold text-primary">KES {balanceSheet.totalAssets.toLocaleString()}</span>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="liabilities" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-bold text-destructive py-2">LIABILITIES</AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-3">
                    {renderBsSection("Current Liabilities", balanceSheet.currentLiabilities, balanceSheet.totalCurrentLiabilities, "text-destructive")}
                    {renderBsSection("Long-Term Liabilities", balanceSheet.longTermLiabilities, balanceSheet.totalLongTermLiabilities, "text-destructive/80")}
                    <Card className="border-destructive/30 bg-destructive/5">
                      <CardContent className="p-2 flex items-center justify-between">
                        <span className="text-xs font-bold">TOTAL LIABILITIES</span>
                        <span className="text-sm font-bold text-destructive">KES {balanceSheet.totalLiabilities.toLocaleString()}</span>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="equity" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-bold text-foreground py-2">EQUITY</AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-3">
                    {renderBsSection("Equity", balanceSheet.equityItems, balanceSheet.totalEquity, "text-foreground")}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Balance check */}
              <Card className={`border-2 ${balanceSheet.isBalanced ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Total Assets</span>
                    <span className="text-sm font-bold">KES {balanceSheet.totalAssets.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Total Liabilities + Equity</span>
                    <span className="text-sm font-bold">KES {(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <Badge variant={balanceSheet.isBalanced ? "default" : "destructive"}>
                      {balanceSheet.isBalanced ? "✅ Balanced" : "⚠️ Imbalanced"}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">Assets = Liabilities + Equity</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsPanel;
