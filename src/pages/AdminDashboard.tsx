import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BarChart3, DollarSign, ShieldAlert, FileText, Settings, MapPin, Menu, X, ChevronRight, User, BookOpen, Mail, Eye, EyeOff, Trash2, ClipboardList, MessageSquare, TrendingUp, Receipt, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslatedNavItems } from "@/hooks/useTranslatedNavItems";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/dashboard/shared/LanguageToggle";
import UserVerificationPanel from "@/components/dashboard/admin/UserVerificationPanel";
import PlatformAnalyticsPanel from "@/components/dashboard/admin/PlatformAnalyticsPanel";
import TransactionTrackingPanel from "@/components/dashboard/admin/TransactionTrackingPanel";
import FraudDetectionPanel from "@/components/dashboard/admin/FraudDetectionPanel";
import AuditLogsPanel from "@/components/dashboard/admin/AuditLogsPanel";
import SystemSettingsPanel from "@/components/dashboard/admin/SystemSettingsPanel";
import CountyWasteFlowPanel from "@/components/dashboard/admin/CountyWasteFlowPanel";
import ProfileSettingsPanel from "@/components/dashboard/shared/ProfileSettingsPanel";
import TrainingManagementPanel from "@/components/dashboard/shared/TrainingManagementPanel";
import CleanupExercisePanel from "@/components/dashboard/shared/CleanupExercisePanel";
import InviteUsersPanel from "@/components/dashboard/admin/InviteUsersPanel";
import ViewUserDashboardPanel from "@/components/dashboard/admin/ViewUserDashboardPanel";
import UserVisibilityPanel from "@/components/dashboard/admin/UserVisibilityPanel";
import TrashPanel from "@/components/dashboard/shared/TrashPanel";
import TeamPanel from "@/components/dashboard/shared/TeamPanel";
import { Users as UsersIcon } from "lucide-react";
import FormBuilderPanel from "@/components/dashboard/admin/FormBuilderPanel";
import ContactMessagesPanel from "@/components/dashboard/admin/ContactMessagesPanel";
import RevenueInsightsPanel from "@/components/dashboard/admin/RevenueInsightsPanel";
import AdminBillingPanel from "@/components/dashboard/admin/AdminBillingPanel";
import EarningsExpensesPanel from "@/components/dashboard/shared/EarningsExpensesPanel";

const navItems = [
  { id: "revenue", label: "Revenue Insights", icon: TrendingUp },
  { id: "business-insights", label: "Business Insights", icon: Wallet },
  { id: "billing", label: "Billing & Invoices", icon: Receipt },
  { id: "users", label: "User Verification", icon: Users },
  { id: "view-dashboards", label: "View User Dashboards", icon: Eye },
  { id: "invite", label: "Invite Users", icon: Mail },
  { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
  { id: "transactions", label: "Transactions", icon: DollarSign },
  { id: "fraud", label: "Fraud Detection", icon: ShieldAlert },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "county-flow", label: "County Waste Flow", icon: MapPin },
  { id: "visibility", label: "User Visibility", icon: EyeOff },
  { id: "settings", label: "System Settings", icon: Settings },
  { id: "cleanup", label: "All Cleanups", icon: MapPin },
  { id: "training-mgmt", label: "Training Management", icon: BookOpen },
  { id: "forms", label: "Form Builder", icon: ClipboardList },
  { id: "messages", label: "Contact Messages", icon: MessageSquare },
  { id: "team", label: "My Team", icon: UsersIcon },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "profile-settings", label: "Profile Settings", icon: User },
];

const AdminDashboard = () => {
  const { profile, signOut, displayName, orgLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("revenue");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const translatedNavItems = useTranslatedNavItems(navItems);
  const { t } = useTranslation();
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "revenue": return <RevenueInsightsPanel />;
      case "business-insights": return <EarningsExpensesPanel role="admin" />;
      case "billing": return <AdminBillingPanel />;
      case "users": return <UserVerificationPanel />;
      case "view-dashboards": return <ViewUserDashboardPanel />;
      case "invite": return <InviteUsersPanel />;
      case "analytics": return <PlatformAnalyticsPanel />;
      case "transactions": return <TransactionTrackingPanel />;
      case "fraud": return <FraudDetectionPanel />;
      case "audit": return <AuditLogsPanel />;
      case "county-flow": return <CountyWasteFlowPanel />;
      case "visibility": return <UserVisibilityPanel />;
      case "settings": return <SystemSettingsPanel />;
      case "cleanup": return <CleanupExercisePanel isAdmin />;
      case "training-mgmt": return <TrainingManagementPanel />;
      case "forms": return <FormBuilderPanel />;
      case "messages": return <ContactMessagesPanel />;
      case "team": return <TeamPanel role="admin" navItems={navItems} />;
      case "trash": return <TrashPanel />;
      case "profile-settings": return <ProfileSettingsPanel role="admin" />;
      default: return <RevenueInsightsPanel />;
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
            {orgLogoUrl || profile?.avatar_url ? (
              <img src={orgLogoUrl || profile?.avatar_url || ""} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
                {displayName?.charAt(0) || "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName || "Administrator"}</p>
              <span className="text-xs text-sidebar-primary font-medium">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {translatedNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium sidebar-nav-item",
                activeTab === item.id
                  ? "bg-[rgba(255,255,255,0.10)] text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-sidebar-foreground/60 hover:bg-[rgba(255,255,255,0.06)] hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
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
            {navItems.find(n => n.id === activeTab)?.label}
          </h2>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
