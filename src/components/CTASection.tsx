import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-32" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="relative overflow-hidden rounded-3xl bg-hero p-10 text-center md:p-20"
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/8 blur-2xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gold/6 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120%] w-[120%] rounded-full bg-primary-foreground/3 blur-3xl" />

          <div className="relative z-10">
            <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
              {t("cta.title1")} <br className="hidden md:block" />
              <span className="text-gradient-gold">{t("cta.title2")}</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-primary-foreground/70">{t("cta.subtitle")}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="hero" size="lg" className="text-base hover-glow" asChild>
                <Link to="/signup">{t("cta.getStarted")} <ArrowRight className="ml-1 h-5 w-5" /></Link>
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base" asChild>
                <Link to="/login">{t("cta.signIn")}</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const footerLinks = {
  menu: [
    { label: "Platform", to: "/#platform" },
    { label: "Features", to: "/#features" },
    { label: "Dashboards", to: "/#dashboards" },
    { label: "Traceability", to: "/#traceability" },
    { label: "Impact", to: "/#impact" },
    { label: "About", to: "/#about" },
    { label: "Contact", to: "/contact" },
  ],
  legal: [
    { label: "Terms", to: "/terms" },
    { label: "Privacy", to: "/privacy" },
  ],
};

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.4)] backdrop-blur-[24px]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.3)] pointer-events-none" />
      <div className="container relative z-10">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-10 py-16 md:grid-cols-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-5 space-y-5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform duration-300 group-hover:scale-110">
                <Recycle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground tracking-tight">Duara Flow</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
              Africa's leading waste traceability platform — connecting waste pickers, aggregators, recyclers, and corporates for a circular economy.
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <a href="mailto:hello@duaraflow.co.ke" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                <Mail className="h-3.5 w-3.5 text-primary/70" />
                hello@duaraflow.co.ke
              </a>
              <a href="tel:+254741027140" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                <Phone className="h-3.5 w-3.5 text-primary/70" />
                +254 741 027 140
              </a>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary/70" />
                Nairobi, Kenya
              </span>
            </div>
          </div>

          {/* Menu links */}
          <div className="md:col-span-3 md:col-start-7">
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-foreground/60">Menu</h4>
            <ul className="space-y-2.5">
              {footerLinks.menu.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div className="md:col-span-2">
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-foreground/60">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] py-6 md:flex-row">
          <p className="text-xs text-muted-foreground/60">
            {t("cta.copyright")}
          </p>
          <p className="text-xs text-muted-foreground/40">
            A product of <span className="text-muted-foreground/60 font-medium">Duara Intelligence</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
const CTASection = () => (
  <>
    <CTA />
    <Footer />
  </>
);

export { Footer };
export default CTASection;
