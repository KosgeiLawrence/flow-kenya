import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle } from "lucide-react";
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

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-muted/50 backdrop-blur-sm py-12">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Recycle className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Duara Flow</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("cta.copyright")}</p>
          <div className="flex gap-6">
            {[
              { label: t("cta.privacy"), to: "/privacy" },
              { label: t("cta.terms"), to: "/terms" },
              { label: t("cta.contact"), to: "/contact" },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-muted-foreground transition-all duration-300 hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
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
