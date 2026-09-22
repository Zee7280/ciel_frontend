"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
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

/** AI Analysis status for auto-trigger feature */
type AiAnalysisStatus = "idle" | "running" | "complete" | "error";

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
    // Phase 1: Auto-trigger AI analysis states
    const [aiAnalysisStatus, setAiAnalysisStatus] = useState<AiAnalysisStatus>("idle");
    const [aiAnalysisProgress, setAiAnalysisProgress] = useState(0);
    // Phase 2: Faculty Override states
    const [facultyAdjustedScore, setFacultyAdjustedScore] = useState<number | null>(null);
    const [scoreAdjustmentReason, setScoreAdjustmentReason] = useState("");
    const [showScoreOverride, setShowScoreOverride] = useState(false);
    // Phase 4: Independent AI Analysis states
    const [independentAnalysisRunning, setIndependentAnalysisRunning] = useState(false);
    const [showIndependentAnalyses, setShowIndependentAnalyses] = useState(false);

    const model = useMemo(
        () => (rawReport ? buildFacultyAiEvaluationModel(rawReport) : null),
        [rawReport],
    );

    // Check if CII v2 analysis exists on the report
    const hasCiiV2Analysis = useMemo(() => {
        if (!rawReport) return false;
        const ciiV2 = rawReport.ciiV2 as Record<string, unknown> | null | undefined;
        return Boolean(ciiV2 && typeof ciiV2 === "object" && Object.keys(ciiV2).length > 0);
    }, [rawReport]);

    // Phase 2: Computed values for faculty override
    const aiRecommendedScore = model?.cii ?? null;
    const effectiveScore = facultyAdjustedScore ?? aiRecommendedScore;
    const scoreWasAdjusted =
        facultyAdjustedScore !== null &&
        aiRecommendedScore !== null &&
        Math.round(facultyAdjustedScore) !== Math.round(aiRecommendedScore);
    const missingAdjustmentReason = scoreWasAdjusted && !scoreAdjustmentReason.trim();

    // Phase 4: Get independent analyses from rawReport
    const independentAnalyses = useMemo(() => {
        if (!rawReport) return [];
        const analyses = rawReport.independentAiAnalyses as Array<{
            id: string;
            runAt: string;
            runByUserId: string;
            runByRole: string;
            runByName?: string;
            score: number;
            level?: { level: number; name: string; quality: string };
            note?: string;
        }> | null | undefined;
        return analyses || [];
    }, [rawReport]);

    // Phase 4: Check if report is locked (approved)
    const isReportLocked = useMemo(() => {
        if (!rawReport) return false;
        const lock = rawReport.ciiV2Lock as { locked?: boolean } | null | undefined;
        return Boolean(lock?.locked);
    }, [rawReport]);

    const loadReport = useCallback(async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const response = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}`);
            if (!response?.ok) {
                toast.error("This report is not assigned to you, or the student has not submitted it yet.");
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
    }, [reportId]);

    // Auto-trigger AI analysis when report loads without existing analysis
    const runAutoAiAnalysis = useCallback(async () => {
        if (!reportId || aiAnalysisStatus === "running") return;
        
        setAiAnalysisStatus("running");
        setAiAnalysisProgress(0);
        
        // Simulate progress while AI runs (actual API call takes time)
        const progressInterval = setInterval(() => {
            setAiAnalysisProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 800);

        try {
            const response = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/cii-v2/analyse`, {
                method: "POST",
            });
            
            clearInterval(progressInterval);
            
            if (!response?.ok) {
                const errData = await response?.json().catch(() => ({}));
                const msg = (errData as { message?: string })?.message || "AI analysis failed";
                toast.error(msg);
                setAiAnalysisStatus("error");
                return;
            }

            setAiAnalysisProgress(100);
            setAiAnalysisStatus("complete");
            toast.success("AI Analysis complete");
            
            // Reload report to get the new analysis
            await loadReport();
        } catch {
            clearInterval(progressInterval);
            toast.error("AI analysis failed — please try again");
            setAiAnalysisStatus("error");
        }
    }, [reportId, aiAnalysisStatus, loadReport]);

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

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

    // Phase 1: Auto-trigger AI analysis if report loaded but no analysis exists
    useEffect(() => {
        if (
            !loading &&
            rawReport &&
            !hasCiiV2Analysis &&
            !model?.hasAiEvaluation &&
            aiAnalysisStatus === "idle" &&
            model?.decision !== "ap" // Don't auto-run if already approved
        ) {
            // Small delay to let user see the interface before analysis starts
            const timer = setTimeout(() => {
                void runAutoAiAnalysis();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [loading, rawReport, hasCiiV2Analysis, model?.hasAiEvaluation, model?.decision, aiAnalysisStatus, runAutoAiAnalysis]);

    const submitDecision = async (kind: Exclude<FacultyDecisionKind, "">) => {
        if (!reportId || saving) return;

        // Phase 2: Validate score adjustment reason
        if (kind === "ap" && missingAdjustmentReason) {
            toast.error("Please provide a reason for the score adjustment");
            return;
        }

        try {
            setSaving(true);

            // Phase 2: For approval with CII v2 analysis, use the dedicated approve endpoint
            if (kind === "ap" && hasCiiV2Analysis) {
                const approveBody: Record<string, unknown> = {
                    note: notes.trim() || undefined,
                };

                // Include faculty adjustment if score was changed
                if (scoreWasAdjusted && facultyAdjustedScore !== null) {
                    approveBody.facultyAdjustedScore = facultyAdjustedScore;
                    approveBody.scoreAdjustmentReason = scoreAdjustmentReason.trim();
                }

                const approveResponse = await authenticatedFetch(
                    `/api/v1/faculty/reports/${reportId}/cii-v2/approve`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(approveBody),
                    },
                );

                if (!approveResponse?.ok) {
                    const errPayload = await approveResponse?.json().catch(() => ({}));
                    toast.error(
                        (errPayload as { message?: string }).message || "Could not approve CII score",
                    );
                    return;
                }

                toast.success(
                    scoreWasAdjusted
                        ? "Approved with faculty-adjusted score — audit trail saved"
                        : "Approved — AI analysis & score locked",
                );
                await loadReport();
                return;
            }

            // Fallback: Use the legacy action endpoint for non-CII reports or reject/conditional
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

    /**
     * Phase 4: Run Independent AI Analysis on an approved report.
     * 
     * This does NOT overwrite the faculty-approved score.
     * Results are stored separately for audit purposes.
     */
    const runIndependentAnalysis = async () => {
        if (!reportId || independentAnalysisRunning || !isReportLocked) return;

        try {
            setIndependentAnalysisRunning(true);
            const response = await authenticatedFetch(
                `/api/v1/impact-wall/reports/${reportId}/independent-analysis`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note: "Additional analysis run from Faculty Dashboard" }),
                },
            );

            if (!response?.ok) {
                const err = await response?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to run independent analysis");
                return;
            }

            const result = await response.json();
            toast.success(`Independent analysis complete — Score: ${Math.round(result.data?.analysis?.score ?? 0)}`);
            await loadReport();
            setShowIndependentAnalyses(true);
        } catch {
            toast.error("Failed to run independent analysis");
        } finally {
            setIndependentAnalysisRunning(false);
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
                    <Link href={`/dashboard/faculty/reports/${reportId}?view=cii-v2`}>
                        Open CII v2 Analyser
                    </Link>
                    {(() => {
                        const projectId = String(
                            rawReport?.projectId || rawReport?.project_id || rawReport?.opportunityId || "",
                        ).trim();
                        if (!projectId) return null;
                        return (
                            <Link href={`/dashboard/faculty/attendance-review?projectId=${encodeURIComponent(projectId)}`}>
                                Review attendance
                            </Link>
                        );
                    })()}
                </div>

                <div className="fae-pipe">
                    {PIPE.map((step) => (
                        <div key={step.id} className={pipeClass(step.id, stage)}>
                            {step.label}
                        </div>
                    ))}
                </div>

                {/* Phase 1: Clear Two-Column Layout — Flash Card | AI Analysis & Score */}
                <div className="fae-two-col">
                    {/* ═══════════════════════════════════════════════════════════════════
                        LEFT COLUMN: Student Impact Flash Card
                    ═══════════════════════════════════════════════════════════════════ */}
                    <div className="fae-col-left">
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

                        {/* Section summaries collapsed under Flash Card */}
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
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════════
                        RIGHT COLUMN: AI Analysis & Score Panel
                    ═══════════════════════════════════════════════════════════════════ */}
                    <div className="fae-col-right">
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

                            {/* Phase 1: "AI Analysis in Progress" state when auto-running */}
                            {aiAnalysisStatus === "running" && (
                                <div className="fae-ai-progress">
                                    <div className="fae-ai-progress-inner">
                                        <div className="fae-ai-progress-icon">
                                            <Sparkles className="h-8 w-8 animate-pulse text-violet-500" />
                                        </div>
                                        <h3 className="fae-ai-progress-title">AI Analysis in Progress…</h3>
                                        <p className="fae-ai-progress-sub">
                                            The AI Evaluator is automatically analyzing the Flash Card and report sections.
                                            This panel will populate with scores and feedback momentarily.
                                        </p>
                                        <div className="fae-ai-progress-bar">
                                            <div
                                                className="fae-ai-progress-fill"
                                                style={{ width: `${Math.min(95, aiAnalysisProgress)}%` }}
                                            />
                                        </div>
                                        <span className="fae-ai-progress-pct">
                                            {Math.round(Math.min(95, aiAnalysisProgress))}% — analyzing report…
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* AI Analysis Error State - show retry option */}
                            {aiAnalysisStatus === "error" && !model.hasAiEvaluation && (
                                <div className="fae-ai-error">
                                    <p className="fae-ai-error-text">
                                        AI Analysis encountered an issue. You can retry or proceed with manual review.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAiAnalysisStatus("idle");
                                            void runAutoAiAnalysis();
                                        }}
                                        className="fae-retry-btn"
                                    >
                                        ↻ Retry AI Analysis
                                    </button>
                                </div>
                            )}

                            {model.hasAiEvaluation && aiAnalysisStatus !== "running" ? (
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

                                    {/* Phase 2: Faculty Score Override Section */}
                                    {!decided && (
                                        <div className="fae-score-override">
                                            <div className="fae-score-override-header">
                                                <button
                                                    type="button"
                                                    className="fae-score-override-toggle"
                                                    onClick={() => setShowScoreOverride(!showScoreOverride)}
                                                >
                                                    {showScoreOverride ? "▼" : "▶"} Faculty Score Adjustment
                                                </button>
                                                {scoreWasAdjusted && (
                                                    <span className="fae-score-adjusted-badge">
                                                        AI {Math.round(aiRecommendedScore ?? 0)} → Faculty{" "}
                                                        {Math.round(facultyAdjustedScore ?? 0)}
                                                    </span>
                                                )}
                                            </div>

                                            {showScoreOverride && (
                                                <div className="fae-score-override-body">
                                                    <p className="fae-score-override-note">
                                                        Faculty can adjust the AI-recommended score. Both scores are
                                                        preserved in the audit trail: <b>AI Recommended Score → Faculty
                                                        Approved Score</b>
                                                    </p>
                                                    <div className="fae-score-override-row">
                                                        <label className="fae-score-override-label">
                                                            AI Recommended Score
                                                        </label>
                                                        <span className="fae-score-override-value fae-score-ai">
                                                            {aiRecommendedScore !== null
                                                                ? Math.round(aiRecommendedScore)
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                    <div className="fae-score-override-row">
                                                        <label
                                                            htmlFor="facultyScore"
                                                            className="fae-score-override-label"
                                                        >
                                                            Faculty Approved Score
                                                        </label>
                                                        <input
                                                            id="facultyScore"
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={facultyAdjustedScore ?? aiRecommendedScore ?? ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === "") {
                                                                    setFacultyAdjustedScore(null);
                                                                } else {
                                                                    setFacultyAdjustedScore(
                                                                        Math.min(100, Math.max(0, Number(val))),
                                                                    );
                                                                }
                                                            }}
                                                            className="fae-score-override-input"
                                                        />
                                                    </div>
                                                    {scoreWasAdjusted && (
                                                        <div className="fae-score-override-reason">
                                                            <label
                                                                htmlFor="scoreReason"
                                                                className="fae-score-override-label"
                                                            >
                                                                Reason for Adjustment{" "}
                                                                <span className="fae-required">*</span>
                                                            </label>
                                                            <textarea
                                                                id="scoreReason"
                                                                value={scoreAdjustmentReason}
                                                                onChange={(e) =>
                                                                    setScoreAdjustmentReason(e.target.value)
                                                                }
                                                                placeholder="Required: explain why you adjusted the AI-recommended score…"
                                                                className="fae-score-override-textarea"
                                                            />
                                                            {missingAdjustmentReason && (
                                                                <p className="fae-score-override-error">
                                                                    A reason is required when adjusting the score
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFacultyAdjustedScore(null);
                                                            setScoreAdjustmentReason("");
                                                        }}
                                                        className="fae-score-override-reset"
                                                    >
                                                        ↺ Reset to AI Score
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                            ) : aiAnalysisStatus === "idle" ? (
                                <div className="fae-no-eval">
                                    <p className="fae-sub" style={{ marginTop: 12 }}>
                                        This report does not yet have a stored AI evaluation.
                                        The AI Analyzer will run automatically, or you can proceed with manual review.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void runAutoAiAnalysis()}
                                        className="fae-manual-run-btn"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Run AI Analysis Now
                                    </button>
                                </div>
                            ) : null}

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
                                    disabled={saving || decided || aiAnalysisStatus === "running" || missingAdjustmentReason}
                                    onClick={() => void submitDecision("ap")}
                                >
                                    ✓ Approve AI Analysis &amp; Score
                                    <br />
                                    <span style={{ fontWeight: 600, fontSize: 9 }}>
                                        {scoreWasAdjusted
                                            ? `AI ${Math.round(aiRecommendedScore ?? 0)} → Faculty ${Math.round(facultyAdjustedScore ?? 0)}`
                                            : "One-click approval — locks the record"}
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

                                    {/* Phase 4: Independent AI Analysis Section for Approved Reports */}
                                    <div className="fae-independent-section" style={{ marginTop: 16 }}>
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            justifyContent: "space-between",
                                            borderTop: "1px solid #d5eee8",
                                            paddingTop: 12,
                                            marginTop: 12,
                                        }}>
                                            <span style={{ fontSize: 10, fontWeight: 900, color: "#8b7355", textTransform: "uppercase" }}>
                                                Additional AI Analyses (Do Not Override Approved Score)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={runIndependentAnalysis}
                                                disabled={independentAnalysisRunning}
                                                style={{
                                                    background: independentAnalysisRunning ? "#ccc" : "#f5eee0",
                                                    border: "1px solid #e8dcc8",
                                                    borderRadius: 8,
                                                    padding: "6px 12px",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: "#5a4832",
                                                    cursor: independentAnalysisRunning ? "not-allowed" : "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                {independentAnalysisRunning ? (
                                                    <>
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Running…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="h-3 w-3" />
                                                        Run AI Analysis
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {independentAnalyses.length > 0 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowIndependentAnalyses(!showIndependentAnalyses)}
                                                    style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        fontSize: 10,
                                                        color: "#5a4832",
                                                        cursor: "pointer",
                                                        marginTop: 8,
                                                        textDecoration: "underline",
                                                    }}
                                                >
                                                    {showIndependentAnalyses ? "Hide" : "Show"} {independentAnalyses.length} independent {independentAnalyses.length === 1 ? "analysis" : "analyses"}
                                                </button>

                                                {showIndependentAnalyses && (
                                                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                                                        {independentAnalyses.map((ia) => (
                                                            <div
                                                                key={ia.id}
                                                                style={{
                                                                    background: "#fff",
                                                                    border: "1px solid #e8dcc8",
                                                                    borderRadius: 10,
                                                                    padding: 12,
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    alignItems: "center",
                                                                }}
                                                            >
                                                                <div>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#5a4832" }}>
                                                                        Score: {Math.round(ia.score)}
                                                                        {ia.level?.name && (
                                                                            <span style={{ marginLeft: 8, fontSize: 10, color: "#8b7355" }}>
                                                                                ({ia.level.name})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: 9, color: "#8b7355", marginTop: 2 }}>
                                                                        Run by {ia.runByName || ia.runByRole} on{" "}
                                                                        {new Date(ia.runAt).toLocaleDateString()}
                                                                    </div>
                                                                    {ia.note && (
                                                                        <div style={{ fontSize: 9, color: "#6b5b3f", fontStyle: "italic", marginTop: 4 }}>
                                                                            {ia.note}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    background: "#f5eee0",
                                                                    borderRadius: 20,
                                                                    padding: "4px 10px",
                                                                    fontSize: 8,
                                                                    fontWeight: 900,
                                                                    color: "#8b7355",
                                                                }}>
                                                                    INDEPENDENT
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <p style={{ fontSize: 9, color: "#8b7355", marginTop: 10 }}>
                                            Independent analyses are for reference only. The faculty-approved score ({Math.round(model.cii ?? 0)}) remains the official record.
                                        </p>
                                    </div>
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
