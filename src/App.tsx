import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useBiometrics } from "@/hooks/useBiometrics";
import Index from "./pages/Index";
import ImpactDashboard from "./pages/ImpactDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthConfirm from "./pages/AuthConfirm";
import Dashboard from "./pages/Dashboard";
import WastePickerDashboard from "./pages/WastePickerDashboard";
import AggregatorDashboard from "./pages/AggregatorDashboard";
import RecyclerDashboard from "./pages/RecyclerDashboard";
import NGODashboard from "./pages/NGODashboard";
import CorporateDashboard from "./pages/CorporateDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CountyGovernmentDashboard from "./pages/CountyGovernmentDashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import PublicReport from "./pages/PublicReport";
import CleanupRegister from "./pages/CleanupRegister";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import BiometricLockScreen from "./components/auth/BiometricLockScreen";
import BiometricSetupPrompt from "./components/auth/BiometricSetupPrompt";
import SplashScreen from "./components/SplashScreen";

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BiometricGate>
              <PWAInstallPrompt />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BiometricGate>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
