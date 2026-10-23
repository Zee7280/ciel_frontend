"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { FilterChips } from "./StudioParts";
import {
    fmtDate,
    fmtNum,
    metricDisplay,
    standingLabel,
    type CriterionMeta,
    type LensMeta,
    type LibraryPackage,
    type ProjectRanking,
    type ProjectStanding,
    type PublicationSummary,
    type RunPayload,
    type StudioRole,
} from "./studio-types";

const movementLabel = (m: ProjectRanking["movement"] | undefined, prev: number | null | undefined, rank: number) => {
    if (m === "up") return `▲ Up ${(prev ?? rank) - rank}`;
    if (m === "down") return `▼ Down ${rank - (prev ?? rank)}`;
    if (m === "same") return "→ No change";
    if (m === "cohort") return "Different cohort — not comparable";
    return "New comparison";
};

// A hold reason can be a long evidence explanation; clamp it to 2 lines with an expand toggle so
// it reads as a note rather than taking over the row.
function ReasonText({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    if (!text) return null;
    const long = text.length > 140;
    return (
        <div className="reasonbox">
            <small className={`pmeta reasontext${open ? "" : " clamped"}`}>{text}</small>
            {long ? (
                <button type="button" className="reasontoggle" onClick={() => setOpen((o) => !o)}>
                    {open ? "Show less" : "Show full note"}
                </button>
            ) : null}
        </div>
    );
}

// ------------------------------------------------------------------------------------ review queue
export function ReviewScreen({
    run,
    busy,
    rankedCount,
    onClear,
    onPublishOfficial,
    onOpen,
}: {
    run: RunPayload | null;
    busy: boolean;
    rankedCount: number;
    onClear: (id: string) => void;
    onPublishOfficial: () => void;
    onOpen: (id: string) => void;
}) {
    const items = run?.reviewItems ?? [];
    const open = items.filter((i) => !i.cleared && (i.type === "Validation" || i.type === "Close comparison"));
    return (
        <>
            <div className="sectiontitle" style={{ marginTop: 0 }}>
                <div>
                    <h2>Review queue</h2>
                    <p>Leading projects and near-tied scores need a second look before any evidence-based ranking is published. Held packages are never ranked low.</p>
                </div>
            </div>
            <div className="reviewgrid">
                <section className="panel">
                    {items.length ? (
                        items.map((item) => (
                            <div className="audititem" key={item.id}>
                                <div>
                                    <span className={`labelchip ${item.type === "Excluded" ? "red" : "gold"}`}>{item.type}</span>
                                    {item.cleared ? <span className="labelchip">Cleared</span> : null}
                                    <b style={{ display: "block", marginTop: 6 }}>{item.title}</b>
                                    <small>{item.reason}</small>
                                </div>
                                <div className="actions">
                                    {!item.cleared && (item.type === "Validation" || item.type === "Close comparison") ? (
                                        <button type="button" className="btn sm" onClick={() => onClear(item.id)}>Mark review complete</button>
                                    ) : null}
                                    {!item.id.includes(":") ? <button type="button" className="rowlink" onClick={() => onOpen(item.id)}>Open package →</button> : null}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty"><b>Nothing to review</b>Run the Ranking Analyzer to read the packages first.</div>
                    )}
                </section>
                <aside className="panel">
                    <div className="paneltitle">Official ranking snapshot</div>
                    <p className="smallnote">The existing official publication: stores one immutable snapshot of the overall excellence standings and updates each project’s CIEL PK / University badge. Studio rankings are published separately and never touch badges.</p>
                    <div className="statusline" style={{ display: "block" }}>
                        <div>{run ? (run.published ? "Published snapshot" : "Draft · pending review") : "No ranking run yet"}</div>
                        <small className="muted">{rankedCount} ranked · {open.length} required review(s) open</small>
                    </div>
                    <button type="button" className="btn primary block" style={{ marginTop: 12 }} disabled={!run || busy || run.published || open.length > 0 || rankedCount === 0} onClick={onPublishOfficial}>
                        Publish official ranking
                    </button>
                    {run && open.length > 0 ? <p className="smallnote" style={{ marginTop: 8 }}>Clear the {open.length} open review(s) to publish.</p> : null}
                </aside>
            </div>
        </>
    );
}

// ------------------------------------------------------------------------------------ package library
export function PackagesScreen({
    packages,
    onOpen,
    onAnalyze,
}: {
    packages: LibraryPackage[];
    onOpen: (id: string) => void;
    onAnalyze: () => void;
}) {
    const [text, setText] = useState("");
    const [status, setStatus] = useState<"all" | "ready" | "hold">("all");
    const list = useMemo(
        () =>
            packages.filter(
                (p) =>
                    (status === "all" || (status === "ready" && p.ready) || (status === "hold" && !p.ready)) &&
                    `${p.title} ${p.university} ${p.id}`.toLowerCase().includes(text.toLowerCase()),
            ),
        [packages, text, status],
    );
    return (
        <>
            <div className="sectiontitle" style={{ marginTop: 0 }}>
                <div>
                    <h2>Combined Project Package Library</h2>
                    <p>Readiness checks before the Super Admin can include a project in rankings.</p>
                </div>
                <button type="button" className="btn primary" onClick={onAnalyze}>Open Ranking Analyzer →</button>
            </div>
            <div className="notice positive">
                The analyzer verifies <b>Flashcard + full Detailed Report + Admin-approved CII / System Analysis + Evidence Manifest and required originals</b>. An incomplete project is held for verification, never assigned an artificially low rank.
            </div>
            <section className="panel">
                <div className="toolbar" style={{ marginBottom: 10 }}>
                    <input className="searchfield" style={{ maxWidth: 320 }} placeholder="Search title, university or report ID" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search packages" />
                    <div className="actions">
                        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Package status">
                            <option value="all">All packages</option>
                            <option value="ready">Complete</option>
                            <option value="hold">Verification required</option>
                        </select>
                        <span className="smallnote">{list.length} approved package records</span>
                    </div>
                </div>
                <div className="tablewrap">
                    <table className="table">
                        <thead>
                            <tr><th>Project / report</th><th>University / department</th><th>Approved CII</th><th>Four-part check</th><th>Evidence-based read</th><th>Open package</th></tr>
                        </thead>
                        <tbody>
                            {list.map((p) => (
                                <tr key={p.id}>
                                    <td><b>{p.title}</b><small className="pmeta">{p.id.slice(0, 8)} · {fmtDate(p.date)}</small></td>
                                    <td>{p.university}<small className="pmeta">{p.department}</small></td>
                                    <td><b>{p.cii == null ? "—" : `${fmtNum(p.cii)}/100`}</b><small className="pmeta">Locked approval</small></td>
                                    <td><span className={`labelchip ${p.ready ? "" : "red"}`}>{p.ready ? "Complete" : "Verification required"}</span>{!p.ready && p.reason ? <ReasonText text={p.reason} /> : null}</td>
                                    <td><span className={`labelchip ${p.evaluated ? "" : "gray"}`}>{p.evaluated ? "Read" : p.ready ? "Awaiting read" : "—"}</span></td>
                                    <td><button type="button" className="btn sm" onClick={() => onOpen(p.id)}>Open →</button></td>
                                </tr>
                            ))}
                            {!list.length ? (
                                <tr><td colSpan={6}><div className="empty"><b>No packages</b>{packages.length ? "Nothing matches this search." : "Approved projects with a locked CII appear here automatically."}</div></td></tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function standingTone(st: ProjectStanding | undefined): "" | "gray" | "red" | "gold" {
    if (st?.kind === "ranked" || st?.kind === "in_group") return "gold";
    if (st?.kind === "held") return "red";
    if (st?.kind === "unread" || st?.kind === "outside") return "gray";
    return "";
}

/**
 * Every approved package on the Analyzer itself — not only the ranked rows — so admins see which
 * projects are in, which are outside the current filters, and exactly why a held one is held.
 */
export function AllProjectsPanel({
    packages,
    standings,
    onOpen,
}: {
    packages: LibraryPackage[];
    standings: Map<string, ProjectStanding>;
    onOpen: (id: string) => void;
}) {
    const [text, setText] = useState("");
    const [status, setStatus] = useState<"all" | "ranked" | "eligible" | "outside" | "held">("all");
    const list = useMemo(() => {
        const rankOf = (id: string) => {
            const st = standings.get(id);
            return st?.kind === "ranked" || st?.kind === "in_group" ? st.rank : Infinity;
        };
        return packages
                .filter((p) => {
                    const kind = standings.get(p.id)?.kind;
                    if (status === "ranked" && kind !== "ranked" && kind !== "in_group") return false;
                    if (status === "eligible" && kind !== "eligible" && kind !== "unread") return false;
                    if (status === "outside" && kind !== "outside") return false;
                    if (status === "held" && kind !== "held") return false;
                    return `${p.title} ${p.university} ${p.department} ${p.id}`.toLowerCase().includes(text.toLowerCase());
                })
                .sort((a, b) => rankOf(a.id) - rankOf(b.id));
    }, [packages, standings, text, status]);
    const held = packages.filter((p) => !p.ready).length;
    return (
        <section className="panel">
            <div className="paneltitle">
                All approved projects <span className="labelchip gray">{packages.length} in cohort</span>
                {held ? <span className="labelchip red">{held} held</span> : null}
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 0 }}>
                Every approved package, ranked or not. A held project is waiting for missing or unreadable material — it is never
                given a low rank. Open a package to see its four parts.
            </p>
            <div className="toolbar" style={{ margin: "10px 0" }}>
                <input
                    className="searchfield"
                    style={{ maxWidth: 320 }}
                    placeholder="Search project, university, department or ID"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    aria-label="Search all approved projects"
                />
                <div className="actions">
                    <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Project standing">
                        <option value="all">All projects</option>
                        <option value="ranked">Ranked / in a ranked group</option>
                        <option value="eligible">Eligible, not ranked</option>
                        <option value="outside">Outside current filters</option>
                        <option value="held">Held for verification</option>
                    </select>
                    <span className="smallnote">{list.length} shown</span>
                </div>
            </div>
            <div className="tablewrap">
                <table className="table">
                    <thead>
                        <tr><th>Project</th><th>University / department</th><th>SDG</th><th>Approved CII</th><th>Standing</th><th>Package</th></tr>
                    </thead>
                    <tbody>
                        {list.map((p) => {
                            const st = standings.get(p.id);
                            return (
                                <tr key={p.id}>
                                    <td><b>{p.title}</b><small className="pmeta">{p.id.slice(0, 8)} · {fmtDate(p.date)}</small></td>
                                    <td>{p.university || "—"}<small className="pmeta">{p.department}</small></td>
                                    <td>{p.sdg ? <span className="labelchip gray">{p.sdg}</span> : "—"}</td>
                                    <td><b>{p.cii == null ? "—" : `${fmtNum(p.cii)}/100`}</b></td>
                                    <td>
                                        <span className={`labelchip ${standingTone(st)}`}>{standingLabel(st)}</span>
                                        {!p.ready && p.reason ? <ReasonText text={p.reason} /> : null}
                                    </td>
                                    <td><button type="button" className="btn sm" onClick={() => onOpen(p.id)}>Open 4-part package →</button></td>
                                </tr>
                            );
                        })}
                        {!list.length ? (
                            <tr><td colSpan={6}><div className="empty"><b>No projects</b>{packages.length ? "Nothing matches this search." : "Approved projects appear here automatically."}</div></td></tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// ------------------------------------------------------------------------------------ published (wall)
const VIEWERS = ["CIEL PK Super Admin", "Student", "Teammate", "Faculty", "Partner / NGO", "University Admin"] as const;

export function PublishedScreen({
    packages,
    projectId,
    onProject,
    rankings: projectRankings,
    onOpen,
    onCreate,
    role,
}: {
    packages: LibraryPackage[];
    projectId: string;
    onProject: (id: string) => void;
    rankings: ProjectRanking[];
    onOpen: (id: string) => void;
    onCreate: () => void;
    role: StudioRole;
}) {
    const [viewer, setViewer] = useState<(typeof VIEWERS)[number]>(role === "ciel_admin" ? "CIEL PK Super Admin" : "University Admin");
    const selected = packages.find((p) => p.id === projectId);
    const project = selected ?? packages[0];
    // Rankings were fetched for `projectId`; never show them beside a different project's flashcard.
    const rankings = selected ? projectRankings : [];
    // A published ranking can name a project that has since left the approved library; select a
    // project that exists so the flashcard and its rankings always describe the same project.
    useEffect(() => {
        if (!selected && packages[0]) onProject(packages[0].id);
    }, [selected, packages, onProject]);

    if (!project) {
        return (
            <section className="panel"><div className="empty"><b>No approved packages</b>Approved, CII-locked projects appear here once they exist.</div></section>
        );
    }
    const privacy =
        viewer === "Partner / NGO"
            ? "Partner view: public project information and rankings only; no restricted evidence originals."
            : viewer === "Student" || viewer === "Teammate"
              ? "Student team view: project ranking plus access only to files permitted for that team."
              : "Administrative / faculty view: access follows the project’s privacy classification and assigned role.";
    return (
        <>
            <div className="sectiontitle" style={{ marginTop: 0 }}>
                <div>
                    <h2>Published Results on My Impact Wall</h2>
                    <p>
                        The same named rankings are projected to the relevant project flashcards across stakeholder dashboards,
                        preserving each ranking’s own label, filters, position and date.
                    </p>
                </div>
                <div className="actions">
                    <label className="smallnote" htmlFor="rs-wall-project">Project</label>
                    <select id="rs-wall-project" value={project.id} onChange={(e) => onProject(e.target.value)} style={{ maxWidth: 300, border: "1px solid var(--border)", borderRadius: 8, padding: 7 }}>
                        {packages.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.id.slice(0, 8)}</option>)}
                    </select>
                    <label className="smallnote" htmlFor="rs-wall-viewer">Preview as</label>
                    <select id="rs-wall-viewer" value={viewer} onChange={(e) => setViewer(e.target.value as typeof viewer)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 7 }}>
                        {VIEWERS.map((v) => <option key={v}>{v}</option>)}
                    </select>
                    <button type="button" className="btn primary" onClick={onCreate}>Create another ranking →</button>
                </div>
            </div>
            <div className="chips" style={{ marginTop: 0 }}>
                <span className="labelchip">One ranking record · synchronized views</span>
            </div>
            <div className="wallgrid">
                <article className="flashcard">
                    <div className="flashhead">
                        <small>{viewer} · MY IMPACT WALL</small>
                        <h3>{project.title}</h3>
                        <small>{project.university} · {project.sdg || "SDG —"}</small>
                    </div>
                    <div className="flashbody">
                        <div className="flashline"><span>Admin-approved CII</span><strong>{project.cii == null ? "—" : `${fmtNum(project.cii)} / 100`}</strong></div>
                        <div className="flashline"><span>Report ID</span><strong>{project.id.slice(0, 8)}</strong></div>
                        <div className="flashline"><span>Complete package</span><span className={`labelchip ${project.ready ? "" : "red"}`}>{project.ready ? "Approved" : "Needs verification"}</span></div>
                        <button type="button" className="btn sm block" style={{ marginTop: 12 }} onClick={() => onOpen(project.id)}>
                            {viewer === "Partner / NGO" ? "View permitted report summary" : "View combined package"} →
                        </button>
                    </div>
                </article>
                <article className="flashcard">
                    <div className="flashhead">
                        <small>CIEL PK · PUBLISHED RANKINGS</small>
                        <h3>Project recognition across categories</h3>
                        <small>{rankings.length} saved comparison{rankings.length === 1 ? "" : "s"}</small>
                    </div>
                    <div className="flashbody">
                        <div className="goldpanel">
                            <b>Rankings linked to this project</b>
                            {rankings.length ? (
                                rankings.map((r) => (
                                    <div className="flashrank" key={`${r.publicationId}:${r.rank}:${r.label}`}>
                                        <b><span className="position">#{r.rank}</span> {r.name}</b>
                                        <small>{r.groupBy === "project" ? "Project position" : `Group position: ${r.groupBy} · ${r.label}`} · {r.lensTitle} · of {r.of}</small>
                                        <small><FilterChips filters={r.filters} /></small>
                                        <small>Published {fmtDate(r.publishedAt)} · {r.revision > 1 ? `Update ${r.revision}` : "First publication"} · <span className={`movement ${r.movement}`}>{movementLabel(r.movement, r.previousRank, r.rank)}</span></small>
                                    </div>
                                ))
                            ) : (
                                <p className="smallnote">No ranking has been published for this project yet. Use the Ranking Analyzer to create one.</p>
                            )}
                        </div>
                        <div className="smallnote" style={{ marginTop: 11 }}>Each ranking preserves its own label, comparison filters, result, method and publication date.</div>
                    </div>
                </article>
                <article className="flashcard">
                    <div className="flashhead">
                        <small>STAKEHOLDER PERMISSIONS</small>
                        <h3>Appropriate access, identical approved ranking</h3>
                    </div>
                    <div className="flashbody">
                        <p className="smallnote">Every authorized stakeholder sees the same published position for the same project and filter. Their file permissions remain different.</p>
                        <div className="privacy">{privacy}</div>
                        <div className="flashline"><span>Approved CII editable?</span><strong>No</strong></div>
                        <div className="flashline"><span>Ranking filters visible?</span><strong>Yes</strong></div>
                        <div className="flashline"><span>Historical rank retained?</span><strong>Yes</strong></div>
                    </div>
                </article>
            </div>
            <section className="panel" style={{ marginTop: 14 }}>
                <div className="paneltitle">Ranking publication rules</div>
                <p className="smallnote">
                    The original CII score and CII badge stay unchanged. Ranking chips are additional recognitions, each with its own
                    label, filters, position and date. Partner / NGO views never gain access to restricted or confidential files.
                    Students see their approved certificates separately.
                </p>
            </section>
        </>
    );
}

// ------------------------------------------------------------------------------------ history
const MOVEMENT_LEGEND: Array<[string, string]> = [
    ["▲ Rising", "Better position in a comparable ranking using the same method and cohort definition."],
    ["▼ Falling", "Lower position in the same comparable ranking."],
    ["→ Unchanged", "The published position stayed the same."],
    ["New / different cohort", "Do not claim a rise or fall when the filters, period, method or cohort changed."],
    ["Never erase old results", "New publications append an auditable snapshot. The Impact Wall highlights the latest position for each named comparison."],
];

export function HistoryScreen({
    items,
    studioBase,
    lenses,
    onShowProject,
    onCreate,
}: {
    items: PublicationSummary[];
    studioBase: string;
    lenses: LensMeta[];
    onShowProject: (projectId: string) => void;
    onCreate: () => void;
}) {
    const kindOf = (lens: string) => lenses.find((l) => l.key === lens)?.kind;
    const [openId, setOpenId] = useState<string | null>(null);
    const [detail, setDetail] = useState<PublicationSummary | null>(null);
    useEffect(() => {
        if (!openId) return;
        let cancelled = false;
        (async () => {
            const res = await authenticatedFetch(`${studioBase}/publications/${encodeURIComponent(openId)}`);
            const json = await res?.json().catch(() => null);
            if (cancelled) return;
            if (!res?.ok) {
                toast.error("Could not open this ranking.");
                setOpenId(null);
                return;
            }
            setDetail((json?.data ?? json) as PublicationSummary);
        })();
        return () => {
            cancelled = true;
        };
    }, [openId, studioBase]);

    return (
        <>
            <div className="sectiontitle" style={{ marginTop: 0 }}>
                <div>
                    <h2>Ranking History &amp; Performance</h2>
                    <p>Every published ranking is retained, with its exact filters and each project’s movement since the previous publication.</p>
                </div>
                <button type="button" className="btn primary" onClick={onCreate}>Create new ranking →</button>
            </div>
            <div className="buildergrid" style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}>
            <section className="panel">
                <div className="paneltitle">Saved ranking views <span className="labelchip gray">{items.length}</span></div>
                {items.length ? (
                    items.map((p) => (
                        <div key={p.id}>
                            <div className="audititem">
                                <div>
                                    <b>{p.name}</b>
                                    <small>
                                        {fmtDate(p.publishedAt)} · {p.revision === 1 ? "Initial publication" : `Ranking update ${p.revision}`} · {p.groupBy === "project" ? "project" : p.groupBy} standings · {p.rubricVersion}
                                    </small>
                                    <FilterChips filters={p.filters} />
                                    <small>
                                        {p.lensTitle} · {p.rowCount} ranked results · {p.eligibleCount} contributing projects
                                        {p.top.length ? ` · Top: ${p.top.map((t) => `#${t.rank} ${t.label}`).join(" · ")}` : ""}
                                    </small>
                                    {p.revision > 1 && !p.cohortComparable ? (
                                        <span className="labelchip gray">Different cohort — movement not compared</span>
                                    ) : null}
                                </div>
                                <button type="button" className="btn sm" onClick={() => setOpenId(openId === p.id ? null : p.id)}>{openId === p.id ? "Hide" : "View"}</button>
                            </div>
                            {openId === p.id && detail?.id === p.id ? (
                                <div className="tablewrap" style={{ margin: "0 0 12px" }}>
                                    <table className="table" style={{ minWidth: 520 }}>
                                        <thead><tr><th>Rank</th><th>{p.groupBy === "project" ? "Project" : "Group"}</th><th>Measure</th><th>Movement</th><th /></tr></thead>
                                        <tbody>
                                            {(detail.rows ?? []).map((r) => (
                                                <tr key={r.id}>
                                                    <td><span className="rank">#{r.rank}</span></td>
                                                    <td><b>{r.label}</b><small className="pmeta">{r.projectCount} project{r.projectCount === 1 ? "" : "s"}</small></td>
                                                    <td>{metricDisplay(r.metric, kindOf(p.lens))}</td>
                                                    <td><span className={`movement ${r.movement}`}>{movementLabel(r.movement, r.previousRank, r.rank)}</span></td>
                                                    <td>{r.projectIds[0] ? <button type="button" className="rowlink" onClick={() => onShowProject(r.projectIds[0])}>On Impact Wall →</button> : null}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>
                    ))
                ) : (
                    <div className="empty"><b>No rankings published</b>Publish a preview from the Ranking Analyzer to start the history.</div>
                )}
            </section>
            <section className="panel">
                <div className="paneltitle">What the movement symbols mean</div>
                {MOVEMENT_LEGEND.map(([t, d]) => (
                    <div className="audititem" key={t}>
                        <div>
                            <b>{t}</b>
                            <small>{d}</small>
                        </div>
                    </div>
                ))}
            </section>
            </div>
        </>
    );
}

// ------------------------------------------------------------------------------------ rules
export function RulesScreen({ criteria, rubric }: { criteria: CriterionMeta[]; rubric: string }) {
    const criteriaTotal = criteria.reduce((s, c) => s + c.weight, 0);
    const ciiWeight = criteria.length ? Math.round(100 - criteriaTotal) : 10;
    return (
        <>
            <div className="sectiontitle" style={{ marginTop: 0 }}>
                <div>
                    <h2>Ranking Rules &amp; Technical Integration</h2>
                    <p>A transparent ranking system that keeps approved reporting, new rankings and evidence permissions separate.</p>
                </div>
            </div>
            <section className="panel">
                <div className="paneltitle">Full-package reading is mandatory</div>
                <div className="grid4">
                    {[
                        ["1 · Flashcard", "Locked project metadata, SDG orientation, team, approved score and rank history."],
                        ["2 · Detailed report", "Read all completed sections, hours, needs, outputs, outcomes, contributions, skills and reflection."],
                        ["3 · System analysis", "Retrieve the Admin-approved CII score, approval and badge. Read analysis, limitations and verification notes."],
                        ["4 · Evidence originals", "Open each required image/PDF/file, record file ID and hash, protect Restricted and Confidential evidence."],
                    ].map(([t, d]) => (
                        <div className="fbox" key={t}><b>{t}</b><p>{d}</p></div>
                    ))}
                </div>
                <div className="callout" style={{ marginTop: 12 }}>
                    A file manifest alone is not proof an original was read. An unreadable critical file moves the project to verification pending, rather than lowering the rank.
                </div>
            </section>
            <section className="panel" style={{ marginTop: 14 }}>
                <div className="paneltitle">Overall Excellence method · {rubric}</div>
                <p className="smallnote">
                    Independent comparison uses eight evidence-grounded criteria worth {criteriaTotal || 90}% in total; the locked, Admin-approved CII contributes the remaining {ciiWeight}% as contextual input. Criteria are scored 0–5 with source references and a confidence level: an unsupported criterion earns no points. No student report can change its own CII score through rankings.
                </p>
                <div className="methodgrid" style={{ marginTop: 10 }}>
                    {criteria.map((c) => (
                        <div className="method" key={c.key}><b>{c.label || c.title}</b><small>{c.weight}% · {c.question || c.title}</small></div>
                    ))}
                    <div className="method"><b>Approved CII context</b><small>{ciiWeight}% · unchanged locked CII</small></div>
                </div>
                <p className="smallnote" style={{ marginTop: 12 }}>
                    Alternative angles (hours, beneficiaries, resources, SDG and so on) use the selected report attribute or quality criterion, not a silent substitution for the approved CII. Group standings use the <b>mean of eligible project scores</b> and show sample sizes. Earlier published rankings keep the weighting they were created under.
                </p>
            </section>
        </>
    );
}
