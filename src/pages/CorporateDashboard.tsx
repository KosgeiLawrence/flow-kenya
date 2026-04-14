import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, Shield, Recycle, Award, Leaf, BookOpen,
  Clock, CheckCircle2, AlertTriangle, Menu, X, ChevronRight,
  Package, HandCoins, BarChart3, Settings, User, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFilteredNavItems } from "@/hooks/useFilteredNavItems";
import { useTranslatedNavItems } from "@/hooks/useTranslatedNavItems";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/dashboard/shared/LanguageToggle";
import PlasticFootprintPanel from "@/components/dashboard/corporate/PlasticFootprintPanel";
import RecoveryCommitmentPanel from "@/components/dashboard/corporate/RecoveryCommitmentPanel";
import RecoveryTrackingPanel from "@/components/dashboard/corporate/RecoveryTrackingPanel";
import EPRCompliancePanel from "@/components/dashboard/corporate/EPRCompliancePanel";
import PlasticOffsetPanel from "@/components/dashboard/corporate/PlasticOffsetPanel";
import ImpactCertificatesPanel from "@/components/dashboard/corporate/ImpactCertificatesPanel";
import ESGAnalyticsPanel from "@/components/dashboard/corporate/ESGAnalyticsPanel";
import CorporateSettingsPanel from "@/components/dashboard/corporate/CorporateSettingsPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import TrainingManagementPanel from "@/components/dashboard/shared/TrainingManagementPanel";
import CleanupExercisePanel from "@/components/dashboard/shared/CleanupExercisePanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import { Users as UsersIcon } from "lucide-react";

const navItems = [
  { id: "footprint", label: "Plastic Footprint", icon: Package },
  { id: "commitment", label: "Recovery & Funding", icon: HandCoins },
  { id: "tracking", label: "Recovery Tracking", icon: BarChart3 },
  { id: "epr", label: "EPR Compliance", icon: Shield },
  { id: "offset", label: "Plastic Offset", icon: Recycle },
  { id: "certificates", label: "Impact Certificates", icon: Award },
  { id: "esg", label: "ESG & Carbon", icon: Leaf },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "cleanup", label: "Cleanup Exercise", icon: Package },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "training-mgmt", label: "Training Management", icon: BookOpen },
  { id: "profile-settings", label: "Profile Settings", icon: User },
];

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-gold" },
  approved: { icon: CheckCircle2, label: "Verified", color: "text-primary" },
  rejected: { icon: AlertTriangle, label: "Rejected", color: "text-destructive" },
};

const CorporateDashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("footprint");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { filteredNavItems, teamDisplayName, teamLogoUrl } = useFilteredNavItems(navItems);
  const translatedNavItems = useTranslatedNavItems(filteredNavItems);
  const { t } = useTranslation();
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
      case "footprint": return <PlasticFootprintPanel />;
      case "commitment": return <RecoveryCommitmentPanel />;
      case "tracking": return <RecoveryTrackingPanel />;
      case "epr": return <EPRCompliancePanel />;
      case "offset": return <PlasticOffsetPanel />;
      case "certificates": return <ImpactCertificatesPanel />;
      case "esg": return <ESGAnalyticsPanel />;
      case "settings": return <CorporateSettingsPanel />;
      case "cleanup": return <CleanupExercisePanel />;
      case "team": return <TeamPanel role="corporate" navItems={navItems} />;
      case "training-mgmt": return <TrainingManagementPanel />;
      case "trash": return <TrashPanel />;
      case "profile-settings": return <ProfileSettingsPanel role="corporate" />;
      default: return <PlasticFootprintPanel />;
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
            {effectiveLogoUrl ? (
              <img src={effectiveLogoUrl} alt={effectiveDisplayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
                {effectiveDisplayName?.charAt(0) || "C"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{effectiveDisplayName || "Corporate"}</p>
              <div className="flex items-center gap-1">
                <StatusIcon className={cn("w-3 h-3", status.color)} />
                <span className={cn("text-xs", status.color)}>{status.label}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {translatedNavItems.map((item) => (
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

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <LanguageToggle />
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

export default CorporateDashboard;
