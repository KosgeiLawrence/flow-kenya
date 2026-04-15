import { motion } from "framer-motion";
import { QrCode, MapPin, Wifi, Shield, BarChart3, Store } from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    { icon: QrCode, title: t("features.qr"), description: t("features.qrDesc") },
    { icon: MapPin, title: t("features.geo"), description: t("features.geoDesc") },
    { icon: Wifi, title: t("features.offline"), description: t("features.offlineDesc") },
    { icon: Shield, title: t("features.epr"), description: t("features.eprDesc") },
    { icon: BarChart3, title: t("features.financial"), description: t("features.financialDesc") },
    { icon: Store, title: t("features.marketplace"), description: t("features.marketplaceDesc") },
  ];

  return (
    <section id="features" className="relative py-20 md:py-32 bg-mesh">
      <div className="container">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
            {t("features.badge")}
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
            {t("features.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl p-6 md:p-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="group flex gap-4 glass p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:scale-110">
                  <f.icon className="h-6 w-6 text-primary transition-colors duration-300 group-hover:text-primary-foreground" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-base font-bold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
