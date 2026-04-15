import { motion } from "framer-motion";
import { User, Warehouse, Factory, Heart, Building2, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const Dashboards = () => {
  const { t } = useTranslation();

  const dashboards = [
    {
      icon: User, role: t("dashboards.wastePickers"), accent: "bg-forest",
      features: [t("dashboards.wpFeature1"), t("dashboards.wpFeature2"), t("dashboards.wpFeature3"), t("dashboards.wpFeature4")],
    },
    {
      icon: Warehouse, role: t("dashboards.aggregators"), accent: "bg-earth",
      features: [t("dashboards.agFeature1"), t("dashboards.agFeature2"), t("dashboards.agFeature3"), t("dashboards.agFeature4")],
    },
    {
      icon: Factory, role: t("dashboards.recyclers"), accent: "bg-sky",
      features: [t("dashboards.rcFeature1"), t("dashboards.rcFeature2"), t("dashboards.rcFeature3"), t("dashboards.rcFeature4")],
    },
    {
      icon: Heart, role: t("dashboards.ngos"), accent: "bg-destructive",
      features: [t("dashboards.ngoFeature1"), t("dashboards.ngoFeature2"), t("dashboards.ngoFeature3"), t("dashboards.ngoFeature4")],
    },
    {
      icon: Building2, role: t("dashboards.corporates"), accent: "bg-gold",
      features: [t("dashboards.corpFeature1"), t("dashboards.corpFeature2"), t("dashboards.corpFeature3"), t("dashboards.corpFeature4")],
    },
    {
      icon: Shield, role: t("dashboards.government"), accent: "bg-primary",
      features: [t("dashboards.govFeature1"), t("dashboards.govFeature2"), t("dashboards.govFeature3"), t("dashboards.govFeature4")],
    },
  ];

  return (
    <section id="stakeholders" className="relative py-20 md:py-32 bg-mesh">
      <div className="container">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold backdrop-blur-sm">
            {t("dashboards.badge")}
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
            {t("dashboards.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t("dashboards.subtitle")}
          </p>
        </div>

        <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl p-6 md:p-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dash, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="group rounded-2xl glass-card p-6"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${dash.accent} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                  <dash.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mb-3 font-display text-lg font-bold text-foreground">{dash.role}</h3>
                <ul className="space-y-2">
                  {dash.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboards;
