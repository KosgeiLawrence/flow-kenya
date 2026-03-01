import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

const WastePickerMgmtPanel = () => {
  const { user } = useAuth();

  // Fetch all waste picker profiles (aggregators can see pickers linked to their org)
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

  const approved = pickers?.filter((p) => p.approval_status === "approved") || [];
  const pending = pickers?.filter((p) => p.approval_status === "pending") || [];

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
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Picker list */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Waste Pickers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !pickers?.length ? (
            <p className="text-sm text-muted-foreground">No waste pickers found.</p>
          ) : (
            <div className="divide-y divide-border">
              {pickers.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WastePickerMgmtPanel;
