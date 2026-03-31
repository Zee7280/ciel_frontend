import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhoIsItFor from "@/components/WhoIsItFor";
import HowWeWork from "@/components/HowWeWork";
import FeaturesBar from "@/components/FeaturesBar";
import ImpactSnapshot from "@/components/ImpactSnapshot";
import WhyItMatters from "@/components/WhyItMatters";
import FinalCTA from "@/components/FinalCTA";
import StoriesGrid from "@/components/StoriesGrid";
import PartnersFooter from "@/components/PartnersFooter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <Navbar />
      <Hero />
      <WhoIsItFor />
      <HowWeWork />
      <FeaturesBar />
      <ImpactSnapshot />
      <WhyItMatters />
      <FinalCTA />
      <StoriesGrid />
      <PartnersFooter />
      <Footer />
    </main>
  );
}
