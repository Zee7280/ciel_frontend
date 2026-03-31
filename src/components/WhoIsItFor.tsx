"use client";

import { GraduationCap, Building2, Handshake, Briefcase, ChevronRight } from "lucide-react";

const segments = [
    {
        emoji: "👨‍🎓",
        icon: GraduationCap,
        label: "Students",
        headline: "Build a Verified Impact Portfolio",
        bullets: [
            "Track hours & document every session",
            "Earn HEC-recognized certificates",
            "Measure your community impact score",
        ],
        accent: "from-violet-500 to-indigo-600",
        bg: "bg-violet-50",
        border: "border-violet-100",
        badge: "bg-violet-100 text-violet-700",
        dot: "bg-violet-500",
        cta: "text-violet-600",
    },
    {
        emoji: "🏫",
        icon: Building2,
        label: "Universities",
        headline: "Meet HEC Requirements Effortlessly",
        bullets: [
            "Monitor all student engagements live",
            "Auto-generate institutional reports",
            "Full audit trail for accreditation",
        ],
        accent: "from-sky-500 to-blue-600",
        bg: "bg-sky-50",
        border: "border-sky-100",
        badge: "bg-sky-100 text-sky-700",
        dot: "bg-sky-500",
        cta: "text-sky-600",
    },
    {
        emoji: "🤝",
        icon: Handshake,
        label: "Partners (NGOs / Govt)",
        headline: "Collaborate With Verified Students",
        bullets: [
            "Post real community challenges",
            "Verify project outcomes",
            "Track beneficiary impact data",
        ],
        accent: "from-emerald-500 to-teal-600",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        badge: "bg-emerald-100 text-emerald-700",
        dot: "bg-emerald-500",
        cta: "text-emerald-600",
    },
    {
        emoji: "🏢",
        icon: Briefcase,
        label: "Corporates (CSR)",
        headline: "Prove Your SDG Impact",
        bullets: [
            "Measure real SDG contributions",
            "Generate ESG-ready reports",
            "Verified community outcome data",
        ],
        accent: "from-orange-500 to-amber-600",
        bg: "bg-orange-50",
        border: "border-orange-100",
        badge: "bg-orange-100 text-orange-700",
        dot: "bg-orange-500",
        cta: "text-orange-600",
    },
];

export default function WhoIsItFor() {
    return (
        <section className="py-16 px-6 bg-white relative overflow-hidden text-center">
            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-xs font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Built for you
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                        Who Is CIEL{" "}
                        <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                            Designed For?
                        </span>
                    </h2>
                    <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                        One platform, four stakeholders — all connected around verified community impact.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {segments.map((seg, i) => (
                        <div
                            key={i}
                            className={`group relative rounded-[2rem] p-8 ${seg.bg} border ${seg.border} hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-default`}
                        >
                            {/* Gradient top bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${seg.accent} rounded-t-[2rem]`} />

                            {/* Emoji badge */}
                            <div className="mb-6">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${seg.badge} text-xs font-black uppercase tracking-widest`}>
                                    <span className="text-base">{seg.emoji}</span>
                                    {seg.label}
                                </div>
                            </div>

                            {/* Headline */}
                            <h3 className="text-xl font-black text-slate-900 leading-snug mb-5 tracking-tight">
                                {seg.headline}
                            </h3>

                            {/* Bullets */}
                            <ul className="space-y-3">
                                {seg.bullets.map((b, j) => (
                                    <li key={j} className="flex items-start gap-2.5">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${seg.dot}`} />
                                        <span className="text-sm font-medium text-slate-600 leading-relaxed">{b}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA link */}
                            <div className={`mt-7 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${seg.cta} opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0`}>
                                Learn More <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
