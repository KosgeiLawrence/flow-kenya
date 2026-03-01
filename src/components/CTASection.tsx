import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle } from "lucide-react";

const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 md:py-32" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl bg-hero p-10 text-center md:p-20"
        >
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/5" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gold/5" />

          <div className="relative z-10">
            <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
              Ready to Digitize Your <br className="hidden md:block" />
              <span className="text-gradient-gold">Waste Value Chain?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-primary-foreground/70">
              Whether you're a waste picker, aggregator, corporate, or county government — Duara Flow has a dashboard built for you.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="hero" size="lg" className="text-base" asChild>
                <Link to="/signup">Get Started <ArrowRight className="ml-1 h-5 w-5" /></Link>
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const footerLinks = {
  platform: [
    { label: "Waste Pickers", href: "/signup" },
    { label: "Aggregators", href: "/signup" },
    { label: "Recyclers", href: "/signup" },
    { label: "Corporates", href: "/signup" },
  ],
  resources: [
    { label: "Impact Dashboard", href: "/impact" },
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Blog", href: "#" },
  ],
  company: [
    { label: "About Us", href: "#about" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "/contact" },
    { label: "Partners", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/privacy" },
  ],
};

const Footer = () => (
  <footer className="bg-forest-deep text-primary-foreground">
    {/* Main footer */}
    <div className="container py-16 md:py-20">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-5 lg:gap-16">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold">
              <Recycle className="h-5 w-5 text-forest-deep" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Duara Flow
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-primary-foreground/60 max-w-xs mb-6">
            Digitizing Kenya's circular economy — connecting waste pickers, aggregators, recyclers, and corporates on one transparent platform.
          </p>
          <div className="flex gap-3">
            {["X", "LinkedIn", "GitHub"].map((social) => (
              <a
                key={social}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-foreground/10 text-xs font-bold text-primary-foreground/50 transition-all hover:border-gold/40 hover:text-gold"
              >
                {social[0]}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-gold mb-4">
              {title}
            </h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("/") ? (
                    <Link
                      to={link.href}
                      className="text-sm text-primary-foreground/50 transition-colors hover:text-gold-light"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-primary-foreground/50 transition-colors hover:text-gold-light"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-primary-foreground/10">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
        <p className="text-xs text-primary-foreground/40">
          © 2026 Duara Intelligence. Building Kenya's circular economy infrastructure.
        </p>
        <div className="flex gap-6">
          <Link to="/privacy" className="text-xs text-primary-foreground/40 transition-colors hover:text-gold-light">
            Privacy
          </Link>
          <Link to="/terms" className="text-xs text-primary-foreground/40 transition-colors hover:text-gold-light">
            Terms
          </Link>
          <Link to="/contact" className="text-xs text-primary-foreground/40 transition-colors hover:text-gold-light">
            Contact
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

const CTASection = () => (
  <>
    <CTA />
    <Footer />
  </>
);

export default CTASection;
