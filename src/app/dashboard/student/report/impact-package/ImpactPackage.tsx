"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportData } from "../context/ReportContext";
import ReportPrintView from "../components/ReportPrintView";
import { downloadExhibitionFlashcard, printExhibitionFlashcard } from "../utils/flashcardExport";
import {
    IMPACT_PACKAGE_TAB_EVENT,
    IMPACT_PACKAGE_TABS,
    IMPACT_PACKAGE_TABS_WITH_ANALYSIS,
    isImpactPackageTab,
    tabFromPackageQuery,
    type ImpactPackageTab,
} from "./impactPackageTabs";
import {
    buildImpactPackageModel,
    impactPackageAccessText,
    impactPackageCanDownload,
    impactPackageCanViewEvidence,
    impactPackageLockLine,
    shouldShowImpactPackageAnalysis,
    type ImpactPackageAudience,
    type ImpactPackageChange,
    type ImpactPackageEvidenceFile,
    type ImpactPackageEvidenceKind,
} from "./buildImpactPackageModel";
import "./impact-package.css";

const TAB_LABEL: Record<ImpactPackageTab, { num: string; label: string; crumb: string }> = {
    flash: { num: "01", label: "Impact flashcard", crumb: "01 / Impact flashcard" },
    report: { num: "02", label: "Detailed report", crumb: "02 / Complete detailed report" },
    evidence: { num: "03", label: "Evidence gallery", crumb: "03 / Evidence gallery" },
    analysis: { num: "04", label: "Analysis report", crumb: "04 / Analysis report" },
};

function Icon({ name }: { name: "file" | "image" | "lock" | "download" | "arrow" | "video" | "audio" | "archive" | "eye" | "print" }) {
    const paths: Record<string, string> = {
        file: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
        image: 'M3 4h18v16H3z M16 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M3 17l6-6 5 5 3-3 4 4',
        lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
        download: 'M12 3v12 m-5-5 5 5 5-5 M5 16v5h14v-5',
        arrow: 'M4 12h16 m-6-6 6 6-6 6',
        video: 'M3 5h18v14H3z M10 9l5 3-5 3z',
        audio: 'M9 18V6l10-2v12 M9 8l10-2 M6 18a3 3 0 1 1 0-.01 M16 16a3 3 0 1 1 0-.01',
        archive: 'M4 3h16v18H4z M11 3v12 M9 15h4v3H9z',
        eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 12a3 3 0 1 1 0-.01',
        print: 'M7 8V3h10v5 M7 17H3V9h18v8h-4 M7 14h10v7H7z',
    };
    return (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={paths[name] || paths.file} />
        </svg>
    );
}

function kindIcon(kind: ImpactPackageEvidenceKind, locked: boolean): "lock" | ImpactPackageEvidenceKind {
    return locked ? "lock" : kind;
}

function changeCaption(change: ImpactPackageChange): { headline: string; note: string } {
    const before = change.before;
    const after = change.after;
    if (before == null || after == null) {
        return { headline: change.label, note: change.note };
    }
    const delta = after - before;
    const sign = delta > 0 ? "+" : "";
    const isPct = change.unit === "%" || /%|percent/i.test(change.unit) || /rate|attend/i.test(change.label);
    const points = isPct
        ? `${sign}${Math.round(delta * 10) / 10} percentage points`
        : `${sign}${Math.round(delta * 10) / 10}${change.unit ? ` ${change.unit}` : ""}`;
    const relative = before !== 0 ? `${sign}${((delta / before) * 100).toFixed(1)}% relative change` : "";
    return {
        headline: [points, relative].filter(Boolean).join(" · "),
        note: change.note || "causation not established",
    };
}


function asCii(data: ReportData): { final?: number; level?: { name?: string; level?: number }; sections?: Array<{ id?: number; title?: string; score?: number; weight?: number }>; studentFeedback?: string | { summary?: string; why_score_is_high_or_low?: string } } {
    return (data.ciiV2 && typeof data.ciiV2 === "object" ? data.ciiV2 : {}) as {
        final?: number;
        level?: { name?: string; level?: number };
        sections?: Array<{ id?: number; title?: string; score?: number; weight?: number }>;
        studentFeedback?: string | { summary?: string; why_score_is_high_or_low?: string };
    };
}

function ImpactAnalysisPanel({ data, analyserHref }: { data: ReportData; analyserHref?: string }) {
    const cii = asCii(data);
    const final = typeof cii.final === "number" ? cii.final : Number(cii.final);
    const sections = Array.isArray(cii.sections) ? cii.sections : [];
    const fb = cii.studentFeedback;
    const summary =
        typeof fb === "string"
            ? fb.trim()
            : typeof fb?.summary === "string"
              ? fb.summary
              : typeof fb?.why_score_is_high_or_low === "string"
                ? fb.why_score_is_high_or_low
                : "";
    return (
        <div>
            <div className="evidence-stats">
                <div className="evidence-stat">
                    <b>{Number.isFinite(final) ? `${final}` : "—"}</b>
                    <span>CII / 100</span>
                </div>
                <div className="evidence-stat">
                    <b>{cii.level?.name || "Level pending"}</b>
                    <span>{cii.level?.level != null ? `L${cii.level.level}` : "recognition"}</span>
                </div>
                <div className="evidence-stat">
                    <b>{sections.length}</b>
                    <span>scored sections</span>
                </div>
                <div className="evidence-stat">
                    <b>Attached</b>
                    <span>after Super Admin approval</span>
                </div>
            </div>
            {summary ? (
                <div className="banner" style={{ marginBottom: 18 }}>
                    <strong>Analyst note.</strong> {summary}
                </div>
            ) : null}
            <div className="report-section" style={{ display: "block", padding: 0 }}>
                {sections.map((section) => (
                    <div key={String(section.id || section.title)} className="subsection">
                        <h3>
                            <span>{String(section.id || "").padStart(2, "0")}</span>
                            {section.title || "Section"}
                        </h3>
                        <div className="qa">
                            <div className="question">Score</div>
                            <div className="answer">
                                <p>
                                    {section.score ?? "—"}
                                    {section.weight != null ? ` / ${section.weight}` : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {analyserHref ? (
                <p className="below-flash">
                    <a href={analyserHref}>Open full AI analyser →</a>
                </p>
            ) : null}
        </div>
    );
}

export default function ImpactPackage({
    data,
    projectData,
    audience = "student",
    initialTab,
    extraFiles,
    analyserHref,
}: {
    data: ReportData;
    projectData?: unknown;
    audience?: ImpactPackageAudience;
    initialTab?: ImpactPackageTab;
    extraFiles?: Array<{ url?: string; name?: string; source?: string }>;
    analyserHref?: string;
}) {
    const model = useMemo(() => buildImpactPackageModel(data, projectData, extraFiles), [data, projectData, extraFiles]);
    const showAnalysis = shouldShowImpactPackageAnalysis(audience, data);
    const tabs = showAnalysis ? IMPACT_PACKAGE_TABS_WITH_ANALYSIS : IMPACT_PACKAGE_TABS;
    const [tab, setTab] = useState<ImpactPackageTab>(() => {
        if (initialTab) return initialTab;
        if (typeof window === "undefined") return "flash";
        return tabFromPackageQuery(new URLSearchParams(window.location.search).get("view"), window.location.hash);
    });
    const [evQuery, setEvQuery] = useState("");
    const [evKind, setEvKind] = useState("all");
    const [reportQuery, setReportQuery] = useState("");
    const [preview, setPreview] = useState<ImpactPackageEvidenceFile | null>(null);
    const [previewStage, setPreviewStage] = useState<"pending" | "approved">(model.adminApproved ? "approved" : "pending");

    const visibility = model.effectiveVisibility;
    const canView = impactPackageCanViewEvidence(audience, visibility);
    const partnerLocked = audience === "partner" && visibility !== "public";
    const publicLocked = audience === "public" && visibility !== "public";
    const filesVisible = partnerLocked || publicLocked ? false : canView;
    const canDownload = impactPackageCanDownload(audience, visibility, model.publicConsent);
    const lockLine = impactPackageLockLine(previewStage === "approved" || model.adminApproved);
    const accessText = impactPackageAccessText(audience, visibility, previewStage === "approved" || model.adminApproved);
    const flashChange = model.change && model.change.before != null && model.change.after != null
        ? changeCaption(model.change)
        : null;

    const go = useCallback((next: ImpactPackageTab) => {
        if (next === "analysis" && !showAnalysis) return;
        setTab(next);
        try {
            history.replaceState(null, "", `#${next}`);
        } catch {
            /* ignore */
        }
    }, [showAnalysis]);

    useEffect(() => {
        const onTab = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (isImpactPackageTab(detail)) go(detail);
        };
        const onHash = () => {
            const next = tabFromPackageQuery(null, window.location.hash);
            setTab(next);
        };
        window.addEventListener(IMPACT_PACKAGE_TAB_EVENT, onTab);
        window.addEventListener("hashchange", onHash);
        return () => {
            window.removeEventListener(IMPACT_PACKAGE_TAB_EVENT, onTab);
            window.removeEventListener("hashchange", onHash);
        };
    }, [go]);

    useEffect(() => {
        if (initialTab) setTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (!showAnalysis && tab === "analysis") setTab("flash");
    }, [showAnalysis, tab]);

    const printPackage = () => {
        document.body.classList.add("ipkg-printing");
        const finish = () => {
            document.body.classList.remove("ipkg-printing");
            window.removeEventListener("afterprint", finish);
        };
        window.addEventListener("afterprint", finish);
        window.setTimeout(() => {
            if (tab === "flash") {
                void printExhibitionFlashcard(model.title);
            } else {
                window.print();
            }
        }, 30);
    };

    const exportPublicHtml = () => {
        const article = document.getElementById("flashcard-capture");
        if (!article) return;
        const css = [...document.styleSheets]
            .map((sheet) => {
                try {
                    return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
                } catch {
                    return "";
                }
            })
            .join("\n");
        const scoped = css
            .split("}")
            .filter((chunk) => /(?:^|[,\s])(?:\.ipkg|\.flash|html|body|:root)/.test(chunk))
            .join("}");
        const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${model.title} · CIEL PK Impact Package</title><style>${scoped || ""}body{margin:0;background:#f0efe8}.ipkg{padding:24px 0 40px}</style></head><body class="ipkg"><main>${article.outerHTML}</main></body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${model.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ciel-pk"}-impact-package.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredFiles = model.files.filter((file) => {
        const q = evQuery.trim().toLowerCase();
        const kindOk = evKind === "all" || file.kind === evKind || (evKind === "file" && file.kind !== "image" && file.kind !== "video" && file.kind !== "audio" && file.kind !== "archive");
        const textOk = !q || `${file.name} ${file.claim} ${file.section}`.toLowerCase().includes(q);
        return kindOk && textOk;
    });

    const whoLabel = visibility === "public" ? "Public" : "Internal";
    const publicDisplay = visibility === "public" ? "Allowed" : "Hidden";
    const studentExportsLocked = audience === "student" && !model.adminApproved;

    return (
        <div className="ipkg" id="ciel-impact-package">
            <div className="mast">
                <div className="brand">
                    <div className="brandmark">c</div>
                    CIEL<span>PK</span>
                    <small>THE IMPACT PACKAGE</small>
                </div>
                <div className="viewer">
                    <span>
                        {audience === "admin" ? "CIEL PK Super Admin" : audience === "faculty" ? "Faculty review" : audience === "partner" ? "Partner / NGO" : audience === "university" ? "University" : "Student record"}
                    </span>
                </div>
            </div>
            <div className="navwrap">
                <div className="nav" role="tablist">
                    {tabs.map((id) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            className={tab === id ? "active" : ""}
                            onClick={() => go(id)}
                        >
                            <span className="tabnum">{TAB_LABEL[id].num}</span>
                            {TAB_LABEL[id].label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="tools">
                <div className="left">
                    <span>{TAB_LABEL[tab].crumb}</span>
                    {model.submitted ? (
                        <>
                            <span className="dot" />
                            <span>{model.adminApproved ? "Published record" : "Awaiting CIEL PK approval · downloads locked"}</span>
                        </>
                    ) : (
                        <span>Draft package · not submitted · downloads after Super Admin approval</span>
                    )}
                </div>
                <div className="right">
                    <button
                        type="button"
                        disabled={studentExportsLocked}
                        title={studentExportsLocked ? "Available after CIEL PK Super Admin approval" : undefined}
                        onClick={() => void downloadExhibitionFlashcard(model.title)}
                    >
                        <span className="button-content">
                            <Icon name="image" /> Save flashcard PNG
                        </span>
                    </button>
                    <button
                        type="button"
                        disabled={studentExportsLocked}
                        title={studentExportsLocked ? "Available after CIEL PK Super Admin approval" : undefined}
                        onClick={printPackage}
                    >
                        <span className="button-content">
                            <Icon name="print" /> Print / Save PDF
                        </span>
                    </button>
                    <button
                        type="button"
                        disabled={studentExportsLocked}
                        title={studentExportsLocked ? "Available after CIEL PK Super Admin approval" : undefined}
                        onClick={exportPublicHtml}
                    >
                        <span className="button-content">
                            <Icon name="download" /> Export public HTML
                        </span>
                    </button>
                    {analyserHref ? (
                        <a href={analyserHref} className="primary" style={{ textDecoration: "none" }}>
                            <span className="button-content">Run AI analyser</span>
                        </a>
                    ) : null}
                </div>
            </div>

            <main className="ipkg-main">
                {tab === "flash" ? (
                    <div id="flash" className="view">
                        <article className="flash" id="flashcard-capture" aria-label="One-page project impact flashcard">
                            <header className="flash-head">
                                <div className="fh-top">
                                    <div className="eyebrow">CIEL PK / Community Impact Education Lab Pakistan</div>
                                    <div className="sheet-no">01</div>
                                </div>
                                <h1>
                                    {model.headline.map((line, index) => (
                                        <span key={line}>
                                            {index > 0 ? <br /> : null}
                                            {line}
                                        </span>
                                    ))}
                                </h1>
                                {model.headline.length > 1 || model.projectName !== model.headline[0] ? (
                                    <div className="hero-project">{model.projectName}</div>
                                ) : null}
                                <div className="hero-meta">
                                    {model.heroMeta.map((line, index) => {
                                        if (index === 0 && line.includes(" · ")) {
                                            const cut = line.indexOf(" · ");
                                            return (
                                                <span key={line}>
                                                    <b>{line.slice(0, cut)}</b>
                                                    {line.slice(cut)}
                                                </span>
                                            );
                                        }
                                        return <span key={line}>{line}</span>;
                                    })}
                                </div>
                            </header>
                            <div className="statusstrip">
                                <strong>{model.statusTitle}</strong>
                                <span>{model.statusDetail}</span>
                            </div>
                            <div className="metrics">
                                {model.metrics.map((metric) => (
                                    <div className="metric" key={metric.label}>
                                        <div className="val" dangerouslySetInnerHTML={{ __html: metric.value }} />
                                        <div className="label">{metric.label}</div>
                                        <div className="qual">{metric.qual}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="overview">
                                <div className="overview-story">
                                    <div className="eyebrow">The project in one read</div>
                                    <p>{model.story}</p>
                                </div>
                                <div className="change">
                                    <div className="eyebrow">{model.change ? model.changeEyebrow : "Measured change"}</div>
                                    {flashChange && model.change && model.change.before != null && model.change.after != null ? (
                                        <>
                                            <div className="trend">
                                                <span className="number">{model.change.before}{model.change.unit === "%" ? "%" : ""}</span>
                                                <Icon name="arrow" />
                                                <span className="number">{model.change.after}{model.change.unit === "%" ? "%" : ""}</span>
                                            </div>
                                            <div className="mini-bars">
                                                <span>Before</span>
                                                <div className="track">
                                                    <i className="before" style={{ width: `${Math.min(100, Math.max(4, model.change.before))}%` }} />
                                                </div>
                                                <span>After</span>
                                                <div className="track">
                                                    <i style={{ width: `${Math.min(100, Math.max(4, model.change.after))}%` }} />
                                                </div>
                                            </div>
                                            <div className="small" style={{ fontSize: 8, marginTop: 7 }}>
                                                {flashChange.headline}
                                                <br />
                                                {flashChange.note}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="small" style={{ marginTop: 8 }}>
                                            No numeric before–after metric was supplied. The detailed report keeps the source answers.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="grid-nine">
                                {model.tiles.map((tile) => (
                                    <section className="section-tile" key={tile.n}>
                                        <div className="tile-head">
                                            <span className="section-number">0{tile.n}</span>
                                            <h2>{tile.title}</h2>
                                        </div>
                                        <p>{tile.text}</p>
                                        <div className="chips">
                                            {tile.chips.map((chip) => (
                                                <span key={chip.text} className={`chip ${chip.cls || ""}`}>
                                                    {chip.text}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                            <div className="evidence-ribbon">
                                <div>
                                    <h2>Evidence sharing: {model.visibilityLabel}</h2>
                                    <p>
                                        All {model.files.length} entries · one setting
                                        <br />
                                        {visibility === "public"
                                            ? "Public permission confirmed"
                                            : visibility === "private"
                                              ? "Verification only · no downloads"
                                              : model.adminApproved
                                                ? "Faculty & University unlocked · view only"
                                                : "Faculty & University await admin approval"}
                                    </p>
                                </div>
                                <div className="evidence-thumbs">
                                    {(model.files.length ? model.files : [null]).slice(0, 6).map((file, index) => {
                                        const locked = !filesVisible;
                                        const image = !locked && file?.kind === "image" && file.url;
                                        return (
                                            <button
                                                key={file?.id || `empty-${index}`}
                                                type="button"
                                                className={`mini-file ${locked ? "locked" : ""}`}
                                                onClick={() => go("evidence")}
                                                title={locked ? lockLine : file?.name || "No evidence"}
                                            >
                                                {image ? <img src={file.url} alt="" /> : <Icon name={kindIcon(file?.kind || "file", locked)} />}
                                                {image ? null : <span>{locked ? "Not public" : file ? file.kind.toUpperCase() : "None"}</span>}
                                                <span className="tag">{model.visibilityLabel.toUpperCase()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="ribbon-action">
                                    <button type="button" disabled={!canDownload} onClick={() => go("evidence")}>
                                        <span className="button-content">
                                            <Icon name="download" /> Download all evidence
                                        </span>
                                    </button>
                                    <span className="small">{canDownload ? "All available originals · whole package" : `Downloads blocked · ${model.visibilityLabel}`}</span>
                                </div>
                            </div>
                            <footer className="flash-foot">
                                <div>
                                    <b>Publication & recognition</b>
                                    <div className="publication-items">
                                        <span>CIEL PK acceptance: {model.adminApproved ? "accepted" : "pending"}</span>
                                        <span>{model.ciiLabel}</span>
                                        <span>Badge / rank: {model.ciiPending ? "pending" : "issued"}</span>
                                        <span>QR: {model.adminApproved ? "issued" : "not issued"}</span>
                                    </div>
                                </div>
                                <div className="footer-id">
                                    {model.projectId || model.reportId}
                                    <br />
                                    One opportunity · one report · three views
                                </div>
                            </footer>
                        </article>
                        <div className="below-flash">
                            <span>All nine content sections represented. Detailed report retains the source answers and gaps.</span>
                            <button type="button" className="btn-link" onClick={() => go("report")}>
                                Read the complete report →
                            </button>
                        </div>
                    </div>
                ) : null}

                {tab === "report" ? (
                    <div id="report" className="view">
                        <header className="page-head">
                            <div className="page-head-top">
                                <div className="eyebrow">02 / The complete record</div>
                                <span className="pill">Source answers preserved</span>
                            </div>
                            <h1>
                                Every question.
                                <br />
                                Every answer, preserved.
                            </h1>
                            <p>
                                {model.title}
                                {model.projectId ? ` · ${model.projectId}` : ""}. The detailed report is the locked student-source record.
                            </p>
                        </header>
                        <div className="report-top no-print">
                            <input
                                className="search"
                                value={reportQuery}
                                onChange={(e) => setReportQuery(e.target.value)}
                                aria-label="Search report"
                                placeholder="Search any question, answer or subsection…"
                            />
                        </div>
                        <div className={reportQuery.trim() ? "ipkg-report-filter" : undefined} data-filter={reportQuery.trim().toLowerCase()}>
                            <ReportPrintView projectData={projectData} reportData={data} />
                        </div>
                    </div>
                ) : null}

                {tab === "evidence" ? (
                    <div id="evidence" className="view">
                        <header className="page-head">
                            <div className="page-head-top">
                                <div className="eyebrow">03 / The evidence behind the claims</div>
                                <button type="button" className="primary" disabled={!canDownload} onClick={() => window.open(model.files[0]?.url, "_blank", "noopener,noreferrer")}>
                                    <span className="button-content">
                                        <Icon name="download" /> Download all evidence
                                    </span>
                                </button>
                            </div>
                            <h1>
                                One project.
                                <br />
                                One evidence-sharing choice.
                            </h1>
                            <p>All pictures, videos, documents, audio and archives use the same setting: Public, Restricted or Private. Restricted is the default.</p>
                        </header>
                        {audience === "admin" ? (
                            <div className="approval-preview no-print">
                                <div>
                                    <strong>Access preview only</strong>
                                    <span>Simulate the approval gate. This does not approve or publish the report.</span>
                                </div>
                                <label>
                                    Review stage
                                    <select value={previewStage} onChange={(e) => setPreviewStage(e.target.value === "approved" ? "approved" : "pending")}>
                                        <option value="pending">Before approval</option>
                                        <option value="approved">After super-admin approval</option>
                                    </select>
                                </label>
                            </div>
                        ) : null}
                        <div className="banner">
                            <strong>All evidence: {model.visibilityLabel}.</strong> {accessText}
                        </div>
                        <div className="evidence-stats">
                            <div className="evidence-stat">
                                <b>{model.files.length}</b>
                                <span>entries · all {model.visibilityLabel}</span>
                            </div>
                            <div className="evidence-stat">
                                <b>{filesVisible ? model.files.length : 0}</b>
                                <span>originals available here</span>
                            </div>
                            <div className="evidence-stat">
                                <b>{whoLabel}</b>
                                <span>who can see this package</span>
                            </div>
                            <div className="evidence-stat">
                                <b>{publicDisplay}</b>
                                <span>public display: {visibility === "public" ? "confirmed" : "not allowed"}</span>
                            </div>
                        </div>
                        <div className="evidence-controls no-print">
                            <input className="search" value={evQuery} onChange={(e) => setEvQuery(e.target.value)} placeholder="Search visible evidence…" aria-label="Search visible evidence" />
                            <select value={evKind} onChange={(e) => setEvKind(e.target.value)} aria-label="Filter evidence type">
                                <option value="all">All formats</option>
                                <option value="image">Images</option>
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                                <option value="file">Documents / other</option>
                                <option value="archive">Archives</option>
                            </select>
                        </div>
                        {filteredFiles.length === 0 ? (
                            <p className="banner">No matching visible evidence.</p>
                        ) : (
                            <div className="evidence-grid">
                                {filteredFiles.map((file) => {
                                    const locked = !filesVisible;
                                    return (
                                        <article className="evidence-card" key={file.id} data-kind={file.kind}>
                                            <div className={`ev-preview ${locked ? "locked" : ""}`}>
                                                {locked ? (
                                                    <Icon name="lock" />
                                                ) : file.kind === "image" ? (
                                                    <img src={file.url} alt={file.claim || file.name} />
                                                ) : file.kind === "video" ? (
                                                    <video src={file.url} preload="metadata" muted playsInline />
                                                ) : (
                                                    <Icon name={file.kind} />
                                                )}
                                                {!locked && file.kind !== "image" ? <span className="preview-label">{file.kind.toUpperCase()}</span> : null}
                                                {locked ? <span className="preview-label">NOT PUBLICLY AVAILABLE</span> : null}
                                                <span className={`pill ${visibility === "public" ? "public" : "confidential"}`}>
                                                    <Icon name={visibility === "public" ? "eye" : "lock"} />
                                                    {model.visibilityLabel}
                                                </span>
                                            </div>
                                            <div className="ev-body">
                                                <div className="ev-name">{locked ? `${model.visibilityLabel} evidence · ${file.id}` : file.name}</div>
                                                <div className="ev-meta">
                                                    <span>{locked ? "Protected" : file.kind.toUpperCase()}</span>
                                                    {locked ? null : <span>Section {file.section.replace("section", "")}</span>}
                                                </div>
                                                <div className="ev-claim">{locked ? lockLine : file.claim}</div>
                                                <div className="ev-link">{accessText}</div>
                                                <div className="empty-note">{locked ? "No original, filename, claim or thumbnail is exposed here." : "Original attached · claim verification pending"}</div>
                                                <div className="ev-actions">
                                                    <button type="button" disabled={locked} onClick={() => setPreview(file)}>
                                                        <span className="button-content">
                                                            <Icon name={locked ? "lock" : "eye"} />
                                                            {locked ? "Locked" : "Open file"}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!canDownload}
                                                        onClick={() => {
                                                            if (!canDownload) return;
                                                            window.open(file.url, "_blank", "noopener,noreferrer");
                                                        }}
                                                    >
                                                        <span className="button-content">
                                                            <Icon name="download" />
                                                            {canDownload ? "Download" : "Download blocked"}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                        <details className="permission-matrix no-print">
                            <summary>
                                <strong>Sharing rules · reference</strong>
                            </summary>
                            <div className="tablewrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>One setting for all evidence</th>
                                            <th>Who may view?</th>
                                            <th>Public display</th>
                                            <th>Download</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Public</td>
                                            <td>Anyone viewing the published project</td>
                                            <td>With the one public-permission confirmation</td>
                                            <td>Available originals</td>
                                        </tr>
                                        <tr>
                                            <td>Restricted · Default</td>
                                            <td>Student + Super Admin before approval; Faculty + University added after approval. Partner / NGO never.</td>
                                            <td>Not allowed</td>
                                            <td className="block">Blocked for all roles, including Super Admin</td>
                                        </tr>
                                        <tr>
                                            <td>Private</td>
                                            <td>Student + Super Admin before approval; Faculty + University added after approval. Internal verification only. Partner / NGO never.</td>
                                            <td>Never</td>
                                            <td className="block">Blocked for all roles, including Super Admin</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </div>
                ) : null}

                {tab === "analysis" && showAnalysis ? (
                    <div id="analysis" className="view">
                        <header className="page-head">
                            <div className="page-head-top">
                                <div className="eyebrow">04 / Analysis report</div>
                                <span className="pill">CIEL PK CII analysis</span>
                            </div>
                            <h1>
                                The analysis behind
                                <br />
                                this published package.
                            </h1>
                            <p>Faculty, the student and the university receive this report after Super Admin approval. Partner / NGO copies of the package do not include it.</p>
                        </header>
                        <ImpactAnalysisPanel data={data} analyserHref={audience === "admin" ? analyserHref : undefined} />
                    </div>
                ) : null}
            </main>

            {preview && filesVisible ? (
                <div className="ipkg-modal" role="dialog" aria-modal="true" aria-label={preview.name}>
                    <div className="modal-head">
                        <div>
                            <h2>{preview.name}</h2>
                            <div className="small">{model.visibilityLabel} · {preview.kind}</div>
                        </div>
                        <button type="button" onClick={() => setPreview(null)}>
                            Close
                        </button>
                    </div>
                    <div className="modal-body">
                        {preview.kind === "image" ? (
                            <img src={preview.url} alt={preview.claim || preview.name} />
                        ) : preview.kind === "video" ? (
                            <video src={preview.url} controls playsInline />
                        ) : preview.kind === "audio" ? (
                            <audio src={preview.url} controls />
                        ) : /\.pdf(\?|#|$)/i.test(preview.url) ? (
                            <iframe src={preview.url} title={preview.name} />
                        ) : (
                            <div className="banner">
                                <strong>{preview.name}</strong>
                                <p>This format is retained intact. Open it in a compatible application.</p>
                                <a href={preview.url} target="_blank" rel="noreferrer">
                                    Open original
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
