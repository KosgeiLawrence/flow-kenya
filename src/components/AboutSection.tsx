import { motion } from "framer-motion";
import { Globe, Users, Leaf, BarChart3, Target, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const AboutSection = () => {
  const { t } = useTranslation();

  const values = [
    { icon: Globe, title: t("about.value1Title"), description: t("about.value1Desc") },
    { icon: Users, title: t("about.value2Title"), description: t("about.value2Desc") },
    { icon: Leaf, title: t("about.value3Title"), description: t("about.value3Desc") },
    { icon: BarChart3, title: t("about.value4Title"), description: t("about.value4Desc") },
  ];

  return (
    <section id="about" className="relative border-b border-border py-20 md:py-28 overflow-hidden">
      <div className="container relative">
        <div className="max-w-3xl mb-14">
          <span className="inline-block text-xs font-semibold uppercase text-primary mb-4">
            {t("about.badge")}
          </span>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-5xl mb-5">
            {t("about.title")} <span className="text-primary">{t("about.titleHighlight")}</span> {t("about.titleEnd")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{t("about.description")}</p>
        </div>

        <div className="mb-14 border-y border-border">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
              className="border-x border-border bg-card p-8 md:border-r-0"
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
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="border-x border-border bg-card p-8"
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
        </div>

        <div className="mb-16 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.4, 0, 0.2, 1] }}
                className="border-b border-r border-border bg-card p-6 text-left"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
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
