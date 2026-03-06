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
  loading: boolean;
  subscribed: boolean | null;
  checkingSubscription: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  subscribed: null,
  checkingSubscription: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      // If the user no longer exists (deleted), sign them out
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
        setSubscribed(false);
      }
    } catch {
      setSubscribed(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
      ]);

      // If both return no rows, user was likely deleted — sign out
      if (roleRes.error && profileRes.error) {
        console.warn("No profile/role found for user, signing out...");
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setRole(null);
        setProfile(null);
        setSubscribed(null);
        setCheckingSubscription(false);
        return;
      }

      if (roleRes.data) setRole(roleRes.data.role as AppRole);
      if (profileRes.data) setProfile(profileRes.data as Profile);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip redirect/processing when on the password reset page
        const isPasswordResetPage = window.location.pathname === '/reset-password';
        if (isPasswordResetPage && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
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
    setSubscribed(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, subscribed, checkingSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
