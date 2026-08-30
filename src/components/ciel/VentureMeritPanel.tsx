"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import {
    VENTURE_MERIT_RUBRIC,
    VENTURE_MERIT_NEUTRALITY_NOTE,
    computeVentureMeritScorecard,
    ventureMeritGrade,
    type VentureMeritEntry,
    type VentureMeritScorecard,
    type VentureMeritCriterionScore,
} from "@/utils/ventureMeritModel";

export interface VentureMeritPanelEntry extends VentureMeritEntry {
    student?: { id: string; name: string; email: string; institution?: string; department?: string } | null;
}

/** Shape of one ranked card from GET .../startup-business/merit-model (ciel_backend's RankedVentureMeritCard). */
interface BackendVentureMeritCard {
    id: string;
    scorecard: Record<VentureMeritCriterionScore["key"], { pts: number; max: number; note: string }> & { total: number };
}

function ventureScorecardFromBackend(card: BackendVentureMeritCard): VentureMeritScorecard {
    const criteria: VentureMeritCriterionScore[] = VENTURE_MERIT_RUBRIC.map((rubric) => {
        const crit = card.scorecard[rubric.key];
        return { key: rubric.key, label: rubric.label, max: rubric.max, color: rubric.color, points: crit?.pts ?? 0, note: crit?.note ?? "" };
    });
    const total = card.scorecard.total;
    const [grade, gradeColor] = ventureMeritGrade(total);
    return { criteria, total, grade, gradeColor, eligible: true };
}

function entryUniversity(e: VentureMeritPanelEntry): string {
    return e.student?.institution || "Unspecified";
}
function entryDisplayName(e: VentureMeritPanelEntry): string {
    return e.student?.name || "Founder";
}

/**
 * Deterministic "Venture Merit Model" ranking panel — same 7-criterion, 100-pt rubric as the
 * backend's scoreVenture(), ranked on request. Shared by the faculty supervision deck and (once
 * a university-scoped pool exists) the university showcase deck.
 */
export default function VentureMeritPanel({
    entries,
    showUniversityFilter = false,
    meritEndpoint,
    scopeName = "this scope",
}: {
    entries: VentureMeritPanelEntry[];
    showUniversityFilter?: boolean;
    /** GET .../startup-business/merit-model route matching this caller's role scope. */
    meritEndpoint?: string;
    scopeName?: string;
}) {
    const [ranked, setRanked] = useState(false);
    const [university, setUniversity] = useState("all");
    const [openId, setOpenId] = useState<string | null>(null);
    const [backendCards, setBackendCards] = useState<Map<string, BackendVentureMeritCard>>(new Map());
    const [meritLoading, setMeritLoading] = useState(false);
    const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
    const [notifyState, setNotifyState] = useState<"idle" | "sending" | "sent" | "failed" | "exhausted">("idle");
    const [notifyErrorMessage, setNotifyErrorMessage] = useState<string | null>(null);
    const [graderRuns, setGraderRuns] = useState<{ unlimited: boolean; used: number; limit: number } | null>(null);
    const requestIdRef = useRef(0);
    const lastNotified = useRef("");

    const universities = useMemo(() => Array.from(new Set(entries.map(entryUniversity))).sort(), [entries]);

    const pool = useMemo(() => {
        let p = entries;
        if (showUniversityFilter && university !== "all") p = p.filter((e) => entryUniversity(e) === university);
        return p;
    }, [entries, showUniversityFilter, university]);

    const runMeritModel = () => {
        setRanked(true);
        setNotifiedIds([]);
        setNotifyState("idle");
        setNotifyErrorMessage(null);
        lastNotified.current = "";
        if (!meritEndpoint) return;
        const requestId = ++requestIdRef.current;
        setMeritLoading(true);
        authenticatedFetch(meritEndpoint)
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (requestId !== requestIdRef.current) return;
                const cards: BackendVentureMeritCard[] = Array.isArray(result?.data?.entries) ? result.data.entries : [];
                setBackendCards(new Map(cards.filter((c) => c.id).map((c) => [c.id, c])));
                if (result?.data?.graderRuns) setGraderRuns(result.data.graderRuns);
            })
            .catch(() => {})
            .finally(() => {
                if (requestId === requestIdRef.current) setMeritLoading(false);
            });
    };

    const scored = useMemo(() => {
        const withScores = pool.map((e) => {
            const backendCard = e.id ? backendCards.get(e.id) : undefined;
            const scorecard = backendCard ? ventureScorecardFromBackend(backendCard) : computeVentureMeritScorecard(e);
            return { entry: e, scorecard };
        });
        if (ranked) withScores.sort((a, b) => (Number(b.scorecard.eligible) - Number(a.scorecard.eligible)) || (b.scorecard.total - a.scorecard.total));
        return withScores;
    }, [pool, ranked, backendCards]);

    const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.scorecard.total, 0) / scored.length) : 0;
    const eligibleRanked = useMemo(() => scored.filter((x) => x.scorecard.eligible), [scored]);
    const top3 = ranked ? eligibleRanked.slice(0, 3) : [];

    const notifyTop = (ids: string[], picks: { entryId: string; rank: number; of: number; total: number }[]) => {
        if (!meritEndpoint || !ids.length) return;
        setNotifyState("sending");
        setNotifyErrorMessage(null);
        authenticatedFetch(`${meritEndpoint.replace(/\/merit-model\/?$/, "")}/merit-model/notify`, {
            method: "POST",
            body: JSON.stringify({ entryIds: ids, picks, scopeLabel: scopeName }),
        })
            .then(async (res) => {
                if (!res) {
                    setNotifyState("failed");
                    return;
                }
                const body = await res.json().catch(() => null);
                if (res.ok && body?.success) {
                    setNotifiedIds(ids);
                    setNotifyState("sent");
                    if (body?.data?.graderRuns) setGraderRuns(body.data.graderRuns);
                    return;
                }
                if (res.status === 403 && body?.code === "GRADER_RUNS_EXHAUSTED") {
                    setNotifyState("exhausted");
                    setNotifyErrorMessage(typeof body?.message === "string" ? body.message : "No AI Grader runs left this year.");
                    setGraderRuns({ unlimited: false, used: body.used ?? 3, limit: body.limit ?? 3 });
                    return;
                }
                setNotifyState("failed");
            })
            .catch(() => setNotifyState("failed"));
    };

    const topIds = top3.map((x) => x.entry.id).filter(Boolean) as string[];
    const topPicks = top3
        .filter((x) => x.entry.id)
        .map((x, i) => ({ entryId: x.entry.id as string, rank: i + 1, of: eligibleRanked.length, total: x.scorecard.total }));
    const runsExhausted = !!graderRuns && !graderRuns.unlimited && graderRuns.used >= graderRuns.limit;
    const notifiedKey = topIds.join(",");
    useEffect(() => {
        if (!ranked || meritLoading || !meritEndpoint || !topIds.length || notifyState !== "idle" || runsExhausted) return;
        if (lastNotified.current === notifiedKey) return;
        lastNotified.current = notifiedKey;
        notifyTop(topIds, topPicks);
        // notify once per unique top-3 set after scores settle
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranked, meritLoading, notifiedKey, notifyState, runsExhausted]);

    return (
        <div className="space-y-4">
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                <h2 className="text-sm font-black text-ciel-text">🧮 The rubric — 100 points, published to everyone</h2>
                <p className="mt-1 text-xs text-ciel-text-soft">Same rubric for every venture, every stage, every sector.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {VENTURE_MERIT_RUBRIC.map((c) => (
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
                    ⚖️ <b>Neutral by design:</b> {VENTURE_MERIT_NEUTRALITY_NOTE}
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
                <div className="ml-auto flex flex-wrap items-center gap-2.5">
                    {graderRuns && (
                        <span
                            className={clsx(
                                "rounded-full px-3 py-1.5 text-[9.5px] font-extrabold",
                                graderRuns.unlimited
                                    ? "bg-ciel-green-soft text-ciel-green-deep"
                                    : runsExhausted
                                      ? "bg-red-50 text-red-700"
                                      : "bg-ciel-purple-soft text-ciel-purple",
                            )}
                        >
                            {graderRuns.unlimited ? "♾️ Unlimited runs" : `Runs used this year: ${graderRuns.used} of ${graderRuns.limit}`}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={runMeritModel}
                        disabled={runsExhausted}
                        className="ciel-transition rounded-ciel-sm bg-ciel-purple px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-purple/90 disabled:opacity-50"
                    >
                        🧮 Run merit model →
                    </button>
                </div>
            </div>

            {ranked && (
                <div className="rounded-ciel-sm border border-ciel-purple-soft bg-ciel-purple-soft/60 px-4 py-3 text-xs leading-relaxed text-ciel-purple">
                    {meritLoading ? (
                        <>⏳ <b>Syncing official scores…</b> — showing a provisional local ranking while the real Merit Model results load.</>
                    ) : runsExhausted ? (
                        <>🚫 <b>{notifyErrorMessage || "No AI Grader runs left this year."}</b> The ranking above is still visible, but it could not be pinned/notified.</>
                    ) : (
                        <>
                            🧮 <b>Model run complete</b> — {scored.length} venture{scored.length === 1 ? "" : "s"} scored · cohort average <b>{avg}/100</b>. Order is rubric merit, nothing else.{" "}
                            {topIds.length > 0 &&
                                (notifyState === "sent" ? (
                                    <b>Top-ranked founders have been notified.</b>
                                ) : notifyState === "failed" ? (
                                    <b>Ranking is saved on this screen — founder notifications did not send.</b>
                                ) : (
                                    <b>Notifying top-ranked founders…</b>
                                ))}
                        </>
                    )}
                </div>
            )}

            {ranked && top3.length > 0 && (
                <div className="rounded-ciel-lg border-2 border-amber-200 bg-white px-4 py-4">
                    <p className="text-[10px] font-extrabold tracking-[0.12em] text-amber-700">🔔 FOUNDER NOTIFICATIONS — DISPATCHED TO THEIR DASHBOARDS</p>
                    {notifyState === "failed" && (
                        <button
                            type="button"
                            onClick={() => {
                                lastNotified.current = "";
                                setNotifyState("idle");
                            }}
                            className="mt-2 rounded-full bg-red-50 px-3 py-1 text-[9px] font-extrabold text-red-700"
                        >
                            Retry notify
                        </button>
                    )}
                    {top3.map((x, i) => (
                        <div key={x.entry.id} className="flex gap-2.5 border-b border-dashed border-ciel-border py-2.5 last:border-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ciel-purple text-xs font-extrabold text-white">
                                {entryDisplayName(x.entry)[0]}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <b className="text-[11px]">{entryDisplayName(x.entry)}</b>
                                    <span className="text-[8px] font-extrabold text-ciel-green-deep">
                                        {x.entry.id && notifiedIds.includes(x.entry.id)
                                            ? "✓ SENT · DASHBOARD"
                                            : notifyState === "failed" || runsExhausted
                                              ? "NOT SENT"
                                              : "SENDING…"}
                                    </span>
                                </div>
                                <p className="mt-1 rounded-r-ciel-xs rounded-bl-ciel-xs bg-ciel-purple-soft/60 px-3 py-2 text-[10.5px] leading-relaxed text-ciel-text">
                                    🎉 {entryDisplayName(x.entry).split(" ")[0]}, your venture <b>“{x.entry.ventureName || "Untitled"}”</b> just ranked #{i + 1} of {eligibleRanked.length}. Beautifully done. 💛
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3">
                {scored.length === 0 && (
                    <p className="rounded-ciel-sm bg-ciel-page px-4 py-8 text-center text-sm font-semibold text-ciel-text-soft">No ventures in this scope.</p>
                )}
                {scored.map((x, i) => {
                    const ineligible = ranked && !x.scorecard.eligible;
                    const top10 = ranked && i < 10 && x.scorecard.eligible;
                    const open = openId === x.entry.id;
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
                                        <span className="truncate text-sm font-black text-ciel-text">{x.entry.ventureName || "Untitled venture"}</span>
                                        {x.entry.stage && (
                                            <span className="shrink-0 rounded-full bg-ciel-page px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-ciel-text-soft">{x.entry.stage}</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] font-semibold text-ciel-text-soft">
                                        {entryUniversity(x.entry)} · {entryDisplayName(x.entry)}
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
                                    ⛔ <b>Ineligible for AI picks &amp; showcase:</b> not yet supervisor-approved — scored for feedback only. Once approved, it goes live in rankings.
                                </p>
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
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
