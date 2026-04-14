import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  User,
  Warehouse,
  Factory,
  Heart,
  Building2,
  Shield,
} from "lucide-react";

const dashboards = [
  {
    icon: User,
    role: "Waste Pickers",
    features: ["Daily collection tracking", "M-Pesa payments", "QR digital ID", "Performance leaderboard"],
    accent: "bg-forest",
  },
  {
    icon: Warehouse,
    role: "Aggregators",
    features: ["Inventory & batch tracking", "Recycler marketplace", "Bulk payments", "Profit analytics"],
    accent: "bg-earth",
  },
  {
    icon: Factory,
    role: "Recyclers",
    features: ["Supply forecasting", "Order management", "ESG & carbon tracking", "Compliance docs"],
    accent: "bg-sky",
  },
  {
    icon: Heart,
    role: "NGOs",
    features: ["Impact geo-mapping", "Sponsorship tracking", "Grant monitoring", "Donor reports"],
    accent: "bg-destructive",
  },
  {
    icon: Building2,
    role: "Corporates",
    features: ["EPR compliance", "Plastic offset monitoring", "ESG analytics", "Sustainability reports"],
    accent: "bg-gold",
  },
  {
    icon: Shield,
    role: "Government",
    features: ["County waste dashboards", "Fraud detection", "Regulatory reporting", "Audit logs"],
    accent: "bg-primary",
  },
];

const Dashboards = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="stakeholders" className="relative py-20 md:py-32 bg-mesh" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold backdrop-blur-sm">
            Role-Based Access
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
            One Platform, Every Stakeholder
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Tailored dashboards for every actor in the waste value chain — from informal waste pickers to county governments.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dash, i) => (
            <motion.div
              key={dash.role}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="group rounded-2xl glass-card p-6"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${dash.accent} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                <dash.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mb-3 font-display text-lg font-bold text-foreground">
                {dash.role}
              </h3>
              <ul className="space-y-2">
                {dash.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Dashboards;
