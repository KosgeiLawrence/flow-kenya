import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import TraceabilityFlow from "@/components/TraceabilityFlow";
import Dashboards from "@/components/Dashboards";
import ImpactMetrics from "@/components/ImpactMetrics";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <TraceabilityFlow />
      <Dashboards />
      <ImpactMetrics />
      <CTASection />
    </div>
  );
};

export default Index;
