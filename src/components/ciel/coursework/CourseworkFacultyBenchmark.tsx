"use client";

import { useMemo, useState } from "react";
import { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { academicStage } from "@/utils/courseworkFacultyAnalyser";
import { computeMeritScorecard } from "@/utils/courseworkMeritModel";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";

const BANDS = [
    { min: 90, name: "Outstanding", color: "#7c3aed", ref: 7 },
    { min: 80, name: "Excellent", color: "#0f766e", ref: 18 },
    { min: 70, name: "Very Good", color: "#2563eb", ref: 30 },
    { min: 60, name: "Good", color: "#ca8a04", ref: 25 },
    { min: 50, name: "Developing", color: "#ea580c", ref: 12 },
    { min: 0, name: "Insufficient", color: "#dc2626", ref: 8 },
] as const;
const DRIFT = { outstandingMax: 12, excellentPlusMax: 35, meanMax: 78 };

function scoreOf(entry: MeritEntry): number | null {
    if (typeof entry.facultyModeration?.facultyScore === "number") return entry.facultyModeration.facultyScore;
    if (entry.status === "draft") return null;
    return computeMeritScorecard(entry).total;
}

function courseOf(entry: MeritEntry) {
    return entry.course?.trim() || "Unspecified course";
}
function levelOf(entry: MeritEntry) {
    return academicStage(entry).label;
}

export function courseworkDistribution(entries: MeritEntry[]) {
    const scored = entries.map((e) => ({ e, s: scoreOf(e) })).filter((x): x is { e: MeritEntry; s: number } => x.s != null);
    const n = scored.length;
    const rows = BANDS.map((b, i) => {
        const hi = i === 0 ? 101 : BANDS[i - 1].min;
        const count = scored.filter((x) => x.s >= b.min && x.s < hi).length;
        return { ...b, count, pct: n ? Math.round((count / n) * 100) : 0 };
    });
    const mean = n ? +(scored.reduce((a, x) => a + x.s, 0) / n).toFixed(1) : 0;
    const sorted = scored.map((x) => x.s).sort((a, b) => a - b);
    const median = n ? sorted[Math.floor((n - 1) / 2)] : 0;
    const out = rows[0].pct;
    const ex = rows[0].pct + rows[1].pct;
    const flags: string[] = [];
    if (n >= 5 && out > DRIFT.outstandingMax) {
        flags.push(`Inflation signal: ${out}% of records are 90+ (reference ≈ ${BANDS[0].ref}%). Faculty moderation or calibration review is recommended before publishing.`);
    }
    if (n >= 5 && ex > DRIFT.excellentPlusMax) {
        flags.push(`${ex}% of records are 80+ (reference ≈ ${BANDS[0].ref + BANDS[1].ref}%). The cohort may be under-differentiated.`);
    }
    if (n >= 5 && mean > DRIFT.meanMax) flags.push(`Cohort mean ${mean} exceeds the calibrated ceiling (${DRIFT.meanMax}).`);
    if (n < 5) flags.push("Fewer than 5 scored records — distribution is indicative only.");
    const healthy = flags.filter((f) => !/Fewer/.test(f)).length === 0;
    return { n, rows, mean, median, flags, healthy, scored };
}

function groupTable(scored: { e: MeritEntry; s: number }[], keyFn: (e: MeritEntry) => string) {
    const g: Record<string, number[]> = {};
    for (const x of scored) {
        const k = keyFn(x.e);
        (g[k] = g[k] || []).push(x.s);
    }
    return Object.entries(g)
        .map(([key, v]) => ({
            key,
            n: v.length,
            mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1),
            max: Math.max(...v),
            out: v.filter((s) => s >= 90).length,
            ex: v.filter((s) => s >= 80).length,
        }))
        .sort((a, b) => b.mean - a.mean);
}

export default function CourseworkFacultyBenchmark({ entries }: { entries: MeritEntry[] }) {
    const [course, setCourse] = useState("");
    const [level, setLevel] = useState("");
    const scoredPool = useMemo(() => entries.filter((e) => scoreOf(e) != null), [entries]);
    const courses = useMemo(() => [...new Set(scoredPool.map(courseOf))].sort(), [scoredPool]);
    const levels = useMemo(() => [...new Set(scoredPool.map(levelOf))].sort(), [scoredPool]);
    const filtered = useMemo(
        () => scoredPool.filter((e) => (!course || courseOf(e) === course) && (!level || levelOf(e) === level)),
        [scoredPool, course, level],
    );
    const d = courseworkDistribution(filtered);
    const byCourse = groupTable(d.scored, courseOf);
    const byLevel = groupTable(d.scored, levelOf);
    const sdgCounts = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const e of filtered) {
            const sm = e.sdgMapping;
            const label = sm?.notApplicable
                ? "Honest N/A"
                : sm?.entries?.[0]?.targets?.length && sm.entries[0].how?.trim()
                  ? "Precise"
                  : sm?.entries?.[0]
                    ? "Reasonable"
                    : "Missing";
            acc[label] = (acc[label] || 0) + 1;
        }
        return acc;
    }, [filtered]);
    const evCounts = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const e of filtered) {
            const ok = computeMeritScorecard(e).consistency.ok;
            const files = (e.assignmentFileUrl ? 1 : 0) + (e.evidenceUrls?.length || 0);
            const label = !ok ? "Contradiction" : files ? "Verified" : "Partial";
            acc[label] = (acc[label] || 0) + 1;
        }
        return acc;
    }, [filtered]);

    return (
        <div className="space-y-3">
            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">BENCHMARK · MY COURSES</p>
                        <p className="mt-1 text-[11px] text-[#71828e]">
                            {d.n} scored records · mean {d.mean || "—"} · median {d.median || "—"}. Black tick = reference share for a calibrated cohort.
                        </p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-[9px] font-black tracking-[0.08em] ${d.healthy ? "bg-[#e6f5f0] text-[#0f766e]" : "bg-[#fff4df] text-[#b45309]"}`}>
                        {d.healthy ? "CALIBRATION HEALTHY" : "CALIBRATION DRIFT"}
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <label className="text-[8.5px] font-black uppercase tracking-[0.08em] text-[#71828e]">
                        Course
                        <select value={course} onChange={(e) => setCourse(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px] font-bold text-[#4c5d65]">
                            <option value="">All</option>
                            {courses.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-[8.5px] font-black uppercase tracking-[0.08em] text-[#71828e]">
                        Academic level
                        <select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px] font-bold text-[#4c5d65]">
                            <option value="">All</option>
                            {levels.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="mt-4 space-y-1.5">
                    {d.rows.map((row) => (
                        <div key={row.min} className="grid grid-cols-[110px_minmax(0,1fr)_70px_60px] items-center gap-2 text-[11px]">
                            <b style={{ color: row.color }}>{row.min}+ {row.name}</b>
                            <div className="relative h-3.5 overflow-hidden rounded-full bg-[#eef2f4]">
                                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, row.pct)}%`, background: row.color }} />
                                <span className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-[#14202b]" style={{ left: `${row.ref}%` }} />
                            </div>
                            <span>{row.count} · {row.pct}%</span>
                            <span className="text-[#71828e]">ref {row.ref}%</span>
                        </div>
                    ))}
                </div>
                {d.flags.map((f) => (
                    <p key={f} className="mt-2 rounded-[12px] border border-[#f0d9a8] bg-[#fff4df] px-3 py-2 text-[11px] text-[#9b6700]">{f}</p>
                ))}
                <p className="mt-2 text-[10.5px] leading-relaxed text-[#71828e]">
                    <b className="text-[#183140]">Reference basis:</b> 90+ ≈ top 5–8%; 80+ ≈ next ~18%; 70+ ≈ 30%. If 90+ exceeds {DRIFT.outstandingMax}% or 80+ exceeds {DRIFT.excellentPlusMax}% the cohort is flagged — every student scoring 90 is a sign of a broken rubric, not a brilliant cohort.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                        <p className="text-[8.5px] font-black uppercase tracking-[0.08em] text-[#71828e]">SDG-mapping accuracy</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {Object.entries(sdgCounts).map(([k, v]) => (
                                <span key={k} className="rounded-full bg-[#eef2f4] px-2.5 py-1 text-[10px] font-bold text-[#4c5d65]">{k} · {v}</span>
                            ))}
                            {Object.keys(sdgCounts).length === 0 ? <span className="text-[11px] text-[#71828e]">—</span> : null}
                        </div>
                    </div>
                    <div>
                        <p className="text-[8.5px] font-black uppercase tracking-[0.08em] text-[#71828e]">Evidence assurance</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {Object.entries(evCounts).map(([k, v]) => (
                                <span key={k} className="rounded-full bg-[#eef2f4] px-2.5 py-1 text-[10px] font-bold text-[#4c5d65]">{k} · {v}</span>
                            ))}
                            {Object.keys(evCounts).length === 0 ? <span className="text-[11px] text-[#71828e]">—</span> : null}
                        </div>
                    </div>
                </div>
            </div>
            {byCourse.length > 1 ? <GroupTable title="By course" rows={byCourse} /> : null}
            {byLevel.length > 1 ? <GroupTable title="By academic level" rows={byLevel} /> : null}
            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                <h4 className="m-0 text-sm font-semibold text-[#183140]">How the rubric was designed for a faculty member teaching several courses</h4>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#71828e]">
                    The seven criteria and weights are constant across every course you teach, so a Marketing essay and an Operations audit are judged on the same axes. The <b className="text-[#183140]">discipline lens</b> decides what counts as rigor in each, and the <b className="text-[#183140]">academic-level calibration</b> sets how much depth a level 4 or 5 requires. Within a single course, the ranking studio lets you compare like with like; across your courses it flags mixed levels so you never rank a Semester 4 essay against a final-year capstone.
                </p>
            </div>
        </div>
    );
}

function GroupTable({
    title,
    rows,
}: {
    title: string;
    rows: { key: string; n: number; mean: number; max: number; out: number; ex: number }[];
}) {
    return (
        <div className="overflow-hidden rounded-[18px] border border-[#dcebee] bg-white">
            <p className="px-4 pt-3 text-[12px] font-semibold text-[#183140]">{title}</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                    <thead>
                        <tr className="text-[9.5px] uppercase tracking-[0.06em] text-[#71828e]">
                            <th className="px-4 py-2">Group</th>
                            <th className="px-2 py-2">n</th>
                            <th className="px-2 py-2">mean</th>
                            <th className="px-2 py-2">max</th>
                            <th className="px-2 py-2">90+</th>
                            <th className="px-2 py-2">80+</th>
                            <th className="px-2 py-2">read</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((x) => (
                            <tr key={x.key} className="border-t border-[#edf1f4]">
                                <td className="px-4 py-2 font-semibold text-[#183140]">{x.key}</td>
                                <td className="px-2 py-2">{x.n}</td>
                                <td className="px-2 py-2 font-black">{x.mean}</td>
                                <td className="px-2 py-2">{x.max}</td>
                                <td className="px-2 py-2">{x.out}</td>
                                <td className="px-2 py-2">{x.ex}</td>
                                <td className="px-2 py-2 text-[#71828e]">
                                    {x.n >= 5 && x.out / x.n > 0.12 ? "⚠ 90+ share high — check calibration" : x.n < 3 ? "small sample" : "in range"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function meanApprovedScore(entries: MeritEntry[]) {
    const d = courseworkDistribution(entries.filter(isFacultyApproved));
    return d.n ? String(d.mean) : "—";
}

export function benchmarkHealthy(entries: MeritEntry[]) {
    return courseworkDistribution(entries.filter((e) => scoreOf(e) != null)).healthy;
}
