import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save } from "lucide-react";
import MaterialIcon from "@/components/dashboard/shared/MaterialIcon";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const SystemSettingsPanel = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ["admin-materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [prices, setPrices] = useState<Record<string, string>>({});

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase.from("material_types").update({ price_per_unit: price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      toast.success("Price updated");
    },
    onError: () => toast.error("Failed to update price"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">{t("adminPanels.systemSettings")}</h2>
        <p className="text-muted-foreground">{t("adminPanels.managePricesDesc", "Manage material prices and platform configuration")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Material Price Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.material", "Material")}</TableHead>
                  <TableHead>{t("common.unit", "Unit")}</TableHead>
                  <TableHead>{t("adminPanels.currentPrice", "Current Price (KES)")}</TableHead>
                  <TableHead>{t("marketPriceEditor.newPrice", "New Price")}</TableHead>
                  <TableHead>{t("common.action", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium"><span className="inline-flex items-center gap-1.5"><MaterialIcon iconName={m.icon} className="w-4 h-4" /> {m.name}</span></TableCell>
                    <TableCell className="text-muted-foreground">{m.unit}</TableCell>
                    <TableCell>KES {Number(m.price_per_unit).toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28 h-8"
                        placeholder={String(m.price_per_unit)}
                        value={prices[m.id] || ""}
                        onChange={(e) => setPrices({ ...prices, [m.id]: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1"
                        disabled={!prices[m.id]}
                        onClick={() => {
                          updatePrice.mutate({ id: m.id, price: parseFloat(prices[m.id]) });
                          setPrices({ ...prices, [m.id]: "" });
                        }}
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsPanel;
