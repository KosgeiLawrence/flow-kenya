import { Link } from "react-router-dom";
import { ArrowLeft, Recycle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/CTASection";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-transform group-hover:scale-110">
            <Recycle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">Duara Flow</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
      </div>
    </header>

    <main className="container max-w-3xl py-12 md:py-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Terms of Service</h1>
      </div>

      <p className="text-muted-foreground mb-8">Last updated: March 3, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using the Duara Flow platform, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. These terms apply to all users including waste pickers, aggregators, recyclers, NGOs, corporates, and county government officials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Platform Description</h2>
          <p className="text-muted-foreground leading-relaxed">
            Duara Flow is a digital platform for waste value chain traceability, connecting stakeholders across Kenya's circular economy. The platform provides collection tracking, payment processing, compliance management, impact reporting, and ESG analytics tools.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
          <p className="text-muted-foreground leading-relaxed">
            You must register for an account and select your appropriate role to use Duara Flow. You are responsible for maintaining the confidentiality of your credentials. All activities under your account are your responsibility. You must provide accurate and complete information during registration.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree not to misuse the platform, submit fraudulent collection or transaction data, impersonate other users, attempt to circumvent security measures, or use the platform for any unlawful purpose. Violation may result in immediate suspension or termination of your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Payments & Transactions</h2>
          <p className="text-muted-foreground leading-relaxed">
            Payments processed through Duara Flow via M-Pesa or other integrated payment methods are subject to the respective payment provider's terms. Duara Flow facilitates but does not guarantee payment processing. Transaction records are maintained for audit and compliance purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            All content, features, and functionality of the Duara Flow platform are owned by Duara Intelligence and are protected by intellectual property laws. You retain ownership of data you submit but grant us a license to use it for platform operations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            Duara Flow is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you have paid us in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These terms are governed by the laws of the Republic of Kenya. Any disputes shall be resolved through arbitration in Nairobi, Kenya, in accordance with the Arbitration Act of Kenya.
          </p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
