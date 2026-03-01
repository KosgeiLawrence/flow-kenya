import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Layers, TrendingUp, Users } from "lucide-react";

const InventoryAccessPanel = () => {
  const { user } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["recycler_inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit, icon)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Aggregate by material
  const materialMap = new Map<string, { name: string; qty: number; unit: string; value: number; icon: string }>();
  collections?.forEach((c) => {
    const mt = (c as any).material_types;
    const key = c.material_type_id;
    const existing = materialMap.get(key);
    if (existing) {
      existing.qty += Number(c.quantity);
      existing.value += Number(c.quantity) * Number(mt?.price_per_unit || 0);
    } else {
      materialMap.set(key, {
        name: mt?.name || "Unknown",
        qty: Number(c.quantity),
        unit: mt?.unit || "kg",
        value: Number(c.quantity) * Number(mt?.price_per_unit || 0),
        icon: mt?.icon || "♻️",
      });
    }
  });

  const totalValue = Array.from(materialMap.values()).reduce((s, m) => s + m.value, 0);
  const totalQty = Array.from(materialMap.values()).reduce((s, m) => s + m.qty, 0);

  // Unique aggregators (by user_id)
  const uniqueSuppliers = new Set(collections?.map((c) => c.user_id)).size;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalQty.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">Available Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Layers className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{materialMap.size}</p>
              <p className="text-xs text-muted-foreground">Material Types</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Market Value</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{uniqueSuppliers}</p>
              <p className="text-xs text-muted-foreground">Suppliers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Available Materials from Aggregators</CardTitle></CardHeader>
        <CardContent>
          {!materialMap.size ? (
            <p className="text-sm text-muted-foreground">No inventory data available.</p>
          ) : (
            <div className="divide-y divide-border">
              {Array.from(materialMap.values()).map((m, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{m.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.qty.toFixed(1)} {m.unit} available</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">KES {m.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAccessPanel;
