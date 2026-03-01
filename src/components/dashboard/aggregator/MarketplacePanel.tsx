import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Recycle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const MarketplacePanel = () => {
  // Fetch recyclers from profiles
  const { data: recyclers } = useQuery({
    queryKey: ["recycler_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role), organizations(name, type)")
        .eq("user_roles.role", "recycler");
      if (error) throw error;
      return data;
    },
  });

  const { data: materials } = useQuery({
    queryKey: ["material_types_marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Material prices */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> Current Market Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!materials?.length ? (
            <p className="text-sm text-muted-foreground">No pricing data available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.icon || "♻️"}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">per {m.unit}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-primary">KES {Number(m.price_per_unit).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recycler directory */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Recycle className="w-5 h-5 text-primary" /> Recycler Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recyclers?.length ? (
            <div className="text-center py-8">
              <Recycle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recyclers registered yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Recyclers will appear here once they join the platform.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recyclers.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {r.full_name?.charAt(0) || "R"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(r as any).organizations?.name || "Independent"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.approval_status === "approved" ? "default" : "secondary"}>
                      {r.approval_status === "approved" ? "Active" : "Pending"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplacePanel;
