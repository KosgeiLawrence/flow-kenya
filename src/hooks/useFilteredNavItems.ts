import { useMemo } from "react";
import { useTeamContext } from "@/hooks/useTeamContext";

/**
 * Filters nav items for team members based on their feature permissions.
 * Team owners and non-team users see all items.
 * Team members only see items they have permission for, plus always-visible items.
 */
export const useFilteredNavItems = (
  navItems: { id: string; label: string; icon?: any }[]
) => {
  const { isTeamMember, featurePermissions, isLoading } = useTeamContext();

  const alwaysVisible = ["settings", "profile-settings", "team", "trash"];

  const filteredNavItems = useMemo(() => {
    if (!isTeamMember) return navItems;
    return navItems.filter(
      (item) =>
        alwaysVisible.includes(item.id) ||
        featurePermissions.includes(item.id)
    );
  }, [isTeamMember, featurePermissions, navItems]);

  return { filteredNavItems, isTeamMember, isLoading };
};
