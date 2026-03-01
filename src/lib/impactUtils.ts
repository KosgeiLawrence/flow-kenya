// Environmental impact factors per kg of material
// Sources: EPA, IPCC, industry averages
const CO2_FACTORS: Record<string, number> = {
  PET: 3.1,
  HDPE: 1.8,
  LDPE: 2.0,
  PP: 1.7,
  PS: 3.0,
  Aluminium: 9.1,
  Glass: 0.6,
  Paper: 1.1,
  Cardboard: 0.9,
  Metal: 4.5,
  "Mixed Plastic": 2.5,
};

const WATER_FACTOR = 17; // liters saved per kg recycled (average)
const LANDFILL_FACTOR = 0.0012; // cubic meters per kg

export interface ImpactMetrics {
  totalKg: number;
  co2Avoided: number;
  waterSaved: number;
  landfillReduced: number;
  totalEarnings: number;
  materialBreakdown: { name: string; kg: number; co2: number }[];
}

export function calculateImpact(
  collections: Array<{
    quantity: number;
    material_types?: { name: string; price_per_unit: number } | null;
  }>
): ImpactMetrics {
  const materialMap = new Map<string, { kg: number; earnings: number }>();
  let totalKg = 0;
  let totalEarnings = 0;

  for (const c of collections) {
    const name = c.material_types?.name || "Unknown";
    const qty = Number(c.quantity);
    const price = Number(c.material_types?.price_per_unit || 0);
    totalKg += qty;
    totalEarnings += qty * price;

    const existing = materialMap.get(name) || { kg: 0, earnings: 0 };
    existing.kg += qty;
    existing.earnings += qty * price;
    materialMap.set(name, existing);
  }

  let co2Avoided = 0;
  const materialBreakdown: ImpactMetrics["materialBreakdown"] = [];

  materialMap.forEach((val, name) => {
    const factor = CO2_FACTORS[name] || 2.0; // default factor
    const co2 = val.kg * factor;
    co2Avoided += co2;
    materialBreakdown.push({ name, kg: val.kg, co2 });
  });

  materialBreakdown.sort((a, b) => b.kg - a.kg);

  return {
    totalKg,
    co2Avoided,
    waterSaved: totalKg * WATER_FACTOR,
    landfillReduced: totalKg * LANDFILL_FACTOR,
    totalEarnings,
    materialBreakdown,
  };
}

export function formatImpactMessage(kg: number, materialName?: string): string {
  const factor = materialName ? (CO2_FACTORS[materialName] || 2.0) : 2.0;
  const co2 = kg * factor;
  return `Your ${kg.toFixed(1)} kg saved ${co2.toFixed(1)} kg CO₂ from entering the atmosphere.`;
}
