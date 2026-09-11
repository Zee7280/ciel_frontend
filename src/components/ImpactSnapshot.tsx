"use client";

import { useEffect, useRef, useState } from "react";
import { usePlatformStats } from "@/utils/usePlatformStats";

function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started) setStarted(true);
            },
            { threshold: 0.5 },
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
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [started, target, duration]);

    return (
        <span ref={ref}>
            {count.toLocaleString("en-US")}
            {suffix}
        </span>
    );
}

export default function ImpactSnapshot() {
    const { stats } = usePlatformStats();
    const verifiedHours = stats?.report_verified_hours ?? 0;
    const universities = stats?.universities ?? 0;

    const tiles = [
        { value: verifiedHours, label: "Verified hours — live & counting", live: true },
        { value: universities, label: "Founding university — BNU pilot live", live: false },
        { value: 4, label: "Impact paths — open for records", live: false },
        { value: 17, label: "SDGs mapped in plain language", live: false },
        { value: 3, label: "Locks per record — student · faculty · partner", live: false },
    ];

    return (
        <section id="platform-impact" className="relative overflow-hidden bg-ciel-navy py-24 px-6">
            <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 bg-ciel-green/5 blur-[140px]" />

            <div className="relative z-10 mx-auto max-w-6xl">
                <div className="mb-14 text-center">
                    <p className="mb-4 text-xs font-black uppercase tracking-widest text-ciel-green">
                        Live impact — the honest version
                    </p>

                    <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl lg:text-[42px] leading-tight">
                        We publish only what&apos;s verified. We&apos;re just getting started.
                    </h2>

                    <p className="mx-auto mt-5 max-w-xl text-base font-medium text-white/60 md:text-lg">
                        Every number on this page traces to attendance evidence, faculty sign-off, and partner confirmation.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {tiles.map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-7 text-center"
                        >
                            <div className="text-3xl font-black tracking-tight text-ciel-green tabular-nums">
                                {stat.live ? <AnimatedCounter target={stat.value} /> : stat.value.toLocaleString("en-US")}
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 rounded-2xl border border-ciel-green/30 bg-ciel-green/5 px-6 py-5 text-center sm:px-10">
                    <p className="text-sm leading-relaxed text-white/85 md:text-base">
                        <span aria-hidden>💞 </span>
                        <span className="font-bold text-white">The Community Dividend:</span>{" "}
                        CIEL values every verified volunteer hour (PKR 192/hr) and every rupee students spend from their own pockets. When the first semester closes, Pakistan will see — to the rupee — how much communities invest in themselves. On CIEL, communities aren&apos;t recipients. They&apos;re investors.
                    </p>
                </div>
            </div>
        </section>
    );
}
