import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, Package, ClipboardList, FileText, ClipboardCheck, TrendingUp,
  BarChart3, Leaf, Shield, Clock, CheckCircle2, AlertTriangle,
  Menu, X, ChevronRight, ShoppingBag, Briefcase, Settings, Truck, BookOpen, Recycle, HelpCircle, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFilteredNavItems } from "@/hooks/useFilteredNavItems";
import { useTranslatedNavItems } from "@/hooks/useTranslatedNavItems";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryAccessPanel from "@/components/dashboard/recycler/InventoryAccessPanel";
import OrdersPanel from "@/components/dashboard/recycler/OrdersPanel";
import PurchaseInvoicesPanel from "@/components/dashboard/recycler/PurchaseInvoicesPanel";
import ReceiptConfirmPanel from "@/components/dashboard/recycler/ReceiptConfirmPanel";
import MarketInsightsPanel from "@/components/dashboard/recycler/MarketInsightsPanel";
import SupplyForecastPanel from "@/components/dashboard/recycler/SupplyForecastPanel";
import ESGPanel from "@/components/dashboard/recycler/ESGPanel";
import ComplianceDocsPanel from "@/components/dashboard/recycler/ComplianceDocsPanel";
import ProductCatalogPanel from "@/components/dashboard/recycler/ProductCatalogPanel";
import GrantsDiscoveryPanel from "@/components/dashboard/shared/GrantsDiscoveryPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import RequestedPickupsPanel from "@/components/dashboard/shared/RequestedPickupsPanel";
import TrainingPanel from "@/components/dashboard/waste-picker/TrainingPanel";
import CleanupExercisePanel from "@/components/dashboard/shared/CleanupExercisePanel";
import EarningsExpensesPanel from "@/components/dashboard/shared/EarningsExpensesPanel";
import CRMPanel from "@/components/dashboard/shared/CRMPanel";
import MaterialTransformationPanel from "@/components/dashboard/recycler/MaterialTransformationPanel";
import WorkflowGuidePanel from "@/components/dashboard/recycler/WorkflowGuidePanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import DigitalIDPanel from "@/components/dashboard/waste-picker/DigitalIDPanel";
import { Users as UsersIcon, CreditCard } from "lucide-react";
import LanguageToggle from "@/components/dashboard/shared/LanguageToggle";

const navItems = [
  { id: "workflows", label: "How It Works", icon: HelpCircle },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "transformation", label: "Transformation", icon: Recycle },
  { id: "products", label: "Products & Pricing", icon: ShoppingBag },
  { id: "business-insights", label: "Business Insights", icon: TrendingUp },
  
  { id: "market", label: "Market Insights", icon: TrendingUp },
  { id: "forecast", label: "Supply Forecast", icon: BarChart3 },
  { id: "esg", label: "ESG & Carbon", icon: Leaf },
  { id: "compliance", label: "Compliance", icon: Shield },
  
  { id: "training", label: "Training", icon: BookOpen },
  { id: "cleanup", label: "Cleanup Exercise", icon: Package },
  { id: "grants", label: "Grants & Programs", icon: Briefcase },
  { id: "digital-id", label: "Digital ID", icon: CreditCard },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Profile Settings", icon: Settings },
];

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-gold" },
  approved: { icon: CheckCircle2, label: "Verified", color: "text-primary" },
  rejected: { icon: AlertTriangle, label: "Rejected", color: "text-destructive" },
};

const RecyclerDashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("inventory");
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
      case "workflows": return <WorkflowGuidePanel />;
      case "inventory": return <InventoryAccessPanel />;
      case "transformation": return <MaterialTransformationPanel />;
      case "business-insights": return <EarningsExpensesPanel role="recycler" />;
      case "products": return (
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="catalog"><ShoppingBag className="w-4 h-4 mr-1.5" />Products & Pricing</TabsTrigger>
            <TabsTrigger value="customers"><ClipboardList className="w-4 h-4 mr-1.5" />Customers</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog"><ProductCatalogPanel /></TabsContent>
          <TabsContent value="customers"><CRMPanel role="recycler" /></TabsContent>
        </Tabs>
      );
      case "market": return <MarketInsightsPanel />;
      case "forecast": return <SupplyForecastPanel />;
      case "esg": return <ESGPanel />;
      case "compliance": return <ComplianceDocsPanel />;
      
      case "training": return <TrainingPanel viewerRole="recycler" />;
      case "cleanup": return <CleanupExercisePanel />;
      
      case "grants": return <GrantsDiscoveryPanel userRole="recycler" />;
      case "digital-id": return <DigitalIDPanel />;
      case "team": return <TeamPanel role="recycler" navItems={navItems} />;
      case "trash": return <TrashPanel />;
      case "settings": return <ProfileSettingsPanel role="recycler" />;
      default: return <InventoryAccessPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background bg-radial-glow flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
                {effectiveDisplayName?.charAt(0) || "R"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{effectiveDisplayName || "Recycler"}</p>
              <div className="flex items-center gap-1">
                <StatusIcon className={cn("w-3 h-3", status.color)} />
                <span className={cn("text-xs", status.color)}>{status.label}</span>
              </div>
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
    </div>
  );
};

export default RecyclerDashboard;
