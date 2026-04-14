import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Award, Leaf, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { calculateImpact } from "@/lib/impactUtils";

const COLORS = [
  "hsl(152 45% 22%)", "hsl(40 55% 55%)", "hsl(195 60% 50%)",
  "hsl(25 30% 35%)", "hsl(0 84% 60%)", "hsl(152 50% 12%)",
  "hsl(40 60% 75%)", "hsl(30 25% 65%)",
];

const AnalyticsPanel = () => {
  const { t } = useTranslation();
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

  const impact = calculateImpact(
    (collections || []).map(c => ({ quantity: c.quantity, material_types: (c as any).material_types }))
  );

  const pieData = impact.materialBreakdown.map(m => ({ name: m.name, value: Number(m.kg.toFixed(1)) }));

  // Last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayCollections = collections?.filter(c => c.collected_at.startsWith(dateStr)) || [];
    const total = dayCollections.reduce((s, c) => s + Number(c.quantity), 0);
    return { day: d.toLocaleDateString("en", { weekday: "short" }), kg: Number(total.toFixed(1)) };
  });

  // Impact achievements
  const achievements = [];
  if (impact.totalKg >= 100) achievements.push({ label: "Century Collector", desc: "100+ kg collected" });
  if (impact.co2Avoided >= 200) achievements.push({ label: "Carbon Saver", desc: "200+ kg CO₂ avoided" });
  if (impact.materialBreakdown.length >= 3) achievements.push({ label: "Multi-Material", desc: "3+ material types" });
  if ((collections?.length || 0) >= 50) achievements.push({ label: "Consistency Star", desc: "50+ entries logged" });

  return (
    <div className="space-y-6">
      {/* Impact KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">{t("collectionPanel.totalCollected")}</p>
            <p className="text-xl font-display font-bold">{impact.totalKg.toFixed(0)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">{t("esgPanel.co2Avoided")}</p>
            <p className="text-xl font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">{t("earningsPanel.totalIncome")}</p>
            <p className="text-xl font-display font-bold text-primary">KES {impact.totalEarnings.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Entries</p>
            <p className="text-xl font-display font-bold">{collections?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements / Leaderboard badges */}
      {achievements.length > 0 && (
        <Card className="shadow-soft bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> {t("analyticsPanel.performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {achievements.map(a => (
                <div key={a.label} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                  <Award className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Leaf className="w-4 h-4" /> Material Breakdown</CardTitle></CardHeader>
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
