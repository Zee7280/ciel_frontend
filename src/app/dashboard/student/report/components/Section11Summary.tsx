import { ShieldAlert, Award, Clock, Users, Target, ShieldCheck, Download, TrendingUp, X, Printer, CheckCircle, AlertTriangle, Lock, CreditCard, MessageSquareQuote } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import ReportPrintView from "./ReportPrintView";
import CertificateView from "./CertificateView";
import CIIDashboardMeter from "./CIIDashboardMeter";
import RedFlagsAuditModal from "./RedFlagsAuditModal";
import CIIauditInsightsPanel, { buildHoldingItems } from "./CIIauditInsightsPanel";
import { formatIncompleteSectionHeading, REVIEW_DOSSIER_FORM_NAV, tabIsComplete } from "../utils/reportWizardNav";
import { resolveReportCii } from "../utils/resolveReportCii";
import { getRedFlagsModalSections } from "@/lib/redFlagsModalMerge";
import { parseSection11AuditSummary, type ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";
import clsx from "clsx";
import ReportVerificationQr from "@/components/ReportVerificationQr";
import { pickImpactVerifyUrlFromPayload } from "@/utils/reportVerificationUrl";
import { mergedSdgTitlesLine, uniqueMergedSdgGoalNumbers } from "../utils/reportSdgMerge";
import { distinctBeneficiaryTotal } from "../utils/activityReach";
import { buildSection11DashboardView } from "@/lib/section11DashboardNarrative";
import { sumNonRejectedLoggedHours } from "../utils/engagementMetrics";

type Section11SummaryProps = {
    /** When the footer submit control is hidden (summary-only workspace), opens the same confirm flow. */
    onRequestFinalSubmit?: () => void;
    /** Opportunity payload so print/certificate include partner-registered SDGs. */
    projectData?: unknown;
};

function normalizeAuditMeta(raw: unknown, summaryText: string): ReportCIIauditMeta | null {
    const fallback = summaryText ? parseSection11AuditSummary(summaryText) : null;
    if (!raw) return fallback;

    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return fallback;
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            return normalizeAuditMeta(parsed, summaryText);
        } catch {
            return parseSection11AuditSummary(trimmed) ?? fallback;
        }
    }

    if (typeof raw !== "object") return fallback;
    const meta = raw as Partial<ReportCIIauditMeta>;
    if (!Array.isArray(meta.top_fixes)) return fallback;

    return {
        critical_red_flags: meta.critical_red_flags ?? null,
        moderate_issues: meta.moderate_issues ?? null,
        minor_issues: meta.minor_issues ?? null,
        credibility: meta.credibility ?? null,
        risk_level: meta.risk_level ?? null,
        top_fixes: meta.top_fixes.filter((fix): fix is string => typeof fix === "string"),
        final_remark: meta.final_remark ?? null,
        student_feedback: meta.student_feedback ?? null,
        needs_revision: Boolean(meta.needs_revision),
    };
}

const FINAL_DECLARATION_ITEMS = [
    "I confirm every section of this report is accurate to the best of my knowledge.",
    "I understand that after final submission, no further edits are possible.",
    "I understand my whole report — not each session — is verified once, by faculty, from the flash card.",
    "I consent to this report and its evidence being shared with CIEL PK, my faculty, and my institution for verification.",
    "I understand a reporting fee may apply before my score and certificate are unlocked.",
];

/** Mockup 10.5 — the final declaration + electronic sign-off that gates submission, once all sections are complete. */
function FinalDeclarationCard({
    declaration,
    signatureName,
    onToggle,
    onSignatureChange,
}: {
    declaration: boolean[];
    signatureName: string;
    onToggle: (index: number) => void;
    onSignatureChange: (value: string) => void;
}) {
    const allChecked = declaration.slice(0, 5).every(Boolean);
    return (
        <>
            <div className="w-16 h-16 bg-[var(--teal-soft)] rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[var(--teal)]" />
            </div>
            <div className="max-w-lg w-full space-y-5 text-left">
                <div>
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                        Final report declaration &amp; electronic sign-off
                    </h3>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed">
                        All sections and hours are complete. Before submission is accepted, tick every
                        declaration below and sign with your full name.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    {FINAL_DECLARATION_ITEMS.map((text, i) => (
                        <label key={i} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={!!declaration[i]}
                                onChange={() => onToggle(i)}
                                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] focus:ring-offset-1"
                            />
                            <span className="text-sm leading-relaxed text-slate-700">{text}</span>
                        </label>
                    ))}
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Electronic signature — type your full name
                    </label>
                    <input
                        type="text"
                        value={signatureName}
                        onChange={(e) => onSignatureChange(e.target.value)}
                        placeholder="Your full name"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[var(--teal)] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-soft)]"
                    />
                </div>
                {!allChecked || !signatureName.trim() ? (
                    <p className="text-xs font-medium text-[var(--gold)]">
                        Tick all five declarations and sign your name to unlock final submission.
                    </p>
                ) : (
                    <p className="text-xs font-medium text-[var(--teal)]">
                        Declaration complete — you can now submit from the button below.
                    </p>
                )}
            </div>
        </>
    );
}

/** Mockup 10.7 — how a submitted report actually reaches each stakeholder. Static, informational only. */
function ReportTravelsCard() {
    const steps: Array<[string, string]> = [
        ["1 · Flash card assembled", "Your flash card and full PDF are built live from every section you complete."],
        ["2 · Faculty approves once", "Faculty reviews the whole report from your flash card — not session by session."],
        ["3 · Delivered per stakeholder", "Once approved, your score, certificate, and public card unlock on your dashboard; the full PDF stays archived for CIEL PK, faculty, and your institution."],
    ];
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <h4 className="text-sm font-semibold text-slate-900">Where your report travels</h4>
            <p className="mt-1 text-xs text-slate-500">The mechanism — who gets what, and when.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {steps.map(([title, body]) => (
                    <div key={title} className="rounded-lg border border-slate-200 bg-white p-3.5">
                        <p className="text-xs font-bold text-slate-900">{title}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{body}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Mockup 10.6 — a named-criteria readiness checklist, restyling the raw validation-error list into ✅/⏳ rows. */
function ReadinessChecklist({
    hoursMet,
    incompleteSectionNums,
    declarationComplete,
}: {
    hoursMet: boolean;
    incompleteSectionNums: Set<number>;
    declarationComplete: boolean;
}) {
    const rows: Array<{ label: string; done: boolean }> = [
        { label: "Every member met the required hours", done: hoursMet },
        ...REVIEW_DOSSIER_FORM_NAV.map((nav) => ({
            label: `Step ${nav.wizard} · ${nav.label}`,
            done: tabIsComplete(nav.wizard, incompleteSectionNums),
        })),
        { label: "Final declaration & electronic sign-off", done: declarationComplete },
    ];
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-900">✅ CIEL PK · Submission Readiness</h4>
            <p className="mt-0.5 text-xs text-slate-500">
                Browse freely. This is the only gate: every item below must be complete before the report can be sent
                for verification.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className={clsx(
                            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                            row.done ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "bg-[var(--gold-soft)] text-[var(--gold)]",
                        )}
                    >
                        <span>{row.done ? "✅" : "⏳"}</span>
                        <span>{row.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Section11Summary({ onRequestFinalSubmit, projectData }: Section11SummaryProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        data,
        updateSection,
        isEligibleForSubmission,
        areAllSectionsComplete,
        finalDeclarationComplete,
        showVerifiedImpactScores,
        incompleteSectionsSummary,
    } = useReportForm();
    const { section1, section2, section3, section4, section5, section8, section9, section10 } = data;

    const reportSt = String(data.status || "").toLowerCase();
    const reportRs = String(data.report_status || "").toLowerCase();
    const paymentSt = String(data.payment_status || "").toLowerCase();
    const adminSt = String(data.admin_status || data.admin_approval_status || "").toLowerCase();
    const partnerSt = String(data.partner_status || "").toLowerCase();
    const section11AuditMetaEarly = useMemo(() => {
        const text = String(data.section11?.summary_text || "").trim();
        return normalizeAuditMeta(data.section11?.audit_meta, text);
    }, [data.section11?.audit_meta, data.section11?.summary_text]);
    const needsAdminRevision =
        adminSt === "rejected" ||
        partnerSt === "rejected" ||
        reportSt === "rejected" ||
        reportSt === "revision" ||
        Boolean(section11AuditMetaEarly?.needs_revision);
    const revisionFeedback = useMemo(() => {
        const direct = String(data.admin_feedback || data.feedback || "").trim();
        if (direct) return direct;
        const fromAudit = section11AuditMetaEarly?.student_feedback;
        return typeof fromAudit === "string" && fromAudit.trim() ? fromAudit.trim() : "";
    }, [data.admin_feedback, data.feedback, section11AuditMetaEarly?.student_feedback]);
    const inPostSubmitLifecycle =
        !needsAdminRevision &&
        (reportSt === "submitted" ||
            reportSt === "under_review" ||
            reportSt === "payment_pending" ||
            reportSt === "pending_payment" ||
            reportSt === "payment_under_review" ||
            reportSt === "paid" ||
            reportSt === "approved" ||
            reportSt === "partner_verified" ||
            reportRs === "pending_payment" ||
            reportRs === "payment_under_review" ||
            reportRs === "paid" ||
            paymentSt === "payment_under_review" ||
            paymentSt === "paid" ||
            paymentSt === "approved");
    const feeOrSlipRecorded =
        reportSt === "paid" ||
        reportSt === "payment_under_review" ||
        reportSt === "verified" ||
        reportSt === "approved" ||
        reportRs === "paid" ||
        reportRs === "payment_under_review" ||
        paymentSt === "paid" ||
        paymentSt === "approved" ||
        data.payment_verified === true;
    const paymentSlipInReview =
        reportSt === "payment_under_review" || reportRs === "payment_under_review" || paymentSt === "payment_under_review";
    const projectPaymentId = String(
        data.project_id ||
            (data as { projectId?: string }).projectId ||
            (data as { opportunityId?: string }).opportunityId ||
            "",
    ).trim();
    const paymentHref = projectPaymentId
        ? `/dashboard/student/payment?projectId=${encodeURIComponent(projectPaymentId)}`
        : "";
    const requiresPartnerApproval =
        (data as { requires_partner_approval?: boolean }).requires_partner_approval === true ||
        (data as { partner_required?: boolean }).partner_required === true;
    const partnerStepSatisfied = ["approved", "not_applicable", "not_required"].includes(partnerSt);
    const awaitingPartnerAfterPayment =
        feeOrSlipRecorded &&
        requiresPartnerApproval &&
        !partnerStepSatisfied &&
        !["verified", "partner_verified"].includes(reportSt);

    const [showPreview, setShowPreview] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);
    const [showRedFlagsModal, setShowRedFlagsModal] = useState(false);
    const [showFullAuditNarrative, setShowFullAuditNarrative] = useState(false);

    // Lets My Impact Wall's "Certificate"/"Full report" actions link straight into the real,
    // already-built views here (?view=certificate | print) instead of a fake stand-in — see
    // student-reports.service.ts's mapReportListing. Opens the modal only; printing still needs
    // the visible "Print / Save PDF" click (a real user gesture), since browsers can silently
    // block window.print() called without one.
    const autoOpenView = searchParams.get("view");
    const autoOpenedViewRef = useRef(false);
    useEffect(() => {
        if (autoOpenedViewRef.current || !autoOpenView || !showVerifiedImpactScores) return;
        autoOpenedViewRef.current = true;
        if (autoOpenView === "certificate") setShowCertificate(true);
        else if (autoOpenView === "print") setShowPreview(true);
    }, [autoOpenView, showVerifiedImpactScores]);

    useEffect(() => {
        const openFullReport = () => setShowPreview(true);
        window.addEventListener("ciel-open-full-report", openFullReport);
        return () => window.removeEventListener("ciel-open-full-report", openFullReport);
    }, []);

    const clearCertificatePrintScale = () => {
        document.documentElement.style.removeProperty("--cert-print-scale");
    };

    const applyCertificatePrintScale = () => {
        const area = document.getElementById("print-area-certificate");
        if (area) area.scrollTop = 0;
        window.scrollTo(0, 0);

        const cert = document.querySelector(".certificate-one-page") as HTMLElement | null;
        if (!cert) return;

        const pageWidthPx = (210 / 25.4) * 96;
        const pageHeightPx = (297 / 25.4) * 96;
        const contentH = cert.offsetHeight;
        const contentW = cert.offsetWidth;
        if (contentH <= 0 || contentW <= 0) return;

        const scale = Math.min(pageWidthPx / contentW, pageHeightPx / contentH, 1) * 0.98;
        document.documentElement.style.setProperty("--cert-print-scale", String(scale));
    };

    useEffect(() => {
        if (!showCertificate) return;
        document.documentElement.classList.add("cii-certificate-printing");
        document.body.classList.add("cii-certificate-printing");
        return () => {
            document.documentElement.classList.remove("cii-certificate-printing");
            document.body.classList.remove("cii-certificate-printing");
            clearCertificatePrintScale();
        };
    }, [showCertificate]);

    const beneficiaries = String(distinctBeneficiaryTotal(section4) || 0);
    const verifiedHours = section1.metrics?.total_verified_hours || 0;
    const loggedHours = sumNonRejectedLoggedHours(section1.attendance_logs || []);
    const incompleteSectionNums = useMemo(
        () => new Set(incompleteSectionsSummary.map((block) => block.section)),
        [incompleteSectionsSummary],
    );

    const mergedSdgNums = useMemo(
        () => uniqueMergedSdgGoalNumbers(projectData, section3),
        [projectData, section3],
    );
    const mergedSdgNarrative = useMemo(
        () => mergedSdgTitlesLine(projectData, section3),
        [projectData, section3],
    );

    const storedAuditText = String(data.section11?.summary_text || "").trim();

    const section11DashboardView = useMemo(() => {
        if (storedAuditText && !storedAuditText.toLowerCase().includes("project successfully synthesized")) {
            return buildSection11DashboardView(storedAuditText);
        }
        return null;
    }, [storedAuditText]);

    const executiveSummary = useMemo(() => {
        if (section11DashboardView?.narrative) {
            return section11DashboardView.narrative;
        }

        const sdgPhrase =
            mergedSdgNarrative ||
            (mergedSdgNums.length ? mergedSdgNums.map((n) => `SDG ${n}`).join(", ") : "Sustainable Development");
        return `Audit summary pending detailed review. Based on the submitted inputs, the project references ${verifiedHours} verified hours, ${beneficiaries} reported beneficiaries, alignment with ${sdgPhrase}, and ${section10.mechanisms?.length || 0} sustainability mechanisms. Final credibility still depends on consistency across attendance, activities, outcomes, resources, evidence, and continuity claims.`;
    }, [
        section11DashboardView,
        section10.mechanisms?.length,
        beneficiaries,
        verifiedHours,
        mergedSdgNarrative,
        mergedSdgNums,
    ]);

    const showExpandFullAudit =
        Boolean(storedAuditText) &&
        storedAuditText.length > executiveSummary.length + 240;

    /** Always pass the same narrative shown in “Comprehensive audit review” (do not require SECTION 1). */
    const auditTextForModal = useMemo(() => {
        const st = data.section11?.summary_text?.trim();
        const legacy = "project successfully synthesized";
        if (st && !st.toLowerCase().includes(legacy)) {
            return st;
        }
        return executiveSummary;
    }, [data.section11?.summary_text, executiveSummary]);

    const ciiResult = useMemo(() => resolveReportCii(data), [data]);

    const section11AuditMeta = section11AuditMetaEarly;

    const resolvedImpactVerifyUrl = useMemo(() => pickImpactVerifyUrlFromPayload(data), [data]);

    const { sections: redFlagsModalSections, usedSystemFallback: redFlagsUsedSystemFallback } = useMemo(
        () => getRedFlagsModalSections(auditTextForModal, incompleteSectionsSummary, ciiResult),
        [auditTextForModal, incompleteSectionsSummary, ciiResult],
    );

    const openRedFlagsModal = () => {
        setShowRedFlagsModal(true);
    };

    const handlePrint = () => {
        if (showCertificate) {
            applyCertificatePrintScale();
            const onAfterPrint = () => {
                clearCertificatePrintScale();
                window.removeEventListener("afterprint", onAfterPrint);
            };
            window.addEventListener("afterprint", onAfterPrint);
            requestAnimationFrame(() => window.print());
            return;
        }
        window.print();
    };

    const hasMergedSdgs = mergedSdgNums.length > 0;

    /** Match certificate wording: full merged list, no "Goal A, Goal B +N" truncation. */
    const sdgAlignmentDisplay = !hasMergedSdgs
        ? "—"
        : mergedSdgNums.length === 1
          ? `Goal ${mergedSdgNums[0]}`
          : `Goals ${mergedSdgNums.join(", ")}`;

    const stats = [
        {
            label: "CII Index",
            icon: Award,
            display: `${Math.round(ciiResult.totalScore)} / 100`,
            suffix: "" as string,
        },
        {
            label: "Verified hours",
            icon: Clock,
            display: `${verifiedHours}`,
            suffix: "hrs",
        },
        {
            label: "Beneficiaries",
            icon: Users,
            display: `${beneficiaries}`,
            suffix: "",
        },
        {
            label: "SDG alignment",
            icon: Target,
            display: sdgAlignmentDisplay,
            suffix: "",
            tooltip:
                mergedSdgNarrative ||
                (mergedSdgNums.length ? mergedSdgNums.map((n) => `Goal ${n}`).join(", ") : undefined),
        },
        {
            label: "Auditor narrative",
            icon: MessageSquareQuote,
            display: storedAuditText ? "On file" : "Pending",
            suffix: "",
        },
    ];

    const complianceItems = [
        {
            label: "Partner validation",
            status: section8.partner_verification ? "Passed" : "Pending",
            desc: "Formal recognition from the partner on record.",
            icon: ShieldCheck,
            check: Boolean(section8.partner_verification),
        },
        {
            label: "Ethical safeguards",
            status: Object.values(section8.ethical_compliance || {}).every(Boolean) ? "Passed" : "Pending",
            desc: "CIEL ethical declaration completed.",
            icon: ShieldAlert,
            check: Object.values(section8.ethical_compliance || {}).every(Boolean),
        },
        {
            label: "Sustainability proof",
            status: section10.mechanisms?.length > 0 ? "Passed" : "Pending",
            desc: "Named mechanisms for what continues after the team.",
            icon: TrendingUp,
            check: section10.mechanisms?.length > 0,
        },
    ];

    const holdingItems = useMemo(
        () => (section11AuditMeta ? buildHoldingItems(section11AuditMeta) : []),
        [section11AuditMeta],
    );
    const gapCount = holdingItems.filter((item) => item.severity !== "Minor").length;
    const recText = `${section11DashboardView?.highlights.recommendedAction || ""} ${section11DashboardView?.highlights.band || ""} ${section11AuditMeta?.risk_level || ""}`.toLowerCase();
    const isConditional =
        recText.includes("conditional") || (showVerifiedImpactScores && gapCount > 0);

    const outcomes = Array.isArray(section5?.measurable_outcomes) ? section5.measurable_outcomes : [];
    const measuredPcts = outcomes
        .map((o) => {
            const b = Number(String(o.baseline ?? "").replace(/,/g, ""));
            const e = Number(String(o.endline ?? "").replace(/,/g, ""));
            if (!Number.isFinite(b) || !Number.isFinite(e) || b === 0) return null;
            return Math.round(((e - b) / b) * 100);
        })
        .filter((n): n is number => n != null);
    const bestPct = measuredPcts.length ? Math.max(...measuredPcts) : null;
    const sdgStrip = hasMergedSdgs ? `SDG ${mergedSdgNums.join(" • ")}` : "—";

    const approvedSteps: Array<{ label: string; state: "done" | "current" | "pending" }> = [
        { label: "Submitted", state: "done" },
        { label: "Fee paid", state: "done" },
        { label: "Admin approved", state: "done" },
        { label: "Conditional badge", state: isConditional ? "current" : "done" },
        { label: "Full badge", state: isConditional ? "pending" : "done" },
    ];

    const surfaceCard =
        "rounded-xl border border-slate-200/80 bg-white shadow-sm";
    const surfaceHeaderRow = "border-b border-slate-100 bg-slate-50/70";

    return (
        <div className="space-y-5 md:space-y-6 pb-10">
            {/* Locked metrics (draft) or approved banner (after admin verify) */}
            <div className="space-y-4 md:space-y-5">
                {showVerifiedImpactScores ? (
                    <>
                        <div className={clsx("cer-appr", isConditional ? "cond" : "ok")}>
                            <div className="cer-appr-row">
                                <div className="min-w-0">
                                    <h2>
                                        {isConditional
                                            ? `Conditionally approved — ${Math.round(ciiResult.totalScore)} / 100`
                                            : `Approved — ${Math.round(ciiResult.totalScore)} / 100`}
                                    </h2>
                                    <p>
                                        {isConditional
                                            ? `The report is live. The badge stays conditional until ${gapCount} evidence gap${gapCount === 1 ? "" : "s"} ${gapCount === 1 ? "is" : "are"} closed.`
                                            : "Scores, certificate and the public record are unlocked."}
                                    </p>
                                </div>
                                {isConditional ? (
                                    <button
                                        type="button"
                                        className="cer-appr-fix"
                                        onClick={() => {
                                            const el = document.getElementById("cer-holding");
                                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                            else openRedFlagsModal();
                                        }}
                                    >
                                        {gapCount === 2
                                            ? "Fix the two gaps"
                                            : gapCount > 0
                                              ? `Fix the ${gapCount} gap${gapCount === 1 ? "" : "s"}`
                                              : "Review gaps"}
                                    </button>
                                ) : null}
                            </div>
                            <div className="cer-pipe">
                                {approvedSteps.map((step) => (
                                    <span key={step.label} className={`cer-pip ${step.state}`}>
                                        {step.state === "done" ? "✓ " : ""}
                                        {step.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="cer-mbar">
                            <div className="cer-mbar-i">
                                <div className="v">{verifiedHours || 0} h</div>
                                <div className="k">Verified hours</div>
                            </div>
                            <div className="cer-mbar-i">
                                <div className="v">{beneficiaries}</div>
                                <div className="k">Beneficiaries</div>
                            </div>
                            <div className="cer-mbar-i">
                                <div className="v">
                                    {bestPct != null ? `${bestPct >= 0 ? "+" : ""}${bestPct}%` : "—"}
                                </div>
                                <div className="k">Measured change</div>
                            </div>
                            <div className="cer-mbar-i">
                                <div className="v">{sdgStrip}</div>
                                <div className="k">Goals aligned</div>
                            </div>
                        </div>
                    </>
                ) : (
                <div className={clsx("cer-unlock", "cer-unlock-locked")}>
                    <div className="cer-unlock-h">
                        <Lock className="cer-unlock-ico" />
                        <div className="min-w-0">
                            <h3>Five things unlock together</h3>
                            <p>
                                CII, hours, beneficiaries, SDG alignment, and the auditor narrative stay locked until your reporting fee is confirmed and an administrator verifies this submission.
                            </p>
                        </div>
                    </div>
                    <div className="cer-unlock-grid">
                        {stats.map((stat, i) => (
                            <div
                                key={i}
                                title={stat.tooltip}
                                className="cer-ulock"
                            >
                                <Lock className="cer-ulock-lock" />
                                <p className="cer-ulock-k">{stat.label}</p>
                                <p className="cer-ulock-dots">...</p>
                            </div>
                        ))}
                    </div>
                </div>
                )}
            </div>

            {showVerifiedImpactScores && (
                <div className="w-full flex justify-center pt-1">
                    <CIIDashboardMeter />
                </div>
            )}

            {needsAdminRevision ? (
                <>
                    <div
                        id="report-section11-revision-feedback"
                        className={clsx("scroll-mt-24 md:scroll-mt-28 overflow-hidden", surfaceCard)}
                    >
                        <div
                            className={clsx(
                                "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 px-6 py-4 md:px-8 md:py-5",
                                surfaceHeaderRow,
                            )}
                        >
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="w-9 h-9 shrink-0 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-[0.14em]">
                                        Revision required
                                    </p>
                                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                                        Admin returned your report for updates
                                    </h3>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-6 md:px-8 md:py-7 border-t border-slate-100/80 space-y-4 text-left">
                            <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                Update the sections flagged below, then save and resubmit. Form tabs 1–9 are editable again;
                                CII scores and certificates unlock only after admin approval.
                            </p>
                            {revisionFeedback ? (
                                <div className="rounded-xl border border-[#bfe6e2] bg-[var(--aqua-soft)] p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aqua)] mb-2 flex items-center gap-2">
                                        <MessageSquareQuote className="w-3.5 h-3.5" /> Reviewer feedback
                                    </p>
                                    <p className="text-xs font-medium text-[#0f5e57] leading-relaxed whitespace-pre-wrap">
                                        {revisionFeedback}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    {section11AuditMeta ? (
                        <CIIauditInsightsPanel audit={section11AuditMeta} ciiTotalScore={ciiResult.totalScore} />
                    ) : null}
                </>
            ) : showVerifiedImpactScores ? (
                <div id="report-section11-audit-review" className="scroll-mt-24 md:scroll-mt-28 space-y-3">
                    {section11AuditMeta ? (
                        <CIIauditInsightsPanel
                            audit={section11AuditMeta}
                            ciiTotalScore={ciiResult.totalScore}
                            onTechnicalDetail={openRedFlagsModal}
                        />
                    ) : null}
                    {showExpandFullAudit ? (
                        <div className="cer-hold">
                            <button
                                type="button"
                                onClick={() => setShowFullAuditNarrative((open) => !open)}
                                className="cer-hold-tech"
                            >
                                {showFullAuditNarrative ? "Hide full technical audit" : "View full technical audit report"}
                            </button>
                            {showFullAuditNarrative ? (
                                <div className="cer-hold-note mt-3 space-y-3 max-h-80 overflow-y-auto">
                                    {storedAuditText.split("\n\n").map((paragraph: string, idx: number) => (
                                        <p key={idx} className="cer-hold-note-t whitespace-pre-wrap">
                                            {paragraph.trim()}
                                        </p>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : (
                <div
                    id="report-section11-audit-review"
                    className={clsx("scroll-mt-24 md:scroll-mt-28 overflow-hidden", surfaceCard)}
                >
                    <div
                        className={clsx(
                            "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 px-6 py-4 md:px-8 md:py-5",
                            surfaceHeaderRow,
                        )}
                    >
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                                <Lock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.14em]">
                                    Post-approval only
                                </p>
                                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                                    Audit narrative and CII breakdown
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-8 md:px-8 md:py-9 border-t border-slate-100/80 bg-slate-50/40">
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">
                            Final auditor narrative, CII transparency (scores, penalties, risk), and section-wise flags
                            stay hidden until your reporting fee is confirmed and an administrator approves your
                            submission—the same unlock as quantified scores above.
                        </p>
                    </div>
                </div>
            )}

            <div className="cer-comp">
                <p className="cer-comp-k">Institutional compliance</p>
                <p className="cer-comp-t">CIEL certification checks against the record you already filed.</p>
                <div className="cer-comp-grid">
                    {complianceItems.map((item, idx) => (
                        <div key={idx} className={clsx("cer-comp-card", item.check ? "ok" : "wait")}>
                            <p className="cer-comp-label">{item.label}</p>
                            <p className="cer-comp-desc">{item.desc}</p>
                            <p className={clsx("cer-comp-st", item.check ? "pass" : "pend")}>
                                {item.check ? "✓ Passed" : item.status}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Final Action Hub ── */}
            <div
                className={clsx(
                    showVerifiedImpactScores && !needsAdminRevision
                        ? ""
                        : "flex flex-col items-center gap-6 text-center p-8 md:p-10 relative overflow-hidden group",
                    showVerifiedImpactScores && !needsAdminRevision ? "" : surfaceCard,
                )}
            >
                {!(showVerifiedImpactScores && !needsAdminRevision) ? (
                <div className="absolute right-0 top-0 w-40 h-40 bg-[#0e7d74]/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                ) : null}

                {needsAdminRevision ? (
                    <>
                        <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
                            <AlertTriangle className="w-7 h-7 text-rose-600" />
                        </div>
                        <div className="max-w-lg space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900">Resubmit after revision</h3>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Update the required sections (use the steps above), save your changes, then resubmit for
                                admin review. You do not need to pay the reporting fee again unless the payment team asks
                                you to.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <div className="w-full sm:w-56">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const el = document.getElementById("report-section11-revision-feedback");
                                            el?.scrollIntoView({ behavior: "smooth", block: "start" });
                                        }}
                                        className="cer-ghost w-full h-12"
                                        style={{ marginTop: 0 }}
                                    >
                                        View feedback
                                    </button>
                                </div>
                                <div className="w-full sm:w-56">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onRequestFinalSubmit) {
                                                onRequestFinalSubmit();
                                                return;
                                            }
                                            const footerSubmitBtn = Array.from(document.querySelectorAll("button")).find(
                                                (btn) =>
                                                    btn.textContent?.includes("Resubmit") ||
                                                    btn.textContent?.includes("Submit Report"),
                                            );
                                            footerSubmitBtn?.click();
                                        }}
                                        disabled={!areAllSectionsComplete}
                                        className="cer-bigbtn w-full h-12"
                                        style={{ marginTop: 0 }}
                                    >
                                        {areAllSectionsComplete ? "Resubmit report" : "Complete all sections first"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : showVerifiedImpactScores ? (
                    <div className="cer-cert">
                        <div className="cer-cert-copy">
                            <h3>Your certificate is ready</h3>
                            <p>
                                {isConditional
                                    ? "Download the certificate — the badge stays conditional until the listed gaps are closed. Scan the QR to verify on a CV."
                                    : "Download the certificate or scan the QR to verify this record on a CV."}
                            </p>
                            <div className="cer-cert-actions">
                                <button type="button" className="cer-cert-solid" onClick={() => setShowCertificate(true)}>
                                    Download certificate
                                </button>
                                <button
                                    type="button"
                                    className="cer-cert-ghost"
                                    onClick={() => {
                                        if (resolvedImpactVerifyUrl) {
                                            window.open(resolvedImpactVerifyUrl, "_blank", "noopener,noreferrer");
                                            return;
                                        }
                                        setShowPreview(true);
                                    }}
                                >
                                    View public record
                                </button>
                            </div>
                        </div>
                        {resolvedImpactVerifyUrl ? (
                            <div className="cer-cert-qr">
                                <ReportVerificationQr
                                    impactVerifyUrl={resolvedImpactVerifyUrl}
                                    size={112}
                                    caption="Scan to verify"
                                />
                            </div>
                        ) : null}
                    </div>
                ) : inPostSubmitLifecycle ? (
                    !feeOrSlipRecorded && paymentHref ? (
                        <>
                            <div className="w-16 h-16 bg-[var(--gold-soft)] rounded-xl flex items-center justify-center border border-[var(--gold-soft)]">
                                <CreditCard className="w-7 h-7 text-[var(--gold)]" />
                            </div>
                            <div className="max-w-md space-y-4">
                                <h3 className="text-lg font-semibold text-slate-900">Reporting fee required</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Your report is submitted. Complete the reporting fee and upload proof on the payment
                                    screen so your submission can move forward to verification.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.push(paymentHref)}
                                    className="cer-bigbtn inline-flex items-center justify-center gap-2 w-full sm:w-56"
                                >
                                    <CreditCard className="w-4 h-4 shrink-0" />
                                    <span>Go to payment</span>
                                </button>
                            </div>
                        </>
                    ) : paymentSlipInReview && paymentHref ? (
                        <>
                            <div className="w-16 h-16 bg-[var(--bg)] rounded-xl flex items-center justify-center border border-[var(--line)]">
                                <Clock className="w-7 h-7 text-[var(--muted)]" />
                            </div>
                            <div className="max-w-md space-y-4">
                                <h3 className="text-lg font-semibold text-slate-900">Payment proof under review</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                    Your fee proof was received and is being verified. You will be notified when it is
                                    cleared.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.push(paymentHref)}
                                    className="cer-ghost w-full sm:w-56"
                                    style={{ marginTop: 0 }}
                                >
                                    View payment details
                                </button>
                            </div>
                        </>
                    ) : awaitingPartnerAfterPayment ? (
                        <>
                            <div className="w-16 h-16 bg-[var(--aqua-soft)] rounded-xl flex items-center justify-center border border-[var(--aqua-soft)]">
                                <Clock className="w-7 h-7 text-[var(--aqua)]" />
                            </div>
                            <div className="max-w-md space-y-3">
                                <h3 className="text-lg font-semibold text-slate-900">Partner review in progress</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Your reporting fee is recorded. Your NGO or partner organisation is reviewing the
                                    report before CIEL admin final approval.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-[var(--bg)] rounded-xl flex items-center justify-center border border-[var(--line)]">
                                <ShieldAlert className="w-7 h-7 text-[var(--muted)]" />
                            </div>
                            <div className="max-w-md space-y-3">
                                <h3 className="text-lg font-semibold text-slate-900">Report locked pending admin approval</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                    Your report and fee are on file. The CII index, report preview, and certificate unlock
                                    after partner review (if required) and CIEL Admin final approval.
                                </p>
                            </div>
                        </>
                    )
                ) : !isEligibleForSubmission ? (
                    <>
                        <div className="w-16 h-16 bg-[var(--gold-soft)] rounded-xl flex items-center justify-center shadow-inner">
                            <Clock className="w-8 h-8 text-[var(--gold)] animate-pulse" />
                        </div>
                        <div className="flex-1 space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">Report in progress</h3>
                                <p className="text-sm font-semibold text-slate-400">
                                    You are currently in <span className="text-[var(--gold)]">progress mode</span>. Complete the following criteria:
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={clsx("p-5 rounded-xl border flex items-center gap-4", loggedHours >= (data.required_hours || 16) ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", loggedHours >= (data.required_hours || 16) ? "bg-[var(--teal)] text-white" : "bg-slate-200 text-slate-400")}>
                                        {loggedHours >= (data.required_hours || 16) ? <CheckCircle className="w-5 h-5" /> : "1"}
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] leading-none">Min. hours met</p>
                                        <p className="text-xs font-semibold">{loggedHours} / {data.required_hours || 16} Hours</p>
                                    </div>
                                </div>
                                <div className={clsx("p-5 rounded-xl border flex items-center gap-4", areAllSectionsComplete ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", areAllSectionsComplete ? "bg-[var(--teal)] text-white" : "bg-slate-200 text-slate-400")}>
                                        {areAllSectionsComplete ? <CheckCircle className="w-5 h-5" /> : "2"}
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] leading-none">Mandatory sections</p>
                                        <p className="text-xs font-semibold">{areAllSectionsComplete ? "Complete" : "In progress"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-[var(--gold-soft)] border border-[var(--gold-soft)] rounded-xl flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 text-[var(--gold)] shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-[var(--gold)] leading-relaxed text-left">
                                    Final submission and <strong>Section 10 (Sustainability)</strong> stay locked until all{" "}
                                    {data.required_hours || 16} hours are logged. Faculty approves the flash card after you submit.
                                </p>
                            </div>
                            <ReadinessChecklist
                                hoursMet={loggedHours >= (data.required_hours || 16)}
                                incompleteSectionNums={incompleteSectionNums}
                                declarationComplete={finalDeclarationComplete}
                            />
                        </div>
                    </>
                ) : isEligibleForSubmission && !areAllSectionsComplete ? (
                    <>
                        <div className="w-16 h-16 bg-[var(--gold-soft)] rounded-xl flex items-center justify-center shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-[var(--gold)]" />
                        </div>
                        <div className="flex-1 space-y-6 max-w-lg">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">Hours met — finish all sections</h3>
                                <p className="text-sm font-semibold text-slate-400">
                                    Use the steps above to complete and validate form tabs 1–9. Submit appears only when every section is complete.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-xl border flex items-center gap-4 bg-slate-50 border-slate-100 text-slate-700">
                                    <div className="w-8 h-8 rounded-full bg-[var(--teal)] text-white flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] leading-none">Min. hours met</p>
                                        <p className="text-xs font-semibold">{verifiedHours} / {data.required_hours || 16} Hours</p>
                                    </div>
                                </div>
                                <div className="p-5 rounded-xl border border-[var(--gold-soft)] bg-[var(--gold-soft)] flex flex-col gap-3 text-left">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-[var(--gold)] text-white flex items-center justify-center shrink-0 font-semibold text-sm">
                                            !
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] leading-none text-[var(--gold)]">
                                                Form tabs 1–9
                                            </p>
                                            <p className="text-xs font-semibold text-[var(--gold)]">
                                                Fix the items below, then return to this step to submit.
                                            </p>
                                        </div>
                                    </div>
                                    {incompleteSectionsSummary.length > 0 && (
                                        <ul className="max-h-48 overflow-y-auto space-y-2.5 pl-1 border-t border-[var(--gold-soft)] pt-3 text-[11px] text-[var(--gold)]">
                                            {incompleteSectionsSummary.map((block) => (
                                                <li key={block.section} className="rounded-lg bg-white/70 px-2.5 py-2 border border-[var(--gold-soft)]">
                                                    <span className="font-semibold text-[var(--gold)]">
                                                        {formatIncompleteSectionHeading(block.section, block.label)}
                                                    </span>
                                                    <ul className="mt-1 ml-3 list-disc text-[var(--gold)] font-medium space-y-0.5">
                                                        {block.errors.map((err, j) => (
                                                            <li key={`${block.section}-${err.field}-${j}`}>{err.message}</li>
                                                        ))}
                                                    </ul>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <ReadinessChecklist
                                hoursMet
                                incompleteSectionNums={incompleteSectionNums}
                                declarationComplete={finalDeclarationComplete}
                            />
                        </div>
                    </>
                ) : isEligibleForSubmission && areAllSectionsComplete && !finalDeclarationComplete ? (
                    <FinalDeclarationCard
                        declaration={data.section11?.final_declaration || [false, false, false, false, false]}
                        signatureName={data.section11?.signature_name || ""}
                        onToggle={(i) => {
                            const next = [...(data.section11?.final_declaration || [false, false, false, false, false])];
                            next[i] = !next[i];
                            const allNowChecked = next.slice(0, 5).every(Boolean);
                            updateSection("section11", {
                                final_declaration: next,
                                ...(allNowChecked && (data.section11?.signature_name || "").trim()
                                    ? { signed_at: new Date().toISOString() }
                                    : {}),
                            });
                        }}
                        onSignatureChange={(value) => updateSection("section11", { signature_name: value })}
                    />
                ) : (
                    <>
                        <div className="w-16 h-16 bg-[var(--teal-soft)] rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-[var(--teal)]" />
                        </div>
                        <div className="max-w-md space-y-4">
                            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Ready for final submission</h3>
                            <p className="text-sm font-semibold text-slate-400 leading-relaxed">
                                All sections are complete, hour requirements are met, and your declaration is signed.
                                Review and submit when ready.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onRequestFinalSubmit) {
                                        onRequestFinalSubmit();
                                        return;
                                    }
                                    const footerSubmitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
                                        btn.textContent?.includes("Submit Report"),
                                    );
                                    if (footerSubmitBtn) footerSubmitBtn.click();
                                }}
                                className="cer-bigbtn"
                            >
                                <span className="inline-flex w-full items-center justify-center gap-3">
                                    <Lock className="w-4 h-4" /> Submit final report
                                </span>
                            </button>
                            <ReportTravelsCard />
                        </div>
                    </>
                )}
            </div>

            {/* ── Modals (Print Handled via Visibility/Display) ── */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Step 1: COMPLETELY REMOVE the dashboard UI from the print flow */
                    #dashboard-root, nav, aside, header, .sonner, [role="status"] { 
                        display: none !important; 
                    }

                    /* Step 2: Force the body to allow multi-page flow without extra space */
                    body { 
                        visibility: visible !important; 
                        background: white !important; 
                        height: auto !important; 
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Step 3: Position the modal at the absolute top (0,0) of the print document */
                    .print-active-modal { 
                        display: block !important; 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }

                    /* Step 4: Reset the modal wrapper (portal) to not use flex/fixed in print */
                    .fixed.inset-0 { 
                        display: block !important; 
                        position: absolute !important; 
                        inset: 0 !important;
                        overflow: visible !important; 
                    }
                    
                    .relative.w-full.max-w-5xl, .relative.w-full.max-w-4xl { 
                        display: block !important; 
                        position: relative !important; 
                        max-width: none !important; 
                        width: 100% !important; 
                        transform: none !important; 
                        margin: 0 !important;
                        top: 0 !important;
                    }

                    .print-no-ui { display: none !important; }

                    /* Certificate: one portrait A4 sheet — layout in globals.css */
                    body:not(.cii-certificate-printing) .print-scroll-auto,
                    body:not(.cii-certificate-printing) #print-area {
                        overflow: visible !important;
                        max-height: none !important;
                        height: auto !important;
                        display: block !important;
                        padding: 0 !important;
                    }

                    body.cii-certificate-printing #print-area-certificate {
                        overflow: hidden !important;
                        max-height: 297mm !important;
                        scroll-behavior: auto !important;
                    }

                    .print-scroll-auto, #print-area, #print-area-certificate { 
                        overflow: visible !important; 
                        max-height: none !important; 
                        height: auto !important;
                        display: block !important;
                        padding: 0 !important;
                    }
                }
            `}} />

            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none transition-all print-active-modal">
                    <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0 print:m-0 print-scroll-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xl rounded-t-xl z-[110] print-no-ui">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                                    aria-label="Save dossier as PDF — opens print dialog"
                                    title="Save as PDF"
                                >
                                    <Download className="w-5 h-5" aria-hidden />
                                </button>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Official project dossier</h3>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em]">Institutional impact verification</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Print / Save PDF</Button>
                                <button onClick={() => setShowPreview(false)} className="w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div id="print-area" className="px-6 py-10 md:px-12 md:py-16 overflow-y-auto max-h-[85vh] print:max-h-none print:px-0 print:py-0 print-scroll-auto">
                            <ReportPrintView reportData={data} projectData={projectData} />
                        </div>
                    </div>
                </div>
            )}

            {showCertificate &&
                typeof document !== "undefined" &&
                createPortal(
                    <div className="cii-certificate-print-root fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none print-active-modal">
                        <div className="relative w-full max-w-7xl bg-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0 print:m-0 print-scroll-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xl rounded-t-xl z-[110] print-no-ui">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--teal)] text-white flex items-center justify-center">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">CII certificate</h3>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em]">Certificate of institutional impact</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                                        aria-label="Save certificate as PDF — opens print dialog"
                                        title="Save as PDF"
                                    >
                                        <Download className="w-5 h-5" aria-hidden />
                                    </button>
                                    <Button
                                        onClick={handlePrint}
                                        className="bg-[var(--teal)] hover:opacity-90 text-white h-10 px-6 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                                    >
                                        <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCertificate(false)}
                                        className="w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div
                                id="print-area-certificate"
                                className="overflow-x-auto overflow-y-auto max-h-[85vh] p-4 md:p-6 print:max-h-none print:overflow-visible print:p-0 print-scroll-auto"
                            >
                                <CertificateView projectData={projectData} />
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            {showVerifiedImpactScores ? (
                <RedFlagsAuditModal
                    open={showRedFlagsModal}
                    onOpenChange={setShowRedFlagsModal}
                    sections={redFlagsModalSections}
                    usedSystemFallback={redFlagsUsedSystemFallback}
                />
            ) : null}
        </div>
    );
}
