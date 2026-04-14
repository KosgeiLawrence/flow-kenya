import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { useTranslation } from "react-i18next";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const ProfitAnalyticsPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["aggregator_analytics_collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, price_per_unit, unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ["aggregator_analytics_payments", user?.id],
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

  // Revenue (value of collected materials)
  const totalRevenue = collections?.reduce((s, c) => {
    const mt = (c as any).material_types;
    return s + Number(c.quantity) * Number(mt?.price_per_unit || 0);
  }, 0) || 0;

  // Cost (payments made to pickers)
  const totalCost = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const profit = totalRevenue - totalCost;

  // 7-day chart
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayCollections = collections?.filter(
      (c) => format(new Date(c.collected_at), "yyyy-MM-dd") === dateStr
    ) || [];
    const revenue = dayCollections.reduce((s, c) => {
      const mt = (c as any).material_types;
      return s + Number(c.quantity) * Number(mt?.price_per_unit || 0);
    }, 0);
    return { day: format(date, "EEE"), revenue };
  });

  // Material breakdown for pie
  const materialMap = new Map<string, number>();
  collections?.forEach((c) => {
    const mt = (c as any).material_types;
    const name = mt?.name || "Unknown";
    materialMap.set(name, (materialMap.get(name) || 0) + Number(c.quantity) * Number(mt?.price_per_unit || 0));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingDown className="w-7 h-7 text-destructive" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {totalCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="w-7 h-7 text-accent" />
            <div>
              <p className={`text-xl font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                KES {profit.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Net Profit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{collections?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Collections</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">7-Day Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Revenue by Material</CardTitle></CardHeader>
          <CardContent>
            {!pieData.length ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitAnalyticsPanel;
