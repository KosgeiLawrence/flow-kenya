import { useNavigate, useLocation } from "react-router-dom";
import { useCallback } from "react";

/**
 * Handles clicking anchor links that target sections on the homepage.
 * If already on "/", scrolls smoothly. Otherwise navigates to "/#section".
 */
export function useHashNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleHashClick = useCallback(
    (hash: string, closeMobileMenu?: () => void) => {
      const id = hash.replace("#", "");
      closeMobileMenu?.();

      if (location.pathname === "/") {
        // Already on homepage — just scroll
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            window.history.replaceState(null, "", `#${id}`);
          }
        }, 50);
      } else {
        // Navigate to homepage with hash
        navigate(`/#${id}`);
      }
    },
    [location.pathname, navigate]
  );

  return handleHashClick;
}
