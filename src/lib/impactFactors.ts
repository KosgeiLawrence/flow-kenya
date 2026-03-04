/**
 * Centralized environmental impact calculation factors.
 * Single source of truth used across ALL dashboards, reports, and the landing page.
 *
 * Sources: EPA Waste Reduction Model (WARM), IPCC AR6, industry averages.
 */

// kg CO₂ avoided per kg of material recycled
export const CO2_FACTORS: Record<string, number> = {
  "PET Plastic": 3.1,
  "HDPE Plastic": 2.8,
  "LDPE Plastic": 2.0,
  "PP Plastic": 1.7,
  "PS Plastic": 3.0,
  "Mixed Plastic": 2.5,
  Glass: 0.6,
  Aluminium: 9.1,
  "Paper/Cardboard": 1.1,
  "Organic Waste": 0.5,
  Metal: 4.5,
  // Legacy names (kept for backwards compat with older data)
  PET: 3.1,
  HDPE: 1.9,
  LDPE: 2.0,
  PP: 1.7,
  PS: 3.3,
  Paper: 1.1,
  Cardboard: 0.9,
};

export const DEFAULT_CO2_FACTOR = 2.5; // fallback for unknown materials

// Liters of water saved per kg recycled (global average)
export const WATER_FACTOR = 18;

// Cubic meters of landfill diverted per kg
export const LANDFILL_FACTOR = 0.0012;

// kWh of energy saved per kg recycled (average)
export const ENERGY_FACTOR = 5.8;

/**
 * Calculate CO₂ avoided for a given material and quantity.
 */
export function getCO2Avoided(materialName: string, kg: number): number {
  const factor = CO2_FACTORS[materialName] || DEFAULT_CO2_FACTOR;
  return kg * factor;
}

/**
 * Aggregate impact metrics from a material breakdown array.
 */
export interface PlatformStats {
  total_kg: number;
  total_collections: number;
  total_waste_pickers: number;
  total_aggregators: number;
  total_recyclers: number;
  total_ngos: number;
  total_corporates: number;
  total_county_gov: number;
  total_users: number;
  total_payments_kes: number;
  total_women: number;
  total_youth: number;
  total_profiles: number;
  total_collection_sites: number;
  material_breakdown: { name: string; kg: number; price_per_unit: number }[];
  monthly_trend: { month: string; kg: number; count: number }[];
}

export function computeDerivedMetrics(stats: PlatformStats) {
  const totalKg = Number(stats.total_kg) || 0;

  // Compute CO₂ from material breakdown
  let co2Total = 0;
  let incomeTotal = 0;
  const materials = (stats.material_breakdown || []).map((m) => {
    const kg = Number(m.kg) || 0;
    const co2 = getCO2Avoided(m.name, kg);
    const income = kg * (Number(m.price_per_unit) || 0);
    co2Total += co2;
    incomeTotal += income;
    return { name: m.name, kg, co2, income };
  });

  // If no material breakdown, fall back to default factor
  if (materials.length === 0) {
    co2Total = totalKg * DEFAULT_CO2_FACTOR;
  }

  const totalJobs =
    Number(stats.total_waste_pickers) +
    Number(stats.total_aggregators) +
    Number(stats.total_recyclers);

  return {
    totalKg,
    totalTons: totalKg / 1000,
    co2Avoided: co2Total,
    co2Tons: co2Total / 1000,
    waterSaved: totalKg * WATER_FACTOR,
    landfillReduced: totalKg * LANDFILL_FACTOR,
    energySaved: totalKg * ENERGY_FACTOR,
    incomeGenerated: incomeTotal,
    paymentsKes: Number(stats.total_payments_kes) || 0,
    totalCollections: Number(stats.total_collections),
    wastePickers: Number(stats.total_waste_pickers),
    aggregators: Number(stats.total_aggregators),
    recyclers: Number(stats.total_recyclers),
    totalJobs,
    totalUsers: Number(stats.total_users),
    totalProfiles: Number(stats.total_profiles),
    womenCount: Number(stats.total_women),
    youthCount: Number(stats.total_youth),
    womenRate: stats.total_profiles
      ? ((Number(stats.total_women) / Number(stats.total_profiles)) * 100)
      : 0,
    youthRate: stats.total_profiles
      ? ((Number(stats.total_youth) / Number(stats.total_profiles)) * 100)
      : 0,
    collectionSites: Number(stats.total_collection_sites),
    materials,
    monthlyTrend: (stats.monthly_trend || []).map((m) => ({
      month: m.month,
      kg: Number(m.kg),
      count: Number(m.count),
      co2: Number(m.kg) * DEFAULT_CO2_FACTOR,
    })),
  };
}
