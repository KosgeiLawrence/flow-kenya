import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface VatConfig {
  includeVat: boolean;
  vatPercent: number;
}

interface Props {
  value: VatConfig;
  onChange: (config: VatConfig) => void;
}

export const DEFAULT_VAT: VatConfig = { includeVat: false, vatPercent: 16 };

export const calcVatAmount = (subtotal: number, vat: VatConfig) =>
  vat.includeVat ? subtotal * (vat.vatPercent / 100) : 0;

export const calcTotal = (subtotal: number, vat: VatConfig) =>
  subtotal + calcVatAmount(subtotal, vat);

const VatOptions = ({ value, onChange }: Props) => (
  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border">
    <div className="flex items-center gap-2">
      <Switch
        id="vat-toggle"
        checked={value.includeVat}
        onCheckedChange={(checked) => onChange({ ...value, includeVat: checked })}
      />
      <Label htmlFor="vat-toggle" className="text-sm cursor-pointer">Include VAT</Label>
    </div>
    {value.includeVat && (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={100}
          value={value.vatPercent}
          onChange={(e) => onChange({ ...value, vatPercent: Number(e.target.value) || 0 })}
          className="w-20 h-8 text-sm"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    )}
  </div>
);

export default VatOptions;
