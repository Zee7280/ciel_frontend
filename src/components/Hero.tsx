"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCounter } from "@/hooks/useCounter";
import { useEffect, useState } from "react";
import clsx from "clsx";

type PlatformStats = {
    contributors: number;
    impact_hours: number | null;
    impact_hours_label?: string | null;
    universities: number;
    sdgs_impacted: number;
};

/** Mirrors server fallback in `api/v1/public/platform-stats` if the client fetch fails. */
const DEFAULT_PLATFORM_STATS: PlatformStats = {
    contributors: 50,
    impact_hours: null,
    impact_hours_label: "Launching Pilot",
    universities: 24,
    sdgs_impacted: 17,
};

type StatIcon = LucideIcon | string;

function formatCount(n: number): string {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Homepage metric card — supports numeric (animated) or string fallback (e.g. pilot phase). */
function StatItem({
    label,
    value,
    icon,
    delay,
    valueSuffix = "",
}: {
    label: string;
    value: number | string;
    icon: StatIcon;
    delay: number;
    /** Appended after numeric value, e.g. "+" for hours */
    valueSuffix?: string;
}) {
    const isNumber = typeof value === "number";
    const count = useCounter(isNumber ? (value as number) : 0, 2000);
    const formattedValue = isNumber ? `${formatCount(count)}${valueSuffix}` : value;

    const isImagePath = typeof icon === "string";

    return (
        <div
            className="group relative flex flex-col rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-5 sm:p-6 shadow-sm shadow-slate-200/40 transition-all duration-300 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60 animate-fade-in-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
                    {isImagePath ? (
                        <Image src={icon} alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-90" />
                    ) : (
                        (() => {
                            const Icon = icon as LucideIcon;
                            return <Icon className="h-5 w-5 text-slate-600" strokeWidth={2} />;
                        })()
                    )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                    <p
                        className={clsx(
                            "font-black tracking-tight text-slate-900 tabular-nums",
                            isNumber ? "text-2xl sm:text-3xl lg:text-[2rem] leading-none" : "text-lg sm:text-xl leading-snug",
                        )}
                    >
                        {isNumber ? formattedValue : value}
                    </p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-[118px] animate-pulse rounded-2xl border border-slate-200/80 bg-slate-100/80"
                />
            ))}
        </div>
    );
}

function HomeStatsRow({ stats: s }: { stats: PlatformStats }) {
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            <StatItem label="Contributors" value={s.contributors} icon="/icon-planting.jpg" delay={100} />
            <StatItem
                label="Impact Hours"
                value={
                    s.impact_hours != null && s.impact_hours >= 0
                        ? s.impact_hours
                        : s.impact_hours_label?.trim() || "Launching Pilot"
                }
                icon="/icon-globe.jpg"
                delay={200}
                valueSuffix={typeof s.impact_hours === "number" && s.impact_hours >= 0 ? "+" : ""}
            />
            <StatItem label="Universities" value={s.universities} icon="/icon-gears.jpg" delay={300} />
            <StatItem label="SDGs Impacted" value={s.sdgs_impacted} icon="/icon-graph.jpg" delay={400} />
        </div>
    );
}

export default function Hero() {
    const [activeRole, setActiveRole] = useState<'student' | 'faculty' | 'partner'>('student');
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/v1/public/platform-stats", { cache: "no-store" });
                const json = (await res.json().catch(() => null)) as { success?: boolean; data?: PlatformStats } | null;
                if (!cancelled) {
                    setStats(json?.success && json.data ? json.data : DEFAULT_PLATFORM_STATS);
                }
            } catch {
                if (!cancelled) setStats(DEFAULT_PLATFORM_STATS);
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const roleContent = {
        student: {
            text: "Build your portfolio with verified social impact projects.",
            cta: "Explore Projects",
            link: "/projects"
        },
        faculty: {
            text: "Integrate community learning into your curriculum seamlessly.",
            cta: "View Framework",
            link: "/about"
        },
        partner: {
            text: "Connect with students to drive your social impact goals.",
            cta: "Post Opportunity",
            link: "/contact"
        }
    };

    return (
        <section className="relative max-w-[1600px] mx-auto px-4 md:px-10 pb-4 lg:pb-10 overflow-visible">
            {/* Soft Background Glow */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-[120px] -z-10" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">

                {/* LEFT CONTENT */}
                <div className="flex-1 max-w-3xl text-center lg:text-left pt-12 lg:pt-0">

                    <div className="space-y-6 mb-10">
                        <h1 className="text-5xl md:text-6xl lg:text-4xl font-black text-[#3A72AA] leading-[1.1] tracking-tight max-w-[900px] mx-auto lg:mx-0">
                            Turn Student Engagement into <span className="text-[#3A72AA]">Measurable</span> Community <span className="text-[#3A72AA]">Impact</span>
                        </h1>

                        <div className="space-y-6 max-w-xl mx-auto lg:mx-0 mt-6 px-1 text-slate-600">
                            <p className="text-base md:text-lg font-medium leading-relaxed opacity-90">
                                Track, verify, and measure real-world impact aligned with SDGs — all in one platform.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-8">
                        <Link href="/projects" className="w-full sm:w-auto px-10 py-4 bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-100 transition-all duration-300 text-center">
                            Start Your Project
                        </Link>
                        <Link href="/about" className="w-full sm:w-auto px-10 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 text-center">
                            Explore How It Works
                        </Link>
                    </div>

                    {/* Impact Badges Row */}
                    <div className="mt-10 flex flex-wrap justify-center lg:justify-start items-center gap-x-6 gap-y-3">
                        {[
                            "SDG-Aligned Projects",
                            "Verified Impact Tracking",
                            "CII Score Generated"
                        ].map((badge) => (
                            <div key={badge} className="flex items-center gap-2 text-slate-500 font-bold text-sm italic">
                                <Check className="w-4 h-4 text-slate-800" strokeWidth={3} />
                                <span>{badge}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT - VIDEO & STATS */}
                <div className="flex-1 flex flex-col items-center relative min-h-[400px] w-full lg:w-auto">
                    {/* Video Container */}
                    <div className="relative w-full aspect-square max-w-[650px]">
                        {/* Subtle Glow Behind Video */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-emerald-100 rounded-full blur-3xl opacity-30 animate-pulse-slow" />

                        <div className="relative w-full h-full">
                            <video
                                src="/hero.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-contain pointer-events-none"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* FULL WIDTH STATS BANNER */}
            <div className="relative w-full max-w-7xl mx-auto mt-4 pt-2">
                <div className="relative z-10 px-4 pb-16 md:px-12">
                    {statsLoading ? (
                        <StatsSkeleton />
                    ) : (
                        <HomeStatsRow stats={stats ?? DEFAULT_PLATFORM_STATS} />
                    )}
                </div>

                {/* Vertical Background Grid */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[100vw] h-48 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] bg-[size:40px] md:bg-[size:60px] opacity-100 -z-10 [mask-image:linear-gradient(to_bottom,transparent_0%,black_50%,transparent_100%)] pointer-events-none" />

                {/* Bottom Separator line  */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[100vw] h-[1px] bg-slate-100" />

                {/* Built for you chip center bottom */}

            </div>
        </section>
    );
}
