import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Tag, Crown, Zap, Clock, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ROLE_PRICING,
  BillingPeriod,
  getAmount,
  getSavingsPercent,
  BILLING_LABELS,
} from "@/lib/stripePlans";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government";

const ROLE_FEATURES: Record<AppRole, string[]> = {
  waste_picker: ["Collection logging", "Payment tracking", "Analytics", "Marketplace listing", "Income insights"],
  aggregator: ["Inventory tracking", "Waste picker management", "Batch tracking", "Marketplace access", "Analytics dashboard"],
  recycler: ["Inventory management", "Order tracking", "Supply forecasting", "ESG reporting", "Market insights"],
  ngo: ["Program management", "Impact tracking", "Grant management", "Sponsorship tracking", "Advanced reports"],
  corporate: ["Supplier tracking", "Full traceability", "ESG reports", "Certification access", "Audit-ready docs"],
  county_government: ["Full dashboard access", "Ward-level intelligence", "Compliance reporting", "Route optimization", "Predictive modeling"],
};

const GENERAL_PROMOS = ["PILOT2026", "COASTALPARTNER", "EARLYADOPTER", "MOMBASAPILOT"];
const NGO_CORP_COUNTY_PROMOS = ["SOCIALCHANGE10", "CIRCULARNGO20"];
const NGO_CORP_COUNTY_ROLES: AppRole[] = ["ngo", "corporate", "county_government"];

export const VALID_PROMOS = [...GENERAL_PROMOS, ...NGO_CORP_COUNTY_PROMOS];

export const isPromoValidForRole = (code: string, role: AppRole | null): boolean => {
  if (!code || !role) return false;
  const upper = code.toUpperCase();
  if (NGO_CORP_COUNTY_ROLES.includes(role)) {
    return NGO_CORP_COUNTY_PROMOS.includes(upper);
  }
  return GENERAL_PROMOS.includes(upper);
};

const roleColors: Record<AppRole, string> = {
  waste_picker: "border-emerald-500/30 bg-emerald-500/5",
  aggregator: "border-blue-500/30 bg-blue-500/5",
  recycler: "border-blue-500/30 bg-blue-500/5",
  ngo: "border-rose-500/30 bg-rose-500/5",
  corporate: "border-purple-500/30 bg-purple-500/5",
  county_government: "border-amber-500/30 bg-amber-500/5",
};

const periodIcons: Record<BillingPeriod, typeof Zap> = {
  free_trial: Gift,
  monthly: Zap,
  yearly: Crown,
  one_time: Clock,
};

interface PricingPlansProps {
  role: AppRole;
  selectedPlan: string | null;
  onSelectPlan: (planId: string) => void;
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  promoValid: boolean;
}

const formatKES = (amount: number) =>
  `KES ${amount.toLocaleString("en-KE")}`;

const PricingPlans = ({
  role,
  selectedPlan,
  onSelectPlan,
  billingPeriod,
  onBillingPeriodChange,
  promoCode,
  onPromoCodeChange,
  promoValid,
}: PricingPlansProps) => {
  const pricing = ROLE_PRICING[role];
  const amount = getAmount(role, billingPeriod);
  const savings = getSavingsPercent(role, billingPeriod);
  const features = ROLE_FEATURES[role] || [];
  const planId = `${role}_${billingPeriod}`;
  const isTrial = billingPeriod === "free_trial";

  // Auto-select plan when role/period changes
  useEffect(() => {
    if (selectedPlan !== planId) {
      onSelectPlan(planId);
    }
  }, [planId, selectedPlan, onSelectPlan]);

  if (!pricing) return null;

  const allPeriods: { id: BillingPeriod; label: string; badge?: string }[] = [
    { id: "free_trial", label: "Free Trial", badge: "30 days" },
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
    { id: "one_time", label: "One-Time" },
  ];

  const periods = role === "county_government"
    ? allPeriods.filter((p) => p.id !== "free_trial")
    : allPeriods;

  return (
    <div className="space-y-5">
      {/* Billing period selector */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-muted/50 border border-border">
        {periods.map((p) => {
          const isActive = billingPeriod === p.id;
          const Icon = periodIcons[p.id];
          const periodSavings = getSavingsPercent(role, p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onBillingPeriodChange(p.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2.5 px-1.5 rounded-md text-xs font-medium transition-all",
                isActive
                  ? "bg-background shadow-sm text-foreground border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs">{p.label}</span>
              {p.badge && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-0">
                  {p.badge}
                </Badge>
              )}
              {periodSavings > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-600 border-0">
                  Save {periodSavings}%
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Plan card */}
      <motion.div
        key={`${role}-${billingPeriod}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative flex flex-col p-5 rounded-xl border-2 text-left transition-all",
          isTrial
            ? "border-primary shadow-soft bg-primary/5"
            : `border-primary shadow-soft ${roleColors[role]}`
        )}
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-semibold text-foreground capitalize">
              {role.replace(/_/g, " ")}
            </span>
            <div className="mt-1">
              {isTrial ? (
                <div>
                  <span className="text-2xl font-bold text-primary">Free</span>
                  <span className="text-xs text-muted-foreground ml-1">for 30 days</span>
                </div>
              ) : promoValid ? (
                <div className="flex items-center gap-2">
                  <span className="line-through text-muted-foreground text-sm">{formatKES(amount)}</span>
                  <span className="text-xl font-bold text-emerald-600">Free</span>
                </div>
              ) : (
                <div>
                  <span className="text-2xl font-bold text-foreground">{formatKES(amount)}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {BILLING_LABELS[billingPeriod]}
                  </span>
                </div>
              )}
            </div>
            {isTrial && (
              <p className="text-xs text-primary mt-0.5 font-medium">
                Full access — no payment required
              </p>
            )}
            {billingPeriod === "yearly" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ≈ {formatKES(Math.round(pricing.yearly / 12))}/month
              </p>
            )}
            {billingPeriod === "one_time" && (
              <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                Lifetime access — no renewals
              </p>
            )}
            {billingPeriod === "monthly" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Renews every month
              </p>
            )}
          </div>
          {isTrial && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2">
              TRY FREE
            </Badge>
          )}
          {!isTrial && savings > 0 && (
            <Badge className="bg-emerald-500 text-white text-[10px] px-2">
              {savings}% OFF
            </Badge>
          )}
        </div>

        <ul className="mt-4 space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        {isTrial && (
          <p className="mt-3 text-[10px] text-muted-foreground border-t border-border pt-2">
            After 30 days, choose a paid plan to continue. No auto-charge.
          </p>
        )}
      </motion.div>

      {/* Promo Code - hide when trial is selected */}
      {!isTrial && (
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
      )}
    </div>
  );
};

export default PricingPlans;
