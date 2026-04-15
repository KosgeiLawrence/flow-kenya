import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegisterSW } from "virtual:pwa-register/react";

const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 z-[110] md:left-auto md:right-6 md:top-6 md:w-[420px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl">
            {/* Decorative gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-accent via-primary to-accent" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-5 pt-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                  <Sparkles className="h-7 w-7 text-accent" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    New Version Available!
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">
                    Duara Flow has been updated with new features and improvements. Refresh to get the latest version.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="hero"
                  size="sm"
                  onClick={handleUpdate}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Update Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-muted-foreground"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAUpdatePrompt;
