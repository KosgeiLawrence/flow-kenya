import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import RoleSelector from "@/components/auth/RoleSelector";
import PricingPlans, { isPromoValidForRole } from "@/components/auth/PricingPlans";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government";

const orgTypes = [
  { value: "cbo", label: "Community-Based Organization (CBO)" },
  { value: "cooperative", label: "Cooperative" },
  { value: "private_company", label: "Private Company" },
  { value: "ngo", label: "NGO" },
  { value: "corporate", label: "Corporate" },
  { value: "county_government", label: "County Government" },
];

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Role
  const [role, setRole] = useState<AppRole | null>(null);

  // Step 2: Plan
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly" | "one_time">("monthly");
  const [promoCode, setPromoCode] = useState("");
  const promoValid = isPromoValidForRole(promoCode, role);

  // Auto-fill coupon code from invite link
  useEffect(() => {
    const coupon = searchParams.get("coupon");
    if (coupon) {
      setPromoCode(coupon.toUpperCase());
    }
  }, [searchParams]);

  // Step 3: Personal info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [companyReg, setCompanyReg] = useState("");

  // Step 4: Organization
  const [isIndependent, setIsIndependent] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [orgDescription, setOrgDescription] = useState("");

  const totalSteps = 4;

  // Reset plan when role changes
  const handleRoleSelect = (r: AppRole) => {
    setRole(r);
    setSelectedPlan(null);
  };

  const canProceedStep1 = role !== null;
  const canProceedStep2 = selectedPlan !== null;
  const canProceedStep3 = fullName.trim() && email.trim() && password.length >= 8;
  const canProceedStep4 = role === "waste_picker" ? (isIndependent || orgName.trim()) : orgName.trim();

  const handleSubmit = async () => {
    if (!role || !selectedPlan) return;
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            full_name: fullName,
            phone_number: phone || null,
            national_id: nationalId || null,
            company_registration: companyReg || null,
            is_independent: isIndependent,
            role,
            org_name: isIndependent ? null : orgName || null,
            org_type: isIndependent ? null : orgType || "private_company",
            org_description: isIndependent ? null : orgDescription || null,
            selected_plan: selectedPlan,
            billing_period: billingPeriod,
            promo_code: promoCode || null,
          },
        },
      });

      if (authError) throw authError;

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account before signing in.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-hero items-center justify-center p-12">
        <div className="text-primary-foreground max-w-md">
          <h1 className="text-4xl font-display font-bold mb-4">Join Duara Flow</h1>
          <p className="text-lg opacity-90 font-body">
            Kenya's digital infrastructure for circular economy traceability. Connect with the waste value chain ecosystem.
          </p>
          <div className="mt-8 space-y-3 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span>Real-time material tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span>M-Pesa integrated payments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span>Impact analytics & reporting</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="Back to home"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Select Your Role</h2>
                <p className="text-muted-foreground mb-6">Choose the role that best describes your position in the waste value chain.</p>
                <RoleSelector selected={role} onSelect={handleRoleSelect} />
                <div className="flex justify-end mt-6">
                  <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Pricing Plan */}
            {step === 2 && role && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Choose Your Plan</h2>
                <p className="text-muted-foreground mb-6">Select the plan that fits your needs. You can upgrade anytime.</p>
                <PricingPlans
                  role={role}
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  billingPeriod={billingPeriod}
                  onBillingPeriodChange={setBillingPeriod}
                  promoCode={promoCode}
                  onPromoCodeChange={setPromoCode}
                  promoValid={promoValid}
                />
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Personal Info */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Personal Information</h2>
                <p className="text-muted-foreground mb-6">Provide your details to create your account.</p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && password.length < 8 && (
                      <p className="text-xs text-destructive mt-1">Password must be at least 8 characters</p>
                    )}
                  </div>
                  {(role === "waste_picker" || role === "aggregator") && (
                    <div>
                      <Label htmlFor="nationalId">National ID Number</Label>
                      <Input id="nationalId" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="Enter your National ID" />
                    </div>
                  )}
                  {(role === "corporate" || role === "recycler" || role === "ngo") && (
                    <div>
                      <Label htmlFor="companyReg">Company Registration Number</Label>
                      <Input id="companyReg" value={companyReg} onChange={(e) => setCompanyReg(e.target.value)} placeholder="Enter registration number" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!canProceedStep3} className="gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Organization */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Organization Information</h2>
                <p className="text-muted-foreground mb-6">Link your account to an organization or register as independent.</p>

                {role === "waste_picker" && (
                  <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                    <Switch checked={isIndependent} onCheckedChange={setIsIndependent} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Register as Independent</p>
                      <p className="text-xs text-muted-foreground">I operate without an organization</p>
                    </div>
                  </div>
                )}

                {!isIndependent && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Enter organization name" />
                    </div>
                    <div>
                      <Label htmlFor="orgType">Organization Type</Label>
                      <Select value={orgType} onValueChange={setOrgType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="orgDesc">Organization Description</Label>
                      <Textarea
                        id="orgDesc"
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        placeholder="Brief description of your organization"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading || !canProceedStep4} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Account
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
