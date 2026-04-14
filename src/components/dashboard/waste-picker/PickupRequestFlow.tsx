import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getDisplayName } from "@/lib/displayUtils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, ArrowLeft, FileText, Truck, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import {
  PDF_COLORS, addCleanHeader, addDocMeta, drawTableHeader,
  drawTableRow, drawTotalLine, finalizeCleanPdf,
} from "@/lib/pdfBranding";

interface Props {
  onBack: () => void;
}

const PickupRequestFlow = ({ onBack }: Props) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [targetRole, setTargetRole] = useState<"aggregator" | "recycler">("aggregator");
  const [targetUserId, setTargetUserId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [locationName, setLocationName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch aggregators & recyclers
  const { data: targets } = useQuery({
    queryKey: ["pickup_targets", targetRole],
    queryFn: async () => {
      const { data: roleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", targetRole);
      if (!roleUsers?.length) return [];
      const userIds = roleUsers.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_number, email, county, area_of_operation, organization_id, organizations(name)")
        .in("user_id", userIds);
      return profiles || [];
    },
    enabled: !!user?.id,
  });

  // Fetch own requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["pickup_requests_picker", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("waste_picker_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime updates
  useQuery({
    queryKey: ["pickup_requests_realtime", user?.id],
    queryFn: () => {
      const channel = supabase
        .channel("pickup-requests-picker")
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "pickup_requests",
          filter: `waste_picker_id=eq.${user!.id}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ["pickup_requests_picker"] });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    },
    enabled: !!user?.id,
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantityKg);
      const price = proposedPrice ? parseFloat(proposedPrice) : null;
      const { error } = await supabase.from("pickup_requests").insert({
        waste_picker_id: user!.id,
        target_user_id: targetUserId,
        target_role: targetRole,
        material_type: materialType,
        quantity_kg: qty,
        proposed_price_per_kg: price,
        total_amount: price ? qty * price : null,
        location_name: locationName || null,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup_requests_picker"] });
      toast.success("Pickup request sent!");
      setTargetUserId(""); setMaterialType(""); setQuantityKg("");
      setProposedPrice(""); setLocationName(""); setScheduledDate("");
      setNotes(""); setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getTargetName = (targetId: string) => {
    const t = targets?.find(t => t.user_id === targetId);
    return getDisplayName(t, "Unknown");
  };

  const statusIcon = (status: string) => {
    if (status === "accepted") return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />;
    if (status === "declined") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-gold" />;
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "accepted") return "default";
    if (status === "declined") return "destructive";
    return "secondary";
  };

  const generateDocument = (type: "quotation" | "invoice" | "receipt", item: any) => {
    const doc = new jsPDF();
    const title = type === "quotation" ? "Quotation" : type === "invoice" ? "Invoice" : "Receipt";
    let y = addCleanHeader(doc, title, `Ref: ${type.toUpperCase().slice(0, 3)}-${item.id.slice(0, 8).toUpperCase()}`);

    y = addDocMeta(doc, [
      { label: "From", value: profile?.full_name || "Waste Picker" },
      { label: "Phone", value: profile?.phone_number || "N/A" },
      { label: "Email", value: profile?.email || "N/A" },
    ], y);

    y = addDocMeta(doc, [
      { label: "To", value: getTargetName(item.target_user_id) },
      { label: "Role", value: item.target_role === "aggregator" ? "Aggregator" : "Recycler" },
    ], y);

    y += 4;
    y = addDocMeta(doc, [
      { label: "Date", value: format(new Date(item.created_at), "MMM d, yyyy") },
      { label: "Status", value: item.status.charAt(0).toUpperCase() + item.status.slice(1) },
      ...(item.location_name ? [{ label: "Location", value: item.location_name }] : []),
    ], y);

    const cols = [
      { label: "Material", x: 17 },
      { label: "Qty (kg)", x: 80 },
      { label: "Price/kg", x: 110 },
      { label: "Total (KES)", x: 150 },
    ];
    y = drawTableHeader(doc, cols, y, 178);
    drawTableRow(doc, y, 0, 178);
    doc.setFontSize(8);
    doc.text(item.material_type, 17, y);
    doc.text(String(item.quantity_kg), 80, y);
    doc.text(item.proposed_price_per_kg ? `KES ${Number(item.proposed_price_per_kg).toLocaleString()}` : "TBD", 110, y);
    doc.text(item.total_amount ? `KES ${Number(item.total_amount).toLocaleString()}` : "TBD", 150, y);
    y += 10;

    if (item.total_amount) {
      y = drawTotalLine(doc, `Total: KES ${Number(item.total_amount).toLocaleString()}`, y);
    }

    finalizeCleanPdf(doc);
    doc.save(`${title}-${item.id.slice(0, 8)}.pdf`);
    toast.success(`${title} downloaded`);
  };

  const canSubmit = targetUserId && materialType && quantityKg;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ArrowLeft className="w-4 h-4" /> {t("common.back")}
      </Button>

      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground">{t("requestedPickups.title", "Request Pickup (Inventory Sale)")}</p>
          <p className="text-xs text-muted-foreground">{t("requestedPickups.pickupDescription", "Select up to 5 aggregators or recyclers to request pickup of your collected materials. They can accept or decline.")}</p>
        </CardContent>
      </Card>

      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t("requestedPickups.newRequest")}
        </Button>
      )}

      {showForm && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">{t("requestedPickups.sendRequest")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={targetRole} onValueChange={(v: "aggregator" | "recycler") => { setTargetRole(v); setTargetUserId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aggregator">Aggregator</SelectItem>
                  <SelectItem value="recycler">Recycler</SelectItem>
                </SelectContent>
              </Select>

              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger><SelectValue placeholder={`Select ${targetRole}`} /></SelectTrigger>
                <SelectContent>
                  {targets?.slice(0, 5).map(t => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {getDisplayName(t)} {t.county ? `(${t.county})` : ""}
                    </SelectItem>
                  ))}
                  {!targets?.length && <SelectItem value="_none" disabled>No {targetRole}s found</SelectItem>}
                </SelectContent>
              </Select>

              <Input placeholder="Material Type *" value={materialType} onChange={e => setMaterialType(e.target.value)} />
              <Input placeholder="Quantity (kg) *" type="number" value={quantityKg} onChange={e => setQuantityKg(e.target.value)} />
              <Input placeholder="Proposed Price/kg (KES)" type="number" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} />
              <Input placeholder="Location" value={locationName} onChange={e => setLocationName(e.target.value)} />
              <Input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {quantityKg && proposedPrice && (
              <p className="text-sm font-medium text-primary">
                Total: KES {(parseFloat(quantityKg || "0") * parseFloat(proposedPrice || "0")).toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => sendRequest.mutate()} disabled={!canSubmit || sendRequest.isPending} className="gap-2">
                {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Request</>}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">{t("requestedPickups.yourRequests", "Your Requests")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !requests?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pickup requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {statusIcon(r.status)}
                        <p className="text-sm font-medium">{getTargetName(r.target_user_id)}</p>
                        <Badge variant="outline" className="text-[10px] h-5">{r.target_role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.material_type} • {r.quantity_kg} kg
                        {r.total_amount ? ` • KES ${Number(r.total_amount).toLocaleString()}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                        {r.location_name && ` • ${r.location_name}`}
                      </p>
                      {r.response_notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Response: {r.response_notes}</p>
                      )}
                    </div>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateDocument("quotation", r)}>
                      <FileText className="w-3 h-3 mr-1" /> Quotation
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateDocument("invoice", r)}>
                      <FileText className="w-3 h-3 mr-1" /> Invoice
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => generateDocument("receipt", r)}>
                      <FileText className="w-3 h-3 mr-1" /> Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PickupRequestFlow;
