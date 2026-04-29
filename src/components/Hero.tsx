"use client";

import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { useState } from "react";
import { sdgData } from "@/utils/sdgData";

const sdgLinks = Array.from({ length: 17 }, (_, index) => index + 1);
const sdgSegmentAngle = 360 / sdgLinks.length;
const sdgStartAngle = 119;

function formatSvgNumber(value: number): string {
    return Number(value.toFixed(3)).toString();
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
        x: formatSvgNumber(cx + radius * Math.cos(angleInRadians)),
        y: formatSvgNumber(cy + radius * Math.sin(angleInRadians)),
    };
}

function describeRingSegment(
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number,
) {
    const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
    const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
    const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
    const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
        "M", startOuter.x, startOuter.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
        "L", startInner.x, startInner.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 0, endInner.x, endInner.y,
        "Z",
    ].join(" ");
}

export default function Hero() {
    const [hoveredSdg, setHoveredSdg] = useState<number | null>(null);
    const hoveredSdgData = hoveredSdg ? sdgData.find((sdg) => sdg.number === hoveredSdg) : null;

    return (
        <section className="relative max-w-[1600px] mx-auto px-4 pt-14 pb-10 md:px-10 lg:pt-16 lg:pb-12 overflow-visible">
            {/* Soft Background Glow */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-[120px] -z-10" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">

                {/* LEFT CONTENT */}
                <div className="flex-1 max-w-3xl text-center lg:text-left">

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

                {/* RIGHT - HERO MARK */}
                <div className="flex-1 flex flex-col items-center relative min-h-[300px] w-full lg:min-h-[420px] lg:w-auto">
                    {/* Logo Container */}
                    <div className="relative w-full aspect-square max-w-[400px] lg:max-w-[500px] lg:translate-y-4">
                        {/* Subtle Glow Behind Logo */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-emerald-100 rounded-full blur-3xl opacity-30 animate-pulse-slow" />

                        <div className="relative flex h-full w-full items-center justify-center">
                            <div className="relative h-[84%] w-[84%] drop-shadow-2xl motion-safe:[animation:spin_28s_linear_infinite] hover:[animation-play-state:paused]">
                                <Image
                                    src="/hero-iel-pk-logo.png"
                                    alt="IEL PK"
                                    className="h-full w-full object-contain"
                                    width={512}
                                    height={512}
                                />
                                <svg
                                    viewBox="0 0 512 512"
                                    className="absolute inset-0 h-full w-full"
                                    aria-label="Sustainable Development Goals links"
                                >
                                    {sdgLinks.map((sdgNumber, index) => {
                                        const sdg = sdgData.find((item) => item.number === sdgNumber);
                                        const startAngle = sdgStartAngle + index * sdgSegmentAngle + 1;
                                        const endAngle = sdgStartAngle + (index + 1) * sdgSegmentAngle - 1;

                                        return (
                                            <a
                                                key={sdgNumber}
                                                href={`/sdgs/${sdgNumber}`}
                                                aria-label={`Open SDG ${sdgNumber}${sdg ? `: ${sdg.title}` : ""}`}
                                                onMouseEnter={() => setHoveredSdg(sdgNumber)}
                                                onMouseLeave={() => setHoveredSdg(null)}
                                                onFocus={() => setHoveredSdg(sdgNumber)}
                                                onBlur={() => setHoveredSdg(null)}
                                            >
                                                <path
                                                    d={describeRingSegment(256, 256, 118, 232, startAngle, endAngle)}
                                                    fill="transparent"
                                                    className="cursor-pointer outline-none transition-colors hover:fill-white/20 focus:fill-white/20"
                                                >
                                                    <title>{`SDG ${sdgNumber}${sdg ? `: ${sdg.title}` : ""}`}</title>
                                                </path>
                                            </a>
                                        );
                                    })}
                                </svg>
                            </div>
                            {hoveredSdgData ? (
                                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-max max-w-[15rem] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-center shadow-xl shadow-slate-200/70 backdrop-blur">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                        SDG {hoveredSdgData.number}
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-900">
                                        {hoveredSdgData.title}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
