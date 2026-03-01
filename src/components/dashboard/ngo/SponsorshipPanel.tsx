import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Heart, MapPin } from "lucide-react";

const SponsorshipPanel = () => {
  const { data: pickers } = useQuery({
    queryKey: ["ngo_pickers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role), organizations(name)")
        .eq("user_roles.role", "waste_picker");
      if (error) throw error;
      return data;
    },
  });

  const approved = pickers?.filter((p) => p.approval_status === "approved") || [];
  const pending = pickers?.filter((p) => p.approval_status === "pending") || [];
  const independent = pickers?.filter((p) => p.is_independent) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{pickers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Pickers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <UserCheck className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{approved.length}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Heart className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{independent.length}</p>
              <p className="text-xs text-muted-foreground">Independent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <MapPin className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending Verification</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community members */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Community Waste Pickers</CardTitle></CardHeader>
        <CardContent>
          {!pickers?.length ? (
            <p className="text-sm text-muted-foreground">No waste pickers registered yet.</p>
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
                      <p className="text-xs text-muted-foreground">
                        {(p as any).organizations?.name || (p.is_independent ? "Independent" : "—")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.is_independent && <Badge variant="secondary">Independent</Badge>}
                    <Badge variant={p.approval_status === "approved" ? "default" : "secondary"}>
                      {p.approval_status === "approved" ? "Verified" : "Pending"}
                    </Badge>
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

export default SponsorshipPanel;
