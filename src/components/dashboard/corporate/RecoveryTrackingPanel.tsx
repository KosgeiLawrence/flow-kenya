import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Recycle, MapPin, Users, Leaf, DollarSign, Globe } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";

const CO2_FACTORS: Record<string, number> = {
  pet: 3.1, hdpe: 2.5, ldpe: 1.8, pp: 1.5, ps: 2.7, plastic: 2.5, aluminium: 9.1, glass: 0.6, paper: 1.1,
};

const RecoveryTrackingPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: commitments } = useQuery({
    queryKey: ["recovery_commitments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recovery_commitments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["corp_tracking_collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name, unit)").order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["corp_tracking_payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("status", "completed");
      if (error) throw error;
      return data;
    },
  });

  const { data: declarations } = useQuery({
    queryKey: ["plastic_declarations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plastic_declarations").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalRecoveredKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalObligation = declarations?.reduce((s, d) => s + Number(d.recovery_obligation_kg), 0) || 0;
  const eprProgress = totalObligation > 0 ? Math.min((totalRecoveredKg / totalObligation) * 100, 100) : 0;
  const totalIncome = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  // Unique waste pickers
  const uniquePickers = new Set(collections?.map((c) => c.user_id) || []);

  // CO2 calculation
  const co2Avoided = collections?.reduce((s, c) => {
    const name = ((c as any).material_types?.name || "").toLowerCase();
    const factor = Object.entries(CO2_FACTORS).find(([k]) => name.includes(k))?.[1] || 2.5;
    return s + Number(c.quantity) * factor;
  }, 0) || 0;

  // Material breakdown for pie
  const materialMap: Record<string, number> = {};
  collections?.forEach((c) => {
    const name = (c as any).material_types?.name || "Other";
    materialMap[name] = (materialMap[name] || 0) + Number(c.quantity);
  });
  const pieData = Object.entries(materialMap).map(([name, value]) => ({ name, value }));
  const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)", "hsl(280,50%,50%)"];

  // County distribution
  const countyMap: Record<string, number> = {};
  collections?.forEach((c) => {
    const loc = c.location_name || "Unknown";
    countyMap[loc] = (countyMap[loc] || 0) + Number(c.quantity);
  });
  const countyData = Object.entries(countyMap).slice(0, 8).map(([name, kg]) => ({ name, kg }));

  // Recent batch tracking
  const recentBatches = (collections || []).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* EPR Progress */}
      <Card className="shadow-elevated">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Recycle className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">EPR Obligation Progress</p>
              <p className="text-xs text-muted-foreground">Recovery vs declared obligation</p>
            </div>
            <span className="text-2xl font-bold text-primary">{eprProgress.toFixed(0)}%</span>
          </div>
          <Progress value={eprProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Recovered: {(totalRecoveredKg / 1000).toFixed(1)} t</span>
            <span>Obligation: {(totalObligation / 1000).toFixed(1)} t</span>
          </div>
        </CardContent>
      </Card>

      {/* Impact KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Recycle, label: "Total Recovered", value: `${(totalRecoveredKg / 1000).toFixed(1)} t`, color: "text-primary" },
          { icon: Leaf, label: "CO₂ Avoided", value: `${(co2Avoided / 1000).toFixed(1)} t`, color: "text-primary" },
          { icon: DollarSign, label: "Income Generated", value: `KES ${(totalIncome / 1000).toFixed(0)}K`, color: "text-secondary" },
          { icon: Users, label: "Livelihoods", value: `${uniquePickers.size}`, color: "text-primary" },
          { icon: Globe, label: "Locations", value: `${Object.keys(countyMap).length}`, color: "text-secondary" },
          { icon: Recycle, label: "Batches Tracked", value: `${collections?.length || 0}`, color: "text-primary" },
        ].map((kpi, i) => (
          <Card key={i} className="shadow-soft">
            <CardContent className="p-3 text-center">
              <kpi.icon className={`w-5 h-5 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-sm">Material Breakdown</CardTitle></CardHeader>
          <CardContent>
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-sm">Geographic Distribution</CardTitle></CardHeader>
          <CardContent>
            {countyData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={countyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent batch tracking */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-sm">Recent Batch Tracking</CardTitle></CardHeader>
        <CardContent>
          {!recentBatches.length ? (
            <p className="text-sm text-muted-foreground">No batches tracked yet.</p>
          ) : (
            <div className="space-y-2">
              {recentBatches.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-2 rounded bg-muted/30 border border-border text-sm">
                  <Badge variant="outline" className="font-mono text-xs">{b.batch_id}</Badge>
                  <span className="text-muted-foreground">{(b as any).material_types?.name || "—"}</span>
                  <span className="font-medium">{Number(b.quantity).toFixed(1)} kg</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(b.collected_at).toLocaleDateString()}</span>
                  {b.location_name && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{b.location_name}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecoveryTrackingPanel;
