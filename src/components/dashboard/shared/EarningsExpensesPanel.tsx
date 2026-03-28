import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle,
  Calendar, Target, AlertTriangle, CheckCircle2, Trash2, Receipt, FileBarChart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, startOfYear, endOfYear } from "date-fns";
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

const EarningsExpensesPanel = ({ role }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = roleConfig[role];

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [viewPeriod, setViewPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [newTx, setNewTx] = useState({ type: "income" as "income" | "expense", amount: "", category_id: "", description: "", payment_method: "cash", transaction_date: format(new Date(), "yyyy-MM-dd") });
  const [newBudget, setNewBudget] = useState({ category_id: "", period_type: "monthly", amount: "" });

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
        .order("created_at", { ascending: false });
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

  // Add budget
  const addBudgetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_budgets").insert({
        user_id: user!.id,
        category_id: newBudget.category_id || null,
        period_type: newBudget.period_type,
        amount: Number(newBudget.amount),
        period_start: format(new Date(), "yyyy-MM-dd"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_budgets"] });
      toast.success("Budget set! 🎯");
      setBudgetDialogOpen(false);
      setNewBudget({ category_id: "", period_type: "monthly", amount: "" });
    },
    onError: () => toast.error("Failed to save budget"),
  });

  // Delete transaction
  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Entry deleted");
    },
  });

  // Delete budget
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_budgets"] });
      toast.success("Budget removed");
    },
  });

  // Computed summaries
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const filterByPeriod = (txs: any[], period: "daily" | "weekly" | "monthly") => {
    return (txs || []).filter(t => {
      const d = new Date(t.transaction_date);
      if (period === "daily") return isWithinInterval(d, { start: todayStart, end: todayEnd });
      if (period === "weekly") return d >= weekStart && d <= now;
      return d >= monthStart && d <= monthEnd;
    });
  };

  const periodTxs = filterByPeriod(transactions || [], viewPeriod);
  const totalIncome = periodTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = periodTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  // Chart data - 7-day trend
  const dailyChartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayTxs = (transactions || []).filter(t => t.transaction_date === dateStr);
    const income = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { day: format(date, "EEE"), income, expenses };
  });

  // Expense breakdown for pie
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    periodTxs.filter(t => t.type === "expense").forEach(t => {
      const name = t.financial_categories?.name || "Other";
      map.set(name, (map.get(name) || 0) + Number(t.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [periodTxs]);

  // Budget progress
  const budgetProgress = useMemo(() => {
    return (budgets || []).map(b => {
      const catExpenses = (transactions || []).filter(t => {
        const d = new Date(t.transaction_date);
        const inPeriod = b.period_type === "daily" ? isWithinInterval(d, { start: todayStart, end: todayEnd })
          : b.period_type === "weekly" ? d >= weekStart && d <= now
          : b.period_type === "annual" ? d >= startOfYear(now) && d <= endOfYear(now)
          : d >= monthStart && d <= monthEnd;
        return t.type === "expense" && inPeriod && (b.category_id ? t.category_id === b.category_id : true);
      }).reduce((s, t) => s + Number(t.amount), 0);

      const pct = b.amount > 0 ? Math.min((catExpenses / Number(b.amount)) * 100, 100) : 0;
      return { ...b, spent: catExpenses, pct };
    });
  }, [budgets, transactions]);

  // Smart insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    if (totalExpenses > 0 && totalIncome > 0) {
      const transportExp = periodTxs.filter(t => t.type === "expense" && t.financial_categories?.name === "Transport").reduce((s, t) => s + Number(t.amount), 0);
      if (transportExp > 0) {
        const pct = Math.round((transportExp / totalExpenses) * 100);
        msgs.push(`🚛 You spent ${pct}% on transport this ${viewPeriod === "daily" ? "day" : viewPeriod === "weekly" ? "week" : "month"}`);
      }
    }
    if (netProfit > 0) msgs.push(`✅ You're making a profit of KES ${netProfit.toLocaleString()}`);
    if (netProfit < 0) msgs.push(`⚠️ Your expenses exceed income by KES ${Math.abs(netProfit).toLocaleString()}`);

    budgetProgress.forEach(bp => {
      if (bp.pct >= 90) msgs.push(`🔴 Budget alert: ${bp.financial_categories?.name || "Overall"} at ${Math.round(bp.pct)}%`);
      else if (bp.pct >= 70) msgs.push(`🟡 ${bp.financial_categories?.name || "Overall"} budget at ${Math.round(bp.pct)}%`);
    });

    return msgs;
  }, [totalExpenses, totalIncome, netProfit, periodTxs, budgetProgress, viewPeriod]);

  const incomeCategories = (categories || []).filter(c => c.type === "income");
  const expenseCategories = (categories || []).filter(c => c.type === "expense");
  const activeCats = newTx.type === "income" ? incomeCategories : expenseCategories;

  return (
    <Tabs defaultValue="tracking" className="w-full">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="tracking" className="gap-1.5"><Receipt className="w-4 h-4" /> {config.simple ? "Track" : "Track Finances"}</TabsTrigger>
        <TabsTrigger value="reports" className="gap-1.5"><FileBarChart className="w-4 h-4" /> Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="tracking">
    <div className="space-y-4">
      {/* Quick action buttons */}
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

        <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="gap-2"><Target className="w-4 h-4" /> Set Budget</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Set Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Budget Amount (KES) *</Label>
                <Input type="number" placeholder="e.g. 5000" value={newBudget.amount} onChange={e => setNewBudget(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Period</Label>
                <Select value={newBudget.period_type} onValueChange={v => setNewBudget(p => ({ ...p, period_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Daily</SelectItem>
                    <SelectItem value="weekly">📆 Weekly</SelectItem>
                    <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                    <SelectItem value="annual">📊 Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category (optional - leave blank for overall)</Label>
                <Select value={newBudget.category_id} onValueChange={v => setNewBudget(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="All expenses" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => addBudgetMutation.mutate()} disabled={!newBudget.amount || addBudgetMutation.isPending}>
                {addBudgetMutation.isPending ? "Saving..." : "Set Budget"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 space-y-1">
            {insights.map((msg, i) => (
              <p key={i} className="text-sm text-foreground">{msg}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Period selector */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(["daily", "weekly", "monthly"] as const).map(p => (
          <button key={p} onClick={() => setViewPeriod(p)} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewPeriod === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {p === "daily" ? "📅 Today" : p === "weekly" ? "📆 This Week" : "🗓️ This Month"}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
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

      {/* Budget progress */}
      {budgetProgress.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Budget Tracker</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {budgetProgress.map(bp => (
              <div key={bp.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{bp.financial_categories?.icon} {bp.financial_categories?.name || "Overall"} ({bp.period_type})</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">KES {bp.spent.toLocaleString()} / {Number(bp.amount).toLocaleString()}</span>
                    <button onClick={() => deleteBudgetMutation.mutate(bp.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <Progress value={bp.pct} className={`h-2 ${bp.pct >= 90 ? "[&>div]:bg-destructive" : bp.pct >= 70 ? "[&>div]:bg-gold" : ""}`} />
                {bp.pct >= 90 && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Exceeding budget!</p>}
                {bp.pct < 70 && bp.pct > 0 && <p className="text-[10px] text-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> On track 👍</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
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

      {/* Recent transactions */}
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
                  <button onClick={() => deleteTxMutation.mutate(tx.id)} className="text-muted-foreground hover:text-destructive p-1">
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

      <TabsContent value="reports">
        <FinancialReportsPanel role={role} />
      </TabsContent>
    </Tabs>
  );
};

export default EarningsExpensesPanel;
