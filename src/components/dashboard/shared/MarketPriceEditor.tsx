import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface MarketPriceEditorProps {
  materialId: string;
  currentPrice: number;
  unit: string;
}

const MarketPriceEditor = ({ materialId, currentPrice, unit }: MarketPriceEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(currentPrice));
  const queryClient = useQueryClient();

  const updatePrice = useMutation({
    mutationFn: async () => {
      const newPrice = Number(price);
      if (isNaN(newPrice) || newPrice <= 0) throw new Error("Invalid price");
      const { error } = await supabase
        .from("material_types")
        .update({ price_per_unit: newPrice })
        .eq("id", materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_types"] });
      queryClient.invalidateQueries({ queryKey: ["material_types_marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["recycler_market_prices"] });
      setEditing(false);
      toast.success("Price updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => { setPrice(String(currentPrice)); setEditing(true); }}
      >
        <Edit2 className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="h-7 w-20 text-sm"
        min="0"
        step="0.01"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") updatePrice.mutate();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updatePrice.mutate()} disabled={updatePrice.isPending}>
        <Check className="w-3.5 h-3.5 text-primary" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default MarketPriceEditor;
