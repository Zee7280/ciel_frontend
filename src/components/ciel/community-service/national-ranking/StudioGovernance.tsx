"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { computeSpecialistAwards, excellenceBand } from "./studio-explain";
import {
    CHALLENGE_STATUS_LABEL,
    TREND_LEGEND,
    bestPublishedRank,
    challengeBlockers,
    correctableCriteria,
    describeAction,
    effectiveAnchor,
    feedHeadline,
    feedMessage,
    overrideBlockers,
    rankPercentile,
    rankSeries,
    sparklinePoints,
    trendReading,
    type OverrideDraft,
} from "./studio-governance";
import {
    fmtDate,
    fmtNum,
    type AdminAction,
    type CriterionMeta,
    type FeedStatus,
    type LibraryPackage,
    type ProjectRanking,
    type RankHistoryPoint,
    type RankingChallenge,
    type RunPayload,
    type RunRow,
    type StudioRole,
} from "./studio-types";

/**
 * NPE-1.3 governance panels (National Ranking Analyzer v2): automatic feed check, Admin criterion
 * corrections, administrator action log, challenge process and the flashcard projection with rank
 * progression. Every write goes through the server, which validates, logs and re-ranks; nothing
 * here edits a published ranking or an approved CII.
 */

async function call<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await authenticatedFetch(url, init ? { headers: { "Content-Type": "application/json" }, ...init } : undefined);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) {
        const msg = (json as { message?: string | string[] } | null)?.message;
        throw new Error(Array.isArray(msg) ? msg.join(" ") : msg || "The request failed. Please try again.");
    }
    return ((json as { data?: T } | null)?.data ?? json) as T;
}

// ------------------------------------------------------------------------------------ feed strip

export function FeedStrip({ studioBase, busy, refreshKey, onRunAll }: { studioBase: string; busy: boolean; refreshKey: number; onRunAll: () => void }) {
    const [feed, setFeed] = useState<FeedStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const check = useCallback(async () => {
        setChecking(true);
        try {
            setFeed(await call<FeedStatus>(`${studioBase}/feed`));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Feed check failed.");
        } finally {
            setChecking(false);
        }
    }, [studioBase]);
    // Re-check silently whenever something changed on the server (publish, correction, challenge).
    useEffect(() => {
        if (refreshKey > 0) void check();
    }, [refreshKey, check]);
    const head = feedHeadline(feed, error);
    const c = feed?.counts;
    return (
        <section className="panel" data-testid="feed-strip" style={{ marginBottom: 14 }}>
            <div className="paneltitle">
                Automatic My Impact Wall connection
                <span className={`labelchip ${head.tone === "ok" ? "" : head.tone === "error" ? "red" : head.tone === "warn" ? "gold" : "gray"}`}>{head.label}</span>
            </div>
            <p className="smallnote">
                No manual package uploads. The server reads all four sources, including the <b>approved CII score</b>, from every project’s final My Impact Wall package.
                {feed ? ` Checked ${fmtDate(feed.checkedAt)} · ${feed.rubricVersion}.` : ""}
            </p>
            <p className="smallnote" aria-live="polite">{feedMessage(feed, error)}</p>
            <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn sm" disabled={checking} onClick={() => void check()}>{checking ? "Checking…" : "↻ Check automatic feed"}</button>
                <button type="button" className="btn primary" disabled={busy || checking || !feed || !feed.canRun} title={!feed ? "Check the feed first" : ""} onClick={onRunAll}>Run ALL approved projects</button>
            </div>
            {c ? (
                <div className="stats" style={{ marginTop: 12 }}>
                    <div className="stat"><small>Discovered</small><b>{c.discovered}</b><span>Approved packages</span></div>
                    <div className="stat"><small>Packages checked</small><b>{c.eligible}</b><span>Four-part check passed</span></div>
                    <div className="stat"><small>Evaluated</small><b>{c.evaluated}</b><span>{c.awaitingRead ? `${c.awaitingRead} awaiting read` : "All eligible read"}</span></div>
                    <div className="stat"><small>Verification pending</small><b>{c.held}</b><span>Held, never guessed</span></div>
                    <div className="stat"><small>Corrections · challenges</small><b>{c.corrections} · {c.openChallenges}</b><span>Active · open</span></div>
                    <div className="stat"><small>Publication revision</small><b>{feed?.lastPublication ? feed.lastPublication.revision : "Not yet"}</b><span>{feed?.lastPublication ? fmtDate(feed.lastPublication.publishedAt) : "Independent of CII"}</span></div>
                </div>
            ) : null}
        </section>
    );
}

// ------------------------------------------------------------------------------ corrections

export function CorrectionPanel({
    studioBase,
    row,
    criteria,
    onChanged,
}: {
    studioBase: string;
    row: RunRow | null;
    criteria: CriterionMeta[];
    onChanged: () => Promise<void> | void;
}) {
    const allowed = correctableCriteria(row, criteria);
    const [draft, setDraft] = useState<OverrideDraft>({ criterion: allowed[0]?.key ?? "", anchor: null, locator: "", reason: "" });
    const [saving, setSaving] = useState(false);
    const blockers = overrideBlockers({ ...draft, criterion: draft.criterion || allowed[0]?.key || "" }, row, criteria);
    const active = row?.overrides ?? [];
    const stale = row?.staleOverrides ?? [];
    const current = draft.criterion ? effectiveAnchor(row, draft.criterion) : null;
    const ai = draft.criterion ? row?.evaluation?.criteria?.[draft.criterion]?.anchor : null;

    const save = async () => {
        if (!row || blockers.length || saving) return;
        setSaving(true);
        try {
            await call(`${studioBase}/overrides`, {
                method: "POST",
                body: JSON.stringify({ reportId: row.id, criterion: draft.criterion, anchor: draft.anchor, locator: draft.locator.trim(), reason: draft.reason.trim() }),
            });
            toast.success("Correction saved and audited. Draft rankings recalculated; publication is still a separate step.");
            setDraft((d) => ({ ...d, anchor: null, locator: "", reason: "" }));
            await onChanged();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Correction not saved.");
        } finally {
            setSaving(false);
        }
    };
    const revoke = async (id: string) => {
        if (saving) return;
        setSaving(true);
        try {
            await call(`${studioBase}/overrides/${encodeURIComponent(id)}/revoke`, { method: "POST", body: JSON.stringify({ reason: "Revoked from the Ranking Studio." }) });
            toast.success("Correction revoked. The AI anchor applies again.");
            await onChanged();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not revoke the correction.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="source-detail" data-testid="correction-panel">
            <h4>Admin criterion correction <span className="labelchip gold">NPE-1.3 · audited</span></h4>
            <p className="smallnote">
                The AI assessment is immutable. An authorized, evidence-backed correction is saved by the server, written to the administrator action log and applied to the next ranking preview and publication. It never changes the approved CII.
            </p>
            {active.length ? (
                <ul>
                    {active.map((o) => (
                        <li key={o.id}>
                            <b>{criteria.find((c) => c.key === o.criterion)?.label ?? o.criterion}</b>: AI {fmtNum(o.aiAnchor)}/5 → <b>{o.anchor}/5</b>
                            <span className="muted"> · {o.locator} · {o.reason}{o.createdAt ? ` · ${fmtDate(o.createdAt)}` : ""}</span>{" "}
                            <button type="button" className="rowlink" disabled={saving} onClick={() => void revoke(o.id)}>Revoke</button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="smallnote">No active correction. The AI anchors are used as judged.</p>
            )}
            {stale.length ? <div className="callout">Corrections for an earlier version of this report ({stale.join(", ")}) are kept in the audit trail but not applied: the re-approved content was never reviewed.</div> : null}
            {!row?.evaluation ? (
                <div className="callout">Run the Ranking Analyzer first. A correction must refer to an existing AI judgment.</div>
            ) : !allowed.length ? (
                <div className="callout">No criterion is currently supported for an administrative adjustment. Resolve the evidence flags first.</div>
            ) : (
                <div className="grid4" style={{ marginTop: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <div className="field">
                        <label htmlFor="rs-ov-criterion">Criterion</label>
                        <select id="rs-ov-criterion" value={draft.criterion || allowed[0].key} onChange={(e) => setDraft((d) => ({ ...d, criterion: e.target.value, anchor: null }))}>
                            {allowed.map((c) => (
                                <option key={c.key} value={c.key}>
                                    {c.label || c.title} · AI {fmtNum(row?.evaluation?.criteria?.[c.key]?.anchor ?? 0)}/5{effectiveAnchor(row, c.key) !== (row?.evaluation?.criteria?.[c.key]?.anchor ?? null) ? ` · corrected ${effectiveAnchor(row, c.key)}/5` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="rs-ov-anchor">New anchor {current != null ? <small className="muted">(now {fmtNum(current)}/5{ai != null && ai !== current ? `, AI ${fmtNum(ai)}/5` : ""})</small> : null}</label>
                        <select id="rs-ov-anchor" value={draft.anchor == null ? "" : String(draft.anchor)} onChange={(e) => setDraft((d) => ({ ...d, anchor: e.target.value === "" ? null : Number(e.target.value) }))}>
                            <option value="">Select 0–5</option>
                            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="rs-ov-locator">Evidence or claim locator</label>
                        <input id="rs-ov-locator" value={draft.locator} placeholder="Exact evidence file ID / page / claim" onChange={(e) => setDraft((d) => ({ ...d, locator: e.target.value }))} />
                    </div>
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                        <label htmlFor="rs-ov-reason">Reason for adjustment</label>
                        <textarea id="rs-ov-reason" rows={3} value={draft.reason} placeholder="Explain the overlooked evidence and the justification (at least 20 characters)" onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        {blockers.length ? <p className="smallnote">{blockers[0]}</p> : null}
                        <button type="button" className="btn primary" disabled={saving || blockers.length > 0} onClick={() => void save()}>{saving ? "Saving…" : "Request authenticated rating adjustment"}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ------------------------------------------------------------------------------------- audit

export function AuditPanel({ studioBase, refreshKey }: { studioBase: string; refreshKey: number }) {
    const [items, setItems] = useState<AdminAction[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await call<AdminAction[]>(`${studioBase}/audit`);
                if (!cancelled) setItems(Array.isArray(rows) ? rows : []);
            } catch {
                if (!cancelled) setItems([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [studioBase, refreshKey]);
    return (
        <section className="panel" data-testid="audit-panel">
            <div className="paneltitle">Recent administrator actions <span className="labelchip gray">{items?.length ?? "…"}</span></div>
            <p className="smallnote">Append-only. Corrections carry locator, reason, approver and before/after values; publications and challenge decisions are recorded next to them.</p>
            {items === null ? (
                <p className="smallnote">Loading…</p>
            ) : items.length ? (
                items.slice(0, 30).map((a) => {
                    const d = describeAction(a);
                    return (
                        <div className="audititem" key={a.id}>
                            <div>
                                <b>{d.title}</b>
                                <small>{d.detail || "—"}</small>
                                <small>{new Date(a.at).toLocaleString()} · {a.role === "ciel_admin" ? "CIEL PK Super Admin" : "University Admin"}</small>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="empty"><b>No adjustments yet</b>Corrections, publications and challenge decisions will appear here.</div>
            )}
        </section>
    );
}

// -------------------------------------------------------------------------------- challenges

export function ChallengesPanel({ studioBase, refreshKey, onChanged }: { studioBase: string; refreshKey: number; onChanged: () => void }) {
    const [items, setItems] = useState<RankingChallenge[] | null>(null);
    const [resolving, setResolving] = useState<string | null>(null);
    const [decision, setDecision] = useState<"upheld" | "dismissed">("dismissed");
    const [resolution, setResolution] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await call<RankingChallenge[]>(`${studioBase}/challenges`);
                if (!cancelled) setItems(Array.isArray(rows) ? rows : []);
            } catch {
                if (!cancelled) setItems([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [studioBase, refreshKey]);
    const resolve = async (id: string) => {
        if (busy || resolution.trim().length < 10) return;
        setBusy(true);
        try {
            await call(`${studioBase}/challenges/${encodeURIComponent(id)}/resolve`, { method: "POST", body: JSON.stringify({ status: decision, resolution: resolution.trim() }) });
            toast.success(decision === "upheld" ? "Challenge upheld. Record the correction and publish a new revision." : "Challenge dismissed. The published position stands.");
            setResolving(null);
            setResolution("");
            onChanged();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not resolve the challenge.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <section className="panel" data-testid="challenges-panel">
            <div className="paneltitle">Challenges on published rankings <span className="labelchip gray">{items?.filter((c) => c.status === "open").length ?? "…"} open</span></div>
            <p className="smallnote">Evidence-based corrections only. Resolving a challenge never edits a published ranking: an upheld challenge is acted on through a criterion correction and a new revision, and the original snapshot stays in the history.</p>
            {items === null ? (
                <p className="smallnote">Loading…</p>
            ) : items.length ? (
                items.map((c) => (
                    <div className="audititem" key={c.id}>
                        <div>
                            <b>{c.publication ? `${c.publication.name}${c.publication.revision > 1 ? ` · update ${c.publication.revision}` : ""}` : "Published ranking"}{c.publication?.rank ? ` · #${c.publication.rank} of ${c.publication.of}` : ""}</b>
                            <small>{CHALLENGE_STATUS_LABEL[c.status] ?? c.status} · raised {fmtDate(c.createdAt)} by {c.raisedByRole === "ciel_admin" ? "CIEL PK" : "University"}</small>
                            <small>Locator: {c.locator} · {c.reason}</small>
                            {c.resolution ? <small>Decision: {c.resolution}{c.resolvedAt ? ` (${fmtDate(c.resolvedAt)})` : ""}</small> : null}
                            {c.canResolve && resolving === c.id ? (
                                <div className="grid4" style={{ gridTemplateColumns: "180px 1fr", marginTop: 8 }}>
                                    <div className="field">
                                        <label htmlFor={`rs-ch-${c.id}`}>Decision</label>
                                        <select id={`rs-ch-${c.id}`} value={decision} onChange={(e) => setDecision(e.target.value as "upheld" | "dismissed")}>
                                            <option value="dismissed">Dismiss · position stands</option>
                                            <option value="upheld">Uphold · correction required</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label htmlFor={`rs-chr-${c.id}`}>Resolution (what the evidence showed)</label>
                                        <input id={`rs-chr-${c.id}`} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="At least 10 characters" />
                                    </div>
                                    <div style={{ gridColumn: "1 / -1" }} className="actions">
                                        <button type="button" className="btn primary sm" disabled={busy || resolution.trim().length < 10} onClick={() => void resolve(c.id)}>Record decision</button>
                                        <button type="button" className="btn sm" disabled={busy} onClick={() => setResolving(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        {c.canResolve && resolving !== c.id ? <button type="button" className="btn sm" onClick={() => setResolving(c.id)}>Resolve</button> : null}
                    </div>
                ))
            ) : (
                <div className="empty"><b>No challenges</b>Stakeholders can challenge a published position from the Impact Wall view with an evidence locator.</div>
            )}
        </section>
    );
}

export function RaiseChallengeForm({ studioBase, projectId, rankings, onRaised }: { studioBase: string; projectId: string; rankings: ProjectRanking[]; onRaised: () => void }) {
    const [publicationId, setPublicationId] = useState(rankings[0]?.publicationId ?? "");
    const [locator, setLocator] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    const chosen = publicationId || rankings[0]?.publicationId || "";
    const blockers = challengeBlockers({ publicationId: chosen, reportId: projectId, locator, reason });
    if (!rankings.length) return null;
    const submit = async () => {
        if (busy || blockers.length) return;
        setBusy(true);
        try {
            await call(`${studioBase}/challenges`, { method: "POST", body: JSON.stringify({ publicationId: chosen, reportId: projectId, locator: locator.trim(), reason: reason.trim() }) });
            toast.success("Challenge recorded. The owner of the ranking scope will review the evidence.");
            setLocator("");
            setReason("");
            setOpen(false);
            onRaised();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Challenge not recorded.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <div style={{ marginTop: 10 }} data-testid="raise-challenge">
            {!open ? (
                <button type="button" className="rowlink" onClick={() => setOpen(true)}>Challenge a published position →</button>
            ) : (
                <div className="grid4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                        <label htmlFor="rs-chal-pub">Published ranking</label>
                        <select id="rs-chal-pub" value={chosen} onChange={(e) => setPublicationId(e.target.value)}>
                            {rankings.map((r) => <option key={r.publicationId} value={r.publicationId}>#{r.rank} · {r.name}{r.revision > 1 ? ` · update ${r.revision}` : ""}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="rs-chal-loc">Evidence locator</label>
                        <input id="rs-chal-loc" value={locator} onChange={(e) => setLocator(e.target.value)} placeholder="File id / page / claim" />
                    </div>
                    <div className="field">
                        <label htmlFor="rs-chal-reason">Evidence-based reason</label>
                        <input id="rs-chal-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 20 characters" />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }} className="actions">
                        {blockers.length ? <span className="smallnote">{blockers[0]}</span> : null}
                        <button type="button" className="btn primary sm" disabled={busy || blockers.length > 0} onClick={() => void submit()}>Submit challenge</button>
                        <button type="button" className="btn sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ------------------------------------------------------------------------ flashcard projection

export function FlashcardProjection({
    studioBase,
    project,
    run,
    criteria,
    role,
    refreshKey,
}: {
    studioBase: string;
    project: LibraryPackage;
    run: RunPayload | null;
    criteria: CriterionMeta[];
    role: StudioRole;
    refreshKey: number;
}) {
    // The parent keys this component by project id, so a project change remounts it with fresh state.
    const [history, setHistory] = useState<RankHistoryPoint[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await call<RankHistoryPoint[]>(`${studioBase}/project/${encodeURIComponent(project.id)}/history`);
                if (!cancelled) setHistory(Array.isArray(rows) ? rows : []);
            } catch {
                if (!cancelled) setHistory([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [studioBase, project.id, refreshKey]);

    const series = useMemo(() => rankSeries(history ?? []), [history]);
    const excellence = series.find((s) => s.points[s.points.length - 1].lens === "excellence" && s.points[s.points.length - 1].groupBy === "project") ?? series[0] ?? null;
    const last = excellence ? excellence.points[excellence.points.length - 1] : null;
    const reading = trendReading(excellence);
    const spark = excellence ? sparklinePoints(excellence.points.filter((p) => p.revision === 1 || p.cohortComparable)) : [];
    const best = bestPublishedRank(excellence);
    const awards = useMemo(() => computeSpecialistAwards(run?.rows, criteria).filter((a) => a.status === "awarded" && a.winners.some((w) => w.row.id === project.id)), [run, criteria, project.id]);
    const publishedRun = Boolean(run?.published);

    return (
        <article className="flashcard" data-testid="flashcard-projection">
            <div className="flashhead">
                <small>MY IMPACT WALL · FLASHCARD PROJECTION</small>
                <h3>Published excellence on the student flashcard</h3>
                <small>CIEL PK Excellence is an additional badge; the approved CII badge stays separate and unchanged.</small>
            </div>
            <div className="flashbody">
                {history === null ? (
                    <p className="smallnote">Loading rank history…</p>
                ) : !last ? (
                    <div className="goldpanel">
                        <b>No publication</b>
                        <p className="smallnote">Publication is required before CIEL PK rank, tier and trends are displayed on the flashcard.</p>
                    </div>
                ) : (
                    <>
                        <div className="goldpanel">
                            <b>{excellenceBand(last.rank, last.of, role)} · CIEL PK Excellence</b>
                            <div className="flashline"><span>Published rank</span><strong>#{last.rank} / {last.of}</strong></div>
                            <div className="flashline"><span>Ranking</span><strong>{excellence!.name}</strong></div>
                            <div className="flashline"><span>Ranking movement</span><span className={`movement ${reading.kind === "up" ? "up" : reading.kind === "down" ? "down" : reading.kind === "same" ? "same" : "cohort"}`}>{reading.label}</span></div>
                            <small className="smallnote">{reading.detail}</small>
                            {best != null && best < last.rank ? <div className="flashline"><span>Best comparable rank</span><strong>#{best}</strong></div> : null}
                            <div className="flashline"><span>Rank revision</span><strong>{last.revision} · {fmtDate(last.publishedAt)}</strong></div>
                        </div>
                        {spark.length >= 2 ? (
                            <svg viewBox="0 0 250 80" role="img" aria-label="Historical rank percentile trend" style={{ display: "block", width: "100%", height: 68, marginTop: 10 }}>
                                <line x1="12" y1="64" x2="242" y2="64" stroke="#c5d8d0" />
                                <polyline points={spark.map((p) => `${p.x},${p.y}`).join(" ")} stroke="#25765b" fill="none" strokeWidth="3" />
                                {spark.map((p) => <circle key={p.p.publicationId} cx={p.x} cy={p.y} r="3.5" fill="#25765b"><title>Update {p.p.revision}: #{p.p.rank} of {p.p.of} · {p.pct}th percentile</title></circle>)}
                            </svg>
                        ) : (
                            <p className="smallnote" style={{ marginTop: 8 }}>Trend graph appears after comparable ranking revisions ({rankPercentile(last.rank, last.of)}th percentile now).</p>
                        )}
                    </>
                )}
                <div className="flashline" style={{ marginTop: 10 }}><span>Approved CII</span><strong>{project.cii == null ? "—" : `${fmtNum(project.cii)} / 100 · locked`}</strong></div>
                <div className="goldpanel" style={{ marginTop: 10 }}>
                    <b>Specialist awards on this flashcard</b>
                    {!run ? (
                        <p className="smallnote">No analyzer run yet.</p>
                    ) : !publishedRun ? (
                        <p className="smallnote">Awards appear on flashcards only for the same published snapshot. The current run is not published yet{awards.length ? ` (${awards.length} would qualify)` : ""}.</p>
                    ) : awards.length ? (
                        <ul>{awards.map((a) => <li key={a.award.id}>{a.award.icon} <b>{a.award.label}</b> <span className="muted">· {a.winners.length > 1 ? "joint award" : "sole award"} · {a.award.sources}</span></li>)}</ul>
                    ) : (
                        <p className="smallnote">No specialist award for this project in the published snapshot.</p>
                    )}
                </div>
                <div className="smallnote" style={{ marginTop: 10 }}>
                    {TREND_LEGEND.map(([t, d]) => <div key={t}><b>{t}</b> · {d}</div>)}
                </div>
            </div>
        </article>
    );
}
