import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useBiometrics } from "@/hooks/useBiometrics";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthConfirm from "./pages/AuthConfirm";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import TargetCrosshair from "./components/TargetCrosshair";

import BiometricLockScreen from "./components/auth/BiometricLockScreen";
import BiometricSetupPrompt from "./components/auth/BiometricSetupPrompt";
import SplashScreen from "./components/SplashScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Route-level code splitting — keep the initial bundle lean for slow
// connections and Android WebView first-paint.
const ImpactDashboard = lazy(() => import("./pages/ImpactDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WastePickerDashboard = lazy(() => import("./pages/WastePickerDashboard"));
const AggregatorDashboard = lazy(() => import("./pages/AggregatorDashboard"));
const RecyclerDashboard = lazy(() => import("./pages/RecyclerDashboard"));
const NGODashboard = lazy(() => import("./pages/NGODashboard"));
const CorporateDashboard = lazy(() => import("./pages/CorporateDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CountyGovernmentDashboard = lazy(() => import("./pages/CountyGovernmentDashboard"));
const PublicReport = lazy(() => import("./pages/PublicReport"));
const CleanupRegister = lazy(() => import("./pages/CleanupRegister"));
const PublicForm = lazy(() => import("./pages/PublicForm"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const PublicCatalogue = lazy(() => import("./pages/PublicCatalogue"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

/** Detect if running as installed PWA (standalone mode) */
const isInstalledPWA = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

/** Biometric layer — wraps all routes inside AuthProvider + BrowserRouter */
const BiometricGate = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, role, signOut } = useAuth();
  const bio = useBiometrics(user?.id);
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);
  useAndroidBackButton();

  const navigateToDashboard = useCallback(() => {
    const path = role ? `/dashboard/${role.replace("_", "-")}` : "/dashboard";
    // Replace history so back button doesn't return to login/landing
    navigate(path, { replace: true });
  }, [role, navigate]);

  // After login, offer biometric setup if supported & not already enabled/dismissed
  useEffect(() => {
    if (!user || !bio.isSupported || bio.isEnabled) {
      setShowSetup(false);
      return;
    }
    const dismissed = localStorage.getItem("biometric-setup-dismissed");
    if (dismissed) {
      setShowSetup(false);
      return;
    }
    // Show after a short delay
    const timer = setTimeout(() => setShowSetup(true), 2000);
    return () => clearTimeout(timer);
  }, [user, bio.isSupported, bio.isEnabled]);

  // If locked, show lock screen
  if (user && bio.isLocked) {
    return (
      <BiometricLockScreen
        onAuthenticate={async () => {
          const success = await bio.authenticate();
          if (success) navigateToDashboard();
          return success;
        }}
        isAuthenticating={bio.isAuthenticating}
        userName={profile?.full_name}
      onUsePassword={() => {
          bio.unlock();
          navigateToDashboard();
        }}
        onSignOut={async () => {
          bio.disable();
          await signOut();
          navigate("/login");
        }}
      />
    );
  }

  return (
    <>
      {children}
      {showSetup && user && (
        <BiometricSetupPrompt
          onRegister={bio.register}
          onDismiss={() => setShowSetup(false)}
          isRegistering={bio.isRegistering}
        />
      )}
    </>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => isInstalledPWA());

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <BiometricGate>
                <PWAInstallPrompt />
                <TargetCrosshair />
                
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/impact" element={<ImpactDashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/payment" element={<Payment />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route
                    path="/dashboard/waste-picker/*"
                    element={
                      <ProtectedRoute allowedRoles={["waste_picker"]}>
                        <WastePickerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/aggregator/*"
                    element={
                      <ProtectedRoute allowedRoles={["aggregator"]}>
                        <AggregatorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/recycler/*"
                    element={
                      <ProtectedRoute allowedRoles={["recycler"]}>
                        <RecyclerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/ngo/*"
                    element={
                      <ProtectedRoute allowedRoles={["ngo"]}>
                        <NGODashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/corporate/*"
                    element={
                      <ProtectedRoute allowedRoles={["corporate"]}>
                        <CorporateDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/*"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/county-government/*"
                    element={
                      <ProtectedRoute allowedRoles={["county_government"]}>
                        <CountyGovernmentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/*"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/report/:id" element={<PublicReport />} />
                  <Route path="/cleanup/:id/register" element={<CleanupRegister />} />
                  <Route path="/form/:token" element={<PublicForm />} />
                  <Route path="/join-team" element={<JoinTeam />} />
                  <Route path="/profile/:userId" element={<PublicProfile />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/catalogue/:slug" element={<PublicCatalogue />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </BiometricGate>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
