import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useTranslation } from "react-i18next";

const Counter = ({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); } else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span>{count.toLocaleString()}{suffix}</span>;
};

const ImpactMetrics = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const navigate = useNavigate();
  const { derived } = usePlatformStats();
  const { t } = useTranslation();

  const metrics = [
    { target: Math.max(Math.round(derived?.totalTons ?? 0), 1), suffix: "+", label: t("impact.tonnesCollected") },
    { target: Math.max(derived?.wastePickers ?? 0, 1), suffix: "+", label: t("impact.wastePickersEmpowered") },
    { target: Math.max(Math.round(derived?.co2Tons ?? 0), 1), suffix: "", label: t("impact.co2Avoided") },
    { target: Math.max(derived?.totalUsers ?? 0, 1), suffix: "+", label: t("impact.platformParticipants") },
  ];

  return (
    <section id="impact" className="relative border-b border-border bg-foreground py-20 text-background md:py-28 overflow-hidden" ref={ref}>
      <div className="container relative">
        <div className="mb-14 max-w-3xl">
          <span className="mb-4 inline-block text-xs font-semibold uppercase text-primary">
            {t("impact.badge")}
          </span>
          <h2 className="mb-4 font-display text-3xl font-semibold text-background md:text-5xl">
            {t("impact.title")}
          </h2>
          <p className="max-w-2xl text-background/65">{t("impact.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 border-l border-t border-background/15 md:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="border-b border-r border-background/15 p-6 text-left transition-colors hover:bg-background/5"
            >
              <div className="mb-2 font-display text-3xl font-semibold text-background md:text-4xl">
                <Counter target={m.target} suffix={m.suffix} inView={isInView} />
              </div>
              <p className="text-sm text-background/60">{m.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button variant="hero" size="lg" onClick={() => navigate("/impact")} className="gap-2 hover-glow">
            {t("impact.viewFull")} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ImpactMetrics;
