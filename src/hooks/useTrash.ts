import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TrashItem {
  id: string;
  user_id: string;
  original_table: string;
  original_id: string;
  original_data: Record<string, any>;
  item_label: string;
  deleted_at: string;
  expires_at: string;
  restored_at: string | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  collections: "Collection",
  financial_transactions: "Transaction",
  customers: "Customer",
  suppliers: "Supplier",
  aggregator_purchase_orders: "Purchase Order",
  recycler_orders: "Order",
  recycler_products: "Product",
  cleanup_exercises: "Cleanup Exercise",
  compliance_documents: "Compliance Document",
  material_transformations: "Transformation",
  client_collections: "Client Collection",
  pickup_schedules: "Pickup Schedule",
  financial_budgets: "Budget",
  balance_sheet_items: "Balance Sheet Item",
  ngo_programs: "Program",
  ngo_sponsorships: "Sponsorship",
  plastic_declarations: "Declaration",
  recovery_commitments: "Recovery Commitment",
  community_training_logs: "Training Log",
};

export const getTableLabel = (table: string) => TABLE_LABELS[table] || table;

export const useTrash = () => {
  const { user } = useAuth();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const fetchTrash = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("trash_items")
      .select("*")
      .eq("user_id", user.id)
      .is("restored_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("deleted_at", { ascending: false });

    if (!error && data) {
      setTrashItems(data as unknown as TrashItem[]);
      setTrashCount(data.length);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const softDelete = async (
    table: string,
    id: string,
    itemData: Record<string, any>,
    label: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Insert into trash
    const { error: trashError } = await supabase.from("trash_items").insert({
      user_id: user.id,
      original_table: table,
      original_id: id,
      original_data: itemData as any,
      item_label: label,
    });

    if (trashError) {
      toast.error("Failed to move to trash");
      return false;
    }

    // Delete from original table
    const { error: deleteError } = await supabase.from(table as any).delete().eq("id", id);
    if (deleteError) {
      // Rollback trash insert
      await supabase.from("trash_items").delete()
        .eq("user_id", user.id)
        .eq("original_id", id)
        .eq("original_table", table);
      toast.error("Failed to delete item");
      return false;
    }

    toast.success("Moved to trash", { description: "Item will be permanently deleted after 30 days" });
    fetchTrash();
    return true;
  };

  const restore = async (trashItem: TrashItem): Promise<boolean> => {
    if (!user) return false;

    const { original_table, original_data, id } = trashItem;

    // Re-insert into original table
    const { error: insertError } = await supabase
      .from(original_table as any)
      .insert(original_data as any);

    if (insertError) {
      toast.error("Failed to restore item: " + insertError.message);
      return false;
    }

    // Mark as restored
    const { error: updateError } = await supabase
      .from("trash_items")
      .update({ restored_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (updateError) {
      toast.error("Item restored but trash record update failed");
    }

    toast.success("Item restored successfully");
    fetchTrash();
    return true;
  };

  const permanentDelete = async (trashItemId: string): Promise<boolean> => {
    const { error } = await supabase.from("trash_items").delete().eq("id", trashItemId);
    if (error) {
      toast.error("Failed to permanently delete");
      return false;
    }
    toast.success("Permanently deleted");
    fetchTrash();
    return true;
  };

  const emptyTrash = async (): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from("trash_items")
      .delete()
      .eq("user_id", user.id)
      .is("restored_at", null);

    if (error) {
      toast.error("Failed to empty trash");
      return false;
    }
    toast.success("Trash emptied");
    fetchTrash();
    return true;
  };

  return {
    trashItems,
    trashCount,
    loading,
    softDelete,
    restore,
    permanentDelete,
    emptyTrash,
    fetchTrash,
  };
};
