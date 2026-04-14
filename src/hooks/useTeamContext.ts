import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TeamContext {
  /** Whether the current user is a team member (invited by someone) */
  isTeamMember: boolean;
  /** The user_id of the person who invited this user (null if not a team member) */
  invitedBy: string | null;
  /** Feature permissions granted to this team member */
  featurePermissions: string[];
  /** Whether the current user is a team owner (has invited others) */
  isTeamOwner: boolean;
  /** Display name to use (team leader's org/name for team members) */
  teamDisplayName: string | null;
  /** Logo URL to use (team leader's org logo for team members) */
  teamLogoUrl: string | null;
  /** Loading state */
  isLoading: boolean;
}

export const useTeamContext = (): TeamContext => {
  const { user } = useAuth();

  // Check if user is a team member (was invited by someone)
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["team_membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("invited_by, feature_permissions, is_active, organization_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user has invited others (is a team owner)
  const { data: ownedMembers, isLoading: ownedLoading } = useQuery({
    queryKey: ["team_owned", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id")
        .eq("invited_by", user!.id)
        .eq("is_active", true)
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isTeamMember = !!membership;
  const invitedBy = membership?.invited_by ?? null;

  // Fetch team leader's profile + org info so the team member's dashboard mirrors the leader's
  const { data: leaderInfo, isLoading: leaderLoading } = useQuery({
    queryKey: ["team_leader_info", invitedBy],
    queryFn: async () => {
      const { data: leaderProfile } = await supabase
        .from("profiles")
        .select("full_name, organization_id, avatar_url")
        .eq("user_id", invitedBy!)
        .single();
      if (!leaderProfile) return null;

      let orgName: string | null = null;
      let orgLogoUrl: string | null = null;
      if (leaderProfile.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", leaderProfile.organization_id)
          .single();
        if (org) {
          orgName = org.name;
          orgLogoUrl = org.logo_url;
        }
      }
      return {
        displayName: orgName || leaderProfile.full_name,
        logoUrl: orgLogoUrl || leaderProfile.avatar_url,
      };
    },
    enabled: !!invitedBy,
  });

  const isTeamOwner = (ownedMembers?.length ?? 0) > 0;
  const featurePermissions = isTeamMember
    ? (membership?.feature_permissions as string[] || [])
    : [];

  return {
    isTeamMember,
    invitedBy,
    featurePermissions,
    isTeamOwner,
    teamDisplayName: leaderInfo?.displayName ?? null,
    teamLogoUrl: leaderInfo?.logoUrl ?? null,
    isLoading: membershipLoading || ownedLoading || leaderLoading,
  };
};
