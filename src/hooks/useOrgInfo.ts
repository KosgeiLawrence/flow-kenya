import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OrgInfo {
  orgName: string;
  orgLogoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  physicalAddress: string | null;
  county: string | null;
  subCounty: string | null;
  website: string | null;
  kraPin: string | null;
  companyRegistration: string | null;
}

/**
 * Returns the user's organization info for use in PDF documents.
 * Falls back to personal name if no organization exists.
 */
export const useOrgInfo = (): { orgInfo: OrgInfo | null; isLoading: boolean } => {
  const { profile } = useAuth();

  const { data: org, isLoading } = useQuery({
    queryKey: ["org_info", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, logo_url, description")
        .eq("id", profile!.organization_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  if (!profile) return { orgInfo: null, isLoading: false };

  const orgInfo: OrgInfo = {
    orgName: org?.name || profile.full_name,
    orgLogoUrl: org?.logo_url || null,
    contactEmail: profile.email || null,
    contactPhone: profile.phone_number || null,
    physicalAddress: profile.physical_address || null,
    county: profile.county || null,
    subCounty: profile.sub_county || null,
    website: profile.website || null,
    kraPin: profile.kra_pin || null,
    companyRegistration: profile.company_registration || null,
  };

  return { orgInfo, isLoading };
};
