"use client";

import Link from "next/link";
import { sdgData } from "@/utils/sdgData";

/** Compact sticker labels matching the home marquee design. */
const SDG_SHORT_LABELS: Record<number, string> = {
    1: "No Poverty",
    2: "Zero Hunger",
    3: "Good Health",
    4: "Quality Education",
    5: "Gender Equality",
    6: "Clean Water",
    7: "Clean Energy",
    8: "Decent Work",
    9: "Innovation",
    10: "Reduced Inequalities",
    11: "Sustainable Cities",
    12: "Responsible Consumption",
    13: "Climate Action",
    14: "Life Below Water",
    15: "Life on Land",
    16: "Peace & Justice",
    17: "Partnerships",
};

function buildStickerOrder() {
    const byNumber = [...sdgData].sort((a, b) => a.number - b.number);
    // Visual rhythm from the design: SDG 17 leads, then 1–16.
    const seventeen = byNumber.find((s) => s.number === 17);
    const rest = byNumber.filter((s) => s.number !== 17);
    return seventeen ? [seventeen, ...rest] : byNumber;
}

export default function SdgStickerMarquee() {
    const stickers = buildStickerOrder();
    const loop = [...stickers, ...stickers];

    return (
        <section
            className="relative overflow-hidden border-y border-slate-100/80 bg-gradient-to-b from-emerald-50/40 via-white to-white py-6 md:py-8"
            aria-label="United Nations Sustainable Development Goals"
        >
            <style>{`
                @keyframes sdg-sticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .sdg-sticker-track {
                    animation: sdg-sticker-scroll 48s linear infinite;
                    will-change: transform;
                }
                .sdg-sticker-track:hover {
                    animation-play-state: paused;
                }
                @media (prefers-reduced-motion: reduce) {
                    .sdg-sticker-track {
                        animation: none;
                    }
                }
            `}</style>

            <div className="relative">
                <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white via-white/90 to-transparent sm:w-20 md:w-28"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white via-white/90 to-transparent sm:w-20 md:w-28"
                    aria-hidden
                />

                <div className="sdg-sticker-track flex w-max items-center gap-3 px-4 sm:gap-3.5">
                    {loop.map((sdg, index) => {
                        const label = SDG_SHORT_LABELS[sdg.number] ?? sdg.title;
                        return (
                            <Link
                                key={`${sdg.number}-${index}`}
                                href={`/sdgs/${sdg.number}`}
                                className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                aria-label={`SDG ${sdg.number}: ${sdg.title}`}
                            >
                                <span
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-black text-white shadow-sm"
                                    style={{ backgroundColor: sdg.color }}
                                    aria-hidden
                                >
                                    {sdg.number}
                                </span>
                                <span className="pr-1 text-[13px] font-semibold tracking-tight text-slate-700 group-hover:text-slate-900">
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
