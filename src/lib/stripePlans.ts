// Mapping from internal plan IDs to Stripe price IDs
export const PLAN_PRICE_MAP: Record<string, string> = {
  // Waste Picker
  wp_basic: "", // Free plan, no Stripe price
  wp_pro: "price_1T76J4Lnfj5R7qp8Xeop5xnO",
  // Aggregator
  agg_standard: "price_1T76JLLnfj5R7qp82gd8UV8X",
  agg_premium: "price_1T76JdLnfj5R7qp8LB8ngAK0",
  agg_enterprise: "", // Custom
  // Recycler (reuse aggregator prices for same tiers)
  rec_standard: "price_1T76JLLnfj5R7qp82gd8UV8X",
  rec_premium: "price_1T76JdLnfj5R7qp8LB8ngAK0",
  rec_enterprise: "", // Custom
  // NGO
  ngo_basic: "price_1T76JLLnfj5R7qp82gd8UV8X",
  ngo_pro: "price_1T76JdLnfj5R7qp8LB8ngAK0",
  // Corporate
  corp_basic: "price_1T76JjLnfj5R7qp8bRIuHfOn",
  corp_esg: "price_1T76JlLnfj5R7qp8zgnBjNSz",
  corp_enterprise: "price_1T76JmLnfj5R7qp8K6eaJ8rO",
  // County Government
  county_pilot: "price_1T76JnLnfj5R7qp8NVMANGI4",
  county_full: "", // Custom pricing 2M-5M
  county_smart: "", // Custom
};

export const FREE_PLANS = ["wp_basic", "agg_enterprise", "rec_enterprise", "county_smart", "county_full"];

export const isFreePlan = (planId: string) => FREE_PLANS.includes(planId);
