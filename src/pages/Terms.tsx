import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Recycle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/CTASection";

const sections = [
  { title: "1. Acceptance of Terms", body: "By accessing or using the Twende Green Ecocycle platform, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. These terms apply to all users including waste pickers, aggregators, recyclers, NGOs, corporates, and county government officials." },
  { title: "2. Platform Description", body: "Twende Green Ecocycle is a digital platform for waste value chain traceability, connecting stakeholders across Kenya's circular economy. The platform provides collection tracking, payment processing, compliance management, impact reporting, and ESG analytics tools." },
  { title: "3. User Accounts", body: "You must register for an account and select your appropriate role to use Twende Green Ecocycle. You are responsible for maintaining the confidentiality of your credentials. All activities under your account are your responsibility. You must provide accurate and complete information during registration." },
  { title: "4. Acceptable Use", body: "You agree not to misuse the platform, submit fraudulent collection or transaction data, impersonate other users, attempt to circumvent security measures, or use the platform for any unlawful purpose. Violation may result in immediate suspension or termination of your account." },
  { title: "5. Payments & Transactions", body: "Payments processed through Twende Green Ecocycle via M-Pesa or other integrated payment methods are subject to the respective payment provider's terms. Twende Green Ecocycle facilitates but does not guarantee payment processing. Transaction records are maintained for audit and compliance purposes." },
  { title: "6. Intellectual Property", body: "All content, features, and functionality of the Twende Green Ecocycle platform are owned by Twende Green Ecocycle and are protected by intellectual property laws. You retain ownership of data you submit but grant us a license to use it for platform operations." },
  { title: "7. Limitation of Liability", body: "Twende Green Ecocycle is provided \"as is\" without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you have paid us in the 12 months preceding the claim." },
  { title: "8. Governing Law", body: "These terms are governed by the laws of the Republic of Kenya. Any disputes shall be resolved through arbitration in Nairobi, Kenya, in accordance with the Arbitration Act of Kenya." },
];

const Terms = () => (
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
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Terms of Service</h1>
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

export default Terms;
