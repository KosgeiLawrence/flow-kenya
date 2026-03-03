import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle } from "lucide-react";

const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 md:py-32" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl bg-hero p-10 text-center md:p-20"
        >
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/5" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gold/5" />

          <div className="relative z-10">
            <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
              Ready to Digitize Your <br className="hidden md:block" />
              <span className="text-gradient-gold">Waste Value Chain?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-primary-foreground/70">
              Whether you're a waste picker, aggregator, corporate, or county government — Duara Flow has a dashboard built for you.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="hero" size="lg" className="text-base" asChild>
                <Link to="/signup">Get Started <ArrowRight className="ml-1 h-5 w-5" /></Link>
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="border-t border-border bg-muted py-12">
    <div className="container">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Recycle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            Duara Flow
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 Duara Intelligence. Building Kenya's circular economy infrastructure.
        </p>
        <div className="flex gap-6">
          {[
            { label: "Privacy", to: "/privacy" },
            { label: "Terms", to: "/terms" },
            { label: "Contact", to: "/contact" },
          ].map((link) => (
            <Link key={link.label} to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

const CTASection = () => (
  <>
    <CTA />
    <Footer />
  </>
);

export { Footer };
export default CTASection;
