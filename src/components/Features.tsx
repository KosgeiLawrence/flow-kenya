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
    <section id="features" className="relative border-b border-border py-20 md:py-28">
      <div className="container">
        <div className="mb-14 border-b border-border pb-10 text-left md:grid md:grid-cols-[1fr_1fr] md:gap-16">
          <div><span className="mb-4 inline-block text-xs font-semibold uppercase text-primary">
            {t("features.badge")}
          </span>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-5xl">
            {t("features.title")}
          </h2></div>
          <p className="mt-5 max-w-2xl self-end leading-relaxed text-muted-foreground md:mt-0">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="group flex gap-4 border-b border-r border-border bg-card p-6 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-base font-bold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
