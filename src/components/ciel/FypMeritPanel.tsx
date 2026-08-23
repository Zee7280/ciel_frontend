"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";
import { authenticatedFetch } from "@/utils/api";
import { type FypEntry, fypRouteFor, type FypRoute } from "@/utils/fypTypes";
import {
    FYP_MERIT_RUBRIC,
    FYP_MERIT_NEUTRALITY_NOTE,
    computeFypMeritScorecard,
    whyFypLeads,
    fypPotential,
    fypMeritGrade,
    type FypMeritScorecard,
    type FypMeritCriterionResult,
    type FypMeritConsistencyFlag,
} from "@/utils/fypMeritModel";

export interface FypMeritEntry extends FypEntry {
    student?: { id: string; name: string; email: string; institution?: string; department?: string } | null;
}

/** Shape of one ranked card from GET .../fyp-thesis/merit-model (ciel_backend's RankedFypMeritCard). */
interface BackendFypMeritCard {
    id: string;
    route: FypRoute;
    scorecard: Record<FypMeritCriterionResult["key"], { pts: number; max: number; note: string; flag?: string }> & { total: number };
}

const ROUTE_META: Record<FypRoute, { emoji: string; label: string; color: string; soft: string }> = {
    scholar: { emoji: "📜", label: "Scholar", color: "#2563eb", soft: "#e8effe" },
    maker: { emoji: "🎨", label: "Maker", color: "#c98a04", soft: "#fdf3dd" },
    builder: { emoji: "🖥️", label: "Builder", color: "#0f766e", soft: "#e0f3f1" },
    storyteller: { emoji: "🎬", label: "Storyteller", color: "#db2777", soft: "#fdeaf3" },
    consultant: { emoji: "📊", label: "Consultant", color: "#7c3aed", soft: "#f1eafe" },
};
/** The backend's `leadRoute` is a free-text field with no server-side enum validation — coerce
 * anything outside the 5 known routes to "scholar" rather than let an unrecognized string reach
 * ROUTE_META lookups downstream (which would otherwise throw on render). */
function asKnownFypRoute(route: string): FypRoute {
    return route in ROUTE_META ? (route as FypRoute) : "scholar";
}

/** Backend scores are the source of truth for the entries it returns (only supervisor-approved
 * entries are eligible, so every card here is eligible by construction) — local
 * computeFypMeritScorecard remains the fallback for anything the backend didn't return. */
function fypScorecardFromBackend(card: BackendFypMeritCard): FypMeritScorecard {
    const criteria: FypMeritCriterionResult[] = FYP_MERIT_RUBRIC.map((rubric) => {
        const crit = card.scorecard[rubric.key];
        return { ...rubric, points: crit?.pts ?? 0, note: crit?.note ?? "" };
    });
    const honestyFlag = card.scorecard.honesty?.flag;
    const consistency: FypMeritConsistencyFlag = honestyFlag
        ? { ok: honestyFlag.startsWith("✅"), message: honestyFlag.replace(/^[✅⚠️]\s*/u, "") }
        : { ok: true, message: "Consistency: claims match declared evidence." };
    const total = card.scorecard.total;
    const [grade, gradeColor] = fypMeritGrade(total);
    return { route: asKnownFypRoute(card.route), criteria, total, grade, gradeColor, consistency, eligible: true };
}

function entrySchool(e: FypMeritEntry): string {
    return e.projectInfo?.school || e.student?.department || "Unspecified";
}
function entryUniversity(e: FypMeritEntry): string {
    return e.student?.institution || "Unspecified";
}
function entryDisplayName(e: FypMeritEntry): string {
    return e.projectInfo?.studentName || e.student?.name || "Student";
}

/**
 * Deterministic "FYP Merit Model" ranking panel — computes the seven-criterion, route-adjusted rubric
 * score for each entry client-side (no AI call, no run-to-run variance) and ranks on request. Shared
 * by the faculty supervision deck and the university showcase deck.
 */
export default function FypMeritPanel({
    entries,
    showSchoolFilter = false,
    showUniversityFilter = false,
    meritEndpoint,
}: {
    entries: FypMeritEntry[];
    /** Show a school/department dropdown — meaningful for a university-wide pool, not a single supervisor's list. */
    showSchoolFilter?: boolean;
    /** Show a university dropdown — only meaningful for the CIEL-wide, all-universities scope. */
    showUniversityFilter?: boolean;
    /** GET .../fyp-thesis/merit-model route matching this caller's role scope. When set, real
     * backend-computed scores are used for every entry the backend returns (source of truth);
     * entries it doesn't return (not yet approved, or the fetch failed) still show via local computation. */
    meritEndpoint?: string;
}) {
    const [ranked, setRanked] = useState(false);
    const [school, setSchool] = useState("all");
    const [university, setUniversity] = useState("all");
    const [route, setRoute] = useState<FypRoute | "all">("all");
    const [openId, setOpenId] = useState<string | null>(null);
    const [backendCards, setBackendCards] = useState<Map<string, BackendFypMeritCard>>(new Map());
    const [meritLoading, setMeritLoading] = useState(false);
    const requestIdRef = useRef(0);

    const schools = useMemo(() => Array.from(new Set(entries.map(entrySchool))).sort(), [entries]);
    const universities = useMemo(() => Array.from(new Set(entries.map(entryUniversity))).sort(), [entries]);

    const pool = useMemo(() => {
        let p = entries;
        if (showUniversityFilter && university !== "all") p = p.filter((e) => entryUniversity(e) === university);
        if (showSchoolFilter && school !== "all") p = p.filter((e) => entrySchool(e) === school);
        if (route !== "all") p = p.filter((e) => fypRouteFor(e.projectInfo) === route);
        return p;
    }, [entries, showUniversityFilter, university, showSchoolFilter, school, route]);

    const runMeritModel = () => {
        setRanked(true);
        if (!meritEndpoint) return;
        const requestId = ++requestIdRef.current;
        setMeritLoading(true);
        authenticatedFetch(meritEndpoint)
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (requestId !== requestIdRef.current) return; // a newer click already superseded this one
                const cards: BackendFypMeritCard[] = Array.isArray(result?.data?.entries) ? result.data.entries : [];
                setBackendCards(new Map(cards.filter((c) => c.id).map((c) => [c.id, c])));
            })
            .catch(() => {
                // Fetch failed — the panel silently keeps using local computeFypMeritScorecard for everyone.
            })
            .finally(() => {
                if (requestId === requestIdRef.current) setMeritLoading(false);
            });
    };

    const scored = useMemo(() => {
        const withScores = pool.map((e) => {
            const backendCard = e.id ? backendCards.get(e.id) : undefined;
            const scorecard = backendCard ? fypScorecardFromBackend(backendCard) : computeFypMeritScorecard(e);
            return { entry: e, scorecard };
        });
        // Eligible entries (supervisor-approved) always sort above ineligible ones — no loophole
        // where an unapproved record outranks an approved one just by scoring higher.
        if (ranked) withScores.sort((a, b) => (Number(b.scorecard.eligible) - Number(a.scorecard.eligible)) || (b.scorecard.total - a.scorecard.total));
        return withScores;
    }, [pool, ranked, backendCards]);

    const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.scorecard.total, 0) / scored.length) : 0;

    const byRoute = useMemo(() => {
        const groups = new Map<FypRoute, number[]>();
        for (const x of scored) {
            const list = groups.get(x.scorecard.route) ?? [];
            list.push(x.scorecard.total);
            groups.set(x.scorecard.route, list);
        }
        return Array.from(groups.entries()).map(([r, totals]) => ({
            route: r,
            avg: Math.round(totals.reduce((a, b) => a + b, 0) / totals.length),
            count: totals.length,
        }));
    }, [scored]);

    return (
        <div className="space-y-4">
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                <h2 className="text-sm font-black text-ciel-text">🧮 The rubric — 100 points, published to everyone</h2>
                <p className="mt-1 text-xs text-ciel-text-soft">Students see it before they write; faculty and the university see it while they judge. Rigor and evidence are judged inside the project's own route.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {FYP_MERIT_RUBRIC.map((c) => (
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
                    ⚖️ <b>Route fairness, enforced and shown:</b> {FYP_MERIT_NEUTRALITY_NOTE}
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-ciel-lg border border-ciel-border bg-white p-4">
                {showUniversityFilter && universities.length > 1 && (
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">University</label>
                        <select value={university} onChange={(e) => setUniversity(e.target.value)} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-purple">
                            <option value="all">All universities</option>
                            {universities.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                )}
                {showSchoolFilter && schools.length > 1 && (
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">School / dept</label>
                        <select value={school} onChange={(e) => setSchool(e.target.value)} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-purple">
                            <option value="all">All schools</option>
                            {schools.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ciel-text-soft">Route</label>
                    <select value={route} onChange={(e) => setRoute(e.target.value as FypRoute | "all")} className="rounded-ciel-xs border border-ciel-border bg-white px-3 py-2 text-xs font-semibold text-ciel-text outline-none focus:border-ciel-purple">
                        <option value="all">All routes</option>
                        {(Object.keys(ROUTE_META) as FypRoute[]).map((r) => (
                            <option key={r} value={r}>{ROUTE_META[r].emoji} {ROUTE_META[r].label}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={runMeritModel}
                    className="ciel-transition ml-auto rounded-ciel-sm bg-ciel-purple px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-purple/90"
                >
                    🧮 Run merit model →
                </button>
            </div>

            {ranked && (
                <div className="rounded-ciel-sm border border-ciel-purple-soft bg-ciel-purple-soft/60 px-4 py-3 text-xs leading-relaxed text-ciel-purple">
                    {meritLoading ? (
                        <>⏳ <b>Syncing official scores…</b> — showing a provisional local ranking while the real Merit Model results load.</>
                    ) : (
                        <>🧮 <b>Model run complete</b> — {scored.length} FYP flash card{scored.length === 1 ? "" : "s"} scored · cohort average <b>{avg}/100</b>. Top {Math.min(10, scored.length)} are picks, each with its reason. Order is rubric merit, nothing else.</>
                    )}
                    {byRoute.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest">⚖️ Route fairness — avg by route:</span>
                            {byRoute.map((r) => (
                                <span key={r.route} className="rounded-full border border-ciel-purple-soft bg-white px-2.5 py-1 text-[10px] font-black text-ciel-purple">
                                    {ROUTE_META[r.route].emoji} {ROUTE_META[r.route].label}: {r.avg}/100 ({r.count})
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {scored.length === 0 && (
                    <p className="rounded-ciel-sm bg-ciel-page px-4 py-8 text-center text-sm font-semibold text-ciel-text-soft">No FYP cards in this scope.</p>
                )}
                {scored.map((x, i) => {
                    const ineligible = ranked && !x.scorecard.eligible;
                    const top10 = ranked && i < 10 && x.scorecard.eligible;
                    const open = openId === x.entry.id;
                    const primary = x.entry.sdgMapping?.entries?.[0];
                    const sdg = primary ? sdgData.find((s) => s.number === primary.goalNumber) : null;
                    const routeMeta = ROUTE_META[x.scorecard.route];
                    return (
                        <div key={x.entry.id} className={clsx("relative overflow-hidden rounded-ciel-lg border bg-white", top10 ? "border-ciel-purple/50 shadow-md" : "border-ciel-border", ineligible && "opacity-55")}>
                            {top10 && (
                                <div className="absolute left-0 top-0 flex items-center gap-1 rounded-br-ciel-sm bg-ciel-purple px-3 py-1 text-[9px] font-black text-white">
                                    <Trophy className="h-2.5 w-2.5" /> TOP OF COHORT · #{i + 1}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setOpenId(open ? null : (x.entry.id ?? null))}
                                className={clsx("flex w-full items-center gap-3 px-5 py-4 text-left", top10 && "pt-7")}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ciel-sm bg-ciel-page text-sm font-black text-ciel-text-soft">
                                    {ranked ? (ineligible ? "⛔" : i + 1) : "·"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-black text-ciel-text">{x.entry.projectInfo?.title || x.entry.projectTitle || "Untitled thesis"}</span>
                                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ backgroundColor: routeMeta.soft, color: routeMeta.color }}>
                                            {routeMeta.emoji} {routeMeta.label.toUpperCase()}
                                        </span>
                                        {sdg && (
                                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black text-white" style={{ backgroundColor: sdg.color }}>SDG {sdg.number}</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] font-semibold text-ciel-text-soft">
                                        {entrySchool(x.entry)} · {entryDisplayName(x.entry)} · {x.entry.projectInfo?.supervisorName || "—"}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-lg font-black text-ciel-purple">{ranked ? `${x.scorecard.total}/100` : "—"}</div>
                                    <div className="text-[9px] font-black" style={{ color: ineligible ? "#b45309" : x.scorecard.gradeColor }}>{ranked ? (ineligible ? "INELIGIBLE" : x.scorecard.grade) : "TAP RUN"}</div>
                                </div>
                                <ChevronDown className={clsx("h-4 w-4 shrink-0 text-ciel-text-soft transition-transform", open && "rotate-180")} />
                            </button>

                            {ineligible && (
                                <p className="px-5 pb-3 pl-[4.5rem] text-[11px] leading-relaxed text-amber-700">
                                    ⛔ <b>Ineligible for AI picks &amp; showcase:</b> {x.entry.supervisorApprovalStatus === "rejected" ? "supervisor requested changes" : "awaiting supervisor approval"} — scored for feedback only. Once your supervisor approves, it goes live in rankings.
                                </p>
                            )}
                            {top10 && (
                                <>
                                    <p className="px-5 pb-1 pl-[4.5rem] text-[11px] leading-relaxed text-ciel-purple">🤖 {whyFypLeads(x.entry, x.scorecard)}</p>
                                    <p className="px-5 pb-3 pl-[4.5rem] text-[11px] leading-relaxed text-teal-700">🔮 <b>Potential:</b> {fypPotential(x.entry, x.scorecard)}</p>
                                </>
                            )}

                            {open && (
                                <div className="space-y-2.5 border-t border-ciel-border bg-ciel-page/40 px-5 py-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-ciel-purple">Scorecard — why this score</p>
                                    {x.scorecard.criteria.map((c) => (
                                        <div key={c.key} className="flex flex-wrap items-center gap-2 text-xs sm:flex-nowrap">
                                            <span className="w-full shrink-0 font-bold text-ciel-text-mid sm:w-48">{c.label}</span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ciel-border">
                                                <div className="h-full rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, backgroundColor: c.color }} />
                                            </div>
                                            <span className="w-14 shrink-0 text-right font-black text-ciel-text">{Math.round(c.points * 10) / 10}/{c.max}</span>
                                            <span className="w-full shrink-0 text-[10px] text-ciel-text-soft sm:w-auto sm:basis-full sm:pl-[12.5rem]">{c.note}</span>
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
