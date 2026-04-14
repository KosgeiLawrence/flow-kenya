import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Collection",
    actor: "Waste Pickers",
    description: "Materials collected, weighed, and tagged with QR batch IDs at geo-tagged points.",
    color: "bg-forest",
  },
  {
    step: "02",
    title: "Aggregation",
    actor: "Aggregators",
    description: "Sorted materials tracked by batch, inventoried, and prepared for recyclers.",
    color: "bg-earth",
  },
  {
    step: "03",
    title: "Recycling",
    actor: "Recyclers",
    description: "Materials processed with full chain-of-custody documentation and compliance.",
    color: "bg-sky",
  },
  {
    step: "04",
    title: "Manufacturing",
    actor: "Manufacturers",
    description: "Recycled materials enter production with verified circular economy certificates.",
    color: "bg-gold",
  },
];

const TraceabilityFlow = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="platform" className="relative py-20 md:py-32 overflow-hidden" ref={ref}>
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-muted">
        <div className="absolute top-0 right-0 h-[40%] w-[40%] rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[30%] w-[30%] rounded-full bg-forest/5 blur-3xl" />
      </div>

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
            Traceability Framework
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
            From Collection to Circularity
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Every kilogram tracked with batch IDs, QR codes, timestamps, and geo-tags — creating an unbroken chain of custody.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="relative"
            >
              <div className="rounded-2xl glass-card p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${step.color} transition-transform duration-300 hover:scale-110`}>
                  <span className="font-display text-lg font-bold text-primary-foreground">
                    {step.step}
                  </span>
                </div>
                <h3 className="mb-1 font-display text-lg font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="mb-2 text-sm font-semibold text-gold">{step.actor}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-2 md:absolute md:-right-3 md:top-1/2 md:-translate-y-1/2 md:py-0">
                  <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground/40 md:rotate-0" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TraceabilityFlow;
