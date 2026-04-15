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
    <section id="impact" className="relative bg-hero py-20 md:py-32 overflow-hidden" ref={ref}>
      <div className="absolute top-1/4 -left-20 h-64 w-64 rounded-full bg-gold/8 blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 h-48 w-48 rounded-full bg-sky/8 blur-3xl" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-gold-light/20 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-light backdrop-blur-md">
            {t("impact.badge")}
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            {t("impact.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-primary-foreground/60">{t("impact.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 text-center backdrop-blur-xl transition-all duration-300 hover:bg-primary-foreground/10 hover:-translate-y-1"
            >
              <div className="mb-2 font-display text-3xl font-bold text-gold-light md:text-4xl">
                <Counter target={m.target} suffix={m.suffix} inView={isInView} />
              </div>
              <p className="text-sm text-primary-foreground/60">{m.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <Button variant="hero" size="lg" onClick={() => navigate("/impact")} className="gap-2 hover-glow">
            {t("impact.viewFull")} <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ImpactMetrics;
