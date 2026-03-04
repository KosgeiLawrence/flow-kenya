import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeDerivedMetrics, type PlatformStats } from "@/lib/impactFactors";

/**
 * Centralized hook for platform-wide stats.
 * Calls the `get_platform_stats` database function (SECURITY DEFINER)
 * so it works for both anonymous (landing page) and authenticated users.
 *
 * All dashboards, the landing page, and the impact dashboard should use this
 * to guarantee consistent numbers from a single source of truth.
 */
export function usePlatformStats() {
  const query = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      return data as unknown as PlatformStats;
    },
    staleTime: 30_000, // refresh every 30s
    refetchInterval: 60_000, // auto-refresh every 60s for near-real-time
  });

  const derived = query.data ? computeDerivedMetrics(query.data) : null;

  return {
    ...query,
    stats: query.data ?? null,
    derived,
  };
}
