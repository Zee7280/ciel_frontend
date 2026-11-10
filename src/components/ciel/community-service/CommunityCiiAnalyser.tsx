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
    CII_V45_RUBRIC_VERSION,
    assessL6,
    criterionLabel,
    isR3Analysis,
    resolveBadgeForScoreR3,
    type CiiV45Badge,
    type CiiV45BadgeStatus,
    type CiiV45Dimension,
    type CiiV45Lock,
    type CiiV45Result,
} from "@/utils/communityCiiAnalyser";
import { pickCiiV45DisplayScore } from "@/utils/reportCiiSnapshot";
import {
    anchorOptionLabel,
    anchorPoints,
    badgeCapNote,
    buildFeedbackSections,
    feedbackPlainText,
    finalChecklist,
    formatPts,
    gatePills,
    type AnchorIndex,
} from "@/utils/ciiAnalyserView";
import ReportEvidenceGallery from "@/components/ciel/community-service/ReportEvidenceGallery";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { ADMIN_REPORTS_TABLE_HREF, adminReviewReturnLabel, readAdminReviewReturn } from "@/utils/adminReviewReturn";
import { resolveImpactPackagePacketIntegrity } from "@/app/dashboard/student/report/impact-package/impactPackagePacket";
import { CiiFinalOnePageSheet, CII_FINAL_BADGE_SRC, CII_FINAL_LOGO_SRC } from "@/components/ciel/community-service/CiiFinalOnePageSheet";
import { CiiAnswerableRegistryPanel } from "@/components/ciel/community-service/CiiAnswerableRegistryPanel";
import { buildStudentAnalysisRecord, studentAnalysisFileName } from "@/utils/ciiStudentAnalysis";
import { CiiCriterionMarks } from "@/components/ciel/community-service/CiiCriterionMarks";
import { CiiL6QualificationPanel } from "@/components/ciel/community-service/CiiL6QualificationPanel";
import { CiiSupplementalEvidencePanel, type SupplementalEvidenceItem } from "@/components/ciel/community-service/CiiSupplementalEvidencePanel";
import {
    EMPTY_L6_FORM,
    approveToast,
    buildModeratePayload,
    buildReviewRecord,
    describeLogEntry,
    diffCriterionEdits,
    l6ApprovePayload,
    markRowsFor,
    moderationRevision,
    pendingCriteria,
    reviewRecordFileName,
    sectionOptionLabel,
    sectionTotalFromInputs,
    showL6Panel,
    type L6Form,
} from "@/utils/ciiModerationView";
import "./community-cii-analyser.css";

/** Nest CII OpenAI call is 120s, plus one empty-content retry (120s). BFF maxDuration is 300s. */
const ANALYSE_TIMEOUT_MS = 300_000;

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function reportDisplayTitle(report: Record<string, unknown> | null): string {
    if (!report) return "";
    const opportunity = asRecord(report.opportunity);
    return String(
        report.project_title || report.projectTitle || report.title || opportunity.title || "",
    ).trim();
}

const DIM7 = CII_V45_DIMENSIONS.find((d) => d.id === "7")!;

const LOGO_SRC = CII_FINAL_LOGO_SRC;
const BADGE_SRC = CII_FINAL_BADGE_SRC;

const EVIDENCE_HELP: Record<string, string> = {
    participation: "Does the evidence reasonably support the student's recorded participation and individual presence?",
    activities: "Do the originals support the reported activities and tangible outputs?",
    reach: "Is the reported reach/counting method reasonably supported?",
    outcomes: "Does the evidence support the reported before/after change without overclaiming?",
    resourcesPartners: "Do originals support the resource use, receipts, handover or partner claims?",
    ethics: "Is consent, privacy and no-harm handling acceptable in the originals reviewed?",
    coverage: "Does the evidence package proportionately cover the main project claims?",
};

const EVIDENCE_LABEL: Record<string, string> = {
    participation: "Participation evidence",
    activities: "Activities / outputs",
    reach: "Reach",
    outcomes: "Outcomes / change",
    resourcesPartners: "Resources & partnerships",
    ethics: "Ethics / consent",
    coverage: "Evidence coverage",
};

function fileNameOf(value: unknown, fallback: string): string {
    if (typeof value === "string" && value.trim()) {
        const cut = value.split("?")[0];
        return cut.split("/").pop() || fallback;
    }
    return fallback;
}

function collectEvidenceFiles(report: Record<string, unknown>): Array<{
    id: string;
    name: string;
    url: string;
    visibility: string;
    section: string;
    claim: string;
}> {
    const files: Array<{ id: string; name: string; url: string; visibility: string; section: string; claim: string }> = [];
    const seen = new Set<string>();
    const push = (raw: unknown, section: string, claim: string) => {
        const rec = asRecord(raw);
        const url = String(rec.url || rec.file_url || (typeof raw === "string" ? raw : "")).trim();
        if (!url || seen.has(url)) return;
        seen.add(url);
        files.push({
            id: String(rec.id || url),
            name: String(rec.name || rec.file_name || fileNameOf(url, `Evidence ${files.length + 1}`)),
            url,
            visibility: String(rec.visibility || rec.media_visible || asRecord(report.section8).media_visible || "Restricted"),
            section,
            claim,
        });
    };
    const pkgFiles = asArray(asRecord(asRecord(asRecord(report.review_package).documents).evidence).files);
    if (pkgFiles.length) {
        pkgFiles.forEach((file) => push(file, String(asRecord(file).source || "packet"), "Submitted evidence original."));
        return files;
    }
    const keys = ["section1", "section2", "section3", "section4", "section5", "section6", "section7", "section8", "section9", "section10"];
    for (const key of keys) {
        const section = asRecord(report[key]);
        asArray(section.evidence_files).forEach((file) => push(file, key, "Section evidence file."));
        asArray(section.media_urls).forEach((file) => push(file, key, "Section media file."));
    }
    asArray(report.evidence_urls).forEach((file) => push(file, "report", "Report evidence file."));
    return files;
}

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
        return "AI report-quality (/85) is ready. Complete all seven evidence marks, then Approve.";
    }
    if (stored.scoreStatus === "ADMIN_REVIEW_REQUIRED") {
        const reasons = Array.isArray(stored.adminReviewReasons) ? stored.adminReviewReasons : [];
        return reasons.length
            ? `Analysis flagged for admin review: ${reasons.join("; ")}. Confirming will still publish this score.`
            : "Analysis is still marked for admin review. Confirming will still publish this score.";
    }
    return null;
}

function badgeLabel(badge: CiiV45Badge | null, status?: CiiV45BadgeStatus | null, candidate?: CiiV45Badge | null): string {
    // R3: a 90+ CII whose L6 is still pending has no badge; say so instead of a bare "Pending".
    if (!badge && status === "L6_PENDING_QUALIFICATION") return "L6 pending qualification";
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
    const cielBase = `/api/v1/admin/community-service/reports/${reportId}`;
    const moderatePath = `${cielBase}/cii-v4-5/moderate`;
    const l6Path = `${cielBase}/cii-v4-5/l6-qualification`;
    const supplementalPath = `${cielBase}/supplemental-evidence`;
    const approvePath = isCielPk
        ? `/api/v1/admin/community-service/reports/${reportId}/cii-v4-5/approve`
        : `/api/v1/faculty/reports/${reportId}/cii-v4-5/approve`;
    // CIEL PK: back to the list the report was opened from (Reports for review board or the table).
    const [cielReturnHref] = useState(() =>
        typeof window === "undefined" ? ADMIN_REPORTS_TABLE_HREF : readAdminReviewReturn(),
    );
    const inboxHref = isCielPk ? cielReturnHref : "/dashboard/faculty/community-service";
    const inboxLabel = isCielPk
        ? `← Back to ${adminReviewReturnLabel(cielReturnHref).toLowerCase()}`
        : "← Back to Community Service";
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
    // null = the default for this analysis (legacy opens section 1; R3 starts collapsed).
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [confirmAuthority, setConfirmAuthority] = useState(false);
    // R3 review state: only the inputs the Admin touched (key "<dimension>.<criterion>"), per-section reason/source.
    const [dirtyMarks, setDirtyMarks] = useState<Record<string, string>>({});
    const [markReasons, setMarkReasons] = useState<Record<string, string>>({});
    const [markSources, setMarkSources] = useState<Record<string, string>>({});
    const [savingDim, setSavingDim] = useState<string | null>(null);
    const [analysisStale, setAnalysisStale] = useState(false);
    const [l6Form, setL6Form] = useState<L6Form>(EMPTY_L6_FORM);
    const [l6Busy, setL6Busy] = useState(false);
    const [supplemental, setSupplemental] = useState<SupplementalEvidenceItem[]>([]);

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
            setDirtyMarks({});
            setMarkReasons({});
            setMarkSources({});
            const nextCii = next.ciiV45 as unknown as CiiV45Result | undefined;
            if (nextCii) {
                const d7 = nextCii.sectionScores?.find((s) => s.dimension === "7");
                const anchors: Record<string, string> = {};
                const reasons: Record<string, string> = {};
                for (const c of DIM7.criteria) {
                    const saved = d7?.criterionScores?.find((row) => row.criterion === c.key);
                    if (saved && saved.anchor !== "P" && typeof saved.anchor === "number") {
                        anchors[c.key] = String(saved.anchor);
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

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

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

    // A locked R3 report hides the supplemental panel (nothing can change any more), but the review
    // record and the evidence gallery must still list the files attached before approval.
    useEffect(() => {
        if (!isCielPk || readOnly || !reportId || !locked) return;
        if ((report?.ciiV45 as { rubricVersion?: string } | null | undefined)?.rubricVersion !== CII_V45_RUBRIC_VERSION) return;
        let cancelled = false;
        authenticatedFetch(supplementalPath)
            .then(async (res) => {
                if (cancelled || !res?.ok) return;
                const json = (await res.json().catch(() => ({}))) as { data?: SupplementalEvidenceItem[] };
                if (!cancelled && Array.isArray(json.data)) setSupplemental(json.data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportId, locked, isCielPk, readOnly, report]);

    const runAnalysis = async () => {
        if (readOnly || !reportId || analysing) return;
        if (packetHold) {
            toast.error(`Student packet integrity HOLD · ${packet.issues.join(" ")}`);
            return;
        }
        if (locked && !isCielPk) return;
        const publishedReport = ["verified", "paid"].includes(String(report?.status ?? "").toLowerCase());
        if (locked && isCielPk) {
            const ok = window.confirm(
                publishedReport
                    ? "This report is already PUBLISHED. Re-running the CII v5.0 Analyzer clears its approved CII lock until you approve the new score, and its certificate and rankings rest on that score. Continue?"
                    : "This CII is locked. Re-run the CII v5.0 Analyzer? The lock will clear until you approve the new score.",
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
                    setDirtyMarks({});
                    setAnalysisStale(false);
                    return true;
                }
            }
            return false;
        };
        try {
            setAnalysing(true);
            let res: Response | null = null;
            try {
                res = await authenticatedFetch(
                    analysePath,
                    // the confirmation above is the admin's explicit consent to clear a published report's lock
                    isCielPk && locked ? { method: "POST", body: JSON.stringify({ force: true }) } : { method: "POST" },
                    { timeoutMs: ANALYSE_TIMEOUT_MS },
                );
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
            setAnalysisStale(false);
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
    // R3: the score is reviewed per criterion and may carry an L6 qualification. R1/R2 analyses keep their flow.
    const r3 = isR3Analysis(ciiV45);
    const canReviewMarks = isCielPk && !readOnly && r3 && !locked;
    const STALE_MESSAGE = "Evidence changed. Re-run the analysis before approving.";
    const staleMessage = analysisStale && !locked ? STALE_MESSAGE : null;
    const bannerMessage = hardBlock || staleMessage || warningMessage;
    const dirtyFor = (dimension: string): Record<string, string> =>
        Object.fromEntries(
            Object.entries(dirtyMarks)
                .filter(([k]) => k.startsWith(`${dimension}.`))
                .map(([k, v]) => [k.slice(dimension.length + 1), v]),
        );
    const clearDirtyFor = (dimension: string) => {
        setDirtyMarks((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${dimension}.`))));
        setMarkReasons((prev) => ({ ...prev, [dimension]: "" }));
        setMarkSources((prev) => ({ ...prev, [dimension]: "" }));
    };

    // Typed reviewed marks that differ from the saved ones are not part of the stored score: Approve
    // locks what is stored, so unsaved edits must be saved (or cleared) first.
    const hasUnsavedMarks =
        canReviewMarks &&
        Boolean(ciiV45) &&
        (ciiV45?.sectionScores ?? []).some((section) => diffCriterionEdits(markRowsFor(section), dirtyFor(section.dimension)).changed.length > 0);
    const UNSAVED_MESSAGE = "Save or clear your reviewed-mark edits before approving.";

    const saveSectionMarks = async (dimension: string) => {
        if (!canReviewMarks || !ciiV45 || savingDim) return;
        const section = ciiV45.sectionScores.find((s) => s.dimension === dimension);
        if (!section) return;
        const diff = diffCriterionEdits(markRowsFor(section), dirtyFor(dimension));
        const built = buildModeratePayload({
            dimension,
            diff,
            reason: markReasons[dimension] ?? "",
            sourceRef: markSources[dimension],
            revision: moderationRevision(ciiV45),
        });
        if (!built.ok) {
            toast.error(built.error);
            return;
        }
        try {
            setSavingDim(dimension);
            const res = await authenticatedFetch(moderatePath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(built.payload),
            });
            const json = res ? ((await res.json().catch(() => ({}))) as { data?: CiiV45Result; unchanged?: boolean; message?: string | string[] }) : {};
            if (!res?.ok) {
                const message = Array.isArray(json.message) ? json.message.join(" ") : json.message;
                toast.error(message || "Could not save the reviewed marks");
                if (res?.status === 409) {
                    toast.error("The marks changed elsewhere. Reloading the report; review them again.");
                    await loadReport();
                }
                return;
            }
            if (json.unchanged || !json.data) {
                toast.info("No mark changed.");
                clearDirtyFor(dimension);
                return;
            }
            const next = json.data;
            setReport((prev) => (prev ? { ...prev, ciiV45: next as unknown as Record<string, unknown> } : prev));
            clearDirtyFor(dimension);
            toast.success("Reviewed marks saved. The section total and CII were recomputed.");
        } catch {
            toast.error("Could not save the reviewed marks");
        } finally {
            setSavingDim(null);
        }
    };

    const confirmL6 = async () => {
        if (!isCielPk || readOnly || !locked || l6Busy) return;
        const body = { ...l6Form, sourceRef: l6Form.sourceRef.trim() };
        try {
            setL6Busy(true);
            const res = await authenticatedFetch(l6Path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = res
                ? ((await res.json().catch(() => ({}))) as { data?: { badge?: CiiV45Badge | null; l6Assessment?: unknown }; message?: string | string[] })
                : {};
            if (!res?.ok) {
                const message = Array.isArray(json.message) ? json.message.join(" ") : json.message;
                toast.error(message || "Could not record the L6 qualification");
                return;
            }
            const badge = json.data?.badge ?? null;
            setReport((prev) =>
                prev
                    ? {
                          ...prev,
                          ciiV45: {
                              ...asRecord(prev.ciiV45),
                              finalBadge: badge,
                              badgeStatus: "AWARDED",
                              l6Assessment: json.data?.l6Assessment,
                              l6Qualification: body,
                          },
                          ciiV45Lock: { ...asRecord(prev.ciiV45Lock), finalBadge: badge, badgeStatus: "AWARDED", l6Qualification: body },
                      }
                    : prev,
            );
            toast.success("L6 awarded. The CII and the approval are unchanged.");
        } catch {
            toast.error("Could not record the L6 qualification");
        } finally {
            setL6Busy(false);
        }
    };

    const approveAndLock = async () => {
        if (readOnly || !reportId || approving || locked || !ciiV45) return;
        if (hardBlock) {
            toast.error(hardBlock);
            return;
        }
        if (analysisStale) {
            toast.error(STALE_MESSAGE);
            return;
        }
        if (hasUnsavedMarks) {
            toast.error(UNSAVED_MESSAGE);
            return;
        }
        if (!dim7Complete) {
            toast.error("Complete all seven evidence marks first.");
            return;
        }
        if (!confirmAuthority) {
            toast.error("Confirm these evidence marks are your final Admin assessment.");
            return;
        }
        try {
            setApproving(true);
            const body: Record<string, unknown> = {};
            if (note.trim()) body.note = note.trim();
            body.evidenceCriteria = DIM7.criteria.map((c) => ({
                criterion: c.key,
                anchor: Number(dim7Anchors[c.key]),
                reasoningSummary: (dim7Reasons[c.key] || "").trim() || undefined,
                evidenceIds: [],
            }));
            const l6Body = l6ApprovePayload(r3, l6Form);
            if (l6Body) body.l6Qualification = l6Body;
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
            const approved = (await res.json().catch(() => null)) as { data?: { ciiV45Lock?: { badgeStatus?: string | null } } } | null;
            toast.success(approveToast(approved?.data?.ciiV45Lock?.badgeStatus, r3));
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
            <div className="cii-final cii-final-page">
                <div className="backnav">
                    <div className="wrap">
                        <HubBackButton href={inboxHref} label={inboxLabel} />
                    </div>
                </div>
                <div className="wrap" style={{ padding: "80px 28px", display: "flex", justifyContent: "center" }}>
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#286b60" }} />
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="cii-final cii-final-page">
                <div className="backnav">
                    <div className="wrap">
                        <HubBackButton href={inboxHref} label={inboxLabel} />
                    </div>
                </div>
                <main className="wrap">
                    <p>Report unavailable.</p>
                </main>
            </div>
        );
    }

    const student = asRecord(report.student);
    const opportunity = asRecord(report.opportunity);
    const studentName = String(student.name || "Student");
    const university = String(student.university || student.institution || "");
    const projectTitle = String(opportunity.title || report.project_id || "Community Service Project");
    const evidenceFiles = collectEvidenceFiles(report);
    const flashOk = Boolean(report.id);
    const detailOk = packet.ok;
    const inventoryOk = true;
    const originalsOk = isCielPk || Boolean(report.id);
    const connectionLabel = analysing ? "RUNNING" : locked ? "LOCKED" : ciiV45 ? "ANALYSED" : packetHold ? "HOLD" : "READY";
    const step1 = ciiV45 ? "done" : analysing ? "active" : "active";
    const step2 = locked || (ciiV45 && !evidenceAssessmentPending(ciiV45)) ? "done" : ciiV45 ? "active" : "";
    const step3 = locked ? "done" : ciiV45 ? "active" : "";
    const step4 = locked ? "done" : "";
    const currentScore = pickCiiV45DisplayScore(ciiV45, ciiV45Lock);
    const rawAiPts = (ciiV45?.sectionScores ?? [])
        .filter((s) => s.dimension !== "7")
        .reduce((sum, s) => sum + (typeof s.score === "number" ? s.score : 0), 0);
    const previewComposite =
        dim7Complete && evidenceAssessmentPending(ciiV45)
            ? Math.round((rawAiPts + dim7PreviewPts + 1e-9) * 10) / 10
            : currentScore;
    const aiPts = ciiV45?.aiReportScore != null ? ciiV45.aiReportScore : rawAiPts || null;
    const evPts = locked
        ? ciiV45?.adminEvidenceScore ?? null
        : dim7Complete
          ? dim7PreviewPts
          : ciiV45?.adminEvidenceScore ?? null;
    const aiSections = (ciiV45?.sectionScores ?? []).filter((s) => s.dimension !== "7");
    // Badge: R1/R2 keep the gate-capped badge from the server. R3: the band follows the CII, and a 90+
    // candidate without the sourced L6 qualification has no badge (status L6_PENDING_QUALIFICATION).
    const lockBadgeStatus = (ciiV45Lock?.badgeStatus ?? ciiV45?.badgeStatus ?? null) as CiiV45BadgeStatus | null;
    const l6Assessment = r3
        ? assessL6(
              locked ? (ciiV45Lock?.adminApprovedScore ?? currentScore) : previewComposite,
              [...aiSections.map((s) => ({ dimension: s.dimension as string, score: s.score })), { dimension: "7", score: evPts }],
              l6Form,
          )
        : null;
    const r3Preview = r3 && !locked && previewComposite != null ? resolveBadgeForScoreR3(previewComposite, l6Assessment?.status === "QUALIFIED") : null;
    const currentBadge: CiiV45Badge | null = locked
        ? r3
            ? (ciiV45Lock?.finalBadge ?? ciiV45?.finalBadge ?? null)
            : (ciiV45?.finalBadge ?? null)
        : r3
          ? (r3Preview?.badge ?? null)
          : currentScore != null
            ? (ciiV45?.recommendedBadge ?? ciiV45?.diagnosticBadge ?? null)
            : null;
    const badgeStatus: CiiV45BadgeStatus | null = locked ? lockBadgeStatus : (r3Preview?.status ?? null);
    const candidateBadge: CiiV45Badge | null = locked ? (ciiV45Lock?.candidateBadge ?? ciiV45?.candidateBadge ?? null) : (r3Preview?.candidate ?? null);
    const l6Pending = badgeStatus === "L6_PENDING_QUALIFICATION";
    const l6PanelMode = showL6Panel({ r3, locked, composite: previewComposite, badgeStatus: lockBadgeStatus });
    const pendingList = r3 && !locked ? pendingCriteria(ciiV45?.sectionScores ?? []) : [];
    const badgeSrc = currentBadge?.numericLevel ? BADGE_SRC[currentBadge.numericLevel] : undefined;
    const analysisByDim = new Map((ciiV45?.sectionAnalyses ?? []).map((row) => [row.dimension, row]));
    const dim7RatedCount = DIM7.criteria.filter((c) => anchorPoints(c.weight, dim7Anchors[c.key]) != null).length;
    const gateRow = gatePills(ciiV45);
    const capNote = badgeCapNote(currentBadge);
    const checklist = finalChecklist({ result: ciiV45, dim7Complete, packetOk: packet.ok, locked });
    const feedbackSections = buildFeedbackSections(ciiV45, {
        anchors: dim7Anchors,
        comments: dim7Reasons,
        confirmed: locked || ciiV45?.adminEvidenceAssessment?.status === "ASSESSED",
    });
    const feedbackText = feedbackPlainText(
        {
            projectTitle,
            studentName,
            university,
            reportId,
            aiScore: aiPts,
            evidenceScore: evPts,
            compositeScore: previewComposite,
            badgeLabel: badgeLabel(currentBadge, badgeStatus, candidateBadge),
            locked,
            overallSummary: ciiV45?.analysisSummary || "",
            overallStrengths: ciiV45?.strengths || [],
            overallPriorities: ciiV45?.developmentPriorities || [],
            adminComment: note || ciiV45Lock?.adminNote || "",
        },
        feedbackSections,
    );
    const copyFeedback = async () => {
        try {
            await navigator.clipboard.writeText(feedbackText);
        } catch {
            const area = document.createElement("textarea");
            area.value = feedbackText;
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
        }
        toast.success("Feedback copied");
    };
    const printFeedback = () => {
        document.body.setAttribute("data-cii-print", "feedback");
        const cleanup = () => {
            document.body.removeAttribute("data-cii-print");
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
        window.setTimeout(cleanup, 2000);
    };
    // R3 student report analysis: only a locked (approved) review can be exported.
    const sheetSections = aiSections.concat(
        ciiV45?.sectionScores?.find((s) => s.dimension === "7") ? [ciiV45.sectionScores.find((s) => s.dimension === "7")!] : [],
    );
    const studentAnalysisRecord = buildStudentAnalysisRecord({
        locked,
        reportId,
        projectTitle,
        studentName,
        university,
        finalCII: previewComposite,
        badgeName: currentBadge?.name || null,
        badgeLevel: currentBadge?.numericLevel ?? null,
        badgeStatus: ciiV45Lock?.badgeStatus ?? ciiV45?.badgeStatus ?? null,
        approvalHash: ciiV45Lock?.hash || null,
        approvedAt: ciiV45Lock?.lockedAt || null,
        sections: sheetSections,
        overallAnalysis: ciiV45?.studentFeedback || ciiV45?.analysisSummary || "",
        strengths: ciiV45?.strengths || [],
        areasToGrow: ciiV45?.developmentPriorities || [],
        adminComment: note || ciiV45Lock?.adminNote || "",
    });
    const exportStudentAnalysis = () => {
        if (!studentAnalysisRecord) {
            toast.error("Approve the score before exporting the student analysis.");
            return;
        }
        const blob = new Blob([JSON.stringify(studentAnalysisRecord, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = studentAnalysisFileName(reportId);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const dimensionNames: Record<string, string> = Object.fromEntries(sheetSections.map((s) => [String(s.dimension), String(s.name)]));
    const downloadReviewRecord = () => {
        const record = buildReviewRecord({
            reportId,
            projectTitle,
            result: ciiV45,
            lock: ciiV45Lock as unknown as Record<string, unknown> | null,
            evidenceMarks: dim7Anchors,
            evidenceComments: dim7Reasons,
            adminComment: note || ciiV45Lock?.adminNote || "",
            supplemental: supplemental as unknown as Record<string, unknown>[],
            exportedAt: new Date().toISOString(),
        });
        const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = reviewRecordFileName(reportId);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const effectiveOpenSection = openSection ?? (r3 ? "" : "1");
    const packetFlashLabel = flashOk ? "Read" : "Waiting";
    const packetDetailLabel = detailOk ? `${packet.content_sections}/9` : "HOLD";
    const packetInventoryLabel = `${evidenceFiles.length}`;
    const packetOriginalsLabel = originalsOk ? "Admin access" : "Waiting";

    return (
        <div className="cii-final cii-final-page">
            <div className="backnav">
                <div className="wrap">
                    <HubBackButton href={inboxHref} label={inboxLabel} />
                </div>
            </div>
            <header className="mast">
                <div className="wrap">
                    <div className="brand">
                        <img src={LOGO_SRC} className="brand-logo" alt="Official locked CIEL PK logo" draggable={false} />
                        <div className="brand-copy">
                            <div>
                                CIEL <span>PK</span> · Final AI Analyser
                            </div>
                            <div className="brand-lock">Official CIEL PK identity · locked artwork</div>
                        </div>
                    </div>
                    <div className="mode">{isCielPk ? "PRODUCTION · CIEL PK SUPER ADMIN" : "READ ONLY · FACULTY VIEWER"}</div>
                    <p className="sub">
                        One connected Admin workflow: AI scores report quality /85 using the locked multiples-of-five section model →
                        Admin reviews every evidence file and manually scores /15 → <strong>Approve Score</strong> locks the CII →
                        CIEL PK awards the score-band badge → the student receives a polished one-page analysis. No Faculty or Partner
                        verification is required at final report stage.
                    </p>
                    <div className="source-proof">
                        Source contract: the analyser must receive and read the student-submitted <strong>Impact Flashcard + complete Detailed Report (Sections 1–9) + complete Evidence Package</strong>. Production analysis is blocked if the packet is incomplete.
                        {" · "}
                        <Link href={packageHref} style={{ color: "#d9ed93" }}>
                            Open Impact Package
                        </Link>
                        {isCielPk ? (
                            <>
                                {" · "}
                                <a
                                    href="/ciel-analyzer.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#d9ed93" }}
                                    title="Local review tool (offline): load the Analyzer packet exported from the package viewer. Official approval stays here."
                                >
                                    Analyser R2 local review tool ↗
                                </a>
                            </>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className="stepbar">
                <div className="wrap steps">
                    <div className={`step ${step1}`}>
                        <b>1</b>
                        <span>Run AI Analyser</span>
                    </div>
                    <div className={`step ${step2}`}>
                        <b>2</b>
                        <span>Admin Evidence /15</span>
                    </div>
                    <div className={`step ${step3}`}>
                        <b>3</b>
                        <span>Approve Score</span>
                    </div>
                    <div className={`step ${step4}`}>
                        <b>4</b>
                        <span>1-Page Final Report</span>
                    </div>
                </div>
            </div>

            <main className="wrap">
                <div className="toolbar">
                    <div className="left">
                        <input className="report-id" readOnly value={reportDisplayTitle(report) || "Impact Package"} aria-label="Project" />
                        {readOnly ? (
                            <button type="button" className="primary" disabled>
                                {locked ? "Locked · read only" : ciiV45 ? "Diagnostic CII (view only)" : "Analyzer not run · read only"}
                            </button>
                        ) : (
                            <button type="button" className="primary" onClick={runAnalysis} disabled={analysing || packetHold || (locked && !isCielPk)}>
                                {analysing
                                    ? `Scoring report quality… ${analysingElapsedSec}s`
                                    : packetHold
                                      ? "Packet HOLD"
                                      : ciiV45
                                        ? "Re-run AI Analyser"
                                        : "Run AI Analyser"}
                            </button>
                        )}
                        <button type="button" className="secondary" onClick={() => void loadReport()}>
                            Reset
                        </button>
                    </div>
                    <div className="right">
                        <span className="eyebrow">{connectionLabel}</span>
                    </div>
                </div>

                <div className="card pre-run">
                    <div className="eyebrow">ADMIN ACTION · FULL STUDENT PACKET REQUIRED</div>
                    <h2 style={{ margin: "5px 0 8px", font: "27px Georgia, serif" }}>{projectTitle}</h2>
                    <p style={{ margin: 0, maxWidth: 900 }}>
                        {studentName}
                        {university ? ` · ${university}` : ""}. Before the /85 score is accepted, this analyser checks and reads the
                        student-submitted <strong>Flashcard</strong>, all <strong>9 Detailed Report sections</strong>, the complete{" "}
                        <strong>Evidence inventory</strong>, and Admin originals. Evidence marks remain strictly Admin-scored /15.
                    </p>
                    <div className="packet-gate">
                        <div className={`packet-item ${flashOk ? "ok" : "bad"}`}>
                            <small>Student Flashcard</small>
                            <b>{packetFlashLabel}</b>
                            <span>{flashOk ? "Locked student source" : "Not loaded"}</span>
                        </div>
                        <div className={`packet-item ${detailOk ? "ok" : "bad"}`}>
                            <small>Detailed Report</small>
                            <b>{packetDetailLabel}</b>
                            <span>{detailOk ? "Sections 1–9 present" : packet.issues[0] || "Sections 1–9 required"}</span>
                        </div>
                        <div className={`packet-item ${inventoryOk ? "ok" : "bad"}`}>
                            <small>Evidence Inventory</small>
                            <b>{packetInventoryLabel}</b>
                            <span>Complete file list</span>
                        </div>
                        <div className={`packet-item ${originalsOk ? "ok" : "bad"}`}>
                            <small>Evidence Originals</small>
                            <b>{packetOriginalsLabel}</b>
                            <span>Admin / AI advisory pre-read</span>
                        </div>
                    </div>
                    {packetHold ? (
                        <div className="banner red" style={{ marginTop: 12 }} role="alert">
                            <strong>Student packet integrity HOLD.</strong> Run AI Analyser will not proceed until the submitted packet
                            is complete. {packet.issues.join(" ")}
                        </div>
                    ) : (
                        <div className="banner" style={{ marginTop: 12 }}>
                            <strong>100% Packet Read Gate:</strong> Run AI Analyser will not proceed until the submitted packet passes
                            the connectivity checks. Locked final scoring: Section maxima 10, 10, 5, 30, 10, 5, 15, 5, 10 = 100. AI
                            scores 85 points; CIEL PK Admin manually scores Evidence /15.
                        </div>
                    )}
                </div>

                {ciiV45 ? (
                    <section className="analyser-work">
                        {r3 ? (
                            <div className="card decision-strip" data-testid="decision-strip">
                                <div className="decision-head">
                                    <div>
                                        <div className="eyebrow">DECISION SUMMARY · {locked ? "APPROVED" : "PROVISIONAL"}</div>
                                        <strong>{projectTitle}</strong>
                                        <div className="optional">{[university, `Report ${String(report.project_id || reportId)}`].filter(Boolean).join(" · ")}</div>
                                    </div>
                                    <span className={locked ? "tag" : "tag warn"}>{locked ? "Approved" : "Provisional"}</span>
                                </div>
                                <div className="decision-figures">
                                    <div>
                                        <small>AI proposal /85</small>
                                        <b>{ciiV45.aiProposalScore != null ? ciiV45.aiProposalScore.toFixed(1) : "—"}</b>
                                    </div>
                                    <div>
                                        <small>Reviewed /85</small>
                                        <b>{aiPts != null ? aiPts.toFixed(1) : "—"}</b>
                                        {ciiV45.moderated ? <span className="optional"> Admin-reviewed</span> : null}
                                    </div>
                                    <div>
                                        <small>Admin evidence /15</small>
                                        <b>{evPts != null ? evPts.toFixed(1) : "Pending"}</b>
                                    </div>
                                    <div>
                                        <small>CII /100</small>
                                        <b>{previewComposite != null ? previewComposite.toFixed(1) : "Pending"}</b>
                                    </div>
                                    <div>
                                        <small>Candidate band</small>
                                        <b>{candidateBadge?.name || currentBadge?.name || "—"}</b>
                                        <span className="optional">
                                            {" "}
                                            {l6Pending ? "L6 pending qualification" : locked ? (currentBadge ? "Awarded" : "—") : "Awaiting approval"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        <div className="banner green">
                            <strong>Student Source Packet:</strong> Flashcard {flashOk ? "read" : "missing"} · Detailed report{" "}
                            {packet.content_sections}/9 · Evidence files {evidenceFiles.length}. AI scored report quality /85. Admin
                            evidence /15 remains manual.
                        </div>
                        {bannerMessage ? <div className={locked ? "banner green" : "banner"}>{bannerMessage}</div> : null}

                        <div className="grid">
                            <div className="card kpi">
                                <small>AI Report Quality</small>
                                <b>{aiPts != null ? `${aiPts.toFixed(1)} / 85` : "— / 85"}</b>
                                <p>AI-scored report quality only.</p>
                            </div>
                            <div className="card kpi">
                                <small>Admin Evidence</small>
                                <b>{evPts != null ? `${evPts.toFixed(1)} / 15` : "Pending / 15"}</b>
                                <p>Manually awarded by CIEL PK Admin.</p>
                            </div>
                            <div className="card kpi">
                                <small>Composite CII</small>
                                <b>{previewComposite != null ? previewComposite.toFixed(1) : "Pending"}</b>
                                <p>{locked ? "Locked after Approve Score." : "Generated after evidence marks are complete."}</p>
                            </div>
                            <div className="card kpi">
                                <small>Final Badge</small>
                                <b style={{ fontSize: 16 }}>{locked ? currentBadge?.name || (l6Pending ? "L6 pending qualification" : "Pending") : "Pending"}</b>
                                <p>Locked only after Approve Score.</p>
                            </div>
                        </div>

                        <div className="section-title">
                            <div>
                                <div className="eyebrow">AI ANALYSIS · ADMIN ONLY</div>
                                <h2>Report-quality analysis</h2>
                            </div>
                            <p>Admin sees the detailed strengths, limitations and internal inconsistencies. The student does not receive this full technical view.</p>
                        </div>

                        {isCielPk && !readOnly && !locked && !r3 ? (
                            <div className="banner">Re-run the analysis to review criterion marks (this analysis used an earlier rubric).</div>
                        ) : null}

                        {aiSections.map((section) => {
                            const marksMode = canReviewMarks ? "r3-edit" : r3 ? "r3-readonly" : "legacy";
                            const live = marksMode === "r3-edit" ? sectionTotalFromInputs(markRowsFor(section), dirtyFor(section.dimension)) : null;
                            const analysis = analysisByDim.get(section.dimension as "1" | "2" | "3" | "4A" | "4B" | "5" | "6" | "8" | "9");
                            const max = section.maximumPoints || 1;
                            const score = live?.unsaved ? live.total : section.score;
                            const pct = score != null ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
                            const open = effectiveOpenSection === section.dimension;
                            return (
                                <article key={section.dimension} className={`section-card${open ? " open" : ""}`}>
                                    <button type="button" className="section-head" onClick={() => setOpenSection(open ? "" : section.dimension)}>
                                        <div className="num">{section.dimension}</div>
                                        <div>
                                            <h3>{section.name}</h3>
                                            <p>{analysis?.summary || section.criterionScores.length + " criteria"}</p>
                                            <div className="bar">
                                                <i style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                        <div className="score">
                                            {score != null ? `${score.toFixed(1)}/${max}` : `—/${max}`}
                                            {live?.unsaved ? <small className="optional"> unsaved</small> : null}
                                        </div>
                                        <div className={score != null && score / max < 0.7 ? "tag warn" : "tag"}>
                                            {score == null ? "Pending" : score / max >= 0.85 ? "Strong" : score / max >= 0.7 ? "Sound" : "Review"}
                                        </div>
                                    </button>
                                    <div className="section-body">
                                        <div className="cols">
                                            <div>
                                                <h4>Strengths</h4>
                                                <ul>
                                                    {(analysis?.strengths?.length ? analysis.strengths : ["—"]).map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4>Limitations</h4>
                                                <ul>
                                                    {(analysis?.limitations?.length ? analysis.limitations : ["—"]).map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <CiiCriterionMarks
                                            section={section}
                                            mode={marksMode}
                                            dirty={dirtyFor(section.dimension)}
                                            onDirty={(criterion, value) => setDirtyMarks((prev) => ({ ...prev, [`${section.dimension}.${criterion}`]: value }))}
                                            onRestore={(criterion, aiScore) =>
                                                setDirtyMarks((prev) => ({ ...prev, [`${section.dimension}.${criterion}`]: aiScore == null ? "" : String(aiScore) }))
                                            }
                                            reason={markReasons[section.dimension] ?? ""}
                                            onReason={(value) => setMarkReasons((prev) => ({ ...prev, [section.dimension]: value }))}
                                            sourceRef={markSources[section.dimension] ?? ""}
                                            onSourceRef={(value) => setMarkSources((prev) => ({ ...prev, [section.dimension]: value }))}
                                            saving={savingDim === section.dimension}
                                            onSave={() => void saveSectionMarks(section.dimension)}
                                            onDiscard={() => clearDirtyFor(section.dimension)}
                                        />
                                    </div>
                                </article>
                            );
                        })}

                        {r3 && (ciiV45.adminModeration?.log?.length ?? 0) > 0 ? (
                            <details className="card review-log" data-testid="review-log">
                                <summary>
                                    <b>Review log</b> · {ciiV45.adminModeration!.log.length} change{ciiV45.adminModeration!.log.length === 1 ? "" : "s"} to AI criterion marks
                                </summary>
                                <ul>
                                    {[...ciiV45.adminModeration!.log].reverse().map((entry, i) => (
                                        <li key={`${entry.at}-${entry.dimension}-${entry.criterion}-${i}`}>
                                            {describeLogEntry(entry, (d, c) => `${dimensionNames[d] || `Dimension ${d}`} · ${criterionLabel(d as CiiV45Dimension, c)}`)}
                                            <span className="optional">
                                                {" "}
                                                · {String(entry.actorId ?? "").slice(0, 8)} · {new Date(entry.at).toLocaleString()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}

                        <CiiAnswerableRegistryPanel dimensionNames={dimensionNames} />

                        <div className="section-title">
                            <div>
                                <div className="eyebrow">ADMIN MANUAL LAYER</div>
                                <h2>Evidence review &amp; scoring · 15 points</h2>
                            </div>
                            <p>For Admin, every evidence file is viewable regardless of whether the student selected Public, Restricted or Private. The visibility label is retained for downstream sharing.</p>
                        </div>

                        <div className="banner green">
                            <strong>Admin Full Evidence Access:</strong> Public / Restricted / Private affects stakeholder publication—not CIEL PK Admin review. AI may provide an evidence idea, but <strong>AI never awards these 15 marks</strong>.
                        </div>

                        <div className="evidence-summary">
                            <div className="evs">
                                <b>{evidenceFiles.length}</b>
                                <small>evidence files{supplemental.length ? ` (+${supplemental.length} supplemental)` : ""}</small>
                            </div>
                            <div className="evs">
                                <b>ALL</b>
                                <small>visible to Admin</small>
                            </div>
                            <div className="evs">
                                <b>{evPts != null ? evPts.toFixed(1) : "—"}</b>
                                <small>Admin evidence /15</small>
                            </div>
                            <div className="evs">
                                <b>Optional</b>
                                <small>Admin comments</small>
                            </div>
                        </div>

                        <div className="evidence-gallery">
                            <ReportEvidenceGallery
                                files={[
                                    ...evidenceFiles.map((file) => ({ url: file.url, name: file.name, meta: `${file.section} · ${file.visibility}` })),
                                    ...supplemental.map((item) => ({
                                        url: item.url,
                                        name: item.name,
                                        meta: `Supplemental · ${item.label} · ${sectionOptionLabel(item.section)} · ${item.visibility}`,
                                    })),
                                ]}
                                emptyLabel="No evidence files listed. Admin can still complete the seven evidence marks from the written report."
                            />
                        </div>

                        {isCielPk && !readOnly && !locked && r3 ? (
                            <CiiSupplementalEvidencePanel
                                basePath={supplementalPath}
                                onItemsChange={setSupplemental}
                                onChanged={(requiresReanalysis) => {
                                    if (requiresReanalysis) setAnalysisStale(true);
                                }}
                            />
                        ) : null}

                        <div className={`evidence-form${locked || readOnly ? " locked-form" : ""}`}>
                            {DIM7.criteria.map((c) => {
                                const a = Number(dim7Anchors[c.key]);
                                const pts = Number.isInteger(a) && a >= 0 && a <= 4 ? c.weight * CII_V45_ANCHOR_FACTORS[a as 0 | 1 | 2 | 3 | 4] : 0;
                                return (
                                    <div key={c.key} className="ev-row">
                                        <div>
                                            <strong>{EVIDENCE_LABEL[c.key] || criterionLabel("7", c.key)}</strong>
                                            <div className="ev-help">{EVIDENCE_HELP[c.key] || `${c.weight} pts`}</div>
                                        </div>
                                        <select
                                            value={dim7Anchors[c.key] ?? ""}
                                            disabled={locked || readOnly}
                                            onChange={(e) => setDim7Anchors((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                        >
                                            <option value="">Select mark level</option>
                                            {CII_V45_ANCHOR_NAMES.map((name, i) => (
                                                <option key={name} value={String(i)}>
                                                    {anchorOptionLabel(c.weight, i as AnchorIndex)}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="points">
                                            {Number.isInteger(a) && a >= 0 && a <= 4
                                                ? `${pts.toFixed(2)} / ${c.weight}`
                                                : `— / ${c.weight}`}
                                        </div>
                                        <div>
                                            <textarea
                                                value={dim7Reasons[c.key] ?? ""}
                                                disabled={locked || readOnly}
                                                onChange={(e) => setDim7Reasons((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                                placeholder="Optional Admin comment"
                                            />
                                            <span className="optional">Optional — not required to approve the score.</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="evidence-total">
                            <div>
                                <strong>Evidence Score</strong>
                                <div className="optional">
                                    {dim7RatedCount} of 7 rated · {formatPts(dim7PreviewPts)} / 15 so far. Complete all seven marks; comments remain optional.
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <strong>{dim7Complete ? `${dim7PreviewPts.toFixed(2)} / 15` : `${dim7RatedCount} / 7 rated`}</strong>
                                <a className="secondary" href="#approvalAnchor">
                                    Continue
                                </a>
                            </div>
                        </div>

                        <div className="feedback-print">
                            <div className="section-title">
                                <div>
                                    <div className="eyebrow">FINAL FEEDBACK</div>
                                    <h2>Consolidated ten-section feedback</h2>
                                </div>
                                <p>Strengths, limitations and a recommendation for every dimension, in rubric order. Dimension 7 reflects the Admin evidence ratings above. Copy or print it for the review file.</p>
                            </div>
                            <div className="card feedback-wrap">
                                <div className="feedback-actions">
                                    <button type="button" className="secondary" onClick={() => void copyFeedback()}>
                                        Copy feedback
                                    </button>
                                    <button type="button" className="secondary" onClick={printFeedback}>
                                        Print feedback
                                    </button>
                                    <button type="button" className="secondary" onClick={downloadReviewRecord}>
                                        Download review record
                                    </button>
                                    {locked ? (
                                        <button type="button" className="secondary" onClick={exportStudentAnalysis}>
                                            Export student analysis
                                        </button>
                                    ) : null}
                                </div>
                                <div className="feedback-overall">
                                    <div className="feedback-scores">
                                        <span>
                                            AI <b>{formatPts(aiPts)} / 85</b>
                                        </span>
                                        <span>
                                            Evidence <b>{formatPts(evPts)} / 15</b>
                                        </span>
                                        <span>
                                            Composite CII <b>{formatPts(previewComposite)} / 100</b>
                                        </span>
                                        <span>
                                            Badge <b>{badgeLabel(currentBadge, badgeStatus, candidateBadge)}</b>
                                        </span>
                                    </div>
                                    <p>{ciiV45.analysisSummary || "Overall analysis not supplied by the AI."}</p>
                                    <p>
                                        <strong>Overall strengths:</strong> {(ciiV45.strengths || []).join("; ") || "Not supplied"}
                                    </p>
                                    <p>
                                        <strong>Development priorities:</strong> {(ciiV45.developmentPriorities || []).join("; ") || "Not supplied"}
                                    </p>
                                </div>
                                {feedbackSections.map((fs, i) => (
                                    <article key={fs.dimension} className="feedback-entry">
                                        <div className="feedback-entry-head">
                                            <div>
                                                <div className="eyebrow">
                                                    SECTION {i + 1} · D{fs.dimension}
                                                </div>
                                                <b>{fs.name}</b>
                                            </div>
                                            <b className="feedback-entry-score">
                                                {formatPts(fs.score)} / {fs.max}
                                            </b>
                                        </div>
                                        <p>{fs.summary}</p>
                                        <p>
                                            <strong>Strengths:</strong> {fs.strengths.join("; ") || "Not specified"}
                                        </p>
                                        <p>
                                            <strong>Limitations:</strong> {fs.limitations.join("; ") || "Not specified"}
                                        </p>
                                        {fs.evidenceNotes.length ? (
                                            <p>
                                                <strong>Evidence ratings:</strong> {fs.evidenceNotes.join("; ")}
                                            </p>
                                        ) : null}
                                        <p>
                                            <strong>Recommendation:</strong> {fs.recommendation}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="section-title" id="approvalAnchor">
                            <div>
                                <div className="eyebrow">CIEL PK FINAL AUTHORITY</div>
                                <h2>Approve Score</h2>
                            </div>
                            <p>
                                {r3
                                    ? "Once approved, evidence marks are locked, the Composite CII becomes final and the band badge is awarded (a 90+ CII is kept and L6 stays pending until the sourced qualification is confirmed), and the student one-page analysis is generated."
                                    : "Once approved, evidence marks are locked, the Composite CII becomes final, the badge is awarded, and the student one-page analysis is generated."}
                            </p>
                        </div>

                        <div className="card approve-wrap">
                            <div className="full bigcalc">
                                <div className="calc">
                                    <small>AI /85</small>
                                    <b>{aiPts != null ? aiPts.toFixed(1) : "—"}</b>
                                </div>
                                <div className="calc">
                                    <small>Admin Evidence /15</small>
                                    <b>{evPts != null ? evPts.toFixed(1) : "Pending"}</b>
                                </div>
                                <div className="calc">
                                    <small>Composite CII /100</small>
                                    <b>{previewComposite != null ? previewComposite.toFixed(1) : "Pending"}</b>
                                </div>
                                <div className="calc">
                                    <small>Badge Preview</small>
                                    <b style={{ fontSize: 16 }}>{badgeLabel(currentBadge, badgeStatus, candidateBadge)}</b>
                                </div>
                            </div>
                            <div className="full badge-preview">
                                {badgeSrc ? (
                                    <img src={badgeSrc} alt={currentBadge?.name || "CIEL PK badge"} />
                                ) : (
                                    <div className="badge-placeholder">BADGE</div>
                                )}
                                <div>
                                    <div className="eyebrow">{locked ? (l6Pending ? "APPROVED · NO BADGE AWARDED YET" : "AWARDED BADGE") : "AWAITING APPROVE SCORE"}</div>
                                    <h3>{currentBadge?.name || (l6Pending ? "L6 pending qualification" : "Badge will appear here")}</h3>
                                    <div className="final-status">The backend-approved CII is the authoritative score. The client preview cannot override it.</div>
                                </div>
                            </div>
                            {r3 ? (
                                <div className="full gate-row">
                                    <span
                                        className={`gate-pill${l6Assessment?.status === "QUALIFIED" || (locked && !l6Pending && currentBadge?.code === "L6") ? " ok" : ""}`}
                                        title="A 90+ CII is awarded L6 only with the minima and the sourced confirmations; below 90 the band follows the CII."
                                    >
                                        L6 qualification ·{" "}
                                        {locked && currentBadge?.code === "L6"
                                            ? "awarded"
                                            : l6Assessment?.status === "NOT_REQUIRED"
                                              ? "not required (CII below 90)"
                                              : l6Assessment?.status === "QUALIFIED"
                                                ? "qualified"
                                                : "pending"}
                                    </span>
                                    <span className="gate-cap muted">
                                        {l6Pending ? "CII kept; L6 pending, never replaced by L5" : currentBadge ? "Badge level matches the score band" : "Band follows the CII"}
                                    </span>
                                </div>
                            ) : (
                                <div className="full gate-row">
                                    {gateRow.map((g) => (
                                        <span key={g.code} className={`gate-pill${g.passed ? " ok" : ""}`} title={g.note}>
                                            {g.code} gate · {g.passed ? "passed" : "not met"}
                                        </span>
                                    ))}
                                    {capNote ? <span className="gate-cap">{capNote}</span> : null}
                                    {!capNote && currentBadge ? <span className="gate-cap muted">Badge level matches the score band</span> : null}
                                </div>
                            )}
                            {l6PanelMode ? (
                                <CiiL6QualificationPanel
                                    mode={l6PanelMode}
                                    form={l6Form}
                                    onChange={setL6Form}
                                    assessment={l6Assessment}
                                    disabled={readOnly || !isCielPk}
                                    busy={l6Busy}
                                    onConfirm={() => void confirmL6()}
                                />
                            ) : null}
                            <div className="full checklist">
                                <div className="checklist-head">
                                    <strong>Readiness check</strong>
                                    <span className="optional">Display only — it does not block Approve. Flagged items are published as warnings, as today.</span>
                                </div>
                                {checklist.map((item) => (
                                    <div key={item.label} className={`checklist-row${item.ok ? " ok" : ""}`}>
                                        <span className="checklist-mark">{item.ok ? "✓" : "•"}</span>
                                        <span className="checklist-label">{item.label}</span>
                                        <span className="checklist-detail">{item.detail}</span>
                                    </div>
                                ))}
                                {staleMessage ? (
                                    <div className="checklist-row">
                                        <span className="checklist-mark">•</span>
                                        <span className="checklist-label">Evidence changed</span>
                                        <span className="checklist-detail">{staleMessage} Approve stays disabled until then.</span>
                                    </div>
                                ) : null}
                                {pendingList.map((p) => (
                                    <div key={`${p.dimension}.${p.criterion}`} className="checklist-row">
                                        <span className="checklist-mark">•</span>
                                        <span className="checklist-label">
                                            {dimensionNames[p.dimension] || `Dimension ${p.dimension}`} · {criterionLabel(p.dimension as CiiV45Dimension, p.criterion)} is pending
                                        </span>
                                        <span className="checklist-detail">The AI left this criterion pending. Fill its Reviewed mark in the section above, or the score stays provisional.</span>
                                    </div>
                                ))}
                            </div>
                            <div className="full">
                                <label>
                                    <strong>CIEL PK Admin overall comment</strong> <span className="optional">Optional</span>
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={locked || readOnly}
                                    style={{ width: "100%", minHeight: 90, border: "1px solid var(--line)", borderRadius: 8, padding: 10, marginTop: 6 }}
                                    placeholder="Optional overall comment for the student"
                                />
                            </div>
                            <div>
                                <label className="confirm-box">
                                    <input
                                        type="checkbox"
                                        checked={confirmAuthority || locked}
                                        disabled={locked || readOnly}
                                        onChange={(e) => setConfirmAuthority(e.target.checked)}
                                        style={{ marginTop: 3 }}
                                    />
                                    <span>
                                        <strong>I confirm these evidence marks are my final Admin assessment.</strong>
                                        <br />
                                        <small>CIEL PK becomes final authority for this approved CII.</small>
                                    </span>
                                </label>
                            </div>
                            <div className="approve-actions">
                                {!readOnly ? (
                                    <>
                                        <button type="button" className="rev" disabled={locked || deciding} onClick={returnForRevision}>
                                            Request revision
                                        </button>
                                        <button
                                            type="button"
                                            className="primary"
                                            disabled={approving || Boolean(hardBlock) || analysisStale || hasUnsavedMarks || !dim7Complete || (!confirmAuthority && !locked)}
                                            onClick={approveAndLock}
                                        >
                                            {approving ? "Locking…" : "Approve Score & Generate Final Report"}
                                        </button>
                                    </>
                                ) : (
                                    <p className="final-status">Read-only — Approve stays with CIEL PK Admin.</p>
                                )}
                            </div>
                            {bannerMessage ? <div className="full banner">{bannerMessage}</div> : null}
                        </div>
                    </section>
                ) : null}

                {locked ? (
                    <CiiFinalOnePageSheet
                        embedded
                        title={projectTitle}
                        studentName={studentName}
                        university={university}
                        reportId={reportId}
                        score={previewComposite}
                        badgeName={currentBadge?.name || null}
                        badgeLevel={currentBadge?.numericLevel ?? null}
                        lockedAt={ciiV45Lock?.lockedAt || null}
                        sections={sheetSections}
                        analysis={ciiV45?.studentFeedback || ciiV45?.analysisSummary || ""}
                        strengths={ciiV45?.strengths || []}
                        limitations={ciiV45?.developmentPriorities || []}
                        adminComment={note || ciiV45Lock?.adminNote || ""}
                    />
                ) : null}
            </main>
        </div>
    );
}
