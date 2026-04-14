import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, Users, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const UserVerificationPanel = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ approval_status: status as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const getRoleForUser = (userId: string) => {
    const r = roles?.find((r) => r.user_id === userId);
    return r?.role || "unknown";
  };

  const filtered = profiles?.filter((p) => statusFilter === "all" || p.approval_status === statusFilter) || [];
  const counts = {
    total: profiles?.length || 0,
    pending: profiles?.filter((p) => p.approval_status === "pending").length || 0,
    approved: profiles?.filter((p) => p.approval_status === "approved").length || 0,
    rejected: profiles?.filter((p) => p.approval_status === "rejected").length || 0,
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: "bg-secondary/20 text-secondary", approved: "bg-primary/20 text-primary", rejected: "bg-destructive/20 text-destructive" };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">User Verification & Role Management</h2>
        <p className="text-muted-foreground">Review, approve or reject user registrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: counts.total, icon: Users, color: "text-foreground" },
          { label: "Pending", value: counts.pending, icon: Clock, color: "text-secondary" },
          { label: "Approved", value: counts.approved, icon: UserCheck, color: "text-primary" },
          { label: "Rejected", value: counts.rejected, icon: UserX, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">All Users</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.phone_number || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{getRoleForUser(p.user_id).replace("_", " ")}</Badge></TableCell>
                    <TableCell>{statusBadge(p.approval_status)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.approval_status !== "approved" && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "approved" })} className="text-primary h-7 px-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {p.approval_status !== "rejected" && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "rejected" })} className="text-destructive h-7 px-2">
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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

export default UserVerificationPanel;
