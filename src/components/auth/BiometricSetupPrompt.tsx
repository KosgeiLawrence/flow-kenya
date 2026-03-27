import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BiometricSetupPromptProps {
  onRegister: () => Promise<boolean>;
  onDismiss: () => void;
  isRegistering: boolean;
}

const BiometricSetupPrompt = ({
  onRegister,
  onDismiss,
  isRegistering,
}: BiometricSetupPromptProps) => {
  const { toast } = useToast();
  const [show, setShow] = useState(true);

  const handleRegister = async () => {
    const success = await onRegister();
    if (success) {
      toast({
        title: "Biometric login enabled!",
        description: "Next time you open the app, just use your fingerprint or face to unlock.",
      });
      setShow(false);
    } else {
      toast({
        title: "Setup failed",
        description: "Could not set up biometric login. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("biometric-setup-dismissed", "true");
    setShow(false);
    onDismiss();
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-[150] md:left-auto md:right-6 md:bottom-6 md:w-[420px]"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5 pt-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Fingerprint className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground leading-tight flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Enable Biometric Login
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">
                  Unlock the app with your fingerprint or face — no need to type your password each time.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleRegister}
                disabled={isRegistering}
                size="sm"
                className="flex-1 gap-2"
              >
                <Fingerprint className="h-4 w-4" />
                {isRegistering ? "Setting up..." : "Enable Now"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
                Not now
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BiometricSetupPrompt;
