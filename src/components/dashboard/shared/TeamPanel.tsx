import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamContext } from "@/hooks/useTeamContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Users, Mail, Send, Clock, CheckCircle2, XCircle, UserMinus, Loader2,
  Shield, RefreshCw, Crown, Settings2, Trash2, UserPlus, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeamPanelProps {
  role: string;
  navItems: { id: string; label: string }[];
}

type TeamPermission = "can_invite" | "can_remove" | "can_assign_roles";

const TEAM_PERMISSION_LABELS: Record<TeamPermission, { label: string; icon: any; description: string }> = {
  can_invite: { label: "Can Invite Members", icon: UserPlus, description: "Allow this member to invite new team members" },
  can_remove: { label: "Can Remove Members", icon: Trash2, description: "Allow this member to deactivate other team members" },
  can_assign_roles: { label: "Can Assign Roles", icon: KeyRound, description: "Allow this member to edit permissions of other members" },
};

const TeamPanel = ({ role, navItems }: TeamPanelProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isTeamMember, invitedBy, isTeamOwner } = useTeamContext();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedTeamPerms, setSelectedTeamPerms] = useState<TeamPermission[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editFeaturePerms, setEditFeaturePerms] = useState<string[]>([]);
  const [editTeamPerms, setEditTeamPerms] = useState<TeamPermission[]>([]);

  const teamLeaderId = isTeamMember ? invitedBy : user?.id;

  // Get current user's team_permissions (for delegated access)
  const { data: myMembership } = useQuery({
    queryKey: ["my_team_membership", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("team_permissions, feature_permissions")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isTeamMember,
  });

  const isOwner = !isTeamMember; // team owner = not a team member themselves
  const myTeamPerms = isOwner ? ["can_invite", "can_remove", "can_assign_roles"] as TeamPermission[] : ((myMembership?.team_permissions as TeamPermission[]) || []);
  const canInvite = isOwner || myTeamPerms.includes("can_invite");
  const canRemove = isOwner || myTeamPerms.includes("can_remove");
  const canAssignRoles = isOwner || myTeamPerms.includes("can_assign_roles");

  // Fetch all team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ["team_members_all", teamLeaderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("invited_by", teamLeaderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = data.map((m: any) => m.user_id);
      const allIds = teamLeaderId ? [...userIds, teamLeaderId] : userIds;
      if (allIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, phone_number")
        .in("user_id", allIds);
      return data.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id),
      }));
    },
    enabled: !!teamLeaderId,
  });

  // Fetch team leader profile
  const { data: leaderProfile } = useQuery({
    queryKey: ["team_leader_profile", teamLeaderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, phone_number")
        .eq("user_id", teamLeaderId!)
        .single();
      return data;
    },
    enabled: !!teamLeaderId && isTeamMember,
  });

  // Fetch sent invitations
  const { data: invitations = [], isLoading: invLoading } = useQuery({
    queryKey: ["team_invitations", teamLeaderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("invited_by", teamLeaderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teamLeaderId,
  });

  const featurePanels = navItems.filter(
    (n) => !["settings", "profile-settings", "trash", "team"].includes(n.id)
  );

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-team-invite", {
        body: { email: email.trim(), feature_permissions: selectedPermissions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      // If team_permissions were selected, update the invitation record or the member
      if (selectedTeamPerms.length > 0 && data?.member_id) {
        await supabase
          .from("team_members")
          .update({ team_permissions: selectedTeamPerms } as any)
          .eq("id", data.member_id);
      }
      toast.success("Team invitation sent!", { description: `Invitation email sent to ${email}` });
      setEmail("");
      setSelectedPermissions([]);
      setSelectedTeamPerms([]);
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["team_invitations"] });
      queryClient.invalidateQueries({ queryKey: ["team_members_all"] });
    },
    onError: (err: any) => {
      toast.error("Failed to send invite", { description: err.message });
    },
  });

  const togglePermission = (id: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(featurePanels.map((p) => p.id));
  };

  const toggleTeamPerm = (perm: TeamPermission) => {
    setSelectedTeamPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const deactivateMember = async (memberId: string) => {
    const { error } = await supabase
      .from("team_members")
      .update({ is_active: false } as any)
      .eq("id", memberId);
    if (error) {
      toast.error("Failed to deactivate member");
    } else {
      toast.success("Team member removed");
      queryClient.invalidateQueries({ queryKey: ["team_members_all"] });
    }
  };

  const openEditMember = (member: any) => {
    setEditingMember(member);
    setEditFeaturePerms((member.feature_permissions as string[]) || []);
    setEditTeamPerms((member.team_permissions as TeamPermission[]) || []);
  };

  const saveEditMember = async () => {
    if (!editingMember) return;
    const { error } = await supabase
      .from("team_members")
      .update({
        feature_permissions: editFeaturePerms,
        team_permissions: editTeamPerms,
      } as any)
      .eq("id", editingMember.id);
    if (error) {
      toast.error("Failed to update permissions");
    } else {
      toast.success("Permissions updated");
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ["team_members_all"] });
    }
  };

  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleResendInvite = async (inviteId: string, inviteToken: string, inviteEmail: string) => {
    setResendingId(inviteId);
    try {
      const { data, error } = await supabase.functions.invoke("send-team-invite", {
        body: { resend_token: inviteToken },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Invitation resent!", { description: `Resent to ${inviteEmail}` });
    } catch (err: any) {
      toast.error("Failed to resend", { description: err.message });
    }
    setResendingId(null);
  };

  const pendingInvites = invitations.filter((i: any) => i.status === "pending");
  const activeMembers = teamMembers.filter((m: any) => m.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("teamPanel.title")}</h2>
          <Badge variant="secondary">
            {activeMembers.length + (isTeamMember || isTeamOwner ? 1 : 0)} members
          </Badge>
        </div>
        {canInvite && (
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
            <Mail className="w-4 h-4" /> {t("teamPanel.inviteTeamMember")}
          </Button>
        )}
      </div>

      {/* Team Leader (show for team members) */}
      {isTeamMember && leaderProfile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" /> {t("teamPanel.teamLeader")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3 min-w-0">
                {leaderProfile.avatar_url ? (
                  <img src={leaderProfile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {leaderProfile.full_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{leaderProfile.full_name || "Team Leader"}</p>
                  <p className="text-xs text-muted-foreground truncate">{leaderProfile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                 <Badge variant="outline"><Crown className="w-3 h-3 mr-1" /> {t("teamPanel.owner")}</Badge>
                 <Badge variant="secondary" className="text-[10px]">{t("teamPanel.fullAccess")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Team Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> {t("teamPanel.activeTeamMembers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : activeMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("teamPanel.noMembers")} {canInvite ? t("teamPanel.inviteToStart") : ""}</p>
          ) : (
            <div className="space-y-3">
              {activeMembers.map((member: any) => {
                const isSelf = member.user_id === user?.id;
                const memberTeamPerms = (member.team_permissions as TeamPermission[]) || [];
                const memberFeaturePerms = (member.feature_permissions as string[]) || [];
                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {member.profile?.full_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || "Unknown"}
                          {isSelf && <span className="text-xs text-muted-foreground ml-1">{t("teamPanel.you")}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.profile?.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            <Shield className="w-3 h-3 mr-1" />
                            {memberFeaturePerms.length} panels
                          </Badge>
                          {memberTeamPerms.includes("can_invite") && (
                            <Badge variant="secondary" className="text-[10px]"><UserPlus className="w-3 h-3 mr-0.5" /> Invite</Badge>
                          )}
                          {memberTeamPerms.includes("can_remove") && (
                            <Badge variant="secondary" className="text-[10px]"><Trash2 className="w-3 h-3 mr-0.5" /> Remove</Badge>
                          )}
                          {memberTeamPerms.includes("can_assign_roles") && (
                            <Badge variant="secondary" className="text-[10px]"><KeyRound className="w-3 h-3 mr-0.5" /> Roles</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canAssignRoles && !isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => openEditMember(member)}
                          title="Edit permissions"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canRemove && !isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-8"
                          onClick={() => {
                            if (confirm("Remove this team member? They will lose access.")) {
                              deactivateMember(member.id);
                            }
                          }}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Pending Invitations ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 p-2 rounded border text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{inv.email}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Sent {format(new Date(inv.created_at), "dd MMM, yyyy")}
                    </span>
                    {canInvite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={resendingId === inv.id}
                        onClick={() => handleResendInvite(inv.id, inv.invite_token, inv.email)}
                      >
                        {resendingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Resend
                      </Button>
                    )}
                    <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      {canInvite && (
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" /> Invite Team Member
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  They will receive the same role as you ({role.replace(/_/g, " ")}) and join your organization.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Dashboard Access</label>
                  <Button variant="ghost" size="sm" onClick={selectAllPermissions} className="text-xs h-7">
                    Select All
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {featurePanels.map((panel) => (
                    <label key={panel.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1">
                      <Checkbox
                        checked={selectedPermissions.includes(panel.id)}
                        onCheckedChange={() => togglePermission(panel.id)}
                      />
                      <span className="text-sm">{panel.label}</span>
                    </label>
                  ))}
                </div>
                {selectedPermissions.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Select at least one feature</p>
                )}
              </div>

              {/* Admin Permissions for new invite */}
              {isOwner && (
                <div>
                  <label className="text-sm font-medium">Admin Permissions (optional)</label>
                  <p className="text-xs text-muted-foreground mb-2">Grant this member team management abilities</p>
                  <div className="space-y-2 border rounded-md p-3">
                    {(Object.keys(TEAM_PERMISSION_LABELS) as TeamPermission[]).map((perm) => {
                      const info = TEAM_PERMISSION_LABELS[perm];
                      const Icon = info.icon;
                      return (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1">
                          <Checkbox
                            checked={selectedTeamPerms.includes(perm)}
                            onCheckedChange={() => toggleTeamPerm(perm)}
                          />
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <span className="text-sm">{info.label}</span>
                            <p className="text-[10px] text-muted-foreground">{info.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={() => sendInviteMutation.mutate()}
                disabled={!email.trim() || selectedPermissions.length === 0 || sendInviteMutation.isPending}
                className="w-full gap-2"
              >
                {sendInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Member Permissions Dialog */}
      {editingMember && (
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" /> Edit Permissions
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                {editingMember.profile?.avatar_url ? (
                  <img src={editingMember.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {editingMember.profile?.full_name?.charAt(0) || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{editingMember.profile?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{editingMember.profile?.email}</p>
                </div>
              </div>

              {/* Dashboard panels */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Dashboard Access</label>
                  <Button variant="ghost" size="sm" onClick={() => setEditFeaturePerms(featurePanels.map((p) => p.id))} className="text-xs h-7">
                    Select All
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {featurePanels.map((panel) => (
                    <label key={panel.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1">
                      <Checkbox
                        checked={editFeaturePerms.includes(panel.id)}
                        onCheckedChange={() =>
                          setEditFeaturePerms((prev) =>
                            prev.includes(panel.id) ? prev.filter((p) => p !== panel.id) : [...prev, panel.id]
                          )
                        }
                      />
                      <span className="text-sm">{panel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Admin permissions - only owner can delegate */}
              {isOwner && (
                <div>
                  <label className="text-sm font-medium">Admin Permissions</label>
                  <p className="text-xs text-muted-foreground mb-2">Control what this member can manage</p>
                  <div className="space-y-3 border rounded-md p-3">
                    {(Object.keys(TEAM_PERMISSION_LABELS) as TeamPermission[]).map((perm) => {
                      const info = TEAM_PERMISSION_LABELS[perm];
                      const Icon = info.icon;
                      return (
                        <div key={perm} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{info.label}</p>
                              <p className="text-[10px] text-muted-foreground">{info.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={editTeamPerms.includes(perm)}
                            onCheckedChange={() =>
                              setEditTeamPerms((prev) =>
                                prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button onClick={saveEditMember} className="w-full gap-2">
                <CheckCircle2 className="w-4 h-4" /> Save Permissions
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TeamPanel;
