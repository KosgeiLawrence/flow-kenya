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
import WastePickerMgmtPanel from "@/components/dashboard/aggregator/WastePickerMgmtPanel";
import InventoryPanel from "@/components/dashboard/aggregator/InventoryPanel";
import MarketplacePanel from "@/components/dashboard/aggregator/MarketplacePanel";
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

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-gold" },
  approved: { icon: CheckCircle2, label: "Verified", color: "text-primary" },
  rejected: { icon: AlertTriangle, label: "Rejected", color: "text-destructive" },
};

const AggregatorDashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("pickers");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { filteredNavItems } = useFilteredNavItems(navItems);

  const status = statusConfig[profile?.approval_status || "pending"];
  const StatusIcon = status.icon;

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
            <TabsTrigger value="stock"><Package className="w-4 h-4 mr-1.5" />Stock</TabsTrigger>
            <TabsTrigger value="delivered"><ClipboardList className="w-4 h-4 mr-1.5" />Orders</TabsTrigger>
            <TabsTrigger value="pickups"><Truck className="w-4 h-4 mr-1.5" />Pickup Requests</TabsTrigger>
            <TabsTrigger value="suppliers"><Users className="w-4 h-4 mr-1.5" />Suppliers</TabsTrigger>
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
            <TabsTrigger value="sell"><ShoppingCart className="w-4 h-4 mr-1.5" />Sell Materials</TabsTrigger>
            <TabsTrigger value="recycler-requests"><Send className="w-4 h-4 mr-1.5" />Request from Recyclers</TabsTrigger>
          </TabsList>
          <TabsContent value="sell"><AggregatorSalesPanel /></TabsContent>
          <TabsContent value="recycler-requests"><RecyclerPickupRequestPanel /></TabsContent>
        </Tabs>
      );
      case "marketplace": return <MarketplacePanel />;
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
            {orgLogoUrl || profile?.avatar_url ? (
              <img src={orgLogoUrl || profile?.avatar_url || ""} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
                {displayName?.charAt(0) || "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName || "Aggregator"}</p>
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

export default AggregatorDashboard;
