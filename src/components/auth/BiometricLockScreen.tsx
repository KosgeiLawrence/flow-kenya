import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BiometricLockScreenProps {
  onAuthenticate: () => Promise<boolean>;
  onUsePassword: () => void;
  onSignOut: () => void;
  isAuthenticating: boolean;
  userName?: string;
}

const BiometricLockScreen = ({
  onAuthenticate,
  onUsePassword,
  onSignOut,
  isAuthenticating,
  userName,
}: BiometricLockScreenProps) => {
  const handleAuth = async () => {
    await onAuthenticate();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
      >
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center">
          {/* Icon */}
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Fingerprint className="h-5 w-5" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use your fingerprint or face to unlock
            </p>
          </div>

          {/* Unlock button */}
          <Button
            onClick={handleAuth}
            disabled={isAuthenticating}
            size="lg"
            className="w-full gap-2"
          >
            <Fingerprint className="h-5 w-5" />
            {isAuthenticating ? "Verifying..." : "Unlock with Biometrics"}
          </Button>

          {/* Alternatives */}
          <div className="flex flex-col gap-2 w-full">
            <Button variant="outline" onClick={onUsePassword} className="w-full text-sm">
              Use email & password instead
            </Button>
            <Button variant="ghost" onClick={onSignOut} className="w-full text-sm text-muted-foreground gap-1">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BiometricLockScreen;
