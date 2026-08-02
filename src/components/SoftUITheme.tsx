import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Applies the Soft UI (neumorphic) light theme across the whole product.
 * `soft-landing` adds the marketing-surface remaps on public routes.
 */
const SoftUITheme = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isDashboard = pathname.startsWith("/dashboard");
    const root = document.documentElement;
    root.classList.add("soft-ui");
    root.classList.toggle("soft-landing", !isDashboard);
    return () => root.classList.remove("soft-ui", "soft-landing");
  }, [pathname]);

  return null;
};

export default SoftUITheme;
