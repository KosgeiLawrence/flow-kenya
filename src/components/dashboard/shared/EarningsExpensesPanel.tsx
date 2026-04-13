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
  Clock, Archive, BarChart3, ChevronLeft, ChevronRight, Edit2, Download, FileText, FileSpreadsheet, ChevronDown as ChevronDownIcon
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
  const [expandedBudgetGroups, setExpandedBudgetGroups] = useState<Set<string>>(new Set());
  const [viewPeriod, setViewPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly" | "all">("weekly");
  const [newTx, setNewTx] = useState({ type: "income" as "income" | "expense", amount: "", category_id: "", description: "", payment_method: "cash", transaction_date: format(new Date(), "yyyy-MM-dd") });
  // Multi-line transaction entries: { [categoryId]: { amount, description } }
  const [txLines, setTxLines] = useState<Record<string, { amount: string; description: string }>>({});

  // New category inline creation
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [showNewBudgetCatInput, setShowNewBudgetCatInput] = useState(false);

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

  // Add new category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: "income" | "expense" }) => {
      const { data, error } = await supabase.from("financial_categories").insert({
        name, type, user_id: user!.id, is_system: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["financial_categories"] });
      toast.success(`Category "${data.name}" added!`);
      setNewCatName("");
      setShowNewCatInput(false);
      setShowNewBudgetCatInput(false);
    },
    onError: () => toast.error("Failed to add category"),
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

  // Add transaction - supports multiple category line items
  const addTxMutation = useMutation({
    mutationFn: async () => {
      const rows: any[] = [];

      // Multi-line entries
      Object.entries(txLines).forEach(([catId, line]) => {
        if (line.amount && Number(line.amount) > 0) {
          rows.push({
            user_id: user!.id,
            type: newTx.type,
            amount: Number(line.amount),
            category_id: catId,
            description: line.description || null,
            payment_method: newTx.payment_method,
            transaction_date: newTx.transaction_date,
          });
        }
      });

      if (rows.length === 0) throw new Error("Add at least one entry");

      const { error } = await supabase.from("financial_transactions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      const count = Object.values(txLines).filter(l => l.amount && Number(l.amount) > 0).length;
      toast.success(newTx.type === "income" ? `${count} income entr${count > 1 ? "ies" : "y"} added! 💰` : `${count} expense${count > 1 ? "s" : ""} recorded! 📋`);
      setAddDialogOpen(false);
      setNewTx({ type: "income", amount: "", category_id: "", description: "", payment_method: "cash", transaction_date: format(new Date(), "yyyy-MM-dd") });
      setTxLines({});
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save entry"),
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

  // Group budgets by shared period_start + period_end (they were created together)
  const groupBudgets = (list: typeof budgetProgress) => {
    const groups = new Map<string, typeof budgetProgress>();
    list.forEach(b => {
      const key = `${b.period_start}|${b.period_end || ""}|${b.period_type}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    });
    return Array.from(groups.entries()).map(([key, items]) => {
      const first = items[0];
      const totalBudgeted = items.reduce((s, i) => s + Number(i.amount), 0);
      const totalSpent = items.reduce((s, i) => s + i.spent, 0);
      const pct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 150) : 0;
      // Derive a clean group name (strip " – Category" suffix)
      const baseName = (first.name || "").replace(/\s–\s.+$/, "") || first.periodLabel + " Budget";
      return { key, items, baseName, totalBudgeted, totalSpent, pct, first };
    });
  };

  const activeGroups = groupBudgets(activeBudgets);
  const historyGroups = groupBudgets(historyBudgets);

  const toggleBudgetGroup = (key: string) => {
    setExpandedBudgetGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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

  // ── Budget Export Functions (per-group) ──
  const exportGroupCSV = (group: ReturnType<typeof groupBudgets>[0]) => {
    const rows = [
      ["Budget Name", "Period Type", "Period", "Category", "Budget (KES)", "Spent (KES)", "Remaining (KES)", "% Used", "Status", "Notes"],
      ...group.items.map(b => [
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
    const safeName = group.baseName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    a.href = url; a.download = `budget-${safeName}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Budget exported as CSV");
  };

  const exportGroupPDF = async (group: ReturnType<typeof groupBudgets>[0]) => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, group.baseName, group.first.periodLabel);
    y = addDocMeta(doc, [
      { label: "Generated", value: format(new Date(), "PPpp") },
      { label: "Period", value: `${group.first.period_type} — ${group.first.periodLabel}` },
      { label: "Total Budgeted", value: `KES ${group.totalBudgeted.toLocaleString()}` },
      { label: "Total Spent", value: `KES ${group.totalSpent.toLocaleString()}` },
      { label: "Usage", value: `${Math.round(group.pct)}%` },
    ], y);
    y += 4;

    y = addSectionTitle(doc, "Category Breakdown", y);
    doc.setFontSize(9);
    group.items.forEach(b => {
      if (y > 260) { doc.addPage(); y = 20; }
      const name = b.financial_categories?.name || "Overall Budget";
      doc.setFont("helvetica", "bold");
      doc.text(name, 20, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`Budget: KES ${Number(b.amount).toLocaleString()}  |  Spent: KES ${b.spent.toLocaleString()}  |  ${Math.round(b.pct)}% used`, 20, y); y += 5;
      const remaining = Math.max(0, Number(b.amount) - b.spent);
      const over = b.pct > 100 ? `  |  Over by KES ${(b.spent - Number(b.amount)).toLocaleString()}` : "";
      doc.text(`Remaining: KES ${remaining.toLocaleString()}${over}`, 20, y); y += 5;
      if (b.notes) { doc.text(`Notes: ${b.notes}`, 20, y); y += 5; }
      y += 3;
    });

    await finalizePdf(doc);
    const safeName = group.baseName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    doc.save(`budget-${safeName}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Budget exported as PDF");
  };

  const incomeCategories = (categories || []).filter(c => c.type === "income");
  const expenseCategories = (categories || []).filter(c => c.type === "expense");
  const activeCats = newTx.type === "income" ? incomeCategories : expenseCategories;

  const renderBudgetCard = (bp: any, showActions = true) => (
    <div key={bp.id} className="p-3 rounded-lg border bg-card/50 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{bp.financial_categories?.name || "Overall Budget"}</p>
        </div>
        {showActions && (
          <div className="flex gap-1 shrink-0">
            {!bp.isExpired && bp.status !== "archived" && (
              <button onClick={(e) => { e.stopPropagation(); archiveBudgetMutation.mutate(bp.id); }} className="text-muted-foreground hover:text-foreground p-1" title="Archive">
                <Archive className="w-3 h-3" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); handleDeleteBudget(bp); }} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">KES {bp.spent.toLocaleString()} / {Number(bp.amount).toLocaleString()}</span>
        <span className={`font-bold ${bp.pct > 100 ? "text-destructive" : bp.pct >= 80 ? "text-yellow-600" : "text-primary"}`}>
          {Math.round(bp.pct)}%
        </span>
      </div>
      <Progress value={Math.min(bp.pct, 100)} className={`h-2 ${bp.pct > 100 ? "[&>div]:bg-destructive" : bp.pct >= 80 ? "[&>div]:bg-yellow-500" : ""}`} />
    </div>
  );

  const renderBudgetGroup = (group: ReturnType<typeof groupBudgets>[0], showActions = true) => {
    const isExpanded = expandedBudgetGroups.has(group.key);
    const remaining = Math.max(0, group.totalBudgeted - group.totalSpent);
    const first = group.first;

    return (
      <div key={group.key} className="rounded-lg border bg-card overflow-hidden">
        <button
          onClick={() => toggleBudgetGroup(group.key)}
          className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{group.baseName}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{first.period_type}</Badge>
                <span className="text-[10px] text-muted-foreground">{first.periodLabel}</span>
                <Badge variant="secondary" className="text-[10px]">{group.items.length} {group.items.length === 1 ? "item" : "items"}</Badge>
              </div>
            </div>
            <ChevronDownIcon className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </div>

          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">KES {group.totalSpent.toLocaleString()} spent of {group.totalBudgeted.toLocaleString()}</span>
            <span className={`font-bold ${group.pct > 100 ? "text-destructive" : group.pct >= 80 ? "text-yellow-600" : "text-primary"}`}>
              {Math.round(group.pct)}%
            </span>
          </div>
          <Progress value={Math.min(group.pct, 100)} className={`h-2.5 mt-1 ${group.pct > 100 ? "[&>div]:bg-destructive" : group.pct >= 80 ? "[&>div]:bg-yellow-500" : ""}`} />

          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Remaining: KES {remaining.toLocaleString()}</span>
            {group.pct > 100 && <span className="text-destructive font-medium">Over by KES {(group.totalSpent - group.totalBudgeted).toLocaleString()}</span>}
            {first.isExpired && <Badge variant="outline" className="text-[9px] h-4">Ended</Badge>}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t px-3 pb-3 pt-2 space-y-2 bg-muted/30">
            {first.notes && <p className="text-[10px] text-muted-foreground italic mb-2">📝 {first.notes}</p>}
            {group.items.map(bp => renderBudgetCard(bp, showActions))}
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={(e) => { e.stopPropagation(); exportGroupCSV(group); }} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <FileSpreadsheet className="w-3 h-3" /> CSV
              </button>
              <button onClick={(e) => { e.stopPropagation(); exportGroupPDF(group); }} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <FileText className="w-3 h-3" /> PDF
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {newTx.type === "income" ? <ArrowUpCircle className="w-5 h-5 text-primary" /> : <ArrowDownCircle className="w-5 h-5 text-destructive" />}
                    {newTx.type === "income" ? "Add Income" : "Add Expense"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
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

                  <div>
                    <Label className="text-sm font-semibold">
                      {newTx.type === "income" ? "Income" : "Expense"} by Category
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">Enter amounts for each category you want to record</p>
                    <div className="space-y-2 max-h-52 overflow-y-auto border rounded-md p-2">
                      {activeCats.map(cat => (
                        <div key={cat.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm min-w-0 truncate flex-1">{cat.icon} {cat.name}</span>
                            <Input
                              type="number"
                              placeholder="KES"
                              className="w-28 h-8 text-sm"
                              value={txLines[cat.id]?.amount || ""}
                              onChange={e => setTxLines(prev => ({
                                ...prev,
                                [cat.id]: { ...prev[cat.id], amount: e.target.value, description: prev[cat.id]?.description || "" }
                              }))}
                            />
                          </div>
                          {txLines[cat.id]?.amount && Number(txLines[cat.id]?.amount) > 0 && (
                            <Input
                              placeholder="Description (optional)"
                              className="h-7 text-xs ml-4"
                              value={txLines[cat.id]?.description || ""}
                              onChange={e => setTxLines(prev => ({
                                ...prev,
                                [cat.id]: { ...prev[cat.id], description: e.target.value }
                              }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {showNewCatInput ? (
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="h-8 text-sm" />
                        <Button size="sm" variant="outline" disabled={!newCatName.trim() || addCategoryMutation.isPending} onClick={() => addCategoryMutation.mutate({ name: newCatName.trim(), type: newTx.type })}>
                          {addCategoryMutation.isPending ? "..." : "Add"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowNewCatInput(false); setNewCatName(""); }}>✕</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="mt-1 text-xs gap-1" onClick={() => { setShowNewCatInput(true); setNewCatType(newTx.type); }}>
                        <Plus className="w-3 h-3" /> Add New Category
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const totalAmount = Object.values(txLines).reduce((s, l) => s + (Number(l.amount) || 0), 0);
                    const lineCount = Object.values(txLines).filter(l => l.amount && Number(l.amount) > 0).length;
                    return totalAmount > 0 ? (
                      <div className="bg-muted rounded-md p-2 text-sm">
                        <span className="font-semibold">Total: KES {totalAmount.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-2">({lineCount} {lineCount === 1 ? "entry" : "entries"})</span>
                      </div>
                    ) : null;
                  })()}

                  <Button className="w-full" onClick={() => addTxMutation.mutate()} disabled={Object.values(txLines).filter(l => l.amount && Number(l.amount) > 0).length === 0 || addTxMutation.isPending}>
                    {addTxMutation.isPending ? "Saving..." : "Save Entries"}
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

                {/* Multi-category budget lines */}
                <div className="space-y-2">
                  <Label>Budget Categories & Amounts *</Label>
                  <p className="text-[10px] text-muted-foreground">Select categories and set individual amounts for each</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {expenseCategories.map(c => {
                      const isSelected = budgetLines[c.id] !== undefined;
                      return (
                        <div key={c.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              setBudgetLines(prev => {
                                const next = { ...prev };
                                if (e.target.checked) { next[c.id] = ""; } else { delete next[c.id]; }
                                return next;
                              });
                            }}
                            className="rounded border-border"
                          />
                          <span className="text-sm flex-1 truncate">{c.icon} {c.name}</span>
                          {isSelected && (
                            <Input
                              type="number"
                              placeholder="KES"
                              value={budgetLines[c.id]}
                              onChange={e => setBudgetLines(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="w-28 h-8 text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                    {/* Add new category inline */}
                    {!showNewBudgetCatInput ? (
                      <button onClick={() => { setShowNewBudgetCatInput(true); setNewCatName(""); setNewCatType("expense"); }} className="text-xs text-primary hover:underline flex items-center gap-1 py-1">
                        <Plus className="w-3 h-3" /> Add new category
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center py-1">
                        <Input placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="h-7 text-xs flex-1" />
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" disabled={!newCatName.trim() || addCategoryMutation.isPending} onClick={() => addCategoryMutation.mutate({ name: newCatName.trim(), type: "expense" })}>
                          {addCategoryMutation.isPending ? "..." : "Add"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => { setShowNewBudgetCatInput(false); setNewCatName(""); }}>✕</Button>
                      </div>
                    )}
                  </div>
                  {/* Overall option */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={includeOverall}
                      onChange={e => setIncludeOverall(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm flex-1">📊 Overall Budget (all expenses)</span>
                    {includeOverall && (
                      <Input
                        type="number"
                        placeholder="KES"
                        value={overallAmount}
                        onChange={e => setOverallAmount(e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                    )}
                  </div>
                  {/* Total summary */}
                  {(Object.values(budgetLines).some(v => v) || (includeOverall && overallAmount)) && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      Total: KES {(
                        Object.values(budgetLines).reduce((s, v) => s + (Number(v) || 0), 0) +
                        (includeOverall ? Number(overallAmount) || 0 : 0)
                      ).toLocaleString()}
                      {" · "}{Object.values(budgetLines).filter(v => v && Number(v) > 0).length + (includeOverall && Number(overallAmount) > 0 ? 1 : 0)} line(s)
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Budget notes, goals, or context..." value={newBudget.notes} onChange={e => setNewBudget(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>

                <Button className="w-full" onClick={() => addBudgetMutation.mutate()} disabled={
                  (!Object.values(budgetLines).some(v => v && Number(v) > 0) && !(includeOverall && Number(overallAmount) > 0)) || addBudgetMutation.isPending
                }>
                  {addBudgetMutation.isPending ? "Creating..." : "Create Budget 🎯"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Active / History tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setBudgetViewTab("active")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${budgetViewTab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              ✅ Active ({activeGroups.length})
            </button>
            <button onClick={() => setBudgetViewTab("history")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${budgetViewTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              📜 History ({historyGroups.length})
            </button>
          </div>

          {budgetViewTab === "active" && (
            <div className="space-y-3">
              {activeGroups.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="p-6 text-center">
                    <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active budgets. Create one to start tracking your spending goals!</p>
                  </CardContent>
                </Card>
              ) : (
                activeGroups.map(g => renderBudgetGroup(g))
              )}
            </div>
          )}

          {budgetViewTab === "history" && (
            <div className="space-y-3">
              {historyGroups.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="p-6 text-center">
                    <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No past budgets yet. Completed and archived budgets will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                historyGroups.map(g => renderBudgetGroup(g, true))
              )}
            </div>
          )}

          {/* Budget vs Actual comparison chart */}
          {activeGroups.length > 0 && (
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activeGroups.slice(0, 6).map(g => ({
                    name: g.baseName.substring(0, 12),
                    budget: g.totalBudgeted,
                    spent: g.totalSpent,
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
