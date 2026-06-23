import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  waste_picker: "Waste Picker",
  aggregator: "Aggregator",
  recycler: "Recycler",
  ngo: "NGO",
  corporate: "Corporate",
  county_government: "County Government",
  admin: "Admin",
};

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending Approval", color: "text-gold" },
  approved: { icon: CheckCircle2, label: "Approved", color: "text-primary" },
  rejected: { icon: AlertTriangle, label: "Rejected", color: "text-destructive" },
};

const Dashboard = () => {
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const status = statusConfig[profile?.approval_status || "pending"];
  const StatusIcon = status.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-display font-bold text-foreground">Twende Green Ecocycle</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {roleLabels[role || ""] || role}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto p-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-soft">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Welcome, {profile?.full_name || "User"}
          </h2>
          <p className="text-muted-foreground mb-6">
            Your {roleLabels[role || ""]} dashboard is being built. You're signed in as <strong>{user?.email}</strong>.
          </p>

          {profile?.approval_status === "pending" && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-gold mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Account Pending Approval</p>
                <p className="text-sm text-muted-foreground">
                  Your account is awaiting administrator verification. Some features may be limited until approval.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
