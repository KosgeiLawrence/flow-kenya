import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, DollarSign, TrendingUp, FileText, BarChart3,
  Leaf, Shield, Truck, QrCode, BookOpen, Briefcase, Calendar,
  ArrowDown, ArrowRight, ChevronDown, ChevronUp, CheckCircle2, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    color: "text-accent",
    tip: "Check live prices before selling to ensure you get the best deal for your materials.",
    steps: [
      { label: "View Prices", description: "See current market prices for all material types", icon: DollarSign, color: "bg-accent/10 text-accent" },
      { label: "Compare Rates", description: "Compare prices across different material categories", icon: BarChart3, color: "bg-accent/10 text-accent" },
      { label: "Update Prices", description: "Suggest price updates based on your local market", icon: TrendingUp, color: "bg-accent/10 text-accent" },
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
    color: "text-accent",
    tip: "Keep client details updated to auto-fill when logging collections.",
    steps: [
      { label: "View Clients", description: "See all your registered clients and their details", icon: Users, color: "bg-accent/10 text-accent" },
      { label: "Add Client", description: "Register new clients from collections or manually", icon: CheckCircle2, color: "bg-accent/10 text-accent" },
      { label: "Track Transactions", description: "View collection history and revenue per client", icon: BarChart3, color: "bg-accent/10 text-accent" },
    ],
  },
  {
    id: "qr-id",
    title: "QR ID",
    subtitle: "Your unique digital identity",
    icon: QrCode,
    color: "text-primary",
    steps: [
      { label: "View QR Code", description: "Your unique QR code identifies you on the platform", icon: QrCode, color: "bg-primary/10 text-primary" },
      { label: "Share ID", description: "Share your QR with aggregators and clients for quick identification", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Verify Identity", description: "Aggregators scan your QR to verify collections", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "training",
    title: "Training & Community",
    subtitle: "Learn and log community impact",
    icon: BookOpen,
    color: "text-accent",
    tip: "Complete training modules to improve your skills and log community trainings for ESG reporting.",
    steps: [
      { label: "Browse Training", description: "View available training resources and materials", icon: BookOpen, color: "bg-accent/10 text-accent" },
      { label: "Log Community Training", description: "Record trainings you've conducted with community impact data", icon: Users, color: "bg-accent/10 text-accent" },
      { label: "Track Impact", description: "See participants trained, waste collected, and trees planted", icon: Leaf, color: "bg-accent/10 text-accent" },
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
    color: "text-accent",
    steps: [
      { label: "Browse Grants", description: "Discover available grants and funding programs", icon: Briefcase, color: "bg-accent/10 text-accent" },
      { label: "Apply", description: "Submit applications for relevant programs", icon: FileText, color: "bg-accent/10 text-accent" },
      { label: "Track Applications", description: "Monitor the status of your grant applications", icon: CheckCircle2, color: "bg-accent/10 text-accent" },
    ],
  },
];

const FlowArrow = ({ vertical = true }: { vertical?: boolean }) => (
  <div className={cn("flex items-center justify-center", vertical ? "py-1" : "px-2")}>
    {vertical ? (
      <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
    ) : (
      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
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
    { label: "Sort & Weigh", icon: BarChart3, color: "bg-accent/10 text-accent" },
    { label: "Request Pickup", icon: Truck, color: "bg-accent/10 text-accent" },
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
