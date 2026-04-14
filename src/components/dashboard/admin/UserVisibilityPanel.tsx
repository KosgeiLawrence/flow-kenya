import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const UserVisibilityPanel = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-visibility-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
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

  const toggleVisibility = useMutation({
    mutationFn: async ({ userId, visible }: { userId: string; visible: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_globally_visible: visible } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-visibility-profiles"] });
      toast.success("Visibility updated");
    },
    onError: () => toast.error("Failed to update visibility"),
  });

  const getRoleForUser = (userId: string) => {
    const r = roles?.find((r) => r.user_id === userId);
    return r?.role || "unknown";
  };

  const roleLabel = (role: string) => role.replace(/_/g, " ");

  const filtered = profiles?.filter((p) => {
    const role = getRoleForUser(p.user_id);
    const matchesRole = roleFilter === "all" || role === roleFilter;
    const matchesSearch = !search || 
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  }) || [];

  const visibleCount = profiles?.filter((p) => (p as any).is_globally_visible !== false).length || 0;
  const hiddenCount = profiles?.filter((p) => (p as any).is_globally_visible === false).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">{t("adminPanels.userVisibility", "User Visibility Control")}</h2>
        <p className="text-muted-foreground">{t("adminPanels.visibilityDesc", "Control which users are discoverable by other roles on the platform")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{visibleCount}</p>
              <p className="text-xs text-muted-foreground">{t("adminPanels.visibleUsers", "Visible Users")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <EyeOff className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground">{hiddenCount}</p>
              <p className="text-xs text-muted-foreground">{t("adminPanels.hiddenUsers", "Hidden Users")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-secondary-foreground">
              {profiles?.length || 0}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profiles?.length || 0}</p>
              <p className="text-xs text-muted-foreground">{t("adminPanels.totalUsers", "Total Users")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg">{t("adminPanels.manageVisibility", "Manage User Visibility")}</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.searchUsers", "Search users...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-full sm:w-48"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allRoles", "All Roles")}</SelectItem>
                <SelectItem value="waste_picker">{t("roles.wastePicker", "Waste Pickers")}</SelectItem>
                <SelectItem value="aggregator">{t("roles.aggregator", "Aggregators")}</SelectItem>
                <SelectItem value="recycler">{t("roles.recycler", "Recyclers")}</SelectItem>
                <SelectItem value="ngo">{t("roles.ngo", "NGOs")}</SelectItem>
                <SelectItem value="corporate">{t("roles.corporate", "Corporates")}</SelectItem>
                <SelectItem value="county_government">{t("roles.countyGovernment", "County Gov")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loadingUsers", "Loading users...")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t("common.noUsersFound", "No users found")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name", "Name")}</TableHead>
                  <TableHead>{t("common.email", "Email")}</TableHead>
                  <TableHead>{t("common.role", "Role")}</TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  <TableHead>{t("common.visible", "Visible")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const isVisible = (p as any).is_globally_visible !== false;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {roleLabel(getRoleForUser(p.user_id))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          p.approval_status === "approved"
                            ? "bg-primary/20 text-primary"
                            : p.approval_status === "rejected"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-secondary/20 text-secondary"
                        }>
                          {p.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isVisible}
                            onCheckedChange={(checked) =>
                              toggleVisibility.mutate({ userId: p.user_id, visible: checked })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {isVisible ? "Visible" : "Hidden"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserVisibilityPanel;
