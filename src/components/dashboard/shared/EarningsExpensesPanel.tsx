import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle,
  Calendar, Target, AlertTriangle, CheckCircle2, Trash2, Receipt, FileBarChart,
  Clock, Archive, BarChart3, ChevronLeft, ChevronRight, Edit2, Download, FileText, FileSpreadsheet
} from "lucide-react";
import jsPDF from "jspdf";
import { addBrandedHeader, addDocMeta, addSectionTitle, finalizePdf } from "@/lib/pdfBranding";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  format, subDays, startOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay,
  isWithinInterval, startOfYear, endOfYear, endOfWeek, addMonths, addYears,
  subMonths, subYears, addWeeks, subWeeks, getYear, getMonth
} from "date-fns";
import FinancialReportsPanel from "./FinancialReportsPanel";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(340,55%,50%)", "hsl(270,40%,50%)"];

type UserRole = "waste_picker" | "aggregator" | "recycler";

interface Props {
  role: UserRole;
}

const roleConfig = {
  waste_picker: { title: "My Earnings", simple: true },
  aggregator: { title: "Earnings & Expenses", simple: false },
  recycler: { title: "Business Insights", simple: false },
};

// Helper to generate year options from 2020 to current+1
const generateYearOptions = () => {
  const currentYear = getYear(new Date());
  const years: number[] = [];
  for (let y = 2020; y <= currentYear + 1; y++) years.push(y);
  return years;
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EarningsExpensesPanel = ({ role }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = roleConfig[role];

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetViewTab, setBudgetViewTab] = useState<"active" | "history">("active");
  const [viewPeriod, setViewPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly" | "all">("weekly");
  const [newTx, setNewTx] = useState({ type: "income" as "income" | "expense", amount: "", category_id: "", description: "", payment_method: "cash", transaction_date: format(new Date(), "yyyy-MM-dd") });

  // Budget form state - enhanced
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());
  const [newBudget, setNewBudget] = useState({
    name: "",
    period_type: "monthly" as string,
    year: currentYear,
    month: currentMonth,
    week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    custom_start: format(new Date(), "yyyy-MM-dd"),
    custom_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    notes: "",
  });
  // Multi-category line items: { [categoryId]: amount string }
  const [budgetLines, setBudgetLines] = useState<Record<string, string>>({});
  const [includeOverall, setIncludeOverall] = useState(false);
  const [overallAmount, setOverallAmount] = useState("");

  // Compute period_start and period_end from budget form
  const computeBudgetDates = (b: typeof newBudget) => {
    if (b.period_type === "weekly") {
      const ws = new Date(b.week_start);
      return { start: format(ws, "yyyy-MM-dd"), end: format(endOfWeek(ws, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    }
    if (b.period_type === "monthly") {
      const d = new Date(b.year, b.month, 1);
      return { start: format(d, "yyyy-MM-dd"), end: format(endOfMonth(d), "yyyy-MM-dd") };
    }
    if (b.period_type === "annual") {
      const d = new Date(b.year, 0, 1);
      return { start: format(d, "yyyy-MM-dd"), end: format(endOfYear(d), "yyyy-MM-dd") };
    }
    if (b.period_type === "custom") {
      return { start: b.custom_start, end: b.custom_end };
    }
    // daily
    return { start: b.custom_start, end: b.custom_start };
  };

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["financial_categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch transactions
  const { data: transactions } = useQuery({
    queryKey: ["financial_transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*, financial_categories(name, icon, type)")
        .eq("user_id", user!.id)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch budgets
  const { data: budgets } = useQuery({
    queryKey: ["financial_budgets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_budgets")
        .select("*, financial_categories(name, icon)")
        .eq("user_id", user!.id)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Add transaction
  const addTxMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_transactions").insert({
        user_id: user!.id,
        type: newTx.type,
        amount: Number(newTx.amount),
        category_id: newTx.category_id || null,
        description: newTx.description || null,
        payment_method: newTx.payment_method,
        transaction_date: newTx.transaction_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success(newTx.type === "income" ? "Income added! 💰" : "Expense recorded! 📋");
      setAddDialogOpen(false);
      setNewTx({ type: "income", amount: "", category_id: "", description: "", payment_method: "cash", transaction_date: format(new Date(), "yyyy-MM-dd") });
    },
    onError: () => toast.error("Failed to save entry"),
  });

  // Add budget - supports multiple category line items
  const addBudgetMutation = useMutation({
    mutationFn: async () => {
      const dates = computeBudgetDates(newBudget);
      const baseName = newBudget.name || `${newBudget.period_type === "annual" ? newBudget.year : newBudget.period_type === "monthly" ? `${MONTH_NAMES[newBudget.month]} ${newBudget.year}` : newBudget.period_type} Budget`;

      const rows: any[] = [];

      // Add category-specific lines
      Object.entries(budgetLines).forEach(([catId, amt]) => {
        if (amt && Number(amt) > 0) {
          const cat = expenseCategories.find(c => c.id === catId);
          rows.push({
            user_id: user!.id,
            category_id: catId,
            period_type: newBudget.period_type,
            amount: Number(amt),
            period_start: dates.start,
            period_end: dates.end,
            name: `${baseName} – ${cat?.name || "Category"}`,
            notes: newBudget.notes || null,
            status: "active",
          });
        }
      });

      // Add overall line if selected
      if (includeOverall && overallAmount && Number(overallAmount) > 0) {
        rows.push({
          user_id: user!.id,
          category_id: null,
          period_type: newBudget.period_type,
          amount: Number(overallAmount),
          period_start: dates.start,
          period_end: dates.end,
          name: baseName,
          notes: newBudget.notes || null,
          status: "active",
        });
      }

      if (rows.length === 0) throw new Error("Add at least one budget line");

      const { error } = await supabase.from("financial_budgets").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_budgets"] });
      toast.success(`Budget created! 🎯`);
      setBudgetDialogOpen(false);
      setNewBudget({ name: "", period_type: "monthly", year: currentYear, month: currentMonth, week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"), custom_start: format(new Date(), "yyyy-MM-dd"), custom_end: format(endOfMonth(new Date()), "yyyy-MM-dd"), notes: "" });
      setBudgetLines({});
      setIncludeOverall(false);
      setOverallAmount("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save budget"),
  });

  // Archive budget
  const archiveBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase.from("financial_budgets").update({ status: "archived" }).eq("id", budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_budgets"] });
      toast.success("Budget archived");
    },
  });

  const { softDelete } = useTrash();

  const handleDeleteTx = async (tx: any) => {
    const success = await softDelete("financial_transactions", tx.id, tx, `${tx.type === "income" ? "Income" : "Expense"}: KES ${Number(tx.amount).toLocaleString()}`);
    if (success) queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
  };

  const handleDeleteBudget = async (budget: any) => {
    const success = await softDelete("financial_budgets", budget.id, budget, `Budget: KES ${Number(budget.amount).toLocaleString()}`);
    if (success) queryClient.invalidateQueries({ queryKey: ["financial_budgets"] });
  };

  // Computed summaries
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const filterByPeriod = (txs: any[], period: "daily" | "weekly" | "monthly" | "yearly" | "all") => {
    if (period === "all") return txs || [];
    return (txs || []).filter(t => {
      const d = new Date(t.transaction_date);
      if (period === "daily") return isWithinInterval(d, { start: todayStart, end: todayEnd });
      if (period === "weekly") return d >= weekStart && d <= now;
      if (period === "yearly") return d >= yearStart && d <= yearEnd;
      return d >= monthStart && d <= monthEnd;
    });
  };

  const periodTxs = filterByPeriod(transactions || [], viewPeriod);
  const totalIncome = periodTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = periodTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  const dailyChartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayTxs = (transactions || []).filter(t => t.transaction_date === dateStr);
    const income = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { day: format(date, "EEE"), income, expenses };
  });

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    periodTxs.filter(t => t.type === "expense").forEach(t => {
      const name = t.financial_categories?.name || "Other";
      map.set(name, (map.get(name) || 0) + Number(t.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [periodTxs]);

  // Enhanced budget progress with date-range matching
  const budgetProgress = useMemo(() => {
    return (budgets || []).map(b => {
      const bStart = new Date(b.period_start);
      const bEnd = b.period_end ? endOfDay(new Date(b.period_end)) : (() => {
        if (b.period_type === "daily") return endOfDay(bStart);
        if (b.period_type === "weekly") return endOfDay(endOfWeek(bStart, { weekStartsOn: 1 }));
        if (b.period_type === "annual") return endOfYear(bStart);
        return endOfDay(endOfMonth(bStart));
      })();

      const catExpenses = (transactions || []).filter(t => {
        const d = new Date(t.transaction_date);
        const inPeriod = d >= bStart && d <= bEnd;
        return t.type === "expense" && inPeriod && (b.category_id ? t.category_id === b.category_id : true);
      }).reduce((s, t) => s + Number(t.amount), 0);

      const catIncome = (transactions || []).filter(t => {
        const d = new Date(t.transaction_date);
        const inPeriod = d >= bStart && d <= bEnd;
        return t.type === "income" && inPeriod && (b.category_id ? t.category_id === b.category_id : true);
      }).reduce((s, t) => s + Number(t.amount), 0);

      const pct = b.amount > 0 ? Math.min((catExpenses / Number(b.amount)) * 100, 150) : 0;
      const isExpired = bEnd < now;
      const periodLabel = b.period_type === "annual"
        ? format(bStart, "yyyy")
        : b.period_type === "monthly"
        ? format(bStart, "MMM yyyy")
        : b.period_type === "weekly"
        ? `Week of ${format(bStart, "MMM d")}`
        : format(bStart, "MMM d, yyyy");

      return { ...b, spent: catExpenses, earned: catIncome, pct, isExpired, periodLabel, bStart, bEnd };
    });
  }, [budgets, transactions]);

  const activeBudgets = budgetProgress.filter(b => b.status !== "archived" && !b.isExpired);
  const historyBudgets = budgetProgress.filter(b => b.status === "archived" || b.isExpired);

  // Budget summary stats
  const budgetSummary = useMemo(() => {
    const active = activeBudgets;
    const totalBudgeted = active.reduce((s, b) => s + Number(b.amount), 0);
    const totalSpent = active.reduce((s, b) => s + b.spent, 0);
    const overBudgetCount = active.filter(b => b.pct > 100).length;
    const onTrackCount = active.filter(b => b.pct <= 70).length;
    return { totalBudgeted, totalSpent, overBudgetCount, onTrackCount, totalActive: active.length };
  }, [activeBudgets]);

  // Smart insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    if (totalExpenses > 0 && totalIncome > 0) {
      const transportExp = periodTxs.filter(t => t.type === "expense" && t.financial_categories?.name === "Transport").reduce((s, t) => s + Number(t.amount), 0);
      if (transportExp > 0) {
        const pct = Math.round((transportExp / totalExpenses) * 100);
        msgs.push(`🚛 You spent ${pct}% on transport this ${viewPeriod === "daily" ? "day" : viewPeriod === "weekly" ? "week" : viewPeriod === "monthly" ? "month" : viewPeriod === "yearly" ? "year" : "period"}`);
      }
    }
    if (netProfit > 0) msgs.push(`✅ You're making a profit of KES ${netProfit.toLocaleString()}`);
    if (netProfit < 0) msgs.push(`⚠️ Your expenses exceed income by KES ${Math.abs(netProfit).toLocaleString()}`);

    activeBudgets.forEach(bp => {
      if (bp.pct >= 100) msgs.push(`🔴 Budget exceeded: ${bp.name || bp.financial_categories?.name || "Overall"} at ${Math.round(bp.pct)}%`);
      else if (bp.pct >= 80) msgs.push(`🟡 ${bp.name || bp.financial_categories?.name || "Overall"} budget at ${Math.round(bp.pct)}%`);
    });

    return msgs;
  }, [totalExpenses, totalIncome, netProfit, periodTxs, activeBudgets, viewPeriod]);

  // ── Budget Export Functions ──
  const exportBudgetsCSV = () => {
    const allBudgets = [...activeBudgets, ...historyBudgets];
    if (allBudgets.length === 0) { toast.error("No budgets to export"); return; }
    const rows = [
      ["Budget Name", "Period Type", "Period", "Category", "Budget (KES)", "Spent (KES)", "Remaining (KES)", "% Used", "Status", "Notes"],
      ...allBudgets.map(b => [
        b.name || b.financial_categories?.name || "Overall",
        b.period_type,
        b.periodLabel,
        b.financial_categories?.name || "All Expenses",
        String(Number(b.amount)),
        String(b.spent),
        String(Math.max(0, Number(b.amount) - b.spent)),
        String(Math.round(b.pct)) + "%",
        b.isExpired ? "Ended" : b.status === "archived" ? "Archived" : "Active",
        b.notes || "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `budgets-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Budgets exported as CSV");
  };

  const exportBudgetsPDF = async () => {
    const allBudgets = [...activeBudgets, ...historyBudgets];
    if (allBudgets.length === 0) { toast.error("No budgets to export"); return; }
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "Budget Report", format(new Date(), "MMMM yyyy"));
    y = addDocMeta(doc, [
      { label: "Generated", value: format(new Date(), "PPpp") },
      { label: "Active Budgets", value: String(activeBudgets.length) },
      { label: "Total Budgeted", value: `KES ${budgetSummary.totalBudgeted.toLocaleString()}` },
      { label: "Total Spent", value: `KES ${budgetSummary.totalSpent.toLocaleString()}` },
    ], y);
    y += 4;

    const renderSection = (title: string, list: typeof allBudgets) => {
      if (list.length === 0) return;
      y = addSectionTitle(doc, title, y);
      doc.setFontSize(9);
      list.forEach(b => {
        if (y > 260) { doc.addPage(); y = 20; }
        const name = b.name || b.financial_categories?.name || "Overall Budget";
        doc.setFont("helvetica", "bold");
        doc.text(name, 20, y); y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(`Period: ${b.periodLabel}  |  Type: ${b.period_type}`, 20, y); y += 5;
        doc.text(`Category: ${b.financial_categories?.name || "All Expenses"}`, 20, y); y += 5;
        doc.text(`Budget: KES ${Number(b.amount).toLocaleString()}  |  Spent: KES ${b.spent.toLocaleString()}  |  ${Math.round(b.pct)}% used`, 20, y); y += 5;
        const remaining = Math.max(0, Number(b.amount) - b.spent);
        const over = b.pct > 100 ? `  |  Over by KES ${(b.spent - Number(b.amount)).toLocaleString()}` : "";
        doc.text(`Remaining: KES ${remaining.toLocaleString()}${over}`, 20, y); y += 5;
        if (b.notes) { doc.text(`Notes: ${b.notes}`, 20, y); y += 5; }
        y += 4;
      });
    };

    renderSection("Active Budgets", activeBudgets);
    renderSection("Past / Archived Budgets", historyBudgets);

    await finalizePdf(doc);
    doc.save(`budgets-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Budgets exported as PDF");
  };

  const incomeCategories = (categories || []).filter(c => c.type === "income");
  const expenseCategories = (categories || []).filter(c => c.type === "expense");
  const activeCats = newTx.type === "income" ? incomeCategories : expenseCategories;

  const renderBudgetCard = (bp: any, showActions = true) => (
    <div key={bp.id} className="p-3 rounded-lg border bg-card space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{bp.name || bp.financial_categories?.name || "Overall Budget"}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{bp.period_type}</Badge>
            <span className="text-[10px] text-muted-foreground">{bp.periodLabel}</span>
            {bp.financial_categories?.name && (
              <Badge variant="secondary" className="text-[10px]">{bp.financial_categories.icon} {bp.financial_categories.name}</Badge>
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex gap-1 shrink-0">
            {!bp.isExpired && bp.status !== "archived" && (
              <button onClick={() => archiveBudgetMutation.mutate(bp.id)} className="text-muted-foreground hover:text-foreground p-1" title="Archive">
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => handleDeleteBudget(bp)} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">KES {bp.spent.toLocaleString()} spent of {Number(bp.amount).toLocaleString()}</span>
        <span className={`font-bold ${bp.pct > 100 ? "text-destructive" : bp.pct >= 80 ? "text-yellow-600" : "text-primary"}`}>
          {Math.round(bp.pct)}%
        </span>
      </div>
      <Progress value={Math.min(bp.pct, 100)} className={`h-2.5 ${bp.pct > 100 ? "[&>div]:bg-destructive" : bp.pct >= 80 ? "[&>div]:bg-yellow-500" : ""}`} />

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Remaining: KES {Math.max(0, Number(bp.amount) - bp.spent).toLocaleString()}</span>
        {bp.pct > 100 && <span className="text-destructive font-medium">Over by KES {(bp.spent - Number(bp.amount)).toLocaleString()}</span>}
        {bp.isExpired && <Badge variant="outline" className="text-[9px] h-4">Ended</Badge>}
      </div>

      {bp.notes && <p className="text-[10px] text-muted-foreground italic">{bp.notes}</p>}
    </div>
  );

  return (
    <Tabs defaultValue="tracking" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-4">
        <TabsTrigger value="tracking" className="gap-1.5"><Receipt className="w-4 h-4" /> {config.simple ? "Track" : "Track"}</TabsTrigger>
        <TabsTrigger value="budgets" className="gap-1.5"><Target className="w-4 h-4" /> Budgets</TabsTrigger>
        <TabsTrigger value="reports" className="gap-1.5"><FileBarChart className="w-4 h-4" /> Reports</TabsTrigger>
      </TabsList>

      {/* ─── TRACKING TAB ─── */}
      <TabsContent value="tracking">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => setNewTx(p => ({ ...p, type: "income" }))}>
                  <ArrowUpCircle className="w-4 h-4" /> {config.simple ? "Add Earning" : "Add Income"}
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" onClick={() => setNewTx(p => ({ ...p, type: "expense" }))}>
                  <ArrowDownCircle className="w-4 h-4" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {newTx.type === "income" ? <ArrowUpCircle className="w-5 h-5 text-primary" /> : <ArrowDownCircle className="w-5 h-5 text-destructive" />}
                    {newTx.type === "income" ? "Add Income" : "Add Expense"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Amount (KES) *</Label>
                    <Input type="number" placeholder="e.g. 500" value={newTx.amount} onChange={e => setNewTx(p => ({ ...p, amount: e.target.value }))} className="text-lg" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={newTx.category_id} onValueChange={v => setNewTx(p => ({ ...p, category_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {activeCats.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input placeholder="What was this for?" value={newTx.description} onChange={e => setNewTx(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Payment</Label>
                      <Select value={newTx.payment_method} onValueChange={v => setNewTx(p => ({ ...p, payment_method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="mpesa">📱 M-Pesa</SelectItem>
                          <SelectItem value="bank">🏦 Bank</SelectItem>
                          <SelectItem value="other">📋 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={newTx.transaction_date} onChange={e => setNewTx(p => ({ ...p, transaction_date: e.target.value }))} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => addTxMutation.mutate()} disabled={!newTx.amount || addTxMutation.isPending}>
                    {addTxMutation.isPending ? "Saving..." : "Save Entry"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {insights.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 space-y-1">
                {insights.map((msg, i) => (
                  <p key={i} className="text-sm text-foreground">{msg}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
            {(["daily", "weekly", "monthly", "yearly", "all"] as const).map(p => (
              <button key={p} onClick={() => setViewPeriod(p)} className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${viewPeriod === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {p === "daily" ? "📅 Today" : p === "weekly" ? "📆 This Week" : p === "monthly" ? "🗓️ This Month" : p === "yearly" ? "📊 This Year" : "🌐 All Time"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="shadow-soft">
              <CardContent className="p-3 flex items-center gap-2">
                <ArrowUpCircle className="w-6 h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">KES {totalIncome.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{config.simple ? "Earned" : "Income"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 flex items-center gap-2">
                <ArrowDownCircle className="w-6 h-6 text-destructive shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">KES {totalExpenses.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Spent</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft col-span-2 sm:col-span-1">
              <CardContent className="p-3 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className={`text-lg font-bold truncate ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>KES {netProfit.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Profit</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick budget glance on tracking tab */}
          {activeBudgets.length > 0 && (
            <Card className="shadow-soft">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Active Budgets</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {activeBudgets.slice(0, 3).map(bp => (
                  <div key={bp.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{bp.name || bp.financial_categories?.name || "Overall"}</span>
                      <span className="text-muted-foreground shrink-0">KES {bp.spent.toLocaleString()} / {Number(bp.amount).toLocaleString()}</span>
                    </div>
                    <Progress value={Math.min(bp.pct, 100)} className={`h-2 ${bp.pct > 100 ? "[&>div]:bg-destructive" : bp.pct >= 80 ? "[&>div]:bg-yellow-500" : ""}`} />
                  </div>
                ))}
                {activeBudgets.length > 3 && <p className="text-[10px] text-muted-foreground text-center">+{activeBudgets.length - 3} more — see Budgets tab</p>}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="trend" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="trend">📊 Trend</TabsTrigger>
              <TabsTrigger value="breakdown">🥧 Breakdown</TabsTrigger>
            </TabsList>
            <TabsContent value="trend">
              <Card className="shadow-soft">
                <CardHeader className="pb-2"><CardTitle className="text-sm">7-Day Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyChartData}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                      <Bar dataKey="income" fill="hsl(152,45%,22%)" radius={[3, 3, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="hsl(0,70%,50%)" radius={[3, 3, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="breakdown">
              <Card className="shadow-soft">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {expenseByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No expenses yet this period</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                          {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Receipt className="w-4 h-4" /> Recent Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {(!transactions || transactions.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">No entries yet. Tap "Add Earning" or "Add Expense" to start tracking!</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.slice(0, 20).map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="text-lg">{tx.financial_categories?.icon || (tx.type === "income" ? "💰" : "📋")}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description || tx.financial_categories?.name || (tx.type === "income" ? "Income" : "Expense")}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "MMM d")} · {tx.payment_method === "mpesa" ? "📱 M-Pesa" : tx.payment_method === "bank" ? "🏦 Bank" : "💵 Cash"}</p>
                      </div>
                      <span className={`text-sm font-bold ${tx.type === "income" ? "text-primary" : "text-destructive"}`}>
                        {tx.type === "income" ? "+" : "-"}KES {Number(tx.amount).toLocaleString()}
                      </span>
                      <button onClick={() => handleDeleteTx(tx)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ─── BUDGETS TAB ─── */}
      <TabsContent value="budgets">
        <div className="space-y-4">
          {/* Budget summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{budgetSummary.totalActive}</p>
                <p className="text-[10px] text-muted-foreground">Active Budgets</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-primary">KES {budgetSummary.totalBudgeted.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Budgeted</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">KES {budgetSummary.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Spent</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${budgetSummary.overBudgetCount > 0 ? "text-destructive" : "text-primary"}`}>{budgetSummary.overBudgetCount}</p>
                <p className="text-[10px] text-muted-foreground">Over Budget</p>
              </CardContent>
            </Card>
          </div>

          {/* Export & Create budget buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportBudgetsCSV()}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportBudgetsPDF()}>
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
          <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2"><Plus className="w-4 h-4" /> Create New Budget</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Create Budget</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Budget Name (optional)</Label>
                  <Input placeholder="e.g. Q1 Operations, Jan Transport" value={newBudget.name} onChange={e => setNewBudget(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div>
                  <Label>Budget Period *</Label>
                  <Select value={newBudget.period_type} onValueChange={v => setNewBudget(p => ({ ...p, period_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">📆 Weekly</SelectItem>
                      <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                      <SelectItem value="annual">📊 Yearly</SelectItem>
                      <SelectItem value="custom">📐 Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Period-specific pickers */}
                {newBudget.period_type === "annual" && (
                  <div>
                    <Label>Year</Label>
                    <Select value={String(newBudget.year)} onValueChange={v => setNewBudget(p => ({ ...p, year: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {generateYearOptions().map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Budget for Jan 1 – Dec 31, {newBudget.year}</p>
                  </div>
                )}

                {newBudget.period_type === "monthly" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Month</Label>
                      <Select value={String(newBudget.month)} onValueChange={v => setNewBudget(p => ({ ...p, month: Number(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((m, i) => (
                            <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Select value={String(newBudget.year)} onValueChange={v => setNewBudget(p => ({ ...p, year: Number(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {generateYearOptions().map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground col-span-2">Budget for {MONTH_NAMES[newBudget.month]} {newBudget.year}</p>
                  </div>
                )}

                {newBudget.period_type === "weekly" && (
                  <div>
                    <Label>Week Starting</Label>
                    <Input type="date" value={newBudget.week_start} onChange={e => setNewBudget(p => ({ ...p, week_start: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {newBudget.week_start && `${format(new Date(newBudget.week_start), "MMM d")} – ${format(endOfWeek(new Date(newBudget.week_start), { weekStartsOn: 1 }), "MMM d, yyyy")}`}
                    </p>
                  </div>
                )}

                {newBudget.period_type === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" value={newBudget.custom_start} onChange={e => setNewBudget(p => ({ ...p, custom_start: e.target.value }))} />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" value={newBudget.custom_end} onChange={e => setNewBudget(p => ({ ...p, custom_end: e.target.value }))} />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Budget Amount (KES) *</Label>
                  <Input type="number" placeholder="e.g. 50,000" value={newBudget.amount} onChange={e => setNewBudget(p => ({ ...p, amount: e.target.value }))} className="text-lg" />
                </div>

                <div>
                  <Label>Category (optional – leave blank for overall expenses)</Label>
                  <Select value={newBudget.category_id} onValueChange={v => setNewBudget(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="All expenses" /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Budget notes, goals, or context..." value={newBudget.notes} onChange={e => setNewBudget(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>

                <Button className="w-full" onClick={() => addBudgetMutation.mutate()} disabled={!newBudget.amount || addBudgetMutation.isPending}>
                  {addBudgetMutation.isPending ? "Creating..." : "Create Budget 🎯"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Active / History tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setBudgetViewTab("active")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${budgetViewTab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              ✅ Active ({activeBudgets.length})
            </button>
            <button onClick={() => setBudgetViewTab("history")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${budgetViewTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              📜 History ({historyBudgets.length})
            </button>
          </div>

          {budgetViewTab === "active" && (
            <div className="space-y-3">
              {activeBudgets.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="p-6 text-center">
                    <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active budgets. Create one to start tracking your spending goals!</p>
                  </CardContent>
                </Card>
              ) : (
                activeBudgets.map(bp => renderBudgetCard(bp))
              )}
            </div>
          )}

          {budgetViewTab === "history" && (
            <div className="space-y-3">
              {historyBudgets.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="p-6 text-center">
                    <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No past budgets yet. Completed and archived budgets will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                historyBudgets.map(bp => renderBudgetCard(bp, true))
              )}
            </div>
          )}

          {/* Budget vs Actual comparison chart */}
          {activeBudgets.length > 0 && (
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activeBudgets.slice(0, 6).map(b => ({
                    name: (b.name || b.financial_categories?.name || "Overall").substring(0, 12),
                    budget: Number(b.amount),
                    spent: b.spent,
                  }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                    <Bar dataKey="budget" fill="hsl(195,60%,50%)" radius={[3, 3, 0, 0]} name="Budget" />
                    <Bar dataKey="spent" fill="hsl(340,55%,50%)" radius={[3, 3, 0, 0]} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* ─── REPORTS TAB ─── */}
      <TabsContent value="reports">
        <FinancialReportsPanel role={role} />
      </TabsContent>
    </Tabs>
  );
};

export default EarningsExpensesPanel;
