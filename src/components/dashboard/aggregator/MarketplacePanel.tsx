import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Recycle, ArrowRight, Search, Mail, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MarketPriceEditor from "@/components/dashboard/shared/MarketPriceEditor";

const MarketplacePanel = () => {
  const { user, profile } = useAuth();
  const [selectedRecycler, setSelectedRecycler] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: recyclers } = useQuery({
    queryKey: ["recycler_profiles"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "recycler");
      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const userIds = roleData.map(r => r.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*, organizations(name, type)")
        .in("user_id", userIds)
        .eq("approval_status", "approved");
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

  const filteredRecyclers = recyclers?.filter(r =>
    !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).organizations?.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-primary">KES {Number(m.price_per_unit).toFixed(2)}</p>
                    <MarketPriceEditor materialId={m.id} currentPrice={Number(m.price_per_unit)} unit={m.unit} />
                  </div>
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
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search recyclers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {!filteredRecyclers.length ? (
            <div className="text-center py-8">
              <Recycle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recyclers found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRecyclers.map((r) => (
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRecycler(r)}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recycler detail dialog */}
      <Dialog open={!!selectedRecycler} onOpenChange={() => setSelectedRecycler(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedRecycler?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {(selectedRecycler as any)?.organizations?.name || "Independent Recycler"}
            </p>
            {selectedRecycler?.phone_number && (
              <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /> {selectedRecycler.phone_number}</div>
            )}
            {selectedRecycler?.email && (
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /> {selectedRecycler.email}</div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Contact this recycler directly to arrange material sales and negotiate pricing.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplacePanel;
