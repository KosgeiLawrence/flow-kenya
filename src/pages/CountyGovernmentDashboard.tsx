import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, BarChart3, FileText, Scale, Menu, X, ChevronRight, Settings, BookOpen, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFilteredNavItems } from "@/hooks/useFilteredNavItems";
import { useTranslatedNavItems } from "@/hooks/useTranslatedNavItems";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/dashboard/shared/LanguageToggle";
import WasteFlowPanel from "@/components/dashboard/county/WasteFlowPanel";
import CountyReportsPanel from "@/components/dashboard/county/CountyReportsPanel";
import RegulatoryPanel from "@/components/dashboard/county/RegulatoryPanel";
import CountyAnalyticsPanel from "@/components/dashboard/county/CountyAnalyticsPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import TrainingManagementPanel from "@/components/dashboard/shared/TrainingManagementPanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import { Users as UsersIcon } from "lucide-react";

const navItems = [
  { id: "waste-flow", label: "Waste Flow Dashboard", icon: MapPin },
  { id: "analytics", label: "County Analytics", icon: BarChart3 },
  { id: "reports", label: "Monthly Reports", icon: FileText },
  { id: "regulatory", label: "Regulatory Reporting", icon: Scale },
  { id: "training-mgmt", label: "Training Management", icon: BookOpen },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Profile Settings", icon: Settings },
];

const CountyGovernmentDashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("waste-flow");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { filteredNavItems, teamDisplayName, teamLogoUrl } = useFilteredNavItems(navItems);
  const translatedNavItems = useTranslatedNavItems(filteredNavItems);
  const { t } = useTranslation();
  const effectiveDisplayName = teamDisplayName || displayName;
  const effectiveLogoUrl = teamLogoUrl || orgLogoUrl;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "waste-flow": return <WasteFlowPanel />;
      case "analytics": return <CountyAnalyticsPanel />;
      case "reports": return <CountyReportsPanel />;
      case "regulatory": return <RegulatoryPanel />;
      case "training-mgmt": return <TrainingManagementPanel />;
      case "team": return <TeamPanel role="county_government" navItems={navItems} />;
      case "trash": return <TrashPanel />;
      case "settings": return <ProfileSettingsPanel role="county_government" />;
      default: return <WasteFlowPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
              <p className="text-sm font-medium truncate">{effectiveDisplayName || "County Official"}</p>
              <span className="text-xs text-sidebar-primary font-medium">County Government</span>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card border-b border-border h-14 flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-display font-semibold text-foreground">
            {translatedNavItems.find(n => n.id === activePanel)?.label}
          </h2>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
};

export default CountyGovernmentDashboard;
