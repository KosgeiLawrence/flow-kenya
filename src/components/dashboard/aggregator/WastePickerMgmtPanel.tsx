import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserCheck, Clock, Search, TrendingUp, Package } from "lucide-react";
import { toast } from "sonner";

const WastePickerMgmtPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: pickers, isLoading } = useQuery({
    queryKey: ["aggregator_pickers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role)")
        .eq("user_roles.role", "waste_picker");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Collection stats are only visible to the picker themselves or admins
  // Aggregators can see picker profiles but not their collection details
  const pickerCollections: any[] = [];

  const getPickerStats = (userId: string) => {
    const cols = pickerCollections?.filter(c => c.user_id === userId) || [];
    const totalKg = cols.reduce((s, c) => s + Number(c.quantity), 0);
    const totalValue = cols.reduce((s, c) => s + Number(c.quantity) * Number((c as any).material_types?.price_per_unit || 0), 0);
    return { count: cols.length, totalKg, totalValue };
  };

  const approved = pickers?.filter((p) => p.approval_status === "approved") || [];
  const pending = pickers?.filter((p) => p.approval_status === "pending") || [];

  const filtered = pickers?.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone_number?.includes(search) || p.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      approved: { variant: "default", label: "Verified" },
      pending: { variant: "secondary", label: "Pending" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{pickers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Pickers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <UserCheck className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{approved.length}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="w-8 h-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-foreground">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending Verification</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search pickers by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Picker list with performance */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Waste Pickers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground">No waste pickers found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p) => {
                const stats = getPickerStats(p.user_id);
                return (
                  <div key={p.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                          {p.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">{p.phone_number || p.email || "—"}</p>
                        </div>
                      </div>
                      {statusBadge(p.approval_status)}
                    </div>
                    {/* Performance stats */}
                    <div className="flex items-center gap-4 pl-12 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> {stats.count} collections
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {stats.totalKg.toFixed(1)} kg
                      </span>
                      <span className="font-medium text-foreground">
                        KES {stats.totalValue.toLocaleString()}
                      </span>
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

export default WastePickerMgmtPanel;
