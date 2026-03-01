import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, Phone, Mail, Building2, Shield } from "lucide-react";

const ProfilePanel = () => {
  const { user, profile } = useAuth();

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
