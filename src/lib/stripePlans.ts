// Mapping from internal plan IDs to their KES amounts for IntaSend checkout
export const PLAN_AMOUNT_MAP: Record<string, number> = {
  // Waste Picker
  wp_basic: 0, // Free plan
  wp_pro: 500,
  // Aggregator
  agg_standard: 5000,
  agg_premium: 15000,
  agg_enterprise: 0, // Custom
  // Recycler
  rec_standard: 5000,
  rec_premium: 15000,
  rec_enterprise: 0, // Custom
  // NGO
  ngo_basic: 10000,
  ngo_pro: 25000,
  // Corporate
  corp_basic: 30000,
  corp_esg: 75000,
  corp_enterprise: 150000,
  // County Government
  county_pilot: 750000,
  county_full: 0, // Custom pricing
  county_smart: 0, // Custom
};

export const FREE_PLANS = ["wp_basic", "agg_enterprise", "rec_enterprise", "county_smart", "county_full"];

export const isFreePlan = (planId: string) => FREE_PLANS.includes(planId);

export const isPaidPlan = (planId: string) => {
  const amount = PLAN_AMOUNT_MAP[planId];
  return amount !== undefined && amount > 0;
};
