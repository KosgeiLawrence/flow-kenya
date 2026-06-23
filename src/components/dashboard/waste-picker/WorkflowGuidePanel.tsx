import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, DollarSign, TrendingUp, FileText, BarChart3,
  Leaf, Shield, Truck, QrCode, BookOpen, Briefcase, Calendar,
  ArrowDown, ArrowRight, ChevronDown, ChevronUp, CheckCircle2, ClipboardList,
  Store, LayoutGrid, Share2, Bot, Trash2, IdCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface WorkflowStep {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

interface Workflow {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  steps: WorkflowStep[];
  tip?: string;
}

const workflows: Workflow[] = [
  {
    id: "collection",
    title: "Collections",
    subtitle: "Log materials you collect daily",
    icon: Package,
    color: "text-primary",
    tip: "Log every collection immediately so your records stay accurate and your earnings are tracked.",
    steps: [
      { label: "Log Collection", description: "Record material type, quantity, and location for each collection", icon: Package, color: "bg-primary/10 text-primary" },
      { label: "Collect from Client", description: "Select an existing client or add a new one and log the collection", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Generate Documents", description: "Create quotations, invoices, and receipts for client collections", icon: FileText, color: "bg-primary/10 text-primary" },
      { label: "Track History", description: "View all past collections with batch IDs and timestamps", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "earnings",
    title: "My Earnings",
    subtitle: "Track your income and expenses",
    icon: DollarSign,
    color: "text-primary",
    tip: "Record expenses daily so you always know your real profit margin.",
    steps: [
      { label: "View Income", description: "Track money received from selling materials to aggregators and recyclers", icon: TrendingUp, color: "bg-primary/10 text-primary" },
      { label: "Add Expenses", description: "Record costs like transport, equipment, and protective gear", icon: FileText, color: "bg-primary/10 text-primary" },
      { label: "Set Budgets", description: "Set monthly spending limits for different categories", icon: BarChart3, color: "bg-primary/10 text-primary" },
      { label: "Download Reports", description: "Get Profit & Loss, Cash Flow, and Balance Sheet reports", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "pricing",
    title: "Live Pricing",
    subtitle: "Check current market prices for materials",
    icon: DollarSign,
    color: "text-secondary",
    tip: "Check live prices before selling to ensure you get the best deal for your materials.",
    steps: [
      { label: "View Prices", description: "See current market prices for all material types", icon: DollarSign, color: "bg-secondary/10 text-secondary" },
      { label: "Compare Rates", description: "Compare prices across different material categories", icon: BarChart3, color: "bg-secondary/10 text-secondary" },
      { label: "Update Prices", description: "Suggest price updates based on your local market", icon: TrendingUp, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "pickups",
    title: "Pickups & Selling",
    subtitle: "Request pickups from aggregators and recyclers",
    icon: Truck,
    color: "text-primary",
    tip: "Send pickup requests when you have enough materials to make the trip worthwhile.",
    steps: [
      { label: "Select Buyer", description: "Choose an aggregator or recycler to sell your materials to", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Request Pickup", description: "Specify material type, quantity, and proposed price per kg", icon: Truck, color: "bg-primary/10 text-primary" },
      { label: "Schedule Delivery", description: "Set a date and location for the pickup or delivery", icon: Calendar, color: "bg-primary/10 text-primary" },
      { label: "Track Status", description: "Monitor your request until it's accepted, completed, or rescheduled", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "clients",
    title: "My Clients",
    subtitle: "Manage your client relationships",
    icon: Users,
    color: "text-secondary",
    tip: "Keep client details updated to auto-fill when logging collections.",
    steps: [
      { label: "View Clients", description: "See all your registered clients and their details", icon: Users, color: "bg-secondary/10 text-secondary" },
      { label: "Add Client", description: "Register new clients from collections or manually", icon: CheckCircle2, color: "bg-secondary/10 text-secondary" },
      { label: "Track Transactions", description: "View collection history and revenue per client", icon: BarChart3, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "digital-id",
    title: "Digital ID",
    subtitle: "Your verified identity on the platform",
    icon: IdCard,
    color: "text-primary",
    tip: "Show your Digital ID at collection points so aggregators can verify and pay you faster.",
    steps: [
      { label: "View Digital ID", description: "Open the Digital ID panel to see your branded ID card and QR", icon: IdCard, color: "bg-primary/10 text-primary" },
      { label: "Share with Aggregators", description: "Let buyers scan your QR to confirm your identity and history", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Stay Verified", description: "Keep your profile, photo and contact details up to date", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace & My Catalogue",
    subtitle: "List materials and share your storefront",
    icon: Store,
    color: "text-secondary",
    tip: "Open Marketplace → My Catalogue to publish a branded page you can share via WhatsApp, link or QR code.",
    steps: [
      { label: "List Materials", description: "Post the materials you have for sale with photos and prices", icon: Store, color: "bg-secondary/10 text-secondary" },
      { label: "Build Your Catalogue", description: "Add logo, about you, and contact details under My Catalogue", icon: LayoutGrid, color: "bg-secondary/10 text-secondary" },
      { label: "Publish & Share", description: "Share your public storefront link or QR with buyers and clients", icon: Share2, color: "bg-secondary/10 text-secondary" },
      { label: "Get Inquiries", description: "Buyers reach you directly via WhatsApp, phone or email", icon: Users, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "training",
    title: "Training & Community",
    subtitle: "Learn and log community impact",
    icon: BookOpen,
    color: "text-secondary",
    tip: "Complete training modules to improve your skills and log community trainings for ESG reporting.",
    steps: [
      { label: "Browse Training", description: "View available training resources and materials", icon: BookOpen, color: "bg-secondary/10 text-secondary" },
      { label: "Log Community Training", description: "Record trainings you've conducted with community impact data", icon: Users, color: "bg-secondary/10 text-secondary" },
      { label: "Track Impact", description: "See participants trained, waste collected, and trees planted", icon: Leaf, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "esg",
    title: "Cleanup & ESG",
    subtitle: "Participate in cleanups and track environmental impact",
    icon: Leaf,
    color: "text-primary",
    steps: [
      { label: "Join Cleanups", description: "Register for organized cleanup exercises in your area", icon: Package, color: "bg-primary/10 text-primary" },
      { label: "Log Impact", description: "Record waste collected, volunteers engaged, and areas cleaned", icon: ClipboardList, color: "bg-primary/10 text-primary" },
      { label: "View ESG Data", description: "See your environmental and social impact metrics", icon: BarChart3, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "grants",
    title: "Grants & Programs",
    subtitle: "Discover funding opportunities",
    icon: Briefcase,
    color: "text-secondary",
    steps: [
      { label: "Browse Grants", description: "Discover available grants and funding programs", icon: Briefcase, color: "bg-secondary/10 text-secondary" },
      { label: "Apply", description: "Submit applications for relevant programs", icon: FileText, color: "bg-secondary/10 text-secondary" },
      { label: "Track Applications", description: "Monitor the status of your grant applications", icon: CheckCircle2, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "ai-assistant",
    title: "Twende AI Assistant",
    subtitle: "Your in-pocket business helper",
    icon: Bot,
    color: "text-primary",
    tip: "Tap the chat bubble to ask the assistant to log a collection, check prices or guide you through any feature.",
    steps: [
      { label: "Open Chat", description: "Tap the floating chat button on any dashboard page", icon: Bot, color: "bg-primary/10 text-primary" },
      { label: "Ask Anything", description: "Get answers about earnings, pickups, prices and trainings", icon: BookOpen, color: "bg-primary/10 text-primary" },
      { label: "Quick Navigation", description: "Ask it to take you straight to a specific panel or action", icon: ArrowRight, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "trash",
    title: "Trash & Recovery",
    subtitle: "Safely delete and restore records",
    icon: Trash2,
    color: "text-secondary",
    steps: [
      { label: "Delete Anywhere", description: "Deletions across all panels move items to Trash instead of erasing them", icon: Trash2, color: "bg-secondary/10 text-secondary" },
      { label: "Review in Trash", description: "Open the Trash panel to see what was removed and when", icon: ClipboardList, color: "bg-secondary/10 text-secondary" },
      { label: "Restore or Purge", description: "Restore items back, or permanently delete them when sure", icon: CheckCircle2, color: "bg-secondary/10 text-secondary" },
    ],
  },
];

const FlowArrow = ({ vertical = true }: { vertical?: boolean }) => (
  <div className={cn("flex items-center justify-center", vertical ? "py-1" : "px-2")}>
    {vertical ? (
      <ArrowDown className="w-4 h-4 text-muted-foreground" />
    ) : (
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    )}
  </div>
);

const WorkflowCard = ({ workflow }: { workflow: Workflow }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = workflow.icon;

  return (
    <Card className="shadow-soft overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-muted")}>
                <Icon className={cn("w-5 h-5", workflow.color)} />
              </div>
              <div>
                <CardTitle className="text-base">{workflow.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{workflow.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{workflow.steps.length} steps</Badge>
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          <div className="mt-3 space-y-0">
            {workflow.steps.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={i}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold", step.color)}>
                        {i + 1}
                      </div>
                      {i < workflow.steps.length - 1 && (
                        <div className="w-0.5 h-6 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pt-1 pb-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <StepIcon className={cn("w-4 h-4 shrink-0", step.color.split(" ")[1])} />
                        <p className="text-sm font-semibold text-foreground">{step.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {workflow.tip && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">💡 Tip:</span> {workflow.tip}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const OverviewDiagram = () => {
  const mainFlow = [
    { label: "Collect Materials", icon: Package, color: "bg-primary/10 text-primary" },
    { label: "Log Collection", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    { label: "Sort & Weigh", icon: BarChart3, color: "bg-secondary/10 text-secondary" },
    { label: "Request Pickup", icon: Truck, color: "bg-secondary/10 text-secondary" },
    { label: "Sell to Buyers", icon: DollarSign, color: "bg-primary/10 text-primary" },
    { label: "Track Earnings", icon: TrendingUp, color: "bg-primary/10 text-primary" },
  ];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Your Work at a Glance
        </CardTitle>
        <p className="text-sm text-muted-foreground">This is how your waste collection business flows from start to finish</p>
      </CardHeader>
      <CardContent>
        {/* Mobile: vertical flow */}
        <div className="flex flex-col items-center gap-0 sm:hidden">
          {mainFlow.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex flex-col items-center">
                <div className={cn("w-full max-w-[240px] flex items-center gap-3 px-4 py-3 rounded-xl border border-border", step.color.split(" ")[0])}>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", step.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">Step {i + 1}</p>
                  </div>
                </div>
                {i < mainFlow.length - 1 && <FlowArrow vertical />}
              </div>
            );
          })}
        </div>

        {/* Desktop: two-row grid flow */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-3 gap-3">
            {mainFlow.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative">
                  <div className={cn("flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-border text-center", step.color.split(" ")[0])}>
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", step.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-1">Step {i + 1}</Badge>
                      <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground italic">Follow steps 1 → 6 for a complete business cycle</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WastePickerWorkflowGuidePanel = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">📘 How It Works</h2>
        <p className="text-sm text-muted-foreground mt-1">Simple guides to help you use every part of your dashboard. Tap any section to see the step-by-step flow.</p>
      </div>

      <OverviewDiagram />

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Detailed Workflows</h3>
        <div className="space-y-3">
          {workflows.map(w => (
            <WorkflowCard key={w.id} workflow={w} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WastePickerWorkflowGuidePanel;
