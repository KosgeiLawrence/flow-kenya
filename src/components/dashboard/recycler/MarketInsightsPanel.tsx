import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import MarketPriceEditor from "@/components/dashboard/shared/MarketPriceEditor";
import MaterialIcon from "@/components/dashboard/shared/MaterialIcon";
import { useTranslation } from "react-i18next";

const MarketInsightsPanel = () => {
  const { t } = useTranslation();
  const { data: materials } = useQuery({
    queryKey: ["recycler_market_prices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Simulated trend data (in production this would come from price history)
  const trendData = (materials || []).map((m, i) => {
    const trends = [5.2, -2.1, 0, 3.8, -1.5, 7.3, 0.5];
    const trend = trends[i % trends.length];
    return { ...m, trend };
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">{t("recyclerPanels.marketInsights")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!trendData.length ? (
            <p className="text-sm text-muted-foreground">{t("pricingPanel.noPrices")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trendData.map((m) => {
                const TrendIcon = m.trend > 0 ? TrendingUp : m.trend < 0 ? TrendingDown : Minus;
                const trendColor = m.trend > 0 ? "text-primary" : m.trend < 0 ? "text-destructive" : "text-muted-foreground";
                return (
                  <div key={m.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MaterialIcon iconName={m.icon} className="w-5 h-5 text-primary" />
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`flex items-center gap-1 ${trendColor}`}>
                          <TrendIcon className="w-4 h-4" />
                          <span className="text-xs font-medium">{m.trend > 0 ? "+" : ""}{m.trend}%</span>
                        </div>
                        <MarketPriceEditor materialId={m.id} currentPrice={Number(m.price_per_unit)} unit={m.unit} />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-foreground">KES {Number(m.price_per_unit).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">per {m.unit}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">{t("recyclerPanels.marketNotes", "Market Notes")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-foreground">PET Demand Rising</p>
              <p className="text-xs text-muted-foreground">Regional demand for PET has increased due to new EPR regulations. Expect price stability.</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border border-accent/20">
              <p className="text-sm font-medium text-foreground">E-Waste Premium</p>
              <p className="text-xs text-muted-foreground">E-waste commands premium pricing due to precious metal recovery value.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketInsightsPanel;
