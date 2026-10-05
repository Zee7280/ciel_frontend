"use client";

import { useMemo, useState } from "react";
import type { ReportData } from "../context/ReportContext";
import type { ImpactPackageAudience } from "./buildImpactPackageModel";
import {
    buildImpactPackageDetailedReport,
    detailedReportMatchesQuery,
    niceDetailedReportKey,
    type DetailedReportValue,
} from "./buildImpactPackageDetailedReport";

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
    const entries = Object.entries(value).filter(([, item]) => item != null && item !== "");
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
    const [query, setQuery] = useState("");
    const [openIds, setOpenIds] = useState<string[]>(() => dossier.sections.map((section) => section.id));

    const setSections = (open: boolean) => {
        setOpenIds(open ? dossier.sections.map((section) => section.id) : []);
    };

    const scrollTo = (id: string) => {
        document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    let visibleFields = 0;

    return (
        <div id="report" className="view">
            <header className="page-head">
                <div className="page-head-top">
                    <div className="eyebrow">02 / The complete record</div>
                    <span className="pill">
                        {dossier.sections.length} sections · {dossier.subsectionCount} subsections · {dossier.fieldCount} answer fields
                    </span>
                </div>
                <h1>
                    Every question.
                    <br />
                    Every answer, preserved.
                </h1>
                <p>
                    {dossier.title}
                    {dossier.projectId ? ` · ${dossier.projectId}` : ""}. Original V13 subsection references are kept alongside the normalized package numbering.
                </p>
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
                    <div className="coverage">{dossier.coverage}</div>
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
                                            <div className="source">{section.source}</div>
                                        </div>
                                    </summary>
                                    {subs.map(({ sub, rows }) => (
                                        <section className="subsection" key={sub.id}>
                                            <h3>
                                                <span>{sub.id}</span>
                                                {sub.title}
                                            </h3>
                                            {rows.map((item) => (
                                                <div className="qa" key={`${sub.id}-${item.question}`}>
                                                    <div className="question">
                                                        {item.question}
                                                        <span className="origin">{item.origin}</span>
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
