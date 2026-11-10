"use client";

import { useMemo, useState } from "react";
import type { ReportData } from "../context/ReportContext";
import type { ImpactPackageAudience } from "./buildImpactPackageModel";
import {
    buildImpactPackageDetailedReport,
    detailedReportMatchesQuery,
    niceDetailedReportKey,
    type DetailedReportRow,
    type DetailedReportValue,
} from "./buildImpactPackageDetailedReport";
import {
    COMPACT_TABLE_PREVIEW_ROWS,
    compactTable,
    isCompactDetailedReportAudience,
    isCompactShortAnswer,
    splitCompactRows,
    type CompactTable,
} from "./detailedReportCompact";

function CompactTableView({ table, showAll }: { table: CompactTable; showAll: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const limit = showAll || expanded ? table.rows.length : COMPACT_TABLE_PREVIEW_ROWS;
    const hidden = table.rows.length - limit;
    return (
        <div className="dr-table-wrap">
            <table className={`dr-table${showAll || expanded ? " expanded" : ""}`}>
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        {table.columns.map((column) => (
                            <th scope="col" key={column.key}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.slice(0, limit).map((cells, index) => (
                        <tr key={index}>
                            <td className="dr-n">{index + 1}</td>
                            {cells.map((cell, cellIndex) => (
                                <td key={table.columns[cellIndex].key} title={cell.length > 60 ? cell : undefined}>
                                    <span className="dr-clip">{cell}</span>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {hidden > 0 || expanded ? (
                <button type="button" className="btn-link dr-more no-print" onClick={() => setExpanded((open) => !open)}>
                    {expanded ? "Show fewer" : `Show all ${table.rows.length} (${hidden} more)`}
                </button>
            ) : null}
            {hidden > 0 ? <div className="dr-print-more">+{hidden} more entries in the online record</div> : null}
        </div>
    );
}

/** Admin compact layout: entry lists as tables, short answers in a grid, blanks folded into one line. */
function CompactRows({
    rows,
    showAll,
    originLabel,
}: {
    rows: DetailedReportRow[];
    showAll: boolean;
    originLabel: (origin: string) => string;
}) {
    const { answered, unanswered } = splitCompactRows(rows);
    return (
        <>
            {answered.length ? (
                <div className="dr-grid">
                    {answered.map((item, index) => {
                        const table = compactTable(item.answer);
                        const short = !table && isCompactShortAnswer(item.answer);
                        const origin = originLabel(item.origin);
                        return (
                            <div className={`dr-qa${short ? "" : " wide"}`} key={`${index}-${item.question}`}>
                                <div className="question">
                                    {item.question}
                                    {table ? <span className="dr-count"> · {table.rows.length}</span> : null}
                                    {origin ? <span className="origin">{origin}</span> : null}
                                </div>
                                <div className="answer">
                                    {table ? <CompactTableView table={table} showAll={showAll} /> : <AnswerView value={item.answer} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}
            {unanswered.length ? (
                <div className="dr-unanswered">
                    <b>Not supplied:</b> {unanswered.join(" · ")}
                </div>
            ) : null}
        </>
    );
}

function AnswerView({ value }: { value: DetailedReportValue }) {
    if (value == null || value === "") {
        return <span className="empty">Not supplied</span>;
    }
    if (typeof value === "boolean") {
        return <div>{value ? "Yes (reported)" : "No"}</div>;
    }
    if (typeof value === "number") {
        return <div>{Number.isFinite(value) ? String(value) : "Not supplied"}</div>;
    }
    if (typeof value === "string") {
        if (value === "Not supplied") return <span className="empty">Not supplied</span>;
        return <div>{value}</div>;
    }
    if (Array.isArray(value)) {
        if (!value.length) return <span className="empty">No entries supplied</span>;
        if (value.every((item) => typeof item !== "object" || item == null)) {
            return (
                <ul>
                    {value.map((item, index) => (
                        <li key={`${String(item)}-${index}`}>{niceDetailedReportKey(item)}</li>
                    ))}
                </ul>
            );
        }
        return (
            <>
                {value.map((item, index) => (
                    <div key={index}>
                        <div className="entrylabel">ENTRY {index + 1}</div>
                        <AnswerView value={item} />
                    </div>
                ))}
            </>
        );
    }
    const entries = Object.entries(value);
    if (!entries.length) return <span className="empty">Not supplied</span>;
    return (
        <div className="nested">
            {entries.map(([key, item]) => (
                <div key={key}>
                    <b>{niceDetailedReportKey(key)}</b>
                    <div>
                        <AnswerView value={item} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ImpactPackageDetailedReport({
    data,
    projectData,
    extraFiles,
    audience = "student",
}: {
    data: ReportData;
    projectData?: unknown;
    extraFiles?: Array<{ url?: string; name?: string; source?: string }>;
    audience?: ImpactPackageAudience;
}) {
    const dossier = useMemo(
        () => buildImpactPackageDetailedReport(data, projectData, extraFiles, audience),
        [data, projectData, extraFiles, audience],
    );
    /** Admin, student and faculty read the compact layout (about 3–4 pages); other viewers keep the full dossier. */
    const compact = isCompactDetailedReportAudience(audience);
    const [query, setQuery] = useState("");
    const [openIds, setOpenIds] = useState<string[]>(() => dossier.sections.map((section) => section.id));

    const setSections = (open: boolean) => {
        const ids = open ? dossier.sections.map((section) => section.id) : [];
        setOpenIds(ids);
        window.requestAnimationFrame(() => {
            dossier.sections.forEach((section) => {
                const el = document.getElementById(`section-${section.id}`);
                if (el instanceof HTMLDetailsElement) el.open = open;
            });
        });
    };

    const originLabel = (origin: string) => {
        const value = origin.trim();
        if (!value || /^source record$/i.test(value) || /^not supplied$/i.test(value) || /^v13\b/i.test(value)) {
            return "";
        }
        return value;
    };

    const scrollTo = (id: string) => {
        const el = document.getElementById(`section-${id}`);
        if (el instanceof HTMLDetailsElement) el.open = true;
        setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    let visibleFields = 0;

    return (
        <div id="report" className={`view${compact ? " dr-compact" : ""}`}>
            <header className="page-head">
                <div className="page-head-top">
                    <div className="eyebrow">02 / The complete record</div>
                    <span className="pill">
                        {dossier.sections.length} sections · {dossier.subsectionCount} subsections · {dossier.fieldCount} answer fields
                    </span>
                </div>
                <h1>{dossier.title}</h1>
                <p>Every question and answer from the submitted report, kept in section order.</p>
            </header>
            {dossier.banner ? (
                <div className={`banner ${dossier.banner.kind === "warning" ? "warning" : ""}`}>
                    <strong>{dossier.banner.htmlTitle}</strong> {dossier.banner.text}
                </div>
            ) : null}
            <div className="report-layout">
                <aside className="toc">
                    <div className="eyebrow">Report contents</div>
                    {dossier.sections.map((section) => (
                        <button key={section.id} type="button" onClick={() => scrollTo(section.id)}>
                            <b>{section.id.padStart(2, "0")}</b>
                            {section.title}
                        </button>
                    ))}
                    <div className="count">
                        {dossier.fieldCount} answer fields retained
                        <br />
                        Public exports omit all Restricted / Private originals.
                    </div>
                </aside>
                <div>
                    <div className="report-top no-print">
                        <input
                            className="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            aria-label="Search report questions and answers"
                            placeholder="Search any question, answer or subsection…"
                        />
                        <button type="button" onClick={() => setSections(true)}>
                            Expand all
                        </button>
                        <button type="button" onClick={() => setSections(false)}>
                            Collapse all
                        </button>
                    </div>
                    {compact ? null : <div className="coverage">{dossier.coverage}</div>}
                    <div id="report-sections">
                        {dossier.sections.map((section) => {
                            const subs = section.subsections.map((sub) => {
                                const rows = sub.rows.filter((item) => detailedReportMatchesQuery(item, sub, query));
                                visibleFields += rows.length;
                                return { sub, rows };
                            }).filter((item) => item.rows.length);
                            if (query.trim() && !subs.length) return null;
                            const open = openIds.includes(section.id) || Boolean(query.trim());
                            return (
                                <details
                                    key={section.id}
                                    className="report-section"
                                    id={`section-${section.id}`}
                                    open={open}
                                    onToggle={(event) => {
                                        const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
                                        setOpenIds((prev) => {
                                            const has = prev.includes(section.id);
                                            if (nextOpen && !has) return [...prev, section.id];
                                            if (!nextOpen && has) return prev.filter((id) => id !== section.id);
                                            return prev;
                                        });
                                    }}
                                >
                                    <summary>
                                        <span className="n">{section.id.padStart(2, "0")}</span>
                                        <div>
                                            <h2>{section.title}</h2>
                                        </div>
                                    </summary>
                                    {subs.map(({ sub, rows }) => (
                                        <section className="subsection" key={sub.id}>
                                            <h3>
                                                <span>{sub.id}</span>
                                                {sub.title}
                                            </h3>
                                            {compact ? (
                                                <CompactRows rows={rows} showAll={Boolean(query.trim())} originLabel={originLabel} />
                                            ) : null}
                                            {!compact && rows.map((item) => (
                                                <div className="qa" key={`${sub.id}-${item.question}`}>
                                                    <div className="question">
                                                        {item.question}
                                                        {originLabel(item.origin) ? (
                                                            <span className="origin">{originLabel(item.origin)}</span>
                                                        ) : null}
                                                    </div>
                                                    <div className="answer">
                                                        <AnswerView value={item.answer} />
                                                    </div>
                                                </div>
                                            ))}
                                        </section>
                                    ))}
                                </details>
                            );
                        })}
                    </div>
                    {query.trim() && visibleFields === 0 ? (
                        <div className="report-empty">No matching questions or answers. Try a different term.</div>
                    ) : null}
                    {dossier.checks.length ? (
                        <div className="audit">
                            <h2>What the reviewer needs to resolve</h2>
                            <div className="audit-grid">
                                {dossier.checks.map((check) => (
                                    <div className="check" key={`${check.level}-${check.title}`}>
                                        <span>{check.level.toUpperCase()}</span>
                                        <strong>{check.title}</strong>
                                        {check.detail}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
