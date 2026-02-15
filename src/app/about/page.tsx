import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import { Target, Lightbulb, Shield, FileText, Zap, Users, Heart, UserCheck, TrendingUp } from "lucide-react";

export default function AboutPage() {
    const coreValues = [
        {
            title: "Impact with Integrity",
            desc: "We prioritize real, measurable community outcomes and uphold honesty, ethics, and accountability in all engagement.",
            icon: Shield,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            title: "Evidence Before Claims",
            desc: "We believe impact must be documented, verified, and data-driven; not assumed.",
            icon: FileText,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "Learning Through Action",
            desc: "We value experiential education where students grow by solving real-world challenges.",
            icon: Zap,
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            title: "Collaboration for Change",
            desc: "We bring together universities, communities, partners, and institutions to create collective progress.",
            icon: Users,
            color: "text-indigo-600",
            bg: "bg-indigo-50"
        },
        {
            title: "Equity & Inclusion",
            desc: "We ensure opportunities and impact benefit diverse communities and voices.",
            icon: Heart,
            color: "text-rose-500",
            bg: "bg-rose-50"
        },
        {
            title: "Innovation with Purpose",
            desc: "We use technology and systems thinking to improve how education contributes to society.",
            icon: Lightbulb,
            color: "text-yellow-500",
            bg: "bg-yellow-50"
        },
        {
            title: "Accountability to Communities",
            desc: "We respect the dignity, privacy, and well-being of the communities we serve.",
            icon: UserCheck,
            color: "text-cyan-600",
            bg: "bg-cyan-50"
        },
        {
            title: "Intelligence for Progress",
            desc: "We generate actionable impact intelligence that helps institutions make informed, responsible decisions.",
            icon: TrendingUp,
            color: "text-violet-600",
            bg: "bg-violet-50"
        }
    ];

    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            {/* Header / Intro */}
            <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 animate-fade-in-up">
                    About <span className="text-emerald-600">CIEL Pakistan</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-700 max-w-4xl mx-auto leading-relaxed animate-fade-in-up font-medium" style={{ animationDelay: '100ms' }}>
                    <span className="font-bold text-slate-900">CIEL Pakistan</span> is a Community Impact Education Lab turning student learning into measurable community change and actionable impact intelligence.
                </p>
                <p className="mt-4 text-base md:text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    By linking universities, students, and partners through a structured evidence system, CIEL converts real-world engagement into certified data; empowering institutions to measure, understand, and expand their role in sustainable development.
                </p>
            </section>

            {/* Vision & Mission */}
            <section className="py-12 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Vision */}
                    <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-all">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500">
                            <Lightbulb className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
                        <p className="text-xl font-medium text-slate-700 italic">
                            &quot;Education that creates impact. Impact that creates intelligence.&quot;
                        </p>
                    </div>

                    {/* Mission */}
                    <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-all">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
                            <Target className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            To make education produce real, measurable change in communities through verified, data-driven experiential learning.
                        </p>
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="py-16 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Core Values</h2>
                    <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {coreValues.map((item, index) => (
                        <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all">
                            <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Short Version Ticker */}
                <div className="mt-16 pt-8 border-t border-slate-200">
                    <p className="text-center text-sm md:text-base font-bold text-slate-400 tracking-widest uppercase flex flex-wrap justify-center gap-x-4 gap-y-2">
                        <span>Integrity</span> •
                        <span>Evidence</span> •
                        <span>Learning</span> •
                        <span>Collaboration</span> •
                        <span>Inclusion</span> •
                        <span>Innovation</span> •
                        <span>Accountability</span> •
                        <span className="text-emerald-600">Impact Intelligence</span>
                    </p>
                </div>
            </section>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}
