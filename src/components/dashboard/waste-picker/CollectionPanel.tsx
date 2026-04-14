import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Package, Loader2, Leaf, Droplets, Trash2, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { calculateImpact } from "@/lib/impactUtils";
import ClientCollectionFlow from "./ClientCollectionFlow";
import jsPDF from "jspdf";
import { useOrgInfo } from "@/hooks/useOrgInfo";
import {
  PDF_COLORS, addCleanHeader, addDocMeta, drawTableHeader,
  drawTableRow, drawVatTotalBlock, finalizeCleanPdf, loadImageAsBase64, buildPdfOrgInfo,
} from "@/lib/pdfBranding";
import { useChatbotUIAction } from "@/hooks/useChatbotUIAction";

const CollectionPanel = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { orgInfo } = useOrgInfo();
  const queryClient = useQueryClient();
  const [materialTypeId, setMaterialTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [locationName, setLocationName] = useState("");
  const [showForm, setShowForm] = useState(false);

  useChatbotUIAction(["add-collection"], useCallback(() => setShowForm(true), []));

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: mainCollections, isLoading: isLoadingMain } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .eq("user_id", user!.id)
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: clientCollections, isLoading: isLoadingClient } = useQuery({
    queryKey: ["client_collections_for_log", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_collections")
        .select("*")
        .eq("waste_picker_id", user!.id)
        .order("collection_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Merge both sources into a unified list, deduplicating by notes containing "Client:"
  const collections = (() => {
    const main = (mainCollections || []).map(c => ({
      id: c.id,
      quantity: c.quantity,
      collected_at: c.collected_at,
      location_name: c.location_name,
      batch_id: c.batch_id,
      notes: c.notes,
      material_types: (c as any).material_types,
      source: "collection" as const,
    }));

    // Find client collections not already synced to main collections
    const mainNotes = new Set(main.map(m => m.notes).filter(Boolean));
    const extra = (clientCollections || [])
      .filter(cc => !mainNotes.has(`Client: ${cc.client_name}`))
      .map(cc => ({
        id: cc.id,
        quantity: cc.quantity_kg,
        collected_at: cc.collection_date,
        location_name: cc.location_name,
        batch_id: null,
        notes: `Client: ${cc.client_name}`,
        material_types: { name: cc.material_type, unit: "kg", price_per_unit: cc.unit_price },
        source: "client" as const,
      }));

    return [...main, ...extra].sort((a, b) =>
      new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
    );
  })();

  const isLoading = isLoadingMain || isLoadingClient;

  const addCollection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collections").insert({
        user_id: user!.id,
        material_type_id: materialTypeId,
        quantity: parseFloat(quantity),
        location_name: locationName || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection logged!");
      setMaterialTypeId("");
      setQuantity("");
      setLocationName("");
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const todayCollections = collections?.filter(
    c => format(new Date(c.collected_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ) || [];
  const todayTotal = todayCollections.reduce((sum, c) => sum + Number(c.quantity), 0);

  const impact = calculateImpact(
    (collections || []).map(c => ({
      quantity: c.quantity,
      material_types: (c as any).material_types,
    }))
  );

  const generateCollectionReceipt = async (c: any) => {
    const doc = new jsPDF();
    const mt = c.material_types;
    const refNo = `RCT-${c.batch_id || c.id.slice(0, 8).toUpperCase()}`;

    let pdfOrg = null;
    if (orgInfo?.orgLogoUrl) {
      const logoBase64 = await loadImageAsBase64(orgInfo.orgLogoUrl);
      pdfOrg = buildPdfOrgInfo(orgInfo, logoBase64);
    } else if (orgInfo) {
      pdfOrg = buildPdfOrgInfo(orgInfo, null);
    }

    let y = addCleanHeader(doc, "Collection Receipt", `Ref: ${refNo}`, pdfOrg);

    y = addDocMeta(doc, [
      { label: "Collected by", value: orgInfo?.orgName || profile?.full_name || "Waste Picker" },
      { label: "Phone", value: orgInfo?.contactPhone || profile?.phone_number || "N/A" },
      { label: "Email", value: orgInfo?.contactEmail || profile?.email || "N/A" },
    ], y);

    y += 4;
    y = addDocMeta(doc, [
      { label: "Date", value: format(new Date(c.collected_at), "MMM d, yyyy • h:mm a") },
      { label: "Location", value: c.location_name || "N/A" },
      { label: "Batch ID", value: c.batch_id || "N/A" },
    ], y);

    const cols = [
      { label: "Material", x: 17 },
      { label: "Quantity", x: 80 },
      { label: "Unit", x: 110 },
      { label: "Price/Unit", x: 140 },
    ];
    y = drawTableHeader(doc, cols, y, 178);
    drawTableRow(doc, y, 0, 178);
    doc.setFontSize(8);
    doc.text(mt?.name || "Unknown", 17, y);
    doc.text(`${Number(c.quantity).toFixed(1)}`, 80, y);
    doc.text(mt?.unit || "kg", 110, y);
    doc.text(`KES ${Number(mt?.price_per_unit || 0).toLocaleString()}`, 140, y);
    y += 12;

    const total = Number(c.quantity) * Number(mt?.price_per_unit || 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.forest);
    doc.text(`Total Value: KES ${total.toLocaleString()}`, 15, y);
    doc.setFont("helvetica", "normal");
    y += 16;

    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.darkText);
    doc.text("Received by: ____________________________", 15, y);
    y += 12;
    doc.text("Signature:    ____________________________", 15, y);
    y += 12;
    doc.text("Date:            ____________________________", 15, y);

    finalizeCleanPdf(doc);
    doc.save(`collection-receipt-${refNo}.pdf`);
    toast.success("Receipt downloaded");
  };

  const [activeTab, setActiveTab] = useState("log");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="log">{t("collectionPanel.addCollection")}</TabsTrigger>
          <TabsTrigger value="client">{t("crmPanel.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="mt-4">
          <ClientCollectionFlow onBack={() => setActiveTab("log")} />
        </TabsContent>

        <TabsContent value="log" className="mt-4 space-y-6">
      {/* Impact summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("common.today")}</p>
            <p className="text-2xl font-display font-bold text-foreground">{todayTotal.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">CO₂ Avoided</p>
            </div>
            <p className="text-2xl font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Water Saved</p>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{impact.waterSaved.toFixed(0)} L</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Landfill Saved</p>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{impact.landfillReduced.toFixed(2)} m³</p>
          </CardContent>
        </Card>
      </div>

      {/* Material breakdown impact */}
      {impact.materialBreakdown.length > 0 && (
        <Card className="shadow-soft bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">{t("analyticsPanel.title")}</p>
            <div className="space-y-2">
              {impact.materialBreakdown.slice(0, 5).map(m => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium">{m.kg.toFixed(1)} kg → <span className="text-primary">{m.co2.toFixed(1)} kg CO₂ avoided</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t("collectionPanel.addCollection")}
        </Button>
      )}

      {/* Add form */}
      {showForm && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">{t("collectionPanel.addCollection")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={materialTypeId} onValueChange={setMaterialTypeId}>
              <SelectTrigger><SelectValue placeholder="Select material type" /></SelectTrigger>
              <SelectContent>
                {materialTypes?.map(mt => (
                  <SelectItem key={mt.id} value={mt.id}>{mt.name} (KES {mt.price_per_unit}/{mt.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Quantity (kg)" value={quantity} onChange={e => setQuantity(e.target.value)} min="0.1" step="0.1" />
            <Input placeholder="Location (optional)" value={locationName} onChange={e => setLocationName(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => addCollection.mutate()} disabled={!materialTypeId || !quantity || addCollection.isPending}>
                 {addCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
               </Button>
               <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">{t("collectionPanel.recentCollections")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !collections?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm">{t("collectionPanel.noCollections")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collections.slice(0, 50).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{(c as any).material_types?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.collected_at), "MMM d, yyyy • h:mm a")}
                      {c.location_name && ` • ${c.location_name}`}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-semibold">{Number(c.quantity).toFixed(1)} {(c as any).material_types?.unit}</p>
                      <Badge variant="outline" className="text-xs">{c.batch_id}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateCollectionReceipt(c)}>
                      <FileText className="w-3 h-3 mr-1" /> Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollectionPanel;
