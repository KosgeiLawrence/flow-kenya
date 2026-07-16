import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Never show the browser install prompt inside a native Capacitor shell.
    const isNative =
      window.location.protocol === "capacitor:" ||
      // @ts-expect-error – Capacitor global
      typeof window.Capacitor !== "undefined";
    if (isNative) {
      setDismissed(true);
      return;
    }

    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so users engage first
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Hide if already installed
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (dismissed || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:bottom-6 md:w-[400px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Decorative gradient bar */}
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
                {/* Icon */}
                <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Smartphone className="h-7 w-7 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    Add Duara Flow to Home Screen
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">
                    Access the platform instantly — just like a native app. Works offline too!
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="hero"
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-muted-foreground"
                >
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
