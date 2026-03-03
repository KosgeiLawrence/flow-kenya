import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CO2_FACTORS: Record<string, number> = {
  "PET Plastic": 3.1, "HDPE Plastic": 2.8, "Glass": 0.6,
  "Aluminium": 9.1, "Paper/Cardboard": 1.1, "Organic Waste": 0.5,
};

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

  return <span>{count.toLocaleString()}{suffix}</span>;
};

const ImpactMetrics = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  const { data: collections } = useQuery({
    queryKey: ["landing-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("quantity, material_types(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["landing-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalTons = totalKg / 1000;
  const co2Tons = (collections?.reduce((s, c) => {
    const name = (c as any).material_types?.name || "";
    return s + Number(c.quantity) * (CO2_FACTORS[name] || 2.5);
  }, 0) || 0) / 1000;
  const wastePickers = roles?.filter((r) => r.role === "waste_picker").length || 0;

  const metrics = [
    { target: Math.max(Math.round(totalTons), 1), suffix: "+", label: "Tonnes Collected", unit: "tonnes" },
    { target: Math.max(wastePickers, 1), suffix: "+", label: "Waste Pickers Empowered", unit: "people" },
    { target: Math.max(Math.round(co2Tons), 1), suffix: "", label: "CO₂ Tonnes Avoided", unit: "tCO₂e" },
    { target: roles?.length || 1, suffix: "+", label: "Platform Participants", unit: "users" },
  ];

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate("/impact")}
            className="gap-2"
          >
            View Full Impact Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ImpactMetrics;
