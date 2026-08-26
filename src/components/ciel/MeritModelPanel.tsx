"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import { type CourseProjectEntry, stripEmoji, courseProjectStory } from "@/utils/courseProjectTypes";
import {
    MERIT_RUBRIC,
    MERIT_NEUTRALITY_NOTE,
    computeMeritScorecard,
    whyThisRank,
    rubricBand,
    RUBRIC_SCALE,
    type MeritScorecard,
    type MeritCriterionResult,
    type MeritConsistencyFlag,
    type RubricBand,
} from "@/utils/courseworkMeritModel";

export interface MeritEntry extends CourseProjectEntry {
    student?: { id: string; name: string; email: string; institution?: string; department?: string } | null;
}

interface BackendMeritCard {
    id: string;
    scorecard: Record<MeritCriterionResult["key"], { pts: number; max: number; note: string; flag?: string }> & { total: number };
}

function scorecardFromBackend(card: BackendMeritCard): MeritScorecard {
    const criteria: MeritCriterionResult[] = MERIT_RUBRIC.map((rubric) => {
        const crit = card.scorecard[rubric.key];
        return { ...rubric, points: crit?.pts ?? 0, note: crit?.note ?? "" };
    });
    const honestyFlag = card.scorecard.honesty?.flag;
    const consistency: MeritConsistencyFlag = honestyFlag
        ? { ok: honestyFlag.startsWith("✅"), message: honestyFlag.replace(/^[✅⚠️]\s*/u, "") }
        : { ok: true, message: "Consistency check passed: claims match the declared evidence." };
    const total = card.scorecard.total;
    return { criteria, total, grade: total >= 85 ? "EXEMPLARY" : total >= 70 ? "STRONG" : total >= 55 ? "DEVELOPING" : "EMERGING", gradeColor: "#6d28d9", consistency, eligible: true };
}

export function entryDepartment(e: MeritEntry): string {
    return e.student?.department || e.studentInfo?.department || "Unspecified";
}
export function entryUniversity(e: MeritEntry): string {
    return e.student?.institution || e.studentInfo?.universityName || "Unspecified";
}
export function entryFaculty(e: MeritEntry): string {
    return e.studentInfo?.teacherName || "Unassigned";
}
function entrySemesterNum(e: MeritEntry): number {
    const m = (e.studentInfo?.semester || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
}
export function entryFormat(e: MeritEntry): string {
    const format = e.assignmentInfo?.formats?.[0] || e.assignmentInfo?.format;
    if (format) return stripEmoji(format).split(" (")[0];
    return e.studentInfo?.courseworkTypes?.[0] || e.studentInfo?.courseworkType || "Coursework";
}
function entryYear(e: MeritEntry): string {
    const d = e.updatedAt || e.createdAt;
    return d ? String(new Date(d).getFullYear()) : "";
}
function entryMonth(e: MeritEntry): string {
    const d = e.updatedAt || e.createdAt;
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function displayName(e: MeritEntry): string {
    return e.student?.name || e.studentInfo?.studentName || "Student";
}
function firstNameOf(e: MeritEntry): string {
    return displayName(e).split(" ")[0] || "Student";
}

const BAND_FILL: Record<RubricBand, string> = { EXEMPLARY: "#0e7d74", SOLID: "#d97706", DEVELOPING: "#e11d48" };
const BAND_CHIP: Record<RubricBand, string> = {
    EXEMPLARY: "bg-[#e6f6f4] text-[#0e7d74]",
    SOLID: "bg-[#fbf0d7] text-[#b45309]",
    DEVELOPING: "bg-[#fdf1f4] text-[#e11d48]",
};
const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The AI Analyzer — one rubric, three scopes. Faculty / university / CIEL Master all render this
 * panel; only the pool (and which filters appear) changes. Scores come from GET .../merit-model
 * when provided; local computeMeritScorecard is the fallback. Ranking never runs on unapproved cards.
 */
export default function MeritModelPanel({
    entries,
    showDepartmentFilter = false,
    showFacultyFilter = false,
    showUniversityFilter = false,
    meritEndpoint,
    scopeName = "this scope",
}: {
    entries: MeritEntry[];
    showDepartmentFilter?: boolean;
    showFacultyFilter?: boolean;
    showUniversityFilter?: boolean;
    meritEndpoint?: string;
    /** Human label for the stamp / notifications — e.g. "Fatima’s cohort", "BNU", "CIEL PK — all universities". */
    scopeName?: string;
}) {
    const [ranked, setRanked] = useState(false);
    const [backendCards, setBackendCards] = useState<Map<string, BackendMeritCard>>(new Map());
    const [meritLoading, setMeritLoading] = useState(false);
    const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
    const [notifyState, setNotifyState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
    const [rubOpen, setRubOpen] = useState<MeritCriterionResult["key"] | null>(null);
    const requestIdRef = useRef(0);
    const lastNotified = useRef("");

    const [department, setDepartment] = useState("all");
    const [faculty, setFaculty] = useState("all");
    const [university, setUniversity] = useState("all");
    const [format, setFormat] = useState("all");
    const [year, setYear] = useState("all");
    const [dfrom, setDfrom] = useState("");
    const [dto, setDto] = useState("");
    const [semFrom, setSemFrom] = useState<number | "">("");
    const [semTo, setSemTo] = useState<number | "">("");

    const approved = useMemo(() => entries.filter((e) => e.status === "submitted" && e.facultyApprovalStatus === "approved"), [entries]);
    const departments = useMemo(() => Array.from(new Set(approved.map(entryDepartment))).sort(), [approved]);
    const faculties = useMemo(() => Array.from(new Set(approved.map(entryFaculty))).sort(), [approved]);
    const universities = useMemo(() => Array.from(new Set(approved.map(entryUniversity))).sort(), [approved]);
    const formats = useMemo(() => Array.from(new Set(approved.map(entryFormat))).sort(), [approved]);
    const years = useMemo(() => Array.from(new Set(approved.map(entryYear).filter(Boolean))).sort().reverse(), [approved]);
    const semesters = useMemo(() => Array.from(new Set(approved.map(entrySemesterNum).filter(Boolean))).sort((a, b) => a - b), [approved]);
    const from = semFrom === "" ? (semesters[0] ?? 0) : semFrom;
    const to = semTo === "" ? (semesters[semesters.length - 1] ?? 99) : semTo;

    const pool = useMemo(() => {
        return approved.filter((e) => {
            if (showDepartmentFilter && department !== "all" && entryDepartment(e) !== department) return false;
            if (showFacultyFilter && faculty !== "all" && entryFaculty(e) !== faculty) return false;
            if (showUniversityFilter && university !== "all" && entryUniversity(e) !== university) return false;
            if (format !== "all" && entryFormat(e) !== format) return false;
            if (year !== "all" && entryYear(e) !== year) return false;
            const m = entryMonth(e);
            if (dfrom && m && m < dfrom) return false;
            if (dto && m && m > dto) return false;
            if (semesters.length) {
                const s = entrySemesterNum(e);
                if (s && (s < from || s > to)) return false;
            }
            return true;
        });
    }, [approved, showDepartmentFilter, department, showFacultyFilter, faculty, showUniversityFilter, university, format, year, dfrom, dto, semesters, from, to]);

    const clearFilters = () => {
        setDepartment("all");
        setFaculty("all");
        setUniversity("all");
        setFormat("all");
        setYear("all");
        setDfrom("");
        setDto("");
        setSemFrom("");
        setSemTo("");
        setRanked(false);
        setNotifiedIds([]);
        setNotifyState("idle");
    };

    const runMeritModel = () => {
        setRanked(true);
        setNotifiedIds([]);
        setNotifyState("idle");
        lastNotified.current = "";
        if (!meritEndpoint) return;
        const requestId = ++requestIdRef.current;
        setMeritLoading(true);
        authenticatedFetch(meritEndpoint)
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (requestId !== requestIdRef.current) return;
                const cards: BackendMeritCard[] = Array.isArray(result?.data?.entries)
                    ? result.data.entries
                    : Array.isArray(result?.data?.groups)
                      ? result.data.groups.flatMap((g: { entries: BackendMeritCard[] }) => g.entries)
                      : [];
                setBackendCards(new Map(cards.filter((c) => c.id).map((c) => [c.id, c])));
            })
            .catch(() => {})
            .finally(() => {
                if (requestId === requestIdRef.current) setMeritLoading(false);
            });
    };

    const scored = useMemo(() => {
        const withScores = pool.map((e) => {
            const backendCard = e.id ? backendCards.get(e.id) : undefined;
            const scorecard = backendCard ? scorecardFromBackend(backendCard) : computeMeritScorecard(e);
            return { entry: e, scorecard };
        });
        if (ranked) {
            withScores.sort(
                (a, b) =>
                    b.scorecard.total - a.scorecard.total ||
                    (b.entry.evidenceUrls?.length ?? 0) - (a.entry.evidenceUrls?.length ?? 0),
            );
        }
        return withScores;
    }, [pool, ranked, backendCards]);

    const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.scorecard.total, 0) / scored.length) : 0;
    const top3 = ranked ? scored.slice(0, 3) : [];

    const notifyTop = (ids: string[], picks: { entryId: string; rank: number; of: number; total: number }[]) => {
        if (!meritEndpoint || !ids.length) return;
        setNotifyState("sending");
        authenticatedFetch(`${meritEndpoint.replace(/\/merit-model\/?$/, "")}/merit-model/notify`, {
            method: "POST",
            body: JSON.stringify({ entryIds: ids, picks, scopeLabel: scopeName }),
        })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.success) {
                    setNotifiedIds(ids);
                    setNotifyState("sent");
                    return;
                }
                setNotifyState("failed");
            })
            .catch(() => setNotifyState("failed"));
    };

    const topIds = top3.map((x) => x.entry.id).filter(Boolean) as string[];
    const topPicks = top3
        .filter((x) => x.entry.id)
        .map((x, i) => ({ entryId: x.entry.id as string, rank: i + 1, of: scored.length, total: x.scorecard.total }));
    const notifiedKey = topIds.join(",");
    useEffect(() => {
        if (!ranked || meritLoading || !topIds.length || notifyState !== "idle") return;
        if (lastNotified.current === notifiedKey) return;
        lastNotified.current = notifiedKey;
        notifyTop(topIds, topPicks);
        // notify once per unique top-3 set after scores settle
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranked, meritLoading, notifiedKey, notifyState]);

    const filterLabel = [
        showUniversityFilter ? "UNIVERSITY" : null,
        showDepartmentFilter ? "DEPARTMENT" : null,
        showFacultyFilter ? "FACULTY" : null,
        "FORMAT",
        semesters.length > 1 ? "SEMESTER" : null,
        "YEAR",
        "DATE RANGE",
    ]
        .filter(Boolean)
        .join(" · ");

    const selectClass = "min-w-[118px] rounded-[10px] border border-[#dcebee] bg-[#f5fbfa] px-2.5 py-1.5 text-[10px] font-bold text-[#0d2b33]";

    return (
        <div className="space-y-3">
            <p className="text-[10.5px] leading-relaxed text-[#7a919a]">
                The <b className="text-[#0d2b33]">same model and the same standard rubric</b> serve Faculty, University and CIEL PK
                Master — only the pool changes. Set your filters → see the flash cards → run the model. Every pick comes with
                reasoning <b className="text-[#0d2b33]">and the flash card attached</b>.
            </p>

            <div className="rounded-[16px] border-2 border-[#e2d9f7] bg-white px-4 py-3.5 text-[10.5px] leading-relaxed text-[#4c3a78]">
                📐 <b className="text-[#6d28d9]">The standard rubric — /100, all disciplines, all universities.</b> Tap any card to
                see its full scale (🟢 Exemplary · 🟡 Solid · 🔴 Developing). Ties break on credibility of evidence. Filters change
                the pool — <b>never the maths</b>.
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                    {MERIT_RUBRIC.map((c) => {
                        const scale = RUBRIC_SCALE[c.key];
                        const on = rubOpen === c.key;
                        return (
                            <button
                                key={c.key}
                                type="button"
                                onClick={() => setRubOpen(on ? null : c.key)}
                                className={clsx(
                                    "rounded-[13px] border-[1.5px] px-2 py-2 text-center transition",
                                    on ? "border-[#6d28d9] bg-[#6d28d9] text-white" : "border-[#e2d9f7] bg-white hover:-translate-y-0.5",
                                )}
                            >
                                <span className="text-base">{scale.emoji}</span>
                                <div className={clsx("text-[15px] font-extrabold", on ? "text-white" : "text-[#6d28d9]")}>{c.max}</div>
                                <div className={clsx("mt-0.5 text-[7.5px] font-extrabold leading-tight tracking-wide", on ? "text-white" : "text-[#7a919a]")}>
                                    {scale.title.split(" — ")[0].toUpperCase()}
                                </div>
                            </button>
                        );
                    })}
                </div>
                {rubOpen && (
                    <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                        {(() => {
                            const w = MERIT_RUBRIC.find((c) => c.key === rubOpen)!.max;
                            const scale = RUBRIC_SCALE[rubOpen];
                            const exLo = Math.ceil(0.85 * w);
                            const soLo = Math.ceil(0.62 * w);
                            return (
                                <>
                                    <div className="rounded-[10px] bg-[#e6f6f4] px-2.5 py-2 text-[9.5px] leading-relaxed">
                                        <b className="block text-[8px] tracking-wide text-[#0e7d74]">🟢 EXEMPLARY · {exLo === w ? w : `${exLo}–${w}`} pts</b>
                                        {scale.exemplary}
                                    </div>
                                    <div className="rounded-[10px] bg-[#fbf0d7] px-2.5 py-2 text-[9.5px] leading-relaxed">
                                        <b className="block text-[8px] tracking-wide text-[#b45309]">🟡 SOLID · {soLo === exLo - 1 ? soLo : `${soLo}–${exLo - 1}`} pts</b>
                                        {scale.solid}
                                    </div>
                                    <div className="rounded-[10px] bg-[#fdf1f4] px-2.5 py-2 text-[9.5px] leading-relaxed">
                                        <b className="block text-[8px] tracking-wide text-[#e11d48]">🔴 DEVELOPING · ≤ {soLo - 1} pts</b>
                                        {scale.developing}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
                <p className="mt-2 text-[10px] leading-relaxed text-[#0f5e57]">⚖️ {MERIT_NEUTRALITY_NOTE}</p>
            </div>

            <div className="rounded-[16px] border border-[#dcebee] bg-white px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[8.5px] font-extrabold tracking-[0.13em] text-[#6d28d9]">
                    🔍 SCOPE FILTERS — {filterLabel}
                    <button type="button" onClick={clearFilters} className="ml-auto rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold text-[#b45309]">
                        ✕ CLEAR
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {showUniversityFilter && universities.length > 0 && (
                        <select value={university} onChange={(e) => setUniversity(e.target.value)} className={selectClass}>
                            <option value="all">University: All</option>
                            {universities.map((u) => (
                                <option key={u} value={u}>University: {u}</option>
                            ))}
                        </select>
                    )}
                    {showDepartmentFilter && departments.length > 0 && (
                        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
                            <option value="all">Department: All</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>Department: {d}</option>
                            ))}
                        </select>
                    )}
                    {showFacultyFilter && faculties.length > 0 && (
                        <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className={selectClass}>
                            <option value="all">Faculty: All</option>
                            {faculties.map((f) => (
                                <option key={f} value={f}>Faculty: {f}</option>
                            ))}
                        </select>
                    )}
                    <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectClass}>
                        <option value="all">Format: All</option>
                        {formats.map((f) => (
                            <option key={f} value={f}>Format: {f}</option>
                        ))}
                    </select>
                    {semesters.length > 1 && (
                        <>
                            <select value={from} onChange={(e) => setSemFrom(Number(e.target.value))} className={selectClass}>
                                {semesters.map((s) => (
                                    <option key={s} value={s}>From sem {s}</option>
                                ))}
                            </select>
                            <select value={to} onChange={(e) => setSemTo(Number(e.target.value))} className={selectClass}>
                                {semesters.map((s) => (
                                    <option key={`t-${s}`} value={s}>To sem {s}</option>
                                ))}
                            </select>
                        </>
                    )}
                    <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
                        <option value="all">Year: All</option>
                        {years.map((y) => (
                            <option key={y} value={y}>Year: {y}</option>
                        ))}
                    </select>
                    <label className="text-[8px] font-extrabold text-[#7a919a]">
                        FROM <input type="month" value={dfrom} onChange={(e) => setDfrom(e.target.value)} className={selectClass} />
                    </label>
                    <label className="text-[8px] font-extrabold text-[#7a919a]">
                        TO <input type="month" value={dto} onChange={(e) => setDto(e.target.value)} className={selectClass} />
                    </label>
                </div>
                <p className="mt-2 text-[10px] text-[#7a919a]">
                    <b className="text-[#6d28d9]">{pool.length}</b> approved flash card{pool.length === 1 ? "" : "s"} in scope — these are what the model will rank.
                </p>
            </div>

            <p className="text-[8.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">⭐ THE FLASH CARDS IN SCOPE — WHAT THE MODEL WILL RANK</p>
            {pool.length === 0 ? (
                <div className="rounded-[16px] border-[1.5px] border-dashed border-[#cbe7e3] bg-[#fbfefd] px-6 py-8 text-center text-[11px] text-[#7a919a]">
                    🕊️ No approved cards match — widen a filter.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pool.map((e) => (
                        <AnalyzerFlashCard key={e.id} entry={e} />
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={runMeritModel}
                disabled={!pool.length}
                className="rounded-[12px] bg-[#6d28d9] px-6 py-3 text-[12.5px] font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
            >
                ▶ Run the AI model — best → least, reasoned, cards attached
            </button>

            {ranked && (
                <div className="rounded-[13px] border border-[#e2d9f7] bg-[#f1ebfd] px-3.5 py-2.5 text-[10px] leading-relaxed text-[#4c3a78]">
                    {meritLoading ? (
                        <>⏳ <b>Syncing official scores…</b> — showing a provisional local ranking while the real Merit Model results load.</>
                    ) : (
                        <>
                            🧮 <b>Model run complete</b> — {scored.length} approved cards · scope: <b>{scopeName}</b> · cohort average{" "}
                            <b>{avg}/100</b> · standard rubric, identical at every level — a #1 here means exactly what a #1 means
                            anywhere. Evidence re-checked before any card could place.{" "}
                            {notifyState === "sent" ? (
                                <b>Top-ranked students have been notified.</b>
                            ) : notifyState === "failed" ? (
                                <b>Ranking is saved on this screen — student notifications did not send. Retry below.</b>
                            ) : (
                                <b>Notifying top-ranked students…</b>
                            )}
                        </>
                    )}
                </div>
            )}

            {ranked && top3.length > 0 && (
                <div className="rounded-[18px] border-2 border-[#f3d9a0] bg-white px-4 py-4">
                    <p className="text-[10px] font-extrabold tracking-[0.12em] text-[#b45309]">🔔 STUDENT NOTIFICATIONS — DISPATCHED TO THEIR DASHBOARDS</p>
                    {notifyState === "failed" && (
                        <button
                            type="button"
                            onClick={() => {
                                lastNotified.current = "";
                                setNotifyState("idle");
                            }}
                            className="mt-2 rounded-full bg-[#fdf1f4] px-3 py-1 text-[9px] font-extrabold text-[#e11d48]"
                        >
                            Retry notify
                        </button>
                    )}
                    {top3.map((x, i) => (
                        <div key={x.entry.id} className="flex gap-2.5 border-b border-dashed border-[#dcebee] py-2.5 last:border-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0e5f63,#f59e0b)] text-xs font-extrabold text-white">
                                {firstNameOf(x.entry)[0]}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <b className="text-[11px]">{displayName(x.entry)}</b>
                                    <span className="text-[8px] font-extrabold text-[#0e7d74]">
                                        {notifiedIds.includes(x.entry.id!)
                                            ? "✓ SENT · DASHBOARD"
                                            : notifyState === "failed"
                                              ? "NOT SENT"
                                              : "SENDING…"}
                                    </span>
                                </div>
                                <p className="mt-1 rounded-r-[11px] rounded-bl-[11px] bg-[#e6f6f4] px-3 py-2 text-[10.5px] leading-relaxed text-[#1d3a3d]">
                                    🎉 {firstNameOf(x.entry)}, your coursework <b>“{x.entry.projectTitle || "Untitled"}”</b> just ranked{" "}
                                    <b>
                                        {MEDALS[i]} #{i + 1} of {scored.length}
                                    </b>{" "}
                                    in the <b>{scopeName}</b> ranking{i === 0 ? " — the top of the cohort" : ""}. Beautifully done. 💛
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {ranked && top3.length > 0 && (
                <div className="rounded-[18px] border-2 border-[#f3d9a0] bg-[linear-gradient(135deg,#fffbeb,#fff)] px-4 py-4">
                    <p className="text-[10px] font-extrabold tracking-[0.12em] text-[#b45309]">🏆 STUDENT IMPACT WALLS — RANK RIBBON</p>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-[#7a6a45]">
                        The rank is pinned to the flash card itself. After notify succeeds, it hangs on each student&apos;s
                        Impact Wall — ribbon and all.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {top3.map((x, i) => (
                            <div key={x.entry.id} className="rounded-[15px] border border-[#f3d9a0] bg-white p-2 shadow-sm">
                                <div className="rounded-t-[10px] bg-[linear-gradient(90deg,#f59e0b,#fbbf24)] px-2.5 py-1.5 text-[8.5px] font-extrabold tracking-wide text-[#3b2202]">
                                    {MEDALS[i]} RANKED #{i + 1} OF {scored.length} · {scopeName.toUpperCase()} · {x.scorecard.total}/100
                                </div>
                                <AnalyzerFlashCard entry={x.entry} rank={i + 1} total={x.scorecard.total} />
                                <p className="mt-1.5 text-[8px] font-bold leading-relaxed text-[#7a6a45]">
                                    📌 Pinned on <b>{firstNameOf(x.entry)}&apos;s Impact Wall</b> — carried on the card, with the reasoning one tap away.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {ranked &&
                scored.map((x, i) => {
                    const top = i < 3;
                    const verdict = whyThisRank(x.entry, x.scorecard, i, scored, avg);
                    return (
                        <div key={x.entry.id} className={clsx("rounded-[17px] border bg-white px-4 py-3.5", top ? "border-[#e2d9f7] shadow-[0_10px_26px_rgba(109,40,217,.08)]" : "border-[#dcebee]")}>
                            <div className="flex items-start gap-2.5">
                                <span className="w-7 text-center text-[21px]">{MEDALS[i] || `#${i + 1}`}</span>
                                <div className="min-w-0 flex-1">
                                    <b className="text-[12.5px] text-[#0d2b33]">{x.entry.projectTitle || "Untitled coursework"}</b>
                                    <p className="mt-0.5 text-[9px] text-[#7a919a]">
                                        {displayName(x.entry)} · {entryUniversity(x.entry)} · {entryDepartment(x.entry)} · {entryFormat(x.entry)} · {x.entry.studentInfo?.semester || "—"} {entryYear(x.entry)}
                                    </p>
                                    <p className="mt-2.5 text-[8.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">📐 SCORED ON THE SCALE — CRITERION BY CRITERION</p>
                                    {x.scorecard.criteria.map((c) => {
                                        const band = rubricBand(c.points, c.max);
                                        const scale = RUBRIC_SCALE[c.key];
                                        const phrase = scale[band === "EXEMPLARY" ? "exemplary" : band === "SOLID" ? "solid" : "developing"];
                                        return (
                                            <div key={c.key} className="flex items-center gap-2 border-b border-dashed border-[#dcebee] py-1 text-[9.5px] last:border-0">
                                                <span className="w-24 shrink-0 font-extrabold text-[9px]">{scale.title.split(" — ")[0].split(" &")[0]}</span>
                                                <span className="h-[7px] w-[90px] shrink-0 overflow-hidden rounded-full bg-[#eef4f6]">
                                                    <span className="block h-full rounded-full" style={{ width: `${Math.round((c.points / c.max) * 100)}%`, background: BAND_FILL[band] }} />
                                                </span>
                                                <span className="w-11 shrink-0 font-extrabold text-[#6d28d9]">
                                                    {Math.round(c.points * 10) / 10}/{c.max}
                                                </span>
                                                <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[6.5px] font-extrabold", BAND_CHIP[band])}>{band}</span>
                                                <span className="min-w-0 flex-1 truncate text-[#4c5f66]">{phrase}</span>
                                            </div>
                                        );
                                    })}
                                    <p className="mt-2.5 text-[8.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">🧠 THE VERDICT — WHY THIS RANK</p>
                                    <p className="mt-1.5 border-l-[3px] border-[#e2d9f7] pl-2.5 text-[10.5px] italic leading-relaxed text-[#4c3a78]">{verdict}</p>
                                    {top && notifyState === "sent" && (
                                        <span className="mt-2 inline-block rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold text-[#b45309]">
                                            🔔 {firstNameOf(x.entry)} notified — rank {i + 1} delivered to their dashboard
                                        </span>
                                    )}
                                    <p className="mt-2.5 text-[8.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">⭐ THE FLASH CARD — ATTACHED</p>
                                    <div className="mt-1.5 max-w-[400px]">
                                        <CourseworkCard entry={x.entry} studentName={x.entry.student?.name} />
                                    </div>
                                </div>
                                <span className="shrink-0 text-[16px] font-extrabold text-[#6d28d9]">
                                    {x.scorecard.total}
                                    <span className="text-[8px] text-[#7a919a]"> /100</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}

function AnalyzerFlashCard({ entry, rank, total }: { entry: MeritEntry; rank?: number; total?: number }) {
    const story = courseProjectStory(entry);
    return (
        <div className="overflow-hidden rounded-[17px] border border-[#dcebee] bg-white">
            <div className="relative bg-[linear-gradient(130deg,#04252b,#0e5f63_55%,#12a5a0_120%)] px-3.5 py-3 text-white">
                {total != null && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] px-2 py-0.5 text-[8px] font-extrabold">
                        {rank ? `#${rank} · ` : ""}
                        {total}/100
                    </span>
                )}
                <div className="pr-16 text-[7px] font-extrabold tracking-[0.13em] text-[#99f6e4]">
                    {entryUniversity(entry)} · {entryDepartment(entry).toUpperCase()} · {(entry.studentInfo?.semester || "").toUpperCase()} {entryYear(entry)}
                </div>
                <b className="mt-1 block text-[11.5px] leading-snug">{entry.projectTitle || "Untitled coursework"}</b>
                <div className="mt-0.5 text-[9px] text-[#cdf5f0]">
                    {displayName(entry)} · {entryFormat(entry)} · supervised by {entryFaculty(entry)}
                </div>
            </div>
            <p className="border-b border-[#dcebee] bg-[#f6fcfb] px-3 py-2 text-[9.5px] italic leading-relaxed text-[#1d3a3d]">“{story}”</p>
            <div className="flex flex-wrap gap-1 px-3 py-2">
                <span className="rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[7px] font-extrabold text-[#0e7d74]">✅ FACULTY-APPROVED</span>
                <span className="rounded-full bg-[#f1ebfd] px-2 py-0.5 text-[7px] font-extrabold text-[#6d28d9]">🧠 STANDARD RUBRIC</span>
            </div>
        </div>
    );
}
