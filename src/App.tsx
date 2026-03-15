import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
