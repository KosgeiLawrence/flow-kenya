import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, User, Package, DollarSign, Calendar, BarChart3,
  QrCode, BookOpen, Clock, CheckCircle2, AlertTriangle, Menu, X,
  ChevronRight, Briefcase, Settings, ShoppingCart, Store, Leaf, Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import CollectionPanel from "@/components/dashboard/waste-picker/CollectionPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import PricingPanel from "@/components/dashboard/waste-picker/PricingPanel";
import SchedulePanel from "@/components/dashboard/waste-picker/SchedulePanel";
import AnalyticsPanel from "@/components/dashboard/waste-picker/AnalyticsPanel";
import DigitalIDPanel from "@/components/dashboard/waste-picker/DigitalIDPanel";
import TrainingPanel from "@/components/dashboard/waste-picker/TrainingPanel";
import GrantsDiscoveryPanel from "@/components/dashboard/shared/GrantsDiscoveryPanel";
import CleanupExercisePanel from "@/components/dashboard/shared/CleanupExercisePanel";
import EarningsExpensesPanel from "@/components/dashboard/shared/EarningsExpensesPanel";
import CRMPanel from "@/components/dashboard/shared/CRMPanel";
import WastePickerWorkflowGuidePanel from "@/components/dashboard/waste-picker/WorkflowGuidePanel";
import WastePickerSalesPanel from "@/components/dashboard/waste-picker/WastePickerSalesPanel";
import RequestedPickupsPanel from "@/components/dashboard/shared/RequestedPickupsPanel";
import MarketplacePanel from "@/components/dashboard/aggregator/MarketplacePanel";
import ESGPanel from "@/components/dashboard/aggregator/ESGPanel";
import CompliancePanel from "@/components/dashboard/aggregator/CompliancePanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import { Trash2, Users as UsersIcon } from "lucide-react";

const navItems = [
  { id: "how-it-works", label: "How It Works", icon: BookOpen },
  { id: "collection", label: "Collections", icon: Package },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "schedule", label: "Request Pickup", icon: Calendar },
  { id: "my-earnings", label: "My Earnings", icon: DollarSign },
  { id: "crm", label: "My Clients", icon: User },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "training", label: "Training", icon: BookOpen },
  { id: "esg", label: "ESG & Carbon", icon: Leaf },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "cleanup", label: "Cleanup Exercise", icon: Package },
  { id: "pricing", label: "Live Pricing", icon: DollarSign },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "qr-id", label: "QR ID", icon: QrCode },
  { id: "grants", label: "Grants & Programs", icon: Briefcase },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Profile Settings", icon: Settings },
];

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-gold" },
  approved: { icon: CheckCircle2, label: "Verified", color: "text-primary" },
  rejected: { icon: AlertTriangle, label: "Rejected", color: "text-destructive" },
};

const WastePickerDashboard = () => {
  const { user, profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("how-it-works");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const status = statusConfig[profile?.approval_status || "pending"];
  const StatusIcon = status.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "how-it-works": return <WastePickerWorkflowGuidePanel />;
      case "collection": return <CollectionPanel />;
      case "sales": return <WastePickerSalesPanel />;
      case "schedule": return <SchedulePanel />;
      case "my-earnings": return <EarningsExpensesPanel role="waste_picker" />;
      case "crm": return <CRMPanel role="waste_picker" />;
      case "marketplace": return <MarketplacePanel />;
      case "training": return <TrainingPanel viewerRole="waste_picker" />;
      case "esg": return <ESGPanel />;
      case "compliance": return <CompliancePanel />;
      case "cleanup": return <CleanupExercisePanel />;
      case "pricing": return <PricingPanel />;
      case "analytics": return <AnalyticsPanel />;
      case "qr-id": return <QRIDPanel />;
      case "grants": return <GrantsDiscoveryPanel userRole="waste_picker" />;
      case "team": return <TeamPanel role="waste_picker" navItems={navItems} />;
      case "trash": return <TrashPanel />;
      case "settings": return <ProfileSettingsPanel role="waste_picker" />;
      default: return <CollectionPanel />;
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
            {orgLogoUrl || profile?.avatar_url ? (
              <img src={orgLogoUrl || profile?.avatar_url || ""} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
                {displayName?.charAt(0) || "W"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName || "Waste Picker"}</p>
              <div className="flex items-center gap-1">
                <StatusIcon className={cn("w-3 h-3", status.color)} />
                <span className={cn("text-xs", status.color)}>{status.label}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
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

      {/* Main content */}
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

export default WastePickerDashboard;
