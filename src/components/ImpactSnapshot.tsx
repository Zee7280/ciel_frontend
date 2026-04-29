"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Clock, Globe2, Handshake, TrendingUp } from "lucide-react";

interface Stat {
    icon: React.ElementType;
    value: number;
    suffix: string;
    label: string;
    sub: string;
    color: string;
    iconBg: string;
}

type PlatformStatsData = {
    students_enrolled?: unknown;
    engagement_hours?: unknown;
    sdgs_covered?: unknown;
    active_projects?: unknown;
    avg_cii_score?: unknown;
    contributors?: unknown;
    impact_hours?: unknown;
    sdgs_impacted?: unknown;
};

type PlatformStatsResponse = {
    success?: boolean;
    data?: PlatformStatsData;
};

const defaultStats: Stat[] = [
    {
        icon: GraduationCap,
        value: 1200,
        suffix: "+",
        label: "Students Enrolled",
        sub: "Verified participants",
        color: "text-[#4285F4]",
        iconBg: "bg-slate-50",
    },
    {
        icon: Clock,
        value: 18000,
        suffix: "+",
        label: "Engagement Hours",
        sub: "Logged & verified",
        color: "text-[#4285F4]",
        iconBg: "bg-slate-50",
    },
    {
        icon: Globe2,
        value: 10,
        suffix: "",
        label: "SDGs Covered",
        sub: "Across all projects",
        color: "text-[#4285F4]",
        iconBg: "bg-slate-50",
    },
    {
        icon: Handshake,
        value: 85,
        suffix: "+",
        label: "Active Projects",
        sub: "Community-led",
        color: "text-[#4285F4]",
        iconBg: "bg-slate-50",
    },
    {
        icon: TrendingUp,
        value: 72,
        suffix: "",
        label: "Avg CII Score",
        sub: "Community Impact Index",
        color: "text-[#4285F4]",
        iconBg: "bg-slate-50",
    },
];

function normalizeCount(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

function buildStats(data?: PlatformStatsData): Stat[] {
    return defaultStats.map((stat) => {
        switch (stat.label) {
            case "Students Enrolled":
                return { ...stat, value: normalizeCount(data?.students_enrolled ?? data?.contributors, stat.value) };
            case "Engagement Hours":
                return { ...stat, value: normalizeCount(data?.engagement_hours ?? data?.impact_hours, stat.value) };
            case "SDGs Covered":
                return { ...stat, value: normalizeCount(data?.sdgs_covered ?? data?.sdgs_impacted, stat.value) };
            case "Active Projects":
                return { ...stat, value: normalizeCount(data?.active_projects, stat.value) };
            case "Avg CII Score":
                return { ...stat, value: normalizeCount(data?.avg_cii_score, stat.value) };
            default:
                return stat;
        }
    });
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
        <section className="py-24 px-6 bg-slate-50/50 relative overflow-hidden">
            {/* Radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(66,133,244,0.04)_0%,transparent_70%)] pointer-events-none" />
            {/* Dot grid */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] animate-pulse" />
                        Live Impact
                    </div>

                    <div className="relative inline-block mb-4">
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
                            Real Numbers.{" "}
                            <span className="bg-gradient-to-r from-[#3A72AA] to-[#34A853] bg-clip-text text-transparent">
                                Real Impact.
                            </span>
                        </h2>
                        {/* Wavy Underline (Yellow) */}
                        <svg className="absolute -bottom-3 left-0 w-full h-3 text-[#FBBC05]/40" preserveAspectRatio="none" viewBox="0 0 100 10" fill="none">
                            <path d="M0 5Q 25 0 50 5 Q 75 10 100 5" stroke="currentColor" strokeWidth="4" />
                        </svg>
                    </div>

                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-xl mx-auto mt-6">
                        CIEL is already changing lives across Pakistan — and growing every day.
                    </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={i}
                                className="group relative flex flex-col items-center text-center p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
                            >
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                                    <Icon className={`w-7 h-7 ${stat.color}`} strokeWidth={1.5} />
                                </div>

                                {/* Counter */}
                                <div className={`text-3xl md:text-4xl font-black ${stat.color} tabular-nums mb-2 tracking-tighter`}>
                                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                </div>

                                {/* Label */}
                                <p className="text-slate-900 font-black text-sm tracking-tight leading-snug mb-1">{stat.label}</p>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.sub}</p>

                                {/* Bottom accent bar */}
                                <div className={`absolute bottom-0 left-10 right-10 h-1 ${stat.iconBg} opacity-0 group-hover:opacity-100 rounded-full transition-all duration-500`} />
                            </div>
                        );
                    })}
                </div>

                {/* Live badge */}
            </div>
        </section>
    );
}
