import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, Phone, Mail, Building2, Shield, Leaf, Droplets, Trash2 } from "lucide-react";
import { calculateImpact } from "@/lib/impactUtils";

const ProfilePanel = () => {
  const { user, profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["collections_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const impact = calculateImpact(
    (collections || []).map(c => ({ quantity: c.quantity, material_types: (c as any).material_types }))
  );

  const statusMap: Record<string, { icon: React.ElementType; label: string; variant: "default" | "secondary" | "destructive" }> = {
    pending: { icon: Clock, label: "Pending Verification", variant: "secondary" },
    approved: { icon: CheckCircle2, label: "Verified", variant: "default" },
    rejected: { icon: AlertTriangle, label: "Rejected", variant: "destructive" },
  };

  const s = statusMap[profile?.approval_status || "pending"];
  const StatusIcon = s.icon;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Card */}
      <Card className="shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-primary">
                  {profile?.full_name?.charAt(0) || "W"}
                </span>
              </div>
              <div>
                <CardTitle className="text-xl">{profile?.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Waste Picker</p>
              </div>
            </div>
            <Badge variant={s.variant} className="gap-1.5">
              <StatusIcon className="w-3.5 h-3.5" />
              {s.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile?.phone_number && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{profile.phone_number}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>
            {profile?.national_id && (
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span>ID: •••{profile.national_id.slice(-4)}</span>
              </div>
            )}
            {!profile?.is_independent && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>Organization Member</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Impact */}
      <Card className="shadow-soft border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> Your Cumulative Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Collected</p>
              <p className="text-lg font-display font-bold">{impact.totalKg.toFixed(0)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Leaf className="w-3 h-3" /> CO₂ Avoided</p>
              <p className="text-lg font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Droplets className="w-3 h-3" /> Water Saved</p>
              <p className="text-lg font-display font-bold">{impact.waterSaved.toFixed(0)} L</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" /> Landfill</p>
              <p className="text-lg font-display font-bold">{impact.landfillReduced.toFixed(2)} m³</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending notice */}
      {profile?.approval_status === "pending" && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Clock className="w-5 h-5 text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Account Pending Approval</p>
              <p className="text-sm text-muted-foreground">
                Your account is awaiting administrator verification. Some features may be limited until approval.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePanel;
