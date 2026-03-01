import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(152 45% 22%)", "hsl(40 55% 55%)", "hsl(195 60% 50%)",
  "hsl(25 30% 35%)", "hsl(0 84% 60%)", "hsl(152 50% 12%)",
  "hsl(40 60% 75%)", "hsl(30 25% 65%)",
];

const AnalyticsPanel = () => {
  const { user } = useAuth();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections_analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .eq("user_id", user!.id)
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  // Material breakdown
  const materialBreakdown = collections?.reduce((acc, c) => {
    const name = (c as any).material_types?.name || "Unknown";
    acc[name] = (acc[name] || 0) + Number(c.quantity);
    return acc;
  }, {} as Record<string, number>) || {};

  const pieData = Object.entries(materialBreakdown).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));

  // Last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayCollections = collections?.filter(c => c.collected_at.startsWith(dateStr)) || [];
    const total = dayCollections.reduce((s, c) => s + Number(c.quantity), 0);
    return { day: d.toLocaleDateString("en", { weekday: "short" }), kg: Number(total.toFixed(1)) };
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalEarnings = collections?.reduce((s, c) => s + Number(c.quantity) * Number((c as any).material_types?.price_per_unit || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Collected</p>
            <p className="text-xl font-display font-bold">{totalKg.toFixed(0)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Earned</p>
            <p className="text-xl font-display font-bold text-primary">KES {totalEarnings.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Entries</p>
            <p className="text-xl font-display font-bold">{collections?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Materials</p>
            <p className="text-xl font-display font-bold">{pieData.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Last 7 Days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last7Days}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="kg" fill="hsl(152 45% 22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" /> Material Breakdown</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
