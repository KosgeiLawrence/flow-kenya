import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Factory, Droplets, Zap, MapPin, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const ImpactMetricsPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["ngo_impact_collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pickers } = useQuery({
    queryKey: ["ngo_impact_pickers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_roles!inner(role)")
        .eq("user_roles.role", "waste_picker");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = (totalKg * 2.5).toFixed(1);
  const waterSaved = (totalKg * 18).toFixed(0);
  const energySaved = (totalKg * 5.8).toFixed(1);

  // Unique locations
  const locations = new Set(collections?.map((c) => c.location_name).filter(Boolean));

  // 14-day trend
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const qty = collections?.filter(
      (c) => format(new Date(c.collected_at), "yyyy-MM-dd") === dateStr
    ).reduce((s, c) => s + Number(c.quantity), 0) || 0;
    return { day: format(date, "dd"), qty: Math.round(qty) };
  });

  // Material breakdown
  const materialMap = new Map<string, number>();
  collections?.forEach((c) => {
    const name = (c as any).material_types?.name || "Unknown";
    materialMap.set(name, (materialMap.get(name) || 0) + Number(c.quantity));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Leaf className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{totalKg.toFixed(0)} kg</p>
            <p className="text-[10px] text-muted-foreground">Total Collected</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Factory className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{co2Saved}</p>
            <p className="text-[10px] text-muted-foreground">kg CO₂ Offset</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Droplets className="w-6 h-6 text-sky mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{Number(waterSaved).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Liters Water Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{energySaved}</p>
            <p className="text-[10px] text-muted-foreground">kWh Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{pickers?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Pickers Supported</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{locations.size}</p>
            <p className="text-[10px] text-muted-foreground">Collection Sites</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">14-Day Collection Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v} kg`} />
                <Bar dataKey="qty" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Material Breakdown</CardTitle></CardHeader>
          <CardContent>
            {!pieData.length ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} kg`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geo-mapping placeholder */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Collection Locations</CardTitle></CardHeader>
        <CardContent>
          {!locations.size ? (
            <p className="text-sm text-muted-foreground">No location data recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(locations).map((loc, i) => {
                const locCollections = collections?.filter((c) => c.location_name === loc) || [];
                const locQty = locCollections.reduce((s, c) => s + Number(c.quantity), 0);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{loc}</p>
                      <p className="text-xs text-muted-foreground">{locQty.toFixed(1)} kg · {locCollections.length} entries</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImpactMetricsPanel;
