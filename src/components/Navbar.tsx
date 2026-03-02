import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Recycle, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Impact", href: "#impact" },
  { label: "Stakeholders", href: "#stakeholders" },
  { label: "About", href: "#about" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-forest-deep/95 backdrop-blur-xl border-b border-primary-foreground/10 shadow-elevated"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between min-h-20 md:min-h-24 py-2 -mt-1">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold transition-transform duration-300 group-hover:scale-110">
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
              key={item.label}
              href={item.href}
              className="relative px-4 py-2 text-sm font-medium text-primary-foreground/70 transition-colors hover:text-gold-light group"
            >
              {item.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-gold rounded-full transition-all duration-300 group-hover:w-1/2" />
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-gold-light"
          >
            Sign In
          </Link>
          <Button variant="hero" size="sm" asChild>
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden bg-forest-deep/98 backdrop-blur-xl border-t border-primary-foreground/10"
          >
            <div className="container py-6 flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-gold-light hover:bg-primary-foreground/5 transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-primary-foreground/10 flex flex-col gap-3">
                <Button variant="hero-outline" asChild className="w-full">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
                <Button variant="hero" asChild className="w-full">
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
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
