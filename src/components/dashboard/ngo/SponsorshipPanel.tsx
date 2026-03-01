import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Heart, MapPin, DollarSign, Plus, History, Recycle, Factory } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const FUND_TYPES = [
  { value: "general", label: "General Support" },
  { value: "training", label: "Training" },
  { value: "equipment", label: "Equipment" },
  { value: "incentives", label: "Recovery Incentives" },
];

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu",
  "Machakos", "Kajiado", "Kilifi", "Uasin Gishu", "Nyeri",
];

const ROLE_OPTIONS = [
  { value: "waste_picker", label: "Waste Pickers", icon: Users },
  { value: "aggregator", label: "Aggregators", icon: Recycle },
  { value: "recycler", label: "Recyclers", icon: Factory },
];

const SponsorshipPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedPicker, setSelectedPicker] = useState("");
  const [county, setCounty] = useState("");
  const [community, setCommunity] = useState("");
  const [fundType, setFundType] = useState("general");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedRole, setSelectedRole] = useState("waste_picker");

  // Fetch all participants (pickers, aggregators, recyclers)
  const { data: participants } = useQuery({
    queryKey: ["ngo_all_participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role), organizations(name)")
        .in("user_roles.role", ["waste_picker", "aggregator", "recycler"]);
      if (error) throw error;
      return data;
    },
  });

  const { data: sponsorships } = useQuery({
    queryKey: ["ngo_sponsorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ngo_sponsorships")
        .select("*, profiles!ngo_sponsorships_picker_profile_id_fkey(full_name, gender, date_of_birth, approval_status, user_roles!inner(role))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createSponsorship = useMutation({
    mutationFn: async () => {
      if (!user || !selectedPicker) throw new Error("Select a participant");
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 0) throw new Error("Invalid amount");

      const { error } = await supabase.from("ngo_sponsorships").insert({
        ngo_user_id: user.id,
        picker_profile_id: selectedPicker,
        county: county || null,
        community: community || null,
        fund_type: fundType,
        amount_allocated: amt,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo_sponsorships"] });
      toast.success("Sponsorship created");
      setOpen(false);
      setSelectedPicker(""); setCounty(""); setCommunity(""); setAmount(""); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Filter participants by selected role for the dialog
  const filteredParticipants = participants?.filter(p => {
    const role = (p as any).user_roles?.[0]?.role || (p as any).user_roles?.role;
    return role === selectedRole;
  }) || [];

  const activeSponsors = sponsorships?.filter(s => s.status === "active") || [];
  const totalAllocated = sponsorships?.reduce((s, sp) => s + Number(sp.amount_allocated), 0) || 0;
  const totalDisbursed = sponsorships?.reduce((s, sp) => s + Number(sp.amount_disbursed), 0) || 0;

  // Count by role
  const getRoleForSponsorship = (s: any) => {
    const roles = s.profiles?.user_roles;
    if (Array.isArray(roles)) return roles[0]?.role;
    return roles?.role;
  };

  const pickerCount = sponsorships?.filter(s => getRoleForSponsorship(s) === "waste_picker").length || 0;
  const aggregatorCount = sponsorships?.filter(s => getRoleForSponsorship(s) === "aggregator").length || 0;
  const recyclerCount = sponsorships?.filter(s => getRoleForSponsorship(s) === "recycler").length || 0;

  // Group by county
  const countyMap = new Map<string, number>();
  sponsorships?.forEach(s => {
    const c = s.county || "Unspecified";
    countyMap.set(c, (countyMap.get(c) || 0) + 1);
  });

  // Filter sponsorship history
  const filteredSponsorships = roleFilter === "all"
    ? sponsorships
    : sponsorships?.filter(s => getRoleForSponsorship(s) === roleFilter);

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.label?.replace(/s$/, "") || role;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{participants?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Participants</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Heart className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{activeSponsors.length}</p>
              <p className="text-xs text-muted-foreground">Active Sponsorships</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {totalAllocated.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Allocated / {totalDisbursed.toLocaleString()} Disbursed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <MapPin className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{countyMap.size}</p>
              <p className="text-xs text-muted-foreground">Counties Covered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{pickerCount}</p>
            <p className="text-xs text-muted-foreground">Waste Pickers</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Recycle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{aggregatorCount}</p>
            <p className="text-xs text-muted-foreground">Aggregators</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Factory className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{recyclerCount}</p>
            <p className="text-xs text-muted-foreground">Recyclers</p>
          </CardContent>
        </Card>
      </div>

      {/* Create sponsorship */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Sponsor a Participant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Sponsorship</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Participant Type</Label>
                <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setSelectedPicker(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select {getRoleLabel(selectedRole)}</Label>
                <Select value={selectedPicker} onValueChange={setSelectedPicker}>
                  <SelectTrigger><SelectValue placeholder={`Select a ${getRoleLabel(selectedRole).toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {filteredParticipants.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} {p.is_independent ? "(Ind.)" : (p as any).organizations?.name ? `(${(p as any).organizations.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>County</Label>
                  <Select value={county} onValueChange={setCounty}>
                    <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent>
                      {COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Community</Label>
                  <Input value={community} onChange={e => setCommunity(e.target.value)} placeholder="e.g. Dandora" maxLength={100} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fund Type</Label>
                  <Select value={fundType} onValueChange={setFundType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUND_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (KES)</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" maxLength={500} />
              </div>
              <Button className="w-full" onClick={() => createSponsorship.mutate()} disabled={createSponsorship.isPending || !selectedPicker}>
                {createSponsorship.isPending ? "Creating..." : "Create Sponsorship"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sponsorship history */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" /> Sponsorship History
            </CardTitle>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredSponsorships?.length ? (
            <p className="text-sm text-muted-foreground">No sponsorships yet. Sponsor a participant to get started.</p>
          ) : (
            <div className="divide-y divide-border">
              {filteredSponsorships.map(s => {
                const picker = (s as any).profiles;
                const role = getRoleForSponsorship(s);
                return (
                  <div key={s.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                        {picker?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{picker?.full_name || "Participant"}</p>
                        <p className="text-xs text-muted-foreground">
                          {getRoleLabel(role)} · {s.county || "—"} · {FUND_TYPES.find(f => f.value === s.fund_type)?.label || s.fund_type} · KES {Number(s.amount_allocated).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>
                        {s.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* County breakdown */}
      {countyMap.size > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Impact by County</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from(countyMap.entries()).map(([county, count]) => (
                <div key={county} className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-sm font-medium text-foreground">{county}</p>
                  <p className="text-xs text-muted-foreground">{count} sponsorship{count > 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SponsorshipPanel;
