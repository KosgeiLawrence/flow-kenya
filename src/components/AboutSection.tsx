import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Globe, Users, Leaf, BarChart3, Target, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  const values = [
    { icon: Globe, title: t("about.value1Title"), description: t("about.value1Desc") },
    { icon: Users, title: t("about.value2Title"), description: t("about.value2Desc") },
    { icon: Leaf, title: t("about.value3Title"), description: t("about.value3Desc") },
    { icon: BarChart3, title: t("about.value4Title"), description: t("about.value4Desc") },
  ];

  return (
    <section id="about" className="relative py-20 md:py-32 overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-[rgba(255,255,255,0.02)]">
        <div className="absolute top-0 left-1/4 h-[30%] w-[30%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[25%] w-[25%] rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-4 backdrop-blur-sm">
            {t("about.badge")}
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl mb-5">
            {t("about.title")} <span className="text-primary">{t("about.titleHighlight")}</span> {t("about.titleEnd")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{t("about.description")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-2xl glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">{t("about.missionTitle")}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">{t("about.missionText")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-2xl glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">{t("about.visionTitle")}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">{t("about.visionText")}</p>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {values.map((value, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.12 * i + 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-2xl glass-card p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 hover:scale-110 hover:bg-primary/20">
                <value.icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-display text-lg font-semibold text-foreground mb-2">{value.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
