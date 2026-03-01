import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const metrics = [
  { target: 2500, suffix: "+", label: "Tonnes Collected", unit: "tonnes" },
  { target: 15000, suffix: "+", label: "Waste Pickers Empowered", unit: "people" },
  { target: 4200, suffix: "", label: "CO₂ Tonnes Avoided", unit: "tCO₂e" },
  { target: 47, suffix: "", label: "Counties Covered", unit: "counties" },
];

const Counter = ({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const ImpactMetrics = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="impact" className="bg-hero py-20 md:py-32" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-gold-light/30 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-light">
            Measurable Impact
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Impact You Can Verify
          </h2>
          <p className="mx-auto max-w-2xl text-primary-foreground/60">
            Every metric backed by traceable data — from kilograms collected to carbon offsets calculated.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 text-center backdrop-blur-sm"
            >
              <div className="mb-2 font-display text-3xl font-bold text-gold-light md:text-4xl">
                <Counter target={m.target} suffix={m.suffix} inView={isInView} />
              </div>
              <p className="text-sm text-primary-foreground/60">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactMetrics;
