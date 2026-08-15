"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PATH_CARDS = [
    { key: "community-service", emoji: "⛺", title: "Community Service", description: "Real field hours, verified end-to-end", stat: "1,840 hrs verified" },
    { key: "course-project", emoji: "📚", title: "Course Projects", description: "Your class work, on the SDG map", stat: "67 records · free" },
    { key: "fyp-thesis", emoji: "🎓", title: "FYP / Thesis", description: "Research that gets showcased", stat: "7 showcase stars" },
    { key: "startup-business", emoji: "💼", title: "Startups", description: "Ventures investors can find", stat: "PKR 4.2M pipeline" },
];

const TRUST_BADGES = [
    { emoji: "✅", text: "HEC-recognized certificates" },
    { emoji: "🤝", text: "37 partner orgs" },
];

export default function Hero() {
    /** Real verified-university count from the platform-stats endpoint — falls back to "12" (unlabeled placeholder) until it loads. */
    const [universityCount, setUniversityCount] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/v1/public/platform-stats", { headers: { Accept: "application/json" }, cache: "no-store" })
            .then((res) => res.json())
            .then((payload) => {
                if (cancelled) return;
                const n = Number(payload?.data?.universities);
                if (Number.isFinite(n) && n >= 0) setUniversityCount(n);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const universityBadgeText =
        universityCount == null
            ? "12 universities"
            : `${universityCount} ${universityCount === 1 ? "university" : "universities"}`;

    return (
        <section className="relative overflow-hidden bg-ciel-navy">
            {/* Soft Background Glow */}
            <div className="pointer-events-none absolute right-0 top-0 -z-0 h-[600px] w-[700px] bg-ciel-green/10 blur-[140px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 -z-0 h-[500px] w-[500px] bg-ciel-green/5 blur-[120px]" />

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-20 md:px-10 lg:py-28">
                <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-stretch lg:justify-between lg:gap-12">

                    {/* LEFT CONTENT */}
                    <div className="max-w-2xl flex-1 text-center lg:text-left">
                        <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-ciel-green">
                            Pakistan&apos;s Verified Impact Platform
                        </p>

                        <h1 className="text-4xl font-black leading-[1.15] tracking-tight text-white md:text-5xl lg:text-[52px]">
                            Every contribution has a story.
                            <br />
                            <span className="text-ciel-green">CIEL turns it into a legacy of impact.</span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 md:text-lg lg:mx-0">
                            From community service and academic projects to research and entrepreneurship, CIEL verifies, measures, and showcases meaningful contributions aligned with the SDGs — connecting students, universities, communities, employers, partners, and investors through one trusted impact record.
                        </p>

                        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                            <Link
                                href="/signup"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ciel-green px-8 py-4 text-center text-base font-bold text-ciel-navy shadow-xl shadow-black/20 transition-all duration-300 hover:bg-ciel-green-deep hover:text-white sm:w-auto"
                            >
                                Pick your path <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/#how-it-works"
                                className="w-full rounded-xl border-2 border-white/20 px-8 py-4 text-center text-base font-bold text-white transition-all duration-300 hover:bg-white/5 sm:w-auto"
                            >
                                How it works
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start">
                            {TRUST_BADGES.map((badge) => (
                                <span key={badge.text} className="flex items-center gap-2 text-sm font-semibold text-white/60">
                                    <span aria-hidden>{badge.emoji}</span>
                                    {badge.text}
                                </span>
                            ))}
                            <span className="flex items-center gap-2 text-sm font-semibold text-white/60">
                                <span aria-hidden>🏫</span>
                                {universityBadgeText}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT - PATH CARDS */}
                    <div className="flex w-full flex-1 items-stretch justify-center lg:max-w-[580px] lg:justify-end">
                        <div className="grid h-full w-full max-w-[520px] grid-cols-2 grid-rows-2 gap-4 sm:max-w-[560px] lg:max-w-none lg:gap-5">
                            {PATH_CARDS.map((card) => (
                                <Link
                                    key={card.key}
                                    href={`/?path=${card.key}#where-your-impact-lives`}
                                    scroll={true}
                                    className="group flex h-full min-h-[168px] flex-col rounded-2xl border border-white/10 bg-white/5 p-5 sm:min-h-[180px] sm:p-6 lg:min-h-0 lg:p-7 transition-all duration-200 hover:border-ciel-green/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                                >
                                    <span className="text-2xl sm:text-3xl" aria-hidden>{card.emoji}</span>
                                    <p className="mt-3 text-sm font-bold text-white sm:text-base">{card.title}</p>
                                    <p className="mt-1.5 text-xs leading-snug text-white/50 sm:text-sm">{card.description}</p>
                                    <p className="mt-auto pt-4 flex items-center gap-1 text-xs font-bold text-ciel-green sm:text-sm">
                                        {card.stat}
                                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
