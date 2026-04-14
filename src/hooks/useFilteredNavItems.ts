import { useMemo } from "react";
import { useTeamContext } from "@/hooks/useTeamContext";

/**
 * Filters nav items for team members based on their feature permissions.
 * Also exposes team branding info for the sidebar.
 */
export const useFilteredNavItems = (
  navItems: { id: string; label: string; icon?: any }[]
) => {
  const { isTeamMember, featurePermissions, isLoading, teamDisplayName, teamLogoUrl } = useTeamContext();

  const alwaysVisible = ["settings", "profile-settings", "team", "trash"];

  const filteredNavItems = useMemo(() => {
    if (!isTeamMember) return navItems;
    return navItems.filter(
      (item) =>
        alwaysVisible.includes(item.id) ||
        featurePermissions.includes(item.id)
    );
  }, [isTeamMember, featurePermissions, navItems]);

  return { filteredNavItems, isTeamMember, isLoading, teamDisplayName, teamLogoUrl };
};
