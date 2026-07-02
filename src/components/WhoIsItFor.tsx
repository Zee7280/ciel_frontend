"use client";

import Link from "next/link";
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
        href: "/signup?role=student",
        accent: "bg-amber-400",
        badge: "bg-amber-50 text-amber-700 border-amber-100",
        dot: "bg-amber-400",
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
        href: "/signup?role=university",
        accent: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 border-blue-100",
        dot: "bg-blue-500",
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
        href: "/signup?role=ngo",
        accent: "bg-[#12A07B]",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
        dot: "bg-[#12A07B]",
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
        href: "/signup?role=corporate",
        accent: "bg-orange-500",
        badge: "bg-orange-50 text-orange-700 border-orange-100",
        dot: "bg-orange-500",
    },
];

export default function WhoIsItFor() {
    return (
        <section className="pt-10 pb-24 px-6 md:pt-12 bg-white relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-xs font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                        Built for you
                    </div>

                    <div className="relative inline-block mb-4">
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
                            Who Is CIEL{" "}
                            <span className="text-[#3A72AA]">Designed For?</span>
                        </h2>
                        <svg
                            className="absolute -bottom-3 left-0 w-full h-3 text-[#3A72AA]/30"
                            preserveAspectRatio="none"
                            viewBox="0 0 100 10"
                            fill="none"
                            aria-hidden
                        >
                            <path d="M0 5Q 25 0 50 5 Q 75 10 100 5" stroke="currentColor" strokeWidth="4" />
                        </svg>
                    </div>

                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-xl mx-auto mt-6">
                        One platform, four stakeholders — all connected around verified community impact.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {segments.map((seg) => (
                        <div
                            key={seg.label}
                            className="group relative rounded-[2.5rem] p-10 bg-white border-2 border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${seg.accent} rounded-t-[2.5rem]`} />

                            <div className="mb-8">
                                <div
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${seg.badge} text-[10px] font-black uppercase tracking-widest`}
                                >
                                    <span className="text-lg">{seg.emoji}</span>
                                    {seg.label}
                                </div>
                            </div>

                            <h3 className="text-lg md:text-xl font-black text-slate-900 leading-snug mb-6 tracking-tight">
                                {seg.headline}
                            </h3>

                            <ul className="space-y-4">
                                {seg.bullets.map((bullet) => (
                                    <li key={bullet} className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${seg.dot}`} />
                                        <span className="text-[15px] font-bold text-slate-600 leading-relaxed">{bullet}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={seg.href}
                                className="mt-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-900 opacity-70 group-hover:opacity-100 transition-all duration-300 translate-x-[-8px] group-hover:translate-x-0"
                            >
                                Get started <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
