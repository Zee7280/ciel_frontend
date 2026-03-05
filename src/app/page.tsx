import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturesBar from "@/components/FeaturesBar";
import HowWeWork from "@/components/HowWeWork";
import StoriesGrid from "@/components/StoriesGrid";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <Navbar />
      <Hero />
      <FeaturesBar />
      <HowWeWork />
      <StoriesGrid />
      <PartnersFooter />
      <FooterBanner />
      <Footer />
    </main>
  );
}
