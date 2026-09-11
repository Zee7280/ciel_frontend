"use client";

import { useMemo, useState } from "react";
import { sdgData } from "@/utils/sdgData";
import { usePlatformStats } from "@/utils/usePlatformStats";

const CX = 180;
const CY = 180;
const OUTER_R = 170;
const INNER_R = 92;
const GAP_DEG = 1.4;

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/** Rounded to 2dp — Math.cos/sin can differ in their last bit between server (Node) and client
 * (browser) JS engines, which otherwise turns into an SSR/hydration attribute mismatch. */
function round(n: number): string {
    return n.toFixed(2);
}

function wedgePath(index: number, total: number): string {
    const anglePer = 360 / total;
    const start = index * anglePer + GAP_DEG / 2 - 90;
    const end = (index + 1) * anglePer - GAP_DEG / 2 - 90;
    const x0 = round(CX + OUTER_R * Math.cos(toRad(start)));
    const y0 = round(CY + OUTER_R * Math.sin(toRad(start)));
    const x1 = round(CX + OUTER_R * Math.cos(toRad(end)));
    const y1 = round(CY + OUTER_R * Math.sin(toRad(end)));
    const x2 = round(CX + INNER_R * Math.cos(toRad(end)));
    const y2 = round(CY + INNER_R * Math.sin(toRad(end)));
    const x3 = round(CX + INNER_R * Math.cos(toRad(start)));
    const y3 = round(CY + INNER_R * Math.sin(toRad(start)));
    const largeArc = end - start > 180 ? 1 : 0;
    return `M${x0},${y0} A${OUTER_R},${OUTER_R} 0 ${largeArc} 1 ${x1},${y1} L${x2},${y2} A${INNER_R},${INNER_R} 0 ${largeArc} 0 ${x3},${y3} Z`;
}

function labelPos(index: number, total: number): [number, number] {
    const anglePer = 360 / total;
    const mid = index * anglePer + anglePer / 2 - 90;
    const r = (OUTER_R + INNER_R) / 2;
    return [Number(round(CX + r * Math.cos(toRad(mid)))), Number(round(CY + r * Math.sin(toRad(mid))))];
}

/** The homepage's data-driven SDG explorer — distinct from the older decorative SdgWheel/SDGWheel
 * components (neither of which is wired into any page), which auto-spin and carry no real data. */
export default function SdgImpactWheel() {
    const { stats } = usePlatformStats();
    const [selected, setSelected] = useState(2);

    const byNumber = useMemo(() => {
        const map = new Map<number, { projects: number; attributedHours: number; peopleServed: number; cities: number; items: { title: string; city: string | null; path: string }[] }>();
        for (const s of stats?.sdgs ?? []) map.set(s.number, s);
        return map;
    }, [stats]);

    const selectedGoal = sdgData.find((g) => g.number === selected)!;
    const selectedStat = byNumber.get(selected);
    const projects = selectedStat?.projects ?? 0;
    const cities = selectedStat?.cities ?? 0;
    const citiesTouched = [...new Set((selectedStat?.items ?? []).map((i) => i.city).filter(Boolean))] as string[];

    return (
        <section className="bg-slate-50/60 px-6 py-20">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
                {/* LEFT: intro + wheel */}
                <div className="min-w-0">
                    <p className="mb-3 inline-flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-emerald-600">
                        <span aria-hidden className="h-0.5 w-[18px] rounded-full bg-emerald-500" />
                        Sustainable Development Goals
                    </p>
                    <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-4xl">
                        Spin the goals. See who&apos;s working on what.
                    </h2>
                    <p className="mt-3 max-w-md text-base font-medium text-slate-500">
                        Click a segment to see verified Community Service reports tagged to that goal. Untouched goals stay dim — they are in the UN list, not in our ledger yet.
                    </p>

                    <div className="relative mx-auto mt-8 h-[360px] w-[360px] max-w-full lg:mx-0">
                        <svg viewBox="0 0 360 360" className="h-full w-full">
                            {sdgData.map((goal, i) => {
                                const isSelected = goal.number === selected;
                                const hasVerified = (byNumber.get(goal.number)?.projects ?? 0) > 0;
                                return (
                                    <path
                                        key={goal.number}
                                        d={wedgePath(i, sdgData.length)}
                                        fill={goal.color}
                                        fillOpacity={isSelected ? 1 : hasVerified ? 0.75 : 0.18}
                                        stroke={isSelected ? "#12272E" : "none"}
                                        strokeWidth={isSelected ? 2.5 : 0}
                                        className="cursor-pointer transition-all"
                                        onClick={() => setSelected(goal.number)}
                                    />
                                );
                            })}
                            {sdgData.map((goal, i) => {
                                const [x, y] = labelPos(i, sdgData.length);
                                const isSelected = goal.number === selected;
                                return (
                                    <text
                                        key={goal.number}
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize={isSelected ? 15 : 12}
                                        fontWeight={800}
                                        fill="#fff"
                                        className="pointer-events-none select-none"
                                    >
                                        {goal.number}
                                    </text>
                                );
                            })}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-slate-900">{selected}</span>
                            <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Goal selected</span>
                            <span className="mt-0.5 text-xs font-bold text-slate-500">
                                {projects} {projects === 1 ? "project" : "projects"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: detail card */}
                <div className="min-w-0 rounded-[22px] border border-slate-100 bg-white p-6 shadow-[0_18px_50px_rgba(14,42,51,0.08)]">
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: selectedGoal.color }}>
                        SDG {selectedGoal.number}
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedGoal.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        {projects > 0 ? (
                            <>
                                {projects} verified {projects === 1 ? "project" : "projects"}
                                {citiesTouched.length ? ` in ${citiesTouched.join(", ")}` : ""} — highlighted on the map above.
                            </>
                        ) : (
                            "No verified project has been tagged to this goal yet — it'll appear here the moment one clears review."
                        )}
                    </p>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <span className="block text-lg font-black text-slate-900">{projects}</span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Projects</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <span className="block text-lg font-black text-slate-900">{(selectedStat?.attributedHours ?? 0).toLocaleString("en-US")}</span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Attributed hours</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <span className="block text-lg font-black text-slate-900">{(selectedStat?.peopleServed ?? 0).toLocaleString("en-US")}</span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">People served</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <span className="block text-lg font-black text-slate-900">{cities}</span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Cities</span>
                        </div>
                    </div>

                    {selectedStat?.items.length ? (
                        <div className="mt-4 space-y-1.5">
                            {selectedStat.items.slice(0, 6).map((item, i) => (
                                <div key={i} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                                    <span className="min-w-0 truncate text-[13px] font-bold text-slate-800">{item.title}</span>
                                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                                        {item.city ? `${item.city} · ` : ""}
                                        {item.path}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-1.5">
                        {sdgData.map((goal) => (
                            <button
                                key={goal.number}
                                type="button"
                                onClick={() => setSelected(goal.number)}
                                title={goal.title}
                                style={{ backgroundColor: goal.color }}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black text-white transition ${
                                    goal.number === selected ? "ring-2 ring-offset-2" : (byNumber.get(goal.number)?.projects ?? 0) > 0 ? "opacity-90 hover:opacity-100" : "opacity-25 hover:opacity-70"
                                }`}
                            >
                                {goal.number}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
