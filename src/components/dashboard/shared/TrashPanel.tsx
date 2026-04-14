import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactList } from "@/components/ui/compact-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, RotateCcw, AlertTriangle, Clock, Package } from "lucide-react";
import { useTrash, getTableLabel } from "@/hooks/useTrash";
import { format, formatDistanceToNow } from "date-fns";

const TrashPanel = () => {
  const { t } = useTranslation();
  const { trashItems, loading, restore, permanentDelete, emptyTrash } = useTrash();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const handleRestore = async (item: any) => {
    await restore(item);
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm(t("trashPanel.deleteConfirm"))) return;
    await permanentDelete(id);
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setConfirmEmpty(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t("trashPanel.loadingTrash")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("trashPanel.title")}</h2>
          <Badge variant="secondary" className="text-xs">{trashItems.length} {t("common.items")}</Badge>
        </div>
        {trashItems.length > 0 && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmEmpty(true)}
            className="gap-1"
          >
            <Trash2 className="w-3 h-3" /> {t("trashPanel.emptyTrash")}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("trashPanel.noItemsDesc")}
      </p>

      {trashItems.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{t("trashPanel.noItems")}</p>
        </Card>
      ) : (
        <CompactList
          items={trashItems}
          initialCount={5}
          stepCount={10}
          renderItem={(item: any) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.item_label}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {getTableLabel(item.original_table)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}</span>
                    <span className="text-destructive/70">
                      · {t("trashPanel.expiresIn")} {format(new Date(item.expires_at), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(item)}
                    className="gap-1 h-8"
                  >
                    <RotateCcw className="w-3 h-3" /> {t("trashPanel.restore")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePermanentDelete(item.id)}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        />
      )}

      {/* Empty trash confirmation */}
      <Dialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("trashPanel.emptyConfirmTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("trashPanel.emptyConfirmDesc")}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmEmpty(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleEmptyTrash}>{t("trashPanel.confirmEmpty")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrashPanel;
