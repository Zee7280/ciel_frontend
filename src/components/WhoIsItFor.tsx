"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePlatformStats } from "@/utils/usePlatformStats";
import { HomeHeader, homeCard, homeSectionMint, homeWrap } from "@/components/home/HomeChrome";

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
        description: "Post real needs, receive supervised student teams, verify with one tap.",
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
        href: "/signup?role=investor",
        border: "border-l-teal-500",
    },
];

export default function WhoIsItFor() {
    const { stats } = usePlatformStats();
    const comeBack = stats?.partners_come_back_pct ?? 0;
    const cards = segments.map((seg) =>
        seg.label === "Partners (NGO / Govt)" && comeBack > 0
            ? {
                  ...seg,
                  description: `Post real needs, receive supervised student teams, verify with one tap — ${comeBack}% of partners come back.`,
              }
            : seg,
    );
    return (
        <section className={homeSectionMint}>
            <div className={homeWrap}>
                <HomeHeader
                    align="center"
                    kicker="Built for everyone in the loop"
                    title="Who is CIEL designed for?"
                    lead="Six stakeholders, one verified dataset — each gets exactly the slice they need."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {cards.map((seg) => (
                        <div
                            key={seg.label}
                            className={`${homeCard} border-l-4 ${seg.border} p-6 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(11,37,48,.08)]`}
                        >
                            <span className="text-2xl" aria-hidden>{seg.emoji}</span>
                            <h3 className="mt-3 text-lg font-black tracking-tight text-ciel-navy">
                                {seg.label}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                {seg.description}
                            </p>
                            <Link
                                href={seg.href}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-ciel-teal hover:text-[#0a635c]"
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
