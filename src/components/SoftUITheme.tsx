import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Applies the Soft UI (neumorphic) light theme to dashboard routes only.
 * The marketing site keeps its dark glassmorphism identity.
 */
const SoftUITheme = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isDashboard = pathname.startsWith("/dashboard");
    const root = document.documentElement;
    root.classList.toggle("soft-ui", isDashboard);
    return () => root.classList.remove("soft-ui");
  }, [pathname]);

  return null;
};

export default SoftUITheme;
