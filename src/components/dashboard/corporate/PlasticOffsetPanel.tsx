import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Recycle, TrendingUp, Target, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";

const PlasticOffsetPanel = () => {
  const { t } = useTranslation();
  const { data: collections } = useQuery({
    queryKey: ["corp_plastic_offset"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const plasticCollections = collections?.filter((c) => {
    const name = ((c as any).material_types?.name || "").toLowerCase();
    return name.includes("pet") || name.includes("hdpe") || name.includes("plastic");
  }) || [];

  const totalPlasticKg = plasticCollections.reduce((s, c) => s + Number(c.quantity), 0);
  const annualTarget = 5000;
  const progress = Math.min((totalPlasticKg / annualTarget) * 100, 100);

  // Monthly data (last 12 months)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const monthStr = format(month, "yyyy-MM");
    const qty = plasticCollections
      .filter((c) => format(new Date(c.collected_at), "yyyy-MM") === monthStr)
      .reduce((s, c) => s + Number(c.quantity), 0);
    return { month: format(month, "MMM"), kg: Math.round(qty) };
  });

  const avgMonthly = totalPlasticKg / 12;
  const monthsToTarget = progress >= 100 ? 0 : Math.ceil((annualTarget - totalPlasticKg) / Math.max(avgMonthly, 1));

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Recycle className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">Plastic Offset Progress</p>
              <p className="text-xs text-muted-foreground">{totalPlasticKg.toFixed(0)} / {annualTarget} kg annual target</p>
            </div>
          </div>
          <Progress value={progress} className="h-4" />
          <p className="text-sm font-medium text-foreground mt-2">{progress.toFixed(1)}% complete</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Target className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{totalPlasticKg.toFixed(0)} kg</p>
            <p className="text-xs text-muted-foreground">Total Offset</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 text-accent mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{avgMonthly.toFixed(0)} kg</p>
            <p className="text-xs text-muted-foreground">Monthly Avg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Calendar className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{progress >= 100 ? "Done!" : `${monthsToTarget} mo`}</p>
            <p className="text-xs text-muted-foreground">Est. to Target</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Monthly Plastic Offset</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v} kg`} />
              <Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlasticOffsetPanel;
