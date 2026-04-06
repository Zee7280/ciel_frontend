"use client";

import { BarChart3, Globe2, Award, CheckSquare, TrendingUp, LayoutDashboard } from "lucide-react";

const benefits = [
    {
        icon: BarChart3,
        emoji: "📊",
        title: "Track Real Impact",
        description: "Automatically record activities, hours, and outputs every session — no manual paperwork.",
        bg: "bg-slate-50",
        border: "border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        tag: "bg-slate-50 text-[#4285F4]",
        tagLabel: "Core Feature",
    },
    {
        icon: Globe2,
        emoji: "🌍",
        title: "Align with SDGs",
        description: "Every project maps to UN Sustainable Development Goals — your work matters globally.",
        bg: "bg-slate-50",
        border: "border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        tag: "bg-slate-50 text-[#4285F4]",
        tagLabel: "Global Standard",
    },
    {
        icon: Award,
        emoji: "🎓",
        title: "Earn Verified Certificates",
        description: "Proof of your real contribution — not just participation. HEC-recognized and digitally signed.",
        bg: "bg-slate-50",
        border: "border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        tag: "bg-slate-50 text-[#4285F4]",
        tagLabel: "HEC Recognized",
    },
    {
        icon: CheckSquare,
        emoji: "🤝",
        title: "Verified by Partners",
        description: "External NGOs, organizations, and faculty verify your outcomes — ensuring unmatched credibility.",
        bg: "bg-slate-50",
        border: "border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        tag: "bg-slate-50 text-[#4285F4]",
        tagLabel: "Third-Party Verified",
    },
    {
        icon: TrendingUp,
        emoji: "📈",
        title: "Get Your CII Score",
        description: "See your Community Impact Index — one powerful number that summarizes your total engagement.",
        bg: "bg-slate-50",
        border: "border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        tag: "bg-slate-50 text-[#4285F4]",
        tagLabel: "AI Powered",
    },
    {
        icon: LayoutDashboard,
        emoji: "🧠",
        title: "Institutional Dashboard",
        description: "Universities get full analytics, student progress tracking, and one-click report generation.",
        bg: "bg-slate-50",
        border: "border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        tag: "bg-slate-50 text-[#4285F4]",
        tagLabel: "For Universities",
    },
];

export default function FeaturesBar() {
    return (
        <section className="py-24 px-6 bg-white relative overflow-hidden">
            {/* Subtle diagonal line background */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.01)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.01)_50%,rgba(0,0,0,0.01)_75%,transparent_75%,transparent)] bg-[size:80px_80px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-xs font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-50 animate-pulse" />
                        Platform Capability
                    </div>

                    <div className="relative inline-block mb-4">
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
                            Exclusive{" "}
                            <span className="text-[#3A72AA]">
                                Features
                            </span>
                        </h2>
                        {/* Wavy Underline (Green) */}
                        <svg className="absolute -bottom-3 left-0 w-full h-3 text-[#34A853]/30" preserveAspectRatio="none" viewBox="0 0 100 10" fill="none">
                            <path d="M0 5Q 25 0 50 5 Q 75 10 100 5" stroke="currentColor" strokeWidth="4" />
                        </svg>
                    </div>

                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-xl mx-auto mt-6">
                        Not just features — tools that translate your work into verified, measurable impact.
                    </p>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { icon: BarChart3, title: "Track Real Impact", description: "Automatically record activities, hours, and outputs every session.", iconBg: "bg-blue-50 text-blue-600" },
                        { icon: Globe2, title: "Align with SDGs", description: "Every project maps to UN Sustainable Development Goals.", iconBg: "bg-amber-50 text-amber-600" },
                        { icon: Award, title: "Earn Verified Certificates", description: "Proof of your real contribution. HEC-recognized and signed.", iconBg: "bg-emerald-50 text-emerald-600" },
                        { icon: CheckSquare, title: "Verified by Partners", description: "External NGOs and organizations verify your outcomes.", iconBg: "bg-rose-50 text-rose-600" },
                        { icon: TrendingUp, title: "Get Your CII Score", description: "See your Community Impact Index — your total engagement score.", iconBg: "bg-sky-50 text-sky-600" },
                        { icon: LayoutDashboard, title: "Institutional Dashboard", description: "Universities get full analytics and progress tracking.", iconBg: "bg-amber-50 text-amber-600" }
                    ].map((benefit, i) => {
                        const Icon = benefit.icon;
                        return (
                            <div
                                key={i}
                                className="group relative p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-default"
                            >
                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl ${benefit.iconBg} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="w-8 h-8" strokeWidth={1.5} />
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug mb-4">
                                    {benefit.title}
                                </h3>

                                {/* Description */}
                                <p className="text-[15px] font-medium text-slate-500 leading-relaxed">
                                    {benefit.description}
                                </p>

                                {/* Decorative corner glow */}
                                <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-slate-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
