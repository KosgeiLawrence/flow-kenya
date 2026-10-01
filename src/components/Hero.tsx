import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import ConsultationDialog from "@/components/ConsultationDialog";

const Hero = () => {
  const { t } = useTranslation();


  const stats = [
    { value: t("hero.stat1Value"), label: t("hero.stat1Label") },
    { value: t("hero.stat2Value"), label: t("hero.stat2Label") },
    { value: t("hero.stat3Value"), label: t("hero.stat3Label") },
  ];

  return (
    <section className="relative min-h-[92vh] overflow-hidden border-b border-border bg-background">
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="h-24 md:h-28" />

        <div className="container flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="mb-7 inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5"
          >
            <span className="text-xs font-medium text-muted-foreground">{t("hero.badge")}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 max-w-4xl font-display text-4xl font-semibold leading-[1.08] text-foreground md:text-6xl lg:text-7xl"
          >
            {t("hero.title1")}{" "}
            <span className="text-primary">{t("hero.traceability")}</span>{" "}
            {t("hero.title2")}{" "}
            <span className="text-primary">{t("hero.circularEconomy")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <ConsultationDialog>
              <Button variant="hero" size="lg" className="text-base hover-glow">
                {t("hero.joinPlatform")} <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </ConsultationDialog>
            <Button variant="hero-outline" size="lg" className="text-base" asChild>
              <Link to="/login">{t("nav.signIn")}</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="border-t border-border bg-background"
        >
          <div className="container grid grid-cols-3 divide-x divide-border py-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col items-center px-2 py-5 transition-colors hover:bg-accent">
                <span className="font-display text-xl font-semibold text-foreground md:text-3xl">{stat.value}</span>
                <span className="mt-1 text-center text-[10px] text-muted-foreground md:text-sm">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
