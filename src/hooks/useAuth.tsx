import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government" | "admin";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  approval_status: ApprovalStatus;
  organization_id: string | null;
  is_independent: boolean;
  national_id: string | null;
  company_registration: string | null;
  avatar_url: string | null;
  kra_pin: string | null;
  physical_address: string | null;
  county: string | null;
  sub_county: string | null;
  website: string | null;
  social_media_links: Record<string, string> | null;
  area_of_operation: string | null;
  waste_categories: string[] | null;
  daily_capacity_kg: number | null;
  monthly_capacity_kg: number | null;
  payment_method: string | null;
  mpesa_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  industry_sector: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Profile | null;
  displayName: string;
  orgLogoUrl: string | null;
  loading: boolean;
  subscribed: boolean | null;
  checkingSubscription: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  profile: null,
  displayName: "",
  orgLogoUrl: null,
  loading: true,
  subscribed: null,
  checkingSubscription: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper: is the user currently on the password-reset page?
const isOnResetPage = () => window.location.pathname === "/reset-password";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (data?.error === "user_not_found" || (error && String(error).includes("user_not_found"))) {
        console.warn("User no longer exists, signing out...");
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setRole(null);
        setProfile(null);
        setSubscribed(null);
        setCheckingSubscription(false);
        return;
      }
      if (!error && data) {
        setSubscribed(data.subscribed || data.free_plan || data.promo || false);
      } else {
        // On edge-function timeout/network error, grant temporary access instead of blocking
        const isTimeout = error && (String(error).includes("timeout") || String(error).includes("Failed to fetch"));
        if (isTimeout && subscribed !== null) {
          console.warn("Subscription check timed out, keeping previous state");
        } else {
          setSubscribed(false);
        }
      }
    } catch {
      // Keep previous subscription state on network errors if we had one
      if (subscribed === null) setSubscribed(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchUserData = async (userId: string, isRetry = false) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
      ]);

      if (roleRes.error && profileRes.error) {
        // On transient network errors, don't sign out — just log and keep existing state
        const isNetworkError =
          String(roleRes.error.message).includes("fetch") ||
          String(profileRes.error.message).includes("fetch") ||
          String(roleRes.error.message).includes("network") ||
          String(profileRes.error.message).includes("network");

        if (isNetworkError || roleRes.error.code === "PGRST301") {
          console.warn("Transient error fetching user data, keeping current state");
          return;
        }

        // Retry once before giving up
        if (!isRetry) {
          console.warn("Profile/role fetch failed, retrying in 2s...");
          await new Promise((r) => setTimeout(r, 2000));
          return fetchUserData(userId, true);
        }

        console.warn("No profile/role found for user after retry, signing out...");
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setRole(null);
        setProfile(null);
        setOrgName(null);
        setOrgLogoUrl(null);
        setSubscribed(null);
        setCheckingSubscription(false);
        return;
      }

      if (roleRes.data) setRole(roleRes.data.role as AppRole);
      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
        if (profileRes.data.organization_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("name, logo_url")
            .eq("id", profileRes.data.organization_id)
            .single();
          if (orgData) {
            setOrgName(orgData.name);
            setOrgLogoUrl(orgData.logo_url);
          }
        } else {
          setOrgName(null);
          setOrgLogoUrl(null);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Don't sign out on catch — transient errors shouldn't destroy the session
    }
  };

  useEffect(() => {
    // 1. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // On the reset-password page, NEVER run profile/subscription fetches.
        // The ResetPassword page manages its own session lifecycle.
        if (isOnResetPage()) {
          setLoading(false);
          return;
        }

        if (newSession?.user) {
          setTimeout(() => {
            fetchUserData(newSession.user.id);
            checkSubscription();
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setSubscribed(null);
          setCheckingSubscription(false);
        }
        setLoading(false);
      }
    );

    // 2. Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (isOnResetPage()) {
        // Don't fetch profile/subscription on reset page
        setCheckingSubscription(false);
        setLoading(false);
        return;
      }

      if (existingSession?.user) {
        fetchUserData(existingSession.user.id);
        checkSubscription();
      } else {
        setCheckingSubscription(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setOrgName(null);
    setOrgLogoUrl(null);
    setSubscribed(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        if (data.organization_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("name, logo_url")
            .eq("id", data.organization_id)
            .single();
          if (orgData) {
            setOrgName(orgData.name);
            setOrgLogoUrl(orgData.logo_url);
          }
        }
      }
    }
  };

  const displayName = orgName || profile?.full_name || "";

  return (
    <AuthContext.Provider value={{ user, session, role, profile, displayName, orgLogoUrl, loading, subscribed, checkingSubscription, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
