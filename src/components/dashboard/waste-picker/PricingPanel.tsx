import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

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
              Prices updated by administrators • Last update: {format(new Date(), "MMM d, yyyy")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Material Pricing</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price (KES)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialTypes?.map(mt => (
                <TableRow key={mt.id}>
                  <TableCell className="font-medium">{mt.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{mt.unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    KES {Number(mt.price_per_unit).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingPanel;
