import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SdgStickerMarquee from "@/components/SdgStickerMarquee";
import WhoIsItFor from "@/components/WhoIsItFor";
import HowWeWork from "@/components/HowWeWork";
import FeaturesBar from "@/components/FeaturesBar";
import ImpactSnapshot from "@/components/ImpactSnapshot";
import FinalCTA from "@/components/FinalCTA";
import StoriesGrid from "@/components/StoriesGrid";
import PartnersFooter from "@/components/PartnersFooter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <Navbar />
      <Hero />
      <SdgStickerMarquee />
      <ImpactSnapshot />
      <WhoIsItFor />
      <HowWeWork />
      <FeaturesBar />
      <FinalCTA />
      <StoriesGrid />
      <PartnersFooter />
      <Footer />
    </main>
  );
}
