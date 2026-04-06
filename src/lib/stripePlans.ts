// Subscription pricing structure per role with billing period options

export type BillingPeriod = "monthly" | "yearly" | "one_time";

export interface RolePricing {
  monthly: number;
  yearly: number;
  one_time: number;
}

export const ROLE_PRICING: Record<string, RolePricing> = {
  waste_picker: { monthly: 250, yearly: 2550, one_time: 5800 },
  aggregator: { monthly: 250, yearly: 2550, one_time: 5800 },
  recycler: { monthly: 300, yearly: 3060, one_time: 7000 },
  ngo: { monthly: 650, yearly: 6600, one_time: 14500 },
  corporate: { monthly: 1300, yearly: 13200, one_time: 29000 },
  county_government: { monthly: 25000, yearly: 255000, one_time: 510000 },
};

export const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: "/month",
  yearly: "/year",
  one_time: " (one-time)",
};

export const getAmount = (role: string, period: BillingPeriod): number => {
  return ROLE_PRICING[role]?.[period] ?? 0;
};

export const getMonthlyEquivalent = (role: string, period: BillingPeriod): number => {
  const pricing = ROLE_PRICING[role];
  if (!pricing) return 0;
  if (period === "monthly") return pricing.monthly;
  if (period === "yearly") return Math.round(pricing.yearly / 12);
  return 0; // one-time has no monthly equivalent
};

export const getSavingsPercent = (role: string, period: BillingPeriod): number => {
  const pricing = ROLE_PRICING[role];
  if (!pricing || period === "monthly") return 0;
  const fullYearly = pricing.monthly * 12;
  if (period === "yearly") return Math.round(((fullYearly - pricing.yearly) / fullYearly) * 100);
  // one_time vs 2 years
  const twoYears = fullYearly * 2;
  return Math.round(((twoYears - pricing.one_time) / twoYears) * 100);
};

// Legacy compatibility
export const PLAN_AMOUNT_MAP: Record<string, number> = {};
export const FREE_PLANS: string[] = [];
export const isFreePlan = (_planId: string) => false;
export const isPaidPlan = (_planId: string) => true;
