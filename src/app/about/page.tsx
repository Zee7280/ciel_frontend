import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import Image from "next/image";
import { Target, Lightbulb, Users } from "lucide-react";

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            {/* Header */}
            <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 animate-fade-in-up">
                    About <span className="text-blue-600">CIEL Pakistan</span>
                </h1>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    Community Impact Education Lab (CIEL) is a platform bridging the gap between academia and community development. We empower youth to create measurable, sustainable impact.
                </p>
            </section>

            {/* Mission & Vision */}
            <section className="py-16 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            title: "Our Mission",
                            desc: "To connect universities, students, and communities to solve real-world challenges through data-driven projects.",
                            icon: Target,
                            color: "text-blue-600",
                            bg: "bg-blue-50"
                        },
                        {
                            title: "Our Vision",
                            desc: "A future where every student contributes to national development goals while gaining practical experience.",
                            icon: Lightbulb,
                            color: "text-amber-500",
                            bg: "bg-amber-50"
                        },
                        {
                            title: "Our Community",
                            desc: "A network of 8,500+ students and 300+ NGOs working together for the Sustainable Development Goals (SDGs).",
                            icon: Users,
                            color: "text-green-600",
                            bg: "bg-green-50"
                        }
                    ].map((item, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all animate-fade-in-up" style={{ animationDelay: `${(index + 2) * 100}ms` }}>
                            <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center mb-6`}>
                                <item.icon className={`w-7 h-7 ${item.color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Image/ Story Section */}
            <section className="py-16 px-6 max-w-7xl mx-auto">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden text-white">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Driven by Data, Powered by Youth</h2>
                        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                            Since 2026, CIEL has transformed how universities engage with society. specialized in geodata and impact analytics, we ensure every hour volunteered translates into visible progress.
                        </p>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
                </div>
            </section>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}
