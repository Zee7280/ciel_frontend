"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { prepareReportForVerifyDossier } from "@/utils/reportTeamScope";
import { coerceFlashReportData } from "./facultyAiEvaluation.helpers";
import { buildLockedV17Package, type LockedV17PackageModel } from "./buildLockedV17Package";
import { resolveReportCii } from "@/app/dashboard/student/report/utils/resolveReportCii";
import "./faculty-locked-v17.css";

type TabId = "flashView" | "reportView" | "assessedView" | "badgeView";

const TABS: Array<{ id: TabId; label: string }> = [
    { id: "flashView", label: "Raw Flashcard" },
    { id: "reportView", label: "Raw Detailed Report" },
    { id: "assessedView", label: "Detailed Report + CII Assessment" },
    { id: "badgeView", label: "Flashcard + CII Badge" },
];

function V16Flashcard({ model }: { model: LockedV17PackageModel }) {
    const provisional = !model.ciiLocked && model.ciiScore != null;
    const verified = model.ciiLocked && model.ciiScore != null;
    return (
        <article className="v16Flash">
            <header className="v16Hero">
                <div className="v16Kicker">CIEL PK · COMMUNITY ENGAGEMENT · IMPACT FLASHCARD</div>
                <h1>{model.title}</h1>
                <div className="v16Story">{model.story}</div>
                {model.meta ? <div className="v16Meta">{model.meta}</div> : null}
                <div className="v16StatusRow">
                    {model.statusChips.map((chip) => (
                        <span key={chip}>{chip}</span>
                    ))}
                </div>
                {verified ? (
                    <div className="flashcardAwardBlock">
                        <div className="flashcardAwardMeta">
                            <span className="ey">Faculty-Verified CII Recognition</span>
                            <span className="nm">{model.badgeLabel}</span>
                            <span className="sm">
                                The student has now been awarded a Faculty-Verified Composite Index Indicator score. The flashcard template remains locked; the recognition layer is attached for exhibition, review and download.
                            </span>
                        </div>
                        <span className="flashcardAwardPill">
                            {model.ciiScore}/100 · Range {model.badgeRange}
                        </span>
                    </div>
                ) : null}
                {provisional ? (
                    <div className="flashcardAwardBlock">
                        <div className="flashcardAwardMeta">
                            <span className="ey">System assessment complete</span>
                            <span className="nm">Badge awaiting Faculty finalisation</span>
                            <span className="sm">
                                A provisional CII is available, but the badge will only update on the flashcard once Faculty verifies or moderates the score.
                            </span>
                        </div>
                        <span className="flashcardAwardPill pending">Provisional CII {model.ciiScore}/100</span>
                    </div>
                ) : null}
            </header>
            <div className="v16Metrics">
                <div className="v16Metric">
                    <b>{model.hoursLabel}</b>
                    <small>Service hours</small>
                </div>
                <div className="v16Metric">
                    <b>{model.sessions}</b>
                    <small>Sessions</small>
                </div>
                <div className="v16Metric">
                    <b>{model.reach}</b>
                    <small>Beneficiaries</small>
                </div>
                <div className="v16Metric">
                    <b>{model.outputs}</b>
                    <small>Outputs</small>
                </div>
                <div className="v16Metric">
                    <b>{model.outcomes}</b>
                    <small>Outcomes</small>
                </div>
                <div className="v16Metric">
                    <b>{model.evidence}</b>
                    <small>Evidence items</small>
                </div>
            </div>
            <div className="v16Body">
                <div className="v16TitleRow">
                    <h2>Impact Highlights</h2>
                    <i />
                </div>
                <div className="v16SpotGrid">
                    {model.spots.map((spot) => (
                        <div key={spot.ey} className={`v16Spot ${spot.tone}`}>
                            <div className="ey">{spot.ey}</div>
                            <b>{spot.value}</b>
                            <p>{spot.note}</p>
                        </div>
                    ))}
                </div>
                <div className="v16TitleRow">
                    <h2>All Report Sections · Concise Summary</h2>
                    <i />
                </div>
                <div className="v16Sections">
                    {model.sections.map((section) => (
                        <section key={section.n} className={`v16Sec ${section.cls || ""}`}>
                            <div className="v16SecHead">
                                <span className="num">{section.n}</span>
                                <h3>{section.title}</h3>
                            </div>
                            <div className="v16SecBody">
                                <ul>
                                    {section.bullets.map((bullet, index) => (
                                        <li key={`${section.n}-${index}`}>{bullet}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
            <footer className="v16Footer">
                <div className="v16FootText">
                    <b>{verified ? model.badgeLabel : provisional ? `SYSTEM CII ${model.ciiScore}/100 · AWAITING FACULTY VERIFICATION` : "HOLD CII · REQUIRED CORRECTIONS"}</b>
                    {" · "}
                    Flashcard = concise summary of all nine V17 report areas. The Detailed Report remains the complete narrative and evidence record.
                </div>
                <span className="hold">
                    {verified
                        ? `Faculty-Verified CII ${model.ciiScore}/100`
                        : provisional
                          ? `System CII ${model.ciiScore}/100 · awaiting Faculty verification`
                          : "Required-field coverage currently incomplete"}
                </span>
            </footer>
        </article>
    );
}

function DetailedReport({ model }: { model: LockedV17PackageModel }) {
    return (
        <div className="reportWrap">
            <div className="reportHead">
                <h2>V17 Detailed Institutional Report</h2>
                <p>
                    Locked student-source record for {model.title}. CII is calculated mainly from this Detailed Report because it carries the complete section/sub-section narrative, source facts, evidence status and traceability. No student-source text is rewritten.
                </p>
            </div>
            {model.detailBlocks.map((block) => (
                <section key={block.n} className="flv17-detail-sec">
                    <h3>
                        {block.n} · {block.title}
                    </h3>
                    {block.body.length ? (
                        <ul>
                            {block.body.map((line, index) => (
                                <li key={`${block.n}-${index}`}>{line}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>Not provided in the locked submission.</p>
                    )}
                </section>
            ))}
        </div>
    );
}

function AssessmentLayer({ model }: { model: LockedV17PackageModel }) {
    return (
        <div>
            <div className="assessmentIntro">
                <b>Assessed Detailed Report.</b> The original student record is preserved exactly. After each section, the assessment layer explains the rubric that applies. In a CII-ready approved submission, HOLD states become section marks with reasoning, strengths, limitations and improvement guidance.
            </div>
            <DetailedReport model={model} />
            <div className="assessWrap">
                <div className="pageAssessmentLabel">CII assessment layer · outside the locked source</div>
                {model.assessment.map((row) => (
                    <article key={row.no} className="assessCard">
                        <div className="assessTop">
                            <div>
                                <span className="assessNo">{row.no}</span>
                                <strong>{row.name}</strong>
                            </div>
                            <div className="assessScore">
                                <b>{row.score === "HOLD" ? "HOLD" : `${row.score}/${row.max}`}</b>
                                <small>Max {row.max}</small>
                            </div>
                        </div>
                        <div className="finding">
                            <b>Why this score</b>
                            <p>{row.reason}</p>
                        </div>
                        <div className="threeCol">
                            <div className="fb good">
                                <b>Strengths</b>
                                <ul>
                                    {row.strengths.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="fb warn">
                                <b>Limitations</b>
                                <ul>
                                    {row.limits.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="fb improve">
                                <b>What would raise the score</b>
                                <ul>
                                    {(row.improvements.length ? row.improvements : ["Pending Analyzer / Faculty moderation."]).map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
            <div className="overallAssessment">
                <div className="overallHead">
                    <div>
                        <span>OVERALL SYSTEM ASSESSMENT</span>
                        <h2>{model.title}</h2>
                    </div>
                    <div className="ciiHold">
                        {model.ciiLocked ? `Faculty-Verified CII ${model.ciiScore}/100` : model.ciiScore != null ? `Provisional CII ${model.ciiScore}/100` : "CII HOLD"}
                        <small>System CII is provisional until Faculty approval</small>
                    </div>
                </div>
                <p>{model.overall}</p>
            </div>
        </div>
    );
}

export default function FacultyLockedV17Modal({
    reportId,
    onClose,
}: {
    reportId: string;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<TabId>("flashView");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        authenticatedFetch(`/api/v1/faculty/reports/${reportId}`)
            .then(async (response) => {
                if (!response?.ok) {
                    toast.error("Locked V17 package is not available for this report.");
                    return null;
                }
                return response.json();
            })
            .then((payload) => {
                if (cancelled) return;
                if (!payload) {
                    setLoadError(true);
                    return;
                }
                const rec = (payload.data || payload.report || payload) as Record<string, unknown>;
                if (!rec || typeof rec !== "object") {
                    setLoadError(true);
                    return;
                }
                setRaw(prepareReportForVerifyDossier(rec) as Record<string, unknown>);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError(true);
                    toast.error("Failed to open the locked V17 package.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [reportId]);

    const flash = useMemo(() => (raw ? coerceFlashReportData(raw) : null), [raw]);
    const model = useMemo(() => {
        if (!flash) return null;
        try {
            return buildLockedV17Package(flash, raw?.opportunity ?? raw);
        } catch {
            return null;
        }
    }, [flash, raw]);
    const cii = flash ? resolveReportCii(flash) : null;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
            document.body.classList.remove("flv17-print");
            const mount = document.getElementById("flv17-print-mount");
            if (mount) mount.innerHTML = "";
        };
    }, [onClose]);

    const printPackage = () => {
        const source = document.getElementById("flv17-print-root");
        if (!source) return;
        let mount = document.getElementById("flv17-print-mount");
        if (!mount) {
            mount = document.createElement("div");
            mount.id = "flv17-print-mount";
            document.body.appendChild(mount);
        }
        mount.innerHTML = source.innerHTML;
        document.body.classList.add("flv17-print");
        const cleanup = () => {
            if (!document.body.classList.contains("flv17-print") && !mount?.innerHTML) return;
            document.body.classList.remove("flv17-print");
            if (mount) mount.innerHTML = "";
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
        window.setTimeout(cleanup, 800);
    };

    if (!mounted) return null;

    return createPortal(
        <div className="flv17-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="flv17-title">
            <div className="flv17-modal">
                <div className="flv17-modal-top flv17-modal-chrome">
                    <button type="button" className="flv17-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                    <span className="pill">LOCKED STUDENT SUBMISSION</span>
                    <h3 id="flv17-title">V17 Flashcard + Detailed Report</h3>
                    <p>The student submission is shown in the same locked template received by Faculty. The System Assessment never rewrites this source record.</p>
                </div>
                <div className="flv17-modal-body" id="flv17-print-root">
                    <div className="flv17-lock-banner">
                        <b>Source of truth:</b> Flashcard + full Detailed Report. CII is calculated mainly from the Detailed Report because it carries the complete section/sub-section narrative, source facts, evidence status and traceability.
                        {cii?.source === "faculty_locked" ? ` Faculty-Verified CII ${cii.totalScore}/100.` : ""}
                    </div>
                    <div className="flv17">
                        <div className="shell">
                            <div className="topbar assessmentOnlyHide">
                                <div className="brand">
                                    <b>CIEL PK · Community Engagement</b>
                                    <span>Locked V17 outputs + Faculty/System assessment layer</span>
                                </div>
                                <div className="tabs">
                                    {TABS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`tab ${tab === item.id ? "on" : ""}`}
                                            onClick={() => setTab(item.id)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                    <button type="button" className="tab" onClick={printPackage}>
                                        Print Package
                                    </button>
                                </div>
                            </div>
                            <div className="locknote assessmentOnlyHide">{model?.lockNote || "Locked-source rule. The student submission is preserved exactly."}</div>
                            {loading ? (
                                <div className="flex min-h-[40vh] items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
                                </div>
                            ) : loadError || !model ? (
                                <div className="rounded-2xl border border-dashed border-[#d7e5e8] bg-white px-4 py-10 text-center">
                                    <p className="text-sm font-extrabold text-[#16313d]">Locked package could not be opened</p>
                                    <p className="mt-1 text-[12.5px] text-[#6b7c86]">The student record is unchanged. Close and try again from Reports for Review.</p>
                                    <button type="button" className="flv17-close" style={{ position: "static", marginTop: 12 }} onClick={onClose}>
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <section className={`view ${tab === "flashView" ? "on" : ""}`}>
                                        <V16Flashcard model={model} />
                                    </section>
                                    <section className={`view ${tab === "reportView" ? "on" : ""}`}>
                                        <DetailedReport model={model} />
                                    </section>
                                    <section className={`view ${tab === "assessedView" ? "on" : ""}`}>
                                        <AssessmentLayer model={model} />
                                    </section>
                                    <section className={`view ${tab === "badgeView" ? "on" : ""}`}>
                                        <div className="assessmentIntro">
                                            <b>Flashcard + recognition layer.</b> The Flashcard template itself is unchanged. CII and the Faculty-verified badge sit outside the locked Flashcard as an assessment/credential layer.
                                        </div>
                                        {model.ciiLocked ? (
                                            <div className="badgePanel verified">
                                                <div>
                                                    <b>CIEL PK CII RECOGNITION</b>
                                                    <span>Locked Flashcard now updated with the Faculty-Verified badge and score. The Detailed Report remains the assessment source.</span>
                                                </div>
                                                <div className="right">
                                                    <span className="chip">Faculty-Verified CII · {model.ciiScore}/100</span>
                                                    <span className="chip">{model.badgeLabel}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="badgePanel">
                                                <div>
                                                    <b>CIEL PK CII RECOGNITION</b>
                                                    <span>Assessment layer — displayed only after Faculty verification</span>
                                                </div>
                                                <div className="badgePending">
                                                    <b>{model.ciiScore != null ? `PROVISIONAL CII ${model.ciiScore}/100` : "BADGE PENDING"}</b>
                                                    <span>Badge will update on the flashcard once Faculty finalises the score</span>
                                                </div>
                                            </div>
                                        )}
                                        <V16Flashcard model={model} />
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
