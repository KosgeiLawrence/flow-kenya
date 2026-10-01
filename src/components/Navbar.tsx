import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Recycle, Menu, X, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useHashNavigation } from "@/hooks/useHashNavigation";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleHashClick = useHashNavigation();

  const navItems = [
    { label: t("nav.platform"), href: "#stakeholders" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.impact"), href: "#impact" },
    { label: t("dashboard.marketplace"), href: "/marketplace", isRoute: true },
    { label: t("nav.contact"), href: "/contact", isRoute: true },
  ];

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "en" ? "sw" : "en");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16 md:h-20 pt-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:bg-primary/90">
            <Recycle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-[15px] font-semibold text-foreground">
            Duara Flow
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) =>
            item.isRoute ? (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.href}
                onClick={() => handleHashClick(item.href)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        {/* Desktop CTA + Lang */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle className="text-muted-foreground" />
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Switch language"
          >
            <Globe className="h-4 w-4" />
            {t("nav.language")}
          </button>
          <Link
            to="/login"
            className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.signIn")}
          </Link>
          <Button variant="hero" size="sm" className="hover-glow" asChild>
            <Link to="/signup">{t("nav.getStarted")}</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle className="text-foreground" />
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Switch language"
          >
            <Globe className="h-3.5 w-3.5" />
            {t("nav.language")}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-border"
          >
            <div className="container py-6 flex flex-col gap-2">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-all duration-300"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.href}
                    onClick={() => handleHashClick(item.href, () => setMobileOpen(false))}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-all duration-300 text-left"
                  >
                    {item.label}
                  </button>
                )
              )}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                <Button variant="hero-outline" asChild className="w-full">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>{t("nav.signIn")}</Link>
                </Button>
                <Button variant="hero" asChild className="w-full hover-glow">
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>{t("nav.getStarted")}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
