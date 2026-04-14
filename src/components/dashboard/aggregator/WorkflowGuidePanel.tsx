import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, Store, TrendingUp, FileText, BarChart3,
  Leaf, Shield, Truck, BookOpen, Briefcase, DollarSign,
  Printer, ClipboardList, ArrowDown, ArrowRight, ChevronDown, ChevronUp,
  CheckCircle2
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
    id: "pickers",
    title: "Waste Picker Management",
    subtitle: "Manage your network of waste pickers",
    icon: Users,
    color: "text-primary",
    tip: "Keep your waste picker records up to date to streamline payments and collections.",
    steps: [
      { label: "View Registered Pickers", description: "See all waste pickers connected to your account", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Track Collections", description: "Monitor what each picker has collected and delivered", icon: Package, color: "bg-primary/10 text-primary" },
      { label: "Make Payments", description: "Record payments to waste pickers for their deliveries", icon: DollarSign, color: "bg-primary/10 text-primary" },
      { label: "Generate Receipts", description: "Create payment receipts for each transaction", icon: Printer, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory Management",
    subtitle: "Track all collected materials",
    icon: Package,
    color: "text-primary",
    tip: "Record every collection entry immediately to keep your stock accurate and up to date.",
    steps: [
      { label: "Receive Materials", description: "Waste pickers deliver sorted materials to your collection point", icon: Truck, color: "bg-primary/10 text-primary" },
      { label: "Record Collection", description: "Click 'Add Collection' and select material type, quantity, and location", icon: Package, color: "bg-primary/10 text-primary" },
      { label: "Track by Batch", description: "Each entry gets a unique batch ID for traceability", icon: ClipboardList, color: "bg-primary/10 text-primary" },
      { label: "View Summary", description: "See all materials, quantities, and total inventory value", icon: BarChart3, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace & Sales",
    subtitle: "Sell aggregated materials to recyclers",
    icon: Store,
    color: "text-secondary",
    tip: "List your materials on the marketplace to reach more buyers and get better prices.",
    steps: [
      { label: "List Materials", description: "Post available materials with quantity and asking price", icon: Store, color: "bg-accent/10 text-secondary" },
      { label: "Receive Inquiries", description: "Recyclers and buyers will contact you for materials", icon: Users, color: "bg-accent/10 text-secondary" },
      { label: "Generate Invoice", description: "Create an invoice for the agreed sale", icon: FileText, color: "bg-accent/10 text-secondary" },
      { label: "Arrange Logistics", description: "Coordinate pickup or delivery of materials", icon: Truck, color: "bg-accent/10 text-secondary" },
    ],
  },
  {
    id: "payments",
    title: "Payments & Receipts",
    subtitle: "Pay waste pickers and generate receipts",
    icon: DollarSign,
    color: "text-primary",
    tip: "Mark payments as completed promptly and download bulk receipts for your records.",
    steps: [
      { label: "Record Payment", description: "Enter phone number, amount, and description for each payment", icon: DollarSign, color: "bg-primary/10 text-primary" },
      { label: "Mark as Paid", description: "Update payment status when M-Pesa or cash is confirmed", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
      { label: "Individual Receipts", description: "Download a PDF receipt for any single payment", icon: FileText, color: "bg-primary/10 text-primary" },
      { label: "Bulk Receipts", description: "Download a combined PDF of all completed payments", icon: Printer, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "financials",
    title: "Earnings & Expenses",
    subtitle: "Track your money in and out",
    icon: TrendingUp,
    color: "text-secondary",
    tip: "Record expenses daily so you always know your real profit margin.",
    steps: [
      { label: "View Income", description: "Track money received from selling materials to recyclers", icon: TrendingUp, color: "bg-accent/10 text-secondary" },
      { label: "Add Expenses", description: "Record costs like transport, storage, wages, and equipment", icon: FileText, color: "bg-accent/10 text-secondary" },
      { label: "Set Budgets", description: "Set monthly spending limits for different categories", icon: BarChart3, color: "bg-accent/10 text-secondary" },
      { label: "Download Reports", description: "Get Profit & Loss, Cash Flow, and Balance Sheet reports", icon: ClipboardList, color: "bg-accent/10 text-secondary" },
    ],
  },
  {
    id: "logistics",
    title: "Logistics & Pickup",
    subtitle: "Coordinate material pickups and deliveries",
    icon: Truck,
    color: "text-primary",
    steps: [
      { label: "Schedule Pickups", description: "Set pickup dates and locations for waste pickers", icon: Truck, color: "bg-primary/10 text-primary" },
      { label: "Track Deliveries", description: "Monitor ongoing deliveries and their status", icon: ClipboardList, color: "bg-primary/10 text-primary" },
      { label: "Handle Requests", description: "Accept or respond to pickup requests from pickers", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & ESG",
    subtitle: "Stay compliant and track environmental impact",
    icon: Shield,
    color: "text-secondary",
    tip: "Upload your NEMA license, county permit, and transport permits to stay compliant.",
    steps: [
      { label: "Upload Documents", description: "Add business licenses, environmental permits, and certificates", icon: Shield, color: "bg-accent/10 text-secondary" },
      { label: "Track EPR Progress", description: "Monitor your Extended Producer Responsibility targets", icon: Leaf, color: "bg-accent/10 text-secondary" },
      { label: "ESG Reports", description: "Generate environmental, social, and governance reports", icon: BarChart3, color: "bg-accent/10 text-secondary" },
      { label: "Carbon Offset", description: "See how much CO₂ your collections help avoid", icon: Leaf, color: "bg-accent/10 text-secondary" },
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
    { label: "Collect from Pickers", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Store in Inventory", icon: Package, color: "bg-primary/10 text-primary" },
    { label: "Sort & Aggregate", icon: ClipboardList, color: "bg-accent/10 text-secondary" },
    { label: "Sell to Recyclers", icon: Store, color: "bg-accent/10 text-secondary" },
    { label: "Pay Waste Pickers", icon: DollarSign, color: "bg-primary/10 text-primary" },
    { label: "Track Earnings", icon: TrendingUp, color: "bg-primary/10 text-primary" },
  ];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Your Business at a Glance
        </CardTitle>
        <p className="text-sm text-muted-foreground">This is how your aggregation business flows from start to finish</p>
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

const AggregatorWorkflowGuidePanel = () => {
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

export default AggregatorWorkflowGuidePanel;
