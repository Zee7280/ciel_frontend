"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";
import { type CourseProjectEntry, stripEmoji } from "@/utils/courseProjectTypes";
import { MERIT_RUBRIC, MERIT_NEUTRALITY_NOTE, computeMeritScorecard, whyItLeads, courseworkPotential } from "@/utils/courseworkMeritModel";

export interface MeritEntry extends CourseProjectEntry {
    student?: { id: string; name: string; email: string; institution?: string; department?: string } | null;
}

function entryDepartment(e: MeritEntry): string {
    return e.student?.department || e.studentInfo?.department || "Unspecified";
}
function entryUniversity(e: MeritEntry): string {
    return e.student?.institution || e.studentInfo?.universityName || "Unspecified";
}
function entryFaculty(e: MeritEntry): string {
    return e.studentInfo?.teacherName || "Unassigned";
}
function entrySemesterNum(e: MeritEntry): number {
    const m = (e.studentInfo?.semester || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
}
function entryFormat(e: MeritEntry): string {
    return stripEmoji(e.assignmentInfo?.formats?.[0] || e.assignmentInfo?.format || e.studentInfo?.courseworkType || "Coursework");
}
function entryEmoji(e: MeritEntry): string {
    const f = e.assignmentInfo?.formats?.[0] || e.assignmentInfo?.format || "";
    const m = f.match(/^[^\s]+/);
    return m ? m[0] : "📄";
}

/**
 * Deterministic "Merit Model" ranking panel — computes the six-criterion public rubric score for each
 * entry client-side (no AI call, no run-to-run variance) and ranks on request. Shared by the university
 * showcase deck and the faculty coursework-projects list.
 */
export default function MeritModelPanel({
    entries,
    showDepartmentFilter = false,
    showFacultyFilter = false,
    showUniversityFilter = false,
}: {
    entries: MeritEntry[];
    /** Show a department dropdown — meaningful for a university-wide pool, not a single faculty member's list. */
    showDepartmentFilter?: boolean;
    /** Show a faculty/supervisor dropdown — meaningful once the pool spans more than one teacher (university or CIEL scope). */
    showFacultyFilter?: boolean;
    /** Show a university dropdown — only meaningful for the CIEL-wide, all-universities scope. */
    showUniversityFilter?: boolean;
}) {
    const [ranked, setRanked] = useState(false);
    const [department, setDepartment] = useState("all");
    const [faculty, setFaculty] = useState("all");
    const [university, setUniversity] = useState("all");
    const [openId, setOpenId] = useState<string | null>(null);

    const departments = useMemo(() => Array.from(new Set(entries.map(entryDepartment))).sort(), [entries]);
    const faculties = useMemo(() => Array.from(new Set(entries.map(entryFaculty))).sort(), [entries]);
    const universities = useMemo(() => Array.from(new Set(entries.map(entryUniversity))).sort(), [entries]);
    const semesters = useMemo(() => Array.from(new Set(entries.map(entrySemesterNum).filter(Boolean))).sort((a, b) => a - b), [entries]);
    const [semFrom, setSemFrom] = useState<number | "">("");
    const [semTo, setSemTo] = useState<number | "">("");
    const from = semFrom === "" ? (semesters[0] ?? 0) : semFrom;
    const to = semTo === "" ? (semesters[semesters.length - 1] ?? 99) : semTo;

    const pool = useMemo(() => {
        let p = entries;
        if (showDepartmentFilter && department !== "all") p = p.filter((e) => entryDepartment(e) === department);
        if (showFacultyFilter && faculty !== "all") p = p.filter((e) => entryFaculty(e) === faculty);
        if (showUniversityFilter && university !== "all") p = p.filter((e) => entryUniversity(e) === university);
        if (semesters.length) p = p.filter((e) => { const s = entrySemesterNum(e); return !s || (s >= from && s <= to); });
        return p;
    }, [entries, showDepartmentFilter, department, showFacultyFilter, faculty, showUniversityFilter, university, semesters, from, to]);

    const scored = useMemo(() => {
        const withScores = pool.map((e) => ({ entry: e, scorecard: computeMeritScorecard(e) }));
        if (ranked) withScores.sort((a, b) => b.scorecard.total - a.scorecard.total);
        return withScores;
    }, [pool, ranked]);

    const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.scorecard.total, 0) / scored.length) : 0;
    const scopeText = [
        showUniversityFilter ? (university === "all" ? "all universities" : university) : null,
        showDepartmentFilter ? (department === "all" ? "all departments" : department) : null,
        showFacultyFilter ? (faculty === "all" ? "all faculty" : faculty) : null,
        semesters.length > 1 ? `Semester ${from} → Semester ${to}` : null,
    ].filter(Boolean).join(" · ");
    const topN = 10;

    return (
        <div className="space-y-4">
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                <h2 className="text-sm font-black text-ciel-text">🧮 The rubric v2 — 100 points, sustainability weighted strongest by design</h2>
                <p className="mt-1 text-xs text-ciel-text-soft">Each criterion maps to sections of the coursework form. Students see this before they write; faculty see it while they review; the university publishes it. And every top pick carries the AI&apos;s <b>reason</b> and its <b>🔮 potential forecast</b>.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {MERIT_RUBRIC.map((c) => (
                        <div key={c.key} className="rounded-ciel-sm border border-ciel-border p-3" style={{ borderTopColor: c.color, borderTopWidth: 3 }}>
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-black text-ciel-text">{c.label}</span>
                                <span className="shrink-0 text-base font-black" style={{ color: c.color }}>{c.max}</span>
                            </div>
                            <p className="mt-1 text-[10.5px] leading-relaxed text-ciel-text-soft">{c.description}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-3 rounded-ciel-sm border border-dashed border-ciel-green/40 bg-ciel-green-soft/60 px-4 py-2.5 text-xs leading-relaxed text-ciel-green-deep">
                    ⚖️ <b>Neutrality guarantee:</b> {MERIT_NEUTRALITY_NOTE}
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-ciel-lg border border-ciel-border bg-white p-4">
                {showUniversityFilter && universities.length > 1 && (
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">University</label>
                        <select value={university} onChange={(e) => setUniversity(e.target.value)} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-green">
                            <option value="all">All universities</option>
                            {universities.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                )}
                {showDepartmentFilter && departments.length > 1 && (
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">Discipline / school</label>
                        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-green">
                            <option value="all">All disciplines</option>
                            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                )}
                {showFacultyFilter && faculties.length > 1 && (
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">Faculty</label>
                        <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-green">
                            <option value="all">All faculty</option>
                            {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                )}
                {semesters.length > 1 && (
                    <>
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">From</label>
                            <select value={from} onChange={(e) => setSemFrom(Number(e.target.value))} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-green">
                                {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">To</label>
                            <select value={to} onChange={(e) => setSemTo(Number(e.target.value))} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-green">
                                {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => setRanked(true)}
                    className="ciel-transition ml-auto rounded-ciel-sm bg-ciel-purple px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-purple/90"
                >
                    🧮 Run merit model →
                </button>
            </div>

            {ranked && (
                <div className="rounded-ciel-sm border border-ciel-purple-soft bg-ciel-purple-soft/60 px-4 py-3 text-xs leading-relaxed text-ciel-purple">
                    🧮 <b>Model run complete</b> — {scored.length} flash card{scored.length === 1 ? "" : "s"} scored on rubric v2 (sustainability-anchored, 25pts){scopeText ? <> · scope: {scopeText}</> : null} · cohort average <b>{avg}/100</b>. Top {Math.min(topN, scored.length)} are AI picks — each with its reason and its 🔮 potential. Order = merit, nothing else.
                </div>
            )}

            <div className="space-y-3">
                {scored.length === 0 && (
                    <p className="rounded-ciel-sm bg-ciel-page px-4 py-8 text-center text-sm font-semibold text-ciel-text-soft">No flash cards in this scope.</p>
                )}
                {scored.map((x, i) => {
                    const topPick = ranked && i < topN;
                    const open = openId === x.entry.id;
                    const primary = x.entry.sdgMapping?.entries?.[0];
                    const sdg = primary ? sdgData.find((s) => s.number === primary.goalNumber) : null;
                    const displayName = x.entry.student?.name || x.entry.studentInfo?.studentName || "Student";
                    return (
                        <div key={x.entry.id} className={clsx("relative overflow-hidden rounded-ciel-lg border bg-white", topPick ? "border-ciel-purple/50 shadow-md" : "border-ciel-border")}>
                            {topPick && (
                                <div className="absolute left-0 top-0 flex items-center gap-1 rounded-br-ciel-sm bg-ciel-purple px-3 py-1 text-[9px] font-black text-white">
                                    <Trophy className="h-2.5 w-2.5" /> TOP OF COHORT · #{i + 1}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setOpenId(open ? null : (x.entry.id ?? null))}
                                className={clsx("flex w-full items-center gap-3 px-5 py-4 text-left", topPick && "pt-7")}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ciel-sm bg-ciel-page text-sm font-black text-ciel-text-soft">
                                    {ranked ? i + 1 : "·"}
                                </div>
                                <span className="text-xl">{entryEmoji(x.entry)}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-black text-ciel-text">{x.entry.projectTitle || "Untitled coursework"}</span>
                                        {sdg && (
                                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black text-white" style={{ backgroundColor: sdg.color }}>SDG {sdg.number}</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] font-semibold text-ciel-text-soft">
                                        {showUniversityFilter ? `${entryUniversity(x.entry)} · ` : ""}{entryDepartment(x.entry)} · {entryFormat(x.entry)} · {x.entry.studentInfo?.semester || "—"} · {displayName}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-lg font-black text-ciel-purple">{ranked ? `${x.scorecard.total}/100` : "—"}</div>
                                    <div className="text-[9px] font-black" style={{ color: x.scorecard.gradeColor }}>{ranked ? x.scorecard.grade : "TAP RUN"}</div>
                                </div>
                                <ChevronDown className={clsx("h-4 w-4 shrink-0 text-ciel-text-soft transition-transform", open && "rotate-180")} />
                            </button>

                            {topPick && (
                                <div className="space-y-1 px-5 pb-3 pl-[4.5rem]">
                                    <p className="text-[11px] leading-relaxed text-ciel-purple">🤖 <b>AI pick because:</b> {whyItLeads(x.entry, x.scorecard)}</p>
                                    <p className="text-[11px] leading-relaxed text-ciel-teal">🔮 <b>Potential:</b> {courseworkPotential(x.entry)}</p>
                                </div>
                            )}

                            {open && (
                                <div className="space-y-2.5 border-t border-ciel-border bg-ciel-page/40 px-5 py-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-ciel-purple">Scorecard — why this score</p>
                                    {x.scorecard.criteria.map((c) => (
                                        <div key={c.key} className="flex flex-wrap items-center gap-2 text-xs sm:flex-nowrap">
                                            <span className="w-full shrink-0 font-bold text-ciel-text-mid sm:w-40">{c.label}</span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ciel-border">
                                                <div className="h-full rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, backgroundColor: c.color }} />
                                            </div>
                                            <span className="w-14 shrink-0 text-right font-black text-ciel-text">{Math.round(c.points * 10) / 10}/{c.max}</span>
                                            <span className="w-full shrink-0 text-[10px] text-ciel-text-soft sm:w-auto sm:basis-full sm:pl-[10.5rem]">{c.note}</span>
                                        </div>
                                    ))}
                                    <div className={clsx("rounded-ciel-xs border border-dashed px-3 py-2 text-[10.5px] leading-relaxed", x.scorecard.consistency.ok ? "border-ciel-green/40 bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-amber/40 bg-ciel-amber-soft text-ciel-amber")}>
                                        {x.scorecard.consistency.ok ? "✅" : "⚠️"} {x.scorecard.consistency.message}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
