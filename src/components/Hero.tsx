import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { value: "22M+", label: "Tonnes waste/year in Kenya" },
  { value: "70%", label: "Ends up in landfills" },
  { value: "500K+", label: "Informal waste pickers" },
];

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Waste collection in Kenya" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-90" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Spacer for fixed navbar */}
        <div className="h-24 md:h-28" />

        {/* Hero Content */}
        <div className="container flex flex-1 flex-col items-center justify-center pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-light/30 bg-gold/10 px-4 py-2"
          >
            <span className="text-sm font-medium text-gold-light">
              By Duara Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-6 max-w-4xl font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl"
          >
            Kenya's Digital{" "}
            <span className="text-gradient-gold">Traceability</span>{" "}
            Infrastructure for the{" "}
            <span className="text-gradient-gold">Circular Economy</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-10 max-w-2xl text-lg text-primary-foreground/70 md:text-xl"
          >
            End-to-end material tracking from waste picker to manufacturer.
            Real-time compliance, M-Pesa payments, and impact analytics — all in one platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button variant="hero" size="lg" className="text-base" asChild>
              <Link to="/signup">Join the Platform <ArrowRight className="ml-1 h-5 w-5" /></Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="border-t border-primary-foreground/10 bg-primary/30 backdrop-blur-sm"
        >
          <div className="container grid grid-cols-1 divide-y divide-primary-foreground/10 py-0 md:grid-cols-3 md:divide-x md:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-6">
                <span className="font-display text-3xl font-bold text-gold-light">
                  {stat.value}
                </span>
                <span className="mt-1 text-sm text-primary-foreground/60">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
