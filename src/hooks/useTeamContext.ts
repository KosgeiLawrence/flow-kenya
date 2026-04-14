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
  /** All team member records (for both owners and members) */
  teamMembers: any[];
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
        .select("invited_by, feature_permissions, is_active")
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
  const isTeamOwner = (ownedMembers?.length ?? 0) > 0;
  const featurePermissions = isTeamMember
    ? (membership?.feature_permissions as string[] || [])
    : [];

  return {
    isTeamMember,
    invitedBy: membership?.invited_by ?? null,
    featurePermissions,
    isTeamOwner,
    teamMembers: [],
    isLoading: membershipLoading || ownedLoading,
  };
};
