import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Users, CreditCard, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import { ROLE_PRICING } from "@/lib/stripePlans";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(340,55%,50%)", "hsl(270,40%,50%)", "hsl(80,40%,40%)"];

const ROLE_LABELS: Record<string, string> = {
  waste_picker: "Waste Picker",
  aggregator: "Aggregator",
  recycler: "Recycler",
  ngo: "NGO",
  corporate: "Corporate",
  county_government: "County Gov",
};

type ViewPeriod = "today" | "week" | "month" | "year" | "all";

const RevenueInsightsPanel = () => {
  const { t } = useTranslation();
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("month");

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["admin_payments_insights"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin_subscriptions_insights"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user roles for breakdown
  const { data: userRoles = [] } = useQuery({
    queryKey: ["admin_user_roles_insights"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles" as any).select("role");
      if (error) throw error;
      return (data || []) as unknown as { role: string }[];
    },
  });

  // Fetch admin invoices
  const { data: adminInvoices = [] } = useQuery({
    queryKey: ["admin_invoices_insights"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_invoices" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const getDateRange = (period: ViewPeriod) => {
    const now = new Date();
    switch (period) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "week": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
      case "year": return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
      case "all": return { start: new Date(2020, 0, 1), end: now };
    }
  };

  const filteredPayments = useMemo(() => {
    const range = getDateRange(viewPeriod);
    return payments.filter(p => {
      const d = new Date(p.created_at);
      return isWithinInterval(d, range);
    });
  }, [payments, viewPeriod]);

  const completedPayments = filteredPayments.filter(p => p.status === "completed");
  const pendingPayments = filteredPayments.filter(p => p.status === "pending");

  const totalRevenue = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const pendingRevenue = pendingPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalTransactions = filteredPayments.length;
  const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;

  // Invoice revenue
  const paidInvoices = adminInvoices.filter((i: any) => i.status === "paid");
  const invoiceRevenue = paidInvoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

  // Revenue by role (from payment descriptions)
  const revenueByRole = useMemo(() => {
    const roleMap: Record<string, number> = {};
    completedPayments.forEach(p => {
      const desc = p.description || p.merchant_request_id || "";
      const roleMatch = Object.keys(ROLE_PRICING).find(r => desc.toLowerCase().includes(r.replace("_", " ")) || desc.includes(r));
      const role = roleMatch || "other";
      roleMap[role] = (roleMap[role] || 0) + Number(p.amount);
    });
    return Object.entries(roleMap).map(([role, amount]) => ({
      name: ROLE_LABELS[role] || "Other",
      value: amount,
    })).sort((a, b) => b.value - a.value);
  }, [completedPayments]);

  // Monthly trend (last 12 months)
  const monthlyTrend = useMemo(() => {
    const months: { month: string; revenue: number; transactions: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthPayments = payments.filter(p => p.status === "completed" && isWithinInterval(new Date(p.created_at), { start, end }));
      months.push({
        month: format(d, "MMM yyyy"),
        revenue: monthPayments.reduce((s, p) => s + Number(p.amount), 0),
        transactions: monthPayments.length,
      });
    }
    return months;
  }, [payments]);

  // User distribution by role
  const roleDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    userRoles.forEach((ur: any) => {
      const r = ur.role as string;
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([role, count]) => ({
      name: ROLE_LABELS[role] || role,
      value: count,
    }));
  }, [userRoles]);

  // Subscription status distribution
  const subStatusDist = useMemo(() => {
    const map: Record<string, number> = {};
    subscriptions.forEach(s => {
      map[s.status] = (map[s.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [subscriptions]);

  const formatKES = (v: number) => `KES ${v.toLocaleString("en-KE")}`;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        {(["today", "week", "month", "year", "all"] as ViewPeriod[]).map(p => (
          <Badge
            key={p}
            variant={viewPeriod === p ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => setViewPeriod(p)}
          >
            {p === "all" ? "All Time" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "year" ? "This Year" : "Today"}
          </Badge>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" /> Revenue
            </div>
            <p className="text-xl font-bold text-foreground">{formatKES(totalRevenue)}</p>
            {pendingRevenue > 0 && <p className="text-xs text-amber-600">+{formatKES(pendingRevenue)} pending</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CreditCard className="w-4 h-4" /> Transactions
            </div>
            <p className="text-xl font-bold text-foreground">{totalTransactions}</p>
            <p className="text-xs text-muted-foreground">{completedPayments.length} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" /> Active Subs
            </div>
            <p className="text-xl font-bold text-foreground">{activeSubscriptions}</p>
            <p className="text-xs text-muted-foreground">{subscriptions.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="w-4 h-4" /> Users
            </div>
            <p className="text-xl font-bold text-foreground">{userRoles.length}</p>
            <p className="text-xs text-muted-foreground">{roleDistribution.length} roles</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice revenue summary */}
      {invoiceRevenue > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Custom Invoice Revenue</p>
              <p className="text-lg font-bold">{formatKES(invoiceRevenue)}</p>
            </div>
            <Badge variant="outline" className="ml-auto">{paidInvoices.length} paid invoices</Badge>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">Revenue Trend</TabsTrigger>
          <TabsTrigger value="roles">By Role</TabsTrigger>
          <TabsTrigger value="users">User Distribution</TabsTrigger>
          <TabsTrigger value="subs">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Revenue (Last 12 Months)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatKES(v)} />
                    <Bar dataKey="revenue" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue by Role</CardTitle></CardHeader>
            <CardContent>
              {revenueByRole.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueByRole} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${formatKES(value)}`}>
                        {revenueByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatKES(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle className="text-base">Users by Role</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleDistribution} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(40,55%,55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subs">
          <Card>
            <CardHeader><CardTitle className="text-base">Subscription Status</CardTitle></CardHeader>
            <CardContent>
              {subStatusDist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet</p>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subStatusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {subStatusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent payments table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Amount</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Description</th>
                  <th className="text-left py-2 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.slice(0, 20).map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{format(new Date(p.created_at), "dd MMM yyyy")}</td>
                    <td className="py-2 font-medium">{formatKES(Number(p.amount))}</td>
                    <td className="py-2">
                      <Badge variant={p.status === "completed" ? "default" : p.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-muted-foreground truncate max-w-[200px]">{p.description || "-"}</td>
                    <td className="py-2 text-muted-foreground">{p.phone_number}</td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No payments in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueInsightsPanel;
