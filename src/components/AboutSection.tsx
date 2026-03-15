import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Globe, Users, Leaf, BarChart3, Target, Heart } from "lucide-react";

const values = [
  {
    icon: Globe,
    title: "Circular Economy",
    description: "We believe waste is a resource. Our platform transforms Kenya's linear waste model into a thriving circular economy where every material finds new life.",
  },
  {
    icon: Users,
    title: "Inclusive Growth",
    description: "From informal waste pickers to large corporates — Duara Flow empowers every stakeholder with digital tools, fair pricing, and transparent transactions.",
  },
  {
    icon: Leaf,
    title: "Environmental Impact",
    description: "Every kilogram tracked on our platform is a kilogram diverted from landfills. We make environmental impact measurable, verifiable, and bankable.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Decisions",
    description: "Real-time analytics and traceability data help counties, NGOs, and corporates make informed decisions about waste management and sustainability.",
  },
];

const milestones = [
  { year: "2024", label: "Founded in Nairobi" },
  { year: "2025", label: "Onboarded 1,000+ waste pickers" },
  { year: "2025", label: "Partnered with 5 county governments" },
  { year: "2026", label: "Tracking 50,000+ kg monthly" },
];

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="bg-muted py-20 md:py-32" ref={ref}>
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            About Us
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl mb-5">
            Building Kenya's <span className="text-primary">Circular Economy</span> Infrastructure
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Duara Flow is a digital platform by Duara Intelligence that connects every link in Kenya's waste value chain — from collection to recycling. We provide traceability, transparency, and fair compensation to create a sustainable circular economy that benefits people and planet.
          </p>
        </motion.div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Our Mission</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To digitize and formalize Kenya's waste value chain, ensuring every waste picker is fairly compensated, every kilogram is traceable, and every stakeholder has the data they need to drive sustainable impact.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Our Vision</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              A Kenya where zero waste goes to landfill, waste workers thrive with dignity, and every business takes full responsibility for its plastic footprint — powered by technology and trust.
            </p>
          </motion.div>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {values.map((value, i) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * i + 0.3 }}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <value.icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-display text-lg font-semibold text-foreground mb-2">{value.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default AboutSection;
