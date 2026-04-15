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
      <Navbar />
      <div style={{ padding: '40px', background: 'red', color: 'white', fontSize: '24px', textAlign: 'center', position: 'relative', zIndex: 50 }}>DEBUG: Before Hero</div>
      <Hero />
      <div style={{ padding: '40px', background: 'blue', color: 'white', fontSize: '24px', textAlign: 'center', position: 'relative', zIndex: 50 }}>DEBUG: After Hero</div>
      <Features />
      <TraceabilityFlow />
      <Dashboards />
      <ImpactMetrics />
      <AboutSection />
      <CTASection />
    </div>
  );
};

export default Index;
