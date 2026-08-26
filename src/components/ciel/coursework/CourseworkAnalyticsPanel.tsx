"use client";

import { useMemo, useState } from "react";
import { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { computeMeritScorecard, MERIT_RUBRIC } from "@/utils/courseworkMeritModel";
import { stripEmoji } from "@/utils/courseProjectTypes";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";

function uniOf(e: MeritEntry) {
    return e.student?.institution || e.studentInfo?.universityName || "Unspecified";
}
function formatOf(e: MeritEntry) {
    const format = e.assignmentInfo?.formats?.[0] || e.assignmentInfo?.format;
    if (format) return stripEmoji(format).split(" (")[0];
    return e.studentInfo?.courseworkTypes?.[0] || "Coursework";
}
function semOf(e: MeritEntry) {
    const raw = e.studentInfo?.semester || "";
    if (/fall/i.test(raw)) return "Fall";
    if (/spring/i.test(raw)) return "Spring";
    return raw || "Unspecified";
}
function yearOf(e: MeritEntry) {
    const d = e.updatedAt || e.createdAt;
    return d ? String(new Date(d).getFullYear()) : "";
}
function monthOf(e: MeritEntry) {
    const d = e.updatedAt || e.createdAt;
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

const BAR_COLORS = ["#0e7d74", "#0891b2", "#6d28d9", "#b45309", "#4338ca", "#15803d"];

export default function CourseworkAnalyticsPanel({ entries }: { entries: MeritEntry[] }) {
    const approved = useMemo(() => entries.filter(isFacultyApproved), [entries]);
    const [uni, setUni] = useState("All");
    const [sem, setSem] = useState("All");
    const [yr, setYr] = useState("All");
    const [dfrom, setDfrom] = useState("");
    const [dto, setDto] = useState("");

    const unis = useMemo(() => [...new Set(approved.map(uniOf))].sort(), [approved]);
    const sems = useMemo(() => [...new Set(approved.map(semOf))].sort(), [approved]);
    const years = useMemo(() => [...new Set(approved.map(yearOf).filter(Boolean))].sort().reverse(), [approved]);

    const pool = useMemo(() => {
        return approved.filter((c) => {
            if (uni !== "All" && uniOf(c) !== uni) return false;
            if (sem !== "All" && semOf(c) !== sem) return false;
            if (yr !== "All" && yearOf(c) !== yr) return false;
            const m = monthOf(c);
            if (dfrom && m && m < dfrom) return false;
            if (dto && m && m > dto) return false;
            return true;
        });
    }, [approved, uni, sem, yr, dfrom, dto]);

    const scored = pool.map((e) => {
        const card = computeMeritScorecard(e);
        return { e, total: card.total, card };
    });
    const N = Math.max(scored.length, 1);
    const league = [...new Set(pool.map(uniOf))]
        .map((u) => {
            const g = scored.filter((x) => uniOf(x.e) === u);
            return { u, avg: g.length ? Math.round(g.reduce((s, x) => s + x.total, 0) / g.length) : 0, n: g.length };
        })
        .sort((a, b) => b.avg - a.avg);
    const crit = MERIT_RUBRIC.map((r, j) => ({
        name: r.label.split(" — ")[0].replace(/^\d+\s·\s/, ""),
        pct: scored.length ? Math.round(scored.reduce((s, x) => s + x.card.criteria[j].points / r.max, 0) / scored.length * 100) : 0,
    }));
    const fmts = [...new Set(pool.map(formatOf))]
        .map((f) => ({ f, n: pool.filter((c) => formatOf(c) === f).length }))
        .sort((a, b) => b.n - a.n);

    return (
        <div className="space-y-3">
            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">
                        ANALYTICS FILTERS — UNIVERSITY · SEMESTER · YEAR · DATE RANGE
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setUni("All");
                            setSem("All");
                            setYr("All");
                            setDfrom("");
                            setDto("");
                        }}
                        className="rounded-full border border-[#dcebee] px-3 py-1 text-[9px] font-extrabold text-[#0e7d74]"
                    >
                        ✕ CLEAR
                    </button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                    <select value={uni} onChange={(e) => setUni(e.target.value)} className="rounded-[10px] border border-[#dcebee] bg-[#f5fbfa] px-2.5 py-1.5 text-[10px] font-bold">
                        <option value="All">University: All</option>
                        {unis.map((u) => (
                            <option key={u} value={u}>
                                University: {u}
                            </option>
                        ))}
                    </select>
                    <select value={sem} onChange={(e) => setSem(e.target.value)} className="rounded-[10px] border border-[#dcebee] bg-[#f5fbfa] px-2.5 py-1.5 text-[10px] font-bold">
                        <option value="All">Semester: All</option>
                        {sems.map((s) => (
                            <option key={s} value={s}>
                                Semester: {s}
                            </option>
                        ))}
                    </select>
                    <select value={yr} onChange={(e) => setYr(e.target.value)} className="rounded-[10px] border border-[#dcebee] bg-[#f5fbfa] px-2.5 py-1.5 text-[10px] font-bold">
                        <option value="All">Year: All</option>
                        {years.map((y) => (
                            <option key={y} value={y}>
                                Year: {y}
                            </option>
                        ))}
                    </select>
                    <label className="text-[8px] font-extrabold text-[#7a919a]">
                        FROM{" "}
                        <input type="month" value={dfrom} onChange={(e) => setDfrom(e.target.value)} className="rounded-[10px] border border-[#dcebee] px-2 py-1.5 text-[10px]" />
                    </label>
                    <label className="text-[8px] font-extrabold text-[#7a919a]">
                        TO{" "}
                        <input type="month" value={dto} onChange={(e) => setDto(e.target.value)} className="rounded-[10px] border border-[#dcebee] px-2 py-1.5 text-[10px]" />
                    </label>
                </div>
                <p className="mt-2 text-[9.5px] text-[#7a919a]">
                    Scoped to <b className="text-[#0e7d74]">{pool.length}</b> approved card{pool.length === 1 ? "" : "s"} — every chart below recalculates with your filters.
                </p>
            </div>

            <BarCard title="UNIVERSITY LEAGUE — AVG /100 (SAME RUBRIC EVERYWHERE)">
                {league.map((row, i) => (
                    <BarRow key={row.u} label={`${row.u} (${row.n} cards)`} width={row.avg} value={`${row.avg}/100`} color={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
            </BarCard>

            <BarCard title="RUBRIC CRITERION HEALTH — AVG % OF MAX">
                {crit.map((row, i) => (
                    <BarRow key={row.name} label={row.name} width={row.pct} value={`${row.pct}%`} color={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
                {scored.length > 0 && (
                    <p className="mt-2 rounded-[9px] bg-[#f1ebfd] px-3 py-2 text-[9.5px] leading-relaxed text-[#4c3a78]">
                        💡 <b>Reads as:</b> weakest bars are the highest-value teaching intervention — identical maths at every university.
                    </p>
                )}
            </BarCard>

            <BarCard title="FORMAT MIX — INTERDISCIPLINARY BY DESIGN">
                {fmts.map((row, i) => (
                    <BarRow key={row.f} label={row.f} width={(row.n / N) * 100} value={`${row.n} card${row.n === 1 ? "" : "s"}`} color={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
            </BarCard>
        </div>
    );
}

function BarCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
            <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">{title}</p>
            <div className="mt-2.5">{children}</div>
        </div>
    );
}

function BarRow({ label, width, value, color }: { label: string; width: number; value: string; color: string }) {
    return (
        <div className="mb-1.5 flex items-center gap-2 text-[9.5px]">
            <span className="w-[150px] text-right font-bold text-[#3c5a5c]">{label}</span>
            <span className="h-[11px] flex-1 overflow-hidden rounded-full bg-[#eef4f6]">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, width))}%`, background: color }} />
            </span>
            <span className="w-[60px] text-[9px] font-extrabold text-[#0e7d74]">{value}</span>
        </div>
    );
}
