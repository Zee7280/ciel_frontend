"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
    value: number;
    suffix: string;
    label: string;
    /** Only the hours figure is a live, still-growing count — the rest are fixed facts about the platform's current shape, not metrics to inflate. */
    live?: boolean;
}

type PlatformStatsData = {
    engagement_hours?: unknown;
    impact_hours?: unknown;
};

type PlatformStatsResponse = {
    success?: boolean;
    data?: PlatformStatsData;
};

const defaultStats: Stat[] = [
    { value: 1840, suffix: "+", label: "Verified hours — live & counting", live: true },
    { value: 1, suffix: "", label: "Founding university — BNU pilot live" },
    { value: 4, suffix: "", label: "Impact paths — open for records" },
    { value: 17, suffix: "", label: "SDGs mapped in plain language" },
    { value: 3, suffix: "", label: "Locks per record — student · faculty · partner" },
    { value: 0, suffix: "", label: "Fake numbers — ever" },
];

function normalizeCount(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

function buildStats(data?: PlatformStatsData): Stat[] {
    return defaultStats.map((stat) =>
        stat.live ? { ...stat, value: normalizeCount(data?.engagement_hours ?? data?.impact_hours, stat.value) } : stat,
    );
}

function AnimatedCounter({ target, suffix, duration = 2000 }: { target: number; suffix: string; duration?: number }) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [started, target, duration]);

    return (
        <span ref={ref}>
            {count.toLocaleString()}{suffix}
        </span>
    );
}

export default function ImpactSnapshot() {
    const [stats, setStats] = useState<Stat[]>(defaultStats);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await fetch("/api/v1/public/platform-stats", {
                    headers: { Accept: "application/json" },
                    cache: "no-store",
                });
                const payload = (await response.json().catch(() => null)) as PlatformStatsResponse | null;

                if (!cancelled && response.ok && payload?.success && payload.data) {
                    setStats(buildStats(payload.data));
                }
            } catch {
                // Keep the marketing-safe defaults if live stats are temporarily unavailable.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section id="platform-impact" className="relative overflow-hidden bg-ciel-navy py-24 px-6">
            {/* Soft glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 bg-ciel-green/5 blur-[140px]" />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-14">
                    <p className="text-xs font-black uppercase tracking-widest text-ciel-green mb-4">
                        Live impact — the honest version
                    </p>

                    <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-tight">
                        We publish only what&apos;s verified. We&apos;re just getting started.
                    </h2>

                    <p className="text-base md:text-lg text-white/60 font-medium max-w-xl mx-auto mt-5">
                        Every number on this page traces to attendance evidence, faculty sign-off, and partner confirmation — which is why most tiles below aren&apos;t numbers yet. They will be.
                    </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-7 text-center"
                        >
                            <div className="text-3xl font-black text-ciel-green tabular-nums tracking-tight">
                                {stat.live ? (
                                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                ) : (
                                    `${stat.value}${stat.suffix}`
                                )}
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Community Dividend callout */}
                <div className="mt-6 rounded-2xl border border-ciel-green/30 bg-ciel-green/5 px-6 py-5 text-center sm:px-10">
                    <p className="text-sm md:text-base leading-relaxed text-white/85">
                        <span aria-hidden>💞 </span>
                        <span className="font-bold text-white">The Community Dividend:</span>{" "}
                        CIEL values every verified volunteer hour (PKR 500/hr) and every rupee students spend from their own pockets. When the first semester closes, Pakistan will see — to the rupee — how much communities invest in themselves. On CIEL, communities aren&apos;t recipients. They&apos;re investors.
                    </p>
                </div>
            </div>
        </section>
    );
}
