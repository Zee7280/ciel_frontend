"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import "./npe-ranking.css";

type StudioRole = "ciel_admin" | "university";

type PackageRow = {
    id: string;
    title: string;
    university: string;
    pathway: string;
    version: string;
    cii: number | null;
    ciiLocked: boolean;
    parts?: string[];
};

type RunRow = {
    id: string;
    title: string;
    university: string;
    pathway: string;
    version: string;
    parts?: string[];
    cii: number | null;
    ciiLocked: boolean;
    status: string;
    reason: string;
    rank: number | null;
    score: number | null;
    scoreBreakdown?: { cii: number; criteria: Record<string, number>; total: number } | null;
    evaluation?: {
        readComplete: boolean;
        flags: string[];
        summary: string;
        limitations: string;
        criteria: Record<string, { anchor: number; confidence: string; reason: string }>;
        claims: Array<{ statement: string; source: string; locator: string; support: string; limitation: string }>;
    } | null;
    package?: PackageRow;
};

type ReviewItem = { id: string; title: string; reason: string; type: string; cleared: boolean };

type RunPayload = {
    runId: string;
    rubricVersion: string;
    createdAt: string;
    published: boolean;
    rows: RunRow[];
    reviewItems: ReviewItem[];
};

const WEIGHTS: Array<[string, number]> = [
    ["CII quality anchor", 15],
    ["Verified outcome & impact depth", 25],
    ["Relevance, need & equity", 12],
    ["Sustainability & system influence", 12],
    ["Partnership & community ownership", 10],
    ["Efficiency & resource use", 8],
    ["SDG coherence", 6],
    ["Scalability & replicability", 6],
    ["Learning, adaptation & innovation", 6],
];

export default function NationalRankingStudio({
    role,
    packagesEndpoint,
    analyzeEndpoint,
    publishEndpoint,
    reviewsEndpoint,
}: {
    role: StudioRole;
    packagesEndpoint: string;
    analyzeEndpoint: string;
    publishEndpoint: string;
    reviewsEndpoint: string;
}) {
    const [page, setPage] = useState<"studio" | "review" | "method">("studio");
    const [busy, setBusy] = useState(false);
    const [packages, setPackages] = useState<PackageRow[]>([]);
    const [run, setRun] = useState<RunPayload | null>(null);
    const [query, setQuery] = useState("");
    const [uni, setUni] = useState("");
    const [pathway, setPathway] = useState("");
    const [status, setStatus] = useState("");
    const [log, setLog] = useState("Ready. Sync Impact Wall, then run AI analysis.");
    const [inspectId, setInspectId] = useState<string | null>(null);
    const [inspectTab, setInspectTab] = useState<"findings" | "evidence" | "package">("findings");
    const [cohortLabel, setCohortLabel] = useState(role === "ciel_admin" ? "National cohort" : "University cohort");

    const appendLog = (line: string) => setLog((prev) => `${prev}\n${new Date().toLocaleTimeString()} · ${line}`);

    const loadPackages = useCallback(async () => {
        setBusy(true);
        try {
            const res = await authenticatedFetch(packagesEndpoint);
            const json = await res?.json().catch(() => null);
            if (!res?.ok) throw new Error(json?.message || "Could not load Impact Wall packages.");
            const data = json?.data || json;
            setPackages(Array.isArray(data?.packages) ? data.packages : []);
            setCohortLabel(data?.cohortLabel || cohortLabel);
            if (data?.run?.runId) setRun(data.run);
            setLog(`Loaded ${data?.packages?.length ?? 0} packages from ${data?.cohortLabel || "Impact Wall"}.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sync failed.");
        } finally {
            setBusy(false);
        }
    }, [packagesEndpoint, cohortLabel]);

    useEffect(() => {
        void loadPackages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packagesEndpoint]);

    const rows = run?.rows || packages.map((p) => ({
        id: p.id,
        title: p.title,
        university: p.university,
        pathway: p.pathway,
        version: p.version,
        cii: p.cii,
        ciiLocked: p.ciiLocked,
        status: "Ready",
        reason: "Awaiting analysis",
        rank: null,
        score: null,
        evaluation: null,
        package: p,
    }));

    const visible = useMemo(() => {
        const q = query.toLowerCase();
        return rows.filter((r) => {
            if (uni && r.university !== uni) return false;
            if (pathway && r.pathway !== pathway) return false;
            if (status && r.status !== status) return false;
            if (q && !`${r.title} ${r.id}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, query, uni, pathway, status]);

    const ranked = rows.filter((r) => r.status === "Ranked" && r.score != null);
    const reviewItems = run?.reviewItems || [];
    const inspect = rows.find((r) => r.id === inspectId) || null;

    const runAnalysis = async () => {
        if (busy) return;
        setBusy(true);
        setLog("");
        appendLog("Eligibility checks started.");
        appendLog(`${packages.length} packages sent. Backend holds any that fail approval, hours, packet or CII lock.`);
        try {
            const res = await authenticatedFetch(
                analyzeEndpoint,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        rubricVersion: "NPE-1.1",
                        projects: packages.map((p) => ({ id: p.id, version: p.version })),
                    }),
                },
                { timeoutMs: 180_000 },
            );
            const json = await res?.json().catch(() => null);
            if (!res?.ok) throw new Error(json?.message || "Analysis failed.");
            setRun(json.data);
            appendLog(`Validated ${json.data?.rows?.filter((r: RunRow) => r.status === "Ranked").length || 0} ranked evaluations.`);
            toast.success("Draft ranking ready. Review flags before publish.");
        } catch (err) {
            appendLog(err instanceof Error ? err.message : "Analysis failed.");
            toast.error(err instanceof Error ? err.message : "Analysis failed.");
        } finally {
            setBusy(false);
        }
    };

    const publish = async () => {
        if (!run?.runId) return;
        setBusy(true);
        try {
            const res = await authenticatedFetch(publishEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ runId: run.runId, rubricVersion: "NPE-1.1" }),
            });
            const json = await res?.json().catch(() => null);
            if (!res?.ok) throw new Error(json?.message || "Publish failed.");
            setRun((prev) => (prev ? { ...prev, published: true } : prev));
            toast.success(`Published snapshot ${json.data?.snapshotId || ""}`.trim());
            appendLog(`Published snapshot ${json.data?.snapshotId}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Publish failed.");
        } finally {
            setBusy(false);
        }
    };

    const clearReview = async (itemId: string) => {
        if (!run?.runId) return;
        const res = await authenticatedFetch(reviewsEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: run.runId, itemId }),
        });
        const json = await res?.json().catch(() => null);
        if (!res?.ok) {
            toast.error(json?.message || "Could not clear review.");
            return;
        }
        setRun(json.data);
    };

    const unis = [...new Set(rows.map((r) => r.university).filter(Boolean))].sort();
    const paths = [...new Set(rows.map((r) => r.pathway).filter(Boolean))].sort();
    const scores = ranked.map((r) => r.score || 0).sort((a, b) => a - b);
    const median = scores.length
        ? scores.length % 2
            ? scores[(scores.length - 1) / 2]
            : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : null;

    return (
        <div className="npe-studio">
            <div className="head">
                <div>
                    <div className="eyebrow">Community service • comparative excellence</div>
                    <h1>National Ranking Studio</h1>
                    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                        {role === "ciel_admin"
                            ? "CIEL PK Admin publishes the national snapshot. Locked CII is preserved."
                            : "University ranking uses this institution’s approved packages only. Locked CII is preserved."}
                    </p>
                </div>
                <div className="actions">
                    <button type="button" className="btn" disabled={busy} onClick={() => void loadPackages()}>
                        ↻ Sync Impact Wall
                    </button>
                    <button type="button" className="btn primary" disabled={busy} onClick={() => void runAnalysis()}>
                        {busy ? "Analysis in progress…" : "✦ Run AI Analysis"}
                    </button>
                </div>
            </div>

            <div className="tabs">
                <button type="button" className={page === "studio" ? "active" : ""} onClick={() => setPage("studio")}>
                    Ranking studio
                </button>
                <button type="button" className={page === "review" ? "active" : ""} onClick={() => setPage("review")}>
                    Review queue {reviewItems.length ? `(${reviewItems.length})` : ""}
                </button>
                <button type="button" className={page === "method" ? "active" : ""} onClick={() => setPage("method")}>
                    Scoring methodology
                </button>
            </div>

            {page === "studio" && (
                <>
                    <div className="hero">
                        <div>
                            <div className="eyebrow">One approved package. A deeper comparison.</div>
                            <h2>From completed service to demonstrated impact.</h2>
                            <p>The approved CII provides the foundation. Evidence-supported outcomes determine comparative excellence.</p>
                            <span className="badge" style={{ background: "#244b4a", color: "#cbe9d5" }}>
                                Approved CII preserved · Rankings versioned
                            </span>
                        </div>
                        <div className="formula">
                            <div><strong>15</strong><small>LOCKED CII</small></div>
                            <em>+</em>
                            <div><strong>85</strong><small>COMPARATIVE QUALITY</small></div>
                            <em>=</em>
                            <div className="total"><strong>100</strong><small>EXCELLENCE SCORE</small></div>
                        </div>
                    </div>
                    <div className="stats">
                        <div className="stat"><div className="label">Impact packages</div><b>{packages.length}</b><small>{cohortLabel}</small></div>
                        <div className="stat"><div className="label">Eligible & evaluated</div><b>{run ? ranked.length : "—"}</b><small>Included in this ranking</small></div>
                        <div className="stat"><div className="label">Median excellence</div><b>{median == null ? "—" : median.toFixed(1)}</b><small>Of evaluated, eligible projects</small></div>
                        <div className="stat"><div className="label">Review required</div><b>{reviewItems.length || "—"}</b><small>Integrity gates + close-score checks</small></div>
                    </div>
                    <div className="twocol">
                        <div>
                            <article className="panel">
                                <div className="panelhead">
                                    <div>
                                        <h2>Project standings</h2>
                                        <div className="small muted">{run ? `${run.runId} · ${ranked.length} ranked · NPE-1.1` : "Run analysis to generate a draft ranking."}</div>
                                    </div>
                                </div>
                                <div className="filters">
                                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project…" aria-label="Search" />
                                    <select value={uni} onChange={(e) => setUni(e.target.value)} aria-label="University">
                                        <option value="">All universities</option>
                                        {unis.map((u) => <option key={u}>{u}</option>)}
                                    </select>
                                    <select value={pathway} onChange={(e) => setPathway(e.target.value)} aria-label="Pathway">
                                        <option value="">All pathways</option>
                                        {paths.map((p) => <option key={p}>{p}</option>)}
                                    </select>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                                        <option value="">All statuses</option>
                                        <option>Ranked</option>
                                        <option>Review</option>
                                        <option>Excluded</option>
                                        <option>Ready</option>
                                    </select>
                                </div>
                                <div className="tablewrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Project / institution</th>
                                                <th>Excellence</th>
                                                <th>CII</th>
                                                <th>Standing</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visible.map((r) => (
                                                <tr key={r.id}>
                                                    <td>{r.rank ? <span className={`rank ${r.rank <= 3 ? "top" : ""}`}>{r.rank}</span> : <span className="muted">—</span>}</td>
                                                    <td>
                                                        <span className="projectname">{r.title}</span>
                                                        <span className="projectsub">{r.university} · {r.pathway}</span>
                                                    </td>
                                                    <td>{r.score != null ? <span className="score">{r.score.toFixed(2)}</span> : <span className="muted">—</span>}</td>
                                                    <td>{r.cii ?? "—"}<span className="projectsub">{r.ciiLocked ? "Locked" : "Pending lock"}</span></td>
                                                    <td><span className={`badge ${r.status === "Excluded" ? "red" : r.status === "Review" ? "amber" : ""}`}>{r.status}</span></td>
                                                    <td><button type="button" className="link" onClick={() => { setInspectId(r.id); setInspectTab("findings"); }}>Inspect ↗</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {!visible.length ? <div className="empty">No projects match these filters.</div> : null}
                            </article>
                            <article className="panel">
                                <div className="panelhead">
                                    <h2>Analysis activity</h2>
                                    <span className="badge gray">{busy ? "Running" : run ? "Draft ready" : "Not started"}</span>
                                </div>
                                <div className="panelbody"><div className="log">{log}</div></div>
                            </article>
                        </div>
                        <aside>
                            <article className="panel">
                                <div className="panelhead"><h2>What drives the score?</h2></div>
                                <div className="panelbody">
                                    {WEIGHTS.map(([name, w]) => (
                                        <div key={name}>
                                            <div className="weightrow"><span>{name}</span><b>{w}</b></div>
                                            <div className="bar"><i style={{ width: `${(w / 25) * 100}%`, background: w === 15 ? "#bc9247" : undefined }} /></div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                            <article className="panel">
                                <div className="panelhead"><h2>Publication readiness</h2></div>
                                <div className="panelbody">
                                    <div className="listitem">
                                        <b>{run ? (run.published ? "Published snapshot" : "Draft · pending review") : "No ranking run yet"}</b>
                                        <p>{reviewItems.length} review items. Publication excludes records held for review.</p>
                                    </div>
                                    <button type="button" className="btn dark" style={{ width: "100%", marginTop: 14 }} disabled={!run || busy || run.published} onClick={() => void publish()}>
                                        Review & publish
                                    </button>
                                </div>
                            </article>
                        </aside>
                    </div>
                </>
            )}

            {page === "review" && (
                <article className="panel">
                    <div className="panelhead"><h2>Review queue</h2></div>
                    <div className="panelbody">
                        {reviewItems.length ? reviewItems.map((item) => (
                            <div className="listitem" key={item.id}>
                                <span className={`badge ${item.type === "Excluded" ? "red" : "amber"}`}>{item.type}</span>
                                {item.cleared ? <span className="badge" style={{ marginLeft: 8 }}>Cleared</span> : null}
                                <b style={{ marginTop: 8 }}>{item.title}</b>
                                <p>{item.reason}</p>
                                {!item.cleared && (item.type === "Validation" || item.type === "Close comparison") ? (
                                    <button type="button" className="link" onClick={() => void clearReview(item.id)}>Mark review complete</button>
                                ) : null}
                            </div>
                        )) : <div className="empty">No review items in the current dataset.</div>}
                    </div>
                </article>
            )}

            {page === "method" && (
                <article className="panel">
                    <div className="panelhead"><h2>A second evaluation layer</h2></div>
                    <div className="panelbody">
                        <p className="small">Locked CII contributes up to 15 points. The remaining 85 come from eight comparative criteria. Unread files go to Review — the system does not guess marks. Existing CII badges stay separate from national standing.</p>
                        <div className="callout amber">NPE-1.1 is a project-ranking framework. It is not QS/THE certification. Weights require calibration before high-stakes awards.</div>
                    </div>
                </article>
            )}

            {inspect ? (
                <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setInspectId(null); }}>
                    <div className="dialog">
                        <div className="dialoghead">
                            <div>
                                <div className="eyebrow">Project intelligence</div>
                                <h2>{inspect.title}</h2>
                                <div className="small muted">{inspect.university} · {inspect.pathway}</div>
                            </div>
                            <button type="button" className="close" onClick={() => setInspectId(null)}>×</button>
                        </div>
                        <div className="dialogbody">
                            <div className="bigscore">
                                <div className="ring">
                                    <b>{inspect.score != null ? inspect.score.toFixed(2) : "—"}</b>
                                    <span>EXCELLENCE / 100</span>
                                </div>
                                <div>
                                    <span className={`badge ${inspect.status === "Review" ? "amber" : ""}`}>{inspect.status}</span>
                                    <p style={{ marginTop: 10 }}>Rank {inspect.rank ?? "—"} · Locked CII {inspect.cii ?? "—"}</p>
                                    <div className="small muted">{inspect.reason}</div>
                                </div>
                            </div>
                            <div className="tabs">
                                {(["findings", "evidence", "package"] as const).map((tab) => (
                                    <button key={tab} type="button" className={inspectTab === tab ? "active" : ""} onClick={() => setInspectTab(tab)}>{tab}</button>
                                ))}
                            </div>
                            {inspectTab === "findings" && (
                                inspect.evaluation ? (
                                    <>
                                        <div className="callout"><b>Impact finding</b><br />{inspect.evaluation.summary}</div>
                                        {inspect.scoreBreakdown ? (
                                            <div className="tablewrap" style={{ marginTop: 12 }}>
                                                <table>
                                                    <thead><tr><th>Criterion</th><th>Anchor</th><th>Evidence</th><th>Points</th></tr></thead>
                                                    <tbody>
                                                        {Object.entries(inspect.scoreBreakdown.criteria).map(([key, pts]) => {
                                                            const row = inspect.evaluation?.criteria?.[key];
                                                            return (
                                                                <tr key={key}>
                                                                    <td>{key}</td>
                                                                    <td>{row?.anchor ?? "—"}/5</td>
                                                                    <td>{row?.confidence ?? "—"}</td>
                                                                    <td><b>{Number(pts).toFixed(2)}</b></td>
                                                                </tr>
                                                            );
                                                        })}
                                                        <tr>
                                                            <td>Locked CII</td>
                                                            <td colSpan={2}>{inspect.cii ?? "—"}</td>
                                                            <td><b>{inspect.scoreBreakdown.cii.toFixed(2)}</b>/15</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : null}
                                        <p className="small muted">{inspect.evaluation.limitations}</p>
                                    </>
                                ) : <div className="callout amber">{inspect.reason}</div>
                            )}
                            {inspectTab === "evidence" && (
                                <div className="tablewrap">
                                    <table>
                                        <thead><tr><th>Claim</th><th>Source</th><th>Support</th></tr></thead>
                                        <tbody>
                                            {(inspect.evaluation?.claims || []).map((c, i) => (
                                                <tr key={i}><td>{c.statement}</td><td>{c.source}<span className="projectsub">{c.locator}</span></td><td>{c.support}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {inspectTab === "package" && (inspect.parts || inspect.package?.parts || []).map((part) => (
                                <div className="listitem" key={part}><b>{part}</b><p>Retrieved from the approved Impact Package. Original CII is not rewritten.</p></div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
