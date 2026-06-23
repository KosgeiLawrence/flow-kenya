import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle, Mail, Phone, MapPin, Instagram, Facebook, Linkedin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHashNavigation } from "@/hooks/useHashNavigation";
import ConsultationDialog from "@/components/ConsultationDialog";

function FooterMenuLinks({ links }: { links: { label: string; to: string; isRoute?: boolean }[] }) {
  const handleHashClick = useHashNavigation();
  return (
    <ul className="space-y-2.5">
      {links.map((link) => {
        if (link.isRoute) {
          return (
            <li key={link.to}>
              <Link to={link.to} className="text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:text-sidebar-foreground">
                {link.label}
              </Link>
            </li>
          );
        }
        const hash = link.to.replace("/", "");
        return (
          <li key={link.to}>
            <button
              onClick={() => handleHashClick(hash)}
              className="text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:text-sidebar-foreground cursor-pointer"
            >
              {link.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const CTA = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
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
              <ConsultationDialog>
                <Button variant="hero" size="lg" className="text-base hover-glow">
                  {t("cta.getStarted")} <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </ConsultationDialog>
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

const Footer = () => {
  const { t } = useTranslation();

  const menuLinks = [
    { label: t("footer.platform"), to: "/#stakeholders" },
    { label: t("footer.about"), to: "/#about" },
    { label: t("footer.features"), to: "/#features" },
    { label: t("footer.traceability"), to: "/#traceability" },
    { label: t("footer.impact"), to: "/#impact" },
    { label: t("footer.marketplace"), to: "/marketplace", isRoute: true },
    { label: t("footer.contact"), to: "/contact", isRoute: true },
  ];

  const legalLinks = [
    { label: t("footer.terms"), to: "/terms" },
    { label: t("footer.privacy"), to: "/privacy" },
  ];

  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.08)] bg-sidebar text-sidebar-foreground">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.25)] pointer-events-none" />
      <div className="container relative z-10">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-10 py-16 md:grid-cols-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-5 space-y-5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform duration-300 group-hover:scale-110">
                <Recycle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-sidebar-foreground tracking-tight">Duara Flow</span>
            </Link>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70 max-w-xs">
              {t("footer.brandDescription")}
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <a href="mailto:hello@duaraflow.co.ke" className="inline-flex items-center gap-2 text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:text-sidebar-foreground">
                <Mail className="h-3.5 w-3.5 text-primary/70" />
                hello@duaraflow.co.ke
              </a>
              <a href="tel:+254741027140" className="inline-flex items-center gap-2 text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:text-sidebar-foreground">
                <Phone className="h-3.5 w-3.5 text-primary/70" />
                +254 741 027 140
              </a>
              <span className="inline-flex items-center gap-2 text-sm text-sidebar-foreground/70">
                <MapPin className="h-3.5 w-3.5 text-primary/70" />
                Mombasa, Kenya
              </span>
            </div>
            {/* Social media */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com/duaraintelligence"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] text-sidebar-foreground/70 transition-all duration-200 hover:text-sidebar-foreground hover:bg-primary/20 hover:border-primary/40"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com/duaraintelligence"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] text-sidebar-foreground/70 transition-all duration-200 hover:text-sidebar-foreground hover:bg-primary/20 hover:border-primary/40"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/duaraintell"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] text-sidebar-foreground/70 transition-all duration-200 hover:text-sidebar-foreground hover:bg-primary/20 hover:border-primary/40"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/duaraintelligence/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] text-sidebar-foreground/70 transition-all duration-200 hover:text-sidebar-foreground hover:bg-primary/20 hover:border-primary/40"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Menu links */}
          <div className="md:col-span-3 md:col-start-7">
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/60">{t("footer.menuHeading")}</h4>
             <FooterMenuLinks links={menuLinks} />
          </div>

          {/* Legal links */}
          <div className="md:col-span-2">
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/60">{t("footer.legalHeading")}</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:text-sidebar-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.08)] py-6 md:flex-row">
          <p className="text-xs text-sidebar-foreground/60">
            {t("cta.copyright")}
          </p>
          <p className="text-xs text-sidebar-foreground/50">
            {t("footer.productOf")} <span className="text-sidebar-foreground/70 font-medium">Duara Intelligence</span>
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
