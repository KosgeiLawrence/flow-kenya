import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Recycle, Menu, X, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: t("nav.platform"), href: "#platform" },
    { label: t("nav.impact"), href: "#impact" },
    { label: t("nav.stakeholders"), href: "#stakeholders" },
    { label: t("nav.about"), href: "#about" },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        scrolled
          ? "bg-forest-deep/80 backdrop-blur-2xl border-b border-primary-foreground/8 shadow-elevated"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16 md:h-20 pt-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold transition-all duration-300 group-hover:scale-110 group-hover:shadow-gold">
            <Recycle className="h-5 w-5 text-forest-deep" />
          </div>
          <span className="font-display text-lg font-bold text-primary-foreground tracking-tight">
            Duara Flow
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative px-4 py-2 text-sm font-medium text-primary-foreground/70 transition-all duration-300 hover:text-gold-light group"
            >
              {item.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-gold rounded-full transition-all duration-300 group-hover:w-1/2" />
            </a>
          ))}
        </nav>

        {/* Desktop CTA + Lang */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-foreground/70 rounded-lg hover:text-gold-light hover:bg-primary-foreground/5 transition-all duration-300"
            aria-label="Switch language"
          >
            <Globe className="h-4 w-4" />
            {t("nav.language")}
          </button>
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-gold-light"
          >
            {t("nav.signIn")}
          </Link>
          <Button variant="hero" size="sm" className="hover-glow" asChild>
            <Link to="/signup">{t("nav.getStarted")}</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-primary-foreground/70 rounded-lg hover:text-gold-light hover:bg-primary-foreground/5 transition-all duration-300"
            aria-label="Switch language"
          >
            <Globe className="h-3.5 w-3.5" />
            {t("nav.language")}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-center h-10 w-10 rounded-xl text-primary-foreground/80 hover:bg-primary-foreground/10 transition-all duration-300"
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
            className="md:hidden overflow-hidden bg-forest-deep/95 backdrop-blur-2xl border-t border-primary-foreground/8"
          >
            <div className="container py-6 flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-primary-foreground/80 hover:text-gold-light hover:bg-primary-foreground/5 transition-all duration-300"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-primary-foreground/10 flex flex-col gap-3">
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
