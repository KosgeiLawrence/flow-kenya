import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BarChart3, DollarSign, ShieldAlert, FileText, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UserVerificationPanel from "@/components/dashboard/admin/UserVerificationPanel";
import PlatformAnalyticsPanel from "@/components/dashboard/admin/PlatformAnalyticsPanel";
import TransactionTrackingPanel from "@/components/dashboard/admin/TransactionTrackingPanel";
import FraudDetectionPanel from "@/components/dashboard/admin/FraudDetectionPanel";
import AuditLogsPanel from "@/components/dashboard/admin/AuditLogsPanel";
import SystemSettingsPanel from "@/components/dashboard/admin/SystemSettingsPanel";

const tabs = [
  { id: "users", label: "User Verification", icon: Users },
  { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
  { id: "transactions", label: "Transactions", icon: DollarSign },
  { id: "fraud", label: "Fraud Detection", icon: ShieldAlert },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "settings", label: "System Settings", icon: Settings },
];

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "users": return <UserVerificationPanel />;
      case "analytics": return <PlatformAnalyticsPanel />;
      case "transactions": return <TransactionTrackingPanel />;
      case "fraud": return <FraudDetectionPanel />;
      case "audit": return <AuditLogsPanel />;
      case "settings": return <SystemSettingsPanel />;
      default: return <UserVerificationPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar-background text-sidebar-foreground flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-lg font-display font-bold">Duara Flow</h1>
          <span className="text-xs text-sidebar-primary font-medium">Admin Panel</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 mb-2 truncate">{profile?.full_name}</p>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{renderPanel()}</main>
    </div>
  );
};

export default AdminDashboard;
