"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import {
    CII_V45_ANCHOR_FACTORS,
    CII_V45_ANCHOR_NAMES,
    CII_V45_DIMENSIONS,
    criterionLabel,
    type CiiV45Badge,
    type CiiV45Lock,
    type CiiV45Result,
} from "@/utils/communityCiiAnalyser";
import { pickCiiV45DisplayScore } from "@/utils/reportCiiSnapshot";
import { sumNonRejectedLoggedHours } from "@/app/dashboard/student/report/utils/engagementMetrics";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { resolveImpactPackagePacketIntegrity } from "@/app/dashboard/student/report/impact-package/impactPackagePacket";
import "./community-cii-analyser.css";

const TEAL = "#0e7d74";
/** Nest CII OpenAI call is 120s, plus one empty-content retry (120s). BFF maxDuration is 300s. */
const ANALYSE_TIMEOUT_MS = 300_000;

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function pickNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value.replace(/,/g, "").trim());
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function reportHours(report: Record<string, unknown>): number {
    const s1 = asRecord(report.section1);
    const metrics = asRecord(s1.metrics);
    const metricHours = pickNumber(metrics.total_verified_hours);
    const logs = asArray(s1.attendance_logs);
    const logHours = sumNonRejectedLoggedHours(
        logs.map((log) => {
            const row = asRecord(log);
            return {
                date: String(row.date || ""),
                hours: pickNumber(row.hours),
                start_time: typeof row.start_time === "string" ? row.start_time : undefined,
                end_time: typeof row.end_time === "string" ? row.end_time : undefined,
                approval_status: typeof row.approval_status === "string" ? row.approval_status : null,
            };
        }),
    );
    const rosterHours =
        pickNumber(asRecord(s1.team_lead).hours) +
        asArray(s1.team_members).reduce((sum: number, member) => sum + pickNumber(asRecord(member).hours), 0);
    const individualHours = asArray(metrics.individual_metrics).reduce(
        (sum: number, row) => sum + pickNumber(asRecord(row).individual_hours),
        0,
    );
    if (metricHours > 0) return metricHours;
    if (logHours > 0) return logHours;
    if (individualHours > 0) return individualHours;
    return rosterHours;
}

function evidenceCount(report: Record<string, unknown>): number {
    const keys = ["section1", "section2", "section3", "section4", "section5", "section6", "section7", "section8", "section9", "section10"];
    let files = 0;
    for (const key of keys) {
        const section = asRecord(report[key]);
        if (Array.isArray(section.media_urls)) files += section.media_urls.length;
        if (Array.isArray(section.evidence_files)) files += section.evidence_files.length;
    }
    if (Array.isArray(report.evidence_urls)) files += report.evidence_urls.length;
    const logs = Array.isArray(asRecord(report.section1).attendance_logs)
        ? (asRecord(report.section1).attendance_logs as unknown[])
        : [];
    const logEvidence = logs.filter((log) => {
        const row = asRecord(log);
        return Boolean(row.evidence_file || (typeof row.evidence_url === "string" && row.evidence_url.trim()));
    }).length;
    return Math.max(files, logEvidence);
}

function outcomeCount(report: Record<string, unknown>): number {
    const s5 = asRecord(report.section5);
    const rows = Array.isArray(s5.measurable_outcomes) ? s5.measurable_outcomes : [];
    return rows.filter((row) => {
        const rec = asRecord(row);
        return String(rec.metric || rec.outcome_area || "").trim() && (rec.baseline || rec.endline);
    }).length;
}

function sessionCount(report: Record<string, unknown>): number {
    const logs = Array.isArray(asRecord(report.section1).attendance_logs)
        ? (asRecord(report.section1).attendance_logs as unknown[])
        : [];
    return logs.length;
}

function partnerCount(report: Record<string, unknown>): number {
    const partners = asRecord(report.section7).partners;
    return Array.isArray(partners) ? partners.length : 0;
}

const DIM7 = CII_V45_DIMENSIONS.find((d) => d.id === "7")!;

function evidenceAssessmentPending(stored: CiiV45Result | null): boolean {
    if (!stored) return false;
    return stored.adminEvidenceAssessment?.status === "PENDING" || stored.scoreStatus === "ADMIN_EVIDENCE_REQUIRED";
}

/** Hard stops only — already locked, or no score to publish. Analysis flags are warnings. */
function approveHardBlock(
    stored: CiiV45Result | null,
    lock: CiiV45Lock | null,
    locked: boolean,
    _dim7Complete: boolean,
): string | null {
    if (locked) return "This report's CII v4.5 score is already locked.";
    if (!stored) return "Run the CII v4.5 analysis before approving.";
    return null;
}

/** Analyser flags Admin can still override by confirming the displayed score. */
function approveWarningMessage(stored: CiiV45Result | null, locked: boolean): string | null {
    if (locked || !stored) return null;
    if (stored.scoreStatus === "RESUBMISSION_REQUIRED") {
        return "Analysis flagged incomplete hours or student material. Confirming will still publish this score.";
    }
    if (stored.scoreStatus === "ADMIN_EVIDENCE_REQUIRED") {
        return "AI report-quality (/85) is ready. Dimension 7 defaults to Sound (2) so Confirm can publish; change any evidence mark first if needed.";
    }
    if (stored.scoreStatus === "ADMIN_REVIEW_REQUIRED") {
        const reasons = Array.isArray(stored.adminReviewReasons) ? stored.adminReviewReasons : [];
        return reasons.length
            ? `Analysis flagged for admin review: ${reasons.join("; ")}. Confirming will still publish this score.`
            : "Analysis is still marked for admin review. Confirming will still publish this score.";
    }
    return null;
}

function badgeLabel(badge: CiiV45Badge | null): string {
    if (!badge) return "Pending";
    const base = `${badge.code} · ${badge.name}`;
    return badge.gateCapped ? `${base} (capped from L${badge.numericLevel} — quality gate not met)` : base;
}

export default function CommunityCiiAnalyser({
    publisher = "faculty",
    readOnly = false,
}: {
    publisher?: "faculty" | "ciel_pk";
    /** Faculty view: inspect only — no Run / Approve / Reject. */
    readOnly?: boolean;
} = {}) {
    const params = useParams();
    const reportId = String(params.reportId ?? "");
    const isCielPk = publisher === "ciel_pk";
    const reportPath = isCielPk
        ? `/api/v1/admin/reports/${reportId}`
        : `/api/v1/faculty/reports/${reportId}`;
    const analysePath = isCielPk
        ? `/api/v1/admin/community-service/reports/${reportId}/cii-v4-5/analyse`
        : `/api/v1/faculty/reports/${reportId}/cii-v4-5/analyse`;
    const approvePath = isCielPk
        ? `/api/v1/admin/community-service/reports/${reportId}/cii-v4-5/approve`
        : `/api/v1/faculty/reports/${reportId}/cii-v4-5/approve`;
    const inboxHref = isCielPk
        ? "/dashboard/admin/reports/verify"
        : "/dashboard/faculty/community-service";
    const inboxLabel = isCielPk ? "← Back to student reports" : "← Back to Community Service";
    const packageHref = isCielPk
        ? `/dashboard/admin/reports/verify/${encodeURIComponent(reportId)}?package=1`
        : `/dashboard/faculty/reports/${encodeURIComponent(reportId)}?view=dossier`;

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<Record<string, unknown> | null>(null);
    const [analysing, setAnalysing] = useState(false);
    const [analysingElapsedSec, setAnalysingElapsedSec] = useState(0);
    const [approving, setApproving] = useState(false);
    const [deciding, setDeciding] = useState(false);
    const [note, setNote] = useState("");
    const [dim7Anchors, setDim7Anchors] = useState<Record<string, string>>({});
    const [dim7Reasons, setDim7Reasons] = useState<Record<string, string>>({});

    const ciiV45 = (report?.ciiV45 as unknown as CiiV45Result | undefined) || null;
    const ciiV45Lock = (report?.ciiV45Lock as unknown as CiiV45Lock | undefined) || null;
    const locked = Boolean(ciiV45Lock?.locked);
    const packet = resolveImpactPackagePacketIntegrity(report);
    const packetHold = Boolean(report) && !packet.ok;

    const loadReport = async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const res = await authenticatedFetch(reportPath);
            if (!res?.ok) {
                toast.error("Report not available");
                setReport(null);
                return;
            }
            const data = await res.json();
            const next = (data.data || data) as Record<string, unknown>;
            setReport(next);
            const nextCii = next.ciiV45 as unknown as CiiV45Result | undefined;
            if (nextCii) {
                const d7 = nextCii.sectionScores?.find((s) => s.dimension === "7");
                const anchors: Record<string, string> = {};
                const reasons: Record<string, string> = {};
                for (const c of DIM7.criteria) {
                    const saved = d7?.criterionScores?.find((row) => row.criterion === c.key);
                    if (saved && saved.anchor !== "P" && typeof saved.anchor === "number") {
                        anchors[c.key] = String(saved.anchor);
                    } else {
                        anchors[c.key] = "2";
                    }
                    if (saved && saved.anchor !== "P" && saved.reasoningSummary?.trim()) {
                        reasons[c.key] = saved.reasoningSummary;
                    }
                }
                setDim7Anchors(anchors);
                setDim7Reasons(reasons);
            }
        } catch {
            toast.error("Failed to load report");
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportId]);

    // The analyser call can legitimately take 1-4 minutes (OpenAI call + one internal
    // empty-content retry) — without a running counter the button just looks hung.
    useEffect(() => {
        if (!analysing) {
            setAnalysingElapsedSec(0);
            return;
        }
        const startedAt = Date.now();
        setAnalysingElapsedSec(0);
        const id = setInterval(() => {
            setAnalysingElapsedSec(Math.round((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [analysing]);

    const runAnalysis = async () => {
        if (readOnly || !reportId || analysing) return;
        if (packetHold) {
            toast.error(`Student packet integrity HOLD · ${packet.issues.join(" ")}`);
            return;
        }
        if (locked && !isCielPk) return;
        if (locked && isCielPk) {
            const ok = window.confirm(
                "This CII is locked. Re-run the CII v5.0 Analyzer? The lock will clear until you approve the new score.",
            );
            if (!ok) return;
        }
        const previousAt = String(ciiV45?.computedAt || "");
        const pollForFreshCii = async (): Promise<boolean> => {
            for (let i = 0; i < 12; i++) {
                await new Promise((r) => setTimeout(r, 4000));
                const check = await authenticatedFetch(reportPath, {}, { timeoutMs: 20000 });
                if (!check?.ok) continue;
                const data = await check.json().catch(() => null);
                const next = ((data as { data?: Record<string, unknown> } | null)?.data || data) as Record<string, unknown> | null;
                const nextCii = next?.ciiV45 as unknown as CiiV45Result | undefined;
                if (nextCii?.computedAt && String(nextCii.computedAt) !== previousAt) {
                    setReport(next);
                    return true;
                }
            }
            return false;
        };
        try {
            setAnalysing(true);
            let res: Response | null = null;
            try {
                res = await authenticatedFetch(analysePath, { method: "POST" }, { timeoutMs: ANALYSE_TIMEOUT_MS });
            } catch (err) {
                const aborted =
                    (err instanceof DOMException && err.name === "AbortError") ||
                    (err instanceof Error && err.name === "AbortError");
                if (!aborted) throw err;
            }
            if (res && !res.ok) {
                const payload = await res.json().catch(() => ({}));
                toast.error((payload as { error?: string; message?: string }).error || (payload as { message?: string }).message || "CII analysis failed");
                return;
            }
            if (!res?.ok) {
                const appeared = await pollForFreshCii();
                if (!appeared) {
                    toast.error("Analyzer is still running. Refresh this page in a minute.");
                    return;
                }
                toast.success("CII v5.0 analysis complete");
                return;
            }
            toast.success("CII v5.0 analysis complete");
            await loadReport();
        } catch {
            toast.error("CII analysis failed");
        } finally {
            setAnalysing(false);
        }
    };

    const dim7Complete = DIM7.criteria.every((c) => {
        const a = Number(dim7Anchors[c.key]);
        return Number.isInteger(a) && a >= 0 && a <= 4;
    });
    const dim7PreviewPts = DIM7.criteria.reduce((sum, c) => {
        const a = Number(dim7Anchors[c.key]);
        if (!Number.isInteger(a) || a < 0 || a > 4) return sum;
        return sum + c.weight * CII_V45_ANCHOR_FACTORS[a as 0 | 1 | 2 | 3 | 4];
    }, 0);
    const hardBlock = approveHardBlock(ciiV45, ciiV45Lock, locked, dim7Complete);
    const warningMessage = approveWarningMessage(ciiV45, locked);
    const bannerMessage = hardBlock || warningMessage;

    const approveAndLock = async () => {
        if (readOnly || !reportId || approving || locked || !ciiV45) return;
        if (hardBlock) {
            toast.error(hardBlock);
            return;
        }
        try {
            setApproving(true);
            const body: Record<string, unknown> = {};
            if (note.trim()) body.note = note.trim();
            if (evidenceAssessmentPending(ciiV45) || !dim7Complete) {
                body.evidenceCriteria = DIM7.criteria.map((c) => ({
                    criterion: c.key,
                    anchor: Number.isInteger(Number(dim7Anchors[c.key])) ? Number(dim7Anchors[c.key]) : 2,
                    reasoningSummary: (dim7Reasons[c.key] || "").trim() || undefined,
                    evidenceIds: [],
                }));
            }
            const res = await authenticatedFetch(approvePath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    (payload as { error?: string; message?: string }).error ||
                        (payload as { message?: string }).message ||
                        "Could not approve CII",
                );
                return;
            }
            toast.success("CII v5.0 approved and locked — badge issued");
            await loadReport();
        } catch {
            toast.error("Could not approve CII");
        } finally {
            setApproving(false);
        }
    };

    const returnForRevision = async () => {
        if (readOnly) return;
        if (!reportId || deciding || locked) return;
        if (!note.trim()) {
            toast.error("State exactly what needs clarification or review.");
            return;
        }
        try {
            setDeciding(true);
            // Faculty writes are blocked on BE; Admin unlock returns the package for edits.
            if (!isCielPk) {
                toast.error("Faculty report review is read-only. CIEL PK Admin handles returns.");
                return;
            }
            const res = await authenticatedFetch(`/api/v1/admin/reports/${reportId}/verify`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "unlock",
                    feedback: note.trim(),
                    reason: note.trim(),
                }),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not save decision");
                return;
            }
            toast.success("Returned to student for clarification");
            await loadReport();
        } catch {
            toast.error("Could not save decision");
        } finally {
            setDeciding(false);
        }
    };

    const rejectReport = async () => {
        if (readOnly) return;
        if (!reportId || deciding || locked) return;
        if (!note.trim()) {
            toast.error("A reason is required when rejecting a report.");
            return;
        }
        try {
            setDeciding(true);
            if (!isCielPk) {
                toast.error("Faculty report review is read-only. CIEL PK Admin handles rejections.");
                return;
            }
            const res = await authenticatedFetch(`/api/v1/admin/reports/${reportId}/verify`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reject",
                    feedback: note.trim(),
                    reason: note.trim(),
                }),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not save decision");
                return;
            }
            toast.success("Report rejected");
            await loadReport();
        } catch {
            toast.error("Could not save decision");
        } finally {
            setDeciding(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-[1180px] p-5">
                <HubBackButton href={inboxHref} label={inboxLabel} />
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: TEAL }} />
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="mx-auto max-w-[1180px] p-5">
                <HubBackButton href={inboxHref} label={inboxLabel} />
                <p className="text-[12px] text-[#687d82]">Report unavailable.</p>
            </div>
        );
    }

    const studentName = (report.student as { name?: string } | undefined)?.name || "Student";
    const projectTitle =
        (report.opportunity as { title?: string } | undefined)?.title || String(report.project_id || "Community Service Project");
    const hours = reportHours(report);
    const evidence = evidenceCount(report);
    const outcomes = outcomeCount(report);
    const sessions = sessionCount(report);
    const partners = partnerCount(report);

    const scoreStatus = ciiV45?.scoreStatus ?? null;
    const currentScore = pickCiiV45DisplayScore(ciiV45, ciiV45Lock);
    const rawAiPts = (ciiV45?.sectionScores ?? [])
        .filter((s) => s.dimension !== "7")
        .reduce((sum, s) => sum + (typeof s.score === "number" ? s.score : 0), 0);
    const previewComposite =
        dim7Complete && evidenceAssessmentPending(ciiV45)
            ? Math.round((rawAiPts + dim7PreviewPts + 1e-9) * 10) / 10
            : currentScore;
    const currentBadge = locked
        ? ciiV45?.finalBadge ?? null
        : currentScore != null
          ? ciiV45?.recommendedBadge ?? ciiV45?.diagnosticBadge ?? null
          : null;
    const diagnosticBadge = ciiV45?.recommendedBadge ?? ciiV45?.diagnosticBadge ?? null;

    const flags: Array<{ label: string; value: string; note: string; warn?: boolean }> = [
        { label: "HOURS", value: hours > 0 ? `${hours}h` : "Not recorded", note: "Logged service time", warn: hours <= 0 },
        { label: "EVIDENCE", value: String(evidence), note: "Files and session proof", warn: evidence <= 0 },
        { label: "SESSIONS", value: String(sessions), note: "Attendance records", warn: sessions <= 0 },
        { label: "OUTCOMES", value: String(outcomes), note: "Measured change rows", warn: outcomes <= 0 },
        { label: "PARTNERS", value: String(partners), note: "Named collaborators" },
        {
            label: "INTEGRITY",
            value: ciiV45
                ? ciiV45.integrityPenalty?.issues?.length
                    ? `${ciiV45.integrityPenalty.issues.length} issue${ciiV45.integrityPenalty.issues.length === 1 ? "" : "s"}`
                    : "Clear"
                : "Pending run",
            note: "Confirmed student-origin issues",
            warn: Boolean(ciiV45?.integrityPenalty?.issues?.length),
        },
    ];

    return (
        <div className="fx23-analyzer">
            <div className="fx23-backnav">
                <HubBackButton href={inboxHref} label={inboxLabel} />
            </div>
            <div className="fx23-workhead">
                <div>
                    <span>{isCielPk ? "CIEL PK Super Admin review · CII v5.0 Analyzer" : "Read-only Impact Package viewer"}</span>
                    <h2>{projectTitle}</h2>
                    <p>
                        {studentName} · submitted Flashcard + Detailed Report stay locked. Packet completeness is checked first. The Analyzer runs only when CIEL PK Admin chooses to run it. There is no Faculty or Partner verification in this approval chain.
                    </p>
                </div>
                <div>
                    {!isCielPk ? (
                        <Link href={`/dashboard/faculty/reports/${reportId}?view=dossier`}>Impact Package</Link>
                    ) : (
                        <Link href={`/dashboard/admin/reports/verify/${reportId}?package=1`}>Review package</Link>
                    )}
                </div>
            </div>

            {packetHold ? (
                <div className="fx23-lock" role="alert">
                    <b>Student packet integrity HOLD</b> — the AI Analyser must not score this package until the missing content is restored.
                    <ul style={{ margin: "4px 0 8px 14px" }}>
                        {packet.issues.map((issue) => (
                            <li key={issue}>{issue}</li>
                        ))}
                    </ul>
                    <Link href={packageHref}>Open Impact Package</Link>
                </div>
            ) : null}

            {locked ? (
                <div className="fx23-lock">
                    {isCielPk
                        ? "CII v5.0 is locked. Super Admin can re-run the Analyzer if this score needs to be recomputed."
                        : "CII + badge are locked. The approved score cannot be silently rewritten. Any later correction should create a new version."}
                </div>
            ) : readOnly ? (
                <div className="fx23-lock">
                    Faculty access is read-only. You can view the Impact Package and any diagnostic CII. Analysis, Approve, Request revision and Reject are handled by CIEL PK Admin.
                </div>
            ) : (
                <div className="fx23-lock">
                    Locked flow: review the submitted record first. Running the Analyzer generates a provisional diagnostic CII. Student-source text is not rewritten.
                </div>
            )}

            {!locked && ciiV45 && scoreStatus === "RESUBMISSION_REQUIRED" ? (
                <div className="fx23-lock">
                    <b>Resubmission required</b> — mandatory hours or student material are incomplete. The student must resubmit before this can be scored.
                </div>
            ) : null}
            {!locked && ciiV45 && scoreStatus === "ADMIN_EVIDENCE_REQUIRED" ? (
                <div className="fx23-lock">
                    <b>Admin evidence required</b> — AI scored report quality out of 85. Score Dimension 7 (evidence, ethics &amp; verification) below to complete the CII.
                </div>
            ) : null}
            {!locked && ciiV45 && scoreStatus === "ADMIN_REVIEW_REQUIRED" ? (
                <div className="fx23-lock">
                    <b>Admin review required</b> — the evaluation is pending resolution:
                    <ul style={{ margin: "4px 0 0 14px" }}>
                        {(ciiV45.adminReviewReasons?.length ? ciiV45.adminReviewReasons : ["Material input is still pending processing."]).map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {!locked && ciiV45 && scoreStatus === "FINAL" ? (
                <div className="fx23-lock" style={{ background: "#e8f7ef", borderColor: "#bfe3cf", color: "#176b47" }}>
                    <b>Ready to approve</b> — the evaluation is complete and eligible for publication.
                </div>
            ) : null}

            <div className="fx23-aintro">
                <div>
                    <small>SYSTEM ASSESSMENT · CII v5.0 HYBRID</small>
                    <h2>CIEL PK CII Analyzer</h2>
                    <p>
                        Hybrid CII v5.0: AI scores report quality out of 85. CIEL PK Admin scores Dimension 7 evidence out of 15. Arithmetic, bands and L4–L6 gates stay server-side. There is no Faculty or Partner verification in this final-report approval chain. Faculty may open the published Impact Package after CIEL PK Admin confirms.
                    </p>
                </div>
                {readOnly ? (
                    <span className="fx23-run" style={{ opacity: 0.75, cursor: "default" }}>
                        {locked ? "Locked · read only" : ciiV45 ? "Diagnostic CII (view only)" : "Analyzer not run · read only"}
                    </span>
                ) : (
                    <button type="button" className="fx23-run" onClick={runAnalysis} disabled={analysing || packetHold || (locked && !isCielPk)}>
                        {analysing
                            ? `Scoring report quality… ${analysingElapsedSec}s${analysingElapsedSec >= 60 ? " (usually 1–4 min)" : ""}`
                            : packetHold
                              ? "Packet HOLD"
                              : locked && !isCielPk
                                ? "Locked"
                                : ciiV45
                                  ? "Re-run AI Analyzer"
                                  : "Run AI Analyzer"}
                    </button>
                )}
            </div>

            <div className="fx23-ready">
                <div className="score">
                    <b>{previewComposite != null ? Math.round(previewComposite) : "—"}</b>
                    <span>{locked ? "Final CII / 100" : previewComposite != null ? "Composite CII / 100" : "CII / 100 (pending analysis)"}</span>
                </div>
                <div className="grid">
                    {flags.map((flag) => (
                        <div key={flag.label} className={flag.warn ? "flag" : undefined}>
                            <small>{flag.label}</small>
                            <b>{flag.value}</b>
                            <span>{flag.note}</span>
                        </div>
                    ))}
                </div>
            </div>

            <details className="fx23-method">
                <summary>How the Analyzer scores this report</summary>
                <p>
                    The model reads the locked 9-section Impact Package only (no evidence originals). It returns nine report-quality dimensions (85 points). CIEL PK Admin scores Dimension 7 evidence (15 points) from the original files. Anchors 0–4 ({CII_V45_ANCHOR_NAMES.join(" · ")}), up to +5 verified Extra-Mile, and an admin-adjudicated integrity penalty. Levels 4–6 still require cumulative quality gates.
                </p>
                <ul>
                    {CII_V45_DIMENSIONS.map((dim) => (
                        <li key={dim.id}>
                            D{dim.id} {dim.name} · {dim.maxPoints} pts
                        </li>
                    ))}
                </ul>
            </details>

            {ciiV45 ? (
                <>
                    <div className="fx23-scorehero">
                        <div>
                            <small>{locked ? "FINAL CII" : "COMPOSITE CII"}</small>
                            <b>
                                {previewComposite != null ? previewComposite.toFixed(1) : "Pending"}
                                {previewComposite != null ? <em>/100</em> : null}
                            </b>
                            <strong>{badgeLabel(currentBadge)}</strong>
                            <p>
                                {ciiV45.analysisSummary ||
                                    (previewComposite == null
                                        ? "Run the Analyzer to generate report-quality marks, then Confirm."
                                        : "Generated Composite CII from 85 AI report-quality points plus 15 Admin evidence points.")}
                            </p>
                            <p style={{ fontSize: 11, marginTop: 8 }}>
                                AI report quality{" "}
                                <b>
                                    {ciiV45.aiReportScore != null ? ciiV45.aiReportScore.toFixed(1) : "—"}
                                </b>
                                /85 · Admin evidence{" "}
                                <b>
                                    {ciiV45.adminEvidenceScore != null ? ciiV45.adminEvidenceScore.toFixed(1) : "Pending"}
                                </b>
                                /15
                            </p>
                        </div>
                        <div className="fx23-confidence">
                            <span>Quality gates (L4–L6)</span>
                            <b>
                                {[ciiV45.qualityGates?.L4, ciiV45.qualityGates?.L5, ciiV45.qualityGates?.L6].filter(Boolean).length}/3
                            </b>
                            <small>
                                L4 {ciiV45.qualityGates?.L4 ? "pass" : "not met"} · L5 {ciiV45.qualityGates?.L5 ? "pass" : "not met"} · L6{" "}
                                {ciiV45.qualityGates?.L6 ? "pass" : "not met"}
                            </small>
                        </div>
                    </div>

                    <div className="fx23-a2">
                        <div>
                            <h3>Strengths</h3>
                            <ul>
                                {(ciiV45.strengths?.length ? ciiV45.strengths : ["—"]).map((s, i) => (
                                    <li key={`st-${i}`}>{s}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3>Development priorities</h3>
                            <ul>
                                {(ciiV45.developmentPriorities?.length ? ciiV45.developmentPriorities : ["—"]).map((s, i) => (
                                    <li key={`dp-${i}`}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {Array.isArray(ciiV45.sectionAnalyses) && ciiV45.sectionAnalyses.length ? (
                        <details className="fx23-method">
                            <summary>Admin-only section analysis ({ciiV45.sectionAnalyses.length})</summary>
                            {ciiV45.sectionAnalyses.map((section, i) => (
                                <div key={`${section.dimension}-${i}`} style={{ marginTop: 8 }}>
                                    <p>
                                        <b>D{section.dimension}</b> — {section.summary || "—"}
                                    </p>
                                    {section.strengths?.length ? <p>Strengths: {section.strengths.join("; ")}</p> : null}
                                    {section.limitations?.length ? <p>Limitations: {section.limitations.join("; ")}</p> : null}
                                    {section.adminFlags?.length ? <p>Admin flags: {section.adminFlags.join("; ")}</p> : null}
                                </div>
                            ))}
                        </details>
                    ) : null}

                    <div className="fx23-ciisections">
                        {ciiV45.sectionScores.map((section) => (
                            <article key={section.dimension} className="fx23-ciisec">
                                <header>
                                    <span>D{section.dimension}</span>
                                    <div>
                                        <h3>{section.name}</h3>
                                        <small>{section.criterionScores.length} criteria</small>
                                    </div>
                                    <b>
                                        {section.score != null ? section.score.toFixed(1) : `${section.knownPoints.toFixed(1)}*`}/{section.maximumPoints}
                                    </b>
                                </header>
                                <div className="fx23-ciibody">
                                    <p>
                                        {section.score == null
                                            ? `Pending — ${section.knownPoints.toFixed(1)} of ${section.maximumPoints} known so far.`
                                            : `Scored from the locked report record.`}
                                    </p>
                                    <div className="fx23-subrub">
                                        {section.criterionScores.map((criterion) => (
                                            <div key={criterion.criterion}>
                                                <span>{criterionLabel(section.dimension, criterion.criterion)}</span>
                                                <b>
                                                    {criterion.anchor === "P" ? "Pending" : `${criterion.anchor}/4`} ·{" "}
                                                    {criterion.score == null ? "—" : criterion.score.toFixed(2)}
                                                </b>
                                            </div>
                                        ))}
                                    </div>
                                    <details style={{ marginTop: 7 }}>
                                        <summary style={{ fontSize: "7.5px", fontWeight: 900, color: "#0b6e67", cursor: "pointer" }}>
                                            Criterion detail &amp; evidence
                                        </summary>
                                        {section.criterionScores.map((criterion) => (
                                            <div
                                                key={`detail-${criterion.criterion}`}
                                                style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #e4ecea" }}
                                            >
                                                <b style={{ fontSize: "7.5px" }}>{criterionLabel(section.dimension, criterion.criterion)}</b>
                                                <div style={{ fontSize: "7px", color: "#5d7377", margin: "2px 0" }}>
                                                    Quality anchor {criterion.qualityAnchor === "P" ? "Pending" : `${criterion.qualityAnchor}/4`} · Verification{" "}
                                                    {criterion.verificationStatus}
                                                </div>
                                                <p style={{ fontSize: "7.3px", margin: "3px 0", color: "#425a5e" }}>{criterion.reasoningSummary}</p>
                                                {criterion.sourceRefs.length ? (
                                                    <div style={{ fontSize: "6.5px", color: "#788" }}>Sources: {criterion.sourceRefs.join("; ")}</div>
                                                ) : null}
                                                {criterion.evidenceIds.length ? (
                                                    <div style={{ fontSize: "6.5px", color: "#788" }}>Evidence: {criterion.evidenceIds.join(", ")}</div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </details>
                                </div>
                            </article>
                        ))}
                    </div>

                    <details className="fx23-method">
                        <summary>
                            Claim inventory &amp; evidence audit ({ciiV45.claimInventory?.length ?? 0} claims · {ciiV45.evidenceAudit?.length ?? 0} files)
                        </summary>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                            <div>
                                <b style={{ fontSize: "7.5px" }}>Claims</b>
                                <ul style={{ paddingLeft: 12, margin: "4px 0" }}>
                                    {(ciiV45.claimInventory?.length ? ciiV45.claimInventory : []).map((c) => (
                                        <li key={c.claimId} style={{ fontSize: "7px", margin: "2px 0" }}>
                                            {c.claimId} — {c.supportStatus}
                                            {c.material ? "" : " (non-material)"}
                                        </li>
                                    ))}
                                    {!ciiV45.claimInventory?.length ? <li style={{ fontSize: "7px" }}>—</li> : null}
                                </ul>
                            </div>
                            <div>
                                <b style={{ fontSize: "7.5px" }}>Evidence files</b>
                                <ul style={{ paddingLeft: 12, margin: "4px 0" }}>
                                    {(ciiV45.evidenceAudit?.length ? ciiV45.evidenceAudit : []).map((e) => (
                                        <li key={e.evidenceId} style={{ fontSize: "7px", margin: "2px 0" }}>
                                            {e.fileName || e.evidenceId} — {e.processingStatus} / {e.supportStatus}
                                            {e.actualContentSummary ? `: ${e.actualContentSummary}` : ""}
                                        </li>
                                    ))}
                                    {!ciiV45.evidenceAudit?.length ? <li style={{ fontSize: "7px" }}>—</li> : null}
                                </ul>
                            </div>
                        </div>
                    </details>

                    <div className="fx23-a2">
                        <div>
                            <h3>Extra-mile uplift</h3>
                            {ciiV45.extraMileUplift?.assessmentStatus === "PROCESSING_REQUIRED" ||
                            ciiV45.extraMileUplift?.assessmentStatus === "PENDING_ADMIN" ? (
                                <p>Pending Admin extra-mile confirmation — not awarded until Confirm.</p>
                            ) : ciiV45.extraMileUplift?.items?.length ? (
                                <ul>
                                    {ciiV45.extraMileUplift.items.map((it, i) => (
                                        <li key={`${it.category}-${i}`}>
                                            {it.category}: +{it.points.toFixed(2)} — {it.beyondBaseJustification || "—"}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No extra-mile uplift awarded.</p>
                            )}
                            <p>
                                <b>Total: {ciiV45.extraMileUplift?.total == null ? "Pending" : `+${ciiV45.extraMileUplift.total.toFixed(2)}`}</b>
                            </p>
                        </div>
                        <div>
                            <h3>Integrity penalty</h3>
                            <p>
                                <b>{(ciiV45.integrityPenalty?.points ?? 0).toFixed(1)} pts</b>
                            </p>
                            {ciiV45.integrityPenalty?.issues?.length ? (
                                <ul>
                                    {ciiV45.integrityPenalty.issues.map((iss, i) => (
                                        <li key={i}>{iss.reason}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No confirmed integrity issues.</p>
                            )}
                        </div>
                    </div>

                    {ciiV45.exceptionalFeature ? (
                        <div className="fx23-method">
                            <p>
                                <b>Exceptional feature</b> — {ciiV45.exceptionalFeature.verified ? "Verified" : "Not verified"}
                            </p>
                            {ciiV45.exceptionalFeature.explanation ? <p>{ciiV45.exceptionalFeature.explanation}</p> : null}
                        </div>
                    ) : null}

                    {ciiV45.deductionLedger?.length ? (
                        <details className="fx23-method">
                            <summary>Deduction ledger ({ciiV45.deductionLedger.length})</summary>
                            <ul>
                                {ciiV45.deductionLedger.map((entry, i) => (
                                    <li key={i} style={{ fontSize: "7px" }}>
                                        {JSON.stringify(entry)}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ) : null}

                    <div className="fx23-method">
                        <p>
                            <b>Evidence summary</b> — {ciiV45.evidenceSummary || "—"}
                        </p>
                        <p>
                            <b>Student feedback</b> — {ciiV45.studentFeedback || "—"}
                        </p>
                    </div>

                    {!readOnly && !locked && evidenceAssessmentPending(ciiV45) ? (
                        <div className="fx23-moderation" style={{ marginTop: 12 }}>
                            <div className="fx23-modhead">
                                <div>
                                    <small>ADMIN EVIDENCE · DIMENSION 7 · /15</small>
                                    <h2>Score original evidence</h2>
                                    <p>
                                        Look at the uploaded files yourself. Empty marks default to Sound (2). Changing an anchor updates the Composite before Confirm.
                                        {dim7Complete ? ` Live evidence subtotal: ${dim7PreviewPts.toFixed(2)} / 15.` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="fx23-comment">
                                {DIM7.criteria.map((c) => (
                                    <label key={c.key} style={{ display: "block", marginTop: 10 }}>
                                        {criterionLabel("7", c.key)} <span>{c.weight} pts</span>
                                        <select
                                            value={dim7Anchors[c.key] ?? ""}
                                            onChange={(e) => setDim7Anchors((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                            style={{ width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #d7e5e8", borderRadius: 8 }}
                                        >
                                            <option value="">Select anchor</option>
                                            {CII_V45_ANCHOR_NAMES.map((name, i) => (
                                                <option key={name} value={String(i)}>
                                                    {i}/4 · {name} · {(c.weight * CII_V45_ANCHOR_FACTORS[i]).toFixed(2)} pts
                                                </option>
                                            ))}
                                        </select>
                                        <textarea
                                            value={dim7Reasons[c.key] ?? ""}
                                            onChange={(e) => setDim7Reasons((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                            placeholder="Optional note from the originals (the system writes an audit rationale if blank)."
                                            style={{ marginTop: 6 }}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="fx23-moderation">
                        <div className="fx23-modhead">
                            <div>
                                <small>ADMIN ACCEPT &amp; PUBLISH</small>
                                <h2>Review generated Composite CII</h2>
                                <p>
                                    Confirm publishes the system Composite (85 AI + 15 evidence). There is no manual final-score override — change Dimension 7 marks if the evidence score should move.
                                </p>
                            </div>
                            <div className="fx23-final">
                                <span>{dim7Complete && evidenceAssessmentPending(ciiV45) ? "Generated Composite" : "AI recommended"}</span>
                                <b>{previewComposite != null ? previewComposite.toFixed(1) : "—"}</b>
                                <small>/100</small>
                                <strong>{badgeLabel(diagnosticBadge)}</strong>
                            </div>
                        </div>

                        {bannerMessage ? (
                            <div className="fx23-lock" style={{ margin: 0 }}>
                                {bannerMessage}
                            </div>
                        ) : null}

                        {!readOnly ? (
                            <div className="fx23-comment">
                                <label style={{ marginTop: 10 }}>
                                    Admin note <span>optional</span>
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={locked}
                                    placeholder="Optional note for this decision — also used as the reason for Request revision / Reject below."
                                />
                                <small>Confirm locks the generated CII v5.0.2 Composite and badge. Revision / reject keep the record unlocked and send the same note to the student.</small>
                            </div>
                        ) : null}

                        <div className="fx23-decision">
                            {readOnly ? (
                                <p style={{ margin: 0, fontSize: 11, color: "#617579", fontWeight: 700 }}>
                                    Read-only — Approve, Request revision and Reject are not available on Faculty login.
                                </p>
                            ) : (
                                <>
                                    <button type="button" className="rev" disabled={locked || deciding} onClick={returnForRevision}>
                                        Request revision
                                    </button>
                                    {!isCielPk ? (
                                        <button type="button" className="rej" disabled={locked || deciding} onClick={rejectReport}>
                                            Reject
                                        </button>
                                    ) : null}
                                    <button type="button" className="approve" disabled={approving || Boolean(hardBlock)} onClick={approveAndLock}>
                                        {approving ? "Locking…" : isCielPk ? "Confirm final score" : "Approve & lock"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="fx23-moderation" style={{ padding: 22 }}>
                    <p style={{ fontSize: 10, color: "#617579", margin: 0 }}>
                        Analyzer not run yet. Faculty view is read-only — CIEL PK Admin runs analysis and final decisions.
                    </p>
                </div>
            )}

            <div className="fx23-workfoot">
                <span>{locked && ciiV45Lock ? `Locked ${new Date(ciiV45Lock.lockedAt).toLocaleString()}` : "Analysis open"}</span>
                <span>CII v5.0 Hybrid · 85 AI report quality + 15 Admin evidence</span>
            </div>
        </div>
    );
}
