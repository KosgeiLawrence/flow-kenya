import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get profile
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("full_name, phone_number, email, county, area_of_operation, avatar_url, organization_id, is_independent, approval_status, national_id, company_registration, created_at, is_globally_visible")
      .eq("user_id", userId)
      .single();

    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    // Get org
    let org = null;
    if (profile.organization_id) {
      const { data } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", profile.organization_id)
        .single();
      org = data;
    }

    // Get impact
    const { data: collections } = await supabase
      .from("collections")
      .select("quantity, material_type_id, material_types(name)")
      .eq("user_id", userId);

    const totalKg = (collections || []).reduce((s: number, c: any) => s + (c.quantity || 0), 0);
    const totalEntries = (collections || []).length;

    const duaraId = `DF-${userId.substring(0, 8).toUpperCase()}`;

    return new Response(JSON.stringify({
      duaraId,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      phone: profile.phone_number,
      email: profile.email,
      county: profile.county,
      areaOfOperation: profile.area_of_operation,
      isIndependent: profile.is_independent,
      isVerified: profile.approval_status === "approved",
      hasNationalId: !!profile.national_id,
      hasBusinessReg: !!profile.company_registration,
      joinedAt: profile.created_at,
      role: roleData?.role || "unknown",
      orgName: org?.name || null,
      orgLogo: org?.logo_url || null,
      totalKg,
      totalEntries,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
