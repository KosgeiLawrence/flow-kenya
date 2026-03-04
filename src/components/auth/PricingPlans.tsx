import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government";

interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  features: string[];
  popular?: boolean;
}

const pricingData: Record<AppRole, Plan[]> = {
  waste_picker: [
    {
      id: "wp_basic",
      name: "Basic",
      price: "Free",
      priceValue: 0,
      period: "",
      features: ["Collection logging", "Payment tracking", "Basic analytics"],
    },
    {
      id: "wp_pro",
      name: "Pro",
      price: "KES 500",
      priceValue: 500,
      period: "/month",
      features: ["Advanced analytics", "Income insights", "Priority marketplace listing", "All Basic features"],
      popular: true,
    },
  ],
  aggregator: [
    {
      id: "agg_standard",
      name: "Standard",
      price: "KES 5,000",
      priceValue: 5000,
      period: "/month",
      features: ["Inventory tracking", "Waste picker management", "Batch tracking"],
    },
    {
      id: "agg_premium",
      name: "Premium",
      price: "KES 15,000",
      priceValue: 15000,
      period: "/month",
      features: ["Marketplace access", "Compliance tools", "Analytics dashboard", "Logistics coordination", "All Standard features"],
      popular: true,
    },
    {
      id: "agg_enterprise",
      name: "Enterprise",
      price: "Custom",
      priceValue: 0,
      period: "",
      features: ["API integration", "Multi-branch access", "Automated reporting", "All Premium features"],
    },
  ],
  recycler: [
    {
      id: "rec_standard",
      name: "Standard",
      price: "KES 5,000",
      priceValue: 5000,
      period: "/month",
      features: ["Inventory management", "Order tracking", "Basic analytics"],
    },
    {
      id: "rec_premium",
      name: "Premium",
      price: "KES 15,000",
      priceValue: 15000,
      period: "/month",
      features: ["Supply forecasting", "ESG reporting", "Market insights", "All Standard features"],
      popular: true,
    },
    {
      id: "rec_enterprise",
      name: "Enterprise",
      price: "Custom",
      priceValue: 0,
      period: "",
      features: ["API integration", "Custom reporting", "All Premium features"],
    },
  ],
  ngo: [
    {
      id: "ngo_basic",
      name: "Basic",
      price: "KES 10,000",
      priceValue: 10000,
      period: "/month",
      features: ["Program management", "Impact tracking", "Basic reporting"],
    },
    {
      id: "ngo_pro",
      name: "Pro",
      price: "KES 25,000",
      priceValue: 25000,
      period: "/month",
      features: ["Grant management", "Sponsorship tracking", "Advanced impact reports", "All Basic features"],
      popular: true,
    },
  ],
  corporate: [
    {
      id: "corp_basic",
      name: "Compliance Basic",
      price: "KES 30,000",
      priceValue: 30000,
      period: "/month",
      features: ["Supplier tracking", "Waste volume reporting"],
    },
    {
      id: "corp_esg",
      name: "ESG Pro",
      price: "KES 75,000",
      priceValue: 75000,
      period: "/month",
      features: ["Full traceability", "Downloadable ESG reports", "Certification access", "All Basic features"],
      popular: true,
    },
    {
      id: "corp_enterprise",
      name: "Enterprise",
      price: "KES 150,000+",
      priceValue: 150000,
      period: "/month",
      features: ["API integration", "Custom reporting", "Audit-ready documentation", "All ESG Pro features"],
    },
  ],
  county_government: [
    {
      id: "county_pilot",
      name: "Pilot (6 Months)",
      price: "KES 750,000",
      priceValue: 750000,
      period: "",
      features: ["Limited wards", "Performance analytics"],
    },
    {
      id: "county_full",
      name: "Full County License",
      price: "KES 2M – 5M",
      priceValue: 2000000,
      period: "/year",
      features: ["Full dashboard access", "Ward-level intelligence", "Compliance reporting"],
      popular: true,
    },
    {
      id: "county_smart",
      name: "Smart City Package",
      price: "Custom",
      priceValue: 0,
      period: "",
      features: ["Route optimization", "Predictive waste modeling", "Integration with county systems", "All Full License features"],
    },
  ],
};

const VALID_PROMOS = ["PILOT2026", "COASTALPARTNER", "EARLYADOPTER", "MOMBASAPILOT"];

const roleColors: Record<AppRole, string> = {
  waste_picker: "border-emerald-500/30 bg-emerald-500/5",
  aggregator: "border-blue-500/30 bg-blue-500/5",
  recycler: "border-blue-500/30 bg-blue-500/5",
  ngo: "border-rose-500/30 bg-rose-500/5",
  corporate: "border-purple-500/30 bg-purple-500/5",
  county_government: "border-amber-500/30 bg-amber-500/5",
};

const roleAccents: Record<AppRole, string> = {
  waste_picker: "bg-emerald-500",
  aggregator: "bg-blue-500",
  recycler: "bg-blue-500",
  ngo: "bg-rose-500",
  corporate: "bg-purple-500",
  county_government: "bg-amber-500",
};

interface PricingPlansProps {
  role: AppRole;
  selectedPlan: string | null;
  onSelectPlan: (planId: string) => void;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  promoValid: boolean;
}

const PricingPlans = ({ role, selectedPlan, onSelectPlan, promoCode, onPromoCodeChange, promoValid }: PricingPlansProps) => {
  const plans = pricingData[role] || [];

  return (
    <div className="space-y-5">
      <div className={cn("grid gap-3", plans.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {plans.map((plan, i) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <motion.button
              key={plan.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelectPlan(plan.id)}
              className={cn(
                "relative flex flex-col p-4 rounded-xl border-2 text-left transition-all",
                isSelected
                  ? `border-primary shadow-soft ${roleColors[role]}`
                  : "border-border hover:border-primary/40"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1">
                  <Sparkles className="w-3 h-3" /> Popular
                </Badge>
              )}
              <span className="text-sm font-semibold text-foreground">{plan.name}</span>
              <div className="mt-1 mb-3">
                <span className="text-xl font-bold text-foreground">
                  {promoValid && plan.priceValue > 0 ? (
                    <>
                      <span className="line-through text-muted-foreground text-sm mr-1">{plan.price}</span>
                      <span className="text-emerald-600">Free</span>
                    </>
                  ) : (
                    plan.price
                  )}
                </span>
                {plan.period && !promoValid && (
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground/60")} />
                    {f}
                  </li>
                ))}
              </ul>
              {isSelected && (
                <div className={cn("absolute top-2 left-2 w-2.5 h-2.5 rounded-full", roleAccents[role])} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Promo Code */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
      >
        <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <Input
            placeholder="Promo code (optional)"
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase().trim())}
            className="h-8 text-sm"
          />
        </div>
        {promoCode && (
          <span className={cn("text-xs font-medium", promoValid ? "text-emerald-600" : "text-destructive")}>
            {promoValid ? "✓ 100% off!" : "Invalid"}
          </span>
        )}
      </motion.div>
    </div>
  );
};

export { pricingData, VALID_PROMOS };
export default PricingPlans;
