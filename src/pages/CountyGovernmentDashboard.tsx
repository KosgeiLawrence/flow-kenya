import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, BarChart3, FileText, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WasteFlowPanel from "@/components/dashboard/county/WasteFlowPanel";
import CountyReportsPanel from "@/components/dashboard/county/CountyReportsPanel";
import RegulatoryPanel from "@/components/dashboard/county/RegulatoryPanel";
import CountyAnalyticsPanel from "@/components/dashboard/county/CountyAnalyticsPanel";

const tabs = [
  { id: "waste-flow", label: "Waste Flow Dashboard", icon: MapPin },
  { id: "analytics", label: "County Analytics", icon: BarChart3 },
  { id: "reports", label: "Monthly Reports", icon: FileText },
  { id: "regulatory", label: "Regulatory Reporting", icon: Scale },
];

const CountyGovernmentDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("waste-flow");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "waste-flow": return <WasteFlowPanel />;
      case "analytics": return <CountyAnalyticsPanel />;
      case "reports": return <CountyReportsPanel />;
      case "regulatory": return <RegulatoryPanel />;
      default: return <WasteFlowPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar-background text-sidebar-foreground flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-lg font-display font-bold">Duara Flow</h1>
          <span className="text-xs text-sidebar-primary font-medium">County Government</span>
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

export default CountyGovernmentDashboard;
