import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Factory, Droplets, Zap, MapPin, Users, UserCheck, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { getCO2Avoided } from "@/lib/impactFactors";
import { useTranslation } from "react-i18next";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)", "hsl(280,50%,50%)"];

const ImpactMetricsPanel = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const { derived } = usePlatformStats();

  // NGO still needs detailed collection-level data for date/material filtering
  const { data: collections } = useQuery({
    queryKey: ["ngo_impact_collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Filter collections by date range
  const filtered = (collections || []).filter(c => {
    if (dateRange === "7d") return new Date(c.collected_at) >= subDays(new Date(), 7);
    if (dateRange === "30d") return new Date(c.collected_at) >= subDays(new Date(), 30);
    if (dateRange === "90d") return new Date(c.collected_at) >= subDays(new Date(), 90);
    return true;
  }).filter(c => {
    if (materialFilter === "all") return true;
    return (c as any).material_types?.name === materialFilter;
  });

  const totalKg = filtered.reduce((s, c) => s + Number(c.quantity), 0);
  const totalIncome = filtered.reduce((s, c) => {
    const mt = (c as any).material_types;
    return s + Number(c.quantity) * Number(mt?.price_per_unit || 0);
  }, 0);

  const co2Saved = filtered.reduce((s, c) => {
    const name = (c as any).material_types?.name || "";
    return s + getCO2Avoided(name, Number(c.quantity));
  }, 0);

  // Use centralized stats for demographics
  const d = derived ?? { womenCount: 0, youthCount: 0, waterSaved: 0, collectionSites: 0 };

  const uniqueCollectorIds = new Set(filtered.map(c => c.user_id));
  const materialNames = [...new Set(collections?.map(c => (c as any).material_types?.name).filter(Boolean) || [])];

  // 14-day trend
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const qty = filtered.filter(c => format(new Date(c.collected_at), "yyyy-MM-dd") === dateStr)
      .reduce((s, c) => s + Number(c.quantity), 0);
    return { day: format(date, "dd"), qty: Math.round(qty) };
  });

  const materialMap = new Map<string, number>();
  filtered.forEach(c => {
    const name = (c as any).material_types?.name || "Unknown";
    materialMap.set(name, (materialMap.get(name) || 0) + Number(c.quantity));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));

  const locations = new Set(filtered.map(c => c.location_name).filter(Boolean));
  const geoMap = new Map<string, number>();
  filtered.forEach(c => {
    const loc = c.location_name || "Unknown";
    geoMap.set(loc, (geoMap.get(loc) || 0) + Number(c.quantity));
  });
  const geoData = Array.from(geoMap.entries()).map(([name, value]) => ({ name, kg: Math.round(value) })).sort((a, b) => b.kg - a.kg).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {materialNames.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Leaf className="w-6 h-6 text-primary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{totalKg.toFixed(0)} kg</p><p className="text-[10px] text-muted-foreground">Total Collected</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Factory className="w-6 h-6 text-primary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{co2Saved.toFixed(0)} kg</p><p className="text-[10px] text-muted-foreground">CO₂ Avoided</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Zap className="w-6 h-6 text-secondary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">KES {totalIncome.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Income Generated</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-primary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{uniqueCollectorIds.size}</p><p className="text-[10px] text-muted-foreground">Livelihoods Supported</p></CardContent></Card>
      </div>

      {/* Women & Youth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Heart className="w-6 h-6 text-secondary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{d.womenCount}</p><p className="text-[10px] text-muted-foreground">Women Participants</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><UserCheck className="w-6 h-6 text-primary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{d.youthCount}</p><p className="text-[10px] text-muted-foreground">Youth (&lt;35 yrs)</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Droplets className="w-6 h-6 text-sky mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{(totalKg * 18).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Liters Water Saved</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{locations.size}</p><p className="text-[10px] text-muted-foreground">Collection Sites</p></CardContent></Card>
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

      {/* Geographic Distribution */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Geographic Impact Distribution</CardTitle></CardHeader>
        <CardContent>
          {!geoData.length ? (
            <p className="text-sm text-muted-foreground">No location data recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, geoData.length * 35)}>
              <BarChart data={geoData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                <Tooltip formatter={(v: number) => `${v} kg`} />
                <Bar dataKey="kg" fill="hsl(40,55%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImpactMetricsPanel;
