/**
 * Returns the display name for a profile, preferring the organization name
 * over the personal name. Use this everywhere user names are shown publicly.
 */
export const getDisplayName = (
  profile: { full_name?: string; organizations?: { name?: string } | null } | null | undefined,
  fallback = "Unknown"
): string => {
  if (!profile) return fallback;
  const orgName = (profile as any)?.organizations?.name;
  return orgName || profile.full_name || fallback;
};

/**
 * Returns initials for avatar display, preferring org name.
 */
export const getDisplayInitial = (
  profile: { full_name?: string; organizations?: { name?: string } | null } | null | undefined,
  fallback = "?"
): string => {
  const name = getDisplayName(profile, "");
  return name?.charAt(0)?.toUpperCase() || fallback;
};
