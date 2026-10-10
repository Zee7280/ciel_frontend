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
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { resolveImpactPackagePacketIntegrity } from "@/app/dashboard/student/report/impact-package/impactPackagePacket";
import { CiiFinalOnePageSheet, CII_FINAL_BADGE_SRC, CII_FINAL_LOGO_SRC } from "@/components/ciel/community-service/CiiFinalOnePageSheet";
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
    const [openSection, setOpenSection] = useState<string>("1");
    const [confirmAuthority, setConfirmAuthority] = useState(false);

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
    const currentBadge = locked
        ? ciiV45?.finalBadge ?? null
        : currentScore != null
          ? ciiV45?.recommendedBadge ?? ciiV45?.diagnosticBadge ?? null
          : null;
    const aiPts = ciiV45?.aiReportScore != null ? ciiV45.aiReportScore : rawAiPts || null;
    const evPts = locked
        ? ciiV45?.adminEvidenceScore ?? null
        : dim7Complete
          ? dim7PreviewPts
          : ciiV45?.adminEvidenceScore ?? null;
    const aiSections = (ciiV45?.sectionScores ?? []).filter((s) => s.dimension !== "7");
    const badgeSrc = currentBadge?.numericLevel ? BADGE_SRC[currentBadge.numericLevel] : undefined;
    const analysisByDim = new Map((ciiV45?.sectionAnalyses ?? []).map((row) => [row.dimension, row]));
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
                            the connectivity checks. Locked final scoring: Section maxima 10, 10, 5, 30, 10, 10, 15, 5, 5 = 100. AI
                            scores 85 points; CIEL PK Admin manually scores Evidence /15.
                        </div>
                    )}
                </div>

                {ciiV45 ? (
                    <section className="analyser-work">
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
                                <b style={{ fontSize: 16 }}>{locked ? currentBadge?.name || "Pending" : "Pending"}</b>
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

                        {aiSections.map((section) => {
                            const analysis = analysisByDim.get(section.dimension as "1" | "2" | "3" | "4A" | "4B" | "5" | "6" | "8" | "9");
                            const max = section.maximumPoints || 1;
                            const score = section.score;
                            const pct = score != null ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
                            const open = openSection === section.dimension;
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
                                        <div className="score">{score != null ? `${score.toFixed(1)}/${max}` : `—/${max}`}</div>
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
                                        <div style={{ marginTop: 12, fontSize: 11.5, color: "#61716c" }}>
                                            {section.criterionScores.map((criterion) => (
                                                <div key={criterion.criterion} style={{ marginTop: 6 }}>
                                                    <strong>{criterionLabel(section.dimension, criterion.criterion)}</strong>
                                                    {" · "}
                                                    {criterion.anchor === "P" ? "Pending" : `${criterion.anchor}/4`}
                                                    {criterion.reasoningSummary ? ` — ${criterion.reasoningSummary}` : ""}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}

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
                                <small>evidence files</small>
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

                        <div className="evidence-grid">
                            {evidenceFiles.length ? (
                                evidenceFiles.map((file) => (
                                    <div key={file.id} className="file-card">
                                        <div className="top">
                                            <b>{file.name}</b>
                                            <span className="pill">{file.visibility}</span>
                                        </div>
                                        <div className="admin-full">CIEL PK ADMIN ACCESS · FULL</div>
                                        <p>
                                            {file.section} · {file.claim}
                                        </p>
                                        <div className="actions">
                                            {file.url ? (
                                                <a className="secondary" href={file.url} target="_blank" rel="noreferrer">
                                                    View original
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="file-card">
                                    <b>No evidence files listed</b>
                                    <p>The inventory is empty. Admin can still complete the seven evidence marks from the written report.</p>
                                </div>
                            )}
                        </div>

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
                                                    {i} · {name}
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
                                <div className="optional">Complete all seven marks. Comments remain optional.</div>
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <strong>{dim7Complete ? `${dim7PreviewPts.toFixed(2)} / 15` : "Pending / 15"}</strong>
                                <a className="secondary" href="#approvalAnchor">
                                    Continue
                                </a>
                            </div>
                        </div>

                        <div className="section-title" id="approvalAnchor">
                            <div>
                                <div className="eyebrow">CIEL PK FINAL AUTHORITY</div>
                                <h2>Approve Score</h2>
                            </div>
                            <p>Once approved, evidence marks are locked, the Composite CII becomes final, the badge is awarded, and the student one-page analysis is generated.</p>
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
                                    <b style={{ fontSize: 16 }}>{badgeLabel(currentBadge)}</b>
                                </div>
                            </div>
                            <div className="full badge-preview">
                                {badgeSrc ? (
                                    <img src={badgeSrc} alt={currentBadge?.name || "CIEL PK badge"} />
                                ) : (
                                    <div className="badge-placeholder">BADGE</div>
                                )}
                                <div>
                                    <div className="eyebrow">{locked ? "AWARDED BADGE" : "AWAITING APPROVE SCORE"}</div>
                                    <h3>{currentBadge?.name || "Badge will appear here"}</h3>
                                    <div className="final-status">The backend-approved CII is the authoritative score. The client preview cannot override it.</div>
                                </div>
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
                                            disabled={approving || Boolean(hardBlock) || !dim7Complete || (!confirmAuthority && !locked)}
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
                        sections={aiSections.concat(
                            ciiV45?.sectionScores?.find((s) => s.dimension === "7")
                                ? [ciiV45.sectionScores.find((s) => s.dimension === "7")!]
                                : [],
                        )}
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
