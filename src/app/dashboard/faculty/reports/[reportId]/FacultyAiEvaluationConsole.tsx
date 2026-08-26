"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { prepareReportForVerifyDossier } from "@/utils/reportTeamScope";
import {
    buildFacultyActionBody,
    buildFacultyAiEvaluationModel,
    type FacultyDecisionKind,
    type FacultyEvidenceItem,
} from "./facultyAiEvaluation.helpers";
import "./faculty-ai-evaluation.css";

const PIPE = [
    { id: 0, label: "STUDENT COMPLETES 9 SECTIONS — FLASH CARD IS 10" },
    { id: 1, label: "SUMMARIES ACCUMULATE → FLASH CARD" },
    { id: 2, label: "SENT TO FACULTY" },
    { id: 3, label: "AI EVALUATOR v8.2 SCORES AUTOMATICALLY" },
    { id: 4, label: "FACULTY DECIDES" },
    { id: 5, label: "LIVE + PDF REPORT" },
];

const DIAL_CIRC = 2 * Math.PI * 52;

function pipeStage(hasAi: boolean, decision: FacultyDecisionKind): number {
    if (decision === "ap") return 5;
    if (decision === "cn" || decision === "ar") return 4;
    if (hasAi) return 4;
    return 3;
}

function pipeClass(index: number, current: number): string {
    if (index === current) return "fae-pst on";
    if (index < current) return "fae-pst done";
    return "fae-pst";
}

export default function FacultyAiEvaluationConsole() {
    const params = useParams();
    const reportId = String(params.reportId ?? "");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rawReport, setRawReport] = useState<Record<string, unknown> | null>(null);
    const [notes, setNotes] = useState("");
    const [lightbox, setLightbox] = useState<FacultyEvidenceItem | null>(null);

    const model = useMemo(
        () => (rawReport ? buildFacultyAiEvaluationModel(rawReport) : null),
        [rawReport],
    );

    useEffect(() => {
        void loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportId]);

    useEffect(() => {
        if (!model) return;
        if (model.facultyRemarks && !notes) {
            setNotes(
                model.facultyRemarks
                    .replace(/^\[Conditional badge\]\s*/i, "")
                    .replace(/^\[Admin review requested\]\s*/i, ""),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.facultyRemarks]);

    const loadReport = async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const response = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}`);
            if (!response?.ok) {
                toast.error("Report not available yet (admin approval may be pending)");
                setRawReport(null);
                return;
            }
            const data = await response.json();
            const raw = (data.data || data.report || data) as Record<string, unknown>;
            setRawReport(prepareReportForVerifyDossier(raw) as Record<string, unknown>);
        } catch {
            toast.error("Failed to load report");
            setRawReport(null);
        } finally {
            setLoading(false);
        }
    };

    const submitDecision = async (kind: Exclude<FacultyDecisionKind, "">) => {
        if (!reportId || saving) return;
        try {
            setSaving(true);
            const body = buildFacultyActionBody(kind, notes);
            const response = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!response?.ok) {
                const payload = response
                    ? await response.json().catch(() => ({}))
                    : {};
                toast.error(
                    (payload as { message?: string }).message || "Could not save faculty decision",
                );
                return;
            }
            toast.success(
                kind === "ap"
                    ? "Approved — faculty decision saved"
                    : kind === "cn"
                      ? "Conditional badge recorded"
                      : "Admin review requested",
            );
            await loadReport();
        } catch {
            toast.error("Could not save faculty decision");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fae">
                <div className="fae-wrap flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
                </div>
            </div>
        );
    }

    if (!model) {
        return (
            <div className="fae">
                <div className="fae-wrap">
                    <p className="fae-sub">Executive evaluation unavailable.</p>
                    <div className="fae-nav">
                        <Link href="/dashboard/faculty/reports">Back to student reports</Link>
                    </div>
                </div>
            </div>
        );
    }

    const stage = pipeStage(model.hasAiEvaluation, model.decision);
    const decided = Boolean(model.decision);
    const dashOffset =
        model.cii === null ? DIAL_CIRC : DIAL_CIRC * (1 - Math.min(100, Math.max(0, model.cii)) / 100);

    return (
        <div className="fae">
            <div className="fae-wrap fae-screen">
                <div className="fae-logo">
                    CIEL <span>PK</span> · AI Evaluation Mechanism{" "}
                    <span className="fae-vtag" style={{ marginLeft: 6 }}>
                        EVALUATOR {model.frameworkVersion} · RECOGNITION-FIRST
                    </span>
                </div>
                <div className="fae-sub">
                    Section banners → flash card → faculty review → stored AI score (CII + badge) →
                    approval → PDF. Scoring is not recalculated here.
                </div>
                <div className="fae-nav">
                    <Link href="/dashboard/faculty/reports">Back to student reports</Link>
                    <Link href={`/dashboard/faculty/reports/${reportId}?view=dossier`}>
                        Open full dossier
                    </Link>
                </div>

                <div className="fae-pipe">
                    {PIPE.map((step) => (
                        <div key={step.id} className={pipeClass(step.id, stage)}>
                            {step.label}
                        </div>
                    ))}
                </div>

                <div className="fae-cols">
                    <div className="fae-card" style={{ padding: 0, overflow: "hidden" }}>
                        <div className="fae-fc">
                            <div className="fae-fch">
                                <span className="fae-rb">FLASH CARD · IN FACULTY INBOX</span>
                                <h1>{model.title}</h1>
                                <div className="m">
                                    {model.studentsLine}
                                    {model.university ? ` · ${model.university}` : ""}
                                    {model.discipline ? ` · ${model.discipline}` : ""}
                                    {model.partnerLine ? ` · ${model.partnerLine}` : ""}
                                    {model.timelineLine ? ` · ${model.timelineLine}` : ""}
                                </div>
                                {model.sdgs.length > 0 ? (
                                    <div className="fae-sdgrow">
                                        {model.sdgs.map((sdg) => (
                                            <span
                                                key={`${sdg.goalNumber}-${sdg.label}`}
                                                className="fae-sdgc"
                                                style={{ background: sdg.color }}
                                            >
                                                {sdg.primary ? "★ " : ""}
                                                {sdg.label}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <div className="fae-fstats">
                                <div className="fae-fs">
                                    <div className="v">{model.hoursLabel}</div>
                                    <div className="kk">VERIFIED HOURS</div>
                                </div>
                                <div className="fae-fs">
                                    <div className="v">{model.reachedLabel}</div>
                                    <div className="kk">REACHED</div>
                                </div>
                                <div className="fae-fs">
                                    <div className="v">{model.attendanceLabel}</div>
                                    <div className="kk">ATTENDANCE</div>
                                </div>
                                <div className="fae-fs">
                                    <div className="v">{model.evidenceCount}</div>
                                    <div className="kk">EVIDENCE FILES</div>
                                </div>
                            </div>
                            <div className="fae-fbody">
                                <div className="fae-k">EVIDENCE — TAP TO ENLARGE</div>
                                {model.evidence.length ? (
                                    <div className="fae-gal" style={{ marginTop: 8 }}>
                                        {model.evidence.map((item) => (
                                            <button
                                                key={item.url}
                                                type="button"
                                                className="fae-ph"
                                                onClick={() => setLightbox(item)}
                                                title={item.label}
                                            >
                                                {item.isImage ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={item.url} alt={item.label} />
                                                ) : (
                                                    item.ext
                                                )}
                                                <span className="b">{item.ext}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="fae-sub" style={{ marginTop: 8 }}>
                                        No evidence files attached to this report.
                                    </p>
                                )}
                                <div className="fae-dq">{model.aiQuote}</div>
                            </div>
                        </div>
                    </div>
                    <div className="fae-card">
                        <div className="fae-k">PROJECT DETAIL · HOW EACH SECTION FED THIS CARD</div>
                        <p style={{ fontSize: 10.5, color: "#3c5a5c", lineHeight: 1.8, marginTop: 7 }}>
                            Every section summary already stored on this report accumulates into
                            the flash card. The AI Evaluator on the right reads the same flash-card
                            CII record — scores are not rewritten on this screen.
                        </p>
                        {model.sectionBanners.length ? (
                            <ul className="fae-acts" style={{ marginTop: 8 }}>
                                {model.sectionBanners.map((row) => (
                                    <li key={`${row.label}-${row.n}`}>
                                        <b>S{row.label}:</b> {row.text}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>

                    <div>
                        <div className="fae-card">
                            <div className="fae-aihdr">
                                <span className="fae-ic">AI</span>
                                <span>
                                    <span className="fae-t1">CIEL PK AI Evaluator</span>
                                    <br />
                                    <span className="fae-t2">
                                        COMPOSITE IMPACT INDEX · 9 FORM SECTIONS + FLASH CARD · 7 BADGE LEVELS
                                    </span>
                                </span>
                                <span className="fae-vtag">{model.frameworkVersion}</span>
                            </div>

                            {model.hasAiEvaluation ? (
                                <>
                                    <div className="fae-scorebox">
                                        <div className="fae-dial">
                                            <svg width="120" height="120">
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="52"
                                                    fill="none"
                                                    stroke="#e8f2f0"
                                                    strokeWidth="10"
                                                />
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="52"
                                                    fill="none"
                                                    stroke="url(#faeGr)"
                                                    strokeWidth="10"
                                                    strokeLinecap="round"
                                                    strokeDasharray={DIAL_CIRC}
                                                    strokeDashoffset={dashOffset}
                                                />
                                                <defs>
                                                    <linearGradient id="faeGr">
                                                        <stop offset="0%" stopColor="#0e5f63" />
                                                        <stop offset="100%" stopColor="#2dd4bf" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="fae-dv">
                                                <span className="fae-dn">
                                                    {model.cii !== null ? Math.round(model.cii) : "—"}
                                                </span>
                                                <span className="fae-dk">CII / {model.ciiMax}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="fae-blvl">
                                                {model.levelName}
                                                {model.cii !== null ? ` · CII ${Math.round(model.cii)}` : ""}
                                            </span>
                                            <div className="fae-btitle">{model.levelTitle}</div>
                                            {model.certificateLine ? (
                                                <div className="fae-bcert">“{model.certificateLine}”</div>
                                            ) : null}
                                            <span className="fae-bready">{model.readiness}</span>
                                        </div>
                                    </div>

                                    <div className="fae-idx">
                                        {model.indices.map((item) => (
                                            <div key={item.label} className="fae-ix">
                                                <div className="v">{item.value}</div>
                                                <div className="kk">{item.label.toUpperCase()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="fae-bsec">
                                        SECTION SCORES — STORED EVALUATION (RECOGNITION-FIRST)
                                    </div>
                                    {model.sections.map((row) => {
                                        const pct =
                                            row.score !== null && row.weight
                                                ? Math.min(100, (row.score / row.weight) * 100)
                                                : 0;
                                        const anc = row.anchor !== null ? Math.round(row.anchor) : null;
                                        return (
                                            <div key={row.n} className="fae-strow">
                                                <b>{row.n}</b>
                                                <span className="nm">
                                                    {row.name}{" "}
                                                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                                                        · w{row.weight}
                                                    </span>
                                                </span>
                                                <span
                                                    className={
                                                        anc !== null ? `fae-anc fae-anc${anc}` : "fae-anc fae-anc4"
                                                    }
                                                >
                                                    {anc !== null ? `A${anc}` : "—"}
                                                </span>
                                                <span className="fae-bar">
                                                    <i style={{ width: `${pct}%` }} />
                                                </span>
                                                <span className="fae-sv">
                                                    {row.score !== null ? row.score : "—"}
                                                </span>
                                                {row.comment ? <span className="cm">{row.comment}</span> : null}
                                            </div>
                                        );
                                    })}

                                    <div className="fae-bsec">BONUSES (MAX +5) · RED FLAGS</div>
                                    <div className="fae-mrow">
                                        {model.bonusesFlags.length ? (
                                            model.bonusesFlags.map((item, idx) => (
                                                <span
                                                    key={`${item.kind}-${idx}`}
                                                    className={item.kind === "flag" ? "fae-mtag g" : "fae-mtag"}
                                                >
                                                    {item.kind === "flag" ? "Flag · " : "Bonus · "}
                                                    {item.label}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="fae-mtag">None recorded on this evaluation</span>
                                        )}
                                    </div>

                                    <div className="fae-bsec">STUDENT-FACING FEEDBACK</div>
                                    <div className="fae-fb">
                                        {model.studentFeedbackHtmlParts.length
                                            ? model.studentFeedbackHtmlParts.map((part) => (
                                                  <p key={part.slice(0, 24)} style={{ marginBottom: 8 }}>
                                                      {part}
                                                  </p>
                                              ))
                                            : "No student-facing narrative stored yet."}
                                    </div>
                                    <div className="fae-bsec">FIVE IMPROVEMENT ACTIONS</div>
                                    {model.actions.length ? (
                                        <ul className="fae-acts">
                                            {model.actions.map((action) => (
                                                <li key={action}>{action}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="fae-sub">No improvement actions stored.</p>
                                    )}
                                </>
                            ) : (
                                <p className="fae-sub" style={{ marginTop: 12 }}>
                                    This report does not yet have a stored flash-card / CII evaluation.
                                    Open the full dossier to review the ten sections. Faculty can still
                                    record a decision below.
                                </p>
                            )}

                            <div className="fae-bsec">FACULTY DECISION — THE AI RECOMMENDS, THE FACULTY DECIDES</div>
                            <textarea
                                className="fae-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional remarks (required context for conditional badge or admin review)"
                                disabled={saving}
                            />
                            <div className="fae-dec">
                                <button
                                    type="button"
                                    className={`fae-db ap${model.decision === "ap" ? " sel" : ""}`}
                                    disabled={saving || decided}
                                    onClick={() => void submitDecision("ap")}
                                >
                                    Approve & issue badge
                                    <br />
                                    <span style={{ fontWeight: 600, fontSize: 9 }}>
                                        Uses existing faculty approve action
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`fae-db cn${model.decision === "cn" ? " sel" : ""}`}
                                    disabled={saving || decided}
                                    onClick={() => void submitDecision("cn")}
                                >
                                    Conditional badge
                                    <br />
                                    <span style={{ fontWeight: 600, fontSize: 9 }}>
                                        Approve with remarks
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`fae-db ar${model.decision === "ar" ? " sel" : ""}`}
                                    disabled={saving || decided}
                                    onClick={() => void submitDecision("ar")}
                                >
                                    Admin review
                                    <br />
                                    <span style={{ fontWeight: 600, fontSize: 9 }}>
                                        Existing faculty reject action
                                    </span>
                                </button>
                            </div>

                            {model.decision === "ap" ? (
                                <div className="fae-livebar">
                                    <b style={{ fontSize: 12, color: "var(--teal)" }}>
                                        APPROVED — faculty decision saved on this report
                                    </b>
                                    <div className="fae-dash">
                                        <span className="fae-dchip">STUDENT</span>
                                        <span className="fae-dchip">FACULTY</span>
                                        <span className="fae-dchip">UNIVERSITY</span>
                                        <span className="fae-dchip">CIEL PK</span>
                                    </div>
                                    <button type="button" className="fae-pdfbtn" onClick={() => window.print()}>
                                        Download PDF report
                                    </button>
                                </div>
                            ) : null}
                            {model.decision === "cn" || model.decision === "ar" ? (
                                <button
                                    type="button"
                                    className="fae-pdfbtn"
                                    onClick={() => window.print()}
                                    style={{ marginTop: 12 }}
                                >
                                    Download PDF report
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`fae-modal${lightbox ? " on" : ""}`}
                onClick={() => setLightbox(null)}
                role="presentation"
            >
                {lightbox ? (
                    <div className="fae-lbimg" onClick={(e) => e.stopPropagation()}>
                        {lightbox.isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={lightbox.url} alt={lightbox.label} />
                        ) : (
                            <div style={{ padding: 28, color: "#fff", fontWeight: 800 }}>{lightbox.label}</div>
                        )}
                        <span className="cap">
                            {lightbox.label} · {lightbox.ext} · tap outside to close
                        </span>
                    </div>
                ) : null}
            </div>

            <div className="fae-print">
                <h1>CIEL PK · Community Engagement Evaluation Report</h1>
                <div style={{ fontSize: 10, color: "#555" }}>
                    AI Evaluator {model.frameworkVersion} · Recognition-First · Generated{" "}
                    {new Date().toLocaleDateString()}
                </div>
                <h2>A · Executive Summary</h2>
                <p>
                    <b>Students:</b> {model.studentsLine}
                    {model.university ? ` (${model.university}` : ""}
                    {model.discipline ? `, ${model.discipline}` : ""}
                    {model.university ? ")" : ""} · <b>Project:</b> {model.title} · <b>Partner:</b>{" "}
                    {model.partnerLine}
                </p>
                <p>
                    <b>CII Score:</b> {model.cii !== null ? `${Math.round(model.cii)}/${model.ciiMax}` : "—"} ·{" "}
                    <b>Badge:</b> {model.levelName} — {model.levelTitle} · <b>Readiness:</b> {model.readiness}
                </p>
                {model.certificateLine ? <div className="pquote">{model.certificateLine}</div> : null}
                <h2>B · Final Score Table</h2>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Section</th>
                            <th>Weight</th>
                            <th>Anchor</th>
                            <th>Score</th>
                            <th>Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {model.sections.map((row) => (
                            <tr key={row.n}>
                                <td>{row.n}</td>
                                <td>{row.name}</td>
                                <td>{row.weight}</td>
                                <td>{row.anchor ?? "—"}</td>
                                <td>{row.score ?? "—"}</td>
                                <td>{row.comment || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h2>C · Quality & Quantity Profile</h2>
                <table>
                    <thead>
                        <tr>
                            {model.indices.map((item) => (
                                <th key={item.label}>{item.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {model.indices.map((item) => (
                                <td key={`${item.label}-v`}>{item.value}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                <h2>D · Bonuses & Red Flags</h2>
                <ul>
                    {model.bonusesFlags.map((item, idx) => (
                        <li key={`${item.kind}-${idx}`}>
                            {item.kind === "bonus" ? "Bonus" : "Flag"} — {item.label}
                        </li>
                    ))}
                </ul>
                <h2>E · Student Feedback & Five Actions</h2>
                {model.studentFeedbackHtmlParts.map((part) => (
                    <div key={part.slice(0, 20)} className="pquote">
                        {part}
                    </div>
                ))}
                <ol>
                    {model.actions.map((action) => (
                        <li key={action}>{action}</li>
                    ))}
                </ol>
                <h2>F · Certification</h2>
                <p>
                    {model.levelName} — <b>{model.levelTitle}</b>
                    {model.decision === "ap" ? ". Approved by faculty." : "."}
                </p>
                <p style={{ marginTop: 18, fontSize: 9, color: "#777" }}>
                    CIEL PK · This report uses the stored CIEL PK AI Evaluator record. CII is not
                    recalculated on the faculty console.
                </p>
            </div>
        </div>
    );
}
