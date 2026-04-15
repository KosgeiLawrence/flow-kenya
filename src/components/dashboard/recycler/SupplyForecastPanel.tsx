import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Calendar, Package } from "lucide-react";
import { format, subDays, subWeeks } from "date-fns";
import { useTranslation } from "react-i18next";

const SupplyForecastPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["recycler_forecast", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Weekly supply data (last 8 weeks)
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekEnd = subWeeks(new Date(), 7 - i);
    const weekStart = subWeeks(weekEnd, 1);
    const weekCollections = collections?.filter((c) => {
      const d = new Date(c.collected_at);
      return d >= weekStart && d < weekEnd;
    }) || [];
    const qty = weekCollections.reduce((s, c) => s + Number(c.quantity), 0);
    return { week: `W${i + 1}`, supply: Math.round(qty) };
  });

  // Simple forecast: average of last 4 weeks projected 4 weeks ahead
  const recentAvg = weeklyData.slice(-4).reduce((s, w) => s + w.supply, 0) / 4;
  const forecastData = [
    ...weeklyData.slice(-4),
    { week: "F1", supply: Math.round(recentAvg * 1.02) },
    { week: "F2", supply: Math.round(recentAvg * 1.05) },
    { week: "F3", supply: Math.round(recentAvg * 1.03) },
    { week: "F4", supply: Math.round(recentAvg * 1.07) },
  ];

  // Daily last 14 days
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayQty = collections?.filter(
      (c) => format(new Date(c.collected_at), "yyyy-MM-dd") === dateStr
    ).reduce((s, c) => s + Number(c.quantity), 0) || 0;
    return { day: format(date, "dd"), qty: Math.round(dayQty) };
  });

  const totalLast30 = collections?.reduce((s, c) => {
    const d = new Date(c.collected_at);
    return d >= subDays(new Date(), 30) ? s + Number(c.quantity) : s;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalLast30.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">Last 30 Days Supply</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="w-7 h-7 text-secondary" />
            <div>
              <p className="text-xl font-bold text-foreground">{Math.round(recentAvg)} kg</p>
              <p className="text-xs text-muted-foreground">Weekly Average</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{Math.round(recentAvg * 4)} kg</p>
              <p className="text-xs text-muted-foreground">Monthly Forecast</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden shadow-soft">
          <CardHeader><CardTitle className="text-lg">14-Day Supply Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => `${v} kg`} />
                <Bar dataKey="qty" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <CardHeader><CardTitle className="text-lg">Supply Forecast (4 weeks)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastData}>
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => `${v} kg`} />
                <Line type="monotone" dataKey="supply" stroke="hsl(40,55%,55%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplyForecastPanel;
