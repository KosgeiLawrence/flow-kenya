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
import DashboardChatbot from "@/components/dashboard/shared/DashboardChatbot";

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
    <div className="min-h-screen bg-background bg-radial-glow flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 glass-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.08)]">
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

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {translatedNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActivePanel(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium sidebar-nav-item",
                activePanel === item.id
                  ? "bg-[rgba(255,255,255,0.10)] text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-sidebar-foreground/75 hover:bg-[rgba(255,255,255,0.06)] hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {activePanel === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] space-y-1">
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 glass-header h-16 flex items-center px-6 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-display font-semibold text-foreground">
            {translatedNavItems.find(n => n.id === activePanel)?.label}
          </h2>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderPanel()}
        </main>
      </div>
      <DashboardChatbot role="county_government" navItems={navItems} onNavigate={(id) => setActivePanel(id)} />
    </div>
  );
};

export default CountyGovernmentDashboard;
