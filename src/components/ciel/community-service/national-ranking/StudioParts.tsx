"use client";

import { useState } from "react";
import {
    FILTER_TITLES,
    fmtDate,
    fmtNum,
    metricDisplay,
    prettyFilterValue,
    type CriterionMeta,
    type LensMeta,
    type LibraryPackage,
    type RunRow,
    type StudioFilters,
    type StudioResult,
    type StudioRow,
} from "./studio-types";

export function FilterChips({ filters }: { filters: StudioFilters }) {
    const entries = Object.entries(filters ?? {});
    return (
        <div className="chips">
            {entries.length ? (
                entries.map(([k, v]) => (
                    <span key={k} className="labelchip">
                        {FILTER_TITLES[k] || k}: {prettyFilterValue(k, v as string | number)}
                    </span>
                ))
            ) : (
                <span className="labelchip gray">All universities · All years · All approved projects</span>
            )}
        </div>
    );
}

/** Slide-over with the four parts of one approved package and the evidence-based assessment. */
export function PackageDrawer({
    row,
    lib,
    criteria,
    rubric,
    onClose,
}: {
    row: RunRow | null;
    lib: LibraryPackage | null;
    criteria: CriterionMeta[];
    rubric: string;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"package" | "assessment">("package");
    const title = row?.title ?? lib?.title ?? "Project package";
    const university = row?.university ?? lib?.university ?? "—";
    const cii = row?.cii ?? lib?.cii ?? null;
    const ciiWeight = criteria.length ? Math.round(100 - criteria.reduce((s, c) => s + c.weight, 0)) : 10;
    const parts = row?.parts ?? row?.package?.parts ?? ["Flashcard", "Detailed report", "Original evidence", "CII analysis", "Locked CII"];
    const ready = row ? row.status === "Ranked" || row.status === "Ready" : lib?.ready;

    return (
        <div className="drawerback open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="drawer" role="dialog" aria-label="Project package">
                <div className="drawerhead">
                    <div>
                        <div className="eyebrow">FULL PROJECT PACKAGE</div>
                        <h2>{title}</h2>
                        <p>{[row?.id ?? lib?.id, university, row?.pathway ?? lib?.department].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button type="button" className="btn sm" onClick={onClose}>Close ×</button>
                </div>
                <div className="tabrow">
                    <button type="button" className={tab === "package" ? "active" : ""} onClick={() => setTab("package")}>Combined package</button>
                    <button type="button" className={tab === "assessment" ? "active" : ""} onClick={() => setTab("assessment")}>Evidence-based assessment</button>
                </div>
                <div className="drawerbody">
                    {tab === "package" ? (
                        <>
                            <div className="source-detail">
                                <h4>01 · Flashcard <span className="labelchip">Present</span></h4>
                                <p>{title} · {lib?.sdg || "SDG —"} · {university}{lib?.date ? ` · ${fmtDate(lib.date)}` : ""}</p>
                            </div>
                            <div className="source-detail">
                                <h4>02 · Full detailed report <span className="labelchip">9 sections</span></h4>
                                <p>Project context, needs, activities and outputs, outcomes, verified participation, SDG mapping, resources, partner coordination, learning and sustainability. The server reads the full report, not only the flashcard.</p>
                            </div>
                            <div className="source-detail">
                                <h4>03 · Admin-approved system analysis <span className="labelchip gold">Locked</span></h4>
                                <p><b>{cii == null ? "—" : `${fmtNum(cii)}/100`}</b><br />The approved CII is read only. Rankings never modify it, and no student report can change its own CII through a ranking.</p>
                            </div>
                            <div className="source-detail">
                                <h4>04 · Evidence manifest and originals <span className={`labelchip ${ready ? "" : "red"}`}>{ready ? "Passed" : "Needs verification"}</span></h4>
                                <p>{ready ? "Every required original passed the server-side access check." : row?.reason || lib?.reason || "A required original could not be verified."}</p>
                                <ul>{parts.map((p) => <li key={p}>{p}</li>)}</ul>
                            </div>
                            {row?.evidenceRead ? (
                                <div className="source-detail">
                                    <h4>What the analyzer actually read <span className="labelchip">{row.evidenceRead.inspected.length} of {row.evidenceRead.inspected.length + row.evidenceRead.notInspected.length} files</span></h4>
                                    <p>Images are shown to the model; PDF originals are read as text. Anything else is listed here as not read, and no claim is credited to a file the model did not see.</p>
                                    {row.evidenceRead.inspected.length ? (
                                        <ul>{row.evidenceRead.inspected.map((f) => <li key={f.id}><b>{f.id}</b> {f.name} <span className="labelchip">read</span></li>)}</ul>
                                    ) : null}
                                    {row.evidenceRead.notInspected.length ? (
                                        <ul>{row.evidenceRead.notInspected.map((f) => <li key={f.id}><b>{f.id}</b> {f.name} <span className="labelchip gray">not read</span> <span className="muted">{f.reason}</span></li>)}</ul>
                                    ) : null}
                                </div>
                            ) : null}
                            {!ready ? <div className="callout">This project is held for verification, never given an artificially low rank.</div> : null}
                        </>
                    ) : row?.evaluation && row.scoreBreakdown ? (
                        <>
                            <div className="source-detail">
                                <h4>Independent ranking review · {rubric}</h4>
                                <p>{row.evaluation.summary}</p>
                            </div>
                            <div className="source-detail">
                                <h4>Excellence {row.scoreBreakdown.total.toFixed(2)} / 100 {row.rank ? <span className="labelchip">Official rank #{row.rank}</span> : null}</h4>
                                <div className="criteriongroup">
                                    {(criteria.length ? criteria : Object.keys(row.scoreBreakdown.criteria).map((k) => ({ key: k, title: k, weight: 0 }))).map((c) => {
                                        const j = row.evaluation?.criteria?.[c.key];
                                        const pts = row.scoreBreakdown!.criteria[c.key] ?? 0;
                                        return (
                                            <div className="criteria" key={c.key}>
                                                <span style={{ minWidth: 190 }}>{c.title} {c.weight ? <small className="muted">({c.weight}%)</small> : null}</span>
                                                <span className="track"><i style={{ width: `${((j?.anchor ?? 0) / 5) * 100}%` }} /></span>
                                                <strong>{j ? `${fmtNum(j.anchor)}/5` : "—"}</strong>
                                                <span className="muted">{j?.confidence ?? ""}</span>
                                                <strong>{pts.toFixed(2)}</strong>
                                            </div>
                                        );
                                    })}
                                    <div className="criteria">
                                        <span style={{ minWidth: 190 }}>Locked CII context <small className="muted">({ciiWeight}%)</small></span>
                                        <span className="track"><i style={{ width: `${Math.min(100, cii ?? 0)}%` }} /></span>
                                        <strong>{cii == null ? "—" : fmtNum(cii)}</strong>
                                        <span className="muted" />
                                        <strong>{row.scoreBreakdown.cii.toFixed(2)}</strong>
                                    </div>
                                </div>
                                {row.evaluation.limitations ? <p className="smallnote">{row.evaluation.limitations}</p> : null}
                            </div>
                            {row.evaluation.claims?.length ? (
                                <div className="source-detail">
                                    <h4>Supporting claims</h4>
                                    <ul>
                                        {row.evaluation.claims.map((c, i) => (
                                            <li key={i}>{c.statement} <span className="muted">— {c.source}{c.locator ? `, ${c.locator}` : ""} · {c.support}</span></li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="callout">
                            {row?.reason || "This package has not been read by the AI evaluator yet. Run the Ranking Analyzer to create its evidence-based assessment."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function GroupDrawer({
    row,
    result,
    lensTitle,
    kind,
    library,
    onOpenProject,
    onClose,
}: {
    row: StudioRow | null;
    result: StudioResult;
    lensTitle: string;
    kind: LensMeta["kind"];
    library: Map<string, LibraryPackage>;
    onOpenProject: (id: string) => void;
    onClose: () => void;
}) {
    if (!row) return null;
    return (
        <div className="drawerback open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="drawer" role="dialog" aria-label="Group composition">
                <div className="drawerhead">
                    <div>
                        <div className="eyebrow">GROUP STANDING</div>
                        <h2>{row.label}</h2>
                        <p>{row.projectCount} eligible projects · {lensTitle} · Rank #{row.rank}</p>
                    </div>
                    <button type="button" className="btn sm" onClick={onClose}>Close ×</button>
                </div>
                <div className="drawerbody">
                    <div className="source-detail">
                        <h4>How group rank #{row.rank} was calculated</h4>
                        <p>Every eligible project is scored on the same selected angle. The mean of {row.projectCount} project measures is {metricDisplay(row.metric, kind)}. A university or instructor is never rewarded merely for having more projects.</p>
                    </div>
                    <div className="source-detail">
                        <h4>Ranking scope</h4>
                        <p>{result.name}</p>
                        <FilterChips filters={result.filters} />
                    </div>
                    <div className="source-detail">
                        <h4>Included complete project packages</h4>
                        {row.projectIds.map((id) => {
                            const p = library.get(id);
                            return (
                                <div key={id} className="audititem">
                                    <div>
                                        <b>{p?.title ?? id}</b>
                                        <small>{p ? `${p.university} · ${p.department} · ${p.sdg} · locked CII ${p.cii == null ? "—" : fmtNum(p.cii)}/100` : id}</small>
                                    </div>
                                    <button type="button" className="btn sm" onClick={() => onOpenProject(id)}>Open package →</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PublishModal({
    name,
    result,
    lensTitle,
    audience,
    busy,
    onCancel,
    onConfirm,
}: {
    name: string;
    result: StudioResult;
    lensTitle: string;
    audience: string;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const top = result.rows.slice(0, 3).map((r) => `#${r.rank} ${r.label}`).join(" · ");
    const filters = Object.entries(result.filters)
        .map(([k, v]) => `${FILTER_TITLES[k] || k}: ${prettyFilterValue(k, v as string | number)}`)
        .join(" · ");
    return (
        <div className="modalbg open" onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
            <div className="modal" role="dialog" aria-label="Publish ranking">
                <div className="eyebrow" style={{ color: "var(--green)" }}>SUPER ADMIN PUBLICATION</div>
                <h2>Publish this ranking?</h2>
                <p>This writes an immutable ranking snapshot with its exact filters and shows it on the relevant My Impact Walls. Approved CII scores are never changed. Publishing the same ranking again creates the next update and records movement.</p>
                <div className="summarybox">
                    <div><b>Ranking:</b> {name}</div>
                    <div><b>Compared:</b> {result.groupBy === "project" ? "Individual projects" : `Groups by ${result.groupBy}`}</div>
                    <div><b>Measure:</b> {lensTitle}</div>
                    <div><b>Filters:</b> {filters || "All eligible approved projects"}</div>
                    <div><b>Included:</b> {result.eligibleIds.length} complete packages · {result.heldIds.length} on hold</div>
                    <div><b>Top results:</b> {top || "—"}</div>
                    <div><b>Recipients:</b> {audience}</div>
                </div>
                <div className="actions" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn" disabled={busy} onClick={onCancel}>Cancel</button>
                    <button type="button" className="btn primary" disabled={busy} onClick={onConfirm}>{busy ? "Publishing…" : "Publish ranking"}</button>
                </div>
            </div>
        </div>
    );
}
