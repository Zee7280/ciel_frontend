"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const segments = [
    {
        emoji: "🧑‍🎓",
        label: "Students",
        description: "A verified portfolio across all four paths — hours, certificates, competency growth, and a CII score employers trust.",
        cta: "Start free",
        href: "/signup?role=student",
        border: "border-l-emerald-500",
    },
    {
        emoji: "👩‍🏫",
        label: "Faculty",
        description: "One approvals inbox, automatic reminders, and supervision analytics citable in promotion cases.",
        cta: "See the faculty hub",
        href: "/signup?role=faculty",
        border: "border-l-blue-500",
    },
    {
        emoji: "🏛️",
        label: "Universities",
        description: "HEC reports auto-generated, THE Impact Rankings evidence, and a league position worth competing for.",
        cta: "Institutional demo",
        href: "/signup?role=university",
        border: "border-l-violet-500",
    },
    {
        emoji: "🤝",
        label: "Partners (NGO / Govt)",
        description: "Post real needs, receive supervised student teams, verify with one tap — 46% of partners come back.",
        cta: "Partner with us",
        href: "/signup?role=ngo",
        border: "border-l-amber-500",
    },
    {
        emoji: "🏢",
        label: "Corporates (CSR)",
        description: "ESG-ready, verified line-items showing exactly where CSR money lands — no impact-washing possible.",
        cta: "Sponsor verified impact",
        href: "/signup?role=corporate",
        border: "border-l-pink-500",
    },
    {
        emoji: "💼",
        label: "Investors",
        description: "Subscribe to the venture marketplace: faculty-gated student startups with verified traction and honest stages.",
        cta: "Browse the marketplace",
        href: "/projects",
        border: "border-l-teal-500",
    },
];

export default function WhoIsItFor() {
    return (
        <section className="py-20 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">
                        Built for everyone in the loop
                    </p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Who is CIEL designed for?
                    </h2>
                    <p className="text-base text-slate-500 font-medium max-w-xl mx-auto mt-3">
                        Six stakeholders, one verified dataset — each gets exactly the slice they need.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {segments.map((seg) => (
                        <div
                            key={seg.label}
                            className={`rounded-2xl border border-slate-200 border-l-4 ${seg.border} bg-white p-6 transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/60`}
                        >
                            <span className="text-2xl" aria-hidden>{seg.emoji}</span>
                            <h3 className="mt-3 text-lg font-black text-slate-900 tracking-tight">
                                {seg.label}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                {seg.description}
                            </p>
                            <Link
                                href={seg.href}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                {seg.cta} <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
