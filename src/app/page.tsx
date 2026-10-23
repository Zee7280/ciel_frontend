import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ImpactStrip from "@/components/ImpactStrip";
import SdgStickerMarquee from "@/components/SdgStickerMarquee";
import WhereImpactLives from "@/components/WhereImpactLives";
import ImpactMap from "@/components/ImpactMap";
import SdgImpactWheel from "@/components/SdgImpactWheel";
import ImpactCalculator from "@/components/ImpactCalculator";
import LiveProjectsShowcase from "@/components/LiveProjectsShowcase";
import ShowcaseSpotlight from "@/components/ShowcaseSpotlight";
import WhoIsItFor from "@/components/WhoIsItFor";
import HowWeWork from "@/components/HowWeWork";
import FeaturesBar from "@/components/FeaturesBar";
import ImpactSnapshot from "@/components/ImpactSnapshot";
import FinalCTA from "@/components/FinalCTA";
import PartnersFooter from "@/components/PartnersFooter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#F5FAF9] font-sans">
      <Navbar />
      <Hero />
      <ImpactStrip />
      <SdgStickerMarquee />
      {/* Below the fold: rendered when scrolled near (see .cv-auto in globals.css). */}
      {[
        <WhereImpactLives key="where" />,
        <ImpactMap key="map" />,
        <SdgImpactWheel key="wheel" />,
        <ImpactCalculator key="calculator" />,
        <LiveProjectsShowcase key="live" />,
        <ImpactSnapshot key="snapshot" />,
        <ShowcaseSpotlight key="spotlight" />,
        <WhoIsItFor key="who" />,
        <HowWeWork key="how" />,
        <FeaturesBar key="features" />,
        <FinalCTA key="cta" />,
        <PartnersFooter key="partners" />,
        <Footer key="footer" />,
      ].map((section) => (
        <div key={section.key} className="cv-auto">
          {section}
        </div>
      ))}
    </main>
  );
}
