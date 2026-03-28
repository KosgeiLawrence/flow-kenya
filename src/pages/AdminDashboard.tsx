import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BarChart3, DollarSign, ShieldAlert, FileText, Settings, MapPin, Menu, X, ChevronRight, User, BookOpen, Mail, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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

const navItems = [
  { id: "users", label: "User Verification", icon: Users },
  { id: "view-dashboards", label: "View User Dashboards", icon: Eye },
  { id: "invite", label: "Invite Users", icon: Mail },
  { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
  { id: "transactions", label: "Transactions", icon: DollarSign },
  { id: "fraud", label: "Fraud Detection", icon: ShieldAlert },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "county-flow", label: "County Waste Flow", icon: MapPin },
  { id: "settings", label: "System Settings", icon: Settings },
  { id: "cleanup", label: "All Cleanups", icon: MapPin },
  { id: "training-mgmt", label: "Training Management", icon: BookOpen },
  { id: "profile-settings", label: "Profile Settings", icon: User },
];

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "users": return <UserVerificationPanel />;
      case "view-dashboards": return <ViewUserDashboardPanel />;
      case "invite": return <InviteUsersPanel />;
      case "analytics": return <PlatformAnalyticsPanel />;
      case "transactions": return <TransactionTrackingPanel />;
      case "fraud": return <FraudDetectionPanel />;
      case "audit": return <AuditLogsPanel />;
      case "county-flow": return <CountyWasteFlowPanel />;
      case "settings": return <SystemSettingsPanel />;
      case "cleanup": return <CleanupExercisePanel isAdmin />;
      case "training-mgmt": return <TrainingManagementPanel />;
      case "profile-settings": return <ProfileSettingsPanel role="admin" />;
      default: return <UserVerificationPanel />;
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
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
              {profile?.full_name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || "Administrator"}</p>
              <span className="text-xs text-sidebar-primary font-medium">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
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
            {navItems.find(n => n.id === activeTab)?.label}
          </h2>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
