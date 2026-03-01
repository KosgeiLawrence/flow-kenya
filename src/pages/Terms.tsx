import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Duara Flow, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. These terms apply to all users including waste pickers, aggregators, recyclers, corporates, NGOs, and government entities.`,
  },
  {
    title: "2. User Accounts & Roles",
    content: `You must register for an account and select an appropriate role to use Duara Flow. You are responsible for maintaining the confidentiality of your credentials. Each account must represent a single individual or authorized organization representative. We reserve the right to verify identity and approve or reject accounts.`,
  },
  {
    title: "3. Platform Usage",
    content: `Duara Flow provides waste collection tracking, payment processing, impact measurement, and reporting tools. You agree to use the platform only for lawful purposes related to waste management and recycling. Misuse, including submitting false collection data or fraudulent transactions, will result in account suspension.`,
  },
  {
    title: "4. Payments & Transactions",
    content: `Payments are processed via M-Pesa and other approved payment channels. Duara Flow facilitates but does not guarantee transactions between parties. Commission rates and pricing are set by the platform and may be updated with prior notice. All payment disputes must be reported within 14 days.`,
  },
  {
    title: "5. Data & Intellectual Property",
    content: `Collection data, transaction records, and impact metrics generated through the platform are jointly owned by the contributing user and Duara Flow. We retain the right to use anonymized, aggregated data for impact reporting, research, and platform improvement. The Duara Flow brand, software, and design are proprietary.`,
  },
  {
    title: "6. Limitation of Liability",
    content: `Duara Flow is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from platform use. Our total liability shall not exceed the fees paid by you in the preceding 12 months.`,
  },
  {
    title: "7. Termination",
    content: `We may suspend or terminate your account for violation of these terms, fraudulent activity, or extended inactivity (12+ months). You may delete your account at any time through settings. Upon termination, your personal data will be handled according to our Privacy Policy.`,
  },
  {
    title: "8. Governing Law",
    content: `These terms are governed by the laws of the Republic of Kenya. Any disputes shall be resolved through arbitration in Nairobi under the Chartered Institute of Arbitrators (Kenya Branch) rules before resorting to litigation.`,
  },
  {
    title: "9. Changes to Terms",
    content: `We reserve the right to modify these terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use after changes constitutes acceptance.`,
  },
];

const Terms = () => (
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
        Terms of Service
      </h1>
      <p className="text-muted-foreground mb-12">
        Last updated: March 1, 2026
      </p>

      <div className="prose-like space-y-10">
        <p className="text-foreground/80 leading-relaxed">
          Welcome to Duara Flow, operated by Duara Intelligence Limited. These terms
          govern your use of our waste management and circular economy platform.
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
            Questions about these terms?{" "}
            <Link to="/contact" className="text-primary font-medium hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default Terms;
