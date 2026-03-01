import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly, including your name, email address, phone number, national ID (for verification), gender, date of birth, and organization details. We also collect usage data such as collection records, transaction history, and location data when you use our services.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `Your data powers the Duara Flow platform — enabling waste collection tracking, payment processing, impact measurement, and compliance reporting. We use aggregated and anonymized data for environmental impact calculations (CO₂ savings, recycling rates) shared with stakeholders and government bodies.`,
  },
  {
    title: "3. Data Sharing & Third Parties",
    content: `We share data with aggregators, recyclers, and corporate partners only as necessary to facilitate transactions within the value chain. County governments receive anonymized waste flow data for regulatory compliance. We never sell your personal data to third parties for marketing purposes.`,
  },
  {
    title: "4. Data Security",
    content: `We implement industry-standard security measures including encryption in transit (TLS) and at rest, role-based access controls, and regular security audits. Payment data is processed through secure M-Pesa integrations and is never stored on our servers.`,
  },
  {
    title: "5. Your Rights",
    content: `Under the Kenya Data Protection Act 2019, you have the right to access, correct, or delete your personal data. You may request a copy of your data or withdraw consent at any time by contacting our data protection officer at privacy@duaraflow.co.ke.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your personal data for as long as your account is active or as needed to provide services. Transaction and collection records are retained for 7 years for regulatory compliance purposes. You may request deletion of non-essential data at any time.`,
  },
  {
    title: "7. Cookies & Analytics",
    content: `We use essential cookies to maintain your session and preferences. Analytics cookies help us understand platform usage patterns. You can manage cookie preferences through your browser settings.`,
  },
  {
    title: "8. Changes to This Policy",
    content: `We may update this policy periodically. We will notify you of significant changes via email or in-app notification. Continued use of Duara Flow after changes constitutes acceptance.`,
  },
];

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container max-w-3xl py-28 md:py-36">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>

      <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl mb-3">
        Privacy Policy
      </h1>
      <p className="text-muted-foreground mb-12">
        Last updated: March 1, 2026
      </p>

      <div className="prose-like space-y-10">
        <p className="text-foreground/80 leading-relaxed">
          Duara Intelligence Limited ("Duara Flow", "we", "us") is committed to protecting
          your privacy. This policy explains how we collect, use, and safeguard your
          information when you use our waste management platform.
        </p>

        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              {s.title}
            </h2>
            <p className="text-foreground/70 leading-relaxed">{s.content}</p>
          </div>
        ))}

        <div className="mt-12 rounded-xl border border-border bg-muted/50 p-6">
          <p className="text-sm text-muted-foreground">
            Questions about this policy?{" "}
            <Link to="/contact" className="text-primary font-medium hover:underline">
              Contact us
            </Link>{" "}
            or email{" "}
            <a href="mailto:privacy@duaraflow.co.ke" className="text-primary font-medium hover:underline">
              privacy@duaraflow.co.ke
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default Privacy;
