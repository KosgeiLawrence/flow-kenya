import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Recycle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/CTASection";

const sections = [
  { title: "1. Information We Collect", body: "Twende Green Ecocycle collects information you provide directly, including your name, email address, phone number, national ID (for waste pickers), company registration details, and location data. We also collect usage data such as collection records, transaction history, and dashboard interactions to improve our services." },
  { title: "2. How We Use Your Information", body: "We use collected information to operate and maintain the Twende Green Ecocycle platform, process waste collection records and payments, generate traceability certificates and compliance reports, provide analytics and impact metrics, communicate important updates, and comply with legal obligations under Kenyan environmental regulations." },
  { title: "3. Data Sharing", body: "We share data with authorized stakeholders within the waste value chain (aggregators, recyclers, corporates, and county governments) only as necessary for platform operations. We do not sell personal data to third parties. Aggregated, anonymized impact data may be shared in public reports." },
  { title: "4. Data Security", body: "We implement industry-standard security measures including encryption in transit and at rest, role-based access controls, and regular security audits to protect your data. Our platform uses secure authentication and all sensitive operations are logged." },
  { title: "5. Your Rights", body: "You have the right to access, correct, or delete your personal data. You may request a copy of your data or ask us to restrict processing. To exercise these rights, contact us at privacy@duaraflow.co.ke." },
  { title: "6. Data Retention", body: "We retain your data for as long as your account is active or as needed to provide services. Collection and transaction records are retained for a minimum of 7 years for regulatory compliance. You may request deletion of your account at any time." },
  { title: "7. Changes to This Policy", body: "We may update this Privacy Policy from time to time. We will notify you of any material changes via email or through the platform. Continued use of Twende Green Ecocycle after changes constitutes acceptance of the updated policy." },
];

const Privacy = () => (
  <div className="min-h-screen bg-mesh">
    <header className="border-b border-border/50 glass-strong sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:scale-110">
            <Recycle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">Twende Green Ecocycle</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
      </div>
    </header>

    <main className="container max-w-3xl py-12 md:py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Privacy Policy</h1>
        </div>
        <p className="text-muted-foreground mb-8">Last updated: March 3, 2026</p>
      </motion.div>

      <div className="space-y-6">
        {sections.map((s, i) => (
          <motion.section
            key={s.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-2">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">{s.body}</p>
          </motion.section>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;
