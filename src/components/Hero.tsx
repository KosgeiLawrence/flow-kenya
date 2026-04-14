import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  const { t } = useTranslation();

  const stats = [
    { value: t("hero.stat1Value"), label: t("hero.stat1Label") },
    { value: t("hero.stat2Value"), label: t("hero.stat2Label") },
    { value: t("hero.stat3Value"), label: t("hero.stat3Label") },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="Waste collection in Kenya" className="h-full w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-hero opacity-85" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-1/4 -right-1/4 h-[60%] w-[60%] rounded-full bg-gold/5 blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full bg-sky/5 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="h-24 md:h-28" />

        <div className="container flex flex-1 flex-col items-center justify-center pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-light/20 bg-gold/10 px-5 py-2.5 backdrop-blur-md"
          >
            <span className="text-sm font-medium text-gold-light">{t("hero.badge")}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 max-w-4xl font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl"
          >
            {t("hero.title1")}{" "}
            <span className="text-gradient-gold">{t("hero.traceability")}</span>{" "}
            {t("hero.title2")}{" "}
            <span className="text-gradient-gold">{t("hero.circularEconomy")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="mb-10 max-w-2xl text-lg text-primary-foreground/70 md:text-xl"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button variant="hero" size="lg" className="text-base hover-glow" asChild>
              <Link to="/signup">{t("hero.joinPlatform")} <ArrowRight className="ml-1 h-5 w-5" /></Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base" asChild>
              <Link to="/login">{t("nav.signIn")}</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] backdrop-blur-[20px]"
        >
          <div className="container grid grid-cols-1 divide-y divide-primary-foreground/10 py-0 md:grid-cols-3 md:divide-x md:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-6 transition-smooth hover:bg-primary-foreground/5">
                <span className="font-display text-3xl font-bold text-gold-light">{stat.value}</span>
                <span className="mt-1 text-sm text-primary-foreground/60">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
