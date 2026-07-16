import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Handle the Android hardware back button when running inside Capacitor.
 *
 * Behavior:
 *  - On the home route: exit the app (Capacitor App plugin) if available,
 *    otherwise no-op.
 *  - Elsewhere: navigate back through the browser history stack.
 *
 * This is a no-op on the web / iOS. The Capacitor App plugin is loaded
 * dynamically so the web bundle does not require it as a dependency.
 */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // @ts-expect-error – Capacitor global is injected at runtime in the native shell.
    const cap = typeof window !== "undefined" ? window.Capacitor : undefined;
    if (!cap?.isNativePlatform || !cap.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // Dynamic import: only resolved inside the native shell where the
        // plugin is bundled. On web this line is never reached.
        const mod = await import(/* @vite-ignore */ "@capacitor/app").catch(
          () => null,
        );
        if (!mod?.App) return;

        const handle = await mod.App.addListener("backButton", () => {
          if (location.pathname === "/" || window.history.length <= 1) {
            mod.App.exitApp();
          } else {
            navigate(-1);
          }
        });

        cleanup = () => handle.remove();
      } catch (err) {
        console.warn("Android back button handler unavailable:", err);
      }
    })();

    return () => cleanup?.();
  }, [navigate, location.pathname]);
};

export default useAndroidBackButton;