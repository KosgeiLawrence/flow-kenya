import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, Users, Package, Store, Truck, DollarSign, Printer,
  FileText, BarChart3, Shield, Clock, CheckCircle2, AlertTriangle,
  Menu, X, ChevronRight, Briefcase, Settings, BookOpen, Leaf, TrendingUp, Send, Calendar, ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFilteredNavItems } from "@/hooks/useFilteredNavItems";
import { useTranslatedNavItems } from "@/hooks/useTranslatedNavItems";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/dashboard/shared/LanguageToggle";
import WastePickerMgmtPanel from "@/components/dashboard/aggregator/WastePickerMgmtPanel";
import InventoryPanel from "@/components/dashboard/aggregator/InventoryPanel";
import MarketplacePanelShared from "@/components/dashboard/shared/MarketplacePanel";
import LogisticsPanel from "@/components/dashboard/aggregator/LogisticsPanel";
import PaymentsPanel from "@/components/dashboard/aggregator/PaymentsPanel";
import BulkReceiptsPanel from "@/components/dashboard/aggregator/BulkReceiptsPanel";
import InvoicesPanel from "@/components/dashboard/aggregator/InvoicesPanel";
import ProfitAnalyticsPanel from "@/components/dashboard/aggregator/ProfitAnalyticsPanel";
import CompliancePanel from "@/components/dashboard/aggregator/CompliancePanel";
import AggregatorESGPanel from "@/components/dashboard/aggregator/ESGPanel";
import GrantsDiscoveryPanel from "@/components/dashboard/shared/GrantsDiscoveryPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import RequestedPickupsPanel from "@/components/dashboard/shared/RequestedPickupsPanel";
import TrainingPanel from "@/components/dashboard/waste-picker/TrainingPanel";
import CleanupExercisePanel from "@/components/dashboard/shared/CleanupExercisePanel";
import EarningsExpensesPanel from "@/components/dashboard/shared/EarningsExpensesPanel";
import CRMPanel from "@/components/dashboard/shared/CRMPanel";
import AggregatorWorkflowGuidePanel from "@/components/dashboard/aggregator/WorkflowGuidePanel";
import RecyclerPickupRequestPanel from "@/components/dashboard/aggregator/RecyclerPickupRequestPanel";
import AggregatorSuppliersPanel from "@/components/dashboard/aggregator/AggregatorSuppliersPanel";
import AggregatorSalesPanel from "@/components/dashboard/aggregator/AggregatorSalesPanel";
import WasteDeliveredPanel from "@/components/dashboard/aggregator/WasteDeliveredPanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import { HelpCircle, ClipboardList, Trash2, Users as UsersIcon } from "lucide-react";
import DashboardChatbot from "@/components/dashboard/shared/DashboardChatbot";

const navItems = [
  { id: "workflows", label: "How It Works", icon: HelpCircle },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "crm", label: "Customers", icon: Users },
  { id: "earnings-expenses", label: "Earnings & Expenses", icon: TrendingUp },
  { id: "marketplace", label: "Marketplace", icon: Store },
  
  { id: "esg", label: "ESG & Carbon", icon: Leaf },
  { id: "pickers", label: "Waste Pickers", icon: Users },
  { id: "compliance", label: "Compliance", icon: Shield },
  
  { id: "training", label: "Training", icon: BookOpen },
  { id: "cleanup", label: "Cleanup Exercise", icon: Package },
  { id: "grants", label: "Grants & Programs", icon: Briefcase },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Profile Settings", icon: Settings },
];

const statusKeys: Record<string, { icon: React.ElementType; labelKey: string; color: string }> = {
  pending: { icon: Clock, labelKey: "common.pending", color: "text-gold" },
  approved: { icon: CheckCircle2, labelKey: "common.verified", color: "text-primary" },
  rejected: { icon: AlertTriangle, labelKey: "common.rejected", color: "text-destructive" },
};

const AggregatorDashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("pickers");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { filteredNavItems, teamDisplayName, teamLogoUrl } = useFilteredNavItems(navItems);
  const translatedNavItems = useTranslatedNavItems(filteredNavItems);
  const { t } = useTranslation();
  const effectiveDisplayName = teamDisplayName || displayName;
  const effectiveLogoUrl = teamLogoUrl || orgLogoUrl;

  const statusEntry = statusKeys[profile?.approval_status || "pending"];
  const StatusIcon = statusEntry.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "workflows": return <AggregatorWorkflowGuidePanel />;
      case "pickers": return <WastePickerMgmtPanel />;
      case "earnings-expenses": return <EarningsExpensesPanel role="aggregator" />;
      case "inventory": return (
        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stock"><Package className="w-4 h-4 mr-1.5" />{t("inventoryPanel.stock")}</TabsTrigger>
            <TabsTrigger value="delivered"><ClipboardList className="w-4 h-4 mr-1.5" />{t("inventoryPanel.orders")}</TabsTrigger>
            <TabsTrigger value="pickups"><Truck className="w-4 h-4 mr-1.5" />{t("requestedPickups.title")}</TabsTrigger>
            <TabsTrigger value="suppliers"><Users className="w-4 h-4 mr-1.5" />{t("inventoryPanel.suppliers")}</TabsTrigger>
          </TabsList>
          <TabsContent value="stock"><InventoryPanel /></TabsContent>
          <TabsContent value="delivered"><WasteDeliveredPanel /></TabsContent>
          <TabsContent value="pickups"><RequestedPickupsPanel /></TabsContent>
          <TabsContent value="suppliers"><AggregatorSuppliersPanel /></TabsContent>
        </Tabs>
      );
      case "sales": return (
        <Tabs key="sales-tabs" defaultValue="sell" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sell"><ShoppingCart className="w-4 h-4 mr-1.5" />{t("salesPanel.title")}</TabsTrigger>
            <TabsTrigger value="recycler-requests"><Send className="w-4 h-4 mr-1.5" />{t("dashboard.recyclerPickup")}</TabsTrigger>
          </TabsList>
          <TabsContent value="sell"><AggregatorSalesPanel /></TabsContent>
          <TabsContent value="recycler-requests"><RecyclerPickupRequestPanel /></TabsContent>
        </Tabs>
      );
      case "marketplace": return <MarketplacePanelShared role="aggregator" />;
      case "logistics": return <LogisticsPanel />;
      case "payments": return <PaymentsPanel />;
      case "receipts": return <BulkReceiptsPanel />;
      case "invoices": return <InvoicesPanel />;
      case "analytics": return <ProfitAnalyticsPanel />;
      case "esg": return <AggregatorESGPanel />;
      case "compliance": return <CompliancePanel />;
      
      case "training": return <TrainingPanel viewerRole="aggregator" />;
      case "cleanup": return <CleanupExercisePanel />;
      case "crm": return <CRMPanel role="aggregator" />;
      case "grants": return <GrantsDiscoveryPanel userRole="aggregator" />;
      case "team": return <TeamPanel role="aggregator" navItems={navItems} />;
      case "trash": return <TrashPanel />;
      case "settings": return <ProfileSettingsPanel role="aggregator" />;
      default: return <WastePickerMgmtPanel />;
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
                {effectiveDisplayName?.charAt(0) || "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{effectiveDisplayName || t("roles.aggregator")}</p>
              <div className="flex items-center gap-1">
                <StatusIcon className={cn("w-3 h-3", statusEntry.color)} />
                <span className={cn("text-xs", statusEntry.color)}>{t(statusEntry.labelKey)}</span>
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
            <LogOut className="w-4 h-4" /> {t("dashboard.signOut")}
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
      <DashboardChatbot role="aggregator" navItems={navItems} onNavigate={(id) => setActivePanel(id)} />
    </div>
  );
};

export default AggregatorDashboard;
