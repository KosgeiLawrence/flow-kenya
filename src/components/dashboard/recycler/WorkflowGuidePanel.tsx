import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, Recycle, ShoppingBag, TrendingUp, FileText, ClipboardCheck,
  BarChart3, Leaf, Shield, Truck, BookOpen, Briefcase, Settings,
  ClipboardList, ArrowDown, ArrowRight, ChevronDown, ChevronUp,
  CircleDot, CheckCircle2, Users, Store, LayoutGrid, Share2, Bot,
  Trash2, UserPlus, ClipboardSignature, Upload
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
    id: "inventory",
    title: "Inventory Management",
    subtitle: "Track what waste you have in stock",
    icon: Package,
    color: "text-primary",
    tip: "Always record materials when they arrive so your stock is accurate.",
    steps: [
      { label: "Receive Waste", description: "Waste pickers or aggregators deliver raw materials to you", icon: Truck, color: "bg-primary/10 text-primary" },
      { label: "Record in Inventory", description: "Click 'Add to Inventory' and select the material type and quantity", icon: Package, color: "bg-primary/10 text-primary" },
      { label: "Stock Updates", description: "Your available stock and market value update automatically", icon: BarChart3, color: "bg-primary/10 text-primary" },
      { label: "View Summary", description: "See all your materials, quantities, and total value at a glance", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "transformation",
    title: "Material Transformation",
    subtitle: "Turn raw waste into finished products",
    icon: Recycle,
    color: "text-secondary",
    tip: "Keep yield percentages above 70% for good efficiency. Track different transformation types to know which process works best.",
    steps: [
      { label: "Select Raw Material", description: "Choose waste material from your inventory (e.g., PET bottles)", icon: Package, color: "bg-secondary/10 text-secondary" },
      { label: "Set Input Quantity", description: "Enter how much material you want to process (e.g., 100 kg)", icon: CircleDot, color: "bg-secondary/10 text-secondary" },
      { label: "Choose Output", description: "Name your product (e.g., 'Recycled Pellets') or add to existing product", icon: Recycle, color: "bg-secondary/10 text-secondary" },
      { label: "Record Transformation", description: "System deducts raw material, creates product, and tracks yield", icon: CheckCircle2, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "sales",
    title: "Selling Products",
    subtitle: "From quotation to receipt in 3 steps",
    icon: ShoppingBag,
    color: "text-primary",
    tip: "You can skip the quotation step for returning customers who already know prices.",
    steps: [
      { label: "Click 'Sell'", description: "Go to Products & Pricing and click Sell on any product", icon: ShoppingBag, color: "bg-primary/10 text-primary" },
      { label: "Select or Add Customer", description: "Pick existing customer from CRM or enter new client details", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Generate Quotation", description: "Send price quote to client (or skip to invoice if price is agreed)", icon: FileText, color: "bg-primary/10 text-primary" },
      { label: "Generate Invoice", description: "Create the official invoice when client accepts the price", icon: ClipboardList, color: "bg-primary/10 text-primary" },
      { label: "Confirm Payment → Receipt", description: "Mark payment received, generate receipt. Stock & CRM update automatically", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "financials",
    title: "Earnings & Expenses",
    subtitle: "Track your money in and out",
    icon: TrendingUp,
    color: "text-secondary",
    tip: "Record expenses daily so you always know your real profit.",
    steps: [
      { label: "Sales Auto-Recorded", description: "When you sell a product, income is logged automatically", icon: TrendingUp, color: "bg-secondary/10 text-secondary" },
      { label: "Add Expenses", description: "Record costs like transport, labor, or electricity", icon: FileText, color: "bg-secondary/10 text-secondary" },
      { label: "Set Budgets", description: "Set monthly spending limits for different categories", icon: BarChart3, color: "bg-secondary/10 text-secondary" },
      { label: "Download Reports", description: "Get Profit & Loss, Cash Flow, and Balance Sheet reports", icon: ClipboardCheck, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "crm",
    title: "Customer Management",
    subtitle: "Keep track of your buyers",
    icon: Users,
    color: "text-primary",
    tip: "Customer records update automatically when you complete a sale.",
    steps: [
      { label: "Add Customers", description: "Enter customer name, phone, email, and location", icon: Users, color: "bg-primary/10 text-primary" },
      { label: "Auto-Sync from Sales", description: "New customers are created automatically during sales", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
      { label: "View History", description: "See each customer's total purchases and last transaction date", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & ESG",
    subtitle: "Stay compliant and track your impact",
    icon: Shield,
    color: "text-secondary",
    tip: "Upload your NEMA license and KRA certificates to stay compliant.",
    steps: [
      { label: "Upload Documents", description: "Add business licenses, environmental permits, and certificates", icon: Shield, color: "bg-secondary/10 text-secondary" },
      { label: "Track Carbon Offset", description: "See how much CO₂ your recycling prevents automatically", icon: Leaf, color: "bg-secondary/10 text-secondary" },
      { label: "ESG Reports", description: "Generate environmental, social, and governance reports", icon: BarChart3, color: "bg-secondary/10 text-secondary" },
    ],
  },
  {
    id: "pickups",
    title: "Pickup Requests",
    subtitle: "Accept or request material deliveries",
    icon: Truck,
    color: "text-primary",
    steps: [
      { label: "Receive Request", description: "Waste pickers or aggregators send you pickup requests", icon: Truck, color: "bg-primary/10 text-primary" },
      { label: "Review Details", description: "See material type, quantity, proposed price, and location", icon: ClipboardList, color: "bg-primary/10 text-primary" },
      { label: "Accept or Decline", description: "Accept to schedule pickup or decline with a reason", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
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
          {/* Visual flow diagram */}
          <div className="mt-3 space-y-0">
            {workflow.steps.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={i}>
                  <div className="flex items-start gap-3">
                    {/* Step number + connector line */}
                    <div className="flex flex-col items-center">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold", step.color)}>
                        {i + 1}
                      </div>
                      {i < workflow.steps.length - 1 && (
                        <div className="w-0.5 h-6 bg-border mt-1" />
                      )}
                    </div>
                    {/* Step content */}
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

          {/* Tip */}
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

// The big-picture overview diagram
const OverviewDiagram = () => {
  const mainFlow = [
    { label: "Receive Waste", icon: Truck, color: "bg-primary/10 text-primary" },
    { label: "Store in Inventory", icon: Package, color: "bg-primary/10 text-primary" },
    { label: "Transform / Recycle", icon: Recycle, color: "bg-secondary/10 text-secondary" },
    { label: "Create Products", icon: ShoppingBag, color: "bg-secondary/10 text-secondary" },
    { label: "Sell to Customers", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Track Earnings", icon: TrendingUp, color: "bg-primary/10 text-primary" },
  ];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Recycle className="w-5 h-5 text-primary" />
          Your Business at a Glance
        </CardTitle>
        <p className="text-sm text-muted-foreground">This is how your recycling business flows from start to finish</p>
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
          {/* Flow arrows between rows */}
          <div className="flex justify-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground italic">Follow steps 1 → 6 for a complete business cycle</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WorkflowGuidePanel = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">📘 How It Works</h2>
        <p className="text-sm text-muted-foreground mt-1">Simple guides to help you use every part of your dashboard. Tap any section to see the step-by-step flow.</p>
      </div>

      {/* Big picture */}
      <OverviewDiagram />

      {/* Individual workflow guides */}
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

export default WorkflowGuidePanel;
