import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Smartphone, QrCode, MapPin, Wifi, Shield, Globe } from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "M-Pesa Integration",
    description: "Instant payments to waste pickers with SMS confirmations and downloadable receipts.",
  },
  {
    icon: QrCode,
    title: "QR Batch Tracking",
    description: "Every material batch tagged with QR codes for full chain-of-custody verification.",
  },
  {
    icon: MapPin,
    title: "Geo-Tagged Collection",
    description: "GPS-stamped collection and aggregation points for spatial waste flow analytics.",
  },
  {
    icon: Wifi,
    title: "Offline-First Design",
    description: "Capture data offline on low-end Android devices with automatic cloud sync.",
  },
  {
    icon: Shield,
    title: "EPR Compliance",
    description: "Automated Extended Producer Responsibility reporting with verified certificates.",
  },
  {
    icon: Globe,
    title: "English & Swahili",
    description: "Full bilingual support for inclusive access across Kenya's waste value chain.",
  },
];

const Features = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-20 md:py-32 bg-mesh" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
            Built for Kenya
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
            Infrastructure That Works
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Designed for the realities of Kenya's waste ecosystem — mobile-first, offline-capable, and M-Pesa native.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="group flex gap-4 rounded-2xl glass-card p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:scale-110">
                <f.icon className="h-6 w-6 text-primary transition-colors duration-300 group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="mb-1 font-display text-base font-bold text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
