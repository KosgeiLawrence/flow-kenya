import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Leaf } from "lucide-react";
import { format } from "date-fns";
import MarketPriceEditor from "@/components/dashboard/shared/MarketPriceEditor";
import MaterialIcon from "@/components/dashboard/shared/MaterialIcon";

const CO2_FACTORS: Record<string, number> = {
  PET: 3.1, HDPE: 1.8, LDPE: 2.0, PP: 1.7, PS: 3.0,
  Aluminium: 9.1, Glass: 0.6, Paper: 1.1, Cardboard: 0.9,
  Metal: 4.5, "Mixed Plastic": 2.5,
};

const PricingPanel = () => {
  const { data: materialTypes, isLoading } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("price_per_unit", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Live Market Prices</p>
            <p className="text-xs text-muted-foreground">
              Tap the edit icon to update prices • Last update: {format(new Date(), "MMM d, yyyy")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Material Pricing & Environmental Value</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price (KES)</TableHead>
                <TableHead className="text-center">Edit</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center gap-1 justify-end"><Leaf className="w-3.5 h-3.5" /> CO₂/kg</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialTypes?.map(mt => (
                <TableRow key={mt.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <MaterialIcon iconName={mt.icon} className="w-5 h-5 text-primary" />
                      {mt.name}
                    </span>
                  </TableCell>
                  <TableCell><Badge variant="outline">{mt.unit}</Badge></TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    KES {Number(mt.price_per_unit).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <MarketPriceEditor materialId={mt.id} currentPrice={Number(mt.price_per_unit)} unit={mt.unit} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(CO2_FACTORS[mt.name] || 2.0).toFixed(1)} kg
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-soft bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Impact note:</strong> The CO₂/kg column shows how much carbon dioxide is avoided per kg of this material recycled instead of produced from raw resources. Higher values mean greater environmental benefit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingPanel;
