import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NeuralBackground from "@/components/NeuralBackground";
import Features from "@/components/Features";
import TraceabilityFlow from "@/components/TraceabilityFlow";
import Dashboards from "@/components/Dashboards";
import ImpactMetrics from "@/components/ImpactMetrics";
import AboutSection from "@/components/AboutSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background bg-radial-glow relative">
      <NeuralBackground />
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <TraceabilityFlow />
        <Dashboards />
        <ImpactMetrics />
        <AboutSection />
        <CTASection />
      </div>
    </div>
  );
};

export default Index;
