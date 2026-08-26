"use client";

import { useState } from "react";
import { COURSEWORK_GUIDE_SECTIONS, type CourseworkGuideSection } from "@/utils/courseworkSectionGuide";

export default function CourseworkSectionGuide() {
    const [open, setOpen] = useState<CourseworkGuideSection | null>(null);

    return (
        <>
            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">HOW TO FILL YOUR COURSEWORK — TAP ANY SECTION</p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {COURSEWORK_GUIDE_SECTIONS.map((s) => (
                        <button
                            key={s.code}
                            type="button"
                            onClick={() => setOpen(s)}
                            className="relative rounded-[14px] border border-[#dcebee] bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#0e7d74] hover:shadow-md"
                        >
                            <span className="absolute right-2.5 top-2 rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[7.5px] font-extrabold text-[#0e7d74]">
                                TAP ME
                            </span>
                            <div className="text-xl">{s.emoji}</div>
                            <div className="mt-1 text-[8px] font-extrabold tracking-[0.1em] text-[#0891b2]">{s.code}</div>
                            <div className="text-[11.5px] font-extrabold text-[#0d2b33]">{s.title}</div>
                            <div className="mt-1 text-[9.5px] leading-snug text-[#7a919a]">{s.blurb}</div>
                        </button>
                    ))}
                </div>
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-[100] overflow-auto bg-[rgba(4,37,43,0.55)] p-5"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setOpen(null);
                    }}
                >
                    <div className="mx-auto mt-6 w-full max-w-[500px] overflow-hidden rounded-[20px] bg-white">
                        <div className="flex items-center gap-2.5 bg-[linear-gradient(115deg,#04252b,#0e5f63_60%,#12a5a0_120%)] px-4 py-3.5 text-white">
                            <span className="text-lg">{open.emoji}</span>
                            <b className="text-[12.5px]">
                                {open.code} · {open.title}
                            </b>
                            <button
                                type="button"
                                onClick={() => setOpen(null)}
                                className="ml-auto h-[26px] w-[26px] rounded-full bg-white/18 text-xs text-white"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-[17px] py-[13px]">
                            <p className="text-[10.5px] font-bold text-[#7a919a]">{open.blurb}</p>
                            <p className="mt-3 text-[8px] font-extrabold tracking-[0.12em] text-[#0891b2]">
                                📋 FILL IT IN {open.steps.length} LITTLE STEPS
                            </p>
                            {open.steps.map((st, j) => (
                                <div key={st} className="flex items-start gap-2 border-b border-dashed border-[#dcebee] py-1.5 last:border-0">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] bg-[#e3f4fa] text-[9.5px] font-extrabold text-[#0891b2]">
                                        {j + 1}
                                    </span>
                                    <span className="text-[11px] leading-relaxed text-[#1d3a3d]">{st}</span>
                                </div>
                            ))}
                            <p className="mt-3 text-[8px] font-extrabold tracking-[0.12em] text-[#0e7d74]">✅ COPY THIS VIBE</p>
                            <p className="mt-1 rounded-[10px] border-l-[3px] border-[#0e7d74] bg-[#e6f6f4] px-3 py-2 text-[11px] italic leading-relaxed text-[#0f5e57]">
                                {open.example}
                            </p>
                            <p className="mt-3 text-[8px] font-extrabold tracking-[0.12em] text-[#e11d48]">❌ ONE THING NOT TO DO</p>
                            <p className="mt-1 rounded-[10px] border-l-[3px] border-[#e11d48] bg-[#fdf1f4] px-3 py-2 text-[11px] leading-relaxed text-[#9c1f3f]">
                                {open.dont}
                            </p>
                            <p className="mt-3 text-[8px] font-extrabold tracking-[0.12em] text-[#b45309]">💡 PRO TIP</p>
                            <p className="mt-1 rounded-[10px] bg-[#fbf0d7] px-3 py-2 text-[11px] leading-relaxed text-[#8a5a06]">{open.tip}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
