import Hero from "@/components/home/Hero";
import StatsSection from "@/components/home/StatsSection";
import FeatureCards from "@/components/home/FeatureCards";
import AboutSection from "@/components/home/AboutSection";
import DataGrid from "@/components/home/DataGrid";
import Faq from "@/components/home/Faq";
import Footer from "@/components/home/Footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen" style={{ background: "#050505" }}>
      <Hero />

      {/* spacer so the hero is visible first */}
      <div id="top" className="h-screen" />

      {/* content slides over the fixed hero */}
      <div
        className="relative z-10"
        style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,.06)", boxShadow: "0 -40px 80px rgba(0,0,0,.6)" }}
      >
        <StatsSection />
        <FeatureCards />
        <AboutSection />
        <DataGrid />
        <Faq />
        <Footer />
      </div>
    </div>
  );
}
