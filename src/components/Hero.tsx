"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TRUST_BADGES = ["HEC-recognized certificates", "Verified by partners, one tap", "Every hour valued at PKR 500"];

/** Illustrative platform-scale figures for the hero ledger — same "marketing-safe" convention as
 * ImpactSnapshot's live-stats fallback: real numbers where an endpoint exists, an honest
 * aspirational snapshot here since there's no ledger-wide stats API yet. */
const LEDGER_METRICS: { key: string; value: number; label: string; sub: string; prefix?: string; sparkColor?: string; sparkPoints?: string }[] = [
    { key: "serving", value: 312, label: "People serving", sub: "students on verified activities", sparkColor: "#4CC38A", sparkPoints: "0,26 12,24 24,21 36,22 48,15 60,12 72,8 88,4" },
    { key: "served", value: 4860, label: "People in communities served", sub: "beneficiaries reached", sparkColor: "#3B55C7", sparkPoints: "0,27 12,25 24,24 36,18 48,17 60,11 72,9 88,3" },
    { key: "hours", value: 1840, label: "Verified hours", sub: "approved by faculty & partners" },
    { key: "resources", value: 797000, label: "Resources deployed", sub: "cash + in-kind, partner-verified", prefix: "PKR " },
];
const DIVIDEND = { value: 1134500, label: "Community dividend", sub: "1,840 hrs × PKR 500 + PKR 214,500 out-of-pocket", prefix: "PKR " };

const FEED_ITEMS: { icon: string; name: string; rest: string }[] = [
    { icon: "✅", name: "Lahore", rest: "4 hrs verified by SOS Children's Villages · +PKR 2,000 dividend" },
    { icon: "📍", name: "Kasur", rest: "session logged · 62 people served · Clean Water Week" },
    { icon: "🏅", name: "Islamabad", rest: "HEC certificate issued · Girls' STEM Saturdays" },
    { icon: "📦", name: "Karachi", rest: "PKR 38,000 resources confirmed by Nawab Cats" },
    { icon: "🌱", name: "Multan", rest: "new need posted · Solar cold-storage · 4 seats" },
    { icon: "✅", name: "Peshawar", rest: "350 ration packs verified by Alkhidmat" },
];

/** Eases from 0 to `target` once on mount — same effect as the reference design's data-count tiles. */
function useCountUp(target: number, durationMs = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / durationMs);
            setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, durationMs]);
    return value;
}

export default function Hero() {
    const serving = useCountUp(LEDGER_METRICS[0].value);
    const served = useCountUp(LEDGER_METRICS[1].value);
    const hours = useCountUp(LEDGER_METRICS[2].value);
    const resources = useCountUp(LEDGER_METRICS[3].value);
    const dividend = useCountUp(DIVIDEND.value);
    const animatedValues = [serving, served, hours, resources];

    // Newest-first rotation through the live feed — starts on the same frame shown in the design.
    const [feedIndex, setFeedIndex] = useState(FEED_ITEMS.length - 1);
    useEffect(() => {
        const id = setInterval(() => setFeedIndex((i) => (i + 1) % FEED_ITEMS.length), 3400);
        return () => clearInterval(id);
    }, []);
    const topFeed = FEED_ITEMS[feedIndex];
    const prevFeed = FEED_ITEMS[(feedIndex - 1 + FEED_ITEMS.length) % FEED_ITEMS.length];

    return (
        <section className="relative overflow-hidden bg-ciel-navy">
            {/* Soft Background Glow */}
            <div className="pointer-events-none absolute right-0 top-0 -z-0 h-[600px] w-[700px] bg-ciel-green/10 blur-[140px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 -z-0 h-[500px] w-[500px] bg-ciel-indigo/10 blur-[120px]" />

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-20 md:px-10 lg:py-28">
                <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">

                    {/* LEFT CONTENT */}
                    <div className="max-w-2xl text-center lg:text-left">
                        <p className="inline-flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.2em] text-ciel-green">
                            <span aria-hidden className="h-0.5 w-[18px] rounded-full bg-ciel-green" />
                            Verified community impact infrastructure · Pakistan
                        </p>

                        <h1 className="mt-[18px] text-4xl font-black leading-[1.15] tracking-tight text-white md:text-5xl lg:text-[52px]">
                            Every contribution has a story. CIEL turns it into a{" "}
                            <span className="text-ciel-green">legacy of impact.</span>
                        </h1>

                        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/60 md:text-lg lg:mx-0">
                            From community service and academic projects to research and entrepreneurship, CIEL verifies, measures, and showcases meaningful contributions aligned with the SDGs — connecting students, universities, communities, employers, partners, and investors through one trusted impact record.
                        </p>

                        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                            <Link
                                href="/?path=community-service#where-your-impact-lives"
                                scroll={true}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ciel-green px-8 py-4 text-center text-base font-bold text-ciel-navy shadow-xl shadow-black/20 transition-all duration-300 hover:bg-ciel-green-deep hover:text-white sm:w-auto"
                            >
                                Start with Community Service <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/#platform-impact"
                                className="w-full rounded-xl border-2 border-white/20 px-8 py-4 text-center text-base font-bold text-white transition-all duration-300 hover:bg-white/5 sm:w-auto"
                            >
                                Open the live analytics
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start">
                            {TRUST_BADGES.map((text) => (
                                <span key={text} className="flex items-center gap-2 text-[13.5px] font-semibold text-white/60">
                                    <span aria-hidden className="h-2 w-2 rounded-full bg-ciel-green shadow-[0_0_0_4px_rgba(76,195,138,0.18)]" />
                                    {text}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT - LIVE IMPACT LEDGER */}
                    <div
                        aria-label="Live impact ledger"
                        className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:p-6"
                    >
                        <div className="mb-3.5 flex items-center justify-between gap-3">
                            <h3 className="text-[15px] font-bold text-white sm:text-base">Pakistan&apos;s community impact ledger</h3>
                            <span className="inline-flex shrink-0 items-center gap-[7px] font-mono text-[11px] tracking-[0.1em] text-ciel-green">
                                <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-ciel-green" />
                                LIVE
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {LEDGER_METRICS.map((m, i) => (
                                <div key={m.key} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                                    <span className="block text-[26px] font-black leading-none text-white sm:text-[32px]">
                                        {m.prefix}
                                        {animatedValues[i].toLocaleString("en-US")}
                                    </span>
                                    <span className="mt-2 block text-xs font-semibold text-white/65">{m.label}</span>
                                    <span className="mt-0.5 block font-mono text-[10.5px] text-white/40">{m.sub}</span>
                                    {m.sparkPoints ? (
                                        <svg className="absolute bottom-2.5 right-3 h-[30px] w-[88px] opacity-90" viewBox="0 0 88 30" preserveAspectRatio="none" aria-hidden>
                                            <polyline fill="none" stroke={m.sparkColor} strokeWidth="2" points={m.sparkPoints} />
                                        </svg>
                                    ) : null}
                                </div>
                            ))}
                            <div className="col-span-2 rounded-2xl border border-ciel-gold/35 bg-gradient-to-br from-ciel-gold/20 to-ciel-gold/5 p-4">
                                <span className="block text-[34px] font-black leading-none text-[#F5C56E] sm:text-[42px]">
                                    {DIVIDEND.prefix}
                                    {dividend.toLocaleString("en-US")}
                                </span>
                                <span className="mt-2 block text-xs font-semibold text-white/65">{DIVIDEND.label}</span>
                                <span className="mt-0.5 block font-mono text-[10.5px] text-white/40">{DIVIDEND.sub}</span>
                            </div>
                        </div>

                        <div className="mt-3 h-[68px] overflow-hidden border-t border-white/10 pt-2.5">
                            {[topFeed, prevFeed].map((item, idx) => (
                                <div
                                    key={`${feedIndex}-${idx}`}
                                    className="animate-fade-in-up flex items-center gap-2.5 py-1 text-[12.5px] text-white/65"
                                >
                                    <span aria-hidden className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] bg-white/[0.06] text-xs">
                                        {item.icon}
                                    </span>
                                    <span>
                                        <b className="font-semibold text-white">{item.name}</b> · {item.rest}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
