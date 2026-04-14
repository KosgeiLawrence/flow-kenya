import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, Heart, BarChart3, Briefcase, FileText, Package,
  Clock, CheckCircle2, AlertTriangle, Menu, X, ChevronRight, Settings, BookOpen, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFilteredNavItems } from "@/hooks/useFilteredNavItems";
import SponsorshipPanel from "@/components/dashboard/ngo/SponsorshipPanel";
import ImpactMetricsPanel from "@/components/dashboard/ngo/ImpactMetricsPanel";
import GrantsPanel from "@/components/dashboard/ngo/GrantsPanel";
import ReportsPanel from "@/components/dashboard/ngo/ReportsPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import TrainingManagementPanel from "@/components/dashboard/shared/TrainingManagementPanel";
import CleanupExercisePanel from "@/components/dashboard/shared/CleanupExercisePanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import { Users as UsersIcon } from "lucide-react";

const navItems = [
  { id: "sponsorship", label: "Community & Pickers", icon: Heart },
  { id: "impact", label: "Impact & Mapping", icon: BarChart3 },
  { id: "grants", label: "Grants & Programs", icon: Briefcase },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "cleanup", label: "Cleanup Exercise", icon: Package },
  { id: "training-mgmt", label: "Training Management", icon: BookOpen },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Profile Settings", icon: Settings },
];

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-gold" },
  approved: { icon: CheckCircle2, label: "Verified", color: "text-primary" },
  rejected: { icon: AlertTriangle, label: "Rejected", color: "text-destructive" },
};

const NGODashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("sponsorship");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { filteredNavItems, teamDisplayName, teamLogoUrl } = useFilteredNavItems(navItems);
  const effectiveDisplayName = teamDisplayName || displayName;
  const effectiveLogoUrl = teamLogoUrl || orgLogoUrl;

  const status = statusConfig[profile?.approval_status || "pending"];
  const StatusIcon = status.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "sponsorship": return <SponsorshipPanel />;
      case "impact": return <ImpactMetricsPanel />;
      case "grants": return <GrantsPanel />;
      case "reports": return <ReportsPanel />;
      case "cleanup": return <CleanupExercisePanel />;
      case "training-mgmt": return <TrainingManagementPanel />;
      case "team": return <TeamPanel role="ngo" navItems={navItems} />;
      case "trash": return <TrashPanel />;
      case "settings": return <ProfileSettingsPanel role="ngo" />;
      default: return <SponsorshipPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-display font-bold">Duara Flow</h1>
            <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {effectiveLogoUrl || profile?.avatar_url ? (
              <img src={effectiveLogoUrl || profile?.avatar_url || ""} alt={effectiveDisplayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
                {effectiveDisplayName?.charAt(0) || "N"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{effectiveDisplayName || "NGO"}</p>
              <div className="flex items-center gap-1">
                <StatusIcon className={cn("w-3 h-3", status.color)} />
                <span className={cn("text-xs", status.color)}>{status.label}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActivePanel(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                activePanel === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {activePanel === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card border-b border-border h-14 flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-display font-semibold text-foreground">
            {navItems.find(n => n.id === activePanel)?.label}
          </h2>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
};

export default NGODashboard;
