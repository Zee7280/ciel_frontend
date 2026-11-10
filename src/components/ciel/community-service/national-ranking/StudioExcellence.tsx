"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fmtNum, type CriterionMeta, type RunPayload, type RunRow, type StudioRole } from "./studio-types";
import { AWARD_GUARD_MIN, AWARD_LEAD_MIN, anchorsOf, comparativeNarrative, computeSpecialistAwards, excellenceBand, keyReasons, rankReason, rankedRows, shortReason, shortlistWithTies, verificationExceptions, type AwardResult } from "./studio-explain";

/**
 * Three read-only screens added to the Ranking Studio from the "National Ranking Analyzer v2"
 * prototype: Excellence shortlist, Specialist awards (draft) and the 440-question crosswalk.
 * All of them read the analyzer run already on screen or a static reference file; none of them
 * calls a ranking endpoint, changes a rank, or publishes anything.
 */

const SHORTLIST_LIMITS = [5, 10, 20, 50, 100];

// ------------------------------------------------------------------------------------ shortlist
export function ShortlistScreen({ run, criteria, role, onOpen, onAnalyze }: { run: RunPayload | null; criteria: CriterionMeta[]; role: StudioRole; onOpen: (id: string) => void; onAnalyze: () => void }) {
    const [limit, setLimit] = useState(10);
    const ranked = useMemo(() => rankedRows(run?.rows), [run]);
    const exceptions = useMemo(() => verificationExceptions(run?.rows), [run]);
    const shortlist = useMemo(() => shortlistWithTies(ranked, limit), [ranked, limit]);
    const total = ranked.length;
    const best = ranked[0];
    const second = ranked[1];
    const last = ranked[ranked.length - 1];
    const beforeLast = ranked.length > 1 ? ranked[ranked.length - 2] : undefined;

    if (!run || !total) {
        return (
            <>
                <ScreenTitle title="Excellence shortlist" sub="The leading projects of the current analyzer run, with the reasons behind every position. Ties at the cutoff are always included." />
                <section className="panel">
                    <div className="empty">
                        <b>No ranked run yet</b>
                        Run the Ranking Analyzer on the Overview &amp; Run tab first; the shortlist and its explanations are built from that run.
                        <div style={{ marginTop: 12 }}><button type="button" className="btn primary" onClick={onAnalyze}>Open Overview &amp; Run →</button></div>
                    </div>
                </section>
            </>
        );
    }

    return (
        <>
            <ScreenTitle title="Excellence shortlist" sub={`${total} ranked · ${exceptions.length} verification exception${exceptions.length === 1 ? "" : "s"} · ${run.rubricVersion} · ${run.published ? "published snapshot" : "draft run, nothing published from here"}`}>
                <label className="smallnote" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    Shortlist size
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} data-testid="shortlist-limit">
                        {SHORTLIST_LIMITS.map((n) => <option key={n} value={n}>Top {n}</option>)}
                    </select>
                </label>
            </ScreenTitle>

            <div className="wallgrid" style={{ marginBottom: 14 }}>
                {ranked.slice(0, 3).map((r, i) => (
                    <div className="fbox" key={r.id}>
                        <span className={`labelchip ${i === 0 ? "gold" : ""}`}>{i === 0 ? "✦ Top-ranked project" : "✧ Excellence shortlist"}</span>
                        <b style={{ marginTop: 8, fontSize: 14 }}>#{r.rank} · {r.title}</b>
                        <p>{r.university}{r.pathway ? ` · ${r.pathway}` : ""}</p>
                        <p><span className="labelchip">{excellenceBand(r.rank as number, total, role)}</span> <span className="muted">{fmtNum(r.score as number)} /100 · CII {typeof r.cii === "number" ? fmtNum(r.cii) : "—"} locked</span></p>
                        <button type="button" className="rowlink" onClick={() => onOpen(r.id)}>Why this rank →</button>
                    </div>
                ))}
            </div>

            <div className="two" style={{ marginBottom: 14 }}>
                <section className="panel">
                    <div className="paneltitle">Why #1: {best.title}</div>
                    <p className="smallnote" style={{ fontSize: 11, color: "inherit" }}>{rankReason(best, total, criteria)}</p>
                    {second ? <p className="smallnote" style={{ fontSize: 11, marginTop: 8 }}><b>Contrast with the next position.</b> {comparativeNarrative(best, second, criteria)}</p> : null}
                </section>
                <section className="panel">
                    <div className="paneltitle">Why the lowest eligible rank: {last.title}</div>
                    <p className="smallnote" style={{ fontSize: 11, color: "inherit" }}>{rankReason(last, total, criteria)}</p>
                    {beforeLast && beforeLast.id !== last.id ? <p className="smallnote" style={{ fontSize: 11, marginTop: 8 }}>{comparativeNarrative(last, beforeLast, criteria)}</p> : null}
                    <p className="smallnote" style={{ marginTop: 8 }}>Last place is relative within this run only. Packages held for verification are not treated as last place.</p>
                </section>
            </div>

            <section className="panel">
                <div className="paneltitle">All shortlisted projects <span className="labelchip gray">{shortlist.length} · ties at the cutoff included</span></div>
                <div className="tablewrap">
                    <table className="table">
                        <thead><tr><th>Rank</th><th>Project</th><th>Why shortlisted</th><th>Band (preview)</th><th>Review</th></tr></thead>
                        <tbody>
                            {shortlist.map((r) => (
                                <tr key={r.id}>
                                    <td><span className="rank">#{r.rank}</span><small className="pmeta">of {total}</small></td>
                                    <td><span className="pname">{r.title}</span><small className="pmeta">{r.university}{r.pathway ? ` · ${r.pathway}` : ""} · {fmtNum(r.score as number)} /100</small></td>
                                    <td style={{ maxWidth: 420 }}><small className="pmeta" style={{ marginTop: 0 }}>{shortReason(r, criteria)}</small></td>
                                    <td><span className="labelchip">{excellenceBand(r.rank as number, total, role)}</span></td>
                                    <td><button type="button" className="rowlink" onClick={() => onOpen(r.id)}>Evidence →</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="smallnote" style={{ marginTop: 10 }}>Bands are a display preview from rank and cohort size; the official badge is only set by publication.</p>
            </section>

            {exceptions.length ? (
                <section className="panel" style={{ marginTop: 14 }}>
                    <div className="paneltitle">Verification exceptions <span className="labelchip gray">{exceptions.length}</span></div>
                    {exceptions.slice(0, 5).map((e) => (
                        <div className="audititem" key={e.id}>
                            <div>
                                <span className="labelchip gold">{e.status}</span>
                                <b style={{ display: "block", marginTop: 6 }}>{e.title}</b>
                                <small>{e.reason}</small>
                            </div>
                            <div className="actions"><button type="button" className="rowlink" onClick={() => onOpen(e.id)}>Open package →</button></div>
                        </div>
                    ))}
                    <p className="smallnote" style={{ marginTop: 8 }}>Not interpreted as unsuccessful community work. {exceptions.length > 5 ? `${exceptions.length - 5} more in the review queue.` : ""}</p>
                </section>
            ) : null}
        </>
    );
}

// ------------------------------------------------------------------------------------ specialist awards
export function AwardsScreen({ run, criteria, onOpen, onAnalyze, onShowQuestions }: { run: RunPayload | null; criteria: CriterionMeta[]; onOpen: (id: string) => void; onAnalyze: () => void; onShowQuestions?: (ids: string[]) => void }) {
    const results = useMemo(() => computeSpecialistAwards(run?.rows, criteria), [run, criteria]);
    const labelOf = (key: string) => criteria.find((c) => c.key === key)?.label || criteria.find((c) => c.key === key)?.title || key;
    const awarded = results.filter((r) => r.status === "awarded").length;
    return (
        <>
            <ScreenTitle title="Specialist Excellence Awards" sub="Eight categories, each led by one criterion and guarded by others. Draft view computed from the current analyzer run; nothing is published from here.">
                <span className="labelchip gold">{run ? `Draft · ${awarded} of ${results.length} categories have a candidate` : "No run yet"}</span>
            </ScreenTitle>

            <div className="callout" style={{ marginBottom: 14 }}>
                <b>Fair comparison rules.</b> Proof gate: primary criterion ≥ {AWARD_LEAD_MIN}/5 and every support criterion ≥ {AWARD_GUARD_MIN}/5, none unsupported. Ranking inside a category: 80% primary anchor + 20% mean of support anchors, then overall rank. One award can have joint winners; the same project can receive more than one award; a category stays <b>Not awarded</b> when no project meets the gate. A category winner does not claim to outrank another project in unrelated dimensions.
            </div>

            {!run ? (
                <section className="panel"><div className="empty"><b>No analyzer run yet</b>Awards are read from the criterion anchors of the current run.<div style={{ marginTop: 12 }}><button type="button" className="btn primary" onClick={onAnalyze}>Open Overview &amp; Run →</button></div></div></section>
            ) : null}

            <div className="wallgrid">
                {results.map((r) => <AwardCard key={r.award.id} result={r} labelOf={labelOf} onOpen={onOpen} onShowQuestions={onShowQuestions} />)}
            </div>
        </>
    );
}

function AwardCard({ result, labelOf, onOpen, onShowQuestions }: { result: AwardResult; labelOf: (k: string) => string; onOpen: (id: string) => void; onShowQuestions?: (ids: string[]) => void }) {
    const { award, winners, qualified, status } = result;
    const w = winners[0];
    return (
        <div className="fbox" data-testid={`award-${award.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                <b style={{ fontSize: 13 }}>{award.icon} {award.label}</b>
                <span className={`labelchip ${status === "awarded" ? "gold" : "gray"}`}>{status === "awarded" ? (winners.length > 1 ? `${winners.length} joint winners` : "Candidate") : status === "no_run" ? "No run" : "Not awarded"}</span>
            </div>
            {w ? (
                <div style={{ marginTop: 8 }}>
                    <span className="pname">#{w.row.rank} · {w.row.title}</span>
                    <small className="pmeta">{w.row.university}{w.row.pathway ? ` · ${w.row.pathway}` : ""}</small>
                    <small className="pmeta">Primary {labelOf(award.lead)} {w.lead.anchor}/5 · support {w.guards.map((g) => `${g.label} ${g.anchor}/5`).join(", ")}</small>
                    {winners.length > 1 ? <small className="pmeta">Joint: {winners.slice(1).map((x) => x.row.title).join("; ")}</small> : null}
                    <button type="button" className="rowlink" onClick={() => onOpen(w.row.id)}>Evidence →</button>
                </div>
            ) : (
                <p>{status === "no_run" ? "Run the analyzer to evaluate this category." : "Evidence gate not met: no ranked project reached the minimum anchors in this run."}</p>
            )}
            <p className="smallnote" style={{ marginTop: 8 }}><b>Rule.</b> Primary {labelOf(award.lead)} ≥ {AWARD_LEAD_MIN}/5; support {award.guards.map(labelOf).join(", ")} ≥ {AWARD_GUARD_MIN}/5. {award.rule}</p>
            <p className="smallnote">Evidence read from: {award.sources}.{qualified.length > winners.length ? ` ${qualified.length - winners.length} more project(s) passed the gate.` : ""}</p>
            {onShowQuestions ? <button type="button" className="rowlink" onClick={() => onShowQuestions(award.questions)}>Related 440 questions →</button> : null}
        </div>
    );
}

// ------------------------------------------------------------------------------------ 440-question crosswalk
export type CrosswalkQuestion = {
    id: string;
    route: "P" | "A" | "I" | "E" | string;
    module: string;
    question: string;
    minimumData: string;
    answerRule: string;
    owner: string;
    dimension: string;
    capture: string;
    gap: string;
    badgeTreatment: string;
    cadence: string;
};

export const CROSSWALK_URL = "/ciel-440-question-crosswalk.json";
const CW_PAGE = 25;
const ROUTE_LABEL: Record<string, string> = { P: "Project record", A: "Portfolio / linked", I: "Institution owner", E: "External / provider" };
const ROUTE_DESC: Record<string, string> = { P: "Direct project evidence", A: "Aggregated / linked source", I: "Institution-owned data", E: "External / provider eligibility" };

/** Filter the bank the way the prototype does: free text over id, question, module, owner, capture, minimum data and dimension. */
export function filterCrosswalk(bank: CrosswalkQuestion[], query: string, route: string, module: string): CrosswalkQuestion[] {
    const q = query.trim().toLowerCase();
    const terms = q ? q.split(/[\s,;]+/).filter(Boolean) : [];
    return bank.filter((x) => {
        if (route && x.route !== route) return false;
        if (module && x.module !== module) return false;
        if (!terms.length) return true;
        const hay = `${x.id} ${x.question} ${x.module} ${x.owner} ${x.capture} ${x.minimumData} ${x.dimension}`.toLowerCase();
        // a list of ids ("M03-Q14 M06-Q03") matches any of them; ordinary words must all appear
        const allIds = terms.every((t) => /^m\d{2}-q\d{2}$/.test(t));
        return allIds ? terms.some((t) => x.id.toLowerCase() === t) : terms.every((t) => hay.includes(t));
    });
}

function csvCell(v: string | number): string {
    const s = typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
    return `"${s.replace(/"/g, '""')}"`;
}

/** The parent keys this screen by `initialQuery`, so a new prefilled search remounts it with fresh filters. */
export function CrosswalkScreen({ initialQuery }: { initialQuery?: string }) {
    const [bank, setBank] = useState<CrosswalkQuestion[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState(initialQuery ?? "");
    const [route, setRoute] = useState("");
    const [module, setModule] = useState("");
    const [page, setPage] = useState(0);
    const [detail, setDetail] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(CROSSWALK_URL, { cache: "force-cache" })
            .then(async (res) => {
                if (!res.ok) throw new Error(String(res.status));
                const data = (await res.json()) as CrosswalkQuestion[];
                if (!cancelled) setBank(Array.isArray(data) ? data : []);
            })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, []);

    const modules = useMemo(() => Array.from(new Set((bank ?? []).map((q) => q.module))), [bank]);
    const filtered = useMemo(() => filterCrosswalk(bank ?? [], query, route, module), [bank, query, route, module]);
    const routeCounts = useMemo(() => {
        const c: Record<string, number> = { P: 0, A: 0, I: 0, E: 0 };
        for (const q of bank ?? []) c[q.route] = (c[q.route] ?? 0) + 1;
        return c;
    }, [bank]);
    const pages = Math.max(1, Math.ceil(filtered.length / CW_PAGE));
    const safePage = Math.min(page, pages - 1);
    const slice = filtered.slice(safePage * CW_PAGE, safePage * CW_PAGE + CW_PAGE);
    const open = detail ? (bank ?? []).find((q) => q.id === detail) ?? null : null;

    const exportCsv = () => {
        if (!bank) return;
        const header = ["id", "route", "module", "question", "owner", "dimension", "minimumData", "answerRule", "capture", "gap", "badgeTreatment", "cadence"];
        const lines = [header, ...filtered.map((q) => header.map((k) => (q as unknown as Record<string, string>)[k] ?? ""))];
        const csv = lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "CIEL_PK_440_Question_Crosswalk.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <>
            <ScreenTitle title="440-Question Evidence Crosswalk" sub="CIEL PK's internal design reference: which university-ranking questions a community-engagement report can evidence, which need institutional data, and how each is treated in scoring. Not 440 mandatory questions in any single QS, THE or GreenMetric submission.">
                <button type="button" className="btn sm" onClick={exportCsv} disabled={!bank}>↓ Export {filtered.length === (bank?.length ?? 0) ? "all 440" : `${filtered.length}`} mappings</button>
            </ScreenTitle>

            <div className="stats" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
                {(["P", "A", "I", "E"] as const).map((r) => (
                    <button type="button" key={r} className="stat" style={{ textAlign: "left", cursor: "pointer", borderColor: route === r ? "#50896c" : undefined }} onClick={() => { setRoute(route === r ? "" : r); setPage(0); }}>
                        <small>{r} · {ROUTE_LABEL[r]}</small>
                        <b>{bank ? routeCounts[r] : "—"}</b>
                        <span>{ROUTE_DESC[r]}</span>
                    </button>
                ))}
            </div>

            <div className="callout" style={{ marginBottom: 14 }}>
                <b>Ethical safeguard.</b> No report receives a worse rank because it lacks university-wide data. Institutional questions are outside the individual project score; an SDG tag is never proof of a measured outcome.
            </div>

            <section className="panel">
                <div className="toolbar" style={{ marginBottom: 10 }}>
                    <input className="searchfield" style={{ maxWidth: 360 }} value={query} placeholder="Search question ID, wording, owner, source or topic" onChange={(e) => { setQuery(e.target.value); setPage(0); }} data-testid="crosswalk-search" />
                    <div className="actions">
                        <select value={route} onChange={(e) => { setRoute(e.target.value); setPage(0); }} aria-label="Jurisdiction">
                            <option value="">All jurisdictions</option>
                            {(["P", "A", "I", "E"] as const).map((r) => <option key={r} value={r}>{r} · {ROUTE_LABEL[r]}</option>)}
                        </select>
                        <select value={module} onChange={(e) => { setModule(e.target.value); setPage(0); }} aria-label="Module">
                            <option value="">All {modules.length || 27} modules</option>
                            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        {query || route || module ? <button type="button" className="btn sm" onClick={() => { setQuery(""); setRoute(""); setModule(""); setPage(0); }}>Reset</button> : null}
                    </div>
                </div>

                {failed ? <div className="callout">The reference file could not be loaded. Nothing else in the studio is affected.</div> : null}
                {!bank && !failed ? <div className="empty">Loading the 440 questions…</div> : null}
                {bank ? (
                    <>
                        <div className="tablewrap">
                            <table className="table">
                                <thead><tr><th>ID / Route</th><th>Exact question</th><th>Current CIEL source</th><th>Responsibility</th><th>View</th></tr></thead>
                                <tbody>
                                    {slice.map((q) => (
                                        <tr key={q.id}>
                                            <td><b>{q.id}</b><small className="pmeta"><span className={`labelchip ${q.route === "P" ? "" : q.route === "A" ? "blue" : "gray"}`} style={{ margin: 0 }}>{q.route}</span> {q.dimension}</small></td>
                                            <td style={{ maxWidth: 360 }}><span className="pname" style={{ fontWeight: 650 }}>{q.question}</span><small className="pmeta">{q.module}</small></td>
                                            <td style={{ maxWidth: 300 }}><small className="pmeta" style={{ marginTop: 0 }}>{q.capture.length > 130 ? `${q.capture.slice(0, 127)}…` : q.capture}</small></td>
                                            <td style={{ maxWidth: 220 }}><small className="pmeta" style={{ marginTop: 0 }}>{ROUTE_LABEL[q.route] || q.route} · {q.owner}</small></td>
                                            <td><button type="button" className="rowlink" onClick={() => setDetail(q.id)}>Review →</button></td>
                                        </tr>
                                    ))}
                                    {!slice.length ? <tr><td colSpan={5}><div className="empty">No question matches these filters.</div></td></tr> : null}
                                </tbody>
                            </table>
                        </div>
                        <div className="toolbar" style={{ marginTop: 10 }}>
                            <span className="smallnote">Showing {filtered.length ? safePage * CW_PAGE + 1 : 0}–{Math.min(filtered.length, (safePage + 1) * CW_PAGE)} / {filtered.length} matching · {bank.length} total</span>
                            <div className="pagination">
                                <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹</button>
                                <span className="smallnote">Page {safePage + 1} of {pages}</span>
                                <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>›</button>
                            </div>
                        </div>
                    </>
                ) : null}
            </section>

            {open ? (
                <section className="panel" style={{ marginTop: 14 }} data-testid="crosswalk-detail">
                    <div className="paneltitle">{open.id} · {open.module} <button type="button" className="btn sm" onClick={() => setDetail(null)}>Close</button></div>
                    <div className="grid4" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                        {([
                            ["Exact reference question", open.question],
                            ["Route", `${open.route} · ${ROUTE_DESC[open.route] || open.route}`],
                            ["Question owner", open.owner],
                            ["Minimum data needed", open.minimumData],
                            ["Answer rule", open.answerRule],
                            ["Existing report capture", open.capture],
                            ["Data gap / action", open.gap],
                            ["Score and badge handling", open.badgeTreatment],
                            ["Reporting period", open.cadence],
                            ["CII dimension", open.dimension],
                        ] as Array<[string, string]>).map(([k, v]) => (
                            <div className="fbox" key={k}><b>{k}</b><p>{v || "—"}</p></div>
                        ))}
                    </div>
                </section>
            ) : null}

            <div className="grid4" style={{ marginTop: 14 }}>
                {[
                    ["THE Sustainability Impact Ratings 2026", "Project outreach, community programmes, measurable SDG contribution and external partnerships may substantiate relevant SDG indicators. Research output, university policy and institutional denominators require verified university sources.", "https://www.timeshighereducation.com/impactrankings"],
                    ["QS Sustainability Rankings", "Some project evidence can support knowledge-exchange, education/outreach and social-impact narratives. QS mixes institutional disclosures with research metrics, surveys and policy indicators; CIEL PK never calculates a QS score.", "https://support.qs.com/hc/en-gb/articles/8551503200668"],
                    ["UI GreenMetric", "Relevant campus and community sustainability activities may provide case evidence. Campus energy, waste, transport, infrastructure and water figures must come from estates, facilities and institutional records.", "https://greenmetric.ui.ac.id/"],
                    ["Evidence handling standard", "Store question ID, institution, period, denominator, answer, field provenance, permission level, evidence file locator, validator, caveat and platform-specific export format. Never fabricate official form answers.", ""],
                ].map(([t, d, href]) => (
                    <div className="fbox" key={t}>
                        <b>{t}</b>
                        <p>{d}</p>
                        {href ? <a className="rowlink" href={href} target="_blank" rel="noreferrer noopener">Official methodology ↗</a> : null}
                    </div>
                ))}
            </div>
        </>
    );
}

// ------------------------------------------------------------------------------------ shared
function ScreenTitle({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
    return (
        <div className="sectiontitle" style={{ marginTop: 0 }}>
            <div>
                <h2>{title}</h2>
                <p>{sub}</p>
            </div>
            {children ? <div className="actions">{children}</div> : null}
        </div>
    );
}

/** Used by the drawer / tests: the explanation block for one row. */
export function explainRow(row: RunRow, total: number, criteria: CriterionMeta[]) {
    const anchors = anchorsOf(row, criteria);
    return { anchors, reasons: keyReasons(anchors), text: rankReason(row, total, criteria) };
}
