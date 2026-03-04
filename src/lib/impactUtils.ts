// Environmental impact factors per kg of material
// DEPRECATED: Import from @/lib/impactFactors instead for new code.
// This file is kept for backward compatibility with existing waste picker panels.

import {
  CO2_FACTORS as FACTORS,
  DEFAULT_CO2_FACTOR,
  WATER_FACTOR,
  LANDFILL_FACTOR,
  getCO2Avoided,
} from "@/lib/impactFactors";

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
    const co2 = getCO2Avoided(name, val.kg);
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
  const co2 = getCO2Avoided(materialName || "Unknown", kg);
  return `Your ${kg.toFixed(1)} kg saved ${co2.toFixed(1)} kg CO₂ from entering the atmosphere.`;
}
