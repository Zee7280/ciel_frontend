"use client";

import { BarChart3, Globe2, Award, CheckSquare, TrendingUp, LayoutDashboard } from "lucide-react";

const benefits = [
    {
        icon: BarChart3,
        emoji: "📊",
        title: "Track Real Impact",
        description: "Automatically record activities, hours, and outputs every session — no manual paperwork.",
        bg: "bg-violet-50",
        border: "border-violet-100",
        iconBg: "bg-violet-100 text-violet-700",
        tag: "bg-violet-100 text-violet-600",
        tagLabel: "Core Feature",
    },
    {
        icon: Globe2,
        emoji: "🌍",
        title: "Align with SDGs",
        description: "Every project maps to UN Sustainable Development Goals — your work matters globally.",
        bg: "bg-sky-50",
        border: "border-sky-100",
        iconBg: "bg-sky-100 text-sky-700",
        tag: "bg-sky-100 text-sky-600",
        tagLabel: "Global Standard",
    },
    {
        icon: Award,
        emoji: "🎓",
        title: "Earn Verified Certificates",
        description: "Proof of your real contribution — not just participation. HEC-recognized and digitally signed.",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        iconBg: "bg-emerald-100 text-emerald-700",
        tag: "bg-emerald-100 text-emerald-600",
        tagLabel: "HEC Recognized",
    },
    {
        icon: CheckSquare,
        emoji: "🤝",
        title: "Verified by Partners",
        description: "External NGOs, organizations, and faculty verify your outcomes — ensuring unmatched credibility.",
        bg: "bg-orange-50",
        border: "border-orange-100",
        iconBg: "bg-orange-100 text-orange-700",
        tag: "bg-orange-100 text-orange-600",
        tagLabel: "Third-Party Verified",
    },
    {
        icon: TrendingUp,
        emoji: "📈",
        title: "Get Your CII Score",
        description: "See your Community Impact Index — one powerful number that summarizes your total engagement.",
        bg: "bg-rose-50",
        border: "border-rose-100",
        iconBg: "bg-rose-100 text-rose-700",
        tag: "bg-rose-100 text-rose-600",
        tagLabel: "AI Powered",
    },
    {
        icon: LayoutDashboard,
        emoji: "🧠",
        title: "Institutional Dashboard",
        description: "Universities get full analytics, student progress tracking, and one-click report generation.",
        bg: "bg-indigo-50",
        border: "border-indigo-100",
        iconBg: "bg-indigo-100 text-indigo-700",
        tag: "bg-indigo-100 text-indigo-600",
        tagLabel: "For Universities",
    },
];

export default function FeaturesBar() {
    return (
        <section className="py-16 px-6 bg-white relative overflow-hidden">
            {/* Subtle diagonal line background */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.01)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.01)_50%,rgba(0,0,0,0.01)_75%,transparent_75%,transparent)] bg-[size:80px_80px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-xs font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Why CIEL
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                        Built Around{" "}
                        <span className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                            Your Benefits
                        </span>
                    </h2>
                    <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                        Not just features — tools that translate your work into verified, measurable impact.
                    </p>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benefits.map((benefit, i) => {
                        const Icon = benefit.icon;
                        return (
                            <div
                                key={i}
                                className={`group relative p-8 rounded-[2rem] ${benefit.bg} border ${benefit.border} hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-default`}
                            >
                                {/* Top row: icon + tag */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`w-14 h-14 rounded-2xl ${benefit.iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon className="w-7 h-7" strokeWidth={1.5} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${benefit.tag}`}>
                                        {benefit.tagLabel}
                                    </span>
                                </div>

                                {/* Emoji + Title */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{benefit.emoji}</span>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                        {benefit.title}
                                    </h3>
                                </div>

                                {/* Description */}
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    {benefit.description}
                                </p>

                                {/* Decorative corner glow */}
                                <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/60 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
