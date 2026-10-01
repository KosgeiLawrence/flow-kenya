import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const TraceabilityFlow = () => {
  const { t } = useTranslation();

  const steps = [
    { step: "01", title: t("traceability.step1Title"), actor: t("traceability.step1Actor"), description: t("traceability.step1Desc"), color: "bg-forest" },
    { step: "02", title: t("traceability.step2Title"), actor: t("traceability.step2Actor"), description: t("traceability.step2Desc"), color: "bg-earth" },
    { step: "03", title: t("traceability.step3Title"), actor: t("traceability.step3Actor"), description: t("traceability.step3Desc"), color: "bg-sky" },
    { step: "04", title: t("traceability.step4Title"), actor: t("traceability.step4Actor"), description: t("traceability.step4Desc"), color: "bg-gold" },
  ];

  return (
    <section id="traceability" className="relative border-b border-border bg-muted/30 py-20 md:py-28 overflow-hidden">
      <div className="container relative">
        <div className="mb-14 max-w-2xl">
          <span className="mb-4 inline-block text-xs font-semibold uppercase text-primary">
            {t("traceability.badge")}
          </span>
          <h2 className="mb-4 font-display text-3xl font-semibold text-foreground md:text-5xl">
            {t("traceability.title")}
          </h2>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            {t("traceability.subtitle")}
          </p>
        </div>

        {/* Background container for the flow steps */}
        <div className="border-y border-border bg-card">
          <div className="relative grid grid-cols-1 md:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="relative"
              >
                <div className="h-full border-x border-border p-6 md:border-r-0">
                  <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md ${step.color}`}>
                    <span className="font-display text-lg font-bold text-primary-foreground">{step.step}</span>
                  </div>
                  <h3 className="mb-1 font-display text-lg font-bold text-foreground">{step.title}</h3>
                  <p className="mb-2 text-sm font-semibold text-gold">{step.actor}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-2 md:absolute md:-right-2.5 md:top-1/2 md:z-10 md:-translate-y-1/2 md:rounded-full md:bg-card md:py-1">
                    <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground/40 md:rotate-0" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TraceabilityFlow;
